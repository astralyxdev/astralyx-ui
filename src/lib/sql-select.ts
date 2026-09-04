/**
 * The `SELECT` grammar a query builder can round-trip.
 *
 * Two functions over one shape: `compileSelect` turns a query into a
 * parameterised statement, and `parseSelect` turns a statement back into a
 * query. They are here rather than in the component because a builder that can
 * only go one way is a dead end — you can construct a query but not open one
 * you already have — and because the safety argument below is worth testing on
 * its own, without a DOM.
 *
 * **Values are parameters; identifiers are allow-listed.** A value never enters
 * the SQL text: it is emitted as `$1` and returned separately, which is what
 * makes the output safe to execute. Identifiers cannot be parameterised by any
 * driver, so the only defence is a list — every table and column is looked up
 * in the schema and anything absent is dropped, with the reason reported. A
 * name cannot reach the statement unless it was already in your schema, and
 * that holds for parsing too: a pasted query naming a table you did not declare
 * loses that clause rather than carrying it through.
 *
 * The subset is deliberate: `SELECT`, `FROM`, inner and left joins on a single
 * equality, a `WHERE` tree of comparisons with `AND`/`OR` and parentheses,
 * `GROUP BY`, one `ORDER BY`, and `LIMIT`. Sub-queries, CTEs, unions and window
 * functions are not expressible, and `parseSelect` says so rather than
 * half-reading them.
 */

export type SqlTable = {
  name: string
  columns: { name: string; type?: string }[]
}

export type SqlCondition = {
  id: string
  /** Qualified `table.column`. */
  field: string
  operator: string
  value: string
}

export type SqlGroup = {
  id: string
  join: 'and' | 'or'
  conditions: (SqlCondition | SqlGroup)[]
}

export type SqlJoin = {
  id: string
  type: 'inner' | 'left'
  table: string
  leftColumn: string
  rightColumn: string
}

export type SqlSort = { column: string; direction: 'asc' | 'desc' }

export type SelectQuery = {
  from: string
  joins: SqlJoin[]
  /** Qualified columns. Empty means every column. */
  select: string[]
  where: SqlGroup
  groupBy: string[]
  orderBy: SqlSort[]
  limit?: number
}

export type Placeholders = 'numbered' | 'question'

const isGroup = (node: SqlCondition | SqlGroup): node is SqlGroup => 'conditions' in node

let counter = 0
const nextId = (prefix: string) => `${prefix}${++counter}`

/* ------------------------------------------------------------- the schema */

/** SQL types collapsed to the families the operator lists are built around. */
export function familyOf(type: string | undefined): 'string' | 'number' | 'date' | 'boolean' {
  const lower = (type ?? '').toLowerCase()
  if (/bool/.test(lower)) return 'boolean'
  if (/int|numeric|decimal|real|double|float|money|serial/.test(lower)) return 'number'
  if (/date|time/.test(lower)) return 'date'
  return 'string'
}

/** A bare identifier — the only shape allowed into a statement. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const quote = (name: string) => `"${name}"`

export const qualify = (table: string, column: string) => `${table}.${column}`

export function splitQualified(key: string): [string, string] {
  const at = key.indexOf('.')
  return at === -1 ? ['', key] : [key.slice(0, at), key.slice(at + 1)]
}

/* ----------------------------------------------------------------- compile */

/** Builder operator to SQL. `unary` predicates take no value. */
const TO_SQL: Record<string, { sql: string; unary?: boolean }> = {
  eq: { sql: '=' },
  neq: { sql: '<>' },
  gt: { sql: '>' },
  gte: { sql: '>=' },
  lt: { sql: '<' },
  lte: { sql: '<=' },
  after: { sql: '>' },
  before: { sql: '<' },
  contains: { sql: 'LIKE' },
  starts: { sql: 'LIKE' },
  set: { sql: 'IS NOT NULL', unary: true },
  unset: { sql: 'IS NULL', unary: true },
  true: { sql: '= TRUE', unary: true },
  false: { sql: '= FALSE', unary: true },
}

export type Compiled = { sql: string; params: unknown[]; issues: string[] }

export function compileSelect(
  query: SelectQuery,
  tables: SqlTable[],
  placeholders: Placeholders = 'numbered',
): Compiled {
  const params: unknown[] = []
  const issues: string[] = []
  const placeholder = () => (placeholders === 'numbered' ? `$${params.length}` : '?')

  const known = new Set(tables.map((table) => table.name))
  const columnsOf = (name: string) =>
    new Set(tables.find((table) => table.name === name)?.columns.map((column) => column.name) ?? [])

  /**
   * The tables this statement can reference.
   *
   * Being in the schema is not enough: a column of a table that is neither the
   * source nor joined compiles to valid-looking SQL the database rejects, so
   * scope is checked separately from existence.
   */
  const inScope = new Set(
    [query.from, ...query.joins.map((join) => join.table)].filter((name) => known.has(name)),
  )

  const resolve = (key: string): string | null => {
    const [table, column] = splitQualified(key)
    if (!known.has(table) || !columnsOf(table).has(column)) {
      issues.push(`${key} is not in the schema`)
      return null
    }
    if (!inScope.has(table)) {
      issues.push(`${key} needs ${table} joined first`)
      return null
    }
    if (!IDENTIFIER.test(table) || !IDENTIFIER.test(column)) {
      issues.push(`${key} is not a plain identifier`)
      return null
    }
    return `${quote(table)}.${quote(column)}`
  }

  if (!known.has(query.from)) {
    return { sql: '', params: [], issues: ['Pick a table to select from.'] }
  }

  const columns = query.select.map(resolve).filter(Boolean) as string[]
  const lines = [`SELECT ${columns.length ? columns.join(', ') : '*'}`, `FROM ${quote(query.from)}`]

  for (const join of query.joins) {
    const left = resolve(join.leftColumn)
    const right = resolve(join.rightColumn)
    if (!known.has(join.table) || !left || !right) {
      issues.push('An incomplete join was left out.')
      continue
    }
    lines.push(
      `${join.type === 'left' ? 'LEFT JOIN' : 'INNER JOIN'} ${quote(join.table)} ON ${left} = ${right}`,
    )
  }

  const condition = (node: SqlCondition | SqlGroup): string | null => {
    if (isGroup(node)) {
      const parts = node.conditions.map(condition).filter(Boolean) as string[]
      if (parts.length === 0) return null
      return parts.length === 1 ? parts[0] : `(${parts.join(` ${node.join.toUpperCase()} `)})`
    }

    const column = resolve(node.field)
    if (!column) return null

    const operator = TO_SQL[node.operator]
    if (!operator) {
      issues.push(`Unknown operator ${node.operator}`)
      return null
    }
    if (operator.unary) return `${column} ${operator.sql}`

    if (node.value.trim() === '') {
      issues.push(`${node.field} has no value and was left out.`)
      return null
    }

    // The value never reaches the string.
    params.push(
      node.operator === 'contains'
        ? `%${node.value}%`
        : node.operator === 'starts'
          ? `${node.value}%`
          : node.value,
    )
    return `${column} ${operator.sql} ${placeholder()}`
  }

  const where = condition(query.where)
  // The outermost brackets are the statement's own; WHERE supplies them.
  if (where) lines.push(`WHERE ${where.startsWith('(') ? where.slice(1, -1) : where}`)

  const grouped = query.groupBy.map(resolve).filter(Boolean) as string[]
  if (grouped.length) lines.push(`GROUP BY ${grouped.join(', ')}`)

  const ordered = query.orderBy
    .map((sort) => {
      const column = resolve(sort.column)
      return column ? `${column} ${sort.direction.toUpperCase()}` : null
    })
    .filter(Boolean) as string[]
  if (ordered.length) lines.push(`ORDER BY ${ordered.join(', ')}`)

  if (query.limit !== undefined && Number.isFinite(query.limit)) {
    // A limit is a number, but there is no reason for any caller-supplied
    // value to be concatenated.
    params.push(Math.max(0, Math.trunc(query.limit)))
    lines.push(`LIMIT ${placeholder()}`)
  }

  return { sql: `${lines.join('\n')};`, params, issues }
}

/* ------------------------------------------------------------------ parse */

type Token = {
  kind: 'word' | 'string' | 'number' | 'param' | 'op' | 'punct'
  value: string
  /** For quoted identifiers, so `"select"` is never read as a keyword. */
  quoted?: boolean
}

function tokenize(sql: string): Token[] {
  const out: Token[] = []
  let index = 0

  while (index < sql.length) {
    const char = sql[index]

    if (/\s/.test(char)) {
      index++
      continue
    }
    // Comments, both flavours.
    if (char === '-' && sql[index + 1] === '-') {
      while (index < sql.length && sql[index] !== '\n') index++
      continue
    }
    if (char === '/' && sql[index + 1] === '*') {
      index = sql.indexOf('*/', index + 2)
      index = index === -1 ? sql.length : index + 2
      continue
    }

    if (char === '"') {
      const end = sql.indexOf('"', index + 1)
      if (end === -1) break
      out.push({ kind: 'word', value: sql.slice(index + 1, end), quoted: true })
      index = end + 1
      continue
    }

    if (char === "'") {
      let value = ''
      index++
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          value += "'"
          index += 2
          continue
        }
        if (sql[index] === "'") break
        value += sql[index++]
      }
      index++
      out.push({ kind: 'string', value })
      continue
    }

    if (char === '$' && /\d/.test(sql[index + 1] ?? '')) {
      let digits = ''
      index++
      while (/\d/.test(sql[index] ?? '')) digits += sql[index++]
      out.push({ kind: 'param', value: digits })
      continue
    }
    if (char === '?') {
      index++
      out.push({ kind: 'param', value: '' })
      continue
    }

    if (/\d/.test(char)) {
      let digits = ''
      while (/[\d.]/.test(sql[index] ?? '')) digits += sql[index++]
      out.push({ kind: 'number', value: digits })
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      let word = ''
      while (/[A-Za-z0-9_]/.test(sql[index] ?? '')) word += sql[index++]
      out.push({ kind: 'word', value: word })
      continue
    }

    const two = sql.slice(index, index + 2)
    if (two === '<>' || two === '!=' || two === '>=' || two === '<=') {
      out.push({ kind: 'op', value: two === '!=' ? '<>' : two })
      index += 2
      continue
    }
    if (char === '=' || char === '<' || char === '>') {
      out.push({ kind: 'op', value: char })
      index++
      continue
    }

    out.push({ kind: 'punct', value: char })
    index++
  }

  return out
}

export type Parsed = { query: SelectQuery | null; issues: string[] }

/**
 * Read a statement back into a query.
 *
 * `params` is optional: when the statement still carries placeholders — which
 * is what `compileSelect` produces — the values are taken from here, so a
 * compile/parse round trip is lossless. A statement written by hand with
 * literals parses without them.
 */
export function parseSelect(sql: string, tables: SqlTable[], params: unknown[] = []): Parsed {
  const issues: string[] = []
  const tokens = tokenize(sql)
  let at = 0

  const peek = (offset = 0) => tokens[at + offset]
  const isWord = (word: string, offset = 0) => {
    const token = peek(offset)
    return token?.kind === 'word' && !token.quoted && token.value.toLowerCase() === word
  }
  const eatWord = (word: string) => {
    if (!isWord(word)) return false
    at++
    return true
  }
  const isPunct = (value: string, offset = 0) =>
    peek(offset)?.kind === 'punct' && peek(offset)?.value === value

  const known = new Map(tables.map((table) => [table.name, table]))
  /** Tables the statement has actually brought into scope, filled as we go. */
  const scope = new Set<string>()

  /**
   * The name as written — `a.b`, or a bare `b`.
   *
   * Reading is separate from resolving because the select list is written
   * before the `FROM` that gives it meaning: nothing is in scope yet when those
   * tokens go past, so a bare column cannot be attributed and an unknown one
   * cannot be rejected. Everything after `FROM` resolves immediately; the
   * select list is held and resolved once the joins are in.
   */
  const rawColumn = (): string | null => {
    const first = peek()
    if (first?.kind !== 'word') return null
    at++
    if (isPunct('.') && peek(1)?.kind === 'word') {
      at++
      const second = peek() as Token
      at++
      return qualify(first.value, second.value)
    }
    return first.value
  }

  /** A column, only if the schema has it and its table is in scope. */
  const resolveKey = (raw: string | null): string | null => {
    if (!raw) return null

    let key = raw
    if (!raw.includes('.')) {
      // Bare column: attribute it to the only table in scope that has one.
      const owners = [...scope].filter((name) =>
        known.get(name)?.columns.some((column) => column.name === raw),
      )
      if (owners.length > 1) {
        issues.push(`${raw} is ambiguous; qualify it`)
        return null
      }
      if (owners.length === 0) {
        issues.push(`${raw} is not in the schema and was dropped`)
        return null
      }
      key = qualify(owners[0], raw)
    }

    const [table, column] = splitQualified(key)
    if (!known.has(table) || !known.get(table)?.columns.some((item) => item.name === column)) {
      issues.push(`${key} is not in the schema and was dropped`)
      return null
    }
    if (!scope.has(table)) {
      issues.push(`${key} needs ${table} joined first`)
      return null
    }
    return key
  }

  const columnKey = (): string | null => resolveKey(rawColumn())
  const checkedColumn = (key: string | null): string | null => key

  const literal = (): string | null => {
    const token = peek()
    if (!token) return null
    if (token.kind === 'string' || token.kind === 'number') {
      at++
      return token.value
    }
    if (token.kind === 'param') {
      at++
      // Positional for `$n`, in order for `?`.
      const index = token.value ? Number(token.value) - 1 : usedParams++
      const value = params[index]
      return value === undefined ? '' : String(value)
    }
    if (token.kind === 'word' && !token.quoted) {
      at++
      return token.value
    }
    return null
  }
  let usedParams = 0

  /* ------------------------------------------------------------ SELECT */

  if (!eatWord('select')) return { query: null, issues: ['Only SELECT statements can be read.'] }

  for (const unsupported of ['distinct']) {
    if (eatWord(unsupported)) issues.push(`${unsupported.toUpperCase()} is not represented.`)
  }

  const rawSelect: string[] = []
  let selectAll = false
  if (isPunct('*')) {
    at++
    selectAll = true
  } else {
    do {
      const raw = rawColumn()
      if (raw) rawSelect.push(raw)
      else {
        issues.push('A selected expression was not a plain column and was dropped.')
        while (peek() && !isPunct(',') && !isWord('from')) at++
      }
    } while (isPunct(',') && ++at)
  }

  /* -------------------------------------------------------------- FROM */

  if (!eatWord('from')) return { query: null, issues: [...issues, 'No FROM clause.'] }
  const fromToken = peek()
  if (fromToken?.kind !== 'word') return { query: null, issues: [...issues, 'No table after FROM.'] }
  at++
  const from = fromToken.value
  if (!known.has(from)) {
    return { query: null, issues: [...issues, `${from} is not in the schema.`] }
  }
  scope.add(from)

  /* ------------------------------------------------------------- JOINs */

  const joins: SqlJoin[] = []
  for (;;) {
    let type: 'inner' | 'left' | null = null
    if (isWord('inner') && isWord('join', 1)) {
      at += 2
      type = 'inner'
    } else if (isWord('left') && (isWord('join', 1) || (isWord('outer', 1) && isWord('join', 2)))) {
      at += isWord('outer', 1) ? 3 : 2
      type = 'left'
    } else if (isWord('join')) {
      at++
      type = 'inner'
    }
    if (!type) break

    const table = peek()
    if (table?.kind !== 'word') {
      issues.push('A join had no table.')
      break
    }
    at++
    if (!known.has(table.value)) {
      issues.push(`${table.value} is not in the schema; the join was dropped.`)
      // Skip the ON clause so the rest still parses.
      while (peek() && !isWord('where') && !isWord('join') && !isWord('group') && !isWord('order') && !isWord('limit')) at++
      continue
    }
    scope.add(table.value)

    if (!eatWord('on')) {
      issues.push('A join had no ON clause.')
      continue
    }
    const left = checkedColumn(columnKey())
    if (peek()?.kind === 'op' && peek()?.value === '=') at++
    else issues.push('Only equality joins are represented.')
    const right = checkedColumn(columnKey())

    if (left && right) {
      joins.push({ id: nextId('j'), type, table: table.value, leftColumn: left, rightColumn: right })
    }
  }

  // Scope is complete, so the held select list can finally be resolved.
  const select = rawSelect.map(resolveKey).filter(Boolean) as string[]

  /* ------------------------------------------------------------- WHERE */

  const predicate = (): SqlCondition | null => {
    const key = checkedColumn(columnKey())
    if (!key) {
      // Skip to a boundary so one bad predicate does not lose the rest.
      while (peek() && !isWord('and') && !isWord('or') && !isPunct(')')) at++
      return null
    }

    const [table, column] = splitQualified(key)
    const family = familyOf(known.get(table)?.columns.find((item) => item.name === column)?.type)

    if (eatWord('is')) {
      const negated = eatWord('not')
      if (!eatWord('null')) issues.push('Only IS NULL and IS NOT NULL are represented.')
      return { id: nextId('c'), field: key, operator: negated ? 'set' : 'unset', value: '' }
    }

    if (eatWord('like')) {
      const value = literal() ?? ''
      const contains = value.startsWith('%') && value.endsWith('%')
      return {
        id: nextId('c'),
        field: key,
        operator: contains ? 'contains' : 'starts',
        value: value.replace(/^%|%$/g, ''),
      }
    }

    const operator = peek()
    if (operator?.kind !== 'op') {
      issues.push(`No operator after ${key}.`)
      return null
    }
    at++

    if (isWord('true') || isWord('false')) {
      const truthy = isWord('true')
      at++
      return { id: nextId('c'), field: key, operator: truthy ? 'true' : 'false', value: '' }
    }

    const value = literal()
    if (value === null) {
      issues.push(`No value after ${key}.`)
      return null
    }

    // Dates read better as after/before, and those are the operators the
    // builder offers for a date column.
    const map: Record<string, string> = {
      '=': 'eq',
      '<>': 'neq',
      '>': family === 'date' ? 'after' : 'gt',
      '<': family === 'date' ? 'before' : 'lt',
      '>=': 'gte',
      '<=': 'lte',
    }
    return { id: nextId('c'), field: key, operator: map[operator.value] ?? 'eq', value }
  }

  const expression = (): SqlGroup => {
    const parseFactor = (): SqlCondition | SqlGroup | null => {
      if (isPunct('(')) {
        at++
        const inner = expression()
        if (isPunct(')')) at++
        else issues.push('Unbalanced parentheses.')
        return inner.conditions.length === 1 ? inner.conditions[0] : inner
      }
      return predicate()
    }

    const first = parseFactor()
    const conditions: (SqlCondition | SqlGroup)[] = first ? [first] : []
    let join: 'and' | 'or' = 'and'

    while (isWord('and') || isWord('or')) {
      const next = isWord('or') ? 'or' : 'and'
      at++
      /*
       * Mixed AND and OR at one level are not the same query.
       *
       * `a AND b OR c` binds as `(a AND b) OR c`, and this component's shape —
       * one join per group — cannot hold that flat. Rather than silently
       * flatten it into something that means something else, the tighter half
       * is wrapped into its own group, which is exactly what the brackets say.
       */
      if (conditions.length > 1 && next !== join) {
        if (next === 'and') {
          const last = conditions.pop() as SqlCondition | SqlGroup
          const operand = parseFactor()
          conditions.push({
            id: nextId('g'),
            join: 'and',
            conditions: operand ? [last, operand] : [last],
          })
          continue
        }
        const wrapped: SqlGroup = { id: nextId('g'), join, conditions: [...conditions] }
        conditions.length = 0
        conditions.push(wrapped)
      }
      join = next
      const operand = parseFactor()
      if (operand) conditions.push(operand)
    }

    return { id: nextId('g'), join, conditions }
  }

  let where: SqlGroup = { id: nextId('g'), join: 'and', conditions: [] }
  if (eatWord('where')) where = expression()

  /* ------------------------------------------- GROUP BY / ORDER BY / LIMIT */

  const groupBy: string[] = []
  if (isWord('group') && isWord('by', 1)) {
    at += 2
    do {
      const key = checkedColumn(columnKey())
      if (key) groupBy.push(key)
    } while (isPunct(',') && ++at)
  }

  const orderBy: SqlSort[] = []
  if (isWord('order') && isWord('by', 1)) {
    at += 2
    do {
      const key = checkedColumn(columnKey())
      const direction = eatWord('desc') ? 'desc' : (eatWord('asc'), 'asc')
      if (key) orderBy.push({ column: key, direction })
    } while (isPunct(',') && ++at)
  }

  let limit: number | undefined
  if (eatWord('limit')) {
    const value = literal()
    const parsed = Number(value)
    if (Number.isFinite(parsed)) limit = parsed
    else issues.push('LIMIT was not a number.')
  }

  for (const word of ['union', 'having', 'offset', 'with']) {
    if (tokens.slice(at).some((token) => token.kind === 'word' && token.value.toLowerCase() === word)) {
      issues.push(`${word.toUpperCase()} is not represented and was dropped.`)
    }
  }

  return {
    query: { from, joins, select: selectAll ? [] : select, where, groupBy, orderBy, limit },
    issues,
  }
}
