/**
 * The `SELECT` grammar a query builder can round-trip, across providers.
 *
 * Two functions over one shape: `compileSelect` turns a query into a
 * parameterised statement, and `parseSelect` turns a statement back into a
 * query. They are here rather than in the component because a builder that can
 * only go one way is a dead end — you can construct a query but not open one
 * you already have — and because the safety argument below is worth testing on
 * its own, without a DOM.
 *
 * **Values are parameters; identifiers and functions are allow-listed.** A
 * value never enters the SQL text: it is emitted as a placeholder and returned
 * separately, which is what makes the output safe to execute. Identifiers
 * cannot be parameterised by any driver, so the only defence is a list — every
 * table, column and function name is looked up in what the caller declared, and
 * anything absent is dropped with the reason reported. Nothing reaches the
 * statement unless it was already in your schema.
 *
 * **Providers differ in ways that matter.** Quoting is `"x"`, `` `x` `` or
 * `[x]`; placeholders are `$1`, `?` or `@p1`; SQL Server has no `LIMIT` and its
 * `OFFSET…FETCH` requires an `ORDER BY`; booleans are literals in some and `1`
 * and `0` in others; and each has operators the others do not — `ILIKE`, `~`,
 * `REGEXP`, `GLOB`. `dialect` selects all of that at once, so a query built
 * against one provider states plainly what it cannot do on another rather than
 * emitting SQL that will not run.
 *
 * The subset is deliberate: `SELECT`, `FROM`, inner and left joins on a single
 * equality, a `WHERE` tree with `AND`/`OR` and brackets, `GROUP BY`, one
 * `ORDER BY`, and a row limit. Sub-queries, CTEs, unions and window functions
 * are not expressible, and `parseSelect` says so rather than half-reading them.
 */

export type SqlDialect = 'postgres' | 'mysql' | 'sqlite' | 'mssql'
export type Family = 'string' | 'number' | 'date' | 'boolean'

export type SqlTable = {
  name: string
  columns: { name: string; type?: string }[]
}

/**
 * A function the caller permits, by name.
 *
 * This is the answer to "how do I use a function": you declare it and it joins
 * the vocabulary. It is never free text — a name that is not on this list
 * cannot reach the statement, for the same reason a table name cannot.
 */
export type SqlFunction = {
  name: string
  label?: string
  /** Column families it accepts. Omitted means any. */
  families?: Family[]
  /** Family of the result, which decides the operators offered. */
  returns?: Family
  /** Providers that have it. Omitted means all. */
  dialects?: SqlDialect[]
}

export type SqlCondition = {
  id: string
  /** A qualified `table.column`, or `fn(table.column)`. */
  field: string
  operator: string
  value: string
  /** For `many` operators — `IN`, `NOT IN`. */
  values?: string[]
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

/** Kept for callers that only care about the placeholder style. */
export type Placeholders = 'numbered' | 'question'

const isGroup = (node: SqlCondition | SqlGroup): node is SqlGroup => 'conditions' in node

let counter = 0
const nextId = (prefix: string) => `${prefix}${++counter}`

/* ------------------------------------------------------------- operators */

export type OperatorSpec = {
  id: string
  label: string
  /** `none` takes no value, `one` a single value, `many` a list. */
  arity: 'none' | 'one' | 'many'
  /** The infix token, or the whole tail for a `none` operator. */
  sql: string
  /** Column families it applies to. Omitted means all. */
  families?: Family[]
  /** Wraps the bound value — `%x%` for contains. Never touches the SQL. */
  wrap?: (value: string) => string
  /** Strips that wrapping when reading a statement back. */
  unwrap?: (value: string) => string
}

/** Everything every provider has. */
const BASE: OperatorSpec[] = [
  { id: 'eq', label: '=', arity: 'one', sql: '=' },
  { id: 'neq', label: '≠', arity: 'one', sql: '<>' },
  { id: 'gt', label: '>', arity: 'one', sql: '>', families: ['number'] },
  { id: 'gte', label: '≥', arity: 'one', sql: '>=', families: ['number'] },
  { id: 'lt', label: '<', arity: 'one', sql: '<', families: ['number'] },
  { id: 'lte', label: '≤', arity: 'one', sql: '<=', families: ['number'] },
  { id: 'after', label: 'after', arity: 'one', sql: '>', families: ['date'] },
  { id: 'before', label: 'before', arity: 'one', sql: '<', families: ['date'] },
  {
    id: 'contains',
    label: 'contains',
    arity: 'one',
    sql: 'LIKE',
    families: ['string'],
    wrap: (value) => `%${value}%`,
    unwrap: (value) => value.replace(/^%|%$/g, ''),
  },
  {
    id: 'starts',
    label: 'starts with',
    arity: 'one',
    sql: 'LIKE',
    families: ['string'],
    wrap: (value) => `${value}%`,
    unwrap: (value) => value.replace(/%$/, ''),
  },
  // The reason this module grew a `many` arity at all.
  { id: 'in', label: 'in', arity: 'many', sql: 'IN' },
  { id: 'nin', label: 'not in', arity: 'many', sql: 'NOT IN' },
  { id: 'set', label: 'is not null', arity: 'none', sql: 'IS NOT NULL' },
  { id: 'unset', label: 'is null', arity: 'none', sql: 'IS NULL' },
]

type DialectSpec = {
  label: string
  quote: (name: string) => string
  placeholder: (position: number) => string
  /** How a row limit is written, given the placeholder for its value. */
  limit: (placeholder: string) => string
  /** Some providers can only limit an ordered result. */
  limitNeedsOrder?: boolean
  /** Added to `BASE`; an id already there replaces it. */
  operators: OperatorSpec[]
}

const TRUE_FALSE: OperatorSpec[] = [
  { id: 'true', label: 'is true', arity: 'none', sql: '= TRUE', families: ['boolean'] },
  { id: 'false', label: 'is false', arity: 'none', sql: '= FALSE', families: ['boolean'] },
]

/** `1` and `0`, for providers with no boolean literal. */
const ONE_ZERO: OperatorSpec[] = [
  { id: 'true', label: 'is true', arity: 'none', sql: '= 1', families: ['boolean'] },
  { id: 'false', label: 'is false', arity: 'none', sql: '= 0', families: ['boolean'] },
]

export const DIALECTS: Record<SqlDialect, DialectSpec> = {
  postgres: {
    label: 'PostgreSQL',
    quote: (name) => `"${name}"`,
    placeholder: (position) => `$${position}`,
    limit: (placeholder) => `LIMIT ${placeholder}`,
    operators: [
      ...TRUE_FALSE,
      {
        id: 'icontains',
        label: 'contains (any case)',
        arity: 'one',
        sql: 'ILIKE',
        families: ['string'],
        wrap: (value) => `%${value}%`,
        unwrap: (value) => value.replace(/^%|%$/g, ''),
      },
      { id: 'regex', label: 'matches regex', arity: 'one', sql: '~', families: ['string'] },
      { id: 'iregex', label: 'matches regex (any case)', arity: 'one', sql: '~*', families: ['string'] },
    ],
  },
  mysql: {
    label: 'MySQL',
    quote: (name) => `\`${name}\``,
    placeholder: () => '?',
    limit: (placeholder) => `LIMIT ${placeholder}`,
    operators: [
      ...TRUE_FALSE,
      { id: 'regex', label: 'matches regex', arity: 'one', sql: 'REGEXP', families: ['string'] },
      { id: 'sounds', label: 'sounds like', arity: 'one', sql: 'SOUNDS LIKE', families: ['string'] },
    ],
  },
  sqlite: {
    label: 'SQLite',
    quote: (name) => `"${name}"`,
    placeholder: () => '?',
    limit: (placeholder) => `LIMIT ${placeholder}`,
    operators: [
      ...ONE_ZERO,
      { id: 'glob', label: 'matches glob', arity: 'one', sql: 'GLOB', families: ['string'] },
    ],
  },
  mssql: {
    label: 'SQL Server',
    quote: (name) => `[${name}]`,
    placeholder: (position) => `@p${position}`,
    // No LIMIT. OFFSET…FETCH is the supported form, and it needs an ORDER BY.
    limit: (placeholder) => `OFFSET 0 ROWS FETCH NEXT ${placeholder} ROWS ONLY`,
    limitNeedsOrder: true,
    operators: [...ONE_ZERO],
  },
}

/** The operator list for a dialect, with its overrides applied. */
export function operatorsOf(dialect: SqlDialect): OperatorSpec[] {
  const extra = DIALECTS[dialect].operators
  const replaced = new Set(extra.map((item) => item.id))
  return [...BASE.filter((item) => !replaced.has(item.id)), ...extra]
}

/** Those of them that suit a column family. */
export function operatorsFor(dialect: SqlDialect, family: Family): OperatorSpec[] {
  return operatorsOf(dialect).filter(
    (operator) => !operator.families || operator.families.includes(family),
  )
}

/* --------------------------------------------------------------- schema */

/** SQL types collapsed to the families the operator lists are built around. */
export function familyOf(type: string | undefined): Family {
  const lower = (type ?? '').toLowerCase()
  if (/bool/.test(lower)) return 'boolean'
  if (/int|numeric|decimal|real|double|float|money|serial/.test(lower)) return 'number'
  if (/date|time/.test(lower)) return 'date'
  return 'string'
}

/** A bare identifier — the only shape allowed into a statement. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

export const qualify = (table: string, column: string) => `${table}.${column}`

export function splitQualified(key: string): [string, string] {
  const at = key.indexOf('.')
  return at === -1 ? ['', key] : [key.slice(0, at), key.slice(at + 1)]
}

/** `lower(users.email)` → `['lower', 'users.email']`; a plain key → `[null, key]`. */
export function splitFunction(key: string): [string | null, string] {
  const open = key.indexOf('(')
  if (open === -1 || !key.endsWith(')')) return [null, key]
  return [key.slice(0, open).trim(), key.slice(open + 1, -1).trim()]
}

export const applyFunction = (fn: string, key: string) => `${fn}(${key})`

/** The family a field resolves to, following a function's `returns`. */
export function familyOfField(
  key: string,
  tables: SqlTable[],
  functions: SqlFunction[] = [],
): Family {
  const [fn, inner] = splitFunction(key)
  const [table, column] = splitQualified(inner)
  const type = tables.find((item) => item.name === table)?.columns.find((c) => c.name === column)?.type
  const base = familyOf(type)
  if (!fn) return base
  return functions.find((item) => item.name === fn)?.returns ?? base
}

/* --------------------------------------------------------------- compile */

export type Compiled = { sql: string; params: unknown[]; issues: string[] }

export type CompileOptions = {
  dialect?: SqlDialect
  /** Functions the caller permits. Anything else is dropped. */
  functions?: SqlFunction[]
  /** Overrides the dialect's placeholder style. */
  placeholders?: Placeholders
}

export function compileSelect(
  query: SelectQuery,
  tables: SqlTable[],
  options: CompileOptions | Placeholders = {},
): Compiled {
  // The third argument used to be the placeholder style; both still work.
  const opts: CompileOptions = typeof options === 'string' ? { placeholders: options } : options
  const dialect = opts.dialect ?? 'postgres'
  const spec = DIALECTS[dialect]
  const functions = (opts.functions ?? []).filter(
    (fn) => !fn.dialects || fn.dialects.includes(dialect),
  )

  const params: unknown[] = []
  const issues: string[] = []
  const placeholder = () =>
    opts.placeholders === 'question'
      ? '?'
      : opts.placeholders === 'numbered'
        ? `$${params.length}`
        : spec.placeholder(params.length)

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

  /** A field — plain or wrapped in a declared function — as quoted SQL. */
  const resolve = (key: string): string | null => {
    const [fn, inner] = splitFunction(key)

    if (fn !== null) {
      const allowed = functions.find((item) => item.name === fn)
      if (!allowed) {
        issues.push(`${fn}() is not a declared function`)
        return null
      }
      if (!IDENTIFIER.test(fn)) {
        issues.push(`${fn} is not a plain identifier`)
        return null
      }
      const resolved = resolve(inner)
      return resolved === null ? null : `${fn}(${resolved})`
    }

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
    return `${spec.quote(table)}.${spec.quote(column)}`
  }

  if (!known.has(query.from)) {
    return { sql: '', params: [], issues: ['Pick a table to select from.'] }
  }

  const operators = new Map(operatorsOf(dialect).map((operator) => [operator.id, operator]))

  const columns = query.select.map(resolve).filter(Boolean) as string[]
  const lines = [
    `SELECT ${columns.length ? columns.join(', ') : '*'}`,
    `FROM ${spec.quote(query.from)}`,
  ]

  for (const join of query.joins) {
    const left = resolve(join.leftColumn)
    const right = resolve(join.rightColumn)
    if (!known.has(join.table) || !left || !right) {
      issues.push('An incomplete join was left out.')
      continue
    }
    lines.push(
      `${join.type === 'left' ? 'LEFT JOIN' : 'INNER JOIN'} ${spec.quote(join.table)} ON ${left} = ${right}`,
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

    const operator = operators.get(node.operator)
    if (!operator) {
      // Usually a query built for one provider opened against another.
      issues.push(`${node.operator} is not available on ${spec.label}`)
      return null
    }

    if (operator.arity === 'none') return `${column} ${operator.sql}`

    if (operator.arity === 'many') {
      const list = (node.values ?? []).map((item) => item.trim()).filter(Boolean)
      if (list.length === 0) {
        issues.push(`${node.field} has no values and was left out.`)
        return null
      }
      // One placeholder per item — the list is bound, never spliced.
      const slots = list.map((item) => {
        params.push(item)
        return placeholder()
      })
      return `${column} ${operator.sql} (${slots.join(', ')})`
    }

    if (node.value.trim() === '') {
      issues.push(`${node.field} has no value and was left out.`)
      return null
    }

    params.push(operator.wrap ? operator.wrap(node.value) : node.value)
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
    if (spec.limitNeedsOrder && ordered.length === 0) {
      // Not a stylistic point: OFFSET…FETCH without ORDER BY is a syntax error.
      issues.push(`${spec.label} can only limit an ordered result — add an ORDER BY.`)
    } else {
      // A limit is a number, but there is no reason for any caller-supplied
      // value to be concatenated.
      params.push(Math.max(0, Math.trunc(query.limit)))
      lines.push(spec.limit(placeholder()))
    }
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

    // Every provider's identifier quoting, so one parser reads them all.
    if (char === '"' || char === '`' || char === '[') {
      const close = char === '"' ? '"' : char === '`' ? '`' : ']'
      const end = sql.indexOf(close, index + 1)
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

    // `$1`, `?`, `@p1` — every placeholder style.
    if (char === '$' && /\d/.test(sql[index + 1] ?? '')) {
      let digits = ''
      index++
      while (/\d/.test(sql[index] ?? '')) digits += sql[index++]
      out.push({ kind: 'param', value: digits })
      continue
    }
    if (char === '@' && /p?\d/i.test(sql.slice(index + 1, index + 3))) {
      index++
      if (/p/i.test(sql[index] ?? '')) index++
      let digits = ''
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

    const three = sql.slice(index, index + 2)
    if (three === '~*') {
      out.push({ kind: 'op', value: '~*' })
      index += 2
      continue
    }
    if (three === '<>' || three === '!=' || three === '>=' || three === '<=') {
      out.push({ kind: 'op', value: three === '!=' ? '<>' : three })
      index += 2
      continue
    }
    if (char === '=' || char === '<' || char === '>' || char === '~') {
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

export type ParseOptions = CompileOptions & { params?: unknown[] }

/**
 * Read a statement back into a query.
 *
 * `params` is optional: when the statement still carries placeholders — which
 * is what `compileSelect` produces — the values are taken from there, so a
 * compile/parse round trip is lossless. A statement written by hand with
 * literals parses without them.
 */
export function parseSelect(
  sql: string,
  tables: SqlTable[],
  options: ParseOptions | unknown[] = {},
): Parsed {
  // The third argument used to be the parameter list; both still work.
  const opts: ParseOptions = Array.isArray(options) ? { params: options } : options
  const params = opts.params ?? []
  const dialect = opts.dialect ?? 'postgres'
  const functions = (opts.functions ?? []).filter(
    (fn) => !fn.dialects || fn.dialects.includes(dialect),
  )

  const issues: string[] = []
  const tokens = tokenize(sql)
  let at = 0
  let usedParams = 0

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
  /** Tables the statement has brought into scope, filled as we go. */
  const scope = new Set<string>()

  /**
   * The name as written — `a.b`, a bare `b`, or `fn(a.b)`.
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

    // A declared function wrapping a column.
    if (!first.quoted && isPunct('(', 1)) {
      const name = first.value
      const known = functions.some((fn) => fn.name.toLowerCase() === name.toLowerCase())
      at += 2
      const inner = rawColumn()
      if (isPunct(')')) at++
      if (!inner) return null
      if (!known) {
        issues.push(`${name}() is not a declared function and was dropped`)
        return null
      }
      return applyFunction(name, inner)
    }

    at++
    if (isPunct('.') && peek(1)?.kind === 'word') {
      at++
      const second = peek() as Token
      at++
      return qualify(first.value, second.value)
    }
    return first.value
  }

  /** A field, only if the schema has it and its table is in scope. */
  const resolveKey = (raw: string | null): string | null => {
    if (!raw) return null

    const [fn, inner] = splitFunction(raw)
    if (fn !== null) {
      const resolved = resolveKey(inner)
      return resolved === null ? null : applyFunction(fn, resolved)
    }

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

  const columnKey = () => resolveKey(rawColumn())

  const literal = (): string | null => {
    const token = peek()
    if (!token) return null
    if (token.kind === 'string' || token.kind === 'number') {
      at++
      return token.value
    }
    if (token.kind === 'param') {
      at++
      // Positional for `$n` and `@pn`, in order for `?`.
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

  /* ------------------------------------------------------------ SELECT */

  if (!eatWord('select')) return { query: null, issues: ['Only SELECT statements can be read.'] }
  if (eatWord('distinct')) issues.push('DISTINCT is not represented.')

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
      while (
        peek() &&
        !isWord('where') &&
        !isWord('join') &&
        !isWord('group') &&
        !isWord('order') &&
        !isWord('limit')
      ) {
        at++
      }
      continue
    }
    scope.add(table.value)

    if (!eatWord('on')) {
      issues.push('A join had no ON clause.')
      continue
    }
    const left = columnKey()
    if (peek()?.kind === 'op' && peek()?.value === '=') at++
    else issues.push('Only equality joins are represented.')
    const right = columnKey()

    if (left && right) {
      joins.push({ id: nextId('j'), type, table: table.value, leftColumn: left, rightColumn: right })
    }
  }

  // Scope is complete, so the held select list can finally be resolved.
  const select = rawSelect.map(resolveKey).filter(Boolean) as string[]

  /* ------------------------------------------------------------- WHERE */

  const operators = operatorsOf(dialect)
  /** SQL token back to an operator id, longest token first so `NOT IN` wins. */
  const byToken = [...operators].sort((a, b) => b.sql.length - a.sql.length)

  const predicate = (): SqlCondition | null => {
    const key = columnKey()
    if (!key) {
      // Skip to a boundary so one bad predicate does not lose the rest.
      while (peek() && !isWord('and') && !isWord('or') && !isPunct(')')) at++
      return null
    }

    const family = familyOfField(key, tables, functions)

    if (eatWord('is')) {
      const negated = eatWord('not')
      if (!eatWord('null')) issues.push('Only IS NULL and IS NOT NULL are represented.')
      return { id: nextId('c'), field: key, operator: negated ? 'set' : 'unset', value: '' }
    }

    // IN and NOT IN, with their bracketed list.
    const negatedIn = isWord('not') && isWord('in', 1)
    if (negatedIn || isWord('in')) {
      at += negatedIn ? 2 : 1
      const values: string[] = []
      if (isPunct('(')) {
        at++
        do {
          const item = literal()
          if (item !== null) values.push(item)
        } while (isPunct(',') && ++at)
        if (isPunct(')')) at++
        else issues.push('Unbalanced brackets in an IN list.')
      } else {
        issues.push('IN needs a bracketed list.')
      }
      return {
        id: nextId('c'),
        field: key,
        operator: negatedIn ? 'nin' : 'in',
        value: '',
        values,
      }
    }

    // A word operator — LIKE, ILIKE, REGEXP, GLOB, SOUNDS LIKE.
    const word = peek()
    if (word?.kind === 'word' && !word.quoted) {
      const text = word.value.toUpperCase()
      const twoWord = `${text} ${peek(1)?.kind === 'word' ? (peek(1) as Token).value.toUpperCase() : ''}`.trim()
      const match =
        byToken.find((operator) => operator.sql === twoWord) ??
        byToken.find((operator) => operator.sql === text)

      if (match) {
        at += match.sql.includes(' ') ? 2 : 1
        const raw = literal() ?? ''
        // `contains` and `starts` are both LIKE; the wildcards say which.
        const candidates = operators.filter(
          (operator) => operator.sql === match.sql && operator.arity === 'one',
        )
        const chosen =
          candidates.find(
            (operator) =>
              operator.id === 'contains' && raw.startsWith('%') && raw.endsWith('%'),
          ) ??
          candidates.find((operator) => operator.id === 'starts' && raw.endsWith('%')) ??
          candidates.find((operator) => operator.id === 'icontains' && raw.startsWith('%')) ??
          match
        return {
          id: nextId('c'),
          field: key,
          operator: chosen.id,
          value: chosen.unwrap ? chosen.unwrap(raw) : raw,
        }
      }
    }

    const symbol = peek()
    if (symbol?.kind !== 'op') {
      issues.push(`No operator after ${key}.`)
      return null
    }
    at++

    // `= TRUE` / `= 1` and their negatives, which are whole predicates.
    if (symbol.value === '=' && (isWord('true') || isWord('false'))) {
      const truthy = isWord('true')
      at++
      return { id: nextId('c'), field: key, operator: truthy ? 'true' : 'false', value: '' }
    }
    if (symbol.value === '=' && family === 'boolean' && peek()?.kind === 'number') {
      const digit = (peek() as Token).value
      at++
      return { id: nextId('c'), field: key, operator: digit === '0' ? 'false' : 'true', value: '' }
    }

    const raw = literal()
    if (raw === null) {
      issues.push(`No value after ${key}.`)
      return null
    }

    const candidates = operators.filter(
      (operator) => operator.sql === symbol.value && operator.arity === 'one',
    )
    // Dates read better as after/before, and those are what the builder offers.
    const chosen =
      candidates.find((operator) => operator.families?.includes(family)) ?? candidates[0]

    if (!chosen) {
      issues.push(`${symbol.value} is not available on ${DIALECTS[dialect].label}`)
      return null
    }
    return { id: nextId('c'), field: key, operator: chosen.id, value: raw }
  }

  const expression = (): SqlGroup => {
    const parseFactor = (): SqlCondition | SqlGroup | null => {
      if (isPunct('(')) {
        at++
        const inner = expression()
        if (isPunct(')')) at++
        else issues.push('Unbalanced brackets.')
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
       * `a AND b OR c` binds as `(a AND b) OR c`, and one join per group cannot
       * hold that flat. Rather than silently flatten it into something that
       * means something else, the tighter half is wrapped into its own group —
       * which is exactly what the brackets say.
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
      const key = columnKey()
      if (key) groupBy.push(key)
    } while (isPunct(',') && ++at)
  }

  const orderBy: SqlSort[] = []
  if (isWord('order') && isWord('by', 1)) {
    at += 2
    do {
      const key = columnKey()
      const direction = eatWord('desc') ? 'desc' : (eatWord('asc'), 'asc')
      if (key) orderBy.push({ column: key, direction })
    } while (isPunct(',') && ++at)
  }

  let limit: number | undefined
  if (eatWord('limit')) {
    const parsed = Number(literal())
    if (Number.isFinite(parsed)) limit = parsed
    else issues.push('LIMIT was not a number.')
  } else if (eatWord('offset')) {
    // SQL Server's OFFSET n ROWS FETCH NEXT m ROWS ONLY.
    literal()
    eatWord('rows')
    if (eatWord('fetch')) {
      eatWord('next')
      eatWord('first')
      const parsed = Number(literal())
      if (Number.isFinite(parsed)) limit = parsed
      eatWord('rows')
      eatWord('only')
    }
  }

  for (const word of ['union', 'having', 'with']) {
    if (tokens.slice(at).some((token) => token.kind === 'word' && token.value.toLowerCase() === word)) {
      issues.push(`${word.toUpperCase()} is not represented and was dropped.`)
    }
  }

  return {
    query: { from, joins, select: selectAll ? [] : select, where, groupBy, orderBy, limit },
    issues,
  }
}
