import type { ComponentProps, ReactNode } from 'react'
import { Activity, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * RPC endpoint health: block height, latency, sync state.
 *
 * Staleness is derived from the age of the last block, not reported by the
 * node. A stuck node answers every request cheerfully with an old height — it
 * does not know it is stuck — so "connected" from the node itself proves
 * nothing. Comparing the last block time against the chain's expected block
 * time is what actually catches it.
 */
function NetworkStatus({
  chain,
  blockHeight,
  lastBlockAt,
  now,
  latency,
  /** Seconds between blocks on this chain. Drives the staleness check. */
  blockTime = 12,
  peers,
  locale = 'en-GB',
  blockLabel = 'Block',
  lastBlockLabel = 'Last',
  latencyLabel = 'Latency',
  peersLabel = 'Peers',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  chain: ReactNode
  blockHeight?: number
  lastBlockAt?: Date
  now?: Date
  /** Milliseconds. */
  latency?: number
  blockTime?: number
  peers?: number
  locale?: string
  blockLabel?: ReactNode
  /** Precedes the last-block time. */
  lastBlockLabel?: ReactNode
  latencyLabel?: ReactNode
  peersLabel?: ReactNode
}) {
  const reference = now ?? new Date()
  const age = lastBlockAt ? (reference.getTime() - lastBlockAt.getTime()) / 1000 : undefined

  // Three missed blocks is stuck, not slow.
  const stale = age !== undefined && age > blockTime * 3
  const slow = latency !== undefined && latency > 1000

  const state = stale ? 'stale' : slow ? 'degraded' : 'healthy'
  const tone = { healthy: 'green', degraded: 'amber', stale: 'destructive' } as const
  const label = { healthy: 'Synced', degraded: 'Slow', stale: 'Stale' } as const

  return (
    <div
      data-slot="network-status"
      data-state={state}
      className={cn(surface, radius.surface, 'flex flex-wrap items-center gap-x-4 gap-y-2 p-3', className)}
      {...props}
    >
      <span className="flex items-center gap-2">
        {stale ? (
          <TriangleAlert className="size-4 shrink-0 text-[var(--destructive-soft-foreground)]" aria-hidden="true" />
        ) : (
          <Activity
            className={cn(
              'size-4 shrink-0',
              slow ? 'text-[var(--amber-soft-foreground)]' : 'text-[var(--green-soft-foreground)]',
            )}
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-medium">{chain}</span>
        <Badge size="sm" color={tone[state]}>
          {label[state]}
        </Badge>
      </span>

      <dl className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
        {blockHeight !== undefined && (
          <div className="flex gap-1.5">
            <dt>{blockLabel}</dt>
            <dd className="text-foreground font-medium">
              <Fmt type="number" value={blockHeight} locale={locale} />
            </dd>
          </div>
        )}
        {lastBlockAt && (
          <div className="flex gap-1.5">
            <dt>{lastBlockLabel}</dt>
            <dd className={cn(stale && 'text-[var(--destructive-soft-foreground)] font-medium')}>
              <Fmt type="relative" value={lastBlockAt} now={reference} locale={locale} />
            </dd>
          </div>
        )}
        {latency !== undefined && (
          <div className="flex gap-1.5">
            <dt>{latencyLabel}</dt>
            <dd className={cn(slow && 'text-[var(--amber-soft-foreground)] font-medium')}>
              {latency} ms
            </dd>
          </div>
        )}
        {peers !== undefined && (
          <div className="flex gap-1.5">
            <dt>{peersLabel}</dt>
            <dd>{peers}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export { NetworkStatus }
