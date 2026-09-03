import type { ComponentProps, ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/ui/money-input'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A stake field with quick multipliers and a payout preview.
 *
 * Potential payout is shown before the button, computed from the stake and the
 * odds. A stake box with no payout makes people work out the return in their
 * head at exactly the moment they are least inclined to.
 *
 * The balance ceiling is enforced on the field, not on submit. "Insufficient
 * balance" after a confirm dialog is a worse experience than a max that simply
 * cannot be exceeded, and half and double clamp rather than overshoot.
 *
 * All amounts are integer minor units, so repeated halving cannot accumulate a
 * float error into a stake that does not match the balance.
 */
function BetInput({
  stake,
  onStakeChange,
  balance,
  odds,
  min,
  max,
  currency = 'USD',
  locale = 'en-GB',
  onPlace,
  action = 'Place bet',
  stakeLabel = 'Stake',
  maxLabel = 'Max',
  payoutLabel = 'Potential payout',
  overBalanceNote = 'Stake is above your balance.',
  disabled = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'onChange'> & {
  /** Minor units. */
  stake: number
  onStakeChange?: (stake: number) => void
  balance?: number
  /** Decimal odds — 2.5 returns 2.5× the stake. */
  odds?: number
  min?: number
  max?: number
  currency?: string
  locale?: string
  onPlace?: () => void
  action?: ReactNode
  /** Heading and accessible name for the stake field. */
  stakeLabel?: ReactNode
  /** The "stake everything" quick action. */
  maxLabel?: ReactNode
  payoutLabel?: ReactNode
  overBalanceNote?: ReactNode
  disabled?: boolean
}) {
  const ceiling = Math.min(max ?? Infinity, balance ?? Infinity)
  const floor = min ?? 0

  const set = (next: number) =>
    onStakeChange?.(Math.max(floor, Math.min(Math.round(next), ceiling)))

  const overBalance = balance !== undefined && stake > balance
  const belowMin = min !== undefined && stake < min
  const payout = odds !== undefined ? Math.round(stake * odds) : undefined

  const money = (minor: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(minor / 100)

  return (
    <div
      data-slot="bet-input"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{stakeLabel}</span>
        {balance !== undefined && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Balance {money(balance)}
          </span>
        )}
      </div>

      <MoneyInput
        value={stake}
        onValueChange={(next) => set(next ?? 0)}
        currency={currency}
        locale={locale}
        max={ceiling}
        min={floor}
        error={overBalance || belowMin}
        aria-label={typeof stakeLabel === 'string' ? stakeLabel : 'Stake'}
      />

      {/* Clamped, never overshooting the balance. */}
      <div className="flex flex-wrap gap-1.5">
        <Button variant="secondary" size="xs" onClick={() => set(stake / 2)}>
          ½
        </Button>
        <Button variant="secondary" size="xs" onClick={() => set(stake * 2)}>
          2×
        </Button>
        {balance !== undefined && (
          <Button variant="secondary" size="xs" onClick={() => set(balance)}>
            {maxLabel}
          </Button>
        )}
      </div>

      {payout !== undefined && (
        <dl className="flex items-baseline justify-between gap-2 text-sm">
          <dt className="text-muted-foreground">{payoutLabel}</dt>
          <dd className="font-semibold tabular-nums text-[var(--green-soft-foreground)]">
            {money(payout)}
          </dd>
        </dl>
      )}

      {overBalance && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {overBalanceNote}
        </p>
      )}
      {belowMin && !overBalance && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">
          Minimum stake is {money(min!)}.
        </p>
      )}

      <Button disabled={disabled || overBalance || belowMin || stake <= 0} onClick={onPlace}>
        {action}
      </Button>
    </div>
  )
}

export { BetInput }
