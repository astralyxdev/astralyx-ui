import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A live multiplier curve — the crash-game shape.
 *
 * The y-axis is logarithmic. These curves are exponential by construction, and
 * a linear axis renders everything below 10× as a flat line against a spike,
 * which is exactly the region the player is watching.
 *
 * The cash-out marker is drawn on the curve rather than in a legend, because
 * the question is always "where did I get out relative to where it stopped".
 *
 * Colour carries the state and nothing moves: this component updates several
 * times a second, and any transform animation would fight the next frame.
 */
function MultiplierChart({
  values,
  current,
  crashed = false,
  cashedOutAt,
  height = 160,
  max,
  label,
  crashedLabel = 'Crashed',
  runningLabel = 'Running',
  logScaleLabel = 'log scale',
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'height'> & {
  /** Multiplier samples over time, starting at 1. */
  values: number[]
  current?: number
  crashed?: boolean
  /** Where the player cashed out, if they did. */
  cashedOutAt?: number
  height?: number
  max?: number
  label?: ReactNode
  crashedLabel?: ReactNode
  runningLabel?: ReactNode
  /** Note shown once the curve switches to a logarithmic axis. */
  logScaleLabel?: ReactNode
}) {
  const titleId = useId()
  if (values.length === 0) return null

  const peak = max ?? Math.max(...values, current ?? 1, 2)
  // Log scale: a linear axis flattens everything under 10× into a straight line.
  const scale = (value: number) =>
    Math.log(Math.max(value, 1)) / Math.log(Math.max(peak, 1.0001))

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 60 - scale(value) * 58
      return `${x},${y}`
    })
    .join(' ')

  const colour = crashed
    ? 'var(--destructive)'
    : cashedOutAt !== undefined
      ? 'var(--green)'
      : 'var(--blue)'

  const cashOutIndex =
    cashedOutAt === undefined
      ? -1
      : values.findIndex((value) => value >= cashedOutAt)

  return (
    <figure
      data-slot="multiplier-chart"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    >
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={titleId}
          className="size-full"
        >
          <title id={titleId}>
            {`Multiplier curve, ${crashed ? 'crashed' : 'running'} at ${(current ?? values.at(-1) ?? 1).toFixed(2)}×`}
          </title>

          <polygon
            points={`0,60 ${points} 100,60`}
            fill={colour}
            opacity={0.12}
          />
          <polyline
            points={points}
            fill="none"
            stroke={colour}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* On the curve, not in a legend. */}
        {cashOutIndex >= 0 && (
          <span
            aria-hidden="true"
            className="bg-[var(--green)] ring-background absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 [corner-shape:round]"
            style={{
              left: `${(cashOutIndex / Math.max(values.length - 1, 1)) * 100}%`,
              top: `${((60 - scale(values[cashOutIndex]) * 58) / 60) * 100}%`,
            }}
          />
        )}

        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums',
            crashed
              ? 'text-[var(--destructive-soft-foreground)]'
              : cashedOutAt !== undefined
                ? 'text-[var(--green-soft-foreground)]'
                : 'text-foreground',
          )}
          aria-live="off"
        >
          {(current ?? values.at(-1) ?? 1).toFixed(2)}×
        </span>
      </div>

      <figcaption className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
        {crashed ? (
          <span className="text-[var(--destructive-soft-foreground)] font-medium">{crashedLabel}</span>
        ) : (
          <span>{runningLabel}</span>
        )}
        {cashedOutAt !== undefined && (
          <span className="text-[var(--green-soft-foreground)]">
            Cashed out at {cashedOutAt.toFixed(2)}×
          </span>
        )}
        <span className="text-muted-foreground/60">{logScaleLabel}</span>
        {label}
      </figcaption>
    </figure>
  )
}

export { MultiplierChart }
