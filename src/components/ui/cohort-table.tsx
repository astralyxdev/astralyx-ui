import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A retention cohort grid — signup period down, periods since across.
 *
 * Incomplete cohorts are marked rather than plotted. The newest cohort has not
 * lived long enough to have a week-4 number, and rendering an empty cell as 0%
 * makes retention look like it fell off a cliff. This is the single most common
 * way a cohort chart lies.
 *
 * Period 0 is always 100% by definition, so it is rendered as the cohort size
 * instead — that cell is the only place the absolute number appears, and
 * without it every percentage is unanchored.
 */
export type Cohort = {
  /** Period label — "Jan 2026", "Week 12". */
  label: ReactNode
  /** People in the cohort at period 0. */
  size: number
  /** Retained counts per period, index 0 being the cohort period. */
  values: (number | null)[]
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_PERIOD_LABEL: (index: number) => ReactNode = (index) => `${index}`

function CohortTable({
  cohorts,
  periods,
  periodLabel = DEFAULT_PERIOD_LABEL,
  locale = 'en-GB',
  cohortHeader = 'Cohort',
  sizeHeader = 'Size',
  averageLabel = 'Average',
  notReachedLabel = 'Not yet reached',
  footnote = 'A dot means the cohort has not reached that period yet — not zero retention. Averages count only cohorts that have.',
  className,
  ...props
}: ComponentProps<'div'> & {
  cohorts: Cohort[]
  /** How many period columns to render. */
  periods?: number
  periodLabel?: (index: number) => ReactNode
  locale?: string
  cohortHeader?: ReactNode
  sizeHeader?: ReactNode
  /** Label on the averages row. */
  averageLabel?: ReactNode
  /** Accessible name for a period a cohort has not reached. */
  notReachedLabel?: string
  /** Note under the table. Pass `null` to drop it. */
  footnote?: ReactNode
}) {
  const columns = periods ?? Math.max(...cohorts.map((c) => c.values.length), 1)
  const num = new Intl.NumberFormat(locale)

  const averages = useMemo(
    () =>
      Array.from({ length: columns }, (_, index) => {
        // Only complete cohorts contribute — otherwise the average drifts
        // downward as young cohorts are counted as zero.
        const present = cohorts
          .map((cohort) => {
            const value = cohort.values[index]
            return value === null || value === undefined ? null : value / cohort.size
          })
          .filter((v): v is number => v !== null)
        return present.length
          ? present.reduce((sum, v) => sum + v, 0) / present.length
          : null
      }),
    [cohorts, columns],
  )

  return (
    <div
      data-slot="cohort-table"
      className={cn(surface, radius.surface, 'w-full overflow-x-auto', className)}
      {...props}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="text-muted-foreground sticky start-0 bg-[var(--card)] px-3 py-2 text-start text-xs font-medium">
              {cohortHeader}
            </th>
            <th className="text-muted-foreground px-3 py-2 text-end text-xs font-medium">{sizeHeader}</th>
            {Array.from({ length: columns }, (_, index) => (
              <th
                key={index}
                className="text-muted-foreground px-3 py-2 text-center text-xs font-medium whitespace-nowrap"
              >
                {periodLabel(index)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {cohorts.map((cohort, rowIndex) => (
            <tr key={rowIndex} className="border-border/60 border-b">
              <th className="sticky start-0 bg-[var(--card)] px-3 py-2 text-start text-sm font-medium whitespace-nowrap">
                {cohort.label}
              </th>
              <td className="text-muted-foreground px-3 py-2 text-end tabular-nums">
                {num.format(cohort.size)}
              </td>

              {Array.from({ length: columns }, (_, index) => {
                const raw = cohort.values[index]
                // Not yet reached — never rendered as zero.
                if (raw === null || raw === undefined) {
                  return (
                    <td key={index} className="px-3 py-2 text-center">
                      <span className="text-muted-foreground/25" aria-label={notReachedLabel}>
                        ·
                      </span>
                    </td>
                  )
                }

                const share = cohort.size > 0 ? raw / cohort.size : 0
                return (
                  <td
                    key={index}
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--blue), transparent ${
                        100 - Math.round(share * 55)
                      }%)`,
                    }}
                    className="px-3 py-2 text-center tabular-nums"
                    title={`${num.format(raw)} of ${num.format(cohort.size)}`}
                  >
                    {Math.round(share * 100)}%
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="border-border border-t-2">
            <th className="sticky start-0 bg-[var(--card)] px-3 py-2 text-start text-xs font-medium">
              {averageLabel}
            </th>
            <td />
            {averages.map((average, index) => (
              <td key={index} className="px-3 py-2 text-center text-xs font-medium tabular-nums">
                {average === null ? '—' : `${Math.round(average * 100)}%`}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>

      <p className="border-border text-muted-foreground border-t p-3 text-xs">
        A dot means the cohort has not reached that period yet — not zero
        retention. Averages count only cohorts that have.
      </p>
    </div>
  )
}

export { CohortTable }
