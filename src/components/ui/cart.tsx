import type { ComponentProps, ReactNode } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A basket: lines, quantities, per-line totals.
 *
 * Amounts are integer minor units, matching `LedgerTable` and `MoneyInput`.
 * Money that has been through a float has already lost — `0.1 + 0.2` is
 * 0.30000000000000004, and a basket is exactly where that surfaces.
 *
 * Each line shows its unit price *and* its line total once quantity exceeds
 * one. Showing only the total makes it impossible to check, and showing only
 * the unit price makes the sum look wrong.
 *
 * Quantity controls are stepper buttons rather than a free number field. A cart
 * quantity is realistically 1–10, and a text input invites "12" where "1" and a
 * stray keystroke were meant. Remove is separate from decrement, so reaching
 * zero is never how you delete something.
 *
 * Stock limits are enforced at the control, not on submit. Letting someone add
 * a ninth of eight units and telling them at checkout is the worst order.
 */
export type CartLine = {
  id: string
  name: ReactNode
  /** Unit price in minor units. */
  price: number
  quantity: number
  /** Small square image. */
  image?: ReactNode
  variant?: ReactNode
  /** Caps the increment control. */
  max?: number
  note?: ReactNode
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_DECREASE_LABEL: (item: string) => string = (item) => `Decrease quantity of ${item}`
const DEFAULT_INCREASE_LABEL: (item: string) => string = (item) => `Increase quantity of ${item}`
const DEFAULT_STOCK_NOTE: (max: number) => ReactNode = (max) => `Only ${max} in stock.`

function Cart({
  lines,
  currency = 'USD',
  locale = 'en-GB',
  onQuantityChange,
  onRemove,
  empty,
  removeLabel = 'Remove from basket',
  decreaseLabel = DEFAULT_DECREASE_LABEL,
  increaseLabel = DEFAULT_INCREASE_LABEL,
  eachLabel = 'each',
  stockNote = DEFAULT_STOCK_NOTE,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  lines: CartLine[]
  currency?: string
  locale?: string
  onQuantityChange?: (id: string, quantity: number) => void
  onRemove?: (id: string) => void
  empty?: ReactNode
  removeLabel?: string
  /** Accessible names for the quantity stepper, given the line's name. */
  decreaseLabel?: (item: string) => string
  increaseLabel?: (item: string) => string
  /** Follows the unit price. */
  eachLabel?: ReactNode
  /** Shown once a line hits its stock cap. */
  stockNote?: (max: number) => ReactNode
}) {
  const money = (minor: number) => (
    <Fmt type="currency" value={minor / 100} currency={currency} locale={locale} decimals={2} />
  )

  if (lines.length === 0) {
    return (
      <div
        data-slot="cart"
        className={cn(surface, radius.surface, 'p-8 text-center', className)}
        {...props}
      >
        <p className="text-muted-foreground text-sm">{empty ?? 'Your basket is empty.'}</p>
      </div>
    )
  }

  return (
    <ul
      data-slot="cart"
      className={cn(surface, radius.surface, 'divide-border list-none divide-y', className)}
      {...(props as ComponentProps<'ul'>)}
    >
      {lines.map((line) => {
        const atMax = line.max !== undefined && line.quantity >= line.max
        return (
          <li key={line.id} className="flex items-start gap-3 p-3">
            {line.image && (
              <span
                className={cn('bg-secondary size-14 shrink-0 overflow-hidden', radius.control)}
                aria-hidden="true"
              >
                {line.image}
              </span>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  {line.variant && (
                    <p className="text-muted-foreground truncate text-xs">{line.variant}</p>
                  )}
                </div>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={removeLabel}
                    className="shrink-0"
                    onClick={() => onRemove(line.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {onQuantityChange ? (
                  <div className={cn('bg-secondary flex items-center', radius.control)}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={decreaseLabel(typeof line.name === 'string' ? line.name : 'item')}
                      disabled={line.quantity <= 1}
                      onClick={() => onQuantityChange(line.id, line.quantity - 1)}
                    >
                      <Minus />
                    </Button>
                    <span
                      className="min-w-7 text-center text-xs font-medium tabular-nums"
                      aria-live="polite"
                    >
                      {line.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={increaseLabel(typeof line.name === 'string' ? line.name : 'item')}
                      // Capped here, not rejected at checkout.
                      disabled={atMax}
                      onClick={() => onQuantityChange(line.id, line.quantity + 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    ×{line.quantity}
                  </span>
                )}

                <span className="text-muted-foreground text-xs tabular-nums">
                  {money(line.price)} {eachLabel}
                </span>

                <span className="ms-auto text-sm font-medium tabular-nums">
                  {money(line.price * line.quantity)}
                </span>
              </div>

              {atMax && (
                <p className="text-[var(--amber-soft-foreground)] text-xs">
                  {stockNote(line.max!)}
                </p>
              )}
              {line.note && <p className="text-muted-foreground text-xs">{line.note}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export { Cart }
