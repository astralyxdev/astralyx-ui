import type { ComponentProps, ReactNode } from 'react'
import { ArrowDown, Settings2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The pay/receive form of a token swap.
 *
 * Price impact is surfaced, not buried behind a details toggle. A swap that
 * moves the pool 12% is a bad trade whether or not the user expanded a panel,
 * and above `impactWarn` the figure is coloured and above `impactBlock` the
 * action is disabled outright. Interfaces that hide this are why people lose
 * money to thin liquidity.
 *
 * The minimum received is shown as an amount rather than only a slippage
 * percentage — "0.5%" is abstract, "you get at least 1,240 USDC" is the number
 * the user is actually agreeing to.
 */
export type SwapSide = {
  symbol: ReactNode
  amount: string
  /** Fiat value of the amount. */
  fiat?: number
  balance?: ReactNode
  icon?: ReactNode
}

/**
 * Default formatters at module scope — an inline arrow default is a value
 * the React Compiler cannot reorder, and it bails on the whole component.
 */
const DEFAULT_BLOCKED_NOTE = (limit: number) =>
    `Price impact is above ${limit}%. This trade would lose a significant part of its value.`

function SwapPanel({
  from,
  to,
  rate,
  priceImpact,
  minimumReceived,
  networkFee,
  slippage = 0.5,
  impactWarn = 3,
  impactBlock = 15,
  onSwap,
  onFlip,
  onSettings,
  action = 'Swap',
  title = 'Swap',
  settingsLabel = 'Swap settings',
  flipLabel = 'Flip direction',
  rateLabel = 'Rate',
  priceImpactLabel = 'Price impact',
  minimumReceivedLabel = 'Minimum received',
  slippageLabel = 'Slippage tolerance',
  networkFeeLabel = 'Network fee',
  blockedLabel = 'Price impact too high',
  blockedNote = DEFAULT_BLOCKED_NOTE,
  disabled = false,
  currency = 'USD',
  locale = 'en-GB',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  from: SwapSide
  to: SwapSide
  rate?: ReactNode
  /** Percentage, e.g. 1.2. */
  priceImpact?: number
  minimumReceived?: ReactNode
  networkFee?: ReactNode
  slippage?: number
  impactWarn?: number
  impactBlock?: number
  onSwap?: () => void
  onFlip?: () => void
  onSettings?: () => void
  action?: ReactNode
  title?: ReactNode
  settingsLabel?: string
  flipLabel?: string
  rateLabel?: ReactNode
  priceImpactLabel?: ReactNode
  minimumReceivedLabel?: ReactNode
  slippageLabel?: ReactNode
  networkFeeLabel?: ReactNode
  /** Replaces the action label once impact exceeds `impactBlock`. */
  blockedLabel?: ReactNode
  /** Warning shown at that point, given the threshold. */
  blockedNote?: (limit: number) => ReactNode
  disabled?: boolean
  currency?: string
  locale?: string
}) {
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  })

  const severe = priceImpact !== undefined && priceImpact >= impactBlock
  const warn = priceImpact !== undefined && priceImpact >= impactWarn

  const Side = ({ side, label }: { side: SwapSide; label: string }) => (
    <div className={cn('bg-secondary/60 flex flex-col gap-2 p-3', radius.control)}>
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        {side.balance && <span>Balance {side.balance}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-2xl font-semibold tabular-nums">
          {side.amount}
        </span>
        <span className="bg-card border-border flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium [corner-shape:round]">
          {side.icon}
          {side.symbol}
        </span>
      </div>
      {side.fiat !== undefined && (
        <span className="text-muted-foreground/70 text-xs tabular-nums">
          {money.format(side.fiat)}
        </span>
      )}
    </div>
  )

  return (
    <div
      data-slot="swap-panel"
      className={cn(surface, radius.surface, 'flex w-full flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {onSettings && (
          <Button variant="ghost" size="icon-xs" aria-label={settingsLabel} onClick={onSettings}>
            <Settings2 />
          </Button>
        )}
      </div>

      <div className="relative flex flex-col gap-1">
        <Side side={from} label="You pay" />

        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={flipLabel}
            onClick={onFlip}
            className="border-card -my-3 z-10 border-4"
          >
            <ArrowDown />
          </Button>
        </div>

        <Side side={to} label="You receive" />
      </div>

      <dl className="flex flex-col gap-1.5 text-xs">
        {rate && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{rateLabel}</dt>
            <dd className="tabular-nums">{rate}</dd>
          </div>
        )}

        {priceImpact !== undefined && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{priceImpactLabel}</dt>
            <dd
              className={cn(
                'tabular-nums',
                severe
                  ? 'font-medium text-[var(--destructive-soft-foreground)]'
                  : warn
                    ? 'text-[var(--amber-soft-foreground)]'
                    : 'text-[var(--green-soft-foreground)]',
              )}
            >
              {priceImpact.toFixed(2)}%
            </dd>
          </div>
        )}

        {minimumReceived && (
          <div className="flex justify-between gap-2">
            {/* An amount, not just a percentage: this is what is being agreed. */}
            <dt className="text-muted-foreground">{minimumReceivedLabel}</dt>
            <dd className="tabular-nums">{minimumReceived}</dd>
          </div>
        )}

        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{slippageLabel}</dt>
          <dd className="tabular-nums">{slippage}%</dd>
        </div>

        {networkFee && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{networkFeeLabel}</dt>
            <dd className="tabular-nums">{networkFee}</dd>
          </div>
        )}
      </dl>

      {severe && (
        <p className="flex items-start gap-2 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {blockedNote(impactBlock)}
        </p>
      )}

      <Button className="w-full" disabled={disabled || severe} onClick={onSwap}>
        {severe ? blockedLabel : action}
      </Button>
    </div>
  )
}

export { SwapPanel }
