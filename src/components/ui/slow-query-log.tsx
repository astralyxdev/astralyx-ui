import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/ui/code-block'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The queries costing you the most, ranked by total time.
 *
 * **Total time, not mean.** The query everyone finds first is the 9-second
 * report that runs twice a day; the one actually saturating the database is the
 * 40ms lookup running four thousand times a minute. Ranking by `mean × calls`
 * surfaces the second, which is the whole point of a slow query log and the
 * thing a naive "slowest queries" list gets backwards.
 *
 * Statements are normalised by the caller — `$1` rather than a literal — so the
 * same query with different parameters aggregates into one row instead of ten
 * thousand.
 *
 * A query with no index scan is flagged. It is the single most actionable
 * finding here and it is invisible in the timings alone.
 */
export type SlowQuery = {
  id: string
  /** Normalised statement — parameters replaced with placeholders. */
  statement: string
  /** Executions in the window. */
  calls: number
  /** Milliseconds. */
  meanMs: number
  p95Ms?: number
  /** Rows returned per call, on average. */
  rows?: number
  /** No index was used. */
  seqScan?: boolean
  meta?: ReactNode
}

type SlowQueryLogProps = Omit<ComponentProps<'div'>, 'children'> & {
  queries: SlowQuery[]
  /** Rank by total time rather than by mean. */
  rankByTotal?: boolean
  seqScanLabel?: string
  emptyLabel?: string
  formatDuration?: (ms: number) => string
  headers?: { query?: string; calls?: string; mean?: string; total?: string }
  label?: string
}

function defaultDuration(ms: number) {
  if (ms < 1) return `${ms.toFixed(2)}ms`
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
}

function SlowQueryLog({
  queries,
  rankByTotal = true,
  seqScanLabel = 'no index',
  emptyLabel = 'No queries in this window.',
  formatDuration = defaultDuration,
  headers,
  label = 'Slow queries',
  className,
  ...props
}: SlowQueryLogProps) {
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => {
    const withTotal = queries.map((query) => ({ ...query, totalMs: query.meanMs * query.calls }))
    // A copy — sorting the caller's array in place is a side effect on a prop.
    return rankByTotal
      ? [...withTotal].sort((a, b) => b.totalMs - a.totalMs)
      : [...withTotal].sort((a, b) => b.meanMs - a.meanMs)
  }, [queries, rankByTotal])

  const worst = Math.max(1, ...rows.map((row) => row.totalMs))

  return (
    <div
      data-slot="slow-query-log"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border text-muted-foreground/70 flex items-center gap-3 border-b px-4 py-2 text-[11px] tracking-wide uppercase">
        <span className="min-w-0 flex-1">{headers?.query ?? label}</span>
        <span className="w-16 shrink-0 text-end">{headers?.calls ?? 'Calls'}</span>
        <span className="w-16 shrink-0 text-end">{headers?.mean ?? 'Mean'}</span>
        <span className="w-20 shrink-0 text-end">{headers?.total ?? 'Total'}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="divide-border/60 list-none divide-y">
          {rows.map((row) => {
            const expanded = open === row.id
            return (
              <li key={row.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Hide' : 'Show'} the statement`}
                  onClick={() => setOpen(expanded ? null : row.id)}
                  className="hover:bg-accent/40 flex w-full items-center gap-3 px-4 py-2.5 text-start"
                >
                  <ChevronRight
                    className={cn(
                      'text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                      expanded && 'rotate-90',
                    )}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <code className="block truncate font-mono text-xs">{row.statement}</code>
                    {/* Ranked bar: the row taking the most database time is the
                        longest, which is the ordering that matters. */}
                    <div className="bg-muted/60 mt-1.5 h-1 w-full overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          row.seqScan
                            ? 'bg-[var(--amber-soft-foreground)]'
                            : 'bg-muted-foreground/50',
                        )}
                        style={{ width: `${Math.max(2, (row.totalMs / worst) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {row.seqScan && (
                    <Badge size="sm" color="amber" className="shrink-0">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      {seqScanLabel}
                    </Badge>
                  )}

                  <span className="text-muted-foreground w-16 shrink-0 text-end font-mono text-[11px] tabular-nums">
                    {row.calls.toLocaleString()}
                  </span>
                  <span className="w-16 shrink-0 text-end font-mono text-[11px] tabular-nums">
                    {formatDuration(row.meanMs)}
                  </span>
                  <span className="w-20 shrink-0 text-end font-mono text-[11px] font-medium tabular-nums">
                    {formatDuration(row.totalMs)}
                  </span>
                </button>

                {expanded && (
                  <div className="px-4 pb-3">
                    <CodeBlock code={row.statement} language="sql" header={false} />
                    {(row.rows !== undefined || row.p95Ms !== undefined || row.meta) && (
                      <p className="text-muted-foreground/70 mt-2 flex flex-wrap gap-x-4 text-[11px] tabular-nums">
                        {row.p95Ms !== undefined && <span>p95 {formatDuration(row.p95Ms)}</span>}
                        {row.rows !== undefined && <span>{row.rows.toLocaleString()} rows/call</span>}
                        {row.meta}
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { SlowQueryLog }
export type { SlowQueryLogProps }
