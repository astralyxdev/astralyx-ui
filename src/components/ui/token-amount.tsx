import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A token balance, formatted from base units without ever touching a float.
 *
 * This is the one that has to be right. On-chain amounts are integers in the
 * token's smallest unit — 18 decimals for most ERC-20s — and 1 ETH is
 * 1000000000000000000 wei. That exceeds `Number.MAX_SAFE_INTEGER` by two orders
 * of magnitude, so the moment a balance passes through a JavaScript number it
 * is silently wrong. Every value here stays a `bigint` or a decimal string, and
 * the split into whole and fractional parts is done on the digit string.
 *
 * Display is deliberately lossy in one direction only: it rounds *down*. A
 * balance shown as more than the wallet holds produces a failed transaction,
 * which is a worse outcome than showing slightly less.
 */
export type TokenAmountProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** Base units — wei, satoshi, lamports. A string avoids any float parsing. */
  value: bigint | string
  /** Token decimals. 18 for most ERC-20s, 8 for BTC, 6 for USDC. */
  decimals?: number
  symbol?: string
  /** Fraction digits shown. The rest is truncated, never rounded up. */
  precision?: number
  /** Strip trailing zeros from the fraction. */
  trim?: boolean
  /** Fiat value, already converted. */
  fiat?: number
  fiatCurrency?: string
  locale?: string
  /** Colour by sign, for a delta rather than a balance. */
  signed?: boolean
  size?: 'sm' | 'default' | 'lg'
}

/**
 * Split base units into whole and fraction on the digit string.
 *
 * No division, no `Number` — padding and slicing a string is exact at any
 * magnitude, which is the entire point.
 */
function splitUnits(value: bigint, decimals: number) {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0')
  const whole = digits.slice(0, digits.length - decimals) || '0'
  const fraction = decimals > 0 ? digits.slice(digits.length - decimals) : ''
  return { negative, whole, fraction }
}

function formatUnits(
  value: bigint,
  decimals: number,
  precision: number,
  trim: boolean,
  locale: string,
) {
  const { negative, whole, fraction } = splitUnits(value, decimals)

  // Truncate, never round: showing more than is held breaks the transaction.
  let shown = fraction.slice(0, precision)
  if (trim) shown = shown.replace(/0+$/, '')

  const grouped = new Intl.NumberFormat(locale, { useGrouping: true }).format(BigInt(whole))
  return (negative ? '-' : '') + grouped + (shown ? '.' + shown : '')
}

function TokenAmount({
  value,
  decimals = 18,
  symbol,
  precision = 4,
  trim = true,
  fiat,
  fiatCurrency = 'USD',
  locale = 'en-GB',
  signed = false,
  size = 'default',
  className,
  ...props
}: TokenAmountProps) {
  let units: bigint
  try {
    units = typeof value === 'bigint' ? value : BigInt(value)
  } catch {
    // A malformed value is reported, not silently rendered as zero.
    return (
      <span className={cn('text-muted-foreground tabular-nums', className)} {...props}>
        —
      </span>
    )
  }

  const text = formatUnits(units, decimals, precision, trim, locale)
  const positive = units > 0n
  const negative = units < 0n

  return (
    <span
      data-slot="token-amount"
      className={cn(
        'inline-flex items-baseline gap-1 tabular-nums',
        size === 'sm' && 'text-xs',
        size === 'lg' && 'text-lg font-semibold',
        signed && positive && 'text-[var(--green-soft-foreground)]',
        signed && negative && 'text-[var(--destructive-soft-foreground)]',
        className,
      )}
      {...props}
    >
      <span>
        {signed && positive ? '+' : ''}
        {text}
      </span>
      {symbol && (
        <span className={cn('shrink-0', !signed && 'text-muted-foreground')}>
          {symbol}
        </span>
      )}
      {fiat !== undefined && (
        <span className="text-muted-foreground/70 text-xs">
          {new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: fiatCurrency,
            maximumFractionDigits: 2,
          }).format(fiat)}
        </span>
      )}
    </span>
  )
}

export { TokenAmount, formatUnits, splitUnits }
