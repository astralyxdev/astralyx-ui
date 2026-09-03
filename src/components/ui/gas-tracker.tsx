import type { ComponentProps, ReactNode } from 'react'
import { Fuel } from 'lucide-react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Gas price tiers, with what each actually costs.
 *
 * Gwei alone is not a decision. "32 gwei" means nothing without the fiat cost
 * of the transaction you are about to send, which is why every tier carries
 * both — and why `gasLimit` is a prop: the same gas price costs four times more
 * for a swap than for a transfer.
 *
 * Tiers are shown with their expected wait, because the trade being made is
 * time against money and a price with no time attached only shows one side.
 */
export type GasTier = {
  id: string
  label: ReactNode
  /** Gwei. */
  price: number
  /** Human wait, e.g. "~15s". */
  wait?: string
  recommended?: boolean
}

function GasTracker({
  tiers,
  selected,
  onSelect,
  gasLimit = 21000,
  nativePrice,
  nativeSymbol = 'ETH',
  currency = 'USD',
  locale = 'en-GB',
  baseFee,
  title = 'Gas',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  tiers: GasTier[]
  selected?: string
  onSelect?: (id: string) => void
  /** Units of gas for the transaction being priced. 21000 is a bare transfer. */
  gasLimit?: number
  /** Fiat price of the native token, for the cost estimate. */
  nativePrice?: number
  nativeSymbol?: string
  currency?: string
  locale?: string
  baseFee?: number
  title?: ReactNode
}) {
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  })

  // gwei × gas units = gwei total; ÷ 1e9 = native token.
  const nativeCost = (gwei: number) => (gwei * gasLimit) / 1e9

  return (
    <div
      data-slot="gas-tracker"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex items-center gap-2 border-b p-3">
        <Fuel className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
        {baseFee !== undefined && (
          <span className="text-muted-foreground ms-auto text-xs tabular-nums">
            base {baseFee.toFixed(1)} gwei
          </span>
        )}
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {tiers.map((tier) => {
          const chosen = selected === tier.id
          const native = nativeCost(tier.price)

          const row = (
            <>
              <span className="min-w-0 flex-1 text-start">
                <span className="block text-sm font-medium">{tier.label}</span>
                {tier.wait && (
                  <span className="text-muted-foreground block text-xs">
                    {tier.wait}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-end">
                <span className="block text-sm tabular-nums">
                  {tier.price.toFixed(1)} gwei
                </span>
                <span className="text-muted-foreground block text-xs tabular-nums">
                  {nativePrice !== undefined
                    ? money.format(native * nativePrice)
                    : `${native.toFixed(5)} ${nativeSymbol}`}
                </span>
              </span>
            </>
          )

          return (
            <li key={tier.id}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => onSelect(tier.id)}
                  className={cn(
                    'hover:bg-accent/40 flex w-full items-center gap-3 px-3 py-2.5',
                    'transition-colors duration-150 ease-out motion-reduce:transition-none',
                    'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset',
                    chosen && 'bg-accent/60',
                  )}
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { GasTracker }
