import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Benchmark results, ranked, with variance.
 *
 * Variance is shown alongside every result and a difference inside the combined
 * error bars is reported as inconclusive rather than as a winner. A benchmark
 * table that prints "1.03× faster" from two noisy runs is how performance myths
 * start, and refusing to call that a win is the entire value of this component.
 *
 * Relative speed is expressed against the fastest, and the direction is stated
 * in words. "2.4×" is ambiguous without knowing whether higher is better —
 * ops/sec and nanoseconds point opposite ways and both are normal here.
 *
 * The bar is logarithmic when the spread exceeds two orders of magnitude.
 * Linear bars turn a 1000× spread into one full bar and nine invisible ones.
 */
export type BenchmarkResult = {
  name: ReactNode
  /** The measurement. */
  value: number
  /** Standard deviation or margin of error, same unit as `value`. */
  error?: number
  samples?: number
}

function BenchmarkTable({
  results,
  unit = 'ops/s',
  higherIsBetter = true,
  baselineLabel = 'fastest',
  inconclusiveLabel = 'within noise',
  samplesLabel = 'n',
  className,
  ...props
  // `results` is a legacy HTML attribute on every element, so it has to be
  // omitted or TypeScript intersects it with `number`.
}: Omit<ComponentProps<'div'>, 'children' | 'results'> & {
  results: BenchmarkResult[]
  unit?: string
  /** ops/sec: true. Nanoseconds per op: false. */
  higherIsBetter?: boolean
  baselineLabel?: ReactNode
  /** Marks a result whose error bars overlap the leader's. */
  inconclusiveLabel?: ReactNode
  samplesLabel?: ReactNode
}) {
  const rows = useMemo(() => {
    const sorted = [...results].sort((a, b) =>
      higherIsBetter ? b.value - a.value : a.value - b.value,
    )
    const best = sorted[0]
    if (!best) return []

    return sorted.map((result) => {
      const ratio = higherIsBetter ? best.value / result.value : result.value / best.value
      // Overlapping error bars mean there is no measured difference.
      const spread = (best.error ?? 0) + (result.error ?? 0)
      const inconclusive =
        result !== best && Math.abs(result.value - best.value) <= spread
      return { result, ratio, inconclusive, isBest: result === best }
    })
  }, [results, higherIsBetter])

  const values = results.map((r) => r.value).filter((v) => v > 0)
  const spread = values.length ? Math.max(...values) / Math.min(...values) : 1
  // Linear bars turn a 1000× spread into one bar and nine slivers.
  const log = spread > 100

  const extent = (value: number) => {
    if (values.length === 0) return 0
    const max = Math.max(...values)
    const min = Math.min(...values)
    if (!log) return higherIsBetter ? value / max : min / value
    const scale = (v: number) => Math.log10(Math.max(v, 1e-9))
    const lo = scale(min), hi = scale(max)
    const t = hi === lo ? 1 : (scale(value) - lo) / (hi - lo)
    return higherIsBetter ? t : 1 - t
  }

  const format = (value: number) =>
    value >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value.toPrecision(3)

  return (
    <div
      data-slot="benchmark-table"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <ul className="divide-border/60 list-none divide-y">
        {rows.map(({ result, ratio, inconclusive, isBest }, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3 p-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{result.name}</span>

            {isBest ? (
              <Badge size="sm" color="green">
                {baselineLabel}
              </Badge>
            ) : inconclusive ? (
              // Refusing to call this a win is the point of the component.
              <Badge size="sm" color="neutral">
                {inconclusiveLabel}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-xs tabular-nums">
                {ratio.toFixed(2)}× slower
              </span>
            )}

            <span className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-[var(--secondary)] sm:block">
              <span
                className="block h-full"
                style={{
                  width: `${Math.max(2, extent(result.value) * 100)}%`,
                  background: isBest ? 'var(--green)' : inconclusive ? 'var(--muted-foreground)' : 'var(--blue)',
                }}
              />
            </span>

            <span className="w-32 shrink-0 text-end text-xs tabular-nums">
              <span className="font-medium">{format(result.value)}</span>
              {result.error !== undefined && (
                <span className="text-muted-foreground"> ±{format(result.error)}</span>
              )}
              <span className="text-muted-foreground/60 ms-1">{unit}</span>
            </span>

            {result.samples !== undefined && (
              <span className="text-muted-foreground/60 w-12 shrink-0 text-end text-xs tabular-nums">
                {samplesLabel}={result.samples}
              </span>
            )}
          </li>
        ))}
      </ul>

      {log && (
        <p className="border-border text-muted-foreground border-t p-3 text-xs">
          Bars are logarithmic — the spread exceeds two orders of magnitude.
        </p>
      )}
    </div>
  )
}

export { BenchmarkTable }
