import type { ComponentProps, ReactNode } from 'react'
import { Circle, CircleCheck, CircleDot, CircleX, Loader } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The plan an agent is working from, as it works through it.
 *
 * Not a trace of what happened — a list of what it *intends* to do, which is
 * the difference that makes it useful while a run is live. A trace tells you
 * where it went wrong afterwards; a plan lets you see it heading somewhere
 * wrong and stop it.
 *
 * **Exactly one task is in progress at a time, and that is enforced here.** An
 * agent that reports three tasks running has lost track of its own plan, and
 * rendering all three as active hides the bug. Later ones are demoted to
 * pending, with the first kept as the live one.
 *
 * Nesting is one level deep on purpose. A plan that needs a tree is a plan the
 * agent will not finish, and the sub-steps that matter are the ones under the
 * task in flight.
 */
export type AgentTaskStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped'

export type AgentTask = {
  id: string
  title: ReactNode
  status: AgentTaskStatus
  /** One level of sub-steps. Deeper nesting is not supported by design. */
  steps?: { id: string; title: ReactNode; status: AgentTaskStatus }[]
  note?: ReactNode
}

const ICON: Record<AgentTaskStatus, { icon: typeof Circle; tone: string; label: string }> = {
  pending: { icon: Circle, tone: 'text-muted-foreground/35', label: 'Pending' },
  active: { icon: Loader, tone: 'text-[var(--blue-soft-foreground)]', label: 'In progress' },
  done: { icon: CircleCheck, tone: 'text-[var(--green-soft-foreground)]', label: 'Done' },
  failed: { icon: CircleX, tone: 'text-[var(--destructive-soft-foreground)]', label: 'Failed' },
  skipped: { icon: CircleDot, tone: 'text-muted-foreground/40', label: 'Skipped' },
}

type AgentTasksProps = Omit<ComponentProps<'div'>, 'children'> & {
  tasks: AgentTask[]
  /** Caption. Receives done and total counts. */
  summary?: (done: number, total: number) => ReactNode
  emptyLabel?: string
  label?: string
  statusLabels?: Partial<Record<AgentTaskStatus, string>>
}

function AgentTasks({
  tasks,
  summary,
  emptyLabel = 'No plan yet.',
  label = 'Plan',
  statusLabels,
  className,
  ...props
}: AgentTasksProps) {
  // One active task, whatever the caller says. Several "in progress" rows means
  // the agent has lost its place, and drawing them all live hides that.
  let seenActive = false
  const normalised = tasks.map((task) => {
    if (task.status !== 'active') return task
    if (seenActive) return { ...task, status: 'pending' as const }
    seenActive = true
    return task
  })

  const done = tasks.filter((task) => task.status === 'done').length

  return (
    <div
      data-slot="agent-tasks"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
          {label}
        </p>
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {done}/{tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ol className="list-none">
          {normalised.map((task) => {
            const meta = ICON[task.status]
            const Icon = meta.icon

            return (
              <li key={task.id} className="border-border/60 border-b px-4 py-2.5 last:border-b-0">
                <div className="flex items-start gap-2.5">
                  <Icon
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      meta.tone,
                      task.status === 'active' &&
                        'motion-safe:animate-spin motion-reduce:animate-none',
                    )}
                    aria-label={statusLabels?.[task.status] ?? meta.label}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm leading-snug',
                        task.status === 'done' && 'text-muted-foreground line-through',
                        task.status === 'skipped' && 'text-muted-foreground/60',
                        task.status === 'active' && 'font-medium',
                      )}
                    >
                      {task.title}
                    </p>
                    {task.note && (
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                        {task.note}
                      </p>
                    )}

                    {task.steps && task.steps.length > 0 && (
                      <ul className="border-border/60 mt-2 list-none space-y-1.5 border-s ps-3">
                        {task.steps.map((step) => {
                          const stepMeta = ICON[step.status]
                          const StepIcon = stepMeta.icon
                          return (
                            <li key={step.id} className="flex items-start gap-2">
                              <StepIcon
                                className={cn(
                                  'mt-0.5 size-3 shrink-0',
                                  stepMeta.tone,
                                  step.status === 'active' &&
                                    'motion-safe:animate-spin motion-reduce:animate-none',
                                )}
                                aria-label={statusLabels?.[step.status] ?? stepMeta.label}
                              />
                              <span
                                className={cn(
                                  'text-muted-foreground text-xs leading-snug',
                                  step.status === 'done' && 'line-through',
                                )}
                              >
                                {step.title}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  {task.status === 'failed' && (
                    <Badge size="sm" color="destructive" className="shrink-0">
                      {statusLabels?.failed ?? meta.label}
                    </Badge>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {summary && (
        <p className="border-border text-muted-foreground border-t px-4 py-2.5 text-xs">
          {summary(done, tasks.length)}
        </p>
      )}
    </div>
  )
}

export { AgentTasks }
export type { AgentTasksProps }
