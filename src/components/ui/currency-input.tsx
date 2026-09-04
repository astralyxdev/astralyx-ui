import { useId, useState, type ComponentProps } from 'react'
import { fieldBase, fieldOutline, fieldSize } from '@/lib/styles'
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
 * you edit a plain string; on blur it is parsed and grouped.
 *
 * **The symbol is an adornment, and appears exactly once.** It is drawn beside
 * the field and left out of the formatted value, so it cannot render twice and
 * cannot vanish when the field takes focus. Which side it sits on comes from
 * the locale — `en-US` writes `$1,299`, `fr-FR` writes `1 299 €`.
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

/**
 * The number alone — grouped, with the currency's own decimal count, and
 * **without** the symbol.
 *
 * The symbol is drawn once, as an adornment. Formatting the value with
 * `style: 'currency'` as well renders it twice ("$ $1,299.00"), and then it
 * disappears from inside the field the moment you focus it, because the
 * editable draft is a plain number — so the control appears to lose a
 * character as you start typing.
 */
function format(minor: number, locale: string, decimals: number) {
  const major = minor / 10 ** decimals
  try {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major)
  } catch {
    return String(major)
  }
}

/**
 * The symbol, and which side of the number it belongs on.
 *
 * Placement is per locale, not per currency: `en-US` writes `$1,299`, `fr-FR`
 * writes `1 299 €`. Pinning the adornment to the leading edge is wrong in every
 * locale that puts it after, so the position is read out of `formatToParts`.
 */
function currencyMeta(currency: string, locale: string) {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1)
    const symbolAt = parts.findIndex((part) => part.type === 'currency')
    const numberAt = parts.findIndex((part) => part.type === 'integer')
    return {
      symbol: parts[symbolAt]?.value ?? currency,
      leading: symbolAt !== -1 && numberAt !== -1 ? symbolAt < numberAt : true,
    }
  } catch {
    return { symbol: currency, leading: true }
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

  const { symbol, leading } = currencyMeta(currency, locale)

  const display =
    draft !== null
      ? draft
      : current === null || current === undefined
        ? ''
        : format(current, locale, decimals)

  const adornment = (
    <span aria-hidden="true" className="text-muted-foreground shrink-0 text-sm">
      {symbol}
    </span>
  )

  return (
    <div
      data-slot="currency-input"
      className={cn(
        fieldBase, fieldOutline,
        fieldSize[size],
        'flex items-center gap-1.5',
        invalid && 'border-[var(--destructive)]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {leading && adornment}

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

      {!leading && adornment}

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
