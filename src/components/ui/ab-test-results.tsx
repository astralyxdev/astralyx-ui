import { useId, useMemo, type ComponentProps, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Experiment variants with lift, a confidence interval, and an honest verdict.
 *
 * **It shows the interval, not just the number.** "+12% lift" is not a result;
 * "+12%, 95% CI [−3%, +27%]" is, and it says the opposite — that the experiment
 * has not concluded. A dashboard that prints the point estimate alone
 * manufactures certainty, and people ship on it.
 *
 * **The maths.** A two-proportion z-test with a pooled standard error for the
 * p-value, and an unpooled standard error for the interval — the standard pair,
 * and the reason the interval can straddle zero while p sits just under 0.05.
 * The interval is then divided by the control rate so it is on the same scale
 * as the lift beside it; an absolute-difference interval printed next to a
 * relative lift is read as bounding that lift, and it does not.
 * The normal approximation needs roughly ten conversions in each arm, so below
 * that the verdict is withheld rather than computed on data too thin to carry
 * it.
 *
 * **It warns about peeking, because that is the real-world failure.** Checking
 * an experiment repeatedly and stopping at the first significant reading
 * inflates the false-positive rate far above the nominal 5% — a fixed-horizon
 * test read continuously is wrong roughly a third of the time. If a sample-size
 * target is given and has not been reached, this says so plainly.
 *
 * It reports a *statistical* result about one metric. Whether that metric is
 * the one that matters, whether the assignment was actually random, and whether
 * the effect is worth the change are not things any component can tell you.
 */
export type Variant = {
  id: string
  name: ReactNode
  /** Users in this arm. */
  visitors: number
  conversions: number
  /** Exactly one variant should be the baseline. */
  control?: boolean
}

type AbTestResultsProps = Omit<ComponentProps<'div'>, 'title'> & {
  variants: Variant[]
  title?: ReactNode
  /** Two-sided significance threshold. */
  alpha?: number
  /** Per-arm sample size the test was planned for. Enables the peeking warning. */
  targetSample?: number
  metricLabel?: string
  emptyLabel?: string
  label?: string
}

/** Normal CDF via Abramowitz & Stegun 7.1.26 — accurate to ~1e-7. */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x)
  return 0.5 * (1 + sign * y)
}

/** 95% ≈ 1.96. Inverse normal by bisection: exact enough, and tiny. */
function zFor(confidence: number): number {
  let lo = 0
  let hi = 6
  const target = 1 - (1 - confidence) / 2
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (normalCdf(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function AbTestResults({
  variants,
  title,
  alpha = 0.05,
  targetSample,
  metricLabel = 'Conversion',
  emptyLabel = 'No variants.',
  label = 'Experiment results',
  className,
  ...props
}: AbTestResultsProps) {
  const titleId = useId()

  const rows = useMemo(() => {
    const control = variants.find((variant) => variant.control) ?? variants[0]
    if (!control) return []

    const z = zFor(1 - alpha)
    const controlRate = control.visitors > 0 ? control.conversions / control.visitors : 0

    return variants.map((variant) => {
      const rate = variant.visitors > 0 ? variant.conversions / variant.visitors : 0
      if (variant.id === control.id) {
        return { variant, rate, isControl: true, lift: null, ci: null, p: null, thin: false }
      }

      // The normal approximation needs enough successes and failures in both
      // arms; under that, no verdict is honest.
      const thin =
        Math.min(
          variant.conversions,
          variant.visitors - variant.conversions,
          control.conversions,
          control.visitors - control.conversions,
        ) < 10

      const pooled =
        (variant.conversions + control.conversions) / (variant.visitors + control.visitors)
      const pooledSe = Math.sqrt(
        pooled * (1 - pooled) * (1 / variant.visitors + 1 / control.visitors),
      )
      const statistic = pooledSe > 0 ? (rate - controlRate) / pooledSe : 0
      const p = 2 * (1 - normalCdf(Math.abs(statistic)))

      // Unpooled for the interval — pooling assumes the null it is testing.
      const se = Math.sqrt(
        (rate * (1 - rate)) / variant.visitors + (controlRate * (1 - controlRate)) / control.visitors,
      )
      const diff = rate - controlRate

      /**
       * The interval is put on the same scale as the lift beside it.
       *
       * The z-test gives an interval for the *absolute* difference in rates —
       * 0.75 percentage points. Printing that next to a *relative* lift of
       * +12.5% invites the reader to take it as bounding the lift, which it
       * does not: the two numbers are in different units and disagree by a
       * factor of the control rate. Dividing by the control rate is the
       * first-order (delta method) interval for relative lift, which is what
       * every experiment dashboard means by "95% CI" on a lift column.
       */
      const ci: [number, number] =
        controlRate > 0
          ? [(diff - z * se) / controlRate, (diff + z * se) / controlRate]
          : [diff - z * se, diff + z * se]

      return {
        variant,
        rate,
        isControl: false,
        lift: controlRate > 0 ? diff / controlRate : null,
        ci,
        p,
        thin,
      }
    })
  }, [variants, alpha])

  if (rows.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  const underpowered =
    targetSample !== undefined && variants.some((variant) => variant.visitors < targetSample)

  const percent = (value: number) => `${(value * 100).toFixed(2)}%`
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`

  return (
    <div
      data-slot="ab-test-results"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      aria-labelledby={titleId}
      {...props}
    >
      {title && (
        <div className="border-border border-b px-4 py-3">
          <p id={titleId} className="text-sm font-medium">
            {title}
          </p>
        </div>
      )}
      {!title && (
        <p id={titleId} className="sr-only">
          {label}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-xs">
              <th className="px-4 py-2 text-start font-medium">Variant</th>
              <th className="px-4 py-2 text-end font-medium">Visitors</th>
              <th className="px-4 py-2 text-end font-medium">{metricLabel}</th>
              <th className="px-4 py-2 text-end font-medium">Lift</th>
              <th className="px-4 py-2 text-end font-medium">
                {Math.round((1 - alpha) * 100)}% CI on lift
              </th>
              <th className="px-4 py-2 text-end font-medium">p</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const significant = row.p !== null && !row.thin && row.p < alpha
              return (
                <tr key={row.variant.id} className="border-border/60 border-b last:border-b-0">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      {row.variant.name}
                      {row.isControl && (
                        <span className="text-muted-foreground text-[11px]">control</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-end tabular-nums">
                    {row.variant.visitors.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-end tabular-nums">
                    {percent(row.rate)}
                    <span className="text-muted-foreground ms-1 text-[11px]">
                      ({row.variant.conversions})
                    </span>
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2 text-end tabular-nums',
                      significant && (row.lift ?? 0) > 0 && 'text-[var(--green-soft-foreground)]',
                      significant && (row.lift ?? 0) < 0 && 'text-[var(--destructive)]',
                    )}
                  >
                    {row.lift === null ? '—' : signed(row.lift)}
                  </td>
                  <td className="text-muted-foreground px-4 py-2 text-end text-xs tabular-nums">
                    {row.ci ? `[${signed(row.ci[0])}, ${signed(row.ci[1])}]` : '—'}
                  </td>
                  <td className="px-4 py-2 text-end tabular-nums">
                    {row.p === null ? (
                      '—'
                    ) : row.thin ? (
                      <span className="text-muted-foreground text-xs">too few</span>
                    ) : (
                      <span className={cn(significant && 'font-medium')}>
                        {row.p < 0.001 ? '<0.001' : row.p.toFixed(3)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* The warning that matters more than the p-value. */}
      {underpowered && (
        <p
          role="status"
          className="border-border text-muted-foreground flex items-start gap-2 border-t px-4 py-2 text-xs"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Below the planned {targetSample?.toLocaleString()} per arm. Stopping at the first
            significant reading inflates the false-positive rate well past {Math.round(alpha * 100)}%
            — treat anything here as provisional.
          </span>
        </p>
      )}
    </div>
  )
}

export { AbTestResults }
export type { AbTestResultsProps }
