import { useId, useMemo, useState, type ComponentProps } from 'react'
import { dataFills } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two measured variables plotted against each other.
 *
 * **Different from `Chart`'s `scatter` variant, which is why this exists.**
 * That one takes `number[]` and spaces the points evenly along x — the x axis
 * is an index, so it answers "how did this change in sequence". A scatter plot
 * answers "are these two things related", and for that x must be a *measured
 * value* with its own scale. Plotting spend against conversion on an index axis
 * silently destroys the relationship you were looking for.
 *
 * **The trend line and r are opt-in and honest.** `trend` fits an ordinary
 * least-squares line and reports Pearson's r beside it. r measures *linear*
 * association only: a perfect parabola scores near zero, and a single outlier
 * can carry r from 0.1 to 0.8. It is shown to two decimal places and never as
 * a claim about causation.
 *
 * **Points can carry a third and fourth dimension** — `size` for magnitude and
 * `group` for category. Area, not radius, is proportional to `size`, because
 * scaling the radius makes a doubled value look four times bigger, which is the
 * classic way a bubble chart lies.
 *
 * Axes get real ticks from the data range rather than a fixed 0–100 grid, and
 * both are drawn outside the stretched plot group so the labels are not
 * distorted by the aspect fit.
 */
export type ScatterPoint = {
  x: number
  y: number
  /** Bubble magnitude. Mapped to area. */
  size?: number
  /** Colours the point and builds the legend. */
  group?: string
  label?: string
}

type ScatterPlotProps = Omit<ComponentProps<'figure'>, 'height'> & {
  points: ScatterPoint[]
  height?: number
  xLabel?: string
  yLabel?: string
  /** Fit and draw a least-squares line, with Pearson's r. */
  trend?: boolean
  grid?: boolean
  /** Radius range in pixels, when points carry `size`. */
  radiusRange?: [number, number]
  /** Fixed axis bounds. Defaults to the data range, padded. */
  xDomain?: [number, number]
  yDomain?: [number, number]
  valueFormat?: (value: number) => string
  legend?: boolean
  emptyLabel?: string
  label?: string
}

const PLOT = { width: 100, height: 60 }

const DEFAULT_FORMAT: (value: number) => string = (value: number) =>
  Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value * 100) / 100)

/** Four ticks across a range, on roundish numbers. */
function ticksFor(min: number, max: number, count = 4) {
  const span = max - min || 1
  return Array.from({ length: count + 1 }, (_, i) => min + (span * i) / count)
}

function ScatterPlot({
  points,
  height = 240,
  xLabel,
  yLabel,
  trend = false,
  grid = true,
  radiusRange = [3, 14],
  xDomain,
  yDomain,
  valueFormat = DEFAULT_FORMAT,
  legend = true,
  emptyLabel = 'No data.',
  label = 'Scatter plot',
  className,
  ...props
}: ScatterPlotProps) {
  const titleId = useId()
  const [hovered, setHovered] = useState<number | null>(null)

  const model = useMemo(() => {
    if (points.length === 0) return null

    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    // Padded by 5% so points do not sit exactly on the axis line.
    const pad = (lo: number, hi: number) => {
      const span = hi - lo || Math.abs(hi) || 1
      return [lo - span * 0.05, hi + span * 0.05] as [number, number]
    }
    const [x0, x1] = xDomain ?? pad(Math.min(...xs), Math.max(...xs))
    const [y0, y1] = yDomain ?? pad(Math.min(...ys), Math.max(...ys))

    const sizes = points.map((point) => point.size ?? 0)
    const maxSize = Math.max(...sizes, 0)

    const groups = [...new Set(points.map((point) => point.group).filter(Boolean))] as string[]

    // Ordinary least squares, plus Pearson's r.
    let fit: { slope: number; intercept: number; r: number } | null = null
    if (trend && points.length > 1) {
      const n = points.length
      const meanX = xs.reduce((sum, value) => sum + value, 0) / n
      const meanY = ys.reduce((sum, value) => sum + value, 0) / n
      let sxy = 0
      let sxx = 0
      let syy = 0
      for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX
        const dy = ys[i] - meanY
        sxy += dx * dy
        sxx += dx * dx
        syy += dy * dy
      }
      if (sxx > 0 && syy > 0) {
        const slope = sxy / sxx
        fit = {
          slope,
          intercept: meanY - slope * meanX,
          r: sxy / Math.sqrt(sxx * syy),
        }
      }
    }

    return { x0, x1, y0, y1, maxSize, groups, fit }
  }, [points, trend, xDomain, yDomain])

  if (!model) {
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </figure>
    )
  }

  const { x0, x1, y0, y1, maxSize, groups, fit } = model

  const toX = (value: number) => ((value - x0) / (x1 - x0 || 1)) * PLOT.width
  const toY = (value: number) => PLOT.height - ((value - y0) / (y1 - y0 || 1)) * PLOT.height

  const colourFor = (group: string | undefined) =>
    group ? dataFills[groups.indexOf(group) % dataFills.length] : dataFills[0]

  /** Area proportional to value, so a doubled value looks doubled. */
  const radiusFor = (size: number | undefined) => {
    if (size === undefined || maxSize <= 0) return radiusRange[0]
    const [min, max] = radiusRange
    return Math.sqrt(size / maxSize) * (max - min) + min
  }

  return (
    <figure
      data-slot="scatter-plot"
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <figcaption id={titleId} className="sr-only">
        {label}
        {fit ? `, r = ${fit.r.toFixed(2)}` : ''}
      </figcaption>

      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} preserveAspectRatio="none" className="size-full">
          {grid &&
            ticksFor(y0, y1).map((tick, index) => (
              <line
                key={index}
                x1={0}
                x2={PLOT.width}
                y1={toY(tick)}
                y2={toY(tick)}
                className="stroke-border"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {fit && (
            // Clipped to the plot: an extrapolated fit line running off the
            // axes implies data that is not there.
            <line
              x1={0}
              y1={toY(fit.intercept + fit.slope * x0)}
              x2={PLOT.width}
              y2={toY(fit.intercept + fit.slope * x1)}
              className="stroke-foreground/50"
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

        </svg>

        {/*
          The points are positioned elements, not SVG circles.

          The plot group is stretched with `preserveAspectRatio: none` so it
          fills the container without measuring it — which turns every circle
          into an ellipse whose eccentricity depends on the container's aspect
          ratio. Grid and trend lines survive that (a stretched straight line is
          a straight line); a dot does not. Percentage offsets put these in the
          same coordinate space and keep them round at any size.
        */}
        {points.map((point, index) => {
          const size = radiusFor(point.size) * 2
          return (
            <span
              key={index}
              title={`${point.label ? `${point.label}: ` : ''}${valueFormat(point.x)}, ${valueFormat(point.y)}${
                point.size !== undefined ? ` (${valueFormat(point.size)})` : ''
              }`}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity"
              style={{
                insetInlineStart: `${(toX(point.x) / PLOT.width) * 100}%`,
                top: `${(toY(point.y) / PLOT.height) * 100}%`,
                width: size,
                height: size,
                background: colourFor(point.group),
                opacity: hovered === null || hovered === index ? 0.75 : 0.2,
              }}
            />
          )
        })}

        {/* Axis labels live outside the stretched SVG so they keep their shape. */}
        <div className="text-muted-foreground pointer-events-none absolute inset-y-0 -start-1 flex flex-col justify-between text-[10px] tabular-nums">
          <span>{valueFormat(y1)}</span>
          <span>{valueFormat(y0)}</span>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-[10px] tabular-nums">
        <span>{valueFormat(x0)}</span>
        {xLabel && <span className="font-medium">{xLabel}</span>}
        <span>{valueFormat(x1)}</span>
      </div>

      {(legend && groups.length > 0) || fit || yLabel ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {yLabel && <span className="text-muted-foreground text-[11px]">{yLabel}</span>}
          {legend &&
            groups.map((group) => (
              <span key={group} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: colourFor(group) }}
                />
                {group}
              </span>
            ))}
          {fit && (
            <span className="text-muted-foreground ms-auto font-mono text-[11px]">
              r = {fit.r.toFixed(2)}
            </span>
          )}
        </div>
      ) : null}
    </figure>
  )
}

export { ScatterPlot }
export type { ScatterPlotProps }
