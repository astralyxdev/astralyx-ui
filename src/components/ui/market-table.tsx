'use client'

import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Search, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Sparkline } from '@/components/ui/sparkline'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { enterFade } from '@/lib/motion'
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
    <TableHead className={cn('text-end', cls)}>
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
    </TableHead>
  )

  return (
    <div
      data-slot="market-table"
      className={cn(enterFade, surface, radius.surface, 'flex flex-col overflow-hidden', className)}
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
        {/* The kit's table parts. Heading ink, row rules and the hover come
            from the shared table; a market list only has to say it runs denser
            than the default. */}
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              {onStar && <TableHead className="w-8" />}
              <TableHead>{rankHeader}</TableHead>
              <TableHead>{marketHeader}</TableHead>
              <Header label={priceHeader} sortKey="price" />
              <Header label={changeHeader} sortKey="change24h" />
              <Header label={volumeHeader} sortKey="volume24h" className="hidden sm:table-cell" />
              <Header label={capHeader} sortKey="marketCap" className="hidden md:table-cell" />
              <TableHead className="hidden w-24 lg:table-cell" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((market) => {
              const up = (market.change24h ?? 0) > 0
              const down = (market.change24h ?? 0) < 0

              return (
                <TableRow
                  key={market.id}
                  onClick={onSelect ? () => onSelect(market.id) : undefined}
                  className={cn(onSelect && 'hover:bg-accent/40 cursor-pointer')}
                >
                  {onStar && (
                    <TableCell className="ps-2 pe-0">
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
                    </TableCell>
                  )}

                  {/* The caller's rank, never the row index. */}
                  <TableCell className="text-muted-foreground text-xs tabular-nums">
                    {market.rank ?? '—'}
                  </TableCell>

                  <TableCell>
                    <span className="flex items-center gap-2">
                      {market.icon}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{market.symbol}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {market.name}
                        </span>
                      </span>
                    </span>
                  </TableCell>

                  <TableCell className="text-end tabular-nums">
                    {money(market.price, market.price < 1 ? 4 : 2)}
                  </TableCell>

                  <TableCell
                    className={cn(
                      'text-end tabular-nums',
                      up && 'text-[var(--green-soft-foreground)]',
                      down && 'text-[var(--destructive-soft-foreground)]',
                    )}
                  >
                    {market.change24h === undefined
                      ? '—'
                      : `${up ? '+' : ''}${market.change24h.toFixed(2)}%`}
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden text-end tabular-nums sm:table-cell">
                    {market.volume24h === undefined ? '—' : money(market.volume24h, 0)}
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden text-end tabular-nums md:table-cell">
                    {market.marketCap === undefined ? '—' : money(market.marketCap, 0)}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {market.history && (
                      <Sparkline
                        values={market.history}
                        color={up ? 'var(--green)' : down ? 'var(--destructive)' : 'var(--muted-foreground)'}
                        className="h-7 w-20"
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}

            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="text-muted-foreground p-8 text-center text-sm">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}

export { MarketTable }
