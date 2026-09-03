import type { ComponentProps, ReactNode } from 'react'
import { Globe, Lock, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Published ports, with what is actually listening.
 *
 * The bind address is shown, not just the port. `0.0.0.0:5432` and
 * `127.0.0.1:5432` are the difference between a database on the internet and a
 * database on the machine, and a table that prints only the number hides the
 * one that matters.
 *
 * Ports bound to all interfaces without TLS are flagged. That combination is
 * the actual finding; either alone is often fine.
 *
 * Well-known ports get their conventional service name, because 5432 means
 * nothing to someone who does not already know it is Postgres.
 *
 * One grid owns the columns and every row inherits them through `subgrid`.
 * Giving each row its own grid looks identical in a mock-up and drifts in
 * practice: `1fr` and `auto` resolve against whatever that row happens to
 * contain, so a row carrying an "exposed" badge squeezes its neighbours while
 * an empty one does not, and no two rows line up.
 */
export type PortBinding = {
  id: string
  /** Port on the host. */
  port: number
  /** Port inside the container or process. */
  targetPort?: number
  protocol?: 'tcp' | 'udp'
  /** Interface it is bound to. `0.0.0.0` is every interface. */
  address?: string
  process?: ReactNode
  tls?: boolean
  service?: string
}

const WELL_KNOWN: Record<number, string> = {
  22: 'ssh', 25: 'smtp', 53: 'dns', 80: 'http', 443: 'https',
  3000: 'node', 3306: 'mysql', 5432: 'postgres', 5672: 'amqp',
  6379: 'redis', 8080: 'http-alt', 9000: 'minio', 9090: 'prometheus',
  9200: 'elasticsearch', 27017: 'mongodb',
}

const PUBLIC = new Set(['0.0.0.0', '::', '*', ''])

function PortTable({
  ports,
  emptyLabel = 'No published ports',
  portHeader = 'Port',
  addressHeader = 'Bind',
  processHeader = 'Process',
  exposedLabel = 'exposed',
  tlsLabel = 'TLS',
  exposedNote = 'Bound to every interface without TLS — reachable from outside the host in the clear.',
  className,
  ...props
}: ComponentProps<'div'> & {
  ports: PortBinding[]
  emptyLabel?: ReactNode
  portHeader?: ReactNode
  addressHeader?: ReactNode
  processHeader?: ReactNode
  exposedLabel?: ReactNode
  /** Accessible name for the TLS marker. */
  tlsLabel?: string
  exposedNote?: ReactNode
}) {
  if (ports.length === 0) {
    return (
      <div className={cn(surface, radius.surface, className)} {...props}>
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      </div>
    )
  }

  const risky = ports.some((p) => PUBLIC.has(p.address ?? '0.0.0.0') && !p.tls)

  return (
    <div
      data-slot="port-table"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="grid grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="border-border text-muted-foreground col-span-4 grid grid-cols-subgrid items-center gap-3 border-b p-3 text-xs font-medium">
          <span>{portHeader}</span>
          <span>{addressHeader}</span>
          <span>{processHeader}</span>
          <span />
        </div>

        <ul className="divide-border/60 col-span-4 grid grid-cols-subgrid list-none divide-y">
        {ports.map((binding) => {
          const address = binding.address ?? '0.0.0.0'
          const open = PUBLIC.has(address)
          const name = binding.service ?? WELL_KNOWN[binding.port]

          return (
            <li
              key={binding.id}
              className="col-span-4 grid grid-cols-subgrid items-center gap-3 p-3"
            >
              <span className="font-mono text-xs tabular-nums">
                {binding.port}
                {binding.targetPort !== undefined && binding.targetPort !== binding.port && (
                  <span className="text-muted-foreground/60">→{binding.targetPort}</span>
                )}
                {binding.protocol === 'udp' && (
                  <span className="text-muted-foreground/60">/udp</span>
                )}
              </span>

              {/* The bind address is the finding, not the port number. */}
              <span className="flex min-w-0 items-center gap-1.5">
                <code
                  className={cn(
                    'truncate font-mono text-xs',
                    open ? 'text-[var(--amber-soft-foreground)]' : 'text-muted-foreground',
                  )}
                >
                  {address}
                </code>
                {open && (
                  <Globe className="text-muted-foreground/60 size-3 shrink-0" aria-hidden="true" />
                )}
              </span>

              <span className="min-w-0 truncate text-xs">
                {binding.process ?? <span className="text-muted-foreground/50">—</span>}
                {name && <span className="text-muted-foreground/60 ms-1.5 font-mono">{name}</span>}
              </span>

              <span className="flex shrink-0 items-center gap-1.5">
                {binding.tls && (
                  <Lock
                    className="size-3.5 text-[var(--green-soft-foreground)]"
                    aria-label={tlsLabel}
                  />
                )}
                {open && !binding.tls && (
                  <Badge size="sm" color="amber">
                    {exposedLabel}
                  </Badge>
                )}
              </span>
              </li>
            )
          })}
        </ul>
      </div>

      {risky && exposedNote && (
        <p className="border-border text-[var(--amber-soft-foreground)] flex items-start gap-1.5 border-t p-3 text-xs">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {exposedNote}
        </p>
      )}
    </div>
  )
}

export { PortTable, WELL_KNOWN as wellKnownPorts }
