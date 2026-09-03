import type { ComponentProps, ReactNode } from 'react'
import { Check, Clock, Pause, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Spinner } from '@/components/ui/spinner'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Scheduled jobs: when each next runs, and how the last one went.
 *
 * Both times are shown relative, because "in 4 hours" and "2 hours ago" are the
 * questions people actually have about a cron. The absolute time is in the
 * title attribute for when it matters.
 *
 * An overdue job — next run in the past while nothing is running — is called
 * out explicitly. That is the failure mode a schedule list exists to catch, and
 * it is invisible if you only render the timestamp.
 */
export type CronJob = {
  id: string
  name: string
  /** Standard cron expression, shown verbatim. */
  expression: string
  description?: ReactNode
  nextRun?: Date
  lastRun?: Date
  lastStatus?: 'success' | 'failed' | 'running'
  /** Seconds. */
  lastDuration?: number
  paused?: boolean
}

const STATUS = {
  success: { Icon: Check, tone: 'text-[var(--green-soft-foreground)]', label: 'Succeeded' },
  failed: { Icon: X, tone: 'text-[var(--destructive-soft-foreground)]', label: 'Failed' },
  running: { Icon: null, tone: 'text-[var(--blue-soft-foreground)]', label: 'Running' },
} as const

function CronSchedule({
  jobs,
  now,
  locale = 'en-GB',
  pausedLabel = 'Paused',
  overdueLabel = 'Overdue',
  nextLabel = 'Next',
  lastLabel = 'Last',
  tookLabel = 'Took',
  className,
  ...props
}: ComponentProps<'div'> & {
  jobs: CronJob[]
  now?: Date
  locale?: string
  pausedLabel?: ReactNode
  /** Badge on a job whose next run is already in the past. */
  overdueLabel?: ReactNode
  /** Precedes the next-run time. */
  nextLabel?: ReactNode
  /** Precedes the last-run time. */
  lastLabel?: ReactNode
  /** Precedes the last run's duration. */
  tookLabel?: ReactNode
}) {
  const reference = now ?? new Date()

  return (
    <div
      data-slot="cron-schedule"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <ul className="list-none divide-y divide-[var(--border)]">
        {jobs.map((job) => {
          const status = job.lastStatus ? STATUS[job.lastStatus] : undefined
          const overdue =
            !job.paused &&
            job.lastStatus !== 'running' &&
            job.nextRun !== undefined &&
            job.nextRun < reference

          return (
            <li
              key={job.id}
              data-paused={job.paused || undefined}
              className={cn('flex flex-col gap-2 p-3', job.paused && 'opacity-60')}
            >
              <div className="flex flex-wrap items-center gap-2">
                {job.paused ? (
                  <Pause className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                ) : status?.Icon ? (
                  <status.Icon
                    className={cn('size-4 shrink-0', status.tone)}
                    aria-hidden="true"
                  />
                ) : status ? (
                  <Spinner size="xs" className={cn('shrink-0', status.tone)} label="Running" />
                ) : (
                  <Clock className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                )}

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {job.name}
                </span>

                <code className="bg-secondary text-muted-foreground shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-xs">
                  {job.expression}
                </code>

                {job.paused && <Badge size="sm">{pausedLabel}</Badge>}
                {overdue && (
                  <Badge size="sm" color="destructive">
                    {overdueLabel}
                  </Badge>
                )}
              </div>

              {job.description && (
                <p className="text-muted-foreground text-sm">{job.description}</p>
              )}

              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {job.nextRun && !job.paused && (
                  <span title={job.nextRun.toISOString()}>
                    {nextLabel} <Fmt type="relative" value={job.nextRun} now={reference} locale={locale} />
                  </span>
                )}
                {job.lastRun && (
                  <span title={job.lastRun.toISOString()}>
                    {lastLabel} <Fmt type="relative" value={job.lastRun} now={reference} locale={locale} />
                    {status && ` · ${status.label.toLowerCase()}`}
                  </span>
                )}
                {job.lastDuration !== undefined && (
                  <span className="tabular-nums">
                    {tookLabel} <Fmt type="duration" value={job.lastDuration} />
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { CronSchedule }
