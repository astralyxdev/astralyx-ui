import type { ComponentProps, ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * How a payout splits between parties.
 *
 * The rows are shares of a gross figure, so the table adds them up and shows the
 * remainder as a named row rather than leaving the reader to subtract. A split
 * that does not reach 100% is the normal case — the house keeps the rest — and a
 * split that exceeds it is a configuration error worth seeing immediately.
 *
 * Each party's amount is computed from the gross rather than passed in, because
 * a percentage beside an amount that contradicts it is worse than either alone.
 */
export type RevenueShareRow = {
  id: string
  party: ReactNode
  /** Share of gross, 0–1. */
  share: number
  note?: ReactNode
}

function RevenueShareTable({
  rows,
  gross,
  currency = 'USD',
  locale = 'en-GB',
  remainderLabel = 'Retained',
  partyHeader = 'Party',
  shareHeader = 'Share',
  amountHeader = 'Amount',
  grossLabel = 'Gross',
  overAllocatedLabel = 'Over-allocated',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  rows: RevenueShareRow[]
  gross: number
  currency?: string
  locale?: string
  remainderLabel?: ReactNode
  partyHeader?: ReactNode
  shareHeader?: ReactNode
  amountHeader?: ReactNode
  /** Label on the total row. */
  grossLabel?: ReactNode
  /** Replaces `remainderLabel` when the shares exceed 100%. */
  overAllocatedLabel?: ReactNode
}) {
  const allocated = rows.reduce((total, row) => total + row.share, 0)
  const remainder = 1 - allocated
  // Floating-point shares never sum exactly; a hair either side is not an error.
  const over = remainder < -0.0001

  return (
    <div data-slot="revenue-share-table" className={cn('flex flex-col gap-2', className)} {...props}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{partyHeader}</TableHead>
            <TableHead className="w-24 text-end">{shareHeader}</TableHead>
            <TableHead className="w-32 text-end">{amountHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <span className="font-medium">{row.party}</span>
                {row.note && (
                  <span className="text-muted-foreground block text-xs">{row.note}</span>
                )}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <Fmt type="percent" value={row.share} decimals={row.share * 100 % 1 ? 1 : 0} locale={locale} />
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <Fmt
                  type="currency"
                  value={gross * row.share}
                  currency={currency}
                  locale={locale}
                  decimals={2}
                />
              </TableCell>
            </TableRow>
          ))}

          {/* Named, not left as an exercise in subtraction. */}
          {Math.abs(remainder) > 0.0001 && (
            <TableRow className={over ? 'text-[var(--destructive-soft-foreground)]' : undefined}>
              <TableCell className="text-muted-foreground">
                {over ? overAllocatedLabel : remainderLabel}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <Fmt type="percent" value={Math.abs(remainder)} decimals={1} locale={locale} />
              </TableCell>
              <TableCell className="text-end tabular-nums">
                <Fmt
                  type="currency"
                  value={Math.abs(gross * remainder)}
                  currency={currency}
                  locale={locale}
                  decimals={2}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">{grossLabel}</TableCell>
            <TableCell className="text-muted-foreground text-end tabular-nums">
              100%
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              <Fmt type="currency" value={gross} currency={currency} locale={locale} decimals={2} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

export { RevenueShareTable }
