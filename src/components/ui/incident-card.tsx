import type { ComponentProps, ReactNode } from 'react'
import { AlertTriangle, Clock, User } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An incident: severity, state, who owns it, how long it has been open.
 *
 * Severity uses a left edge rather than a tinted background. A card whose whole
 * surface is red draws the eye to the card instead of to its content, and a
 * list of ten of them is unreadable — the stripe scales to a queue.
 *
 * Duration is computed from `startedAt` and an optional `resolvedAt`, so an
 * open incident's age advances on its own instead of being a stale string
 * someone has to remember to refresh.
 */
export type Severity = 'sev1' | 'sev2' | 'sev3' | 'sev4'
export type IncidentState = 'investigating' | 'identified' | 'monitoring' | 'resolved'

const SEVERITY = {
  sev1: { label: 'SEV1', color: 'destructive', edge: 'bg-[var(--destructive)]' },
  sev2: { label: 'SEV2', color: 'amber', edge: 'bg-[var(--amber)]' },
  sev3: { label: 'SEV3', color: 'blue', edge: 'bg-[var(--blue)]' },
  sev4: { label: 'SEV4', color: 'neutral', edge: 'bg-border' },
} as const

const STATE_LABEL = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
} as const

function IncidentCard({
  title,
  severity = 'sev3',
  state = 'investigating',
  startedAt,
  resolvedAt,
  assignee,
  services,
  summary,
  now,
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'title'> & {
  title: ReactNode
  severity?: Severity
  state?: IncidentState
  startedAt: Date
  resolvedAt?: Date
  assignee?: string
  services?: string[]
  summary?: ReactNode
  /** Reference point for the age. Defaults to now. */
  now?: Date
}) {
  const level = SEVERITY[severity]
  const end = resolvedAt ?? now ?? new Date()
  const seconds = Math.max(0, (end.getTime() - startedAt.getTime()) / 1000)

  return (
    <article
      data-slot="incident-card"
      data-severity={severity}
      className={cn(
        surface,
        radius.surface,
        'relative overflow-hidden ps-4',
        state === 'resolved' && 'opacity-75',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-0 start-0 w-1.5', level.edge)}
      />

      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="sm" color={level.color}>
            <AlertTriangle />
            {level.label}
          </Badge>
          <Badge size="sm" color={state === 'resolved' ? 'green' : 'neutral'}>
            {STATE_LABEL[state]}
          </Badge>
          <span className="text-muted-foreground ms-auto inline-flex items-center gap-1 text-xs tabular-nums">
            <Clock className="size-3.5" aria-hidden="true" />
            <Fmt type="duration" value={seconds} />
          </span>
        </div>

        <h3 className="text-sm font-medium text-pretty">{title}</h3>

        {summary && <p className="text-muted-foreground text-sm">{summary}</p>}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span>
            Started <Fmt type="relative" value={startedAt} now={now} />
          </span>

          {services && services.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {services.map((service) => (
                <Badge key={service} size="sm">
                  {service}
                </Badge>
              ))}
            </span>
          )}

          {assignee && (
            <span className="ms-auto inline-flex items-center gap-1.5">
              <User className="size-3.5 sr-only" aria-hidden="true" />
              <Avatar size="xs" name={assignee} />
              {assignee}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export { IncidentCard }
