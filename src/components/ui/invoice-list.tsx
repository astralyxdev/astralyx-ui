import type { ComponentProps, ReactNode } from 'react'
import { Download, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Billing history.
 *
 * Amounts are right-aligned and tabular, which is the whole reason this is not
 * a generic list: a column of money that does not line up at the decimal point
 * cannot be scanned, and scanning is what a billing page is for.
 *
 * Currency is per-invoice rather than per-list. An account that changed plan
 * across a currency migration has both, and formatting the old ones with the
 * new symbol would be wrong in a way nobody notices until an audit.
 */
export type Invoice = {
  id: string
  number: string
  date: Date
  amount: number
  currency?: string
  status: 'paid' | 'open' | 'past_due' | 'refunded' | 'void'
  description?: ReactNode
  url?: string
}

const STATUS = {
  paid: { label: 'Paid', color: 'green' },
  open: { label: 'Open', color: 'blue' },
  past_due: { label: 'Past due', color: 'destructive' },
  refunded: { label: 'Refunded', color: 'neutral' },
  void: { label: 'Void', color: 'neutral' },
} as const

function InvoiceList({
  invoices,
  onDownload,
  locale = 'en-GB',
  emptyLabel = 'No invoices yet',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  invoices: Invoice[]
  onDownload?: (invoice: Invoice) => void
  locale?: string
  emptyLabel?: ReactNode
}) {
  return (
    <div
      data-slot="invoice-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {invoices.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border)]">
          {invoices.map((invoice) => {
            const status = STATUS[invoice.status]

            return (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
              >
                <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invoice.number}</p>
                  <p className="text-muted-foreground text-xs">
                    <Fmt type="date" value={invoice.date} format="D MMMM YYYY" locale={locale} />
                    {invoice.description && <> · {invoice.description}</>}
                  </p>
                </div>

                <Badge size="sm" color={status.color}>
                  {status.label}
                </Badge>

                {/* Tabular and a minimum width, so the column lines up for
                    ordinary amounts — but `min-w`, not `w`: the currency prefix
                    is locale-dependent (en-GB renders USD as "US$") and a large
                    invoice would clip against a fixed width. */}
                <span className="min-w-24 shrink-0 text-end text-sm font-medium tabular-nums whitespace-nowrap">
                  <Fmt
                    type="currency"
                    value={invoice.amount}
                    currency={invoice.currency ?? 'USD'}
                    locale={locale}
                  />
                </span>

                {(invoice.url || onDownload) && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Download ${invoice.number}`}
                    asChild={Boolean(invoice.url)}
                    onClick={onDownload ? () => onDownload(invoice) : undefined}
                  >
                    {invoice.url ? (
                      <a href={invoice.url} download>
                        <Download />
                      </a>
                    ) : (
                      <Download />
                    )}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { InvoiceList }
