import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A model-versus-benchmark score matrix.
 *
 * Cells are tinted by score, and the best result in each row is marked. The
 * mark is per benchmark rather than overall, because "which model wins" is
 * rarely one answer — a model can lead on reasoning and trail on latency, and a
 * single winner badge hides exactly that.
 *
 * A missing score renders as an explicit dash. Blank cells read as zero, which
 * is a very different claim from "not run".
 */
export type EvalScore = {
  /** 0–1. Undefined means the benchmark was not run. */
  value?: number
  /** Change against the previous run, in points. */
  delta?: number
}

export type EvalBenchmark = {
  id: string
  label: ReactNode
  /** Lower is better — latency, cost, error rate. */
  lowerIsBetter?: boolean
  scores: Record<string, EvalScore>
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_FORMAT: (value: number) => string = (value: number) => `${Math.round(value * 100)}`

function EvalResults({
  models,
  benchmarks,
  format = DEFAULT_FORMAT,
  benchmarkHeader = 'Benchmark',
  lowerIsBetterLabel = 'lower is better',
  notRunLabel = 'Not run',
  bestLabel = 'best for this benchmark',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  models: string[]
  benchmarks: EvalBenchmark[]
  format?: (value: number) => string
  benchmarkHeader?: ReactNode
  /** Note on a benchmark where a lower score wins. */
  lowerIsBetterLabel?: ReactNode
  /** Accessible name for a benchmark a model was not run on. */
  notRunLabel?: string
  /** Screen-reader note on the winning cell. */
  bestLabel?: ReactNode
}) {
  const best = useMemo(() => {
    const map = new Map<string, string | undefined>()
    for (const benchmark of benchmarks) {
      let winner: string | undefined
      let bestValue = benchmark.lowerIsBetter ? Infinity : -Infinity

      for (const model of models) {
        const score = benchmark.scores[model]?.value
        if (score === undefined) continue
        const better = benchmark.lowerIsBetter ? score < bestValue : score > bestValue
        if (better) {
          bestValue = score
          winner = model
        }
      }
      map.set(benchmark.id, winner)
    }
    return map
  }, [models, benchmarks])

  return (
    <div
      data-slot="eval-results"
      className={cn(surface, radius.surface, 'w-full overflow-x-auto', className)}
      {...props}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="text-muted-foreground px-3 py-2 text-start text-xs font-medium">
              {benchmarkHeader}
            </th>
            {models.map((model) => (
              <th
                key={model}
                className="text-muted-foreground px-3 py-2 text-end text-xs font-medium whitespace-nowrap"
              >
                {model}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {benchmarks.map((benchmark) => (
            <tr key={benchmark.id} className="border-border/60 border-b last:border-b-0">
              <th className="px-3 py-2 text-start text-sm font-medium whitespace-nowrap">
                {benchmark.label}
                {benchmark.lowerIsBetter && (
                  <span className="text-muted-foreground/70 ms-1.5 text-xs font-normal">
                    {lowerIsBetterLabel}
                  </span>
                )}
              </th>

              {models.map((model) => {
                const score = benchmark.scores[model]
                const isBest = best.get(benchmark.id) === model

                if (score?.value === undefined) {
                  return (
                    <td
                      key={model}
                      className="text-muted-foreground/40 px-3 py-2 text-end tabular-nums"
                    >
                      {/* Not run — deliberately not blank, which reads as zero. */}
                      <Minus className="ms-auto size-3.5" aria-label={notRunLabel} />
                    </td>
                  )
                }

                const Trend =
                  score.delta === undefined || score.delta === 0
                    ? null
                    : score.delta > 0
                      ? TrendingUp
                      : TrendingDown
                const good =
                  score.delta === undefined || score.delta === 0
                    ? undefined
                    : benchmark.lowerIsBetter
                      ? score.delta < 0
                      : score.delta > 0

                return (
                  <td
                    key={model}
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--green), transparent ${
                        100 - Math.round(score.value * 22)
                      }%)`,
                    }}
                    className="px-3 py-2 text-end tabular-nums"
                  >
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <span className={cn(isBest && 'font-semibold')}>
                        {format(score.value)}
                      </span>
                      {isBest && (
                        <span className="sr-only">{bestLabel}</span>
                      )}
                      {Trend && (
                        <span
                          className={cn(
                            'inline-flex items-center text-xs',
                            good ? 'text-[var(--green-soft-foreground)]' : 'text-[var(--destructive-soft-foreground)]',
                          )}
                        >
                          <Trend className="size-3" aria-hidden="true" />
                          {Math.abs(score.delta!)}
                        </span>
                      )}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { EvalResults }
