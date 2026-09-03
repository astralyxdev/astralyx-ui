import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DiffView, type DiffFile } from '@/components/ui/diff-view'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A model-proposed edit, with accept and reject.
 *
 * The decision is reported, never applied here — this component has no idea
 * what the file system or editor buffer is. It also refuses to look decided:
 * once a choice is made the actions are replaced by a stated outcome, so a
 * stale card in a transcript cannot be clicked a second time.
 *
 * `rationale` sits above the diff rather than below it. The reason for a change
 * is what you read before deciding, and putting it after a forty-line diff means
 * nobody reads it at all.
 */
export type ProposalDecision = 'accepted' | 'rejected'

function DiffProposal({
  file,
  title,
  rationale,
  view = 'unified',
  decision: decisionProp,
  onDecide,
  acceptLabel = 'Accept',
  rejectLabel = 'Reject',
  acceptedLabel = 'Accepted',
  rejectedLabel = 'Rejected',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  file: DiffFile
  title?: ReactNode
  rationale?: ReactNode
  view?: 'unified' | 'split'
  decision?: ProposalDecision
  onDecide?: (decision: ProposalDecision) => void
  acceptLabel?: ReactNode
  rejectLabel?: ReactNode
  /** Shown once the change is accepted. */
  acceptedLabel?: ReactNode
  rejectedLabel?: ReactNode
}) {
  const controlled = decisionProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<ProposalDecision | undefined>()
  const decision = controlled ? decisionProp : uncontrolled

  function decide(next: ProposalDecision) {
    if (!controlled) setUncontrolled(next)
    onDecide?.(next)
  }

  return (
    <div
      data-slot="diff-proposal"
      data-decision={decision}
      className={cn(
        'border-border overflow-hidden border',
        radius.surface,
        decision && 'opacity-80',
        className,
      )}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-col gap-2 border-b p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[var(--violet-soft-foreground)] size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {title ?? 'Proposed change'}
          </span>
        </div>

        {rationale && (
          <p className="text-muted-foreground text-sm">{rationale}</p>
        )}
      </div>

      <DiffView file={file} view={view} collapsible={false} className="rounded-none border-0" />

      <div className="border-border flex flex-wrap items-center gap-2 border-t p-2">
        {decision ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-1 text-sm font-medium',
              decision === 'accepted'
                ? 'text-[var(--green-soft-foreground)]'
                : 'text-muted-foreground',
            )}
          >
            {decision === 'accepted' ? <Check className="size-4" /> : <X className="size-4" />}
            {decision === 'accepted' ? acceptedLabel : rejectedLabel}
          </span>
        ) : (
          <>
            <Button size="xs" onClick={() => decide('accepted')}>
              <Check />
              {acceptLabel}
            </Button>
            <Button variant="secondary" size="xs" onClick={() => decide('rejected')}>
              <X />
              {rejectLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export { DiffProposal }
