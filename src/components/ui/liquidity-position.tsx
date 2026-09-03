import type { ComponentProps, ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A concentrated-liquidity position, with its range.
 *
 * In-range versus out-of-range is the headline, not a detail. A position
 * outside its range earns nothing at all — it has quietly become a single-sided
 * holding of whichever asset the price ran away from — and a card that shows
 * only "fees earned: $412" while the position stopped earning last Tuesday is
 * actively misleading.
 *
 * The range bar plots the current price against the bounds, so "just inside"
 * and "about to exit" look different. A pair of numbers cannot show that.
 */
function LiquidityPosition({
  pair,
  fees,
  value,
  minPrice,
  maxPrice,
  currentPrice,
  priceLabel,
  apr,
  onCollect,
  onManage,
  collectDisabled = false,
  locale = 'en-GB',
  outOfRangeNote = 'Price has left the range — this position is not earning fees.',
  valueLabel = 'Position value',
  feesLabel = 'Uncollected fees',
  collectLabel = 'Collect fees',
  manageLabel = 'Manage',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  pair: ReactNode
  /** Uncollected fees, formatted. */
  fees?: ReactNode
  value?: ReactNode
  minPrice: number
  maxPrice: number
  currentPrice: number
  /** e.g. "USDC per ETH" */
  priceLabel?: ReactNode
  apr?: number
  onCollect?: () => void
  onManage?: () => void
  collectDisabled?: boolean
  locale?: string
  /** Shown when the current price sits outside min/max. */
  outOfRangeNote?: ReactNode
  valueLabel?: ReactNode
  feesLabel?: ReactNode
  collectLabel?: ReactNode
  manageLabel?: ReactNode
}) {
  const inRange = currentPrice >= minPrice && currentPrice <= maxPrice

  // Plot with padding either side, so an out-of-range price is still visible.
  const span = maxPrice - minPrice || 1
  const low = minPrice - span * 0.25
  const high = maxPrice + span * 0.25
  const pct = (v: number) => ((v - low) / (high - low)) * 100

  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 })

  return (
    <div
      data-slot="liquidity-position"
      data-in-range={inRange || undefined}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{pair}</span>
        {/* The headline: out of range means earning nothing. */}
        <Badge size="sm" color={inRange ? 'green' : 'amber'}>
          {inRange ? 'In range' : 'Out of range'}
        </Badge>
        {apr !== undefined && (
          <span className="text-muted-foreground ms-auto text-xs tabular-nums">
            {apr.toFixed(1)}% APR
          </span>
        )}
      </div>

      {!inRange && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--amber-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {outOfRangeNote}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="relative h-8">
          <div className="bg-secondary absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full [corner-shape:round]" />
          <div
            className={cn(
              'absolute top-1/2 h-2 -translate-y-1/2 rounded-full [corner-shape:round]',
              inRange ? 'bg-[var(--green)]' : 'bg-[var(--amber)]',
            )}
            style={{ left: `${pct(minPrice)}%`, width: `${pct(maxPrice) - pct(minPrice)}%` }}
          />
          <span
            aria-hidden="true"
            className="bg-foreground absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
            style={{ left: `${Math.max(0, Math.min(pct(currentPrice), 100))}%` }}
          />
        </div>

        <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
          <span>{num.format(minPrice)}</span>
          <span className="text-foreground font-medium">
            {num.format(currentPrice)}
            {priceLabel && <span className="text-muted-foreground ms-1 font-normal">{priceLabel}</span>}
          </span>
          <span>{num.format(maxPrice)}</span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className={cn('bg-secondary/60 p-3', radius.control)}>
          <dt className="text-muted-foreground text-xs">{valueLabel}</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums">{value ?? '—'}</dd>
        </div>
        <div className={cn('bg-secondary/60 p-3', radius.control)}>
          <dt className="text-muted-foreground text-xs">{feesLabel}</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-[var(--green-soft-foreground)]">
            {fees ?? '—'}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {onCollect && (
          <Button className="flex-1" disabled={collectDisabled} onClick={onCollect}>
            {collectLabel}
          </Button>
        )}
        {onManage && (
          <Button variant="secondary" className="flex-1" onClick={onManage}>
            {manageLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export { LiquidityPosition }
