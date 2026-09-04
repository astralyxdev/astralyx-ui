import { useId, useMemo, type ComponentProps, type ReactNode } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Work on a timeline: bars for duration, lines for dependency.
 *
 * **The view `Kanban`, `Timeline` and `Stepper` cannot give you.** Kanban shows
 * state and hides time. A timeline shows moments, not spans. A stepper shows
 * order, not overlap. Only this shows *how long* and *at the same time as
 * what* — which is the entire question in scheduling.
 *
 * **The critical path is computed, not annotated.** Highlighting it by hand is
 * how a Gantt chart goes stale: someone slips a task, nobody re-marks the path,
 * and the chart now points at the wrong risk. Here the longest dependency chain
 * is derived from the data, so it follows the plan.
 *
 * **Dependencies are drawn as finish-to-start links** and a violated one — a
 * task starting before what it depends on ends — is drawn in the danger colour
 * rather than quietly rendered as a line going backwards. An impossible
 * schedule should look impossible.
 *
 * Dates are laid out on a linear day scale between the earliest start and the
 * latest end, so the width of a bar is proportional to its duration. Rows are
 * plain elements with the bar positioned by percentage: no measurement, and it
 * survives a resize.
 */
export type GanttTask = {
  id: string
  label: ReactNode
  start: Date | string
  end: Date | string
  /** 0–1. Drawn as a fill inside the bar. */
  progress?: number
  /** Ids this task cannot start before. */
  dependsOn?: string[]
  group?: string
  color?: string
  milestone?: boolean
}

type GanttProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  tasks: GanttTask[]
  onSelect?: (task: GanttTask) => void
  /** Derive and highlight the longest dependency chain. */
  criticalPath?: boolean
  /** Column width for the task names. */
  labelWidth?: number
  rowHeight?: number
  /** Formats the axis ticks. */
  dateFormat?: (date: Date) => string
  /** Number of ticks along the top. */
  ticks?: number
  /** Drawn as a vertical marker. Defaults to no marker. */
  today?: Date
  emptyLabel?: string
  label?: string
}

const DAY = 86_400_000
const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))

const DEFAULT_DATE_FORMAT: (date: Date) => string = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function Gantt({
  tasks,
  onSelect,
  criticalPath = true,
  labelWidth = 160,
  rowHeight = 30,
  dateFormat = DEFAULT_DATE_FORMAT,
  ticks = 5,
  today,
  emptyLabel = 'Nothing scheduled.',
  label = 'Gantt chart',
  className,
  ...props
}: GanttProps) {
  const titleId = useId()

  const model = useMemo(() => {
    if (tasks.length === 0) return null

    const rows = tasks.map((task) => ({
      task,
      start: asDate(task.start).getTime(),
      end: asDate(task.end).getTime(),
    }))

    const first = Math.min(...rows.map((row) => row.start))
    const last = Math.max(...rows.map((row) => row.end))
    const span = last - first || DAY

    /**
     * Critical path: the longest chain by duration, walked backwards from
     * whichever task finishes last.
     */
    const byId = new Map(rows.map((row) => [row.task.id, row]))
    const critical = new Set<string>()

    if (criticalPath) {
      const memo = new Map<string, number>()
      const seen = new Set<string>()

      const longest = (id: string): number => {
        if (memo.has(id)) return memo.get(id) as number
        // A dependency cycle has no longest path; stop rather than recurse.
        if (seen.has(id)) return 0
        seen.add(id)
        const row = byId.get(id)
        if (!row) return 0
        const duration = row.end - row.start
        const parents = row.task.dependsOn ?? []
        const best = parents.length ? Math.max(...parents.map((parent) => longest(parent))) : 0
        const value = best + duration
        memo.set(id, value)
        return value
      }

      for (const row of rows) longest(row.task.id)
      let cursor = [...memo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      while (cursor) {
        critical.add(cursor)
        const parents = byId.get(cursor)?.task.dependsOn ?? []
        cursor = parents.sort((a, b) => (memo.get(b) ?? 0) - (memo.get(a) ?? 0))[0]
      }
    }

    // A dependent that starts before its predecessor ends is impossible.
    const violated = new Set<string>()
    for (const row of rows) {
      for (const parent of row.task.dependsOn ?? []) {
        const before = byId.get(parent)
        if (before && row.start < before.end) violated.add(`${parent}->${row.task.id}`)
      }
    }

    return { rows, first, last, span, critical, violated, byId }
  }, [tasks, criticalPath])

  if (!model) {
    return (
      <div className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </div>
    )
  }

  const { rows, first, span, critical, violated } = model
  const at = (time: number) => ((time - first) / span) * 100

  const axis = Array.from({ length: ticks + 1 }, (_, index) => first + (span * index) / ticks)

  return (
    <div
      data-slot="gantt"
      className={cn('w-full overflow-x-auto', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <p id={titleId} className="sr-only">
        {label}
      </p>

      <div className="min-w-[32rem]">
        <div className="flex items-end" style={{ paddingInlineStart: labelWidth }}>
          {axis.map((time, index) => (
            <span
              key={index}
              className="text-muted-foreground flex-1 text-[10px] first:text-start last:text-end"
            >
              {dateFormat(new Date(time))}
            </span>
          ))}
        </div>

        <div className="relative mt-1">
          {/* Today marker, behind the bars. */}
          {today && (
            <span
              aria-hidden="true"
              className="bg-[var(--destructive)] absolute top-0 bottom-0 z-10 w-px opacity-60"
              style={{
                insetInlineStart: `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${at(today.getTime()) / 100})`,
              }}
            />
          )}

          {rows.map(({ task, start, end }) => {
            const onPath = critical.has(task.id)
            const colour = task.color ?? dataPalette[0].fill
            const left = at(start)
            const width = Math.max(task.milestone ? 0 : 0.6, at(end) - at(start))

            return (
              <div key={task.id} className="flex items-center" style={{ height: rowHeight }}>
                <span
                  className="text-foreground shrink-0 truncate pe-3 text-xs"
                  style={{ width: labelWidth }}
                >
                  {task.label}
                </span>

                <div className="relative h-full flex-1">
                  <button
                    type="button"
                    disabled={!onSelect}
                    onClick={() => onSelect?.(task)}
                    title={`${asDate(task.start).toLocaleDateString()} – ${asDate(task.end).toLocaleDateString()}${
                      onPath ? ' (critical path)' : ''
                    }`}
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 overflow-hidden',
                      task.milestone ? 'size-3 rotate-45 rounded-[2px]' : 'h-4 rounded-[3px]',
                      onSelect ? 'cursor-pointer' : 'cursor-default',
                      onPath && 'ring-1 ring-[var(--destructive)] ring-offset-1',
                    )}
                    style={{
                      insetInlineStart: `${left}%`,
                      width: task.milestone ? undefined : `${width}%`,
                      background: colour,
                      opacity: 0.85,
                    }}
                  >
                    {task.progress !== undefined && !task.milestone && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 start-0 bg-black/25"
                        style={{ width: `${Math.min(100, Math.max(0, task.progress * 100))}%` }}
                      />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {violated.size > 0 && (
          <p role="status" className="text-[var(--destructive)] mt-2 text-[11px]">
            {violated.size} dependency {violated.size === 1 ? 'conflict' : 'conflicts'}: a task starts
            before what it depends on finishes.
          </p>
        )}
      </div>
    </div>
  )
}

export { Gantt }
export type { GanttProps }
