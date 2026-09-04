import type { ComponentProps, ReactNode } from 'react'
import { Archive, RotateCcw, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/components/ui/storage-usage'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Snapshots, and whether any of them would actually restore.
 *
 * **A backup nobody has restored is a hypothesis.** The column this component
 * insists on is `verified` — an untested snapshot is drawn as a warning, not as
 * a success, because the failure mode of backups is discovering at the worst
 * possible moment that they have been silently empty for a month.
 *
 * The age of the newest snapshot is stated in the header rather than left to be
 * worked out from a list of timestamps, since "how much data would we lose" is
 * the only question anyone brings to this screen.
 */
export type Backup = {
  id: string
  /** Already formatted — this component does not own your locale. */
  createdAt: string
  /** Bytes. */
  size?: number
  kind?: 'full' | 'incremental' | 'snapshot'
  /** A restore has actually been tested from this backup. */
  verified?: boolean
  status?: 'complete' | 'running' | 'failed'
  meta?: ReactNode
}

type BackupListProps = Omit<ComponentProps<'div'>, 'children'> & {
  backups: Backup[]
  onRestore?: (backup: Backup) => void
  /** How old the newest backup is, already formatted. */
  newestAge?: ReactNode
  restoreLabel?: string
  unverifiedLabel?: string
  verifiedLabel?: string
  emptyLabel?: string
  format?: (bytes: number) => string
  label?: string
}

function BackupList({
  backups,
  onRestore,
  newestAge,
  restoreLabel = 'Restore',
  unverifiedLabel = 'never test-restored',
  verifiedLabel = 'verified',
  emptyLabel = 'No backups exist for this database.',
  format = formatBytes,
  label = 'Backups',
  className,
  ...props
}: BackupListProps) {
  const unverified = backups.filter((backup) => !backup.verified && backup.status !== 'failed').length

  return (
    <div
      data-slot="backup-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <p className="text-muted-foreground/70 min-w-0 flex-1 text-[11px] font-medium tracking-[0.14em] uppercase">
          {label}
        </p>
        {/* The question everyone actually brings here. */}
        {newestAge !== undefined && (
          <span className="text-muted-foreground font-mono text-[11px]">newest {newestAge}</span>
        )}
      </div>

      {backups.length === 0 ? (
        <p className="flex items-start gap-2 px-4 py-3 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {emptyLabel}
        </p>
      ) : (
        <>
          {unverified > 0 && (
            <p className="border-border border-b px-4 py-2 text-xs text-[var(--amber-soft-foreground)]">
              {unverified} of {backups.length} have never been test-restored.
            </p>
          )}

          <ul className="divide-border list-none divide-y">
            {backups.map((backup) => (
              <li key={backup.id} className="flex items-center gap-3 px-4 py-3">
                <Archive
                  className={cn(
                    'size-4 shrink-0',
                    backup.status === 'failed'
                      ? 'text-[var(--destructive-soft-foreground)]'
                      : 'text-muted-foreground/50',
                  )}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs tabular-nums">{backup.createdAt}</span>
                    {backup.kind && (
                      <Badge size="sm" variant="outline">{backup.kind}</Badge>
                    )}
                    {backup.status === 'failed' && (
                      <Badge size="sm" color="destructive">failed</Badge>
                    )}
                    {backup.status === 'running' && (
                      <Badge size="sm" color="blue">running</Badge>
                    )}
                    {/* A backup nobody has restored is a hypothesis. */}
                    {backup.status !== 'failed' &&
                      (backup.verified ? (
                        <Badge size="sm" color="green">{verifiedLabel}</Badge>
                      ) : (
                        <Badge size="sm" color="amber">{unverifiedLabel}</Badge>
                      ))}
                  </div>
                  {backup.meta && (
                    <p className="text-muted-foreground/60 mt-0.5 text-[11px]">{backup.meta}</p>
                  )}
                </div>

                {backup.size !== undefined && (
                  <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
                    {format(backup.size)}
                  </span>
                )}

                {onRestore && backup.status === 'complete' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-me-2 shrink-0"
                    onClick={() => onRestore(backup)}
                  >
                    <RotateCcw />
                    {restoreLabel}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export { BackupList }
export type { BackupListProps }
