import { useId, useState, type ComponentProps } from 'react'
import { fieldBase, fieldSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A money field whose value is an integer number of minor units.
 *
 * **The value is cents, not `12.34`.** Binary floating point cannot represent
 * most decimal fractions, so `0.1 + 0.2 !== 0.3` and a cart total assembled
 * from float prices drifts by a cent — which is a support ticket, and in some
 * jurisdictions an accounting problem. Every payment API worth using (Stripe,
 * Adyen, PayPal) takes integer minor units for exactly this reason, and this
 * component hands you the value in the shape they want.
 *
 * **Zero-decimal currencies are not an edge case.** JPY, KRW and VND have no
 * minor unit: ¥1000 is 1000, not 100000. The number of decimals is read from
 * `Intl.NumberFormat` for the given currency rather than assumed to be two, so
 * those work without a special case at the call site.
 *
 * **The display is formatted only when the field is not focused.** Reformatting
 * under the caret while typing is the classic money-input bug — you type `1`,
 * it becomes `$1.00`, and the caret jumps behind the decimals. While focused
 * you edit a plain string; on blur it is parsed and formatted.
 */
type CurrencyInputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'type'
> & {
  /** Minor units — cents, pence, yen. `1234` is $12.34. */
  value?: number | null
  defaultValue?: number | null
  onChange?: (minorUnits: number | null) => void
  /** ISO 4217. Decides the symbol, the decimals and the placement. */
  currency?: string
  locale?: string
  size?: 'sm' | 'md' | 'lg'
  /** Clamp on blur. Also in minor units. */
  min?: number
  max?: number
  /** Show the code (`USD`) after the field as well as the symbol. */
  showCode?: boolean
  /**
   * Accessible name for the amount field.
   *
   * The currency symbol beside it is decorative and `aria-hidden`, so without
   * this the input has no name.
   */
  amountLabel?: string
  invalid?: boolean
}

/** Decimals this currency actually uses. JPY is 0, most are 2, some are 3. */
function decimalsFor(currency: string, locale: string) {
  try {
    const options = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions()
    return options.maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

function format(minor: number, currency: string, locale: string, decimals: number) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
      minor / 10 ** decimals,
    )
  } catch {
    return String(minor / 10 ** decimals)
  }
}

/** The currency symbol on its own, for the leading adornment. */
function symbolFor(currency: string, locale: string) {
  try {
    return (
      new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

function CurrencyInput({
  value,
  defaultValue = null,
  onChange,
  currency = 'USD',
  locale = 'en-US',
  size = 'md',
  min,
  max,
  showCode = false,
  amountLabel = 'Amount',
  invalid,
  className,
  disabled,
  id: idProp,
  ...props
}: CurrencyInputProps) {
  const scope = useId()
  const id = idProp ?? `${scope}-amount`
  const decimals = decimalsFor(currency, locale)

  const [internal, setInternal] = useState<number | null>(defaultValue)
  const [draft, setDraft] = useState<string | null>(null)

  const current = value === undefined ? internal : value

  const commit = (next: number | null) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  /** Parse what was typed into minor units, tolerating either separator. */
  const parse = (text: string): number | null => {
    const cleaned = text.replace(/[^\d.,-]/g, '').replace(/,/g, '.')
    if (!cleaned || cleaned === '-' || cleaned === '.') return null
    const major = Number.parseFloat(cleaned)
    if (Number.isNaN(major)) return null
    // Round at the end, once: the only place a float is allowed near money.
    return Math.round(major * 10 ** decimals)
  }

  const display =
    draft !== null
      ? draft
      : current === null || current === undefined
        ? ''
        : format(current, currency, locale, decimals)

  return (
    <div
      data-slot="currency-input"
      className={cn(
        fieldBase,
        fieldSize[size],
        'flex items-center gap-1.5',
        invalid && 'border-[var(--destructive)]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span aria-hidden="true" className="text-muted-foreground shrink-0 text-sm">
        {symbolFor(currency, locale)}
      </span>

      <input
        id={id}
        // `text` with a numeric inputMode, not `number`: a number input lets the
        // scroll wheel change the amount, rejects grouping separators, and its
        // spinners are meaningless for money.
        type="text"
        aria-label={amountLabel}
        inputMode="decimal"
        autoComplete="off"
        value={display}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onFocus={() =>
          setDraft(
            current === null || current === undefined
              ? ''
              : String(current / 10 ** decimals),
          )
        }
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = draft === null ? current ?? null : parse(draft)
          const clamped =
            parsed === null
              ? null
              : Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min ?? Number.MIN_SAFE_INTEGER, parsed))
          setDraft(null)
          commit(clamped)
        }}
        className="min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
        {...props}
      />

      {showCode && (
        <span aria-hidden="true" className="text-muted-foreground shrink-0 font-mono text-xs">
          {currency}
        </span>
      )}
    </div>
  )
}

export { CurrencyInput }
export type { CurrencyInputProps }
