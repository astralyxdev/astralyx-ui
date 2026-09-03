import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Sparkline } from '@/components/ui/sparkline'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An affiliate offer with its performance.
 *
 * EPC — earnings per click — is the headline rather than total revenue, because
 * it is the only figure comparable between offers. A campaign with £40,000 of
 * revenue and one with £4,000 cannot be ranked without knowing the traffic
 * behind each.
 *
 * Conversion rate is computed from clicks and conversions rather than accepted
 * as a prop, so it cannot disagree with the two numbers printed beside it.
 */
export type CampaignStatus = 'active' | 'paused' | 'ended' | 'pending'

const STATUS = {
  active: { label: 'Active', color: 'green' },
  paused: { label: 'Paused', color: 'amber' },
  ended: { label: 'Ended', color: 'neutral' },
  pending: { label: 'Pending review', color: 'blue' },
} as const

function CampaignCard({
  name,
  advertiser,
  status,
  clicks = 0,
  conversions = 0,
  revenue = 0,
  payout,
  currency = 'USD',
  locale = 'en-GB',
  history,
  tags,
  href,
  termsLabel = 'Terms',
  clicksLabel = 'Clicks',
  conversionsLabel = 'Conversions',
  revenueLabel = 'Revenue',
  epcLabel = 'EPC',
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'children'> & {
  name: ReactNode
  advertiser?: ReactNode
  status: CampaignStatus
  clicks?: number
  conversions?: number
  revenue?: number
  /** Commission terms, e.g. "30% rev share" or "$25 CPA". */
  payout?: ReactNode
  currency?: string
  locale?: string
  history?: number[]
  tags?: ReactNode
  href?: string
  /** Precedes the commission terms. */
  termsLabel?: ReactNode
  clicksLabel?: ReactNode
  conversionsLabel?: ReactNode
  revenueLabel?: ReactNode
  /** Earnings per click — the comparable figure. */
  epcLabel?: ReactNode
}) {
  const meta = STATUS[status]
  // Derived, so it cannot disagree with the numbers beside it.
  const conversionRate = clicks > 0 ? conversions / clicks : 0
  const epc = clicks > 0 ? revenue / clicks : 0

  return (
    <article
      data-slot="campaign-card"
      data-status={status}
      className={cn(
        surface,
        radius.surface,
        'flex flex-col gap-3 p-4',
        status !== 'active' && 'opacity-80',
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">
            {href ? (
              <a href={href} className="hover:underline underline-offset-4">
                {name}
              </a>
            ) : (
              name
            )}
          </h3>
          {advertiser && (
            <p className="text-muted-foreground truncate text-xs">{advertiser}</p>
          )}
        </div>
        <Badge size="sm" color={meta.color}>
          {meta.label}
        </Badge>
      </div>

      {payout && (
        <p className="text-sm">
          <span className="text-muted-foreground text-xs">{termsLabel} </span>
          <span className="font-medium">{payout}</span>
        </p>
      )}

      {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}

      {history && history.length > 1 && (
        <Sparkline values={history} variant="area" color="var(--blue)" className="h-8" />
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{clicksLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="number" value={clicks} locale={locale} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{conversionsLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="number" value={conversions} locale={locale} />
            <span className="text-muted-foreground ms-1 font-normal">
              {(conversionRate * 100).toFixed(1)}%
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{revenueLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="currency" value={revenue} currency={currency} locale={locale} decimals={0} />
          </dd>
        </div>
        {/* The comparable figure — revenue alone cannot rank two offers. */}
        <div>
          <dt className="text-muted-foreground">{epcLabel}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">
            <Fmt type="currency" value={epc} currency={currency} locale={locale} decimals={2} />
          </dd>
        </div>
      </dl>
    </article>
  )
}

export { CampaignCard }
