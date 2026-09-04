import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Build an audience from conditions, with precedence visible rather than implied.
 *
 * **The join is a rail, not a column of dropdowns.** A flat list with an and/or
 * select on every line is ambiguous — "A or B and C" is two different audiences
 * depending on how it binds, and people read it the way English reads, not the
 * way the engine evaluates. Here a group has exactly one join, shown once on a
 * bracket down its left edge and clickable there. The bracket is the parse
 * tree: what it spans is what the join applies to, and nesting is the only way
 * to say anything else.
 *
 * **There is a plain-language summary underneath.** It is the cheapest possible
 * check on the thing that goes wrong — parentheses — and it costs one pass over
 * a tree the component already holds. If the sentence is not the audience you
 * meant, the query is not either.
 *
 * **The output is a structure, not a string.** `onChange` hands back nested
 * groups, so it compiles to SQL or an API filter with values still separated
 * from operators, which is what keeps it parameterisable rather than
 * concatenated into an injection.
 *
 * **Incomplete rows are marked, not silently dropped.** A condition with no
 * value is a half-written thought; treating it as absent means the segment
 * quietly matches more people than the person building it believes, which for a
 * marketing send is an expensive kind of wrong.
 *
 * The estimate is a prop, not something computed here — only your backend knows
 * how many people match.
 */
export type FieldSpec = {
  key: string
  label: string
  type?: 'string' | 'number' | 'date' | 'boolean' | 'enum'
  /** For `enum`, the allowed values. */
  options?: { value: string; label: string }[]
  /**
   * Operators for this field, replacing the ones its `type` implies.
   *
   * A caller that knows more about the field than a type name conveys — a SQL
   * dialect with `ILIKE`, a metric with a percentile comparison — supplies them
   * rather than being limited to the built-in list.
   */
  operators?: Operator[]
}

export type Condition = {
  id: string
  field: string
  operator: string
  value: string
  /** For `many` operators — "is one of", `IN`. */
  values?: string[]
}

export type ConditionGroup = {
  id: string
  join: 'and' | 'or'
  conditions: (Condition | ConditionGroup)[]
}

const isGroup = (node: Condition | ConditionGroup): node is ConditionGroup => 'conditions' in node

export type Operator = {
  value: string
  label: string
  /**
   * How many values the operator takes.
   *
   * `none` is a complete predicate on its own ("is set"); `one` is the ordinary
   * case; `many` takes a list and is what "is one of" always meant — it was in
   * this list from the start, rendered as a single select, which quietly made
   * it a synonym for "is".
   */
  arity?: 'none' | 'one' | 'many'
  /** @deprecated Use `arity: 'none'`. */
  unary?: boolean
}

const arityOf = (operator: Operator | undefined) =>
  operator?.arity ?? (operator?.unary ? 'none' : 'one')

const OPERATORS: Record<string, Operator[]> = {
  string: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'starts', label: 'starts with' },
    { value: 'in', label: 'is one of', arity: 'many' },
    { value: 'set', label: 'is set', arity: 'none' },
    { value: 'unset', label: 'is not set', arity: 'none' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'in', label: 'is one of', arity: 'many' },
  ],
  date: [
    { value: 'after', label: 'after' },
    { value: 'before', label: 'before' },
    { value: 'within', label: 'in the last (days)' },
  ],
  boolean: [
    { value: 'true', label: 'is true', arity: 'none' },
    { value: 'false', label: 'is false', arity: 'none' },
  ],
  enum: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is one of', arity: 'many' },
  ],
}

/**
 * Everything the recursive rows need, passed down as one object.
 *
 * The subcomponents are declared at module scope rather than inside the
 * builder: a component defined during render is a *new type* on every render,
 * so React unmounts and remounts the whole subtree — losing focus mid-keystroke
 * and resetting anything stateful inside it.
 */
type Ctx = {
  fields: FieldSpec[]
  disabled?: boolean
  maxDepth: number
  addLabel: string
  addGroupLabel: string
  emptyLabel: string
  patch: (id: string, changes: Partial<Condition>) => void
  drop: (id: string) => void
  setJoin: (id: string, join: 'and' | 'or') => void
  addCondition: (id: string) => void
  addGroup: (id: string) => void
}

const operatorsFor = (fields: FieldSpec[], key: string) => {
  const field = fields.find((item) => item.key === key)
  return field?.operators ?? OPERATORS[field?.type ?? 'string'] ?? OPERATORS.string
}

/* --------------------------------------------------------------- summary */

/** The tree as a sentence, with real parentheses. */
function describe(node: Condition | ConditionGroup, fields: FieldSpec[], top = true): string {
  if (!isGroup(node)) {
    const spec = fields.find((field) => field.key === node.field)
    const operator = operatorsFor(fields, node.field).find((item) => item.value === node.operator)
    const label = spec?.label ?? node.field
    const arity = arityOf(operator)
    if (arity === 'none') return `${label} ${operator?.label}`
    if (arity === 'many') {
      const list = node.values ?? []
      return `${label} ${operator?.label ?? node.operator} ${list.length ? list.join(', ') : '…'}`
    }
    const shown =
      spec?.type === 'enum'
        ? (spec.options?.find((option) => option.value === node.value)?.label ?? node.value)
        : node.value
    return `${label} ${operator?.label ?? node.operator} ${shown || '…'}`
  }

  if (node.conditions.length === 0) return 'everyone'
  const parts = node.conditions.map((child) => describe(child, fields, false))
  const joined = parts.join(` ${node.join} `)
  // Only nested groups get brackets; wrapping the whole thing adds noise.
  return top || parts.length < 2 ? joined : `(${joined})`
}

/* ------------------------------------------------------------------ row */

function ConditionRow({ condition, ctx }: { condition: Condition; ctx: Ctx }) {
  const operators = operatorsFor(ctx.fields, condition.field)
  const operator = operators.find((item) => item.value === condition.operator)
  const spec = ctx.fields.find((field) => field.key === condition.field)
  const arity = arityOf(operator)
  const incomplete =
    arity === 'many'
      ? (condition.values ?? []).length === 0
      : arity === 'one' && condition.value.trim() === ''

  return (
    <div
      className={cn(
        'grid items-center gap-2',
        // Container queries, not viewport ones: this sits in a sidebar as often
        // as a full page, and the breakpoint that matters is its own width.
        // 20rem, not 30: every level of nesting takes a rail and padding off
        // the width, so a breakpoint tuned to the outermost group leaves the
        // inner ones stacked — which is exactly where the rows are hardest to
        // read.
        '@[20rem]:grid-cols-[minmax(5rem,1fr)_minmax(4rem,auto)_minmax(5rem,1.1fr)_auto]',
      )}
    >
      {/*
        The kit's own `Select`, not a native one.

        A native `<select>` cannot be styled to match the rest of the kit — the
        popup is drawn by the OS — so a builder built from them looks like a
        different product wherever it is embedded. `Select` also brings the
        typeahead, roving focus and popper placement the rest of the kit has,
        which matters more here than anywhere: these rows nest inside scrolling
        containers where a naively positioned menu gets clipped.
      */}
      <Select
        size="sm"
        triggerLabel="Field"
        disabled={ctx.disabled}
        value={condition.field}
        options={ctx.fields.map((field) => ({ value: field.key, label: field.label }))}
        onValueChange={(next) =>
          ctx.patch(condition.id, {
            field: next,
            // The operator list changes with the type, so a stale operator
            // would be unselectable and the value meaningless.
            operator: operatorsFor(ctx.fields, next)[0]?.value ?? 'eq',
            value: '',
            values: [],
          })
        }
        triggerClassName="w-full font-medium"
      />

      <Select
        size="sm"
        triggerLabel="Operator"
        disabled={ctx.disabled}
        value={condition.operator}
        options={operators.map((item) => ({ value: item.value, label: item.label }))}
        onValueChange={(next) => {
          // Moving between arities leaves the other side stale, and a stale
          // value silently widens the segment when the operator moves back.
          const to = arityOf(operators.find((item) => item.value === next))
          ctx.patch(condition.id, {
            operator: next,
            ...(to === 'many' ? { value: '' } : { values: [] }),
          })
        }}
        triggerClassName="text-muted-foreground w-full"
      />

      {arity === 'none' ? (
        <span aria-hidden="true" className="hidden @[20rem]:block" />
      ) : arity === 'many' ? (
        /* A list, entered as tags. "Is one of" with a single-value control was
           only ever a slower way of writing "is". */
        <TagInput
          size="sm"
          value={condition.values ?? []}
          disabled={ctx.disabled}
          error={incomplete}
          placeholder="Add a value"
          aria-label="Values"
          onValueChange={(next) => ctx.patch(condition.id, { values: next })}
        />
      ) : spec?.type === 'enum' && spec.options ? (
        <Select
          size="sm"
          triggerLabel="Value"
          placeholder="Choose…"
          error={incomplete || undefined}
          disabled={ctx.disabled}
          value={condition.value}
          options={spec.options.map((option) => ({ value: option.value, label: option.label }))}
          onValueChange={(next) => ctx.patch(condition.id, { value: next })}
          triggerClassName="w-full"
        />
      ) : (
        <Input
          size="sm"
          aria-label="Value"
          disabled={ctx.disabled}
          // Marked, never silently ignored: an empty value matches more people
          // than the author thinks. `error` is the kit's own invalid state, so
          // it stays red while you type in it.
          error={incomplete}
          type={spec?.type === 'number' || spec?.type === 'date' ? spec.type : 'text'}
          placeholder="Value"
          value={condition.value}
          onChange={(event) => ctx.patch(condition.id, { value: event.target.value })}
          containerClassName="w-full min-w-0"
        />
      )}

      <Button
        size="icon-sm"
        variant="ghost"
        disabled={ctx.disabled}
        aria-label="Remove condition"
        className="justify-self-end"
        onClick={() => ctx.drop(condition.id)}
      >
        <X />
      </Button>
    </div>
  )
}

/* ---------------------------------------------------------------- group */

function Group({ group, depth, ctx }: { group: ConditionGroup; depth: number; ctx: Ctx }) {
  const many = group.conditions.length > 1

  return (
    <div
      data-slot="segment-group"
      data-join={group.join}
      className={cn(
        '@container',
        depth > 0 && cn(radius.surface, 'border-border bg-muted/30 border p-2'),
      )}
    >
      <div className="flex gap-2">
        {/*
          The bracket. What it spans is what the join applies to — which is the
          one thing a flat list of and/or dropdowns cannot show.
        */}
        <div className={cn('relative w-11 shrink-0', !many && 'w-0 overflow-hidden')}>
          {many && (
            <>
              <span
                aria-hidden="true"
                className="border-border absolute inset-y-4 end-0 w-2.5 rounded-s-md border-y border-s"
              />
              <button
                type="button"
                disabled={ctx.disabled}
                // One control, two states: a labelled toggle rather than a
                // dropdown, because there are only ever two joins.
                aria-label={`Join: ${group.join.toUpperCase()}. Switch to ${
                  group.join === 'and' ? 'OR' : 'AND'
                }`}
                onClick={() => ctx.setJoin(group.id, group.join === 'and' ? 'or' : 'and')}
                className={cn(
                  'bg-background border-border absolute top-1/2 start-0 -translate-y-1/2 border',
                  'px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase',
                  radius.xs,
                  focusRing,
                  'hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                {group.join}
              </button>
            </>
          )}
        </div>

        <ul className="min-w-0 flex-1 list-none space-y-2">
          {group.conditions.length === 0 ? (
            <li className="text-muted-foreground py-1 text-xs">{ctx.emptyLabel}</li>
          ) : (
            group.conditions.map((node) => (
              <li key={node.id} className="min-w-0">
                {isGroup(node) ? (
                  <Group group={node} depth={depth + 1} ctx={ctx} />
                ) : (
                  <ConditionRow condition={node} ctx={ctx} />
                )}
              </li>
            ))
          )}

          <li className="flex flex-wrap items-center gap-1 pt-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={ctx.disabled}
              onClick={() => ctx.addCondition(group.id)}
            >
              <Plus />
              {ctx.addLabel}
            </Button>

            {depth < ctx.maxDepth && (
              <Button
                size="sm"
                variant="ghost"
                disabled={ctx.disabled}
                onClick={() => ctx.addGroup(group.id)}
              >
                <Plus />
                {ctx.addGroupLabel}
              </Button>
            )}

            {depth > 0 && (
              <Button
                size="sm"
                variant="ghost"
                disabled={ctx.disabled}
                className="text-muted-foreground ms-auto"
                onClick={() => ctx.drop(group.id)}
              >
                <X />
                Remove group
              </Button>
            )}
          </li>
        </ul>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- builder */

type SegmentBuilderProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  fields: FieldSpec[]
  value?: ConditionGroup
  defaultValue?: ConditionGroup
  onChange?: (group: ConditionGroup) => void
  /** Matching people, from your backend. */
  estimate?: ReactNode
  /** Depth of nesting allowed. */
  maxDepth?: number
  /** Hide the plain-language summary. */
  summary?: boolean
  addLabel?: string
  addGroupLabel?: string
  label?: string
  emptyLabel?: string
  disabled?: boolean
}

let counter = 0
const nextId = () => `c${++counter}`
const emptyGroup = (): ConditionGroup => ({ id: nextId(), join: 'and', conditions: [] })

function SegmentBuilder({
  fields,
  value,
  defaultValue,
  onChange,
  estimate,
  maxDepth = 2,
  summary = true,
  addLabel = 'Condition',
  addGroupLabel = 'Group',
  label = 'Segment',
  emptyLabel = 'No conditions — this matches everyone.',
  disabled,
  className,
  ...props
}: SegmentBuilderProps) {
  const titleId = useId()
  const [internal, setInternal] = useState<ConditionGroup>(defaultValue ?? emptyGroup())

  const root = value ?? internal

  const commit = (next: ConditionGroup) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  /* -------------------------------------------- structural edits, by id */

  const editGroup = (
    group: ConditionGroup,
    id: string,
    fn: (node: ConditionGroup) => ConditionGroup,
  ): ConditionGroup =>
    group.id === id
      ? fn(group)
      : {
          ...group,
          conditions: group.conditions.map((node) =>
            isGroup(node) ? editGroup(node, id, fn) : node,
          ),
        }

  const editCondition = (
    group: ConditionGroup,
    id: string,
    changes: Partial<Condition>,
  ): ConditionGroup => ({
    ...group,
    conditions: group.conditions.map((node) =>
      isGroup(node)
        ? editCondition(node, id, changes)
        : node.id === id
          ? { ...node, ...changes }
          : node,
    ),
  })

  const removeNode = (group: ConditionGroup, id: string): ConditionGroup => ({
    ...group,
    conditions: group.conditions
      .filter((node) => node.id !== id)
      .map((node) => (isGroup(node) ? removeNode(node, id) : node)),
  })

  const ctx: Ctx = {
    fields,
    disabled,
    maxDepth,
    addLabel,
    addGroupLabel,
    emptyLabel,
    patch: (id, changes) => commit(editCondition(root, id, changes)),
    drop: (id) => commit(removeNode(root, id)),
    setJoin: (id, join) => commit(editGroup(root, id, (current) => ({ ...current, join }))),
    addCondition: (id) =>
      commit(
        editGroup(root, id, (current) => ({
          ...current,
          conditions: [
            ...current.conditions,
            {
              id: nextId(),
              field: fields[0]?.key ?? '',
              operator: operatorsFor(fields, fields[0]?.key ?? '')[0]?.value ?? 'eq',
              value: '',
            },
          ],
        })),
      ),
    addGroup: (id) =>
      commit(
        editGroup(root, id, (current) => ({
          ...current,
          conditions: [...current.conditions, emptyGroup()],
        })),
      ),
  }

  return (
    <div
      data-slot="segment-builder"
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p id={titleId} className="text-sm font-medium">
          {label}
        </p>
        {estimate !== undefined && (
          <p className="text-muted-foreground text-xs tabular-nums">{estimate}</p>
        )}
      </div>

      <div className={cn(surface, radius.surface, 'p-3')}>
        <Group group={root} depth={0} ctx={ctx} />
      </div>

      {summary && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          <span className="font-medium">Matches: </span>
          <span className="font-mono">{describe(root, fields)}</span>
        </p>
      )}
    </div>
  )
}

export { SegmentBuilder, describe as describeSegment }
export type { SegmentBuilderProps }
