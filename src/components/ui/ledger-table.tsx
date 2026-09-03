import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A double-entry ledger with a running balance.
 *
 * The component checks that debits equal credits and says so when they do not.
 * That is the entire point of double-entry — an unbalanced ledger is a bug, and
 * a table that renders one without comment is worse than useless because it
 * looks authoritative.
 *
 * Amounts are integer minor units (cents), not floats. `0.1 + 0.2` is a
 * genuinely wrong number in a ledger, and running balances accumulate that
 * error line by line until the total is visibly off.
 *
 * The running balance is computed here rather than taken per row, so it cannot
 * disagree with the entries above it.
 */
export type LedgerEntry = {
  id: string
  date: Date
  description: ReactNode
  account?: ReactNode
  reference?: ReactNode
  /** Minor units. Exactly one of debit or credit per entry. */
  debit?: number
  credit?: number
}

function LedgerTable({
  entries,
  currency = 'USD',
  locale = 'en-GB',
  openingBalance = 0,
  showBalance = true,
  columnLabels = {
    date: 'Date',
    description: 'Description',
    account: 'Account',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  totalsLabel = 'Totals',
  className,
  ...props
}: ComponentProps<'div'> & {
  entries: LedgerEntry[]
  currency?: string
  locale?: string
  /** Minor units. */
  openingBalance?: number
  showBalance?: boolean
  /** Column headings. */
  columnLabels?: {
    date?: ReactNode
    description?: ReactNode
    account?: ReactNode
    debit?: ReactNode
    credit?: ReactNode
    balance?: ReactNode
  }
  totalsLabel?: ReactNode
}) {
  const { rows, debits, credits, closing } = useMemo(
    () =>
      entries.reduce(
        (acc, entry) => {
          const debit = entry.debit ?? 0
          const credit = entry.credit ?? 0
          // Debits increase, credits decrease — an asset-account convention.
          const balance = acc.closing + debit - credit
          return {
            rows: [...acc.rows, { ...entry, balance }],
            debits: acc.debits + debit,
            credits: acc.credits + credit,
            closing: balance,
          }
        },
        {
          rows: [] as (LedgerEntry & { balance: number })[],
          debits: 0,
          credits: 0,
          closing: openingBalance,
        },
      ),
    [entries, openingBalance],
  )

  const balanced = debits === credits
  const money = (minor: number) => (
    <Fmt type="currency" value={minor / 100} currency={currency} locale={locale} decimals={2} />
  )

  return (
    <div
      data-slot="ledger-table"
      className={cn(surface, radius.surface, 'w-full overflow-x-auto', className)}
      {...props}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="text-muted-foreground px-3 py-2 text-start text-xs font-medium">{columnLabels.date}</th>
            <th className="text-muted-foreground px-3 py-2 text-start text-xs font-medium">{columnLabels.description}</th>
            <th className="text-muted-foreground hidden px-3 py-2 text-start text-xs font-medium sm:table-cell">{columnLabels.account}</th>
            <th className="text-muted-foreground px-3 py-2 text-end text-xs font-medium">{columnLabels.debit}</th>
            <th className="text-muted-foreground px-3 py-2 text-end text-xs font-medium">{columnLabels.credit}</th>
            {showBalance && (
              <th className="text-muted-foreground px-3 py-2 text-end text-xs font-medium">{columnLabels.balance}</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-border/60 border-b">
              <td className="text-muted-foreground px-3 py-2 whitespace-nowrap tabular-nums">
                <Fmt type="date" value={row.date} format="DD/MM/YY" locale={locale} />
              </td>
              <td className="px-3 py-2">
                <span className="block">{row.description}</span>
                {row.reference && (
                  <span className="text-muted-foreground/70 block font-mono text-xs">
                    {row.reference}
                  </span>
                )}
              </td>
              <td className="text-muted-foreground hidden px-3 py-2 sm:table-cell">
                {row.account ?? '—'}
              </td>
              <td className="px-3 py-2 text-end tabular-nums whitespace-nowrap">
                {row.debit ? money(row.debit) : <span className="text-muted-foreground/40">—</span>}
              </td>
              <td className="px-3 py-2 text-end tabular-nums whitespace-nowrap">
                {row.credit ? money(row.credit) : <span className="text-muted-foreground/40">—</span>}
              </td>
              {showBalance && (
                <td className="px-3 py-2 text-end font-medium tabular-nums whitespace-nowrap">
                  {money(row.balance)}
                </td>
              )}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="border-border border-t-2">
            <td colSpan={3} className="px-3 py-2 text-xs font-medium">
              {totalsLabel}
            </td>
            <td className="px-3 py-2 text-end font-medium tabular-nums whitespace-nowrap">
              {money(debits)}
            </td>
            <td className="px-3 py-2 text-end font-medium tabular-nums whitespace-nowrap">
              {money(credits)}
            </td>
            {showBalance && (
              <td className="px-3 py-2 text-end font-semibold tabular-nums whitespace-nowrap">
                {money(closing)}
              </td>
            )}
          </tr>
        </tfoot>
      </table>

      {/* An unbalanced ledger is a bug; rendering it silently is worse. */}
      {!balanced && (
        <p className="border-border flex items-start gap-1.5 border-t p-3 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Debits and credits do not balance — out by {money(Math.abs(debits - credits))}.
        </p>
      )}
    </div>
  )
}

export { LedgerTable }
