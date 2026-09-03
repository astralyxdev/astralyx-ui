import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Sparkline } from '@/components/ui/sparkline'
import { cn } from '@/lib/utils'

/**
 * A live price with its change over a window.
 *
 * The flash on update is a colour transition and nothing else — no scale, no
 * slide — which keeps it inside the kit's motion rule and, more practically,
 * stops a ticker updating every second from making the whole page twitch.
 *
 * The flash compares against the *previous rendered* price, held in a ref.
 * Deriving it from the change percentage instead would flash green on every
 * tick of a day that is up, which tells you nothing about the tick.
 *
 * Prices are given as numbers here rather than base units: a quote is a market
 * rate, not a balance, so it never needs `bigint` exactness — but it does need
 * enough fraction digits, hence `precision` defaulting by magnitude.
 */
export type PriceTickerProps = Omit<ComponentProps<'div'>, 'children'> & {
  symbol: ReactNode
  price: number
  /** Percentage change over the window, e.g. -2.4. */
  change?: number
  window?: string
  currency?: string
  locale?: string
  /** Fraction digits. Defaults by magnitude — a sub-cent token needs more. */
  precision?: number
  history?: number[]
  icon?: ReactNode
  size?: 'sm' | 'default' | 'lg'
}

function PriceTicker({
  symbol,
  price,
  change,
  window: windowLabel = '24h',
  currency = 'USD',
  locale = 'en-GB',
  precision,
  history,
  icon,
  size = 'default',
  className,
  ...props
}: PriceTickerProps) {
  const previous = useRef(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (price === previous.current) return
    setFlash(price > previous.current ? 'up' : 'down')
    previous.current = price
    const timer = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(timer)
  }, [price])

  // A $0.000042 token and a $67,000 one need different precision.
  const digits =
    precision ?? (price >= 1000 ? 2 : price >= 1 ? 2 : price >= 0.01 ? 4 : 8)

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(price)

  const up = change !== undefined && change > 0
  const down = change !== undefined && change < 0

  return (
    <div
      data-slot="price-ticker"
      className={cn('flex min-w-0 items-center gap-3', className)}
      {...props}
    >
      {icon}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'truncate font-medium',
              size === 'sm' && 'text-xs',
              size === 'lg' && 'text-base',
              size === 'default' && 'text-sm',
            )}
          >
            {symbol}
          </span>

          <span
            aria-live="polite"
            className={cn(
              'tabular-nums transition-colors duration-500 ease-out motion-reduce:transition-none',
              size === 'lg' ? 'text-xl font-semibold' : 'text-sm',
              // Colour only: a ticker that moves makes the page twitch.
              flash === 'up' && 'text-[var(--green-soft-foreground)]',
              flash === 'down' && 'text-[var(--destructive-soft-foreground)]',
            )}
          >
            {formatted}
          </span>
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 tabular-nums',
                up && 'text-[var(--green-soft-foreground)]',
                down && 'text-[var(--destructive-soft-foreground)]',
                !up && !down && 'text-muted-foreground',
              )}
            >
              {up && <ArrowUp className="size-3" aria-hidden="true" />}
              {down && <ArrowDown className="size-3" aria-hidden="true" />}
              {Math.abs(change).toFixed(2)}%
            </span>
            <span className="text-muted-foreground/70">{windowLabel}</span>
          </div>
        )}
      </div>

      {history && history.length > 1 && (
        <Sparkline
          values={history}
          color={
            up
              ? 'var(--green)'
              : down
                ? 'var(--destructive)'
                : 'var(--muted-foreground)'
          }
          className="h-8 w-20 shrink-0"
        />
      )}
    </div>
  )
}

export { PriceTicker }
