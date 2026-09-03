import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Bids and asks with cumulative depth.
 *
 * The depth bar is the *cumulative* total from the top of book down, not the
 * size at that single level. Per-level bars are the common mistake and they
 * misrepresent the book completely: what matters when you are about to take
 * liquidity is how much sits between you and a price, which is a running sum.
 *
 * Asks are rendered ascending but displayed bottom-up so the spread sits in the
 * middle, which is the convention every trader reads without thinking.
 */
export type OrderLevel = {
  price: number
  size: number
}

function OrderBook({
  bids,
  asks,
  depth = 8,
  pricePrecision = 2,
  sizePrecision = 4,
  locale = 'en-GB',
  quoteSymbol,
  baseSymbol,
  totalHeader = 'Total',
  spreadLabel = 'Spread',
  className,
  ...props
}: ComponentProps<'div'> & {
  bids: OrderLevel[]
  asks: OrderLevel[]
  depth?: number
  pricePrecision?: number
  sizePrecision?: number
  locale?: string
  quoteSymbol?: string
  baseSymbol?: string
  totalHeader?: ReactNode
  spreadLabel?: ReactNode
}) {
  const { bidRows, askRows, max, spread, spreadPct } = useMemo(() => {
    const cumulate = (levels: OrderLevel[]) => {
      let total = 0
      return levels.slice(0, depth).map((level) => {
        total += level.size
        return { ...level, total }
      })
    }

    const b = cumulate([...bids].sort((x, y) => y.price - x.price))
    const a = cumulate([...asks].sort((x, y) => x.price - y.price))

    const best = { bid: b[0]?.price, ask: a[0]?.price }
    const gap = best.ask !== undefined && best.bid !== undefined ? best.ask - best.bid : undefined

    return {
      bidRows: b,
      askRows: a,
      // One scale for both sides, or the bars lie about the imbalance.
      max: Math.max(b.at(-1)?.total ?? 0, a.at(-1)?.total ?? 0, 1),
      spread: gap,
      spreadPct: gap !== undefined && best.ask ? (gap / best.ask) * 100 : undefined,
    }
  }, [bids, asks, depth])

  const num = (value: number, digits: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)

  const Row = ({
    level,
    side,
  }: {
    level: OrderLevel & { total: number }
    side: 'bid' | 'ask'
  }) => (
    <div className="relative flex items-center px-3 py-0.5 font-mono text-xs tabular-nums">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 end-0',
          side === 'bid'
            ? 'bg-[color-mix(in_oklab,var(--green),transparent_88%)]'
            : 'bg-[color-mix(in_oklab,var(--destructive),transparent_88%)]',
        )}
        style={{ width: `${(level.total / max) * 100}%` }}
      />
      <span
        className={cn(
          'relative z-10 flex-1',
          side === 'bid'
            ? 'text-[var(--green-soft-foreground)]'
            : 'text-[var(--destructive-soft-foreground)]',
        )}
      >
        {num(level.price, pricePrecision)}
      </span>
      <span className="text-muted-foreground relative z-10 w-24 text-end">
        {num(level.size, sizePrecision)}
      </span>
      <span className="text-muted-foreground/60 relative z-10 hidden w-24 text-end sm:block">
        {num(level.total, sizePrecision)}
      </span>
    </div>
  )

  return (
    <div
      data-slot="order-book"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border text-muted-foreground flex items-center border-b p-3 text-[10px] font-medium tracking-wide uppercase">
        <span className="flex-1">Price {quoteSymbol && `(${quoteSymbol})`}</span>
        <span className="w-24 text-end">Size {baseSymbol && `(${baseSymbol})`}</span>
        <span className="hidden w-24 text-end sm:block">{totalHeader}</span>
      </div>

      {/* Asks bottom-up, so the spread sits between the two sides. */}
      <div className="flex flex-col-reverse">
        {askRows.map((level, index) => (
          <Row key={`ask-${index}`} level={level} side="ask" />
        ))}
      </div>

      <div className="border-border bg-muted/40 flex items-baseline gap-2 border-y p-3">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          {spreadLabel}
        </span>
        <span className="font-mono text-xs tabular-nums">
          {spread !== undefined ? num(spread, pricePrecision) : '—'}
        </span>
        {spreadPct !== undefined && (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {spreadPct.toFixed(3)}%
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {bidRows.map((level, index) => (
          <Row key={`bid-${index}`} level={level} side="bid" />
        ))}
      </div>
    </div>
  )
}

export { OrderBook }
