import { useId, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The catalogue of tools an agent may call, with a switch on each.
 *
 * Distinct from `ToolCall`, which shows one invocation after the fact. This is
 * the permission screen: what the agent is allowed to reach for, decided before
 * it runs.
 *
 * **Destructive tools are marked, not hidden.** A tool that deletes, refunds or
 * sends carries `destructive`, which puts a warning glyph beside it and keeps
 * it visible when the list is filtered to enabled ones. The whole risk of an
 * agent is a capability nobody noticed it had, and a picker that renders
 * `delete_customer` the same as `list_customers` is helping that happen.
 *
 * Search matches the name *and* the description, because people look for tools
 * by what they do ("refund") at least as often as by what they are called.
 * Groups collapse to nothing when empty rather than leaving a bare heading.
 */
export type Tool = {
  id: string
  name: string
  description?: ReactNode
  /** Heading this tool sits under. Ungrouped tools come first. */
  group?: string
  /** Flags a capability worth a second look — deletes, payments, sends. */
  destructive?: boolean
  /** Cannot be switched, with the reason in `disabledReason`. */
  disabled?: boolean
  disabledReason?: ReactNode
  /** Trailing slot — a schema peek, a docs link, a usage count. */
  meta?: ReactNode
}

type ToolPickerProps = Omit<ComponentProps<'div'>, 'onSelect' | 'onChange'> & {
  tools: Tool[]
  /** Enabled tool ids. Controlled — the caller owns the set. */
  value: string[]
  onValueChange: (next: string[]) => void
  /** Show the filter field. Off for a short, fixed list. */
  searchable?: boolean
  searchPlaceholder?: string
  /** Accessible name for the filter field. */
  searchLabel?: string
  emptyLabel?: string
  emptyHint?: string
  /** Marks a tool as risky in the label. */
  destructiveLabel?: string
  /** Caption under the list. Receives the enabled count and the total. */
  summary?: (enabled: number, total: number) => ReactNode
}

function ToolPicker({
  tools,
  value,
  onValueChange,
  searchable = true,
  searchPlaceholder = 'Filter tools…',
  searchLabel = 'Filter tools',
  emptyLabel = 'No tools match',
  emptyHint = 'Try a different word, or clear the filter.',
  destructiveLabel = 'Destructive',
  summary = (enabled, total) => `${enabled} of ${total} enabled`,
  className,
  ...props
}: ToolPickerProps) {
  const [query, setQuery] = useState('')
  const scope = useId()

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tools
    return tools.filter((tool) => {
      const haystack = `${tool.name} ${tool.group ?? ''} ${
        typeof tool.description === 'string' ? tool.description : ''
      }`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [query, tools])

  // Ungrouped first, then groups in the order they appear in `tools` — the
  // caller's ordering is a decision, and re-sorting alphabetically throws it away.
  const groups = useMemo(() => {
    const order: string[] = []
    const byGroup = new Map<string, Tool[]>()
    for (const tool of matched) {
      const key = tool.group ?? ''
      if (!byGroup.has(key)) {
        byGroup.set(key, [])
        order.push(key)
      }
      byGroup.get(key)!.push(tool)
    }
    return order.map((key) => ({ label: key, tools: byGroup.get(key)! }))
  }, [matched])

  const enabled = new Set(value)

  function toggle(id: string, on: boolean) {
    onValueChange(on ? [...value, id] : value.filter((item) => item !== id))
  }

  return (
    <div data-slot="tool-picker" className={cn('flex flex-col gap-3', className)} {...props}>
      {searchable && (
        <Input
          size="sm"
          value={query}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          icon={<Search />}
          clearable
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      {matched.length === 0 ? (
        <Empty title={emptyLabel} description={emptyHint} />
      ) : (
        <div className={cn(surface, radius.surface, 'divide-border divide-y overflow-hidden')}>
          {groups.map((group) => (
            <div key={group.label || 'ungrouped'}>
              {group.label && (
                <p className="text-muted-foreground/70 bg-muted/40 px-4 py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase">
                  {group.label}
                </p>
              )}
              <ul className="divide-border list-none divide-y">
                {group.tools.map((tool) => {
                  const id = `${scope}-${tool.id}`
                  return (
                    <li key={tool.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor={id}
                          className="flex flex-wrap items-center gap-2 font-mono text-sm"
                        >
                          {tool.name}
                          {tool.destructive && (
                            <Badge size="sm" color="destructive">
                              <AlertTriangle className="size-3" aria-hidden="true" />
                              {destructiveLabel}
                            </Badge>
                          )}
                        </label>
                        {tool.description && (
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            {tool.description}
                          </p>
                        )}
                        {tool.disabled && tool.disabledReason && (
                          <p className="text-muted-foreground/70 mt-1 text-xs">
                            {tool.disabledReason}
                          </p>
                        )}
                      </div>

                      {tool.meta && <div className="shrink-0">{tool.meta}</div>}

                      <Switch
                        id={id}
                        size="sm"
                        className="mt-0.5 shrink-0"
                        checked={enabled.has(tool.id)}
                        disabled={tool.disabled}
                        onChange={(event) => toggle(tool.id, event.target.checked)}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <p className="text-muted-foreground/70 text-xs tabular-nums">
          {summary(value.length, tools.length)}
        </p>
      )}
    </div>
  )
}

export { ToolPicker }
export type { ToolPickerProps }
