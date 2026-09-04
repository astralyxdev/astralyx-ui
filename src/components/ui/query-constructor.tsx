import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, ClipboardPaste, Table2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CodeBlock } from '@/components/ui/code-block'
import { Input } from '@/components/ui/input'
import { SegmentBuilder, type ConditionGroup } from '@/components/ui/segment-builder'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaColumn } from '@/components/ui/schema-table'
import {
  compileSelect,
  familyOf,
  parseSelect,
  qualify,
  splitQualified,
  type Placeholders,
  type SelectQuery,
  type SqlJoin,
} from '@/lib/sql-select'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A SQL `SELECT` built against a schema you can see, and readable back out of a
 * statement you paste.
 *
 * The counterpart to `QueryEditor`: that one is for people who already know SQL
 * and want a console; this is for people who know the *question* and not the
 * dialect. They are meant to sit beside each other, which is why this reads
 * both ways — paste a statement and the panels fill in, change the panels and
 * the statement follows. A builder that only goes one way is a dead end: you
 * can construct a query but never open the one you already have.
 *
 * **The schema is a panel, not a dropdown.** Columns are the thing you are
 * choosing, and there are usually far more of them than fit in a select — so
 * they are browsed in a list beside the query, grouped under their table, with
 * their types visible. Ticking a column adds it to the result; the tables in
 * play are the ones with content, and the rest are dimmed until a join brings
 * them in. That is the same information a `SELECT` list holds, laid out so you
 * can read the shape of the database while you work.
 *
 * **The query panel holds only what a picker cannot express**: the source, the
 * joins, the filter, the ordering. Splitting it this way keeps each side short
 * enough to take in at a glance, which a single column of clauses never was.
 *
 * **Values become parameters and identifiers are allow-listed** — see
 * `@/lib/sql-select`, which owns the grammar and is tested without a DOM. That
 * holds for pasted SQL too: a literal in a pasted `WHERE` becomes a bound
 * parameter when it compiles back, and a table you did not declare is dropped
 * rather than carried through.
 *
 * **The `WHERE` clause is a `SegmentBuilder`** — the same nested-precedence
 * problem, so the same component rather than two answers to what `A or B and C`
 * means.
 */
export type QueryTable = {
  name: string
  columns: SchemaColumn[]
  label?: ReactNode
}

export type { SelectQuery as Query, SqlJoin as QueryJoin }

type QueryConstructorProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  tables: QueryTable[]
  value?: SelectQuery
  defaultValue?: SelectQuery
  onChange?: (query: SelectQuery) => void
  /** The compiled statement and its parameters, on every change. */
  onCompile?: (sql: string, params: unknown[]) => void
  /** `$1` for Postgres, `?` for MySQL and SQLite. */
  placeholders?: Placeholders
  /** Hide the generated SQL. */
  preview?: boolean
  /** Hide the paste-a-statement panel. */
  importable?: boolean
  /** Least height for the schema list; it grows to match the query panel. */
  schemaHeight?: number
  defaultLimit?: number
  label?: string
  runLabel?: ReactNode
  onRun?: (sql: string, params: unknown[]) => void
}

let counter = 0
const nextId = () => `j${++counter}`

const emptyQuery = (from: string): SelectQuery => ({
  from,
  joins: [],
  select: [],
  where: { id: 'where-root', join: 'and', conditions: [] },
  groupBy: [],
  orderBy: [],
})

/** A labelled strip in the query panel. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground w-14 shrink-0 text-[11px] font-medium">{label}</span>
      {children}
    </div>
  )
}

function QueryConstructor({
  tables,
  value,
  defaultValue,
  onChange,
  onCompile,
  placeholders = 'numbered',
  preview = true,
  importable = true,
  schemaHeight = 260,
  defaultLimit,
  label = 'Query',
  runLabel,
  onRun,
  className,
  ...props
}: QueryConstructorProps) {
  const [internal, setInternal] = useState<SelectQuery>(
    defaultValue ?? { ...emptyQuery(tables[0]?.name ?? ''), limit: defaultLimit },
  )
  const [importing, setImporting] = useState(false)
  const [draft, setDraft] = useState('')
  const [importIssues, setImportIssues] = useState<string[] | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const query = value ?? internal

  const commit = (next: SelectQuery) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  /** The tables the query can reference: the source plus everything joined. */
  const scope = useMemo(
    () => new Set([query.from, ...query.joins.map((join) => join.table)].filter(Boolean)),
    [query.from, query.joins],
  )

  const chosen = useMemo(() => new Set(query.select), [query.select])

  /** Qualified columns of the tables in play — what every picker offers. */
  const columnOptions = useMemo(
    () =>
      tables
        .filter((table) => scope.has(table.name))
        .flatMap((table) =>
          table.columns.map((column) => ({
            value: qualify(table.name, column.name),
            label: qualify(table.name, column.name),
          })),
        ),
    [tables, scope],
  )

  /** The same columns as `SegmentBuilder` fields. */
  const whereFields = useMemo(
    () =>
      tables
        .filter((table) => scope.has(table.name))
        .flatMap((table) =>
          table.columns.map((column) => ({
            key: qualify(table.name, column.name),
            label: qualify(table.name, column.name),
            type: familyOf(column.type),
          })),
        ),
    [tables, scope],
  )

  const compiled = useMemo(
    () => compileSelect(query, tables, placeholders),
    [query, tables, placeholders],
  )

  /**
   * Reported when the statement changes, keyed on the output rather than the
   * callback's identity — an inline arrow at the call site is a new function
   * every render, and depending on it would fire this on every keystroke.
   */
  const latest = useRef(onCompile)
  latest.current = onCompile
  const compiledKey = `${compiled.sql}|${JSON.stringify(compiled.params)}`
  useEffect(() => {
    latest.current?.(compiled.sql, compiled.params)
  }, [compiledKey, compiled.sql, compiled.params])

  /** Changing the source invalidates everything that named the old one. */
  const setFrom = (from: string) => commit({ ...emptyQuery(from), limit: query.limit })

  /** How a table could be joined, from a foreign key either way round. */
  const joinPath = (target: string) => {
    for (const table of tables.filter((item) => scope.has(item.name))) {
      for (const column of table.columns) {
        if (!column.references) continue
        const [to, toColumn] = splitQualified(column.references)
        if (to === target) {
          return { leftColumn: qualify(table.name, column.name), rightColumn: qualify(to, toColumn) }
        }
      }
    }
    const candidate = tables.find((item) => item.name === target)
    for (const column of candidate?.columns ?? []) {
      if (!column.references) continue
      const [to, toColumn] = splitQualified(column.references)
      if (scope.has(to)) {
        return {
          leftColumn: qualify(to, toColumn),
          rightColumn: qualify(target, column.name),
        }
      }
    }
    return null
  }

  const joinTable = (target: string) => {
    const path = joinPath(target) ?? {
      leftColumn: qualify(query.from, tables.find((t) => t.name === query.from)?.columns[0]?.name ?? ''),
      rightColumn: qualify(target, tables.find((t) => t.name === target)?.columns[0]?.name ?? ''),
    }
    commit({ ...query, joins: [...query.joins, { id: nextId(), type: 'inner', table: target, ...path }] })
  }

  const dropTable = (target: string) => {
    const joins = query.joins.filter((join) => join.table !== target)
    // Everything that named the table goes with it, or the statement breaks.
    const keeps = (key: string) => splitQualified(key)[0] !== target
    const prune = (group: ConditionGroup): ConditionGroup => ({
      ...group,
      conditions: group.conditions
        .filter((node) => ('conditions' in node ? true : keeps(node.field)))
        .map((node) => ('conditions' in node ? prune(node as ConditionGroup) : node)),
    })
    commit({
      ...query,
      joins,
      select: query.select.filter(keeps),
      groupBy: query.groupBy.filter(keeps),
      orderBy: query.orderBy.filter((sort) => keeps(sort.column)),
      where: prune(query.where as ConditionGroup),
    })
  }

  const toggleColumn = (key: string) =>
    commit({
      ...query,
      select: chosen.has(key) ? query.select.filter((item) => item !== key) : [...query.select, key],
    })

  const patchJoin = (id: string, changes: Partial<SqlJoin>) =>
    commit({
      ...query,
      joins: query.joins.map((join) => (join.id === id ? { ...join, ...changes } : join)),
    })

  /** Read a pasted statement into the panels. */
  const importSql = () => {
    // The current parameters are passed so a statement copied straight out of
    // the preview — placeholders and all — round-trips with its values.
    const { query: parsed, issues } = parseSelect(draft, tables, compiled.params)
    setImportIssues(issues)
    if (!parsed) return
    commit(parsed)
    // Closed only on a clean read: closing on a partial import hides the reason
    // half the query is missing.
    if (issues.length === 0) {
      setImporting(false)
      setDraft('')
    }
  }

  const toggleCollapsed = (name: string) => {
    const next = new Set(collapsed)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setCollapsed(next)
  }

  return (
    <div
      data-slot="query-constructor"
      className={cn('@container flex flex-col gap-3', className)}
      {...props}
    >
      <div className="grid gap-3 @[46rem]:grid-cols-[16rem_minmax(0,1fr)]">
        {/* ------------------------------------------------- the schema */}
        <section className={cn(surface, radius.surface, 'flex flex-col overflow-hidden')}>
          <div className="border-border flex items-center gap-2 border-b px-3 py-2">
            <Table2 aria-hidden="true" className="text-muted-foreground size-3.5" />
            <p className="text-xs font-medium">Schema</p>
            <span className="text-muted-foreground ms-auto text-[11px] tabular-nums">
              {query.select.length || 'all'} selected
            </span>
          </div>

          {/* Fills the card rather than stopping at a fixed height: the panel
              is as tall as the query beside it, and a list that stops early
              leaves a column of dead space next to a full one. */}
          <div style={{ minHeight: schemaHeight }} className="min-h-0 flex-1 overflow-y-auto p-1">
            {tables.map((table) => {
              const inPlay = scope.has(table.name)
              const isSource = table.name === query.from
              const open = !collapsed.has(table.name)
              const joinable = !inPlay && Boolean(query.from)

              return (
                <div key={table.name} className="mb-0.5">
                  <div
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-1',
                      radius.xs,
                      inPlay ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <button
                      type="button"
                      aria-label={open ? `Collapse ${table.name}` : `Expand ${table.name}`}
                      aria-expanded={open}
                      onClick={() => toggleCollapsed(table.name)}
                      className={cn('shrink-0', radius.xs, focusRing)}
                    >
                      {open ? (
                        <ChevronDown className="size-3.5" />
                      ) : (
                        <ChevronRight className="size-3.5 rtl:rotate-180" />
                      )}
                    </button>

                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{table.name}</span>

                    {isSource ? (
                      <span className="text-muted-foreground shrink-0 text-[10px] tracking-wide uppercase">
                        from
                      </span>
                    ) : inPlay ? (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Remove ${table.name} from the query`}
                        onClick={() => dropTable(table.name)}
                      >
                        <X />
                      </Button>
                    ) : (
                      joinable && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => joinTable(table.name)}
                          className="text-[11px]"
                        >
                          {/* A declared foreign key means this is one click,
                              not a form. */}
                          {joinPath(table.name) ? 'join' : 'join…'}
                        </Button>
                      )
                    )}
                  </div>

                  {open && (
                    <ul className="list-none ps-6">
                      {table.columns.map((column) => {
                        const key = qualify(table.name, column.name)
                        return (
                          <li key={column.name}>
                            <label
                              className={cn(
                                'flex cursor-pointer items-center gap-2 py-0.5 pe-1.5',
                                radius.xs,
                                inPlay ? 'hover:bg-muted' : 'cursor-default opacity-45',
                              )}
                            >
                              <Checkbox
                                size="sm"
                                checked={chosen.has(key)}
                                disabled={!inPlay}
                                onChange={() => toggleColumn(key)}
                                aria-label={key}
                              />
                              <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                                {column.name}
                              </span>
                              <span className="text-muted-foreground shrink-0 text-[10px]">
                                {column.type}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <p className="border-border text-muted-foreground border-t px-3 py-1.5 text-[11px]">
            {query.select.length === 0
              ? 'Nothing ticked — every column.'
              : `${query.select.length} column${query.select.length === 1 ? '' : 's'}`}
          </p>
        </section>

        {/* -------------------------------------------------- the query */}
        <section className={cn(surface, radius.surface, 'flex flex-col gap-3 p-3')}>
          <Row label="Source">
            <Select
              size="sm"
              triggerLabel="Source table"
              value={query.from}
              options={tables.map((table) => ({ value: table.name, label: table.name }))}
              onValueChange={setFrom}
              className="w-44"
              triggerClassName="w-full"
            />
          </Row>

          {query.joins.map((join) => {
            const joined = tables.find((table) => table.name === join.table)
            return (
              <Row key={join.id} label="Join">
                <Select
                  size="sm"
                  triggerLabel="Join type"
                  value={join.type}
                  options={[
                    { value: 'inner', label: 'inner' },
                    { value: 'left', label: 'left' },
                  ]}
                  onValueChange={(next) => patchJoin(join.id, { type: next as 'inner' | 'left' })}
                  className="w-24"
                  triggerClassName="w-full"
                />
                {/* The joined table is not repeated here: it is already the
                    table half of the right-hand column, and it is listed in the
                    schema panel. Repeating it cost the row its single line. */}
                <Select
                  size="sm"
                  triggerLabel="Left column"
                  value={join.leftColumn}
                  options={columnOptions.filter(
                    (option) => splitQualified(option.value)[0] !== join.table,
                  )}
                  onValueChange={(next) => patchJoin(join.id, { leftColumn: next })}
                  className="w-36"
                  triggerClassName="w-full"
                />
                <span aria-hidden="true" className="text-muted-foreground">
                  =
                </span>
                <Select
                  size="sm"
                  triggerLabel="Right column"
                  value={join.rightColumn}
                  options={(joined?.columns ?? []).map((column) => ({
                    value: qualify(join.table, column.name),
                    label: qualify(join.table, column.name),
                  }))}
                  onValueChange={(next) => patchJoin(join.id, { rightColumn: next })}
                  className="w-36"
                  triggerClassName="w-full"
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove join"
                  onClick={() => dropTable(join.table)}
                >
                  <X />
                </Button>
              </Row>
            )
          })}

          <div className="border-border border-t pt-3">
            <SegmentBuilder
              label="Filter"
              fields={whereFields}
              value={query.where as ConditionGroup}
              onChange={(where) => commit({ ...query, where })}
              summary={false}
              emptyLabel="No filter — every row."
            />
          </div>

          <div className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
            <Row label="Sort">
              <Select
                size="sm"
                triggerLabel="Order by"
                placeholder="none"
                value={query.orderBy[0]?.column ?? ''}
                options={columnOptions}
                onValueChange={(next) =>
                  commit({
                    ...query,
                    orderBy: [{ column: next, direction: query.orderBy[0]?.direction ?? 'asc' }],
                  })
                }
                className="w-40"
                triggerClassName="w-full"
              />
              <Select
                size="sm"
                triggerLabel="Direction"
                value={query.orderBy[0]?.direction ?? 'asc'}
                options={[
                  { value: 'asc', label: 'asc' },
                  { value: 'desc', label: 'desc' },
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
                className="w-24"
                triggerClassName="w-full"
              />
            </Row>

            <Row label="Group">
              <Select
                size="sm"
                triggerLabel="Group by"
                placeholder="none"
                value={query.groupBy[0] ?? ''}
                options={columnOptions}
                onValueChange={(next) => commit({ ...query, groupBy: next ? [next] : [] })}
                className="w-40"
                triggerClassName="w-full"
              />
            </Row>

            <Row label="Limit">
              <Input
                size="sm"
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
                containerClassName="w-24"
              />
            </Row>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------- output */}
      {(preview || importable) && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{label}</p>
            <div className="flex items-center gap-1">
              {importable && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-expanded={importing}
                  onClick={() => {
                    const next = !importing
                    setImporting(next)
                    setImportIssues(null)
                    // Seeded with the current statement, so the panel doubles as
                    // "edit this as text" rather than only "paste something else".
                    if (next) setDraft(compiled.sql)
                  }}
                >
                  <ClipboardPaste />
                  Paste SQL
                </Button>
              )}
              {onRun && (
                <Button size="sm" onClick={() => onRun(compiled.sql, compiled.params)}>
                  {runLabel ?? 'Run'}
                </Button>
              )}
            </div>
          </div>

          {importable && importing && (
            <div className={cn(surface, radius.surface, 'flex flex-col gap-2 p-3')}>
              <label htmlFor="query-constructor-import" className="text-xs font-medium">
                Paste a SELECT and fill the builder
              </label>
              <Textarea
                id="query-constructor-import"
                rows={5}
                value={draft}
                spellCheck={false}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="select email from users where country = 'DE' limit 50"
                className="resize-y font-mono text-xs leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={importSql} disabled={!draft.trim()}>
                  Fill the builder
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setImporting(false)
                    setImportIssues(null)
                  }}
                >
                  Cancel
                </Button>
                {importIssues?.length === 0 && (
                  <span role="status" className="text-muted-foreground text-xs">
                    Read cleanly.
                  </span>
                )}
              </div>

              {/* What was dropped, and why. A partial import that says nothing
                  is worse than a refusal. */}
              {importIssues && importIssues.length > 0 && (
                <ul role="status" className="text-muted-foreground list-none space-y-0.5 text-[11px]">
                  {importIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {preview && (
            <>
              <CodeBlock code={compiled.sql || '-- pick a table'} language="sql" />

              {compiled.params.length > 0 && (
                <p className="text-muted-foreground font-mono text-[11px]">
                  {/* Shown separately because that is what makes it safe: the
                      values are bound at execution, never spliced into the text. */}
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
            </>
          )}
        </section>
      )}
    </div>
  )
}

export { QueryConstructor }
export type { QueryConstructorProps }
