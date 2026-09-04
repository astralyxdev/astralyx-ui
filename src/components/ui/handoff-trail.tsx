import type { ComponentProps, ReactNode } from 'react'
import { ArrowDown, Bot, TriangleAlert, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Who handled a request, in order, and why each handover happened.
 *
 * A multi-agent system's hardest question is "why did *this* agent answer" —
 * and the answer is never in one agent's transcript, it is in the chain. Each
 * hop records the agent that took over and the reason it was routed there, so a
 * bad answer can be traced to the routing decision rather than blamed on the
 * agent that happened to be holding it at the end.
 *
 * **A handover to a person is a first-class hop, not an exception.** Escalation
 * is the outcome an agent system is usually judged on, and burying it in a
 * status field makes it invisible in the one view meant to explain the run.
 *
 * The last hop is marked current. A trail whose final entry looks identical to
 * the ones before it reads as finished when the run may still be live.
 */
export type Handoff = {
  id: string
  /** Who took over. */
  to: string
  /** A person rather than an agent — drawn differently and labelled. */
  human?: boolean
  /** Why it was routed here. The reason is the point of the component. */
  reason?: ReactNode
  /** When, already formatted — this component does not own your locale. */
  at?: string
  /** Flags a handover caused by a failure rather than by routing. */
  failed?: boolean
  /** Trailing slot — a duration, a confidence, a link to that leg's trace. */
  meta?: ReactNode
}

type HandoffTrailProps = Omit<ComponentProps<'div'>, 'children'> & {
  handoffs: Handoff[]
  /** Marks the final hop as still holding the request. */
  live?: boolean
  currentLabel?: string
  humanLabel?: string
  failedLabel?: string
  emptyLabel?: string
  label?: string
}

function HandoffTrail({
  handoffs,
  live = false,
  currentLabel = 'Current',
  humanLabel = 'Human',
  failedLabel = 'Escalated on failure',
  emptyLabel = 'No handoffs — one agent handled this.',
  label = 'Handoff trail',
  className,
  ...props
}: HandoffTrailProps) {
  if (handoffs.length === 0) {
    return (
      <div
        data-slot="handoff-trail"
        className={cn(surface, radius.surface, 'p-4', className)}
        {...props}
      >
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      data-slot="handoff-trail"
      className={cn(surface, radius.surface, 'p-4', className)}
      {...props}
    >
      <ol aria-label={label} className="flex list-none flex-col">
        {handoffs.map((hop, index) => {
          const last = index === handoffs.length - 1
          const Icon = hop.human ? User : Bot

          return (
            <li key={hop.id}>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border',
                    hop.failed
                      ? 'border-[var(--destructive-soft-foreground)] text-[var(--destructive-soft-foreground)]'
                      : last && live
                        ? 'border-primary text-foreground'
                        : 'border-border text-muted-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{hop.to}</p>
                    {hop.human && (
                      <Badge size="sm" color="violet">
                        {humanLabel}
                      </Badge>
                    )}
                    {hop.failed && (
                      <Badge size="sm" color="destructive">
                        <TriangleAlert className="size-3" aria-hidden="true" />
                        {failedLabel}
                      </Badge>
                    )}
                    {last && live && (
                      <Badge size="sm" color="blue">
                        {currentLabel}
                      </Badge>
                    )}
                    {hop.at && (
                      <span className="text-muted-foreground/60 ms-auto shrink-0 font-mono text-[11px] tabular-nums">
                        {hop.at}
                      </span>
                    )}
                  </div>

                  {hop.reason && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {hop.reason}
                    </p>
                  )}

                  {hop.meta && (
                    <p className="text-muted-foreground/70 mt-1 text-[11px]">{hop.meta}</p>
                  )}
                </div>
              </div>

              {/* The connector sits under the icon column, aligned to its
                  centre, so the chain reads as one line rather than as rows
                  that happen to be stacked. */}
              {!last && (
                <div className="flex" aria-hidden="true">
                  <div className="flex w-7 shrink-0 justify-center py-1">
                    <ArrowDown className="text-muted-foreground/40 size-3.5" />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { HandoffTrail }
export type { HandoffTrailProps }
