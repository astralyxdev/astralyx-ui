import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight, Circle, CircleSlash, X } from 'lucide-react'
import { Fmt } from '@/components/ui/fmt'
import { Spinner } from '@/components/ui/spinner'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An agent's plan, with each step's state as it runs.
 *
 * The plan is shown whole from the start, including steps not yet reached.
 * Revealing them one at a time hides how much is left, which is the single
 * thing someone watching an agent most wants to know.
 *
 * Related to `ToolCall`, which shows one invocation with its arguments and
 * result. This is the level above: the sequence those calls belong to.
 */
export type AgentStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped'

export type AgentStep = {
  id: string
  label: ReactNode
  status: AgentStepStatus
  /** Seconds. */
  duration?: number
  /** Tool calls, output, an error — anything expandable. */
  detail?: ReactNode
}

const STATUS = {
  pending: { Icon: Circle, tone: 'text-muted-foreground/40' },
  running: { Icon: null, tone: 'text-[var(--blue-soft-foreground)]' },
  done: { Icon: Check, tone: 'text-[var(--green-soft-foreground)]' },
  failed: { Icon: X, tone: 'text-[var(--destructive-soft-foreground)]' },
  skipped: { Icon: CircleSlash, tone: 'text-muted-foreground/60' },
} as const

function AgentSteps({
  steps,
  defaultExpanded = [],
  title,
  className,
  ...props
}: ComponentProps<'div'> & {
  steps: AgentStep[]
  defaultExpanded?: string[]
  title?: ReactNode
}) {
  const [expanded, setExpanded] = useState<string[]>(defaultExpanded)

  const done = steps.filter((step) => step.status === 'done').length
  const running = steps.some((step) => step.status === 'running')

  return (
    <div
      data-slot="agent-steps"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex items-center gap-2 border-b p-3">
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {title ?? 'Plan'}
        </span>
        <span
          className="text-muted-foreground shrink-0 text-xs tabular-nums"
          aria-live="polite"
        >
          {done} / {steps.length}
          {running && ' · running'}
        </span>
      </div>

      <ol className="divide-border/60 flex list-none flex-col divide-y">
        {steps.map((step) => {
          const { Icon, tone } = STATUS[step.status]
          const open = expanded.includes(step.id)

          return (
            <li key={step.id} data-status={step.status}>
              <div className="flex items-center gap-2.5 px-3 py-2">
                {step.detail ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? 'Hide' : 'Show'} detail`}
                    onClick={() =>
                      setExpanded((current) =>
                        open
                          ? current.filter((id) => id !== step.id)
                          : [...current, step.id],
                      )
                    }
                    className={cn(
                      'text-muted-foreground hover:text-foreground -m-1 shrink-0 p-1',
                      radius.xs,
                      interactive,
                      focusRing,
                    )}
                  >
                    {open ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                {Icon ? (
                  <Icon className={cn('size-4 shrink-0', tone)} aria-hidden="true" />
                ) : (
                  <Spinner size="xs" className={cn('shrink-0', tone)} label="Running" />
                )}

                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    step.status === 'pending' && 'text-muted-foreground',
                    step.status === 'skipped' &&
                      'text-muted-foreground/60 line-through',
                  )}
                >
                  {step.label}
                </span>

                {step.duration !== undefined && (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    <Fmt type="duration" value={step.duration} />
                  </span>
                )}
              </div>

              {open && step.detail && (
                <div className="bg-muted/30 border-border/60 border-t p-3 text-sm">
                  {step.detail}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { AgentSteps }
