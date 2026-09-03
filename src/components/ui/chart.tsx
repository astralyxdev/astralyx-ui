import { useId, useMemo, type ComponentProps } from 'react'
import { dataFills } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A small plot — line, area, bar, stacked bar or scatter — in plain SVG.
 *
 * Deliberately not a charting library. Everything here is a scale and a path,
 * and the alternative is 200 kB of dependency for a component that renders six
 * numbers on a dashboard card. When a real chart is needed (brushing, zoom,
 * stacked transitions) reach for a library and use it directly; this covers the
 * shape you actually put beside a Stat.
 *
 * The plot area is a fixed 100×60 grid stretched by `preserveAspectRatio:none`,
 * so it fills its container without measuring. Anything that must keep its
 * proportions under that stretch — strokes, dots, text — either sets
 * `vector-effect: non-scaling-stroke` or is drawn outside the stretched group.
 */
export type ChartSeries = {
  name: string
  values: number[]
  /** Any CSS colour. Falls back to a palette entry by index. */
  color?: string
}

const PLOT = { width: 100, height: 60 } as const

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_VALUE_FORMAT: (value: number) => string = (value: number) => String(value)

function Chart({
  series,
  labels,
  variant = 'line',
  height = 180,
  grid = true,
  axis = true,
  legend,
  min: minProp,
  max: maxProp,
  valueFormat = DEFAULT_VALUE_FORMAT,
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'height'> & {
  series: ChartSeries[]
  /** X labels. Should match the longest series. */
  labels?: string[]
  variant?: 'line' | 'area' | 'bar' | 'stacked-bar' | 'scatter'
  height?: number
  grid?: boolean
  axis?: boolean
  legend?: boolean
  min?: number
  max?: number
  valueFormat?: (value: number) => string
}) {
  const titleId = useId()

  const { min, max, ticks } = useMemo(() => {
    const all = series.flatMap((entry) => entry.values)
    // A stacked chart is scaled by column totals; scaling by the largest single
    // value would push every stack off the top of the plot.
    const totals =
      variant === 'stacked-bar'
        ? Array.from({ length: Math.max(...series.map((s) => s.values.length), 0) }, (_, i) =>
            series.reduce((sum, entry) => sum + (entry.values[i] ?? 0), 0),
          )
        : []
    const low = minProp ?? Math.min(0, ...all)
    const high = maxProp ?? Math.max(...all, ...totals, 1)
    const span = high - low || 1
    return {
      min: low,
      max: high,
      ticks: [0, 0.5, 1].map((step) => low + span * step),
    }
  }, [series, minProp, maxProp, variant])

  const span = max - min || 1
  const length = Math.max(...series.map((entry) => entry.values.length), 1)

  const x = (index: number) =>
    length === 1 ? PLOT.width / 2 : (index / (length - 1)) * PLOT.width
  const y = (value: number) => PLOT.height - ((value - min) / span) * PLOT.height

  const showLegend = legend ?? series.length > 1

  return (
    <figure
      data-slot="chart"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    >
      <div className="flex min-w-0 gap-2">
        {axis && (
          <div
            className="text-muted-foreground/70 flex shrink-0 flex-col justify-between text-[10px] tabular-nums"
            style={{ height }}
            aria-hidden="true"
          >
            {[...ticks].reverse().map((tick, index) => (
              <span key={index}>{valueFormat(Math.round(tick))}</span>
            ))}
          </div>
        )}

        <svg
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={titleId}
          style={{ height }}
          className="min-w-0 flex-1 overflow-visible"
        >
          <title id={titleId}>
            {series.map((entry) => entry.name).join(', ')}
          </title>

          {grid &&
            ticks.map((tick, index) => (
              <line
                key={index}
                x1={0}
                x2={PLOT.width}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {series.map((entry, seriesIndex) => {
            const colour = entry.color ?? dataFills[seriesIndex % dataFills.length]
            const points = entry.values.map((value, index) => `${x(index)},${y(value)}`)

            if (variant === 'scatter') {
              return (
                <g key={entry.name}>
                  {entry.values.map((value, index) => (
                    <circle
                      key={index}
                      cx={x(index)}
                      cy={y(value)}
                      // Radius in viewBox units would stretch with the plot;
                      // non-scaling-stroke on a hairline ring keeps it round.
                      r={1.6}
                      fill={colour}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              )
            }

            if (variant === 'stacked-bar') {
              const groupWidth = PLOT.width / entry.values.length
              return (
                <g key={entry.name}>
                  {entry.values.map((value, index) => {
                    const below = series
                      .slice(0, seriesIndex)
                      .reduce((sum, other) => sum + (other.values[index] ?? 0), 0)
                    const top = y(below + value)
                    const bottom = y(below)
                    return (
                      <rect
                        key={index}
                        x={index * groupWidth + groupWidth * 0.15}
                        y={top}
                        width={groupWidth * 0.7}
                        height={Math.max(bottom - top, 0.5)}
                        fill={colour}
                      />
                    )
                  })}
                </g>
              )
            }

            if (variant === 'bar') {
              const groupWidth = PLOT.width / entry.values.length
              const barWidth = (groupWidth * 0.7) / series.length
              return (
                <g key={entry.name}>
                  {entry.values.map((value, index) => (
                    <rect
                      key={index}
                      x={index * groupWidth + groupWidth * 0.15 + seriesIndex * barWidth}
                      y={y(value)}
                      width={barWidth}
                      height={Math.max(PLOT.height - y(value), 0.5)}
                      fill={colour}
                    />
                  ))}
                </g>
              )
            }

            return (
              <g key={entry.name}>
                {variant === 'area' && (
                  <polygon
                    points={[
                      `0,${PLOT.height}`,
                      ...points,
                      `${PLOT.width},${PLOT.height}`,
                    ].join(' ')}
                    fill={colour}
                    opacity={0.14}
                  />
                )}
                <polyline
                  points={points.join(' ')}
                  fill="none"
                  stroke={colour}
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {labels && (
        <div
          className="text-muted-foreground/70 flex justify-between text-[10px]"
          style={{ marginInlineStart: axis ? '2.5rem' : undefined }}
          aria-hidden="true"
        >
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      )}

      {showLegend && (
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1">
          {series.map((entry, index) => (
            <span
              key={entry.name}
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full [corner-shape:round]"
                style={{ backgroundColor: entry.color ?? dataFills[index % dataFills.length] }}
              />
              {entry.name}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

export { Chart }
