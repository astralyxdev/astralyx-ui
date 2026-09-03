import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import { dataFills, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Spend broken down by model, with token volume.
 *
 * Cost and volume are shown side by side because they routinely disagree: the
 * cheap model handling 90% of calls is often 10% of the bill, and a chart of
 * either number alone leads to the wrong optimisation.
 *
 * Precision follows magnitude rather than position: under a unit gets four
 * decimals, anything larger gets two. A per-call cost rounded to cents is all
 * zeroes, but an aggregate carried to four is both noise and the widest string
 * the column ever has to hold.
 *
 * That width matters because the currency prefix is locale-dependent — the
 * default `en-GB` renders USD as "US$", so the same number is three characters
 * wider than it is under `en-US`. The column is therefore a minimum width that
 * can grow, never a fixed one that clips.
 */
export type CostRow = {
  id: string
  label: ReactNode
  cost: number
  /** Input and output tokens, kept apart — they are priced differently. */
  inputTokens?: number
  outputTokens?: number
  calls?: number
  color?: string
}



/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_VOLUME_LABEL: (share: number) => ReactNode = (share) => `(${share}% of volume)`

function CostBreakdown({
  rows,
  currency = 'USD',
  period,
  budget,
  title = 'Spend',
  budgetLabel = 'Budget',
  callsLabel = 'calls',
  volumeLabel = DEFAULT_VOLUME_LABEL,
  inputTokensLabel = 'in',
  outputTokensLabel = 'out',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  rows: CostRow[]
  currency?: string
  period?: ReactNode
  /** Draws a budget line under the total. */
  budget?: number
  title?: ReactNode
  budgetLabel?: ReactNode
  /** Follows the call count. */
  callsLabel?: ReactNode
  /** That row's share of total calls, given the percentage. */
  volumeLabel?: (share: number) => ReactNode
  /** Follows the input-token count. */
  inputTokensLabel?: ReactNode
  outputTokensLabel?: ReactNode
}) {
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.cost, 0), [rows])
  const maxCost = Math.max(...rows.map((row) => row.cost), 0.0001)
  const totalCalls = rows.reduce((sum, row) => sum + (row.calls ?? 0), 0)

  return (
    <div
      data-slot="cost-breakdown"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-baseline gap-x-3 border-b p-3">
        <span className="text-sm font-medium">{title}</span>
        {period && <span className="text-muted-foreground text-xs">{period}</span>}
        <span className="ms-auto text-lg font-semibold tabular-nums whitespace-nowrap">
          <Fmt type="currency" value={total} currency={currency} decimals={2} />
        </span>
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {rows.map((row, index) => {
          const share = total > 0 ? row.cost / total : 0
          const colour = row.color ?? dataFills[index % dataFills.length]

          return (
            <li key={row.id} className="flex flex-col gap-1.5 p-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full [corner-shape:round]"
                    style={{ backgroundColor: colour }}
                  />
                  <span className="truncate text-sm font-medium">{row.label}</span>
                </span>

                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {Math.round(share * 100)}%
                </span>
                <span className="min-w-20 shrink-0 text-end text-sm tabular-nums whitespace-nowrap">
                  <Fmt
                    type="currency"
                    value={row.cost}
                    currency={currency}
                    decimals={row.cost < 1 ? 4 : 2}
                  />
                </span>
              </div>

              <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full [corner-shape:round]">
                <div
                  className="h-full rounded-full [corner-shape:round]"
                  style={{ width: `${(row.cost / maxCost) * 100}%`, backgroundColor: colour }}
                />
              </div>

              {(row.inputTokens !== undefined ||
                row.outputTokens !== undefined ||
                row.calls !== undefined) && (
                <p className="text-muted-foreground/80 flex flex-wrap gap-x-3 text-xs tabular-nums">
                  {row.calls !== undefined && (
                    <span>
                      <Fmt type="number" value={row.calls} /> {callsLabel}
                      {totalCalls > 0 && (
                        <span className="opacity-70">
                          {' '}
                          {volumeLabel(Math.round((row.calls / totalCalls) * 100))}
                        </span>
                      )}
                    </span>
                  )}
                  {row.inputTokens !== undefined && (
                    <span>
                      <Fmt type="number" value={row.inputTokens} /> {inputTokensLabel}
                    </span>
                  )}
                  {row.outputTokens !== undefined && (
                    <span>
                      <Fmt type="number" value={row.outputTokens} /> {outputTokensLabel}
                    </span>
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {budget !== undefined && (
        <div className="border-border flex items-baseline justify-between gap-2 border-t p-3">
          <span className="text-muted-foreground text-xs">{budgetLabel}</span>
          <span
            className={cn(
              'text-xs tabular-nums',
              total > budget ? 'font-medium text-[var(--destructive-soft-foreground)]' : 'text-muted-foreground',
            )}
          >
            <Fmt type="currency" value={total} currency={currency} decimals={2} /> of{' '}
            <Fmt type="currency" value={budget} currency={currency} decimals={2} />
            {total > budget && ' — over'}
          </span>
        </div>
      )}
    </div>
  )
}

export { CostBreakdown }
