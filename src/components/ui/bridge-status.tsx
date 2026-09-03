import type { ComponentProps, ReactNode } from 'react'
import { ArrowRight, Check, TriangleAlert } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A cross-chain transfer, shown as its two legs.
 *
 * Two legs, not one progress bar, because they fail independently and the
 * second cannot begin until the first is final. A single bar implies a transfer
 * that can be at 60% — it cannot; it is either waiting on source finality or
 * waiting on destination execution, and those have very different remedies.
 *
 * The waiting state names what is being waited on. "Pending" for twenty minutes
 * with no explanation is the most common bridge support ticket; "waiting for 64
 * source confirmations" is the same wait with the anxiety removed.
 */
export type BridgeLeg = {
  chain: ReactNode
  state: 'pending' | 'active' | 'done' | 'failed'
  /** e.g. "12 / 64 confirmations" */
  detail?: ReactNode
  progress?: number
  href?: string
}

function BridgeStatus({
  source,
  destination,
  amount,
  startedAt,
  now,
  estimate,
  error,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  source: BridgeLeg
  destination: BridgeLeg
  amount?: ReactNode
  startedAt?: Date
  now?: Date
  /** Expected total time, e.g. "~14 min". */
  estimate?: ReactNode
  error?: ReactNode
}) {
  const Leg = ({ leg, label }: { leg: BridgeLeg; label: string }) => (
    <div className={cn('bg-secondary/60 flex flex-1 flex-col gap-2 p-3', radius.control)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full [corner-shape:round]',
            leg.state === 'done' && 'bg-[var(--green)] text-[var(--green-foreground)]',
            leg.state === 'failed' && 'bg-[var(--destructive)] text-[var(--destructive-foreground)]',
            leg.state === 'pending' && 'bg-border text-muted-foreground',
          )}
        >
          {leg.state === 'done' ? (
            <Check className="size-3" />
          ) : leg.state === 'failed' ? (
            <TriangleAlert className="size-3" />
          ) : leg.state === 'active' ? (
            <Spinner size="xs" label={label} />
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{leg.chain}</span>
      </div>

      <p className="text-muted-foreground text-xs">{label}</p>

      {/* Name the wait — "pending" with no explanation is the support ticket. */}
      {leg.detail && (
        <p className="text-xs tabular-nums">{leg.detail}</p>
      )}
      {leg.progress !== undefined && leg.state === 'active' && (
        <Progress value={leg.progress * 100} className="h-1" />
      )}
    </div>
  )

  return (
    <div
      data-slot="bridge-status"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Bridging {amount}</span>
        {estimate && (
          <span className="text-muted-foreground text-xs">{estimate} expected</span>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        <Leg leg={source} label="Source" />
        <span className="text-muted-foreground/40 flex shrink-0 items-center" aria-hidden="true">
          <ArrowRight className="size-4" />
        </span>
        <Leg leg={destination} label="Destination" />
      </div>

      {error && (
        <p className="text-[var(--destructive-soft-foreground)] text-xs">{error}</p>
      )}

      {startedAt && (
        <p className="text-muted-foreground/80 text-xs">
          Started <Fmt type="relative" value={startedAt} now={now} />
        </p>
      )}
    </div>
  )
}

export { BridgeStatus }
