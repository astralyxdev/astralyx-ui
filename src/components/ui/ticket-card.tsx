import type { ComponentProps, ReactNode } from 'react'
import { Clock, MessageSquare, TriangleAlert } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A support ticket with its SLA state.
 *
 * The SLA clock is the point. A ticket list sorted by age is not the same as
 * one sorted by time-to-breach — a low-priority ticket from last week may have
 * days left while an urgent one from this morning is already overdue. Breach
 * risk is computed from the due time, not inferred from age.
 *
 * "Waiting on customer" pauses the clock, which is why it is a distinct status
 * rather than a flavour of open. Counting that time against the team is how SLA
 * reports become fiction.
 */
export type TicketStatus = 'open' | 'pending' | 'waiting' | 'resolved' | 'closed'
export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low'

const STATUS = {
  open: { label: 'Open', color: 'blue' },
  pending: { label: 'In progress', color: 'violet' },
  waiting: { label: 'Waiting on customer', color: 'amber' },
  resolved: { label: 'Resolved', color: 'green' },
  closed: { label: 'Closed', color: 'neutral' },
} as const

const PRIORITY = {
  urgent: { label: 'Urgent', color: 'destructive' },
  high: { label: 'High', color: 'amber' },
  normal: { label: 'Normal', color: 'neutral' },
  low: { label: 'Low', color: 'neutral' },
} as const

function TicketCard({
  id,
  subject,
  status,
  priority = 'normal',
  requester,
  requesterAvatar,
  assignee,
  updatedAt,
  dueAt,
  now,
  replies,
  tags,
  locale = 'en-GB',
  breachedLabel = 'SLA breached',
  dueSoonLabel = 'Due soon',
  updatedLabel = 'updated',
  dueLabel = 'due',
  pausedLabel = 'SLA clock paused',
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'id'> & {
  id: ReactNode
  subject: ReactNode
  status: TicketStatus
  priority?: TicketPriority
  requester?: ReactNode
  requesterAvatar?: ReactNode
  assignee?: ReactNode
  updatedAt?: Date
  /** SLA target. Breach risk is computed from this, not from age. */
  dueAt?: Date
  now?: Date
  replies?: number
  tags?: ReactNode
  locale?: string
  /** Badge once `dueAt` has passed. */
  breachedLabel?: ReactNode
  dueSoonLabel?: ReactNode
  /** Precedes the last-updated time. */
  updatedLabel?: ReactNode
  /** Precedes the due time. */
  dueLabel?: ReactNode
  /** Shown for a status that stops the SLA clock. */
  pausedLabel?: ReactNode
}) {
  const reference = now ?? new Date()
  const meta = STATUS[status]
  const level = PRIORITY[priority]

  // The clock stops while waiting on the customer.
  const clockRunning = status === 'open' || status === 'pending'
  const overdue = clockRunning && dueAt !== undefined && dueAt < reference
  const soon =
    clockRunning &&
    dueAt !== undefined &&
    !overdue &&
    dueAt.getTime() - reference.getTime() < 1000 * 60 * 60 * 2

  return (
    <article
      data-slot="ticket-card"
      data-status={status}
      className={cn(
        surface,
        radius.surface,
        'relative flex flex-col gap-2 overflow-hidden p-4 ps-5',
        (status === 'resolved' || status === 'closed') && 'opacity-70',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 start-0 w-1.5',
          priority === 'urgent'
            ? 'bg-[var(--destructive)]'
            : priority === 'high'
              ? 'bg-[var(--amber)]'
              : 'bg-border',
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs">{id}</span>
        <Badge size="sm" color={meta.color}>
          {meta.label}
        </Badge>
        {priority !== 'normal' && (
          <Badge size="sm" color={level.color}>
            {level.label}
          </Badge>
        )}

        {(overdue || soon) && (
          <Badge size="sm" color={overdue ? 'destructive' : 'amber'} className="ms-auto">
            <TriangleAlert />
            {overdue ? breachedLabel : dueSoonLabel}
          </Badge>
        )}
      </div>

      <h3 className="text-sm font-medium text-pretty">{subject}</h3>

      {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        {requester && (
          <span className="flex items-center gap-1.5">
            {requesterAvatar ?? <Avatar size="xs" name={String(requester)} />}
            {requester}
          </span>
        )}
        {replies !== undefined && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            {replies}
          </span>
        )}
        {updatedAt && (
          <span>
            {updatedLabel} <Fmt type="relative" value={updatedAt} now={reference} locale={locale} />
          </span>
        )}
        {dueAt && clockRunning && (
          <span className={cn('inline-flex items-center gap-1', overdue && 'text-[var(--destructive-soft-foreground)]')}>
            <Clock className="size-3.5" aria-hidden="true" />
            {dueLabel} <Fmt type="relative" value={dueAt} now={reference} locale={locale} />
          </span>
        )}
        {status === 'waiting' && (
          <span className="text-muted-foreground/70">{pausedLabel}</span>
        )}
        {assignee && <span className="ms-auto">{assignee}</span>}
      </div>
    </article>
  )
}

export { TicketCard }
