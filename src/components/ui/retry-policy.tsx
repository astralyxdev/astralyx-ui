import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A retry policy and the attempts it produced.
 *
 * Configuration and history in one component on purpose. A policy shown alone
 * reads as reasonable — three attempts, exponential backoff — right up until
 * you see it fired four times in ninety milliseconds because the backoff was
 * never applied. The attempt list is what proves the policy is the one running.
 *
 * **Jitter is shown as a range, not a number.** A backoff without jitter is how
 * a thousand clients retry in lockstep and turn one outage into two, and a UI
 * that renders "2s" for a delay that is actually 1.4–2.6s hides whether jitter
 * is configured at all.
 *
 * The projected schedule is computed from the policy, so a policy that would
 * wait eleven minutes on its last attempt says so before anyone ships it.
 */
export type RetryAttempt = {
  attempt: number
  /** Already formatted — this component does not own your locale. */
  at?: string
  outcome: 'failed' | 'succeeded' | 'gave-up'
  /** Milliseconds waited before this attempt. */
  waitedMs?: number
  error?: ReactNode
}

type RetryPolicyProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Total attempts, including the first. */
  maxAttempts: number
  /** Delay before the second attempt, in ms. */
  baseDelayMs: number
  /** Delay multiplier per attempt. 1 is a fixed delay. */
  factor?: number
  /** Ceiling on any single wait. */
  maxDelayMs?: number
  /** Random spread, 0–1. 0.3 means ±30%. */
  jitter?: number
  attempts?: RetryAttempt[]
  formatDelay?: (ms: number) => string
  scheduleLabel?: string
  attemptsLabel?: string
  noAttemptsLabel?: string
  noJitterLabel?: string
}

function defaultDelay(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function RetryPolicy({
  maxAttempts,
  baseDelayMs,
  factor = 2,
  maxDelayMs,
  jitter = 0,
  attempts = [],
  formatDelay = defaultDelay,
  scheduleLabel = 'Projected schedule',
  attemptsLabel = 'Attempts',
  noAttemptsLabel = 'Not retried yet.',
  noJitterLabel = 'no jitter — clients will retry in lockstep',
  className,
  ...props
}: RetryPolicyProps) {
  const schedule = useMemo(() => {
    const waits: number[] = []
    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      const raw = baseDelayMs * factor ** (attempt - 1)
      waits.push(maxDelayMs === undefined ? raw : Math.min(raw, maxDelayMs))
    }
    return waits
  }, [maxAttempts, baseDelayMs, factor, maxDelayMs])

  const total = schedule.reduce((sum, wait) => sum + wait, 0)

  return (
    <div
      data-slot="retry-policy"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <p className="text-muted-foreground/70 min-w-0 flex-1 text-[11px] font-medium tracking-[0.14em] uppercase">
          {scheduleLabel}
        </p>
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {maxAttempts} attempts · up to {formatDelay(total)} of waiting
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
        {schedule.map((wait, index) => (
          <span
            key={index}
            className={cn(
              'bg-secondary text-secondary-foreground px-2 py-0.5 font-mono text-[11px] tabular-nums',
              radius.xs,
            )}
          >
            {/* A range, not a point: a delay rendered as "2s" hides whether
                jitter is configured at all. */}
            {jitter > 0
              ? `${formatDelay(wait * (1 - jitter))}–${formatDelay(wait * (1 + jitter))}`
              : formatDelay(wait)}
          </span>
        ))}
        {jitter === 0 && (
          <Badge size="sm" color="amber">
            {noJitterLabel}
          </Badge>
        )}
      </div>

      <div className="border-border border-t">
        <p className="text-muted-foreground/70 px-4 pt-2.5 text-[11px] font-medium tracking-[0.14em] uppercase">
          {attemptsLabel}
        </p>

        {attempts.length === 0 ? (
          <p className="text-muted-foreground px-4 py-2.5 text-xs">{noAttemptsLabel}</p>
        ) : (
          <ul className="list-none px-4 py-2">
            {attempts.map((attempt) => (
              <li key={attempt.attempt} className="flex items-baseline gap-2.5 py-1">
                <span className="text-muted-foreground/50 w-5 shrink-0 font-mono text-[11px] tabular-nums">
                  #{attempt.attempt}
                </span>

                <Badge
                  size="sm"
                  color={
                    attempt.outcome === 'succeeded'
                      ? 'green'
                      : attempt.outcome === 'gave-up'
                        ? 'destructive'
                        : 'amber'
                  }
                >
                  {attempt.outcome}
                </Badge>

                {attempt.waitedMs !== undefined && (
                  <span className="text-muted-foreground/60 shrink-0 font-mono text-[11px] tabular-nums">
                    after {formatDelay(attempt.waitedMs)}
                  </span>
                )}

                {attempt.error && (
                  <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                    {attempt.error}
                  </span>
                )}

                {attempt.at && (
                  <span className="text-muted-foreground/50 shrink-0 font-mono text-[11px] tabular-nums">
                    {attempt.at}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { RetryPolicy }
export type { RetryPolicyProps }
