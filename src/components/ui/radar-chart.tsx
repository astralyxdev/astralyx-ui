import { useId, useMemo, type ComponentProps } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Several measures for one subject, on axes radiating from a centre.
 *
 * **What it is genuinely good at** is comparing two or three profiles across
 * the same handful of dimensions — this candidate against the role, this
 * service against its SLO, this model against that one — where the *shape* is
 * the thing you remember and any single axis is secondary.
 *
 * **What it is bad at, stated plainly, because it is usually the wrong chart.**
 * Area grows with the square of the value, so a profile scoring 20% higher on
 * every axis looks about 44% "bigger" and reads as a much larger gap than there
 * is. The order of the axes is arbitrary but changes the shape completely, so
 * two charts of the same data can look unrelated. And comparing lengths along
 * different radial directions is measurably harder than comparing bars on a
 * shared baseline. **If the reader needs to compare values, use a grouped bar
 * chart.** Use this when they need to recognise a shape.
 *
 * Every axis is normalised to a common `max` by default, because axes with
 * different scales on one radar produce a shape that means nothing at all —
 * per-axis maxima are available through `axes[].max` when the units genuinely
 * differ and you accept that trade.
 *
 * The viewBox is square with uniform scaling, so the polygon is never sheared
 * by its container's aspect ratio.
 */
export type RadarAxis = {
  key: string
  label: string
  /** Per-axis maximum. Defaults to the chart's `max`. */
  max?: number
}

export type RadarSeries = {
  name: string
  values: Record<string, number>
  color?: string
}

type RadarChartProps = Omit<ComponentProps<'figure'>, 'height'> & {
  axes: RadarAxis[]
  series: RadarSeries[]
  /** Shared maximum for every axis. */
  max?: number
  size?: number
  /** Rings drawn behind the shapes. */
  rings?: number
  legend?: boolean
  /** Fill opacity. Lower it when shapes overlap heavily. */
  fillOpacity?: number
  valueFormat?: (value: number) => string
  emptyLabel?: string
  label?: string
}

const DEFAULT_FORMAT: (value: number) => string = (value: number) => String(value)

function RadarChart({
  axes,
  series,
  max = 100,
  size = 260,
  rings = 4,
  legend = true,
  fillOpacity = 0.18,
  valueFormat = DEFAULT_FORMAT,
  emptyLabel = 'No data.',
  label = 'Radar chart',
  className,
  ...props
}: RadarChartProps) {
  const titleId = useId()

  // A square space with room around the edge for the axis captions.
  const box = 100
  const centre = box / 2
  const radius = box * 0.36

  const geometry = useMemo(() => {
    const count = axes.length
    if (count < 3) return null

    // Start at twelve o'clock, go clockwise — the direction people read a dial.
    const angleAt = (index: number) => (index / count) * Math.PI * 2 - Math.PI / 2

    const pointAt = (index: number, fraction: number) => {
      const angle = angleAt(index)
      const distance = radius * Math.max(0, Math.min(1, fraction))
      return [centre + Math.cos(angle) * distance, centre + Math.sin(angle) * distance] as const
    }

    return { count, angleAt, pointAt }
  }, [axes.length, radius, centre])

  if (!geometry || series.length === 0) {
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </figure>
    )
  }

  const { count, angleAt, pointAt } = geometry

  const colourFor = (index: number, explicit?: string) =>
    explicit ?? dataPalette[index % dataPalette.length].fill

  return (
    <figure
      data-slot="radar-chart"
      className={cn('flex flex-col items-center gap-2', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <figcaption id={titleId} className="sr-only">
        {label}
      </figcaption>

      {/* No `preserveAspectRatio: none` here — a sheared radar is meaningless. */}
      <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} className="max-w-full">
        <g>
          {Array.from({ length: rings }, (_, ring) => {
            const fraction = (ring + 1) / rings
            const path = Array.from({ length: count }, (_, index) => {
              const [x, y] = pointAt(index, fraction)
              return `${index === 0 ? 'M' : 'L'}${x} ${y}`
            }).join(' ')
            return (
              <path
                key={ring}
                d={`${path} Z`}
                fill="none"
                className="stroke-border"
                strokeWidth={0.4}
              />
            )
          })}

          {axes.map((axis, index) => {
            const [x, y] = pointAt(index, 1)
            return (
              <line
                key={axis.key}
                x1={centre}
                y1={centre}
                x2={x}
                y2={y}
                className="stroke-border"
                strokeWidth={0.4}
              />
            )
          })}
        </g>

        {series.map((entry, seriesIndex) => {
          const colour = colourFor(seriesIndex, entry.color)
          const path = axes
            .map((axis, index) => {
              const ceiling = axis.max ?? max
              const [x, y] = pointAt(index, (entry.values[axis.key] ?? 0) / (ceiling || 1))
              return `${index === 0 ? 'M' : 'L'}${x} ${y}`
            })
            .join(' ')

          return (
            <path
              key={entry.name}
              d={`${path} Z`}
              fill={colour}
              fillOpacity={fillOpacity}
              stroke={colour}
              strokeWidth={1}
              strokeLinejoin="round"
            >
              {/* One string: React cannot join multiple children into a <title>. */}
              <title>
                {`${entry.name}: ${axes
                  .map((axis) => `${axis.label} ${valueFormat(entry.values[axis.key] ?? 0)}`)
                  .join(', ')}`}
              </title>
            </path>
          )
        })}

        {axes.map((axis, index) => {
          const [x, y] = pointAt(index, 1.18)
          const angle = angleAt(index)
          // Anchor by which side of the circle the label sits on, or captions
          // on the left overlap the shape.
          const anchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'
          return (
            <text
              key={axis.key}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-muted-foreground text-[4px]"
            >
              {axis.label}
            </text>
          )
        })}
      </svg>

      {legend && (
        <ul className="flex list-none flex-wrap justify-center gap-x-3 gap-y-1">
          {series.map((entry, index) => (
            <li key={entry.name} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: colourFor(index, entry.color) }}
              />
              {entry.name}
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

export { RadarChart }
export type { RadarChartProps }
