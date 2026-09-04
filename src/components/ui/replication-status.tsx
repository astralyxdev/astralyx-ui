import type { ComponentProps, ReactNode } from 'react'
import { Database, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A primary and its replicas, with how far behind each one is.
 *
 * **Lag is reported in seconds and bytes, because they answer different
 * questions.** Seconds tell you how stale a read is; bytes tell you whether the
 * replica is catching up or falling further behind. A replica idling at 200MB
 * of unsent WAL shows 0s lag until traffic arrives, and a dashboard with only
 * seconds calls that healthy right up to the moment it is not.
 *
 * A replica that is *disconnected* is drawn as a failure, not as very high lag.
 * They are different problems: one needs patience, the other needs someone.
 */
export type Replica = {
  id: string
  name: string
  /** Seconds behind the primary. */
  lagSeconds?: number
  /** Bytes of replication log not yet applied. */
  lagBytes?: number
  state?: 'streaming' | 'catchup' | 'disconnected'
  /** Serves reads. */
  readable?: boolean
  region?: string
  meta?: ReactNode
}

type ReplicationStatusProps = Omit<ComponentProps<'div'>, 'children'> & {
  primary: { name: string; region?: string; writes?: ReactNode }
  replicas: Replica[]
  /** Lag above this many seconds is a problem. */
  warnSeconds?: number
  formatBytes?: (bytes: number) => string
  primaryLabel?: string
  readableLabel?: string
  emptyLabel?: string
  label?: string
}

const STATE: Record<NonNullable<Replica['state']>, { label: string; color: 'green' | 'amber' | 'destructive' }> = {
  streaming: { label: 'Streaming', color: 'green' },
  catchup: { label: 'Catching up', color: 'amber' },
  disconnected: { label: 'Disconnected', color: 'destructive' },
}

function ReplicationStatus({
  primary,
  replicas,
  warnSeconds = 10,
  formatBytes = (bytes) => `${(bytes / 1_048_576).toFixed(1)} MB`,
  primaryLabel = 'Primary',
  readableLabel = 'reads',
  emptyLabel = 'No replicas — this database has no read redundancy.',
  label = 'Replication',
  className,
  ...props
}: ReplicationStatusProps) {
  return (
    <div
      data-slot="replication-status"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
        {label}
      </p>

      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <Database className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="truncate font-mono text-sm font-medium">{primary.name}</code>
            <Badge size="sm" color="blue">{primaryLabel}</Badge>
          </div>
          {primary.region && (
            <p className="text-muted-foreground/60 mt-0.5 font-mono text-[11px]">{primary.region}</p>
          )}
        </div>
        {primary.writes && (
          <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
            {primary.writes}
          </span>
        )}
      </div>

      {replicas.length === 0 ? (
        <p className="flex items-start gap-2 px-4 py-3 text-xs text-[var(--amber-soft-foreground)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-border list-none divide-y">
          {replicas.map((replica) => {
            const state = STATE[replica.state ?? 'streaming']
            const lagging =
              replica.state !== 'disconnected' &&
              replica.lagSeconds !== undefined &&
              replica.lagSeconds > warnSeconds

            return (
              <li key={replica.id} className="flex items-center gap-3 px-4 py-3 ps-8">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="truncate font-mono text-xs">{replica.name}</code>
                    <Badge size="sm" color={state.color}>{state.label}</Badge>
                    {replica.readable && (
                      <span className="text-muted-foreground/50 text-[11px]">{readableLabel}</span>
                    )}
                  </div>
                  {(replica.region || replica.meta) && (
                    <p className="text-muted-foreground/60 mt-0.5 flex gap-x-3 font-mono text-[11px]">
                      {replica.region}
                      {replica.meta}
                    </p>
                  )}
                </div>

                {/* Both numbers: seconds say how stale a read is, bytes say
                    whether it is catching up or falling further behind. */}
                <div className="flex shrink-0 flex-col items-end gap-0.5 font-mono text-[11px] tabular-nums">
                  {replica.lagSeconds !== undefined && (
                    <span
                      className={cn(
                        lagging ? 'text-[var(--destructive-soft-foreground)]' : 'text-foreground',
                      )}
                    >
                      {replica.lagSeconds.toFixed(1)}s
                    </span>
                  )}
                  {replica.lagBytes !== undefined && (
                    <span className="text-muted-foreground/60">{formatBytes(replica.lagBytes)}</span>
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

export { ReplicationStatus }
export type { ReplicationStatusProps }
