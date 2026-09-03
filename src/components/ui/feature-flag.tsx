import type { ComponentProps, ReactNode } from 'react'
import { Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A feature flag with its rollout percentage and targeting rules.
 *
 * The kill switch and the rollout are separate controls on purpose. Turning a
 * flag off has to be one unambiguous action during an incident — folding it
 * into "set rollout to 0%" means the emergency path is a slider drag, and a
 * slider is the wrong instrument when something is on fire.
 *
 * The rollout bar is shown even at 100%, so "fully rolled out" and "off" are
 * visually distinct states rather than both being an empty control.
 */
export type FlagRule = {
  id: string
  label: ReactNode
  /** e.g. "plan is enterprise" */
  condition: string
  enabled?: boolean
}

function FeatureFlag({
  name,
  description,
  enabled,
  onEnabledChange,
  rollout,
  onRolloutChange,
  rules,
  environment,
  rolloutLabel = 'Rollout',
  targetingLabel = 'Targeting',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  name: string
  description?: ReactNode
  enabled: boolean
  onEnabledChange?: (enabled: boolean) => void
  /** 0–100. Omit for a flag with no gradual rollout. */
  rollout?: number
  onRolloutChange?: (rollout: number) => void
  rules?: FlagRule[]
  environment?: string
  rolloutLabel?: ReactNode
  targetingLabel?: ReactNode
}) {
  return (
    <div
      data-slot="feature-flag"
      data-enabled={enabled || undefined}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Flag
          className={cn(
            'mt-0.5 size-4 shrink-0',
            enabled ? 'text-[var(--green-soft-foreground)]' : 'text-muted-foreground/50',
          )}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="truncate font-mono text-sm font-medium">{name}</code>
            {environment && <Badge size="sm">{environment}</Badge>}
            <Badge size="sm" color={enabled ? 'green' : 'neutral'}>
              {enabled ? 'On' : 'Off'}
            </Badge>
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>

        {/* The kill switch, kept separate from the rollout. */}
        <Switch
          checked={enabled}
          onChange={(event) => onEnabledChange?.(event.target.checked)}
          aria-label={`${name} enabled`}
          className="shrink-0"
        />
      </div>

      {rollout !== undefined && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
              {rolloutLabel}
            </span>
            <span
              className={cn(
                'text-xs tabular-nums whitespace-nowrap',
                enabled ? 'text-foreground' : 'text-muted-foreground/50',
              )}
            >
              {rollout}% of users
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={rollout}
            disabled={!enabled || !onRolloutChange}
            aria-label={`${name} rollout percentage`}
            onChange={(event) => onRolloutChange?.(Number(event.target.value))}
            className="w-full accent-[var(--primary)] disabled:opacity-40"
          />
        </div>
      )}

      {rules && rules.length > 0 && (
        <div className="border-border flex flex-col gap-1.5 border-t pt-3">
          <span className="text-muted-foreground text-xs font-medium">{targetingLabel}</span>
          <ul className="flex list-none flex-col gap-1">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  'flex items-center gap-2 text-xs',
                  rule.enabled === false && 'opacity-50',
                )}
              >
                <span className="bg-secondary rounded-sm px-1.5 py-0.5 font-mono">
                  {rule.condition}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { FeatureFlag }
