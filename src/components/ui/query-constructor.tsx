import { useEffect, useId, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ClipboardPaste, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { CommandList, type CommandItem } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SegmentBuilder, type ConditionGroup } from '@/components/ui/segment-builder'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { SchemaColumn } from '@/components/ui/schema-table'
import {
  applyFunction,
  compileSelect,
  DIALECTS,
  familyOfField,
  operatorsFor,
  parseSelect,
  qualify,
  splitQualified,
  type SelectQuery,
  type SqlDialect,
  type SqlFunction,
  type SqlGroup,
  type SqlJoin,
} from '@/lib/sql-select'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A SQL `SELECT` assembled a clause at a time, and readable back out of a
 * statement you paste.
 *
 * The counterpart to `QueryEditor`: that one is a console for people who
 * already know SQL; this is for people who know the *question* and not the
 * dialect. It reads both ways — paste a statement and the blocks fill in,
 * change a block and the statement follows — because a builder that only
 * compiles is a dead end: you can construct a query but never open the one you
 * already have.
 *
 * **One block per decision.** Sources, columns, filter, then the three small
 * ones that shape the result. Each is a titled card holding only its own
 * controls, so the query is read as a short list of choices rather than a long
 * form — and each block carries its own action, which is why joining a table is
 * a button on *Sources* rather than a control floating between clauses.
 *
 * **It follows the schema.** Every picker offers only columns of the tables in
 * play, qualified as `table.column` and annotated with their type; joining a
 * table brings its columns into the pool, and removing one takes its columns
 * out of the filter, the ordering and the grouping with it rather than leaving
 * a statement that names a table it no longer joins. A `references` on a column
 * is a join the schema already knows about, so it is offered as one click.
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
  /**
   * The provider the statement is for.
   *
   * It settles quoting, placeholders, how a row limit is written, whether
   * booleans are literals, and which operators exist — all at once, so a query
   * built for one provider says plainly what it cannot do on another instead of
   * emitting SQL that will not run.
   */
  dialect?: SqlDialect
  /** Starting provider when `dialect` is not controlled. */
  defaultDialect?: SqlDialect
  /** Providers offered in the switcher. Omit the switcher with a single one. */
  dialects?: SqlDialect[]
  onDialectChange?: (dialect: SqlDialect) => void
  /**
   * Functions the caller permits, by name.
   *
   * This is how a function gets used: declare it and it joins the vocabulary,
   * offered as `fn(table.column)` wherever a column can go. It is never free
   * text — an undeclared name cannot reach the statement, for the same reason
   * an unknown table cannot.
   */
  functions?: SqlFunction[]
  /** Hide the generated SQL. */
  preview?: boolean
  /** Hide the paste-a-statement panel. */
  importable?: boolean
  defaultLimit?: number
  label?: string
  runLabel?: ReactNode
  onRun?: (sql: string, params: unknown[]) => void
}

/**
 * One titled block.
 *
 * A `<section>` named by its own label rather than a heading: these are regions
 * of a control, not divisions of the document, and adding `h3`s inside a page
 * that already has its own outline would put headings in the document map that
 * are not part of it.
 */
function Block({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()

  return (
    <section
      aria-labelledby={id}
      className={cn(surface, radius.surface, 'flex min-w-0 flex-col', className)}
    >
      <div className="border-border flex items-center justify-between gap-2 border-b px-3 py-1.5">
        <p id={id} className="text-xs font-medium">
          {title}
        </p>
        {action}
      </div>
      <div className="min-w-0 flex-1 p-3">{children}</div>
    </section>
  )
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

function QueryConstructor({
  tables,
  value,
  defaultValue,
  onChange,
  onCompile,
  dialect: dialectProp,
  defaultDialect,
  dialects = ['postgres', 'mysql', 'sqlite', 'mssql'],
  onDialectChange,
  functions = [],
  preview = true,
  importable = true,
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
  const [joinOpen, setJoinOpen] = useState(false)
  const [internalDialect, setInternalDialect] = useState<SqlDialect>(
    dialectProp ?? defaultDialect ?? dialects[0] ?? 'postgres',
  )

  const dialect = dialectProp ?? internalDialect
  const setDialect = (next: SqlDialect) => {
    if (dialectProp === undefined) setInternalDialect(next)
    onDialectChange?.(next)
  }

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

  const inScope = useMemo(() => tables.filter((table) => scope.has(table.name)), [tables, scope])

  /** The functions available on this provider. */
  const available = useMemo(
    () => functions.filter((fn) => !fn.dialects || fn.dialects.includes(dialect)),
    [functions, dialect],
  )

  /**
   * Every field that can go where a column can: the columns of the tables in
   * play, and each declared function applied to the columns it accepts.
   */
  const columnOptions = useMemo(() => {
    const plain = inScope.flatMap((table) =>
      table.columns.map((column) => ({
        value: qualify(table.name, column.name),
        label: qualify(table.name, column.name),
        description: column.type,
      })),
    )
    const wrapped = available.flatMap((fn) =>
      plain
        .filter(
          (option) =>
            !fn.families || fn.families.includes(familyOfField(option.value, tables, available)),
        )
        .map((option) => ({
          value: applyFunction(fn.name, option.value),
          label: applyFunction(fn.name, option.value),
          description: fn.label ?? `${fn.name}()`,
        })),
    )
    return [...plain, ...wrapped]
  }, [inScope, available, tables])

  /**
   * The same fields for `SegmentBuilder`, each carrying the operators this
   * provider actually has — which is how `ILIKE` appears on PostgreSQL and
   * `REGEXP` on MySQL without the filter knowing anything about SQL.
   */
  const whereFields = useMemo(
    () =>
      columnOptions.map((option) => {
        const family = familyOfField(option.value, tables, available)
        return {
          key: option.value,
          label: option.label,
          type: family,
          operators: operatorsFor(dialect, family).map((operator) => ({
            value: operator.id,
            label: operator.label,
            arity: operator.arity,
          })),
        }
      }),
    [columnOptions, tables, available, dialect],
  )

  const compiled = useMemo(
    () => compileSelect(query, tables, { dialect, functions: available }),
    [query, tables, dialect, available],
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

  /* ------------------------------------------------------------ sources */

  /** Changing the source invalidates everything that named the old one. */
  const setFrom = (from: string) => commit({ ...emptyQuery(from), limit: query.limit })

  /** How a table could be joined, from a foreign key either way round. */
  const joinPath = (target: string) => {
    for (const table of inScope) {
      for (const column of table.columns) {
        if (!column.references) continue
        const [to, toColumn] = splitQualified(column.references)
        if (to === target) {
          return { leftColumn: qualify(table.name, column.name), rightColumn: qualify(to, toColumn) }
        }
      }
    }
    for (const column of tables.find((item) => item.name === target)?.columns ?? []) {
      if (!column.references) continue
      const [to, toColumn] = splitQualified(column.references)
      if (scope.has(to)) {
        return { leftColumn: qualify(to, toColumn), rightColumn: qualify(target, column.name) }
      }
    }
    return null
  }

  const addJoin = (target: string) => {
    const path = joinPath(target) ?? {
      leftColumn: qualify(
        query.from,
        tables.find((item) => item.name === query.from)?.columns[0]?.name ?? '',
      ),
      rightColumn: qualify(
        target,
        tables.find((item) => item.name === target)?.columns[0]?.name ?? '',
      ),
    }
    commit({
      ...query,
      joins: [...query.joins, { id: nextId(), type: 'inner', table: target, ...path }],
    })
  }

  /** Dropping a table takes everything that named it, or the statement breaks. */
  const dropJoin = (target: string) => {
    const keeps = (key: string) => splitQualified(key)[0] !== target
    const prune = (group: SqlGroup): SqlGroup => ({
      ...group,
      conditions: group.conditions
        .filter((node) => ('conditions' in node ? true : keeps(node.field)))
        .map((node) => ('conditions' in node ? prune(node) : node)),
    })
    commit({
      ...query,
      joins: query.joins.filter((join) => join.table !== target),
      select: query.select.filter(keeps),
      groupBy: query.groupBy.filter(keeps),
      orderBy: query.orderBy.filter((sort) => keeps(sort.column)),
      where: prune(query.where),
    })
  }

  const patchJoin = (id: string, changes: Partial<SqlJoin>) =>
    commit({
      ...query,
      joins: query.joins.map((join) => (join.id === id ? { ...join, ...changes } : join)),
    })

  const joinable = tables.filter((table) => !scope.has(table.name))
  const joinItems: CommandItem[] = joinable.map((table) => ({
    id: table.name,
    label: table.name,
    // A declared foreign key means this is one click, not a form.
    shortcut: joinPath(table.name) ? 'fk' : undefined,
  }))

  /* ------------------------------------------------------------- import */

  const importSql = () => {
    // The current parameters are passed so a statement copied straight out of
    // the preview — placeholders and all — round-trips with its values.
    const { query: parsed, issues } = parseSelect(draft, tables, {
      params: compiled.params,
      dialect,
      functions: available,
    })
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

  return (
    <div
      data-slot="query-constructor"
      className={cn('@container flex flex-col gap-3', className)}
      {...props}
    >
      {/* ------------------------------------------------------ sources */}
      <Block
        title="Sources"
        action={
          joinable.length > 0 && (
            <Popover open={joinOpen} onOpenChange={setJoinOpen}>
              <PopoverTrigger asChild>
                <Button size="xs" variant="ghost">
                  <Plus />
                  Join
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-0">
                <CommandList
                  items={joinItems}
                  placeholder="Table to join…"
                  emptyMessage="Nothing left to join"
                  onRun={(item) => {
                    addJoin(item.id)
                    setJoinOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground w-10 shrink-0 font-mono text-[11px] uppercase">
              from
            </span>
            <Select
              size="sm"
              triggerLabel="Source table"
              value={query.from}
              options={tables.map((table) => ({ value: table.name, label: table.name }))}
              onValueChange={setFrom}
              className="w-44"
              triggerClassName="w-full"
            />
          </div>

          {query.joins.map((join) => (
            <div key={join.id} className="flex flex-wrap items-center gap-2">
              <Select
                size="sm"
                triggerLabel="Join type"
                value={join.type}
                options={[
                  { value: 'inner', label: 'inner' },
                  { value: 'left', label: 'left' },
                ]}
                onValueChange={(next) => patchJoin(join.id, { type: next as 'inner' | 'left' })}
                className="w-[4.5rem] shrink-0"
                triggerClassName="w-full"
              />
              <span className="w-16 shrink-0 truncate font-mono text-xs">{join.table}</span>
              <span className="text-muted-foreground shrink-0 font-mono text-[11px] uppercase">
                on
              </span>
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
              <span aria-hidden="true" className="text-muted-foreground shrink-0">
                =
              </span>
              <Select
                size="sm"
                triggerLabel="Right column"
                value={join.rightColumn}
                options={(tables.find((table) => table.name === join.table)?.columns ?? []).map(
                  (column) => ({
                    value: qualify(join.table, column.name),
                    label: qualify(join.table, column.name),
                  }),
                )}
                onValueChange={(next) => patchJoin(join.id, { rightColumn: next })}
                className="w-36"
                triggerClassName="w-full"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove the ${join.table} join`}
                onClick={() => dropJoin(join.table)}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      </Block>

      {/* ------------------------------------------------------ columns */}
      <Block
        title="Columns"
        action={
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {query.select.length === 0 ? 'all' : `${query.select.length} of ${columnOptions.length}`}
          </span>
        }
      >
        <MultiSelect
          size="sm"
          options={columnOptions}
          value={query.select}
          onValueChange={(next) => commit({ ...query, select: next })}
          placeholder="* — every column"
          searchLabel="Filter columns"
          triggerClassName="w-full"
        />
      </Block>

      {/* ------------------------------------------------------- filter */}
      <Block title="Filter">
        <SegmentBuilder
          fields={whereFields}
          value={query.where as ConditionGroup}
          onChange={(where) => commit({ ...query, where })}
          summary={false}
          label=""
          emptyLabel="No filter — every row."
        />
      </Block>

      {/* ------------------------------------ order / group / limit */}
      <div className="grid gap-3 @[42rem]:grid-cols-3">
        <Block
          title="Order"
          action={
            query.orderBy[0] && (
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Remove ordering"
                onClick={() => commit({ ...query, orderBy: [] })}
              >
                <X />
              </Button>
            )
          }
        >
          <div className="flex flex-wrap items-center gap-2">
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
              className="min-w-0 flex-1"
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
              className="w-20 shrink-0"
              triggerClassName="w-full"
            />
          </div>
        </Block>

        <Block
          title="Group"
          action={
            query.groupBy.length > 0 && (
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Remove grouping"
                onClick={() => commit({ ...query, groupBy: [] })}
              >
                <X />
              </Button>
            )
          }
        >
          <MultiSelect
            size="sm"
            options={columnOptions}
            value={query.groupBy}
            onValueChange={(next) => commit({ ...query, groupBy: next })}
            placeholder="none"
            searchLabel="Filter columns"
            triggerClassName="w-full"
          />
        </Block>

        <Block title="Limit">
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
            containerClassName="w-full"
          />
        </Block>
      </div>

      {/* ------------------------------------------------- the statement */}
      {(preview || importable) && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{label}</p>
            <div className="flex flex-wrap items-center gap-1">
              {/* The provider sits with the statement, because it is the
                  statement it changes — the same query renders differently on
                  each, and the operators on offer change with it. */}
              {dialects.length > 1 && (
                <Select
                  size="sm"
                  triggerLabel="Provider"
                  value={dialect}
                  options={dialects.map((item) => ({ value: item, label: DIALECTS[item].label }))}
                  onValueChange={(next) => setDialect(next as SqlDialect)}
                  className="w-36"
                  triggerClassName="w-full"
                />
              )}
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
                Paste a SELECT and fill the blocks
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
