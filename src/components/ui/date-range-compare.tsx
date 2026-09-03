import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Fmt } from '@/components/ui/fmt'
import { Select } from '@/components/ui/select'
import { Sparkline } from '@/components/ui/sparkline'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A metric across two periods, with the comparison made explicit.
 *
 * The comparison basis is named, always. "+12%" against what — the previous
 * period, or the same period last year? Those routinely disagree in sign for
 * anything seasonal, and a delta with no stated basis is not a fact.
 *
 * A partial current period is flagged. Comparing four days of this week against
 * seven of last week produces a catastrophic-looking drop that is purely an
 * artefact, and it is the most common misreading in any analytics dashboard.
 */
export type ComparisonBasis = 'previous' | 'year' | 'custom'

const BASIS_LABEL: Record<ComparisonBasis, string> = {
  previous: 'previous period',
  year: 'same period last year',
  custom: 'selected period',
}

function DateRangeCompare({
  label,
  value,
  previous,
  basis = 'previous',
  onBasisChange,
  format = 'number',
  currency = 'USD',
  locale = 'en-GB',
  history,
  /** True while the current period is still running. */
  partial = false,
  goodDirection = 'up',
  rangeLabel,
  noComparisonLabel = 'No comparison',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  label: ReactNode
  value: number
  previous?: number
  basis?: ComparisonBasis
  onBasisChange?: (basis: ComparisonBasis) => void
  format?: 'number' | 'currency' | 'percent' | 'duration'
  currency?: string
  locale?: string
  history?: number[]
  partial?: boolean
  goodDirection?: 'up' | 'down' | 'none'
  rangeLabel?: ReactNode
  /** Shown when no previous value is given. */
  noComparisonLabel?: ReactNode
}) {
  const delta = useMemo(() => {
    if (previous === undefined || previous === 0) return undefined
    return (value - previous) / Math.abs(previous)
  }, [value, previous])

  const rising = (delta ?? 0) > 0
  const falling = (delta ?? 0) < 0
  const good =
    goodDirection === 'none' || delta === undefined || delta === 0
      ? undefined
      : (rising && goodDirection === 'up') || (falling && goodDirection === 'down')

  const Arrow = delta === undefined || delta === 0 ? Minus : rising ? ArrowUp : ArrowDown

  return (
    <div
      data-slot="date-range-compare"
      className={cn(surface, radius.surface, 'flex flex-col gap-2 p-4', className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        {onBasisChange && (
          <Select
            size="xs"
            variant="ghost"
            value={basis}
            onValueChange={(next) => onBasisChange(next as ComparisonBasis)}
            options={[
              { value: 'previous', label: 'vs previous' },
              { value: 'year', label: 'vs last year' },
            ]}
            className="w-auto"
            triggerClassName="w-auto"
          />
        )}
      </div>

      <span className="text-2xl font-semibold tabular-nums">
        <Fmt type={format} value={value} currency={currency} locale={locale} />
      </span>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        {delta !== undefined ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium tabular-nums',
              good === true && 'text-[var(--green-soft-foreground)]',
              good === false && 'text-[var(--destructive-soft-foreground)]',
              good === undefined && 'text-muted-foreground',
            )}
          >
            <Arrow className="size-3.5" aria-hidden="true" />
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="text-muted-foreground">{noComparisonLabel}</span>
        )}

        {/* Never a bare percentage: name what it is measured against. */}
        <span className="text-muted-foreground/80">vs {BASIS_LABEL[basis]}</span>

        {previous !== undefined && (
          <span className="text-muted-foreground/60 tabular-nums">
            (<Fmt type={format} value={previous} currency={currency} locale={locale} />)
          </span>
        )}
      </div>

      {history && history.length > 1 && (
        <Sparkline
          values={history}
          variant="area"
          color={good === false ? 'var(--destructive)' : 'var(--blue)'}
          className="h-10"
        />
      )}

      {rangeLabel && (
        <span className="text-muted-foreground/70 text-xs">{rangeLabel}</span>
      )}

      {/* Four days against seven is a fake collapse. */}
      {partial && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">
          The current period is still running — this comparison is against a
          complete one.
        </p>
      )}
    </div>
  )
}

export { DateRangeCompare }
