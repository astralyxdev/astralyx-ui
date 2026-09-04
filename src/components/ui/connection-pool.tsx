import type { ComponentProps, ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A database connection pool: what is in use, idle, and waiting.
 *
 * **Waiting is the number that matters, and it is not part of the pool.** A
 * pool at 100% utilisation is fine if nothing is queued — it means the pool is
 * exactly the right size. The same pool with twelve requests waiting is an
 * outage forming. So the bar shows the pool, and waiters are drawn beyond its
 * end rather than folded into it, because they are demand the pool cannot meet.
 *
 * Idle connections are shown rather than hidden. A pool sitting at two active
 * and thirty idle is paying to keep thirty sockets open against a database with
 * a connection limit, and that is a real finding.
 */
type ConnectionPoolProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Checked out and running a query. */
  active: number
  /** Open but unused. */
  idle: number
  /** Pool ceiling. */
  max: number
  /** Requests queued for a connection. The number that signals trouble. */
  waiting?: number
  /** Mean wait before a connection is handed over, in ms. */
  waitMs?: number
  label?: ReactNode
  activeLabel?: string
  idleLabel?: string
  waitingLabel?: string
  saturatedLabel?: (waiting: number) => ReactNode
}

function ConnectionPool({
  active,
  idle,
  max,
  waiting = 0,
  waitMs,
  label = 'Connection pool',
  activeLabel = 'active',
  idleLabel = 'idle',
  waitingLabel = 'waiting',
  saturatedLabel = (count) => `${count} request${count === 1 ? '' : 's'} queued for a connection`,
  className,
  ...props
}: ConnectionPoolProps) {
  const open = active + idle
  const spare = Math.max(0, max - open)

  return (
    <div
      data-slot="connection-pool"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground font-mono text-xs tabular-nums">
          {open} / {max}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-muted flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">
          <span
            className="h-full bg-[var(--blue-soft-foreground)]"
            style={{ width: `${(active / max) * 100}%`, minWidth: active > 0 ? 2 : 0 }}
          />
          <span
            className="h-full bg-muted-foreground/30"
            style={{ width: `${(idle / max) * 100}%`, minWidth: idle > 0 ? 2 : 0 }}
          />
          <span style={{ width: `${(spare / max) * 100}%` }} />
        </div>

        {/* Beyond the pool's end, deliberately: waiters are demand the pool
            cannot meet, not a slice of it. */}
        {waiting > 0 && (
          <span
            className="flex h-2.5 shrink-0 items-center rounded-full bg-[var(--destructive-soft-foreground)] px-1.5 text-[9px] font-medium text-white tabular-nums"
            title={`${waiting} ${waitingLabel}`}
          >
            +{waiting}
          </span>
        )}
      </div>

      <ul className="text-muted-foreground flex list-none flex-wrap gap-x-4 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-[var(--blue-soft-foreground)]" />
          <span className="tabular-nums">{active}</span> {activeLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-muted-foreground/30 size-2 rounded-full" />
          <span className="tabular-nums">{idle}</span> {idleLabel}
        </li>
        {waitMs !== undefined && (
          <li className="tabular-nums">mean wait {Math.round(waitMs)}ms</li>
        )}
      </ul>

      {waiting > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {saturatedLabel(waiting)}
        </p>
      )}
    </div>
  )
}

export { ConnectionPool }
export type { ConnectionPoolProps }
