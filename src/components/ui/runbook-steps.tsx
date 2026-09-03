import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Play, SkipForward, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A runbook: remediation steps, each runnable on its own.
 *
 * Steps run one at a time and only in order — a runbook is a procedure, and
 * offering "run" on step four while step two has not been attempted invites
 * exactly the mistake the runbook exists to prevent. The next actionable step is
 * computed rather than tracked, so it stays correct when a step is skipped.
 *
 * Destructive steps must be confirmed. `confirm` is a per-step flag, because the
 * ones that restart a database sit right beside the ones that read a log.
 */
export type RunbookStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped'

export type RunbookStep = {
  id: string
  title: ReactNode
  description?: ReactNode
  status: RunbookStatus
  /** Ask before running. For anything destructive. */
  confirm?: boolean
  output?: ReactNode
}

const STATUS_BADGE = {
  pending: null,
  running: { label: 'Running', color: 'blue' },
  done: { label: 'Done', color: 'green' },
  failed: { label: 'Failed', color: 'destructive' },
  skipped: { label: 'Skipped', color: 'neutral' },
} as const

function RunbookSteps({
  steps,
  onRun,
  onSkip,
  title,
  destructiveLabel = 'Destructive',
  confirmNote = 'This cannot be undone. Run it?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  runLabel = 'Run',
  skipLabel = 'Skip',
  runningLabel = 'Running',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  steps: RunbookStep[]
  onRun?: (id: string) => void
  onSkip?: (id: string) => void
  title?: ReactNode
  /** Badge on a step that asks before it runs. */
  destructiveLabel?: ReactNode
  confirmNote?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  runLabel?: ReactNode
  skipLabel?: ReactNode
  /** Accessible name for the in-progress spinner. */
  runningLabel?: string
}) {
  const [confirming, setConfirming] = useState<string | null>(null)

  // The first step that has not been resolved is the only one that can run.
  const nextIndex = steps.findIndex((step) => step.status === 'pending')
  const busy = steps.some((step) => step.status === 'running')

  return (
    <div
      data-slot="runbook-steps"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {title && (
        <div className="border-border bg-muted/40 border-b p-3">
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
      )}

      <ol className="list-none divide-y divide-[var(--border)]">
        {steps.map((step, index) => {
          const badge = STATUS_BADGE[step.status]
          const actionable = index === nextIndex && !busy
          const isConfirming = confirming === step.id

          return (
            <li key={step.id} data-status={step.status} className="flex flex-col gap-2 p-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold [corner-shape:round]',
                    step.status === 'done' &&
                      'border-[var(--green)] bg-[var(--green)] text-[var(--green-foreground)]',
                    step.status === 'failed' &&
                      'border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)]',
                    step.status === 'skipped' && 'border-border text-muted-foreground/60',
                    (step.status === 'pending' || step.status === 'running') &&
                      'border-border text-muted-foreground',
                  )}
                >
                  {step.status === 'done' ? (
                    <Check className="size-3" />
                  ) : step.status === 'failed' ? (
                    <X className="size-3" />
                  ) : step.status === 'running' ? (
                    <Spinner size="xs" label={runningLabel} />
                  ) : (
                    index + 1
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        step.status === 'skipped' && 'text-muted-foreground/60 line-through',
                      )}
                    >
                      {step.title}
                    </span>
                    {badge && (
                      <Badge size="sm" color={badge.color}>
                        {badge.label}
                      </Badge>
                    )}
                    {step.confirm && step.status === 'pending' && (
                      <Badge size="sm" color="amber">
                        {destructiveLabel}
                      </Badge>
                    )}
                  </div>

                  {step.description && (
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {step.output && (
                <div className="ms-7 min-w-0">{step.output}</div>
              )}

              {actionable && (onRun || onSkip) && (
                <div className="ms-7 flex flex-wrap items-center gap-2">
                  {isConfirming ? (
                    <>
                      <span className="text-muted-foreground text-xs">
                        {confirmNote}
                      </span>
                      <Button
                        size="xs"
                        color="destructive"
                        onClick={() => {
                          setConfirming(null)
                          onRun?.(step.id)
                        }}
                      >
                        {confirmLabel}
                      </Button>
                      <Button size="xs" variant="secondary" onClick={() => setConfirming(null)}>
                        {cancelLabel}
                      </Button>
                    </>
                  ) : (
                    <>
                      {onRun && (
                        <Button
                          size="xs"
                          onClick={() =>
                            step.confirm ? setConfirming(step.id) : onRun(step.id)
                          }
                        >
                          <Play />
                          {runLabel}
                        </Button>
                      )}
                      {onSkip && (
                        <Button size="xs" variant="secondary" onClick={() => onSkip(step.id)}>
                          <SkipForward />
                          {skipLabel}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { RunbookSteps }
