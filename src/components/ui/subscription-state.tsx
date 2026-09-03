import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Where a subscription stands: plan, price, renewal, and what happens next.
 *
 * "What happens next" is the point. Every state here answers a different
 * question — when am I charged, when do I lose access, what do I owe — and a
 * status badge alone answers none of them. A cancelled subscription that still
 * has three weeks of access left is the case people most often get wrong.
 *
 * Past-due is given the strongest treatment and its own action, because it is
 * the only state where the customer can lose access to something they thought
 * they had paid for, and it is usually fixed in one click.
 *
 * A trial shows days remaining rather than the end date. "Ends 14 March" needs
 * a calendar; "4 days left" does not.
 */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'

const STATUS = {
  active: { label: 'Active', color: 'green' },
  trialing: { label: 'Trial', color: 'blue' },
  past_due: { label: 'Payment failed', color: 'destructive' },
  canceled: { label: 'Cancelling', color: 'amber' },
  paused: { label: 'Paused', color: 'neutral' },
} as const

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

function SubscriptionState({
  plan,
  status,
  price,
  currency = 'USD',
  locale = 'en-GB',
  period = 'month',
  renewsAt,
  endsAt,
  trialEndsAt,
  seats,
  actions,
  onFixPayment,
  seatsLabel = 'seats in use',
  renewsLabel = 'Renews',
  fixPaymentLabel = 'Update payment method',
  className,
  ...props
}: Omit<ComponentProps<'section'>, 'children'> & {
  plan: ReactNode
  status: SubscriptionStatus
  /** Minor units per period. */
  price?: number
  currency?: string
  locale?: string
  period?: 'month' | 'year'
  renewsAt?: Date
  /** When access actually stops — for a cancelled or paused subscription. */
  endsAt?: Date
  trialEndsAt?: Date
  seats?: { used: number; total: number }
  actions?: ReactNode
  onFixPayment?: () => void
  /** Follows the used-of-total seat count. */
  seatsLabel?: ReactNode
  /** Precedes the renewal date. */
  renewsLabel?: ReactNode
  fixPaymentLabel?: ReactNode
}) {
  const meta = STATUS[status]
  const trialDays = trialEndsAt ? daysUntil(trialEndsAt) : undefined

  return (
    <section
      data-slot="subscription-state"
      data-status={status}
      className={cn(
        surface,
        radius.surface,
        'flex flex-col gap-3 p-4',
        status === 'past_due' && 'border-[var(--destructive)]',
        className,
      )}
      {...props}
    >
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{plan}</h3>
          {price !== undefined && (
            <p className="text-muted-foreground text-xs tabular-nums">
              <Fmt
                type="currency"
                value={price / 100}
                currency={currency}
                locale={locale}
                decimals={price % 100 === 0 ? 0 : 2}
              />
              {' / '}
              {period}
            </p>
          )}
        </div>
        <Badge size="sm" color={meta.color}>
          {meta.label}
        </Badge>
      </header>

      {seats && (
        <p className="text-xs">
          <span className="font-medium tabular-nums">
            {seats.used} of {seats.total}
          </span>
          <span className="text-muted-foreground"> {seatsLabel}</span>
        </p>
      )}

      {/* What happens next, in words — the badge alone answers nothing. */}
      <p className="text-muted-foreground text-xs">
        {status === 'trialing' && trialDays !== undefined && (
          <>
            {trialDays > 0
              ? `${trialDays} day${trialDays === 1 ? '' : 's'} left in your trial`
              : 'Your trial ends today'}
            {renewsAt && (
              <>
                {' — billing starts '}
                <Fmt type="date" value={renewsAt} format="D MMM" locale={locale} />
              </>
            )}
          </>
        )}

        {status === 'active' && renewsAt && (
          <>
            {renewsLabel} <Fmt type="date" value={renewsAt} format="D MMMM YYYY" locale={locale} />
          </>
        )}

        {/* The case people get wrong: cancelled, but still paid up. */}
        {status === 'canceled' && endsAt && (
          <>
            Access continues until{' '}
            <Fmt type="date" value={endsAt} format="D MMMM YYYY" locale={locale} /> — no further
            charges.
          </>
        )}

        {status === 'paused' && (
          <>
            Billing paused
            {renewsAt && (
              <>
                {' until '}
                <Fmt type="date" value={renewsAt} format="D MMMM YYYY" locale={locale} />
              </>
            )}
            .
          </>
        )}

        {status === 'past_due' && (
          <span className="text-[var(--destructive-soft-foreground)]">
            We could not take the last payment
            {endsAt && (
              <>
                . Access ends{' '}
                <Fmt type="date" value={endsAt} format="D MMMM" locale={locale} />
              </>
            )}
            .
          </span>
        )}
      </p>

      {(actions || (status === 'past_due' && onFixPayment)) && (
        <div className="border-border flex flex-wrap gap-2 border-t pt-3">
          {status === 'past_due' && onFixPayment && (
            <Button size="sm" onClick={onFixPayment}>
              {fixPaymentLabel}
            </Button>
          )}
          {actions}
        </div>
      )}
    </section>
  )
}

export { SubscriptionState }
