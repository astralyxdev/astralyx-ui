import type { ComponentProps, ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import { cn } from '@/lib/utils'

/**
 * An error budget and how fast it is being spent.
 *
 * Shows the budget *remaining*, not the availability achieved. 99.4% against a
 * 99.9% target sounds like a near miss and is in fact a six-times overspend —
 * the budget framing is what makes that legible, and it is the number an
 * on-call decision is actually made on.
 *
 * The burn rate is given as a multiple of the sustainable pace, since "2.4×"
 * answers "will we make it" and a raw percentage does not.
 */
function SloBudget({
  target,
  actual,
  window: windowLabel = '30 days',
  burnRate,
  label,
  hint,
  targetLabel = 'target',
  remainingLabel = 'remaining',
  meterLabel = 'Error budget remaining',
  achievedLabel = 'Achieved',
  spentLabel = 'spent',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  /** Objective as a ratio, e.g. 0.999. */
  target: number
  /** Achieved availability as a ratio. */
  actual: number
  window?: string
  /** Multiple of the sustainable burn rate. Above 1 will exhaust the budget. */
  burnRate?: number
  label?: ReactNode
  hint?: ReactNode
  /** Precedes the objective in the subheading. */
  targetLabel?: ReactNode
  /** Follows the remaining percentage. */
  remainingLabel?: ReactNode
  /** Accessible name for the budget meter. */
  meterLabel?: string
  /** Precedes the achieved availability. */
  achievedLabel?: ReactNode
  /** Precedes the consumed share. */
  spentLabel?: ReactNode
}) {
  const allowed = 1 - target
  const used = Math.max(0, 1 - actual)
  const consumed = allowed > 0 ? used / allowed : 0
  const remaining = Math.max(0, 1 - consumed)
  const exhausted = consumed >= 1

  const tone = exhausted
    ? 'var(--destructive)'
    : consumed >= 0.75
      ? 'var(--amber)'
      : 'var(--green)'

  return (
    <div
      data-slot="slo-budget"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-medium">{label ?? 'Error budget'}</span>
        <span className="text-muted-foreground text-xs">
          {targetLabel} <Fmt type="percent" value={target} decimals={2} /> · {windowLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold tabular-nums"
          style={{ color: exhausted ? tone : undefined }}
        >
          <Fmt type="percent" value={remaining} decimals={0} />
        </span>
        <span className="text-muted-foreground text-xs whitespace-nowrap">{remainingLabel}</span>

        {burnRate !== undefined && (
          <span
            className={cn(
              'ms-auto text-xs font-medium tabular-nums whitespace-nowrap',
              burnRate > 1 ? 'text-[var(--destructive-soft-foreground)]' : 'text-muted-foreground',
            )}
          >
            {burnRate.toFixed(1)}× burn
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(remaining * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={meterLabel}
        className="bg-secondary h-2 w-full overflow-hidden rounded-full [corner-shape:round]"
      >
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300 ease-out [corner-shape:round] motion-reduce:transition-none"
          style={{ width: `${remaining * 100}%`, backgroundColor: tone }}
        />
      </div>

      <p className="text-muted-foreground/80 text-xs">
        {hint ?? (
          <>
            {achievedLabel} <Fmt type="percent" value={actual} decimals={3} /> — {spentLabel}{' '}
            <Fmt type="percent" value={Math.min(consumed, 1)} decimals={0} /> of the
            allowance
            {exhausted && ', budget exhausted'}
          </>
        )}
      </p>
    </div>
  )
}

export { SloBudget }
