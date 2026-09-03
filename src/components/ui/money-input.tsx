import { useMemo, useState, type ComponentProps } from 'react'
import { fieldBase, fieldInput, fieldSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A fiat amount field that reports integer minor units.
 *
 * `onValueChange` hands back cents, never a float. Money in a JavaScript number
 * is wrong in ways that only show up on the invoice — `19.99 * 3` is
 * 59.97000000000001 — so the boundary between the field and the caller is the
 * one place to fix it.
 *
 * The currency symbol and its side come from `Intl`, not a prop. It is "$12.00"
 * and "12,00 €" depending on locale, and hard-coding a prefix produces
 * confidently wrong output for half the world.
 *
 * Formatting happens on blur, never mid-keystroke: reformatting while someone
 * types moves the caret and makes the field feel broken.
 */
/** "US dollars" rather than "USD", falling back to the code where unsupported. */
function currencyName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

function MoneyInput({
  value: valueProp,
  defaultValue,
  onValueChange,
  currency = 'USD',
  locale = 'en-GB',
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  min,
  max,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'min' | 'max'> & {
  /** Minor units — cents. */
  value?: number
  defaultValue?: number
  onValueChange?: (minorUnits: number | undefined) => void
  currency?: string
  locale?: string
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  min?: number
  max?: number
}) {
  const parts = useMemo(() => {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).formatToParts(0)
    const symbol = formatted.find((p) => p.type === 'currency')?.value ?? ''
    // Which side does the symbol sit on in this locale?
    const prefix = formatted[0]?.type === 'currency'
    const decimals =
      formatted.find((p) => p.type === 'fraction')?.value.length ?? 2
    return { symbol, prefix, decimals }
  }, [locale, currency])

  const toText = (minor: number | undefined) =>
    minor === undefined ? '' : (minor / 10 ** parts.decimals).toFixed(parts.decimals)

  const controlled = valueProp !== undefined
  const [text, setText] = useState(() => toText(controlled ? valueProp : defaultValue))
  const [focused, setFocused] = useState(false)

  // While focused the local text wins, so an external re-render cannot rewrite
  // what someone is halfway through typing. On blur the two are reconciled.
  const display = controlled && !focused ? toText(valueProp) : text

  // The currency lives in a sibling span, so it is adjacent text rather than
  // part of the field's name — "1250" with no unit is what a screen reader
  // would otherwise announce. When the caller has named the field themselves
  // (aria-label, aria-labelledby, or an id a <Label> points at) theirs wins;
  // otherwise fall back to naming the currency, which is the one thing this
  // control knows and the visual design communicates only in colour and glyph.
  const named =
    props['aria-label'] !== undefined ||
    props['aria-labelledby'] !== undefined ||
    props.id !== undefined
  const fallbackLabel = named ? undefined : `Amount in ${currencyName(currency)}`

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'border border-transparent bg-transparent',
  }[variant]

  return (
    <div
      data-slot="money-input"
      className={cn(
        fieldBase,
        fieldSize[size],
        VARIANT,
        error && 'border-destructive',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {parts.prefix && (
        <span aria-hidden="true" className="text-muted-foreground shrink-0">
          {parts.symbol}
        </span>
      )}

      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={display}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d.,-]/g, '')
          setText(next)
          const parsed = Number.parseFloat(next.replace(',', '.'))
          onValueChange?.(
            next === '' || Number.isNaN(parsed)
              ? undefined
              : Math.round(parsed * 10 ** parts.decimals),
          )
        }}
        onFocus={(event) => {
          setFocused(true)
          props.onFocus?.(event)
        }}
        onBlur={() => {
          setFocused(false)
          // Reformat here, not per keystroke — mid-type reformatting moves the
          // caret and makes the field feel broken.
          const parsed = Number.parseFloat(text.replace(',', '.'))
          if (Number.isNaN(parsed)) return setText('')
          let minor = Math.round(parsed * 10 ** parts.decimals)
          if (min !== undefined) minor = Math.max(min, minor)
          if (max !== undefined) minor = Math.min(max, minor)
          setText(toText(minor))
          onValueChange?.(minor)
        }}
        aria-label={fallbackLabel}
        className={cn(fieldInput, 'text-end tabular-nums')}
        {...props}
      />

      {!parts.prefix && (
        <span aria-hidden="true" className="text-muted-foreground shrink-0">
          {parts.symbol}
        </span>
      )}
    </div>
  )
}

export { MoneyInput }
