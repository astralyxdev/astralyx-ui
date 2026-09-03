import type { ComponentProps, ReactNode } from 'react'
import { Check, ExternalLink, TriangleAlert, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { WalletAddress } from '@/components/ui/wallet-address'
import { Fmt } from '@/components/ui/fmt'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A transaction's progress from submitted to final.
 *
 * Confirmations are shown as progress toward a threshold, not as a tick the
 * moment the transaction is mined. One confirmation is not settlement — chains
 * reorganise — and an interface that says "done" at one block is teaching a
 * habit that eventually costs someone money.
 *
 * A reverted transaction is a distinct state from a failed submission: it was
 * mined, it consumed gas, and it is on-chain. Collapsing the two hides the fact
 * that the user paid for it.
 */
export type TxState = 'pending' | 'mined' | 'confirmed' | 'reverted' | 'dropped'

const STATE = {
  pending: { label: 'Pending', tone: 'text-[var(--amber-soft-foreground)]' },
  mined: { label: 'Mined', tone: 'text-[var(--blue-soft-foreground)]' },
  confirmed: { label: 'Confirmed', tone: 'text-[var(--green-soft-foreground)]' },
  reverted: { label: 'Reverted', tone: 'text-[var(--destructive-soft-foreground)]' },
  dropped: { label: 'Dropped', tone: 'text-muted-foreground' },
} as const

function TransactionStatus({
  hash,
  state,
  confirmations = 0,
  required = 12,
  href,
  summary,
  submittedAt,
  now,
  gasUsed,
  error,
  explorerLabel = 'View transaction on block explorer',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  hash: string
  state: TxState
  confirmations?: number
  /** Blocks before this counts as settled. */
  required?: number
  href?: string
  summary?: ReactNode
  submittedAt?: Date
  now?: Date
  gasUsed?: ReactNode
  error?: ReactNode
  /** Accessible name for the explorer link. */
  explorerLabel?: string
}) {
  const meta = STATE[state]
  const settled = state === 'confirmed'
  const failed = state === 'reverted' || state === 'dropped'
  const progress = Math.min(confirmations / Math.max(required, 1), 1)

  return (
    <div
      data-slot="transaction-status"
      data-state={state}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <span className={cn('mt-0.5 shrink-0', meta.tone)} aria-hidden="true">
          {state === 'pending' ? (
            <Spinner size="xs" label="Pending" />
          ) : settled ? (
            <Check className="size-4" />
          ) : state === 'reverted' ? (
            <X className="size-4" />
          ) : state === 'dropped' ? (
            <TriangleAlert className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', meta.tone)}>{meta.label}</p>
          {summary && (
            <p className="text-muted-foreground mt-0.5 text-sm">{summary}</p>
          )}
        </div>

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={explorerLabel}
            className={cn('text-muted-foreground hover:text-foreground shrink-0', radius.xs, focusRing)}
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      {/* Progress toward settlement, not a tick at one block. */}
      {!failed && (
        <div className="flex flex-col gap-1.5">
          <div className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs">
            <span>{settled ? 'Settled' : 'Confirmations'}</span>
            <span className="tabular-nums">
              {Math.min(confirmations, required)} / {required}
            </span>
          </div>
          <Progress value={progress * 100} className="h-1.5" />
        </div>
      )}

      {error && (
        <p className="text-[var(--destructive-soft-foreground)] text-xs">{error}</p>
      )}

      <div className="text-muted-foreground/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <WalletAddress address={hash} chars={10} size="sm" />
        {submittedAt && (
          <span>
            submitted <Fmt type="relative" value={submittedAt} now={now} />
          </span>
        )}
        {gasUsed && <span>gas {gasUsed}</span>}
      </div>
    </div>
  )
}

export { TransactionStatus }
