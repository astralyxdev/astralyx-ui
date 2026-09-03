import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Search, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Sparkline } from '@/components/ui/sparkline'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A market list: price, change, volume, market cap.
 *
 * Rank is the caller's, not the row index. A filtered or re-sorted table whose
 * "#" column renumbers from one destroys the only stable identifier people use
 * to talk about a market — "the number four coin" has to keep meaning the same
 * asset when you sort by 24h change.
 *
 * Watchlist state is reported, never held: a starred asset belongs to an
 * account, not to a table that forgets on unmount.
 */
export type Market = {
  id: string
  rank?: number
  symbol: string
  name: ReactNode
  icon?: ReactNode
  price: number
  /** Percentage. */
  change24h?: number
  volume24h?: number
  marketCap?: number
  history?: number[]
  starred?: boolean
}

type SortKey = 'rank' | 'price' | 'change24h' | 'volume24h' | 'marketCap'

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_STAR_LABEL: (symbol: string, starred: boolean) => string = (symbol, starred) => `${starred ? 'Unstar' : 'Star'} ${symbol}`

function MarketTable({
  markets,
  currency = 'USD',
  locale = 'en-GB',
  searchable = true,
  onStar,
  onSelect,
  searchPlaceholder = 'Search markets',
  searchLabel = 'Search markets',
  rankHeader = '#',
  marketHeader = 'Market',
  priceHeader = 'Price',
  changeHeader = '24h',
  volumeHeader = 'Volume',
  capHeader = 'Cap',
  starLabel = DEFAULT_STAR_LABEL,
  emptyMessage = 'No markets match.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  markets: Market[]
  currency?: string
  locale?: string
  searchable?: boolean
  onStar?: (id: string, starred: boolean) => void
  onSelect?: (id: string) => void
  searchPlaceholder?: string
  /** Accessible name for the search field. */
  searchLabel?: string
  rankHeader?: ReactNode
  marketHeader?: ReactNode
  priceHeader?: string
  changeHeader?: string
  volumeHeader?: string
  capHeader?: string
  /** Accessible name for the star toggle. */
  starLabel?: (symbol: string, starred: boolean) => string
  emptyMessage?: ReactNode
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: 'rank',
    desc: false,
  })

  const money = useMemo(
    () => (value: number, digits = 2) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        notation: value >= 1_000_000 ? 'compact' : 'standard',
      }).format(value),
    [locale, currency],
  )

  const rows = useMemo(() => {
    const term = query.toLowerCase()
    const filtered = markets.filter(
      (m) =>
        !term ||
        m.symbol.toLowerCase().includes(term) ||
        String(m.name).toLowerCase().includes(term),
    )
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? 0
      const bv = b[sort.key] ?? 0
      return sort.desc ? Number(bv) - Number(av) : Number(av) - Number(bv)
    })
  }, [markets, query, sort])

  const Header = ({ label, sortKey, className: cls }: { label: string; sortKey: SortKey; className?: string }) => (
    <th className={cn('px-3 py-2 text-end', cls)}>
      <button
        type="button"
        onClick={() =>
          setSort((s) => ({ key: sortKey, desc: s.key === sortKey ? !s.desc : true }))
        }
        className={cn(
          'text-muted-foreground hover:text-foreground -mx-1 inline-flex items-center gap-1 px-1 text-xs font-medium',
          radius.xs,
          focusRing,
          sort.key === sortKey && 'text-foreground',
        )}
      >
        {label}
        {sort.key === sortKey &&
          (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </th>
  )

  return (
    <div
      data-slot="market-table"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {searchable && (
        <div className="border-border border-b p-2">
          <Input
            size="sm"
            variant="secondary"
            icon={<Search />}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            value={query}
            clearable
            onChange={(event) => setQuery(event.target.value)}
            containerClassName="sm:w-56"
          />
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              {onStar && <th className="w-8" />}
              <th className="text-muted-foreground px-3 py-2 text-start text-xs font-medium">
                {rankHeader}
              </th>
              <th className="text-muted-foreground px-3 py-2 text-start text-xs font-medium">
                {marketHeader}
              </th>
              <Header label={priceHeader} sortKey="price" />
              <Header label={changeHeader} sortKey="change24h" />
              <Header label={volumeHeader} sortKey="volume24h" className="hidden sm:table-cell" />
              <Header label={capHeader} sortKey="marketCap" className="hidden md:table-cell" />
              <th className="hidden w-24 px-3 lg:table-cell" />
            </tr>
          </thead>

          <tbody>
            {rows.map((market) => {
              const up = (market.change24h ?? 0) > 0
              const down = (market.change24h ?? 0) < 0

              return (
                <tr
                  key={market.id}
                  onClick={onSelect ? () => onSelect(market.id) : undefined}
                  className={cn(
                    'border-border/60 border-b last:border-b-0',
                    onSelect && 'hover:bg-accent/40 cursor-pointer',
                  )}
                >
                  {onStar && (
                    <td className="ps-2">
                      <button
                        type="button"
                        aria-label={starLabel(market.symbol, Boolean(market.starred))}
                        aria-pressed={market.starred}
                        onClick={(event) => {
                          event.stopPropagation()
                          onStar(market.id, !market.starred)
                        }}
                        className={cn(
                          'flex size-6 items-center justify-center',
                          radius.xs,
                          focusRing,
                          market.starred
                            ? 'text-[var(--amber-soft-foreground)]'
                            : 'text-muted-foreground/40 hover:text-muted-foreground',
                        )}
                      >
                        <Star className={cn('size-3.5', market.starred && 'fill-current')} />
                      </button>
                    </td>
                  )}

                  {/* The caller's rank, never the row index. */}
                  <td className="text-muted-foreground px-3 py-2 text-xs tabular-nums">
                    {market.rank ?? '—'}
                  </td>

                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      {market.icon}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{market.symbol}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {market.name}
                        </span>
                      </span>
                    </span>
                  </td>

                  <td className="px-3 py-2 text-end tabular-nums">
                    {money(market.price, market.price < 1 ? 4 : 2)}
                  </td>

                  <td
                    className={cn(
                      'px-3 py-2 text-end tabular-nums',
                      up && 'text-[var(--green-soft-foreground)]',
                      down && 'text-[var(--destructive-soft-foreground)]',
                    )}
                  >
                    {market.change24h === undefined
                      ? '—'
                      : `${up ? '+' : ''}${market.change24h.toFixed(2)}%`}
                  </td>

                  <td className="text-muted-foreground hidden px-3 py-2 text-end tabular-nums sm:table-cell">
                    {market.volume24h === undefined ? '—' : money(market.volume24h, 0)}
                  </td>

                  <td className="text-muted-foreground hidden px-3 py-2 text-end tabular-nums md:table-cell">
                    {market.marketCap === undefined ? '—' : money(market.marketCap, 0)}
                  </td>

                  <td className="hidden px-3 py-2 lg:table-cell">
                    {market.history && (
                      <Sparkline
                        values={market.history}
                        color={up ? 'var(--green)' : down ? 'var(--destructive)' : 'var(--muted-foreground)'}
                        className="h-7 w-20"
                      />
                    )}
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted-foreground p-8 text-center text-sm">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { MarketTable }
