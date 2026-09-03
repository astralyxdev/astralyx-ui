import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dataFills, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Total portfolio value with its allocation.
 *
 * The hide toggle is not a novelty. People check balances on trains and in
 * open-plan offices, and every serious wallet ships one — so it is part of the
 * component rather than something each app bolts on.
 *
 * Allocation is computed from the values given, never taken as a percentage
 * prop. Two sources for the same number drift, and a bar that does not add to
 * 100 is the kind of thing people screenshot.
 *
 * Holdings below `groupBelow` collapse into "Other". A bar with forty
 * one-pixel slivers communicates less than six slices and a remainder.
 */
export type Holding = {
  id: string
  symbol: ReactNode
  /** Fiat value. Allocation is derived from these. */
  value: number
  amount?: ReactNode
  change24h?: number
  color?: string
  icon?: ReactNode
}

function PortfolioBalance({
  holdings,
  change24h,
  currency = 'USD',
  locale = 'en-GB',
  hidden: hiddenProp,
  onHiddenChange,
  groupBelow = 0.03,
  totalLabel = 'Total value',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  holdings: Holding[]
  /** Portfolio-level change, as a percentage. */
  change24h?: number
  currency?: string
  locale?: string
  hidden?: boolean
  onHiddenChange?: (hidden: boolean) => void
  /** Share below which a holding folds into "Other". */
  groupBelow?: number
  totalLabel?: ReactNode
}) {
  const controlled = hiddenProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(false)
  const hidden = controlled ? hiddenProp : uncontrolled

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  })

  const { rows, total } = useMemo(() => {
    const sum = holdings.reduce((n, h) => n + h.value, 0) || 1
    const big = holdings.filter((h) => h.value / sum >= groupBelow)
    const small = holdings.filter((h) => h.value / sum < groupBelow)
    const rest = small.reduce((n, h) => n + h.value, 0)

    const list = [...big].sort((a, b) => b.value - a.value)
    if (rest > 0) list.push({ id: '__other', symbol: 'Other', value: rest })
    return { rows: list, total: sum }
  }, [holdings, groupBelow])

  const up = (change24h ?? 0) > 0
  const down = (change24h ?? 0) < 0

  return (
    <div
      data-slot="portfolio-balance"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">{totalLabel}</p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums">
            {hidden ? '••••••' : money.format(total)}
          </p>

          {change24h !== undefined && !hidden && (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-sm tabular-nums',
                up && 'text-[var(--green-soft-foreground)]',
                down && 'text-[var(--destructive-soft-foreground)]',
                !up && !down && 'text-muted-foreground',
              )}
            >
              {up && <ArrowUp className="size-3.5" aria-hidden="true" />}
              {down && <ArrowDown className="size-3.5" aria-hidden="true" />}
              {Math.abs(change24h).toFixed(2)}%
              <span className="text-muted-foreground/70">24h</span>
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={hidden ? 'Show balances' : 'Hide balances'}
          aria-pressed={hidden}
          onClick={() => {
            const next = !hidden
            if (!controlled) setUncontrolled(next)
            onHiddenChange?.(next)
          }}
        >
          {hidden ? <Eye /> : <EyeOff />}
        </Button>
      </div>

      {/* One bar, derived from the values — never a percentage prop. */}
      <div
        className="flex h-2 w-full overflow-hidden rounded-full [corner-shape:round]"
        role="img"
        aria-label={rows
          .map((h) => `${h.symbol}: ${Math.round((h.value / total) * 100)}%`)
          .join(', ')}
      >
        {rows.map((holding, index) => (
          <span
            key={holding.id}
            style={{
              width: `${(holding.value / total) * 100}%`,
              backgroundColor: holding.color ?? dataFills[index % dataFills.length],
            }}
          />
        ))}
      </div>

      <ul className="flex list-none flex-col gap-2">
        {rows.map((holding, index) => (
          <li key={holding.id} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full [corner-shape:round]"
              style={{ backgroundColor: holding.color ?? dataFills[index % dataFills.length] }}
            />
            {holding.icon}

            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {holding.symbol}
            </span>

            {holding.change24h !== undefined && (
              <span
                className={cn(
                  'shrink-0 text-xs tabular-nums',
                  holding.change24h > 0
                    ? 'text-[var(--green-soft-foreground)]'
                    : holding.change24h < 0
                      ? 'text-[var(--destructive-soft-foreground)]'
                      : 'text-muted-foreground',
                )}
              >
                {holding.change24h > 0 ? '+' : ''}
                {holding.change24h.toFixed(2)}%
              </span>
            )}

            <span className="text-muted-foreground w-12 shrink-0 text-end text-xs tabular-nums">
              {Math.round((holding.value / total) * 100)}%
            </span>

            <span className="min-w-20 shrink-0 text-end text-sm tabular-nums whitespace-nowrap">
              {hidden ? '••••' : money.format(holding.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { PortfolioBalance }
