import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, RefreshCw, TriangleAlert } from 'lucide-react'
import { Fmt } from '@/components/ui/fmt'
import { WalletAddress } from '@/components/ui/wallet-address'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Wallet activity, grouped by day.
 *
 * Direction is relative to the connected wallet, not a property of the
 * transaction. The same transfer is a send for one account and a receive for
 * another, and a self-transfer is both — which is why `account` is required and
 * the direction is derived rather than passed in. Components that take a
 * `type: 'send' | 'receive'` prop get this wrong the moment two of your own
 * addresses transact.
 *
 * A failed transaction still appears. It consumed gas and it is on-chain;
 * hiding it makes the balance look unexplained.
 */
export type WalletTx = {
  hash: string
  /** Sender. Compared against `account` to derive direction. */
  from: string
  to: string
  /** Formatted amount with symbol. */
  amount?: ReactNode
  fiat?: number
  time: Date
  kind?: 'transfer' | 'swap' | 'approve' | 'contract'
  failed?: boolean
  href?: string
}

function TransactionList({
  transactions,
  account,
  locale = 'en-GB',
  currency = 'USD',
  now,
  emptyLabel = 'No activity yet',
  explorerLabel = 'View on block explorer',
  className,
  ...props
}: ComponentProps<'div'> & {
  transactions: WalletTx[]
  /** The connected wallet. Direction is derived against this. */
  account: string
  locale?: string
  currency?: string
  now?: Date
  emptyLabel?: ReactNode
  explorerLabel?: string
}) {
  const heading = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    [locale],
  )
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  })

  const groups = useMemo(() => {
    const out: [string, WalletTx[]][] = []
    for (const tx of transactions) {
      const key = heading.format(tx.time)
      const last = out.at(-1)
      if (last?.[0] === key) last[1].push(tx)
      else out.push([key, [tx]])
    }
    return out
  }, [transactions, heading])

  const lower = account.toLowerCase()

  return (
    <div
      data-slot="transaction-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {transactions.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        groups.map(([day, rows]) => (
          <section key={day}>
            <h3 className="bg-muted/40 text-muted-foreground border-border sticky top-0 border-b p-3 text-xs font-medium">
              {day}
            </h3>

            <ul className="list-none divide-y divide-[var(--border)]">
              {rows.map((tx) => {
                // Derived, never passed: a self-transfer is both directions.
                const sent = tx.from.toLowerCase() === lower
                const received = tx.to.toLowerCase() === lower
                const self = sent && received

                const Icon = tx.failed
                  ? TriangleAlert
                  : tx.kind === 'swap'
                    ? RefreshCw
                    : sent && !self
                      ? ArrowUpRight
                      : ArrowDownLeft

                const label = tx.failed
                  ? 'Failed'
                  : self
                    ? 'Self transfer'
                    : tx.kind === 'swap'
                      ? 'Swap'
                      : tx.kind === 'approve'
                        ? 'Approve'
                        : tx.kind === 'contract'
                          ? 'Contract'
                          : sent
                            ? 'Sent'
                            : 'Received'

                return (
                  <li key={tx.hash} className="flex items-center gap-3 p-3">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full [corner-shape:round]',
                        tx.failed
                          ? 'bg-[color-mix(in_oklab,var(--destructive),transparent_88%)] text-[var(--destructive-soft-foreground)]'
                          : self || tx.kind === 'swap' || tx.kind === 'approve'
                            ? 'bg-secondary text-muted-foreground'
                            : sent
                              ? 'bg-secondary text-muted-foreground'
                              : 'bg-[color-mix(in_oklab,var(--green),transparent_88%)] text-[var(--green-soft-foreground)]',
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {label}
                      </p>
                      <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                        <WalletAddress
                          address={sent && !self ? tx.to : tx.from}
                          size="sm"
                          copyable={false}
                        />
                        <Fmt type="relative" value={tx.time} now={now} locale={locale} />
                      </p>
                    </div>

                    {tx.amount && (
                      <span className="shrink-0 text-end">
                        <span
                          className={cn(
                            'block text-sm tabular-nums whitespace-nowrap',
                            tx.failed && 'text-muted-foreground line-through',
                            !tx.failed && received && !self && 'text-[var(--green-soft-foreground)]',
                          )}
                        >
                          {!tx.failed && !self && (received ? '+' : '−')}
                          {tx.amount}
                        </span>
                        {tx.fiat !== undefined && (
                          <span className="text-muted-foreground block text-xs tabular-nums">
                            {money.format(tx.fiat)}
                          </span>
                        )}
                      </span>
                    )}

                    {tx.href && (
                      <a
                        href={tx.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={explorerLabel}
                        className={cn(
                          'text-muted-foreground hover:text-foreground shrink-0',
                          radius.xs,
                          focusRing,
                        )}
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

export { TransactionList }
