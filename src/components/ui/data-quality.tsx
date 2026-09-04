import type { ComponentProps, ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A column profile: how complete, how varied, and what the values look like.
 *
 * The three numbers that decide whether a column is usable, in the order you
 * ask them:
 *
 * **Nulls** — an 80%-null column is not a column you can join on, and the
 * percentage is drawn as a bar because a number in a table is easy to skim past.
 *
 * **Distinct** — one distinct value across a million rows is a constant
 * masquerading as data; a million distinct values is an id, not a dimension.
 * Both are flagged, because both mean the column will not do what a chart
 * expects of it.
 *
 * **Samples** — the fastest way to spot that a "date" column holds
 * `01/02/2024`, `2024-02-01` and `Feb 1` in the same file. No summary statistic
 * catches that; three example values do immediately.
 */
export type ColumnProfile = {
  name: string
  type?: string
  /** Fraction 0–1. */
  nullFraction?: number
  distinct?: number
  /** Total rows profiled, for the distinct ratio. */
  total?: number
  min?: ReactNode
  max?: ReactNode
  /** A few real values. Worth more than any summary statistic. */
  samples?: string[]
}

type DataQualityProps = Omit<ComponentProps<'div'>, 'children'> & {
  columns: ColumnProfile[]
  /** Null fraction above this is flagged. */
  nullWarnAt?: number
  constantLabel?: string
  uniqueLabel?: string
  sparseLabel?: string
  emptyLabel?: string
  label?: string
}

function DataQuality({
  columns,
  nullWarnAt = 0.3,
  constantLabel = 'single value',
  uniqueLabel = 'unique per row',
  sparseLabel = 'mostly empty',
  emptyLabel = 'Nothing profiled.',
  label = 'Column profile',
  className,
  ...props
}: DataQualityProps) {
  return (
    <div
      data-slot="data-quality"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
        {label}
      </p>

      {columns.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="divide-border list-none divide-y">
          {columns.map((column) => {
            const nulls = column.nullFraction ?? 0
            const sparse = nulls >= nullWarnAt
            // A constant and an id are both unusable as a dimension, for
            // opposite reasons.
            const constant = column.distinct === 1
            const unique =
              column.distinct !== undefined &&
              column.total !== undefined &&
              column.total > 0 &&
              column.distinct === column.total

            return (
              <li key={column.name} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-xs font-medium">{column.name}</code>
                  {column.type && (
                    <span className="text-muted-foreground/60 font-mono text-[11px]">
                      {column.type}
                    </span>
                  )}
                  {sparse && (
                    <Badge size="sm" color="amber">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      {sparseLabel}
                    </Badge>
                  )}
                  {constant && <Badge size="sm" color="amber">{constantLabel}</Badge>}
                  {unique && <Badge size="sm" variant="outline">{uniqueLabel}</Badge>}
                </div>

                {column.nullFraction !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          sparse
                            ? 'bg-[var(--amber-soft-foreground)]'
                            : 'bg-muted-foreground/40',
                        )}
                        style={{ width: `${nulls * 100}%`, minWidth: nulls > 0 ? 2 : 0 }}
                      />
                    </div>
                    <span className="text-muted-foreground/60 w-24 shrink-0 text-end text-[11px] tabular-nums">
                      {Math.round(nulls * 100)}% empty
                    </span>
                  </div>
                )}

                <div className="text-muted-foreground/60 flex flex-wrap gap-x-4 gap-y-1 text-[11px] tabular-nums">
                  {column.distinct !== undefined && (
                    <span>{column.distinct.toLocaleString()} distinct</span>
                  )}
                  {column.min !== undefined && <span>min {column.min}</span>}
                  {column.max !== undefined && <span>max {column.max}</span>}
                </div>

                {column.samples && column.samples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {column.samples.map((sample, index) => (
                      <code
                        key={index}
                        className={cn(
                          'bg-secondary text-secondary-foreground max-w-full truncate px-2 py-0.5 font-mono text-[11px]',
                          radius.xs,
                        )}
                      >
                        {sample}
                      </code>
                    ))}
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

export { DataQuality }
export type { DataQualityProps }
