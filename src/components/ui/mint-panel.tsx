import { useState, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An NFT mint: supply, price, quantity.
 *
 * The per-wallet cap is enforced against what the wallet has *already* minted,
 * not just the quantity in the box. That is the check people forget, and the
 * failure mode is a transaction that reverts after the user has paid gas — the
 * worst possible way to learn about a limit.
 *
 * Total cost is shown before the button, not after. A price of "0.08 ETH" with
 * a quantity of five is a number the user should not have to compute while
 * deciding.
 */
/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_MINT_LABEL: (quantity: number) => ReactNode = (quantity) => `Mint ${quantity}`

function MintPanel({
  title,
  minted,
  supply,
  price,
  priceLabel,
  maxPerWallet,
  alreadyMinted = 0,
  quantity: quantityProp,
  onQuantityChange,
  onMint,
  disabled = false,
  status,
  soldOutLabel = 'Sold out',
  mintedLabel = 'Minted',
  priceRowLabel = 'Price',
  totalLabel = 'Total',
  quantityLabel = 'Quantity',
  limitReachedLabel = 'Limit reached',
  mintLabel = DEFAULT_MINT_LABEL,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  title?: ReactNode
  minted: number
  supply: number
  /** Price per item, as a number so the total can be computed. */
  price?: number
  /** Unit shown after the price, e.g. "ETH". */
  priceLabel?: string
  maxPerWallet?: number
  /** What this wallet has already minted, counted against the cap. */
  alreadyMinted?: number
  quantity?: number
  onQuantityChange?: (quantity: number) => void
  onMint?: () => void
  disabled?: boolean
  status?: ReactNode
  soldOutLabel?: ReactNode
  /** Precedes the minted-of-supply count. */
  mintedLabel?: ReactNode
  priceRowLabel?: ReactNode
  totalLabel?: ReactNode
  /** Accessible name for the quantity field. */
  quantityLabel?: string
  /** Action label once the per-wallet cap is hit. */
  limitReachedLabel?: ReactNode
  /** Action label, given the chosen quantity. */
  mintLabel?: (quantity: number) => ReactNode
}) {
  const controlled = quantityProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(1)
  const quantity = controlled ? quantityProp : uncontrolled

  const soldOut = minted >= supply
  // The cap counts what is already held, not just what is in the box.
  const remainingForWallet =
    maxPerWallet === undefined ? Infinity : Math.max(0, maxPerWallet - alreadyMinted)
  const capped = remainingForWallet <= 0
  const remainingSupply = Math.max(0, supply - minted)
  const maxQuantity = Math.max(1, Math.min(remainingForWallet, remainingSupply))

  function setQuantity(next: number) {
    const clamped = Math.max(1, Math.min(next, maxQuantity))
    if (!controlled) setUncontrolled(clamped)
    onQuantityChange?.(clamped)
  }

  return (
    <div
      data-slot="mint-panel"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      {title && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {soldOut && (
            <Badge size="sm" color="neutral">
              {soldOutLabel}
            </Badge>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{mintedLabel}</span>
          <span className="tabular-nums">
            {minted.toLocaleString()} / {supply.toLocaleString()}
          </span>
        </div>
        <Progress value={(minted / Math.max(supply, 1)) * 100} className="h-2" />
      </div>

      {price !== undefined && (
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{priceRowLabel}</dt>
            <dd className="tabular-nums">
              {price} {priceLabel}
            </dd>
          </div>
          {/* Computed for the user, before the button. */}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{totalLabel}</dt>
            <dd className="font-medium tabular-nums">
              {Number((price * quantity).toFixed(6))} {priceLabel}
            </dd>
          </div>
        </dl>
      )}

      {!soldOut && !capped && (
        <div className="flex items-center gap-2">
          <NumberInput
            size="sm"
            value={quantity}
            min={1}
            max={maxQuantity}
            aria-label={quantityLabel}
            onValueChange={(next) => setQuantity(next ?? 1)}
            className="w-32"
          />
          {maxPerWallet !== undefined && (
            <span className="text-muted-foreground text-xs">
              {remainingForWallet} of {maxPerWallet} left for this wallet
            </span>
          )}
        </div>
      )}

      {capped && !soldOut && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">
          This wallet has minted its maximum of {maxPerWallet}.
        </p>
      )}

      <Button disabled={disabled || soldOut || capped} onClick={onMint}>
        {soldOut ? soldOutLabel : capped ? limitReachedLabel : mintLabel(quantity)}
      </Button>

      {status && <div className="text-muted-foreground text-xs">{status}</div>}
    </div>
  )
}

export { MintPanel }
