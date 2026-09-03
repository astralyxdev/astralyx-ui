import type { ComponentProps, ReactNode } from 'react'
import { Building2, Check, CreditCard, TriangleAlert, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Saved payment methods, selectable, with one default.
 *
 * An expired or expiring card is flagged in the list rather than at checkout.
 * The card that fails is almost always one that expired months ago and nobody
 * told the customer — surfacing it here is the difference between a prompt and
 * an involuntary churn.
 *
 * Only the last four digits are ever rendered. A saved method has no business
 * holding a full PAN client-side, and a component that accepts one invites
 * somebody to pass it.
 */
export type PaymentMethod = {
  id: string
  kind: 'card' | 'bank' | 'wallet'
  /** Last four digits or account suffix. Never the full number. */
  last4: string
  brand?: ReactNode
  /** MM/YY. Cards only. */
  expiry?: string
  holder?: ReactNode
  isDefault?: boolean
}

const ICON = { card: CreditCard, bank: Building2, wallet: Wallet } as const

/** Expired, or inside the window where the issuer reissues. */
function expiryState(expiry: string | undefined, now: Date) {
  if (!expiry) return 'none' as const
  const [mm, yy] = expiry.split('/').map((part) => Number(part))
  if (!mm || Number.isNaN(yy)) return 'none' as const
  // End of the expiry month is the actual cutoff.
  const end = new Date(2000 + yy, mm, 0, 23, 59, 59)
  if (end < now) return 'expired' as const
  const soon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60)
  return end < soon ? 'expiring' as const : 'ok' as const
}

function PaymentMethodList({
  methods,
  selected,
  onSelect,
  onRemove,
  onSetDefault,
  now,
  emptyLabel = 'No payment methods',
  defaultLabel = 'Default',
  expiredLabel = 'Expired',
  expiringLabel = 'Expiring soon',
  expiresLabel = 'Expires',
  setDefaultLabel = 'Make default',
  removeLabel = 'Remove',
  expiredNote = 'An expired card will decline. Update it before the next charge.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  methods: PaymentMethod[]
  selected?: string
  onSelect?: (id: string) => void
  onRemove?: (id: string) => void
  onSetDefault?: (id: string) => void
  now?: Date
  emptyLabel?: ReactNode
  /** Badge on the method charged by default. */
  defaultLabel?: ReactNode
  expiredLabel?: ReactNode
  /** Badge on a card within 60 days of expiry. */
  expiringLabel?: ReactNode
  /** Precedes the MM/YY expiry. */
  expiresLabel?: ReactNode
  setDefaultLabel?: ReactNode
  removeLabel?: ReactNode
  /** Note shown when any card has already expired. Pass `null` to drop it. */
  expiredNote?: ReactNode
}) {
  const reference = now ?? new Date()

  if (methods.length === 0) {
    return (
      <div className={cn(surface, radius.surface, className)} {...props}>
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      data-slot="payment-method-list"
      role={onSelect ? 'radiogroup' : undefined}
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {methods.map((method) => {
        const Icon = ICON[method.kind]
        const state = expiryState(method.expiry, reference)
        const chosen = selected === method.id

        const body = (
          <>
            <Icon className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />

            <span className="min-w-0 flex-1 text-start">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {method.brand ?? method.kind} •••• {method.last4}
                </span>
                {method.isDefault && <Badge size="sm">{defaultLabel}</Badge>}
                {state === 'expired' && (
                  <Badge size="sm" color="destructive">
                    {expiredLabel}
                  </Badge>
                )}
                {state === 'expiring' && (
                  <Badge size="sm" color="amber">
                    {expiringLabel}
                  </Badge>
                )}
              </span>
              {(method.holder || method.expiry) && (
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {method.holder}
                  {method.holder && method.expiry && ' · '}
                  {method.expiry && (
                    <>
                      {expiresLabel} {method.expiry}
                    </>
                  )}
                </span>
              )}
            </span>

            {chosen && <Check className="size-4 shrink-0" aria-hidden="true" />}
          </>
        )

        return (
          <div
            key={method.id}
            className={cn(
              surface,
              radius.control,
              'flex items-center gap-3 p-3',
              chosen && 'border-primary',
              state === 'expired' && 'opacity-70',
            )}
          >
            {onSelect ? (
              <button
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => onSelect(method.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 text-start',
                  radius.control,
                  interactive,
                  focusRing,
                )}
              >
                {body}
              </button>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
            )}

            <span className="flex shrink-0 items-center gap-1">
              {onSetDefault && !method.isDefault && state !== 'expired' && (
                <Button variant="ghost" size="xs" onClick={() => onSetDefault(method.id)}>
                  {setDefaultLabel}
                </Button>
              )}
              {onRemove && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-[var(--destructive-soft-foreground)]"
                  onClick={() => onRemove(method.id)}
                >
                  {removeLabel}
                </Button>
              )}
            </span>
          </div>
        )
      })}

      {expiredNote && methods.some((m) => expiryState(m.expiry, reference) === 'expired') && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {expiredNote}
        </p>
      )}
    </div>
  )
}

export { PaymentMethodList, expiryState }
