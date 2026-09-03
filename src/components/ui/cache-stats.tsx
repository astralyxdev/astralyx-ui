import type { ComponentProps, ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import { Sparkline } from '@/components/ui/sparkline'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Cache hit rate, with the numbers behind it.
 *
 * Hit rate alone is not interpretable: 99% on 40 requests a day is noise, and
 * 80% on 4 million is a cost centre. Volume is shown beside the percentage for
 * exactly that reason.
 *
 * Evictions are separated from misses. A miss means the key was never there; an
 * eviction means it was there and the cache threw it away, which is a sizing
 * problem rather than a warming problem — and the fix is completely different.
 *
 * The rate is computed here from hits and misses rather than accepted as a
 * prop, so it cannot disagree with the counts printed under it.
 */
function CacheStats({
  hits,
  misses,
  evictions,
  keys,
  bytes,
  history,
  label = 'Cache',
  hitRateLabel = 'hit rate',
  hitsLabel = 'hits',
  missesLabel = 'misses',
  evictionsLabel = 'evictions',
  keysLabel = 'keys',
  sizeLabel = 'size',
  evictionNote = 'Evictions mean the cache is too small for the working set — not that it is cold.',
  locale = 'en-GB',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  hits: number
  misses: number
  evictions?: number
  keys?: number
  bytes?: number
  /** Hit rate over time, 0–1 per sample. */
  history?: number[]
  label?: ReactNode
  hitRateLabel?: ReactNode
  hitsLabel?: ReactNode
  missesLabel?: ReactNode
  evictionsLabel?: ReactNode
  keysLabel?: ReactNode
  sizeLabel?: ReactNode
  /** Shown when evictions are non-zero. */
  evictionNote?: ReactNode
  locale?: string
}) {
  const total = hits + misses
  // Derived, so it cannot disagree with the counts beneath it.
  const rate = total > 0 ? hits / total : 0
  const tone =
    rate >= 0.9 ? 'var(--green)' : rate >= 0.7 ? 'var(--amber)' : 'var(--destructive)'

  return (
    <div
      data-slot="cache-stats"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        <span className="text-muted-foreground ms-auto text-xs tabular-nums">
          <Fmt type="number" value={total} locale={locale} /> requests
        </span>
      </div>

      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums" style={{ color: tone }}>
          <Fmt type="percent" value={rate} decimals={1} locale={locale} />
        </span>
        <span className="text-muted-foreground text-xs">{hitRateLabel}</span>
      </p>

      {history && history.length > 1 && (
        <Sparkline values={history} variant="area" color={tone} className="h-8" />
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{hitsLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="number" value={hits} locale={locale} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{missesLabel}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            <Fmt type="number" value={misses} locale={locale} />
          </dd>
        </div>
        {/* Separate from misses: a sizing problem, not a warming problem. */}
        {evictions !== undefined && (
          <div>
            <dt className="text-muted-foreground">{evictionsLabel}</dt>
            <dd
              className="mt-0.5 font-medium tabular-nums"
              style={{ color: evictions > 0 ? 'var(--amber-soft-foreground)' : undefined }}
            >
              <Fmt type="number" value={evictions} locale={locale} />
            </dd>
          </div>
        )}
        {keys !== undefined && (
          <div>
            <dt className="text-muted-foreground">{keysLabel}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              <Fmt type="number" value={keys} locale={locale} />
            </dd>
          </div>
        )}
        {bytes !== undefined && (
          <div>
            <dt className="text-muted-foreground">{sizeLabel}</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              <Fmt type="bytes" value={bytes} locale={locale} />
            </dd>
          </div>
        )}
      </dl>

      {Boolean(evictions) && evictionNote && (
        <p className="text-muted-foreground border-border border-t pt-3 text-xs">{evictionNote}</p>
      )}
    </div>
  )
}

export { CacheStats }
