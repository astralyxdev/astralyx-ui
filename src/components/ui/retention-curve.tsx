import { useId, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * What fraction of a cohort is still here, period by period.
 *
 * **The one question this answers that a line of active users cannot:** whether
 * the product keeps people. Total actives goes up while retention collapses, as
 * long as acquisition outruns churn — which is exactly what a business looks
 * like just before it stops working. Retention normalises the cohort to its own
 * starting size, so growth cannot hide inside it.
 *
 * **Curves that flatten are the signal.** A curve decaying toward a horizontal
 * asymptote means a stable core formed; one still falling at the right-hand
 * edge means it has not, and the product has no floor yet. That shape — not the
 * day-1 number everyone quotes — is what the chart is for, which is why the
 * flattening point is called out rather than left to be eyeballed.
 *
 * **Later cohorts have fewer observed periods, and this shows it** by drawing
 * them shorter instead of extending them to the axis. A curve padded with
 * zeroes for periods that have not happened yet reads as catastrophic churn,
 * and it is the most common way this chart lies.
 *
 * Values are fractions (0–1) of each cohort's own starting size; period 0 is
 * therefore always 1 and is drawn, because its absence makes the first drop
 * hard to read.
 */
export type Cohort = {
  /** "2026-03", "Week 12" — whatever labels the group. */
  name: string
  /** Users in this cohort at period 0. */
  size?: number
  /** Fraction retained per period, starting at period 0 (which is 1). */
  values: number[]
  color?: string
}

type RetentionCurveProps = Omit<ComponentProps<'figure'>, 'height'> & {
  cohorts: Cohort[]
  height?: number
  periodLabel?: (index: number) => string
  /** Highlighted as the point the curve stops falling meaningfully. */
  flattenThreshold?: number
  showFlatten?: boolean
  legend?: boolean
  emptyLabel?: string
  label?: string
  footnote?: ReactNode
}

const PLOT = { width: 100, height: 60 }

function RetentionCurve({
  cohorts,
  height = 260,
  periodLabel = (index) => `P${index}`,
  flattenThreshold = 0.02,
  showFlatten = true,
  legend = true,
  emptyLabel = 'No cohorts.',
  label = 'Retention curve',
  footnote,
  className,
  ...props
}: RetentionCurveProps) {
  const titleId = useId()
  const [hovered, setHovered] = useState<string | null>(null)

  const model = useMemo(() => {
    const usable = cohorts.filter((cohort) => cohort.values.length > 0)
    if (usable.length === 0) return null

    const longest = Math.max(...usable.map((cohort) => cohort.values.length))

    /**
     * The first period where the drop falls below the threshold and stays
     * there — computed on the longest cohort, which has the most evidence.
     */
    const reference = usable.reduce((best, cohort) =>
      cohort.values.length > best.values.length ? cohort : best,
    )
    let flattensAt: number | null = null
    for (let i = 1; i < reference.values.length; i++) {
      const drop = reference.values[i - 1] - reference.values[i]
      if (drop <= flattenThreshold) {
        flattensAt = i
        break
      }
    }

    return { usable, longest, flattensAt, floor: flattensAt !== null ? reference.values[flattensAt] : null }
  }, [cohorts, flattenThreshold])

  if (!model) {
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </figure>
    )
  }

  const { usable, longest, flattensAt, floor } = model

  const toX = (index: number) => (longest <= 1 ? 0 : (index / (longest - 1)) * PLOT.width)
  const toY = (value: number) => PLOT.height - Math.max(0, Math.min(1, value)) * PLOT.height

  const colourFor = (cohort: Cohort, index: number) =>
    cohort.color ?? dataPalette[index % dataPalette.length].fill

  return (
    <figure
      data-slot="retention-curve"
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <figcaption id={titleId} className="sr-only">
        {label}
      </figcaption>

      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} preserveAspectRatio="none" className="size-full">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={PLOT.width}
              y1={toY(tick)}
              y2={toY(tick)}
              className="stroke-border"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {showFlatten && flattensAt !== null && (
            <line
              x1={toX(flattensAt)}
              x2={toX(flattensAt)}
              y1={0}
              y2={PLOT.height}
              className="stroke-foreground/40"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {usable.map((cohort, index) => (
            <path
              key={cohort.name}
              // Stops where the data stops. Padding to the axis would draw
              // churn that has not been observed yet.
              d={cohort.values
                .map((value, period) => `${period === 0 ? 'M' : 'L'}${toX(period)} ${toY(value)}`)
                .join(' ')}
              fill="none"
              stroke={colourFor(cohort, index)}
              strokeWidth={hovered === cohort.name ? 2 : 1.4}
              strokeOpacity={!hovered || hovered === cohort.name ? 1 : 0.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => setHovered(cohort.name)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* One string: React cannot join multiple children into a <title>. */}
              <title>
                {`${cohort.name}${
                  cohort.size ? ` (${cohort.size.toLocaleString()} users)` : ''
                }: ${cohort.values
                  .map((value, period) => `${periodLabel(period)} ${(value * 100).toFixed(0)}%`)
                  .join(', ')}`}
              </title>
            </path>
          ))}
        </svg>

        <div className="text-muted-foreground pointer-events-none absolute inset-y-0 -start-1 flex flex-col justify-between text-[10px] tabular-nums">
          <span>100%</span>
          <span>0%</span>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-[10px]">
        <span>{periodLabel(0)}</span>
        <span>{periodLabel(longest - 1)}</span>
      </div>

      {showFlatten && flattensAt !== null && floor !== null && (
        <p className="text-muted-foreground text-xs">
          Flattens at {periodLabel(flattensAt)}, around {(floor * 100).toFixed(0)}% — the shape of a
          product that has found a core.
        </p>
      )}
      {showFlatten && flattensAt === null && (
        <p className="text-muted-foreground text-xs">
          Still falling at the last observed period: no floor yet.
        </p>
      )}

      {legend && (
        <ul className="flex list-none flex-wrap gap-x-3 gap-y-1">
          {usable.map((cohort, index) => (
            <li key={cohort.name} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: colourFor(cohort, index) }}
              />
              {cohort.name}
              {cohort.size && <span className="tabular-nums opacity-70">{cohort.size.toLocaleString()}</span>}
            </li>
          ))}
        </ul>
      )}

      {footnote && <p className="text-muted-foreground text-xs">{footnote}</p>}
    </figure>
  )
}

export { RetentionCurve }
export type { RetentionCurveProps }
