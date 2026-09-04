import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { MultiSelect } from '@/components/ui/multi-select'
import { SegmentBuilder, type ConditionGroup } from '@/components/ui/segment-builder'
import { Select } from '@/components/ui/select'
import type { SchemaColumn } from '@/components/ui/schema-table'
import { fieldBase, fieldOutline, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A SQL query assembled from a schema, not typed as text.
 *
 * The counterpart to `QueryEditor`: that one is for people who already know
 * SQL and want a console; this one is for people who know the *question* and
 * not the dialect — an analyst filtering an export, a support engineer building
 * a one-off list. The two are meant to sit beside each other, and the generated
 * SQL is copyable straight into the editor.
 *
 * **It follows the schema, so the pickers can only offer real columns.** Choose
 * a table and the column lists become that table's; add a join and its columns
 * join the pool, qualified as `table.column`; change the table and the choices
 * that referenced the old one are cleared rather than left behind to generate a
 * query that will not run.
 *
 * **Values become parameters. Identifiers are checked against the schema.**
 * These are the two halves of the same problem, and both are handled here
 * rather than left to the caller. A value never enters the SQL string at all —
 * it is emitted as `$1` and returned alongside in `params`, which is what makes
 * the output safe to execute. Identifiers *cannot* be parameterised by any
 * driver, so the only defence is an allow-list: every table and column name is
 * looked up in the schema you passed and anything not found is dropped. A name
 * cannot reach the query unless it was already in your schema.
 *
 * **The WHERE clause is a `SegmentBuilder`.** It is the same problem — nested
 * conditions where precedence has to be visible — and solving it twice would
 * mean two answers to "what does A or B and C mean". Its fields are the
 * schema's columns.
 *
 * It builds single-table-plus-joins SELECTs. Sub-queries, CTEs, window
 * functions and unions are not expressible here and are not meant to be: past a
 * certain complexity a builder is slower than typing, and that is what the
 * editor beside it is for.
 */
export type QueryTable = {
  name: string
  columns: SchemaColumn[]
  label?: ReactNode
}

export type QueryJoin = {
  id: string
  type: 'inner' | 'left'
  table: string
  /** Qualified `table.column` on each side of the ON. */
  leftColumn: string
  rightColumn: string
}

export type QuerySort = { column: string; direction: 'asc' | 'desc' }

export type Query = {
  from: string
  joins: QueryJoin[]
  /** Qualified columns. Empty means every column. */
  select: string[]
  where: ConditionGroup
  groupBy: string[]
  orderBy: QuerySort[]
  limit?: number
}

type QueryConstructorProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  tables: QueryTable[]
  value?: Query
  defaultValue?: Query
  onChange?: (query: Query) => void
  /** The compiled statement and its parameters, on every change. */
  onCompile?: (sql: string, params: unknown[]) => void
  /** `$1` for Postgres, `?` for MySQL and SQLite. */
  placeholders?: 'numbered' | 'question'
  /** Hide the generated SQL. */
  preview?: boolean
  /** Rows added to the statement when set. */
  defaultLimit?: number
  label?: string
  runLabel?: ReactNode
  onRun?: (sql: string, params: unknown[]) => void
}

/* ------------------------------------------------------------- the schema */

/** SQL types collapsed to the families the operator lists are built around. */
function familyOf(type: string): 'string' | 'number' | 'date' | 'boolean' {
  const lower = type.toLowerCase()
  if (/bool/.test(lower)) return 'boolean'
  if (/int|numeric|decimal|real|double|float|money|serial/.test(lower)) return 'number'
  if (/date|time/.test(lower)) return 'date'
  return 'string'
}

/**
 * A bare identifier, which is the only shape allowed into the statement.
 *
 * Belt and braces: names are already restricted to what the schema contains,
 * and this rejects anything that could not be a plain identifier even so.
 */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const quote = (name: string) => `"${name}"`

const qualified = (table: string, column: string) => `${table}.${column}`

const splitQualified = (key: string): [string, string] => {
  const at = key.indexOf('.')
  return at === -1 ? ['', key] : [key.slice(0, at), key.slice(at + 1)]
}

/* ------------------------------------------------------------- compiling */

const SQL_OPERATORS: Record<string, { sql: string; unary?: boolean }> = {
  eq: { sql: '=' },
  neq: { sql: '<>' },
  gt: { sql: '>' },
  gte: { sql: '>=' },
  lt: { sql: '<' },
  lte: { sql: '<=' },
  contains: { sql: 'LIKE' },
  starts: { sql: 'LIKE' },
  set: { sql: 'IS NOT NULL', unary: true },
  unset: { sql: 'IS NULL', unary: true },
  true: { sql: '= TRUE', unary: true },
  false: { sql: '= FALSE', unary: true },
  after: { sql: '>' },
  before: { sql: '<' },
  in: { sql: '= ANY' },
}

type Compiled = { sql: string; params: unknown[]; issues: string[] }

/**
 * Build the statement.
 *
 * Every identifier is resolved through `known`, so a name that is not in the
 * schema cannot appear in the output; every value goes to `params`.
 */
function compile(
  query: Query,
  tables: QueryTable[],
  placeholders: 'numbered' | 'question',
): Compiled {
  const params: unknown[] = []
  const issues: string[] = []

  const placeholder = () =>
    placeholders === 'numbered' ? `$${params.length}` : '?'

  const tableNames = new Set(tables.map((table) => table.name))
  const columnsOf = (name: string) =>
    new Set(tables.find((table) => table.name === name)?.columns.map((column) => column.name) ?? [])

  /**
   * The tables this statement can actually reference.
   *
   * Being in the schema is not enough. A column of a table that is neither the
   * source nor joined compiles to valid-looking SQL that the database rejects —
   * "missing FROM-clause entry" — so scope is checked separately from
   * existence, and the two failures are reported differently.
   */
  const inScope = new Set(
    [query.from, ...query.joins.map((join) => join.table)].filter((name) => tableNames.has(name)),
  )

  /** A qualified column, only if it exists *and* its table is in the query. */
  const resolve = (key: string): string | null => {
    const [table, column] = splitQualified(key)
    if (!tableNames.has(table) || !columnsOf(table).has(column)) {
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

  if (!tableNames.has(query.from)) {
    return { sql: '', params: [], issues: ['Pick a table to select from.'] }
  }

  const columns = query.select.map(resolve).filter(Boolean) as string[]
  const lines = [`SELECT ${columns.length ? columns.join(', ') : '*'}`, `FROM ${quote(query.from)}`]

  for (const join of query.joins) {
    const left = resolve(join.leftColumn)
    const right = resolve(join.rightColumn)
    if (!tableNames.has(join.table) || !left || !right) {
      issues.push('An incomplete join was left out.')
      continue
    }
    lines.push(`${join.type === 'left' ? 'LEFT JOIN' : 'INNER JOIN'} ${quote(join.table)} ON ${left} = ${right}`)
  }

  /** The WHERE tree, recursively, with real parentheses. */
  const condition = (node: ConditionGroup | { field: string; operator: string; value: string }): string | null => {
    if ('conditions' in node) {
      const parts = node.conditions.map(condition).filter(Boolean) as string[]
      if (parts.length === 0) return null
      return parts.length === 1 ? parts[0] : `(${parts.join(` ${node.join.toUpperCase()} `)})`
    }

    const column = resolve(node.field)
    if (!column) return null

    const operator = SQL_OPERATORS[node.operator]
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
    // A limit is a number, but it still goes through a parameter — there is no
    // reason for any caller-supplied value to be concatenated.
    params.push(Math.max(0, Math.trunc(query.limit)))
    lines.push(`LIMIT ${placeholder()}`)
  }

  return { sql: `${lines.join('\n')};`, params, issues }
}

/* ------------------------------------------------------------ the builder */

let counter = 0
const nextId = () => `j${++counter}`

const emptyQuery = (from: string): Query => ({
  from,
  joins: [],
  select: [],
  where: { id: 'where-root', join: 'and', conditions: [] },
  groupBy: [],
  orderBy: [],
})

function QueryConstructor({
  tables,
  value,
  defaultValue,
  onChange,
  onCompile,
  placeholders = 'numbered',
  preview = true,
  defaultLimit,
  label = 'Query',
  runLabel,
  onRun,
  className,
  ...props
}: QueryConstructorProps) {
  const [internal, setInternal] = useState<Query>(
    defaultValue ?? { ...emptyQuery(tables[0]?.name ?? ''), limit: defaultLimit },
  )

  const query = value ?? internal

  const commit = (next: Query) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  /** Every table in play: the FROM plus each joined one. */
  const inScope = useMemo(() => {
    const names = [query.from, ...query.joins.map((join) => join.table)].filter(Boolean)
    return tables.filter((table) => names.includes(table.name))
  }, [tables, query.from, query.joins])

  /** Qualified columns, which is what every picker below offers. */
  const columnOptions = useMemo(
    () =>
      inScope.flatMap((table) =>
        table.columns.map((column) => ({
          value: qualified(table.name, column.name),
          label: qualified(table.name, column.name),
          description: column.type,
        })),
      ),
    [inScope],
  )

  /** The same columns as `SegmentBuilder` fields. */
  const whereFields = useMemo(
    () =>
      inScope.flatMap((table) =>
        table.columns.map((column) => ({
          key: qualified(table.name, column.name),
          label: qualified(table.name, column.name),
          type: familyOf(column.type),
        })),
      ),
    [inScope],
  )

  const compiled = useMemo(
    () => compile(query, tables, placeholders),
    [query, tables, placeholders],
  )

  /**
   * Reported when the statement changes, so a caller can keep its own preview
   * or run button live.
   *
   * Keyed on the compiled output rather than on the callback's identity: an
   * inline arrow at the call site is a new function every render, and depending
   * on it would fire this on every keystroke. The callback is read from a ref
   * so it is always the current one without being a dependency.
   */
  const latest = useRef(onCompile)
  latest.current = onCompile

  const compiledKey = `${compiled.sql}|${JSON.stringify(compiled.params)}`
  useEffect(() => {
    latest.current?.(compiled.sql, compiled.params)
  }, [compiledKey, compiled.sql, compiled.params])

  /** Changing the source table invalidates everything that named the old one. */
  const setFrom = (from: string) => {
    commit({ ...emptyQuery(from), limit: query.limit })
  }

  /** A join the schema can propose, from a declared foreign key. */
  const suggestion = useMemo(() => {
    for (const table of inScope) {
      for (const column of table.columns) {
        if (!column.references) continue
        const [target, targetColumn] = splitQualified(column.references)
        const already = [query.from, ...query.joins.map((join) => join.table)].includes(target)
        if (!already && tables.some((candidate) => candidate.name === target)) {
          return {
            table: target,
            leftColumn: qualified(table.name, column.name),
            rightColumn: qualified(target, targetColumn),
          }
        }
      }
    }
    return null
  }, [inScope, tables, query.from, query.joins])

  const addJoin = () => {
    const base =
      suggestion ??
      (() => {
        const other = tables.find(
          (table) => ![query.from, ...query.joins.map((join) => join.table)].includes(table.name),
        )
        if (!other) return null
        return {
          table: other.name,
          leftColumn: qualified(query.from, tables.find((t) => t.name === query.from)?.columns[0]?.name ?? ''),
          rightColumn: qualified(other.name, other.columns[0]?.name ?? ''),
        }
      })()

    if (!base) return
    commit({
      ...query,
      joins: [...query.joins, { id: nextId(), type: 'inner', ...base }],
    })
  }

  const patchJoin = (id: string, changes: Partial<QueryJoin>) =>
    commit({
      ...query,
      joins: query.joins.map((join) => (join.id === id ? { ...join, ...changes } : join)),
    })

  const field = cn(fieldBase, fieldOutline, 'h-8 w-full min-w-0 px-2 text-sm')

  return (
    <div
      data-slot="query-constructor"
      className={cn('@container flex flex-col gap-3', className)}
      {...props}
    >
      {/* ------------------------------------------------------ from + join */}
      <section className={cn(surface, radius.surface, 'flex flex-col gap-2 p-3')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 font-mono text-[11px] uppercase">
            from
          </span>
          <Select
            size="sm"
            triggerLabel="Table"
            value={query.from}
            options={tables.map((table) => ({ value: table.name, label: table.name }))}
            onValueChange={setFrom}
            triggerClassName="w-56"
          />
        </div>

        {query.joins.map((join) => {
          const joined = tables.find((table) => table.name === join.table)
          const leftOptions = columnOptions.filter(
            (option) => splitQualified(option.value)[0] !== join.table,
          )
          const rightOptions = (joined?.columns ?? []).map((column) => ({
            value: qualified(join.table, column.name),
            label: qualified(join.table, column.name),
          }))

          return (
            <div key={join.id} className="flex flex-wrap items-center gap-2">
              <Select
                size="sm"
                triggerLabel="Join type"
                value={join.type}
                options={[
                  { value: 'inner', label: 'inner join' },
                  { value: 'left', label: 'left join' },
                ]}
                onValueChange={(next) => patchJoin(join.id, { type: next as 'inner' | 'left' })}
                triggerClassName="w-28"
              />
              <Select
                size="sm"
                triggerLabel="Joined table"
                value={join.table}
                options={tables.map((table) => ({ value: table.name, label: table.name }))}
                onValueChange={(next) =>
                  patchJoin(join.id, {
                    table: next,
                    // The old table's column is meaningless against the new one.
                    rightColumn: qualified(
                      next,
                      tables.find((table) => table.name === next)?.columns[0]?.name ?? '',
                    ),
                  })
                }
                triggerClassName="w-40"
              />
              <span className="text-muted-foreground font-mono text-[11px] uppercase">on</span>
              <Select
                size="sm"
                triggerLabel="Left column"
                value={join.leftColumn}
                options={leftOptions.map((option) => ({ value: option.value, label: option.label }))}
                onValueChange={(next) => patchJoin(join.id, { leftColumn: next })}
                triggerClassName="w-44"
              />
              <span aria-hidden="true" className="text-muted-foreground">
                =
              </span>
              <Select
                size="sm"
                triggerLabel="Right column"
                value={join.rightColumn}
                options={rightOptions}
                onValueChange={(next) => patchJoin(join.id, { rightColumn: next })}
                triggerClassName="w-44"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remove join"
                className="ms-auto"
                onClick={() =>
                  commit({ ...query, joins: query.joins.filter((item) => item.id !== join.id) })
                }
              >
                <X />
              </Button>
            </div>
          )
        })}

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={addJoin} disabled={tables.length < 2}>
            <Plus />
            Join
          </Button>
          {/* Foreign keys are in the schema; not offering them makes the user
              retype what the database already knows. */}
          {suggestion && (
            <span className="text-muted-foreground font-mono text-[11px]">
              suggests {suggestion.leftColumn} = {suggestion.rightColumn}
            </span>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- select */}
      <section className={cn(surface, radius.surface, 'flex flex-wrap items-center gap-2 p-3')}>
        <span className="text-muted-foreground w-14 shrink-0 font-mono text-[11px] uppercase">
          select
        </span>
        <MultiSelect
          size="sm"
          options={columnOptions}
          value={query.select}
          onValueChange={(next) => commit({ ...query, select: next })}
          placeholder="every column (*)"
          searchLabel="Filter columns"
          triggerClassName="min-w-64"
        />
      </section>

      {/* ----------------------------------------------------------- where */}
      <SegmentBuilder
        label="Where"
        fields={whereFields}
        value={query.where}
        onChange={(where) => commit({ ...query, where })}
        summary={false}
        emptyLabel="No filter — every row."
      />

      {/* ------------------------------------------------- group/order/limit */}
      <section className={cn(surface, radius.surface, 'flex flex-col gap-2 p-3')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 font-mono text-[11px] uppercase">
            group
          </span>
          <MultiSelect
            size="sm"
            options={columnOptions}
            value={query.groupBy}
            onValueChange={(next) => commit({ ...query, groupBy: next })}
            placeholder="no grouping"
            searchLabel="Filter columns"
            triggerClassName="min-w-56"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground w-14 shrink-0 font-mono text-[11px] uppercase">
            order
          </span>
          <Select
            size="sm"
            triggerLabel="Order by"
            placeholder="no order"
            value={query.orderBy[0]?.column ?? ''}
            options={columnOptions.map((option) => ({ value: option.value, label: option.label }))}
            onValueChange={(next) =>
              commit({
                ...query,
                orderBy: [{ column: next, direction: query.orderBy[0]?.direction ?? 'asc' }],
              })
            }
            triggerClassName="w-52"
          />
          <Select
            size="sm"
            triggerLabel="Direction"
            value={query.orderBy[0]?.direction ?? 'asc'}
            options={[
              { value: 'asc', label: 'ascending' },
              { value: 'desc', label: 'descending' },
            ]}
            disabled={!query.orderBy[0]}
            onValueChange={(next) =>
              commit({
                ...query,
                orderBy: query.orderBy[0]
                  ? [{ ...query.orderBy[0], direction: next as 'asc' | 'desc' }]
                  : [],
              })
            }
            triggerClassName="w-36"
          />

          <span className="text-muted-foreground ms-2 font-mono text-[11px] uppercase">limit</span>
          <input
            type="number"
            min={0}
            aria-label="Limit"
            placeholder="none"
            value={query.limit ?? ''}
            onChange={(event) =>
              commit({
                ...query,
                limit: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            className={cn(field, 'w-24')}
          />
        </div>
      </section>

      {/* --------------------------------------------------------- output */}
      {preview && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{label}</p>
            {onRun && (
              <Button size="sm" onClick={() => onRun(compiled.sql, compiled.params)}>
                {runLabel ?? 'Run'}
              </Button>
            )}
          </div>

          <CodeBlock code={compiled.sql || '-- pick a table'} language="sql" />

          {compiled.params.length > 0 && (
            <p className="text-muted-foreground font-mono text-[11px]">
              {/* Shown separately because that is what makes it safe: the values
                  are bound at execution, never spliced into the text. */}
              params: [{compiled.params.map((param) => JSON.stringify(param)).join(', ')}]
            </p>
          )}

          {compiled.issues.length > 0 && (
            <ul role="status" className="text-muted-foreground list-none space-y-0.5 text-[11px]">
              {compiled.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

export { QueryConstructor, compile as compileQuery }
export type { QueryConstructorProps }
