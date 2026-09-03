import type { ComponentProps, ReactNode } from 'react'
import { Check, Clock, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Database migrations, applied and pending.
 *
 * Order is the version string, never the array order. Migrations are named by
 * timestamp precisely so they sort deterministically, and a list that trusts
 * the order it was handed will show a rebase artefact as the real sequence.
 *
 * A migration applied *out of order* — one whose version predates an
 * already-applied migration — is flagged. That is the signature of two branches
 * merged without rebasing, and it means the schema on this database is not the
 * schema any single branch describes.
 *
 * Irreversible migrations are marked. Knowing there is no down-path before you
 * run something is the difference between a rollback and a restore from backup.
 */
export type MigrationState = 'applied' | 'pending' | 'failed' | 'rolled-back'

export type Migration = {
  /** Sortable identifier — usually a timestamp prefix. */
  version: string
  name: ReactNode
  state: MigrationState
  appliedAt?: Date
  /** Execution time in milliseconds. */
  duration?: number
  /** No down migration exists. */
  irreversible?: boolean
  error?: ReactNode
}

const STATE = {
  applied: { label: 'Applied', color: 'green', Icon: Check },
  pending: { label: 'Pending', color: 'amber', Icon: Clock },
  failed: { label: 'Failed', color: 'destructive', Icon: X },
  'rolled-back': { label: 'Rolled back', color: 'neutral', Icon: TriangleAlert },
} as const

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_PENDING_SUMMARY: (count: number) => ReactNode = (count) => `${count} pending`

function MigrationList({
  migrations,
  now,
  locale = 'en-GB',
  emptyLabel = 'No migrations',
  irreversibleLabel = 'irreversible',
  outOfOrderLabel = 'out of order',
  outOfOrderNote = 'Applied after a later version — the usual sign of two branches merged without a rebase.',
  pendingSummary = DEFAULT_PENDING_SUMMARY,
  className,
  ...props
}: ComponentProps<'div'> & {
  migrations: Migration[]
  now?: Date
  locale?: string
  emptyLabel?: ReactNode
  irreversibleLabel?: ReactNode
  outOfOrderLabel?: ReactNode
  outOfOrderNote?: ReactNode
  pendingSummary?: (count: number) => ReactNode
}) {
  // Sorted by version, never by the order the caller happened to supply.
  const rows = [...migrations].sort((a, b) => a.version.localeCompare(b.version))

  // Walk in the order they were actually applied: a migration whose version
  // precedes one already run is a merge artefact, not a sequence.
  const ordered = [...rows].sort((a, b) => {
    const at = a.appliedAt?.getTime() ?? Infinity
    const bt = b.appliedAt?.getTime() ?? Infinity
    return at - bt
  })
  const outOfOrder = new Set<string>()
  let seen = ''
  for (const row of ordered) {
    if (row.state !== 'applied') continue
    if (seen && row.version < seen) outOfOrder.add(row.version)
    else seen = row.version
  }

  const pending = rows.filter((row) => row.state === 'pending').length

  if (rows.length === 0) {
    return (
      <div className={cn(surface, radius.surface, className)} {...props}>
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      data-slot="migration-list"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {pending > 0 && (
        <div className="border-border flex items-center gap-2 border-b p-3">
          <Clock className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{pendingSummary(pending)}</span>
        </div>
      )}

      <ul className="divide-border/60 list-none divide-y">
        {rows.map((migration) => {
          const meta = STATE[migration.state]
          const Icon = meta.Icon
          const misordered = outOfOrder.has(migration.version)

          return (
            <li key={migration.version} className="flex items-start gap-3 p-3">
              <Icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  migration.state === 'applied' && 'text-[var(--green-soft-foreground)]',
                  migration.state === 'failed' && 'text-[var(--destructive-soft-foreground)]',
                  migration.state === 'pending' && 'text-[var(--amber-soft-foreground)]',
                  migration.state === 'rolled-back' && 'text-muted-foreground',
                )}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <code className="text-muted-foreground shrink-0 font-mono text-xs">
                    {migration.version}
                  </code>
                  <span className="min-w-0 flex-1 truncate text-sm">{migration.name}</span>
                  {migration.irreversible && (
                    <Badge size="sm" color="amber">
                      {irreversibleLabel}
                    </Badge>
                  )}
                  {misordered && (
                    <Badge size="sm" color="destructive">
                      {outOfOrderLabel}
                    </Badge>
                  )}
                </p>

                <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                  <span>{meta.label}</span>
                  {migration.appliedAt && (
                    <Fmt type="relative" value={migration.appliedAt} now={now} locale={locale} />
                  )}
                  {migration.duration !== undefined && (
                    <span className="tabular-nums">{migration.duration}ms</span>
                  )}
                </p>

                {misordered && (
                  <p className="text-[var(--destructive-soft-foreground)] mt-1 text-xs">
                    {outOfOrderNote}
                  </p>
                )}
                {migration.error && (
                  <p className="text-[var(--destructive-soft-foreground)] mt-1 font-mono text-xs">
                    {migration.error}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { MigrationList }
