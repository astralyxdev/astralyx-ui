import type { ComponentProps, ReactNode } from 'react'
import { Bot, Thermometer, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * One agent's definition, as a card in a roster.
 *
 * The unit an agent-building UI is organised around: a name, the model behind
 * it, the tools it may reach for, and whether it is currently allowed to run.
 * Everything a reviewer needs to answer "what is this thing permitted to do"
 * without opening it.
 *
 * Tools are listed by name rather than counted. "6 tools" tells you nothing
 * about blast radius; `delete_customer` in that list tells you everything, and
 * it is the name that makes someone look twice. The overflow chip only appears
 * past `maxTools`, so short rosters stay complete.
 *
 * `status` is separate from `enabled` on purpose. An agent can be switched on
 * and still be failing, and collapsing the two hides exactly the case worth
 * seeing.
 */
export type AgentStatus = 'idle' | 'running' | 'error' | 'draft'

const STATUS: Record<AgentStatus, { label: string; color: 'neutral' | 'blue' | 'destructive' | 'amber' }> = {
  idle: { label: 'Idle', color: 'neutral' },
  running: { label: 'Running', color: 'blue' },
  error: { label: 'Failing', color: 'destructive' },
  draft: { label: 'Draft', color: 'amber' },
}

type AgentCardProps = Omit<ComponentProps<'div'>, 'onToggle' | 'onSelect'> & {
  name: string
  description?: ReactNode
  /** Model id, shown verbatim — an agent's behaviour is tied to the exact one. */
  model?: string
  /** Tool names the agent may call. */
  tools?: string[]
  /** Names past this collapse into a "+n" chip. */
  maxTools?: number
  temperature?: number
  status?: AgentStatus
  /** Labels for each status. Override to translate, or to match your wording. */
  statusLabels?: Partial<Record<AgentStatus, string>>
  /** Renders the on/off switch. Omit to show the card read-only. */
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
  toggleLabel?: string
  /** Trailing slot — a menu, a "Run" button, a link to the trace. */
  actions?: ReactNode
  /** Avatar or icon for the agent. Defaults to a bot glyph. */
  icon?: ReactNode
  selected?: boolean
  onSelect?: () => void
  toolsEmptyLabel?: string
}

function AgentCard({
  name,
  description,
  model,
  tools = [],
  maxTools = 4,
  temperature,
  status = 'idle',
  statusLabels,
  enabled,
  onToggle,
  toggleLabel = 'Enabled',
  actions,
  icon,
  selected = false,
  onSelect,
  toolsEmptyLabel = 'No tools',
  className,
  ...props
}: AgentCardProps) {
  const shown = tools.slice(0, maxTools)
  const overflow = tools.length - shown.length
  const meta = STATUS[status]

  return (
    <div
      data-slot="agent-card"
      data-status={status}
      data-selected={selected}
      className={cn(
        surface,
        radius.surface,
        'flex flex-col gap-3 p-4',
        onSelect && 'hover:border-foreground/25 cursor-pointer transition-colors motion-reduce:transition-none',
        selected && 'border-primary ring-ring/40 ring-2',
        className,
      )}
      onClick={onSelect}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
          {icon ?? <Bot className="size-4" aria-hidden="true" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <Badge size="sm" color={meta.color}>
              {statusLabels?.[status] ?? meta.label}
            </Badge>
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {model && (
          <span className="flex items-center gap-1.5 font-mono">
            <Bot className="size-3.5 shrink-0" aria-hidden="true" />
            {model}
          </span>
        )}
        {temperature !== undefined && (
          <span className="flex items-center gap-1.5 tabular-nums">
            <Thermometer className="size-3.5 shrink-0" aria-hidden="true" />
            {temperature.toFixed(1)}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Wrench className="size-3.5 shrink-0" aria-hidden="true" />
          {tools.length === 0 ? toolsEmptyLabel : `${tools.length}`}
        </span>
      </div>

      {tools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((tool) => (
            <code
              key={tool}
              className={cn(
                'bg-secondary text-secondary-foreground px-2 py-0.5 font-mono text-[11px]',
                radius.xs,
              )}
            >
              {tool}
            </code>
          ))}
          {overflow > 0 && (
            <span className="text-muted-foreground/70 px-1 py-0.5 text-[11px] tabular-nums">
              +{overflow}
            </span>
          )}
        </div>
      )}

      {enabled !== undefined && (
        <div
          className="border-border flex items-center justify-between border-t pt-3"
          // The switch is its own control; clicking it should not also select
          // the card underneath.
          onClick={(event) => event.stopPropagation()}
        >
          <Switch
            size="sm"
            checked={enabled}
            onChange={(event) => onToggle?.(event.target.checked)}
            label={<span className="text-xs">{toggleLabel}</span>}
            labelPosition="start"
            containerClassName="justify-between w-full"
          />
        </div>
      )}
    </div>
  )
}

export { AgentCard }
export type { AgentCardProps }
