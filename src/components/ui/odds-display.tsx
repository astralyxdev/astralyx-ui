import type { ComponentProps, ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A selectable odds button that shows which way the price moved.
 *
 * Three formats, converted here rather than by the caller. Decimal, fractional
 * and American describe the same price and every operator has to render all
 * three for different markets — doing the conversion in each call site is how
 * they end up disagreeing.
 *
 * A drift is flagged with an arrow and a colour, which is the one thing a
 * bettor is watching. It is deliberately not animated: odds boards that flash
 * are unusable when several markets move at once.
 */
export type OddsFormat = 'decimal' | 'fractional' | 'american'

/** Decimal is the source of truth; the others are derived from it. */
function formatOdds(decimal: number, format: OddsFormat) {
  if (format === 'decimal') return decimal.toFixed(2)

  if (format === 'american') {
    if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`
    return `${Math.round(-100 / (decimal - 1))}`
  }

  // Fractional: reduce (decimal - 1) to a simple fraction.
  const profit = decimal - 1
  let bestNumerator = 1
  let bestDenominator = 1
  let bestError = Infinity
  for (let denominator = 1; denominator <= 20; denominator++) {
    const numerator = Math.round(profit * denominator)
    const error = Math.abs(profit - numerator / denominator)
    if (error < bestError) {
      bestError = error
      bestNumerator = numerator
      bestDenominator = denominator
    }
  }
  return `${bestNumerator}/${bestDenominator}`
}

function OddsDisplay({
  label,
  odds,
  previousOdds,
  format = 'decimal',
  selected = false,
  suspended = false,
  onSelect,
  driftedLabel = 'drifted out',
  shortenedLabel = 'shortened',
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'onSelect'> & {
  label?: ReactNode
  /** Decimal odds. */
  odds: number
  previousOdds?: number
  format?: OddsFormat
  selected?: boolean
  suspended?: boolean
  onSelect?: () => void
  /** Accessible name when the price lengthens. */
  driftedLabel?: string
  shortenedLabel?: string
}) {
  const drifted = previousOdds !== undefined && previousOdds !== odds
  const up = drifted && odds > previousOdds!
  const down = drifted && odds < previousOdds!

  return (
    <button
      type="button"
      data-slot="odds-display"
      aria-pressed={selected}
      disabled={suspended}
      onClick={onSelect}
      className={cn(
        'flex min-w-20 flex-col items-center gap-0.5 px-3 py-2',
        radius.control,
        interactive,
        focusRing,
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary hover:bg-accent text-foreground',
        suspended && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...props}
    >
      {label && (
        <span className={cn('truncate text-xs', selected ? 'opacity-80' : 'text-muted-foreground')}>
          {label}
        </span>
      )}

      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
        {suspended ? '—' : formatOdds(odds, format)}
        {/* Flagged, not animated: a flashing board is unusable. */}
        {!suspended && up && (
          <ArrowUp className="size-3 text-[var(--green-soft-foreground)]" aria-label={driftedLabel} />
        )}
        {!suspended && down && (
          <ArrowDown className="size-3 text-[var(--destructive-soft-foreground)]" aria-label={shortenedLabel} />
        )}
      </span>
    </button>
  )
}

export { OddsDisplay, formatOdds }
