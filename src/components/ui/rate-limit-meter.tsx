import type { ComponentProps, ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A quota and the window it resets in.
 *
 * The reset time is as prominent as the count. "9,800 of 10,000" is alarming
 * and "resets in 40 seconds" makes it fine; showing the first without the
 * second sends people to write a caching layer they do not need.
 *
 * Burn rate is derived from what has been consumed against how much of the
 * window has elapsed, and the projection says whether the quota runs out before
 * the reset. That is the question — not the current number.
 *
 * Remaining is shown, not used. Both are on screen, but the headline is the one
 * a caller acts on, and inverting it costs a subtraction every glance.
 */
function RateLimitMeter({
  limit,
  remaining,
  resetAt,
  windowSeconds,
  now,
  label = 'Rate limit',
  remainingLabel = 'remaining',
  resetsLabel = 'resets',
  exhaustedLabel = 'Quota exhausted',
  projectionLabel = 'On the current rate this window runs out before it resets.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  limit: number
  remaining: number
  resetAt?: Date
  /** Length of the window. Enables the burn-rate projection. */
  windowSeconds?: number
  now?: Date
  label?: ReactNode
  remainingLabel?: ReactNode
  resetsLabel?: ReactNode
  exhaustedLabel?: ReactNode
  /** Warning when the projection says the quota will not last. */
  projectionLabel?: ReactNode
}) {
  const reference = now ?? new Date()
  const used = Math.max(0, limit - remaining)
  const share = limit > 0 ? remaining / limit : 0
  const exhausted = remaining <= 0

  // Elapsed share of the window, from the reset time and the window length.
  const secondsLeft = resetAt ? (resetAt.getTime() - reference.getTime()) / 1000 : undefined
  const elapsedShare =
    windowSeconds && secondsLeft !== undefined
      ? Math.min(1, Math.max(0.0001, (windowSeconds - secondsLeft) / windowSeconds))
      : undefined

  // Will the quota outlast the window at the current rate?
  const willExhaust =
    elapsedShare !== undefined && !exhausted && used / elapsedShare > limit

  const tone = exhausted
    ? 'var(--destructive)'
    : share < 0.15 || willExhaust
      ? 'var(--amber)'
      : 'var(--green)'

  return (
    <div
      data-slot="rate-limit-meter"
      className={cn(surface, radius.surface, 'flex flex-col gap-2 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        {/* Reset is as prominent as the count — it is what makes a scary
            number harmless. */}
        {resetAt && (
          <span className="text-muted-foreground ms-auto text-xs">
            {resetsLabel} <Fmt type="relative" value={resetAt} now={reference} />
          </span>
        )}
      </div>

      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: tone }}>
          <Fmt type="number" value={remaining} />
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          / <Fmt type="number" value={limit} /> {remainingLabel}
        </span>
      </p>

      <div
        role="meter"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={typeof label === 'string' ? label : undefined}
        className="bg-secondary relative h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${share * 100}%`, background: tone }}
        />
        {/* Where the window itself has got to, for comparison against spend. */}
        {elapsedShare !== undefined && (
          <span
            aria-hidden="true"
            className="bg-foreground/40 absolute inset-y-0 w-px"
            style={{ insetInlineStart: `${(1 - elapsedShare) * 100}%` }}
          />
        )}
      </div>

      {exhausted ? (
        <p className="text-xs text-[var(--destructive-soft-foreground)]">{exhaustedLabel}</p>
      ) : willExhaust ? (
        <p className="text-[var(--amber-soft-foreground)] text-xs">{projectionLabel}</p>
      ) : null}
    </div>
  )
}

export { RateLimitMeter }
