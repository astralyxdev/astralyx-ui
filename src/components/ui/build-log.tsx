import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight, Clock, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Terminal } from '@/components/ui/terminal'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A build's steps, each with its own output and duration.
 *
 * Failed steps open by default and successful ones stay closed. A build log is
 * opened for exactly one reason and it is not to read the successful steps; a
 * fully-expanded log means scrolling past 4,000 lines of dependency
 * installation to find the error.
 *
 * Durations get a bar relative to the slowest step, so the step that is making
 * the build slow is visible without reading every number. That is the second
 * reason anyone opens a build log.
 *
 * A running step shows a spinner and no duration rather than a duration that
 * ticks; a number that changes while you read it is harder to compare than one
 * that is simply absent until final.
 */
export type BuildStepStatus = 'success' | 'failed' | 'running' | 'skipped' | 'pending'

export type BuildStep = {
  id: string
  name: ReactNode
  status: BuildStepStatus
  /** Milliseconds. Omit while running. */
  duration?: number
  output?: string
  /** Overrides the default open/closed rule. */
  defaultOpen?: boolean
}

const STATUS = {
  success: { Icon: Check, color: 'var(--green-soft-foreground)', label: 'Succeeded' },
  failed: { Icon: X, color: 'var(--destructive-soft-foreground)', label: 'Failed' },
  running: { Icon: Clock, color: 'var(--blue-soft-foreground)', label: 'Running' },
  skipped: { Icon: ChevronRight, color: 'var(--muted-foreground)', label: 'Skipped' },
  pending: { Icon: Clock, color: 'var(--muted-foreground)', label: 'Pending' },
} as const

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

function BuildLog({
  steps,
  totalLabel = 'Total',
  runningLabel = 'Running',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  steps: BuildStep[]
  totalLabel?: ReactNode
  /** Accessible name for the in-progress spinner. */
  runningLabel?: string
}) {
  // Failures open, successes closed — nobody opens a build log for the wins.
  const [open, setOpen] = useState<string[]>(() =>
    steps.filter((s) => s.defaultOpen ?? s.status === 'failed').map((s) => s.id),
  )

  const slowest = useMemo(
    () => steps.reduce((max, step) => Math.max(max, step.duration ?? 0), 0),
    [steps],
  )
  const total = steps.reduce((sum, step) => sum + (step.duration ?? 0), 0)

  return (
    <div
      data-slot="build-log"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <ul className="divide-border/60 list-none divide-y">
        {steps.map((step) => {
          const meta = STATUS[step.status]
          const Icon = meta.Icon
          const expanded = open.includes(step.id)
          const hasOutput = Boolean(step.output)

          return (
            <li key={step.id}>
              <button
                type="button"
                aria-expanded={hasOutput ? expanded : undefined}
                disabled={!hasOutput}
                onClick={() =>
                  setOpen((current) =>
                    current.includes(step.id)
                      ? current.filter((id) => id !== step.id)
                      : [...current, step.id],
                  )
                }
                className={cn(
                  'flex w-full items-center gap-2.5 p-3 text-start',
                  hasOutput && interactive,
                  focusRing,
                )}
              >
                {hasOutput ? (
                  expanded ? (
                    <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                  )
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}

                {step.status === 'running' ? (
                  <Spinner size="xs" label={runningLabel} className="shrink-0" />
                ) : (
                  <Icon className="size-4 shrink-0" style={{ color: meta.color }} aria-label={meta.label} />
                )}

                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    step.status === 'skipped' && 'text-muted-foreground line-through',
                  )}
                >
                  {step.name}
                </span>

                {/* Where the time went, without reading every number. */}
                {step.duration !== undefined && slowest > 0 && (
                  <span className="hidden h-1 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--secondary)] sm:block">
                    <span
                      className="block h-full"
                      style={{
                        width: `${(step.duration / slowest) * 100}%`,
                        background: step.duration === slowest ? 'var(--amber)' : 'var(--muted-foreground)',
                      }}
                    />
                  </span>
                )}

                <span className="text-muted-foreground w-16 shrink-0 text-end text-xs tabular-nums">
                  {step.duration !== undefined ? formatDuration(step.duration) : ''}
                </span>
              </button>

              {expanded && step.output && (
                <div className="border-border/60 border-t p-3">
                  <Terminal content={step.output} showLineNumbers copyable />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {total > 0 && (
        <div className="border-border text-muted-foreground flex items-center justify-between border-t p-3 text-xs">
          <span>{totalLabel}</span>
          <span className="font-medium tabular-nums">{formatDuration(total)}</span>
        </div>
      )}
    </div>
  )
}

export { BuildLog, formatDuration as formatBuildDuration }
