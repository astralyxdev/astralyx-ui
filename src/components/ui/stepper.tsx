import type { ComponentProps, ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Progress through a fixed sequence of stages.
 *
 * Status is derived from `current` unless a step overrides it, so the common
 * case is one number rather than a status on every entry — but a failed or
 * skipped step in the middle still has to be expressible, hence the override.
 *
 * Horizontal stacks to vertical below the breakpoint. Four labelled stages
 * across a phone leaves about seventy pixels each, which truncates every label
 * to a word.
 */
export type Step = {
  id: string
  label: ReactNode
  description?: ReactNode
  status?: StepStatus
  icon?: ReactNode
}

export type StepStatus = 'pending' | 'active' | 'complete' | 'failed' | 'skipped'

const MARKER = {
  pending: 'border-border text-muted-foreground bg-background',
  active: 'border-primary bg-primary text-primary-foreground',
  complete: 'border-[var(--green)] bg-[var(--green)] text-[var(--green-foreground)]',
  failed: 'border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)]',
  skipped: 'border-border text-muted-foreground/60 bg-background',
} as const

const CONNECTOR = {
  pending: 'bg-border',
  active: 'bg-border',
  complete: 'bg-[var(--green)]',
  failed: 'bg-[var(--destructive)]',
  skipped: 'bg-border',
} as const

const RESPONSIVE_ROW = {
  sm: 'flex-col sm:flex-row sm:items-start',
  md: 'flex-col md:flex-row md:items-start',
  lg: 'flex-col lg:flex-row lg:items-start',
} as const

function statusOf(step: Step, index: number, current: number): StepStatus {
  if (step.status) return step.status
  if (index < current) return 'complete'
  if (index === current) return 'active'
  return 'pending'
}

function Stepper({
  steps,
  current = 0,
  orientation = 'horizontal',
  responsive = 'sm',
  className,
  ...props
}: Omit<ComponentProps<'ol'>, 'children'> & {
  steps: Step[]
  /** Index of the active step. Earlier steps read as complete. */
  current?: number
  orientation?: 'horizontal' | 'vertical'
  responsive?: Responsive
}) {
  const stacks = orientation === 'horizontal' && responsive !== false
  const vertical = orientation === 'vertical'

  return (
    <ol
      data-slot="stepper"
      data-orientation={orientation}
      className={cn(
        'flex list-none',
        vertical && 'flex-col',
        !vertical && !stacks && 'flex-row items-start',
        stacks && RESPONSIVE_ROW[responsive],
        className,
      )}
      {...props}
    >
      {steps.map((step, index) => {
        const status = statusOf(step, index, current)
        const last = index === steps.length - 1
        const connector = CONNECTOR[statusOf(step, index, current)]

        return (
          <li
            key={step.id}
            data-status={status}
            aria-current={status === 'active' ? 'step' : undefined}
            className={cn(
              'flex min-w-0 gap-3',
              vertical && 'pb-5 last:pb-0',
              !vertical && stacks && 'pb-5 sm:flex-1 sm:flex-col sm:pb-0 last:pb-0',
              !vertical && !stacks && 'flex-1 flex-col',
            )}
          >
            <div
              className={cn(
                'relative flex shrink-0',
                vertical || stacks ? 'flex-col items-center' : 'w-full items-center',
                !vertical && stacks && 'sm:w-full sm:flex-row',
              )}
            >
              <span
                className={cn(
                  'z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold [corner-shape:round]',
                  "[&_svg:not([class*='size-'])]:size-3.5",
                  MARKER[status],
                )}
              >
                {step.icon ??
                  (status === 'complete' ? (
                    <Check />
                  ) : status === 'failed' ? (
                    <X />
                  ) : status === 'active' ? (
                    // `size` sizes the ring; className only sizes the wrapper,
                    // which would leave the ring at its default and overflow
                    // the marker.
                    <Spinner size="xs" label="In progress" />
                  ) : (
                    index + 1
                  ))}
              </span>

              {/* The connector belongs to the step before the gap, so it takes
                  that step's colour — a completed stage joins to the next with
                  a completed line.

                  `-bottom-5` matches the row's `pb-5`. A flex child stretches
                  to the content box, not the padding box, so `bottom-0` stops
                  short and leaves a visible break between every pair of
                  steps. */}
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    connector,
                    vertical || stacks
                      ? 'absolute top-6 -bottom-5 w-px'
                      : 'ms-2 h-px flex-1',
                    !vertical &&
                      stacks &&
                      'sm:relative sm:top-auto sm:bottom-auto sm:ms-2 sm:h-px sm:w-auto sm:flex-1',
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                'flex min-w-0 flex-col gap-0.5 pb-1',
                !vertical && !stacks && 'pe-4',
                !vertical && stacks && 'sm:pe-4',
              )}
            >
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  status === 'pending' && 'text-muted-foreground',
                  status === 'skipped' && 'text-muted-foreground/60 line-through',
                )}
              >
                {step.label}
              </span>
              {step.description && (
                <span className="text-muted-foreground text-xs">
                  {step.description}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export { Stepper }
