import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldBase, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Build an audience from conditions, with the groups made visible.
 *
 * **Precedence is shown as nesting, not implied by a word.** A flat list of
 * rows joined by AND and OR dropdowns is ambiguous — "A or B and C" means two
 * different audiences depending on how it binds, and users read it the way
 * English reads, which is not how the query engine evaluates it. Here a group
 * is a box with one join for everything inside it, so what you see is the
 * parse tree.
 *
 * **The output is a structure, not a string.** `onChange` hands back nested
 * groups, so it can be compiled to SQL, an API filter, or whatever the backend
 * takes — with the values still separated from the operators, which is what
 * keeps it parameterisable rather than concatenated into an injection.
 *
 * **Incomplete rows are marked, not silently dropped.** A condition with no
 * value is a half-written thought; treating it as absent means the segment
 * quietly matches more people than the person building it believes, which for a
 * marketing send is an expensive kind of wrong.
 *
 * The estimated size is a caller-supplied prop rather than something computed
 * here — only your backend knows how many people match.
 */
export type FieldSpec = {
  key: string
  label: string
  type?: 'string' | 'number' | 'date' | 'boolean' | 'enum'
  /** For `enum`, the allowed values. */
  options?: { value: string; label: string }[]
}

export type Condition = {
  id: string
  field: string
  operator: string
  value: string
}

export type ConditionGroup = {
  id: string
  join: 'and' | 'or'
  conditions: (Condition | ConditionGroup)[]
}

const isGroup = (node: Condition | ConditionGroup): node is ConditionGroup =>
  'conditions' in node

const OPERATORS: Record<string, { value: string; label: string; unary?: boolean }[]> = {
  string: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'set', label: 'is set', unary: true },
    { value: 'unset', label: 'is not set', unary: true },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
  ],
  date: [
    { value: 'after', label: 'after' },
    { value: 'before', label: 'before' },
    { value: 'within', label: 'within the last' },
  ],
  boolean: [
    { value: 'true', label: 'is true', unary: true },
    { value: 'false', label: 'is false', unary: true },
  ],
  enum: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
  ],
}

type SegmentBuilderProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  fields: FieldSpec[]
  value?: ConditionGroup
  defaultValue?: ConditionGroup
  onChange?: (group: ConditionGroup) => void
  /** Matching people, from your backend. */
  estimate?: ReactNode
  /** Depth of nesting allowed. */
  maxDepth?: number
  addLabel?: string
  addGroupLabel?: string
  label?: string
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
  addLabel = 'Add condition',
  addGroupLabel = 'Add group',
  label = 'Segment',
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

  /** Structural edit by id — the tree is small, so a rebuild is simplest. */
  const replace = (
    group: ConditionGroup,
    id: string,
    fn: (node: ConditionGroup) => ConditionGroup,
  ): ConditionGroup => {
    if (group.id === id) return fn(group)
    return {
      ...group,
      conditions: group.conditions.map((node) =>
        isGroup(node) ? replace(node, id, fn) : node,
      ),
    }
  }

  const updateCondition = (group: ConditionGroup, id: string, patch: Partial<Condition>): ConditionGroup => ({
    ...group,
    conditions: group.conditions.map((node) =>
      isGroup(node)
        ? updateCondition(node, id, patch)
        : node.id === id
          ? { ...node, ...patch }
          : node,
    ),
  })

  const remove = (group: ConditionGroup, id: string): ConditionGroup => ({
    ...group,
    conditions: group.conditions
      .filter((node) => node.id !== id)
      .map((node) => (isGroup(node) ? remove(node, id) : node)),
  })

  const operatorsFor = (fieldKey: string) => {
    const spec = fields.find((field) => field.key === fieldKey)
    return OPERATORS[spec?.type ?? 'string'] ?? OPERATORS.string
  }

  const renderGroup = (group: ConditionGroup, depth: number): ReactNode => (
    <div
      key={group.id}
      className={cn(
        'flex flex-col gap-2',
        depth > 0 && cn('border-border border-s-2 ps-3', radius.xs),
      )}
    >
      {group.conditions.map((node, index) => (
        <div key={node.id} className="flex items-start gap-2">
          {/* The join word appears once per group, between rows — not as a
              per-row dropdown, which is what makes precedence ambiguous. */}
          <span className="w-12 shrink-0 pt-2 text-end">
            {index === 0 ? (
              <span className="text-muted-foreground text-xs">Where</span>
            ) : index === 1 ? (
              <select
                aria-label="Join"
                value={group.join}
                onChange={(event) =>
                  commit(
                    replace(root, group.id, (current) => ({
                      ...current,
                      join: event.target.value as 'and' | 'or',
                    })),
                  )
                }
                className={cn(fieldBase, 'h-7 w-full px-1 text-xs')}
              >
                <option value="and">and</option>
                <option value="or">or</option>
              </select>
            ) : (
              <span className="text-muted-foreground text-xs">{group.join}</span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            {isGroup(node) ? (
              renderGroup(node, depth + 1)
            ) : (
              (() => {
                const operators = operatorsFor(node.field)
                const operator = operators.find((item) => item.value === node.operator)
                const spec = fields.find((field) => field.key === node.field)
                const incomplete = !operator?.unary && node.value.trim() === ''

                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Field"
                      value={node.field}
                      onChange={(event) =>
                        commit(
                          updateCondition(root, node.id, {
                            field: event.target.value,
                            operator: operatorsFor(event.target.value)[0]?.value ?? 'eq',
                            value: '',
                          }),
                        )
                      }
                      className={cn(fieldBase, 'h-8 px-2 text-sm')}
                    >
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Operator"
                      value={node.operator}
                      onChange={(event) =>
                        commit(updateCondition(root, node.id, { operator: event.target.value }))
                      }
                      className={cn(fieldBase, 'h-8 px-2 text-sm')}
                    >
                      {operators.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {!operator?.unary &&
                      (spec?.type === 'enum' && spec.options ? (
                        <select
                          aria-label="Value"
                          value={node.value}
                          onChange={(event) =>
                            commit(updateCondition(root, node.id, { value: event.target.value }))
                          }
                          className={cn(fieldBase, 'h-8 px-2 text-sm')}
                        >
                          <option value="">Choose…</option>
                          {spec.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          aria-label="Value"
                          aria-invalid={incomplete || undefined}
                          type={spec?.type === 'number' ? 'number' : spec?.type === 'date' ? 'date' : 'text'}
                          value={node.value}
                          onChange={(event) =>
                            commit(updateCondition(root, node.id, { value: event.target.value }))
                          }
                          className={cn(
                            fieldBase,
                            'h-8 w-40 px-2 text-sm',
                            // Marked, never silently ignored: an empty value
                            // matches more people than the author thinks.
                            incomplete && 'border-[var(--destructive)]',
                          )}
                        />
                      ))}

                    {incomplete && (
                      <span className="text-[var(--destructive)] text-[11px]">needs a value</span>
                    )}

                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remove condition"
                      onClick={() => commit(remove(root, node.id))}
                    >
                      <X />
                    </Button>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 ps-14">
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            commit(
              replace(root, group.id, (current) => ({
                ...current,
                conditions: [
                  ...current.conditions,
                  {
                    id: nextId(),
                    field: fields[0]?.key ?? '',
                    operator: operatorsFor(fields[0]?.key ?? '')[0]?.value ?? 'eq',
                    value: '',
                  },
                ],
              })),
            )
          }
        >
          <Plus />
          {addLabel}
        </Button>

        {depth < maxDepth && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              commit(
                replace(root, group.id, (current) => ({
                  ...current,
                  conditions: [...current.conditions, emptyGroup()],
                })),
              )
            }
          >
            {addGroupLabel}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div
      data-slot="segment-builder"
      className={cn(surface, radius.surface, 'p-4', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between">
        <p id={titleId} className="text-sm font-medium">
          {label}
        </p>
        {estimate !== undefined && (
          <p className="text-muted-foreground text-xs tabular-nums">{estimate}</p>
        )}
      </div>

      {renderGroup(root, 0)}
    </div>
  )
}

export { SegmentBuilder }
export type { SegmentBuilderProps }
