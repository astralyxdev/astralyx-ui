import { useState, type ComponentProps, type ReactNode } from 'react'
import { CreditCard, Lock } from 'lucide-react'
import { MaskInput } from '@/components/ui/mask-input'
import { fieldBase, fieldSize, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Card number, expiry and CVC as one control.
 *
 * The number is validated with the Luhn checksum, which catches a mistyped
 * digit before the request is made. That matters commercially, not just for
 * polish: failed authorisations count against a merchant's decline rate, and
 * card networks price on it.
 *
 * The brand is detected from the leading digits so the CVC length can follow —
 * American Express uses four, everyone else three, and a fixed `maxlength` of
 * three silently truncates an Amex code.
 *
 * Nothing here stores or transmits anything. In production the fields belong in
 * a PSP iframe so the page never touches a PAN; this is the shape for a demo,
 * a test harness, or a PSP that hands you styling control.
 */
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'

/** Brand from the issuer identification number. */
function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa'
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^6(011|5|4[4-9])/.test(digits)) return 'discover'
  return 'unknown'
}

/** Luhn checksum — catches a single mistyped digit and most transpositions. */
function luhnValid(digits: string) {
  if (digits.length < 12) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  unknown: 'Card',
}

function CardInput({
  onCardChange,
  size = 'md',
  numberLabel = 'Card number',
  expiryLabel = 'Expiry date',
  expiryPlaceholder = 'MM/YY',
  cvcLabel = 'Security code',
  invalidNote = 'That card number does not check out — one of the digits is wrong.',
  disabled = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  onCardChange?: (card: {
    number: string
    expiry: string
    cvc: string
    brand: CardBrand
    valid: boolean
  }) => void
  size?: keyof typeof fieldSize
  /** Accessible name for the number field. */
  numberLabel?: string
  expiryLabel?: string
  expiryPlaceholder?: string
  cvcLabel?: string
  /** Shown when the digits fail the Luhn check. */
  invalidNote?: ReactNode
  disabled?: boolean
}) {
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  const brand = detectBrand(number)
  // Amex is 15 digits in 4-6-5 groups with a 4-digit code.
  const amex = brand === 'amex'
  const numberMask = amex ? '#### ###### #####' : '#### #### #### ####'
  const cvcLength = amex ? 4 : 3

  const numberValid = luhnValid(number)
  const expiryValid = /^(0[1-9]|1[0-2])\d{2}$/.test(expiry)

  const emit = (next: Partial<{ number: string; expiry: string; cvc: string }>) => {
    const card = { number, expiry, cvc, ...next }
    onCardChange?.({
      ...card,
      brand: detectBrand(card.number),
      valid:
        luhnValid(card.number) &&
        /^(0[1-9]|1[0-2])\d{2}$/.test(card.expiry) &&
        card.cvc.length === (detectBrand(card.number) === 'amex' ? 4 : 3),
    })
  }

  return (
    <div data-slot="card-input" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="relative">
        <MaskInput
          // Remount when the mask changes, or the formatted value is stale.
          key={numberMask}
          mask={numberMask}
          size={size}
          disabled={disabled}
          aria-label={numberLabel}
          autoComplete="cc-number"
          error={number.length > 0 && number.length >= 12 && !numberValid}
          onValueChange={(_, raw) => {
            setNumber(raw)
            emit({ number: raw })
          }}
        />
        <span className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-medium">
          {number ? BRAND_LABEL[brand] : <CreditCard className="size-4" aria-hidden="true" />}
        </span>
      </div>

      <div className="flex gap-2">
        <MaskInput
          mask="##/##"
          size={size}
          disabled={disabled}
          aria-label={expiryLabel}
          autoComplete="cc-exp"
          placeholder={expiryPlaceholder}
          error={expiry.length === 4 && !expiryValid}
          onValueChange={(_, raw) => {
            setExpiry(raw)
            emit({ expiry: raw })
          }}
          className="flex-1"
        />

        <div
          className={cn(
            fieldBase,
            fieldSize[size],
            'border-border bg-background flex-1 border',
            'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <Lock className="text-muted-foreground shrink-0" aria-hidden="true" />
          <input
            inputMode="numeric"
            maxLength={cvcLength}
            disabled={disabled}
            value={cvc}
            aria-label={cvcLabel}
            autoComplete="cc-csc"
            placeholder={amex ? '4 digits' : 'CVC'}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, '').slice(0, cvcLength)
              setCvc(next)
              emit({ cvc: next })
            }}
            className="w-full min-w-0 bg-transparent tabular-nums outline-none"
          />
        </div>
      </div>

      {number.length >= 12 && !numberValid && (
        <p className={cn('text-[var(--destructive-soft-foreground)] text-xs', radius.xs)}>
          {invalidNote}
        </p>
      )}
    </div>
  )
}

export { CardInput, detectBrand, luhnValid }
