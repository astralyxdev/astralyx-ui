import type { ComponentProps, ReactNode } from 'react'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBytes } from '@/components/ui/storage-usage'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The indexes on a table, and which of them are dead weight.
 *
 * An unused index is not free: it is written on every insert, update and
 * delete, it takes space, and it makes the planner's job harder. They
 * accumulate because adding one is easy and nobody ever checks back — so the
 * scan count is the column this component exists to show, and zero is flagged.
 *
 * A primary key with no scans is *not* flagged. It enforces uniqueness whether
 * or not anything reads through it, and a component that suggests dropping one
 * is giving advice that loses data.
 *
 * Duplicate indexes — same columns in the same order — are called out
 * separately, because that is the other way this list quietly grows.
 */
export type DatabaseIndex = {
  name: string
  /** Columns, in index order. Order matters for a composite index. */
  columns: string[]
  unique?: boolean
  primary?: boolean
  /** Bytes on disk. */
  size?: number
  /** Times the planner used it. Zero is what makes an index dead weight. */
  scans?: number
  meta?: ReactNode
}

/** Indexes covering the same columns in the same order. */
export function duplicateIndexes(indexes: DatabaseIndex[]) {
  const seen = new Map<string, string[]>()
  for (const index of indexes) {
    const key = index.columns.join(',')
    seen.set(key, [...(seen.get(key) ?? []), index.name])
  }
  return new Set([...seen.values()].filter((names) => names.length > 1).flat())
}

type IndexListProps = Omit<ComponentProps<'div'>, 'children'> & {
  indexes: DatabaseIndex[]
  unusedLabel?: string
  duplicateLabel?: string
  primaryLabel?: string
  uniqueLabel?: string
  scansLabel?: string
  emptyLabel?: string
  format?: (bytes: number) => string
  label?: string
}

function IndexList({
  indexes,
  unusedLabel = 'never scanned',
  duplicateLabel = 'duplicate',
  primaryLabel = 'primary',
  uniqueLabel = 'unique',
  scansLabel = 'scans',
  emptyLabel = 'No indexes on this table.',
  format = formatBytes,
  label = 'Indexes',
  className,
  ...props
}: IndexListProps) {
  const duplicates = duplicateIndexes(indexes)

  return (
    <div
      data-slot="index-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
        {label}
      </p>

      {indexes.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="divide-border list-none divide-y">
          {indexes.map((index) => {
            // A primary key earns its keep by enforcing uniqueness, whether or
            // not anything reads through it. Flagging one is advice that loses
            // data.
            const unused = index.scans === 0 && !index.primary
            const duplicate = duplicates.has(index.name)

            return (
              <li key={index.name} className="flex items-start gap-3 px-4 py-3">
                <KeyRound
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    unused || duplicate
                      ? 'text-[var(--amber-soft-foreground)]'
                      : 'text-muted-foreground/50',
                  )}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="truncate font-mono text-xs font-medium">{index.name}</code>
                    {index.primary && <Badge size="sm" color="blue">{primaryLabel}</Badge>}
                    {index.unique && !index.primary && (
                      <Badge size="sm" variant="outline">{uniqueLabel}</Badge>
                    )}
                    {unused && (
                      <Badge size="sm" color="amber">
                        <TriangleAlert className="size-3" aria-hidden="true" />
                        {unusedLabel}
                      </Badge>
                    )}
                    {duplicate && <Badge size="sm" color="amber">{duplicateLabel}</Badge>}
                  </div>

                  <p className="text-muted-foreground mt-1 font-mono text-[11px]">
                    ({index.columns.join(', ')})
                  </p>
                  {index.meta && (
                    <p className="text-muted-foreground/60 mt-0.5 text-[11px]">{index.meta}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {index.size !== undefined && (
                    <span className="font-mono text-[11px] tabular-nums">{format(index.size)}</span>
                  )}
                  {index.scans !== undefined && (
                    <span
                      className={cn(
                        'text-[11px] tabular-nums',
                        unused ? 'text-[var(--amber-soft-foreground)]' : 'text-muted-foreground/60',
                      )}
                    >
                      {index.scans.toLocaleString()} {scansLabel}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { IndexList }
export type { IndexListProps }
