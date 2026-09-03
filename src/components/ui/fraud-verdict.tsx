import type { ComponentProps, ReactNode } from 'react'
import { CircleCheck, CircleSlash, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface, tintStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The decision panel at the end of a review: what was decided, on what basis,
 * by whom.
 *
 * Automated and human verdicts are visually distinct. An analyst overriding a
 * model needs to see at a glance whether the thing they are disagreeing with was
 * a rule, a model or a colleague, and "flagged by system" versus "declined by
 * [an analyst]" are different weights of evidence.
 *
 * A pending verdict shows its actions; a settled one shows who settled it and
 * when, and offers to reopen rather than silently accepting a second decision.
 * Two conflicting verdicts on one case is the failure mode this shape prevents.
 *
 * Reasons are listed rather than summarised into a sentence. They end up quoted
 * in appeals and chargeback responses, and a paraphrase is not quotable.
 */
export type Verdict = 'approved' | 'declined' | 'review' | 'pending'

const VERDICT = {
  approved: { label: 'Approved', color: 'var(--green)', icon: CircleCheck },
  declined: { label: 'Declined', color: 'var(--destructive)', icon: CircleSlash },
  review: { label: 'Manual review', color: 'var(--amber)', icon: TriangleAlert },
  pending: { label: 'Awaiting decision', color: 'var(--muted-foreground)', icon: ShieldAlert },
} as const

function FraudVerdict({
  verdict,
  subject,
  reasons,
  decidedBy,
  decidedAt,
  automated = false,
  actions,
  onReopen,
  reopenLabel = 'Reopen',
  className,
  ...props
}: Omit<ComponentProps<'section'>, 'children'> & {
  verdict: Verdict
  /** What was decided on — a withdrawal, an account, a transaction. */
  subject?: ReactNode
  reasons?: ReactNode[]
  decidedBy?: ReactNode
  decidedAt?: Date | string
  /** A rule or model decided this, rather than a person. */
  automated?: boolean
  /** Shown while pending. */
  actions?: ReactNode
  onReopen?: () => void
  reopenLabel?: ReactNode
}) {
  const meta = VERDICT[verdict]
  const Icon = meta.icon
  const settled = verdict !== 'pending'

  return (
    <section
      data-slot="fraud-verdict"
      data-verdict={verdict}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn('flex size-9 shrink-0 items-center justify-center', radius.control)}
          style={tintStyle(meta.color)}
        >
          <Icon className="size-4.5 text-[var(--ui-soft-fg)]" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {meta.label}
            {/* A rule, a model, or a colleague — different weights of evidence. */}
            {settled && (
              <Badge size="sm" color={automated ? 'blue' : 'neutral'}>
                {automated ? 'automated' : 'manual'}
              </Badge>
            )}
          </h3>
          {subject && <p className="text-muted-foreground truncate text-xs">{subject}</p>}
        </div>
      </header>

      {reasons && reasons.length > 0 && (
        <ul className="flex list-none flex-col gap-1.5">
          {reasons.map((reason, index) => (
            <li key={index} className="flex items-start gap-2 text-xs">
              <span
                aria-hidden="true"
                className="mt-1.5 size-1 shrink-0 rounded-full"
                style={{ background: meta.color }}
              />
              <span className="min-w-0 flex-1">{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="border-border flex flex-wrap items-center gap-2 border-t pt-3">
        {settled ? (
          <>
            <span className="text-muted-foreground text-xs">
              {decidedBy && <>by {decidedBy}</>}
              {decidedBy && decidedAt && ' · '}
              {decidedAt && <Fmt type="relative" value={decidedAt} />}
            </span>
            {/* Reopen rather than allow a second, conflicting verdict. */}
            {onReopen && (
              <Button variant="ghost" size="xs" className="ms-auto" onClick={onReopen}>
                {reopenLabel}
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </footer>
    </section>
  )
}

export { FraudVerdict }
