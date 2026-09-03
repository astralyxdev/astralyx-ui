import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Sparkline } from '@/components/ui/sparkline'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A job queue: depth, throughput, and whether it is keeping up.
 *
 * Depth alone says nothing. A queue at 40,000 that drains at 5,000/s is fine;
 * one at 300 that drains at 2/s is an incident. The component computes the
 * drain estimate from arrival and completion rates and leads with that, because
 * "clearing in 8 seconds" and "never" are the only two answers anyone wants.
 *
 * Failed and dead-letter counts are separate. A retryable failure is noise; a
 * job that has exhausted its retries and landed in the dead-letter queue is
 * lost work that a human has to decide about, and averaging them together hides
 * it completely.
 *
 * Oldest-job age is shown rather than average wait. Averages hide the one job
 * that has been stuck for six hours behind a poison message.
 */
/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_DRAINING_LABEL: (duration: string) => ReactNode = (text) => `draining, empty in ${text}`

function QueueMonitor({
  name,
  depth,
  processing = 0,
  failed = 0,
  deadLettered = 0,
  arrivalRate,
  completionRate,
  oldestAt,
  history,
  now,
  locale = 'en-GB',
  depthLabel = 'queued',
  processingLabel = 'processing',
  failedLabel = 'failed',
  deadLetterLabel = 'dead letter',
  oldestLabel = 'oldest',
  drainingLabel = DEFAULT_DRAINING_LABEL,
  growingLabel = 'growing — arrivals exceed completions',
  idleLabel = 'idle',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  name: ReactNode
  depth: number
  processing?: number
  failed?: number
  /** Exhausted retries — lost work needing a decision. */
  deadLettered?: number
  /** Jobs per second arriving. */
  arrivalRate?: number
  /** Jobs per second completing. */
  completionRate?: number
  /** Enqueue time of the oldest waiting job. */
  oldestAt?: Date
  history?: number[]
  now?: Date
  locale?: string
  depthLabel?: ReactNode
  processingLabel?: ReactNode
  failedLabel?: ReactNode
  deadLetterLabel?: ReactNode
  oldestLabel?: ReactNode
  /** Drain estimate, given the formatted duration. */
  drainingLabel?: (duration: string) => ReactNode
  growingLabel?: ReactNode
  idleLabel?: ReactNode
}) {
  // The only question that matters: is it keeping up?
  const net =
    arrivalRate !== undefined && completionRate !== undefined
      ? completionRate - arrivalRate
      : undefined
  const drainSeconds = net !== undefined && net > 0 ? depth / net : undefined

  const state =
    depth === 0 ? 'idle' : net !== undefined && net <= 0 ? 'growing' : 'draining'
  const tone =
    state === 'growing'
      ? 'var(--destructive)'
      : state === 'idle'
        ? 'var(--muted-foreground)'
        : 'var(--green)'

  const duration = (seconds: number) => {
    const s = Math.round(seconds)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.round(s / 60)}m`
    return `${Math.round(s / 3600)}h`
  }

  return (
    <div
      data-slot="queue-monitor"
      data-state={state}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        {arrivalRate !== undefined && completionRate !== undefined && (
          <span className="text-muted-foreground ms-auto text-xs tabular-nums">
            {arrivalRate.toFixed(1)} in / {completionRate.toFixed(1)} out per s
          </span>
        )}
      </div>

      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums" style={{ color: tone }}>
          <Fmt type="number" value={depth} locale={locale} />
        </span>
        <span className="text-muted-foreground text-xs">{depthLabel}</span>
      </p>

      {/* Leads with the answer, not the number. */}
      <p className="text-xs" style={{ color: tone }}>
        {state === 'idle'
          ? idleLabel
          : state === 'growing'
            ? growingLabel
            : drainSeconds !== undefined
              ? drainingLabel(duration(drainSeconds))
              : null}
      </p>

      {history && history.length > 1 && (
        <Sparkline values={history} variant="area" color={tone} className="h-8" />
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{processingLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="number" value={processing} locale={locale} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{failedLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="number" value={failed} locale={locale} />
          </dd>
        </div>
        {/* Never folded into `failed`: this is lost work. */}
        <div>
          <dt className="text-muted-foreground">{deadLetterLabel}</dt>
          <dd className="mt-0.5">
            {deadLettered > 0 ? (
              <Badge size="sm" color="destructive">
                <Fmt type="number" value={deadLettered} locale={locale} />
              </Badge>
            ) : (
              <span className="font-medium tabular-nums">0</span>
            )}
          </dd>
        </div>
        {oldestAt && (
          <div>
            <dt className="text-muted-foreground">{oldestLabel}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              <Fmt type="relative" value={oldestAt} now={now} locale={locale} />
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export { QueueMonitor }
