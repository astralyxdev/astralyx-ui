import { useId, useMemo, type ComponentProps } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The shape of a distribution: quartiles, whiskers and outliers.
 *
 * **The chart that averages hide behind.** A mean latency of 180 ms is
 * compatible with "everything is 180 ms" and with "most requests are 40 ms and
 * a tenth take two seconds", and those are different products. A box plot shows
 * the spread, the skew and the tail in the space a single bar would take, which
 * is why it is the right chart for latency, response times, prices and scores.
 *
 * **Whiskers are Tukey's 1.5 × IQR, not the min and max.** Drawing whiskers to
 * the extremes means one bad sample stretches the whole chart and the box
 * collapses to a line — and, worse, it makes outliers invisible by folding them
 * into the range. Here the whisker stops at the furthest point still within 1.5
 * IQR of the quartiles, and anything past it is drawn individually as the
 * exception it is.
 *
 * **Quartiles use linear interpolation** (the R type-7 / `numpy` default), so
 * they agree with what your analytics stack reports rather than being a
 * nearest-rank approximation that disagrees by a few milliseconds and starts an
 * argument.
 *
 * Pass raw samples in `values` and the statistics are computed; pass a
 * precomputed `summary` when the data lives in a warehouse and only the five
 * numbers came back.
 */
export type BoxSummary = {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
}

export type BoxSeries = {
  name: string
  /** Raw samples. Ignored when `summary` is given. */
  values?: number[]
  summary?: BoxSummary
  color?: string
}

type BoxPlotProps = Omit<ComponentProps<'figure'>, 'height'> & {
  series: BoxSeries[]
  height?: number
  /** Fixed axis bounds. Defaults to the data, padded. */
  domain?: [number, number]
  /** Horizontal rows instead of vertical columns. Better for long names. */
  horizontal?: boolean
  valueFormat?: (value: number) => string
  /** Whisker reach, in IQRs. 1.5 is Tukey's convention. */
  whisker?: number
  showOutliers?: boolean
  emptyLabel?: string
  label?: string
}

const DEFAULT_FORMAT: (value: number) => string = (value: number) =>
  Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value * 100) / 100)

/** Linear-interpolation quantile — the R type-7 definition. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const position = (sorted.length - 1) * p
  const low = Math.floor(position)
  const high = Math.ceil(position)
  if (low === high) return sorted[low]
  return sorted[low] + (position - low) * (sorted[high] - sorted[low])
}

function summarise(values: number[], whisker: number): BoxSummary {
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const median = quantile(sorted, 0.5)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1

  const lowFence = q1 - whisker * iqr
  const highFence = q3 + whisker * iqr
  // The whisker stops at real data, not at the fence itself.
  const inside = sorted.filter((value) => value >= lowFence && value <= highFence)

  return {
    q1,
    median,
    q3,
    min: inside.length ? inside[0] : sorted[0],
    max: inside.length ? inside[inside.length - 1] : sorted[sorted.length - 1],
    outliers: sorted.filter((value) => value < lowFence || value > highFence),
  }
}

function BoxPlot({
  series,
  height = 260,
  domain,
  horizontal = false,
  valueFormat = DEFAULT_FORMAT,
  whisker = 1.5,
  showOutliers = true,
  emptyLabel = 'No data.',
  label = 'Box plot',
  className,
  ...props
}: BoxPlotProps) {
  const titleId = useId()

  const model = useMemo(() => {
    const boxes = series
      .map((entry) => ({
        entry,
        stats: entry.summary ?? (entry.values?.length ? summarise(entry.values, whisker) : null),
      }))
      .filter((box): box is { entry: BoxSeries; stats: BoxSummary } => box.stats !== null)

    if (boxes.length === 0) return null

    const all = boxes.flatMap((box) => [
      box.stats.min,
      box.stats.max,
      ...(showOutliers ? (box.stats.outliers ?? []) : []),
    ])
    const lo = Math.min(...all)
    const hi = Math.max(...all)
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.08

    return { boxes, lo: domain?.[0] ?? lo - pad, hi: domain?.[1] ?? hi + pad }
  }, [series, whisker, domain, showOutliers])

  if (!model) {
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </figure>
    )
  }

  const { boxes, lo, hi } = model
  /** Value to a percentage along the measured axis. */
  const at = (value: number) => ((value - lo) / (hi - lo || 1)) * 100

  return (
    <figure
      data-slot="box-plot"
      className={cn('flex flex-col gap-3', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <figcaption id={titleId} className="sr-only">
        {label}
      </figcaption>

      {/*
        Built from positioned elements rather than SVG.

        Every part of a box plot is an axis-aligned rectangle or line, so there
        is nothing a vector needs; and the parts that must not distort — the
        median line's thickness, the cap widths, the outlier dots — stay exact
        in CSS pixels at any container size.
      */}
      <div
        className={cn('flex', horizontal ? 'flex-col gap-3' : 'items-end gap-4')}
        style={{ height: horizontal ? undefined : height }}
      >
        {boxes.map(({ entry, stats }, index) => {
          const colour = entry.color ?? dataPalette[index % dataPalette.length].fill
          const start = at(stats.q1)
          const span = at(stats.q3) - at(stats.q1)
          const median = at(stats.median)
          const whiskerLow = at(stats.min)
          const whiskerHigh = at(stats.max)

          const summaryText = `${entry.name}: median ${valueFormat(stats.median)}, IQR ${valueFormat(
            stats.q1,
          )}–${valueFormat(stats.q3)}, range ${valueFormat(stats.min)}–${valueFormat(stats.max)}${
            stats.outliers?.length ? `, ${stats.outliers.length} outliers` : ''
          }`

          return (
            <div
              key={entry.name}
              className={cn('flex min-w-0', horizontal ? 'flex-row items-center gap-3' : 'h-full flex-1 flex-col gap-2')}
              title={summaryText}
            >
              <div
                className={cn('relative', horizontal ? 'h-8 flex-1' : 'w-full flex-1')}
                role="img"
                aria-label={summaryText}
              >
                {/* Whisker line, cap to cap. */}
                <span
                  aria-hidden="true"
                  className={cn('bg-border absolute', horizontal ? 'top-1/2 h-px' : 'start-1/2 w-px')}
                  style={
                    horizontal
                      ? { insetInlineStart: `${whiskerLow}%`, width: `${whiskerHigh - whiskerLow}%` }
                      : { bottom: `${whiskerLow}%`, height: `${whiskerHigh - whiskerLow}%` }
                  }
                />

                {/* Caps. */}
                {[whiskerLow, whiskerHigh].map((position) => (
                  <span
                    key={position}
                    aria-hidden="true"
                    className={cn(
                      'bg-border absolute',
                      horizontal ? 'top-1/2 h-3 w-px -translate-y-1/2' : 'start-1/2 h-px w-3 -translate-x-1/2 rtl:translate-x-1/2',
                    )}
                    style={horizontal ? { insetInlineStart: `${position}%` } : { bottom: `${position}%` }}
                  />
                ))}

                {/* The box: q1 to q3. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute rounded-[3px] border',
                    horizontal ? 'top-1/2 h-6 -translate-y-1/2' : 'inset-x-[15%]',
                  )}
                  style={{
                    background: colour,
                    borderColor: colour,
                    opacity: 0.35,
                    ...(horizontal
                      ? { insetInlineStart: `${start}%`, width: `${span}%` }
                      : { bottom: `${start}%`, height: `${span}%` }),
                  }}
                />

                {/* Median — the one line people actually read. */}
                <span
                  aria-hidden="true"
                  className={cn('absolute', horizontal ? 'top-1/2 h-6 w-0.5 -translate-y-1/2' : 'inset-x-[15%] h-0.5')}
                  style={{
                    background: colour,
                    ...(horizontal ? { insetInlineStart: `${median}%` } : { bottom: `${median}%` }),
                  }}
                />

                {showOutliers &&
                  stats.outliers?.map((value, outlierIndex) => (
                    <span
                      key={outlierIndex}
                      aria-hidden="true"
                      title={valueFormat(value)}
                      className={cn(
                        'absolute size-1.5 rounded-full',
                        horizontal ? 'top-1/2 -translate-y-1/2' : 'start-1/2 -translate-x-1/2 rtl:translate-x-1/2',
                      )}
                      style={{
                        background: colour,
                        ...(horizontal
                          ? { insetInlineStart: `${at(value)}%` }
                          : { bottom: `${at(value)}%` }),
                      }}
                    />
                  ))}
              </div>

              <span
                className={cn(
                  'text-muted-foreground truncate text-[11px]',
                  horizontal ? 'order-first w-24 shrink-0 text-end' : 'text-center',
                )}
              >
                {entry.name}
              </span>
            </div>
          )
        })}
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-[10px] tabular-nums">
        <span>{valueFormat(lo)}</span>
        <span>{valueFormat(hi)}</span>
      </div>
    </figure>
  )
}

export { BoxPlot }
export type { BoxPlotProps }
