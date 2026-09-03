import type { ComponentProps, ReactNode } from 'react'
import { Check, Clock, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Stepper, type Step } from '@/components/ui/stepper'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A payout from initiation to arrival.
 *
 * "Paid" and "arrived" are different events and the gap between them is days,
 * not seconds. A payout marked complete the moment it leaves is the reason
 * support queues fill with "where is my money" — so the estimated arrival is
 * part of the component, not an optional extra.
 *
 * A returned payout is distinct from a failed one: the money left, bounced, and
 * came back. The remedy differs (fix the bank details, not the balance), and
 * collapsing the two sends people to the wrong place.
 */
export type PayoutState =
  | 'pending'
  | 'in_transit'
  | 'paid'
  | 'failed'
  | 'returned'
  | 'cancelled'

const STATE = {
  pending: { label: 'Pending', color: 'neutral', Icon: Clock },
  in_transit: { label: 'In transit', color: 'blue', Icon: Clock },
  paid: { label: 'Paid', color: 'green', Icon: Check },
  failed: { label: 'Failed', color: 'destructive', Icon: X },
  returned: { label: 'Returned', color: 'amber', Icon: RotateCcw },
  cancelled: { label: 'Cancelled', color: 'neutral', Icon: X },
} as const

function PayoutStatus({
  amount,
  currency = 'USD',
  locale = 'en-GB',
  state,
  destination,
  initiatedAt,
  expectedAt,
  arrivedAt,
  now,
  reference,
  failureReason,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  /** Minor units, matching LedgerTable, MoneyInput and Cart. */
  amount: number
  currency?: string
  locale?: string
  state: PayoutState
  destination?: ReactNode
  initiatedAt?: Date
  /** When the money should land. The number people actually want. */
  expectedAt?: Date
  arrivedAt?: Date
  now?: Date
  reference?: ReactNode
  failureReason?: ReactNode
}) {
  const meta = STATE[state]
  const broken = state === 'failed' || state === 'returned' || state === 'cancelled'

  const steps: Step[] = [
    { id: 'initiated', label: 'Initiated', status: 'complete' },
    {
      id: 'transit',
      label: 'In transit',
      status:
        state === 'pending'
          ? 'pending'
          : broken
            ? state === 'cancelled'
              ? 'skipped'
              : 'failed'
            : state === 'in_transit'
              ? 'active'
              : 'complete',
    },
    {
      id: 'arrived',
      label: 'Arrived',
      status: state === 'paid' ? 'complete' : broken ? 'skipped' : 'pending',
    },
  ]

  return (
    <div
      data-slot="payout-status"
      data-state={state}
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tabular-nums">
          <Fmt type="currency" value={amount / 100} currency={currency} locale={locale} decimals={2} />
        </span>
        <Badge size="sm" color={meta.color}>
          <meta.Icon />
          {meta.label}
        </Badge>
        {destination && (
          <span className="text-muted-foreground ms-auto text-xs">to {destination}</span>
        )}
      </div>

      <Stepper steps={steps} current={state === 'paid' ? 2 : 1} />

      {/* The number people actually want. */}
      {state !== 'paid' && !broken && expectedAt && (
        <p className="text-sm">
          Expected <Fmt type="relative" value={expectedAt} now={now} locale={locale} />
          <span className="text-muted-foreground">
            {' · '}
            <Fmt type="date" value={expectedAt} format="D MMMM" locale={locale} />
          </span>
        </p>
      )}

      {state === 'paid' && arrivedAt && (
        <p className="text-sm text-[var(--green-soft-foreground)]">
          Arrived <Fmt type="relative" value={arrivedAt} now={now} locale={locale} />
        </p>
      )}

      {broken && failureReason && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {failureReason}
        </p>
      )}

      <div className="text-muted-foreground/80 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {initiatedAt && (
          <span>
            Initiated <Fmt type="relative" value={initiatedAt} now={now} locale={locale} />
          </span>
        )}
        {reference && <span className="font-mono">{reference}</span>}
      </div>
    </div>
  )
}

export { PayoutStatus }
