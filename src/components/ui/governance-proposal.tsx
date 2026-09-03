import type { ComponentProps, ReactNode } from 'react'
import { Check, Clock, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A governance proposal with its tally.
 *
 * Quorum is tracked separately from the majority, because they are separate
 * tests and a proposal routinely passes one and fails the other. A bar showing
 * 92% "for" reads as passing right up until it fails for turnout, so the quorum
 * line is always rendered — never hidden once met.
 *
 * Abstain counts toward quorum but not toward the majority. That is the whole
 * point of an abstain vote, and a component that folds it into "against" gets
 * the outcome wrong.
 */
export type ProposalState = 'pending' | 'active' | 'passed' | 'defeated' | 'executed' | 'cancelled'

const STATE = {
  pending: { label: 'Pending', color: 'neutral' },
  active: { label: 'Active', color: 'blue' },
  passed: { label: 'Passed', color: 'green' },
  defeated: { label: 'Defeated', color: 'destructive' },
  executed: { label: 'Executed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'neutral' },
} as const

function GovernanceProposal({
  id,
  title,
  state,
  forVotes,
  againstVotes,
  abstainVotes = 0,
  quorum,
  endsAt,
  now,
  summary,
  proposer,
  onVote,
  locale = 'en-GB',
  endsLabel = 'ends',
  forLabel = 'For',
  againstLabel = 'Against',
  abstainLabel = 'Abstain',
  quorumNote = 'Without quorum this proposal fails regardless of the vote.',
  proposedByLabel = 'Proposed by',
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'title' | 'id'> & {
  id: ReactNode
  title: ReactNode
  state: ProposalState
  forVotes: number
  againstVotes: number
  /** Counts toward quorum, never toward the majority. */
  abstainVotes?: number
  /** Votes required for the result to count at all. */
  quorum?: number
  endsAt?: Date
  now?: Date
  summary?: ReactNode
  proposer?: ReactNode
  onVote?: (choice: 'for' | 'against' | 'abstain') => void
  locale?: string
  /** Precedes the closing time. */
  endsLabel?: ReactNode
  forLabel?: ReactNode
  againstLabel?: ReactNode
  abstainLabel?: ReactNode
  /** Shown while the vote is short of quorum. */
  quorumNote?: ReactNode
  /** Precedes the proposer. */
  proposedByLabel?: ReactNode
}) {
  const meta = STATE[state]
  const decisive = forVotes + againstVotes
  const turnout = decisive + abstainVotes
  const forShare = decisive > 0 ? forVotes / decisive : 0
  const quorumMet = quorum === undefined || turnout >= quorum

  const num = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })

  return (
    <article
      data-slot="governance-proposal"
      data-state={state}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs">{id}</span>
        <Badge size="sm" color={meta.color}>
          {meta.label}
        </Badge>
        {endsAt && state === 'active' && (
          <span className="text-muted-foreground ms-auto inline-flex items-center gap-1 text-xs">
            <Clock className="size-3.5" aria-hidden="true" />
            {endsLabel} <Fmt type="relative" value={endsAt} now={now} locale={locale} />
          </span>
        )}
      </div>

      <h3 className="text-sm font-medium text-pretty">{title}</h3>
      {summary && <p className="text-muted-foreground text-sm">{summary}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex h-2 w-full overflow-hidden rounded-full [corner-shape:round]">
          <span
            className="bg-[var(--green)]"
            style={{ width: `${forShare * 100}%` }}
          />
          <span
            className="bg-[var(--destructive)]"
            style={{ width: `${(1 - forShare) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
          <span className="text-[var(--green-soft-foreground)]">
            {forLabel} {num.format(forVotes)} · {Math.round(forShare * 100)}%
          </span>
          <span className="text-[var(--destructive-soft-foreground)]">
            {againstLabel} {num.format(againstVotes)}
          </span>
          {abstainVotes > 0 && (
            <span className="text-muted-foreground">
            {abstainLabel} {num.format(abstainVotes)}
          </span>
          )}
        </div>
      </div>

      {/* Always rendered — a 92% "for" reads as passing until turnout fails. */}
      {quorum !== undefined && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className={cn(quorumMet ? 'text-muted-foreground' : 'text-[var(--amber-soft-foreground)]')}>
              Quorum {quorumMet ? 'met' : 'not met'}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {num.format(turnout)} / {num.format(quorum)}
            </span>
          </div>
          <div className="bg-secondary h-1 w-full overflow-hidden rounded-full [corner-shape:round]">
            <span
              className={cn(
                'block h-full rounded-full [corner-shape:round]',
                quorumMet ? 'bg-[var(--green)]' : 'bg-[var(--amber)]',
              )}
              style={{ width: `${Math.min(turnout / quorum, 1) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!quorumMet && state === 'active' && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--amber-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {quorumNote}
        </p>
      )}

      {proposer && (
        <p className="text-muted-foreground/80 text-xs">
          {proposedByLabel} {proposer}
        </p>
      )}

      {onVote && state === 'active' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="flex-1" onClick={() => onVote('for')}>
            <Check />
            {forLabel}
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onVote('against')}>
            <X />
            {againstLabel}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onVote('abstain')}>
            {abstainLabel}
          </Button>
        </div>
      )}
    </article>
  )
}

export { GovernanceProposal }
