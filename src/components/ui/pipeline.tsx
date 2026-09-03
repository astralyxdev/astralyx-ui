import { Fragment, type ComponentProps } from 'react'
import { Check, ChevronRight, CircleSlash, Clock, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Fmt } from '@/components/ui/fmt'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A CI pipeline: stages left to right, parallel jobs stacked within each.
 *
 * The distinction from `Stepper` is the second dimension. A stepper is one
 * sequence of stages; a pipeline runs several jobs inside each stage, and the
 * stage's own state is the roll-up of theirs — which is why `status` on a stage
 * is derived here rather than being another field to keep in sync.
 *
 * Scrolls horizontally rather than wrapping, because a pipeline read out of
 * order is meaningless, and stacks to a single column on narrow screens.
 */
export type JobStatus = 'success' | 'failure' | 'running' | 'pending' | 'skipped'

export type PipelineJob = {
  id: string
  name: string
  status: JobStatus
  /** Seconds. Rendered through Fmt. */
  duration?: number
  onSelect?: () => void
}

export type PipelineStage = {
  id: string
  name: string
  jobs: PipelineJob[]
}

const JOB_TONE = {
  success: 'border-[var(--green)]/40 bg-[color-mix(in_oklab,var(--green),transparent_92%)]',
  failure: 'border-[var(--destructive)]/40 bg-[color-mix(in_oklab,var(--destructive),transparent_92%)]',
  running: 'border-[var(--blue)]/40 bg-[color-mix(in_oklab,var(--blue),transparent_92%)]',
  pending: 'border-border bg-muted/40',
  skipped: 'border-border bg-muted/20 opacity-70',
} as const

const JOB_ICON = {
  success: { Icon: Check, tone: 'text-[var(--green-soft-foreground)]' },
  failure: { Icon: X, tone: 'text-[var(--destructive-soft-foreground)]' },
  running: { Icon: null, tone: 'text-[var(--blue-soft-foreground)]' },
  pending: { Icon: Clock, tone: 'text-muted-foreground' },
  skipped: { Icon: CircleSlash, tone: 'text-muted-foreground' },
} as const

/** A stage is as bad as its worst job — failure beats running beats pending. */
function stageStatus(stage: PipelineStage): JobStatus {
  const has = (status: JobStatus) => stage.jobs.some((job) => job.status === status)
  if (has('failure')) return 'failure'
  if (has('running')) return 'running'
  if (has('pending')) return 'pending'
  if (stage.jobs.every((job) => job.status === 'skipped')) return 'skipped'
  return 'success'
}

function Pipeline({
  stages,
  className,
  ...props
}: ComponentProps<'div'> & { stages: PipelineStage[] }) {
  return (
    <div
      data-slot="pipeline"
      className={cn('w-full overflow-x-auto', className)}
      {...props}
    >
      <ol className="flex list-none flex-col gap-3 md:flex-row md:items-start md:gap-0">
        {stages.map((stage, index) => {
          const status = stageStatus(stage)
          const last = index === stages.length - 1

          return (
            <Fragment key={stage.id}>
              <li className="min-w-0 md:min-w-44 md:flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full [corner-shape:round]',
                      status === 'success' && 'bg-[var(--green)]',
                      status === 'failure' && 'bg-[var(--destructive)]',
                      status === 'running' && 'bg-[var(--blue)]',
                      status === 'pending' && 'bg-border',
                      status === 'skipped' && 'bg-border',
                    )}
                    aria-hidden="true"
                  />
                  <h3 className="truncate text-xs font-medium tracking-wide uppercase">
                    {stage.name}
                  </h3>
                  <span className="text-muted-foreground/70 ms-auto text-xs tabular-nums">
                    {stage.jobs.length}
                  </span>
                </div>

                <ul className="flex list-none flex-col gap-1.5 md:pe-3">
                  {stage.jobs.map((job) => {
                    const { Icon, tone } = JOB_ICON[job.status]
                    const body = (
                      <>
                        {Icon ? (
                          <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden="true" />
                        ) : (
                          <Spinner size="xs" className={cn('shrink-0', tone)} label="Running" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-start">
                          {job.name}
                        </span>
                        {job.duration !== undefined && (
                          <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                            <Fmt type="duration" value={job.duration} />
                          </span>
                        )}
                      </>
                    )

                    return (
                      <li key={job.id}>
                        {job.onSelect ? (
                          <button
                            type="button"
                            onClick={job.onSelect}
                            className={cn(
                              'flex w-full items-center gap-2 border px-2.5 py-1.5 text-xs',
                              radius.control,
                              JOB_TONE[job.status],
                              interactive,
                              focusRing,
                            )}
                          >
                            {body}
                          </button>
                        ) : (
                          <div
                            className={cn(
                              'flex w-full items-center gap-2 border px-2.5 py-1.5 text-xs',
                              radius.control,
                              JOB_TONE[job.status],
                            )}
                          >
                            {body}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </li>

              {!last && (
                <li
                  aria-hidden="true"
                  className="text-muted-foreground/40 hidden shrink-0 self-center md:block"
                >
                  <ChevronRight className="size-4" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}

export { Pipeline, stageStatus }
