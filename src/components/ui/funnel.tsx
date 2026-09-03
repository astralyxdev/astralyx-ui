import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Conversion through ordered stages.
 *
 * Two rates per stage, and the distinction matters more than the picture:
 * *overall* is against the first stage, *step* is against the one immediately
 * before. A funnel showing only the overall rate hides which single step is
 * losing people, which is the entire question a funnel is built to answer.
 *
 * Bar width is proportional to the count rather than to the step rate, so the
 * shape reflects volume. A stage keeping 90% of a tiny cohort should not look
 * wider than one keeping 40% of everyone.
 */
export type FunnelStage = {
  label: ReactNode
  value: number
  hint?: ReactNode
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_FORMAT: (value: number) => string = (value: number) => value.toLocaleString('en-GB')

function Funnel({
  stages,
  color = 'var(--blue)',
  showStepRate = true,
  format = DEFAULT_FORMAT,
  className,
  ...props
}: Omit<ComponentProps<'ol'>, 'children'> & {
  stages: FunnelStage[]
  color?: string
  showStepRate?: boolean
  format?: (value: number) => string
}) {
  const first = stages[0]?.value || 1

  return (
    <ol
      data-slot="funnel"
      className={cn('flex list-none flex-col gap-2', className)}
      {...props}
    >
      {stages.map((stage, index) => {
        const overall = stage.value / first
        const previous = index === 0 ? undefined : stages[index - 1].value
        const step = previous ? stage.value / previous : 1
        const dropped = previous ? previous - stage.value : 0

        return (
          <li key={index} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-medium">{stage.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {format(stage.value)}
                <span className="ms-2">{Math.round(overall * 100)}%</span>
              </span>
            </div>

            <div className="bg-secondary h-7 w-full overflow-hidden rounded-md">
              <div
                className="h-full rounded-md transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{
                  // Width tracks volume, not the step rate.
                  width: `${Math.max(overall * 100, 1)}%`,
                  backgroundColor: color,
                  opacity: 1 - index * 0.12,
                }}
              />
            </div>

            {showStepRate && index > 0 && (
              <p className="text-muted-foreground/80 text-xs">
                {Math.round(step * 100)}% from previous
                {dropped > 0 && ` · ${format(dropped)} dropped`}
              </p>
            )}
            {stage.hint && (
              <p className="text-muted-foreground/70 text-xs">{stage.hint}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { Funnel }
