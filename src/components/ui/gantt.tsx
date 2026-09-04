import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Work on a timeline: bars for duration, dragged to reschedule.
 *
 * **The view `Kanban`, `Timeline` and `Stepper` cannot give you.** Kanban shows
 * state and hides time. A timeline shows moments, not spans. A stepper shows
 * order, not overlap. Only this shows *how long* and *at the same time as
 * what* — which is the entire question in scheduling.
 *
 * **A read-only Gantt is a picture of a plan, and plans change.** Dragging is
 * not decoration here: the whole reason to look at this chart is to notice that
 * something has slipped, and the useful next action is to move it. A bar is
 * dragged to reschedule, and its edges are dragged to change the start or the
 * end independently.
 *
 * **Everything snaps, and the snap is the unit the plan is kept in.** Dates
 * dragged to arbitrary millisecond boundaries produce a plan nobody can read
 * back; `snapMinutes` defaults to a day, which is the granularity most plans
 * are actually managed at.
 *
 * **Dragging is not the only way to move a task.** A bar is a real button:
 * arrow keys move it a snap at a time, shift-arrow changes its end, and both
 * announce through `aria-valuetext`. A chart that can only be edited with a
 * pointer cannot be edited at all by a good number of people.
 *
 * **It is monochrome, and meaning is carried by shape rather than hue.** A
 * plan is read for structure — what is long, what overlaps, what is late — and
 * a palette assigning arbitrary colours to tasks adds a legend to learn without
 * adding information. It also means the two states that matter are not encoded
 * in colour alone, which is the usual accessibility failure: the critical path
 * is ringed and a dependency conflict is outlined in dashes, both legible to
 * anyone who cannot separate red from grey.
 *
 * **The critical path is computed, not annotated.** Highlighting it by hand is
 * how a Gantt goes stale: someone slips a task, nobody re-marks the path, and
 * the chart now points at the wrong risk. Dependency conflicts — a task
 * starting before what it depends on ends — are surfaced as you create them,
 * because an impossible schedule should look impossible while you are making
 * it, not after you save.
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
  milestone?: boolean
  /** Excluded from dragging and from keyboard editing. */
  locked?: boolean
}

type GanttProps = Omit<ComponentProps<'div'>, 'onSelect' | 'onChange'> & {
  tasks: GanttTask[]
  /** The whole list after an edit. Omit to make the chart read-only. */
  onChange?: (tasks: GanttTask[]) => void
  /** Just the task that moved, for a targeted PATCH. */
  onTaskChange?: (task: GanttTask, previous: GanttTask) => void
  onSelect?: (task: GanttTask) => void
  selectedId?: string
  /** Grid the drag snaps to. A day by default. */
  snapMinutes?: number
  /** Derive and highlight the longest dependency chain. */
  criticalPath?: boolean
  /** Column width for the task names. */
  labelWidth?: number
  rowHeight?: number
  dateFormat?: (date: Date) => string
  /** Number of ticks along the top. */
  ticks?: number
  today?: Date
  emptyLabel?: string
  label?: string
}

const MINUTE = 60_000
const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))
const DEFAULT_DATE_FORMAT: (date: Date) => string = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

type Mode = 'move' | 'start' | 'end'
type Drag = { id: string; mode: Mode; pointerX: number; start: number; end: number }

function Gantt({
  tasks,
  onChange,
  onTaskChange,
  onSelect,
  selectedId,
  snapMinutes = 1440,
  criticalPath = true,
  labelWidth = 160,
  rowHeight = 34,
  dateFormat = DEFAULT_DATE_FORMAT,
  ticks = 5,
  today,
  emptyLabel = 'Nothing scheduled.',
  label = 'Gantt chart',
  className,
  ...props
}: GanttProps) {
  const titleId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  /** The task being dragged, as it will be if released now. */
  const [preview, setPreview] = useState<{ id: string; start: number; end: number } | null>(null)

  const editable = Boolean(onChange || onTaskChange)

  const model = useMemo(() => {
    if (tasks.length === 0) return null

    const rows = tasks.map((task) => ({
      task,
      start: asDate(task.start).getTime(),
      end: asDate(task.end).getTime(),
    }))

    // The window is padded by one snap either side, so a task can always be
    // dragged past the current extremes rather than hitting an invisible wall.
    const pad = snapMinutes * MINUTE
    const first = Math.min(...rows.map((row) => row.start)) - pad
    const last = Math.max(...rows.map((row) => row.end)) + pad

    const byId = new Map(rows.map((row) => [row.task.id, row]))
    const critical = new Set<string>()

    if (criticalPath) {
      const memo = new Map<string, number>()
      const open = new Set<string>()
      const longest = (id: string): number => {
        if (memo.has(id)) return memo.get(id) as number
        // A dependency cycle has no longest path; stop rather than recurse.
        if (open.has(id)) return 0
        open.add(id)
        const row = byId.get(id)
        if (!row) return 0
        const parents = row.task.dependsOn ?? []
        const best = parents.length ? Math.max(...parents.map(longest)) : 0
        const value = best + (row.end - row.start)
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

    return { rows, first, last, span: last - first || 1, critical, byId }
  }, [tasks, criticalPath, snapMinutes])

  /** Where a task sits right now, preferring the in-flight drag. */
  const timesOf = useCallback(
    (id: string, fallback: { start: number; end: number }) =>
      preview?.id === id ? { start: preview.start, end: preview.end } : fallback,
    [preview],
  )

  /** Conflicts recomputed against the drag, so they appear as you create them. */
  const conflicts = useMemo(() => {
    if (!model) return new Set<string>()
    const out = new Set<string>()
    for (const row of model.rows) {
      const self = timesOf(row.task.id, row)
      for (const parent of row.task.dependsOn ?? []) {
        const other = model.byId.get(parent)
        if (!other) continue
        if (self.start < timesOf(parent, other).end) out.add(row.task.id)
      }
    }
    return out
  }, [model, timesOf])

  /**
   * Latest values for the window listeners.
   *
   * The listeners are bound once, not on every render: re-binding them each
   * time works but adds and removes two listeners per frame of a drag. Reading
   * through a ref keeps them current without making them a dependency.
   */
  const latest = useRef({ tasks, model, snapMinutes, onChange, onTaskChange })

  const commit = (id: string, start: number, end: number) => {
    const previous = tasks.find((task) => task.id === id)
    if (!previous) return
    const next: GanttTask = { ...previous, start: new Date(start), end: new Date(end) }
    onTaskChange?.(next, previous)
    onChange?.(tasks.map((task) => (task.id === id ? next : task)))
  }

  latest.current = { tasks, model, snapMinutes, onChange, onTaskChange }

  const beginDrag = (event: ReactPointerEvent, id: string, mode: Mode) => {
    if (!editable) return
    const row = model?.byId.get(id)
    if (!row || row.task.locked) return

    event.preventDefault()
    event.stopPropagation()
    try {
      ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    } catch {
      // A pointer that is no longer active cannot be captured.
    }
    drag.current = { id, mode, pointerX: event.clientX, start: row.start, end: row.end }
    setPreview({ id, start: row.start, end: row.end })
  }

  useEffect(() => {
    if (!editable) return

    const currentMsPerPixel = () => {
      const width = trackRef.current?.clientWidth ?? 0
      const current = latest.current.model
      return width > 0 && current ? current.span / width : 0
    }
    const currentSnap = (time: number) => {
      const step = latest.current.snapMinutes * MINUTE
      return Math.round(time / step) * step
    }
    const currentCommit = (id: string, start: number, end: number) => {
      const list = latest.current.tasks
      const previous = list.find((task) => task.id === id)
      if (!previous) return
      const next: GanttTask = { ...previous, start: new Date(start), end: new Date(end) }
      latest.current.onTaskChange?.(next, previous)
      latest.current.onChange?.(list.map((task) => (task.id === id ? next : task)))
    }

    /*
     * Move and release are bound to the window, not the bar.
     *
     * A pointer that leaves the element mid-drag — which is most of them, since
     * the whole point is to travel — would otherwise stop updating, and a
     * release outside would never commit, leaving the bar stuck to the cursor.
     */
    const onMove = (event: PointerEvent) => {
      const state = drag.current
      if (!state) return

      const delta = (event.clientX - state.pointerX) * currentMsPerPixel()
      const duration = state.end - state.start
      const step = latest.current.snapMinutes * MINUTE

      if (state.mode === 'move') {
        const start = currentSnap(state.start + delta)
        setPreview({ id: state.id, start, end: start + duration })
      } else if (state.mode === 'start') {
        // A start dragged past the end would invert the bar; clamp to one snap.
        const start = Math.min(currentSnap(state.start + delta), state.end - step)
        setPreview({ id: state.id, start, end: state.end })
      } else {
        const end = Math.max(currentSnap(state.end + delta), state.start + step)
        setPreview({ id: state.id, start: state.start, end })
      }
    }

    const onUp = () => {
      const state = drag.current
      drag.current = null
      setPreview((current) => {
        if (state && current && current.id === state.id) {
          if (current.start !== state.start || current.end !== state.end) {
            currentCommit(current.id, current.start, current.end)
          }
        }
        return null
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [editable])

  if (!model) {
    return (
      <div className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </div>
    )
  }

  const { rows, first, span, critical } = model
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

      <div className="min-w-[34rem]">
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
          {today && (
            <span
              aria-hidden="true"
              className="bg-foreground absolute top-0 bottom-0 z-10 w-px opacity-40"
              style={{
                insetInlineStart: `calc(${labelWidth}px + (100% - ${labelWidth}px) * ${
                  at(today.getTime()) / 100
                })`,
              }}
            />
          )}

          {rows.map(({ task, start: baseStart, end: baseEnd }) => {
            const { start, end } = timesOf(task.id, { start: baseStart, end: baseEnd })
            const onPath = critical.has(task.id)
            const broken = conflicts.has(task.id)
            // Weight, not hue: a bar on the critical path is simply denser.
            const density = onPath ? 0.92 : 0.7
            const dragging = preview?.id === task.id
            const width = Math.max(task.milestone ? 0 : 0.6, at(end) - at(start))

            const readable = `${asDate(new Date(start)).toLocaleDateString()} – ${asDate(
              new Date(end),
            ).toLocaleDateString()}`

            return (
              <div key={task.id} className="flex items-center" style={{ height: rowHeight }}>
                <span
                  className="text-foreground shrink-0 truncate pe-3 text-xs"
                  style={{ width: labelWidth }}
                >
                  {task.label}
                </span>

                <div ref={trackRef} className="relative h-full flex-1">
                  <div
                    role={editable && !task.locked ? 'slider' : undefined}
                    tabIndex={editable && !task.locked ? 0 : undefined}
                    aria-label={
                      typeof task.label === 'string' ? task.label : `Task ${task.id}`
                    }
                    aria-valuetext={readable}
                    aria-invalid={broken || undefined}
                    title={`${readable}${onPath ? ' · critical path' : ''}${
                      broken ? ' · starts before a dependency ends' : ''
                    }`}
                    onPointerDown={(event) => beginDrag(event, task.id, 'move')}
                    onClick={() => onSelect?.(task)}
                    onKeyDown={(event) => {
                      if (!editable || task.locked) return
                      const step = snapMinutes * MINUTE
                      const direction =
                        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
                      if (!direction) return
                      event.preventDefault()
                      // Shift resizes; plain arrows move. Both by one snap, so
                      // the keyboard produces the same values a drag can.
                      if (event.shiftKey) {
                        commit(task.id, start, Math.max(start + step, end + direction * step))
                      } else {
                        commit(task.id, start + direction * step, end + direction * step)
                      }
                    }}
                    className={cn(
                      'group absolute top-1/2 -translate-y-1/2 overflow-visible',
                      task.milestone ? 'size-3 rotate-45 rounded-[2px]' : 'h-5 rounded-[3px]',
                      editable && !task.locked ? 'cursor-grab' : 'cursor-default',
                      dragging && 'cursor-grabbing shadow-lg',
                      onPath && 'ring-foreground ring-1 ring-offset-1',
                      // Dashed, not red: the state has to survive being printed
                      // in grey or read by someone who cannot see the hue.
                      broken && 'outline-foreground outline-2 outline-dashed',
                      focusRing,
                    )}
                    style={{
                      insetInlineStart: `${at(start)}%`,
                      width: task.milestone ? undefined : `${width}%`,
                      background: 'var(--foreground)',
                      opacity: dragging ? 1 : density,
                    }}
                  >
                    {task.progress !== undefined && !task.milestone && (
                      <span
                        aria-hidden="true"
                        className="bg-background/35 absolute inset-y-0 start-0 rounded-s-[3px]"
                        style={{ width: `${Math.min(100, Math.max(0, task.progress * 100))}%` }}
                      />
                    )}

                    {/* Edge handles. Wider than they look — an 8px target is
                        the difference between resizing and moving by accident. */}
                    {editable && !task.locked && !task.milestone && (
                      <>
                        <span
                          role="presentation"
                          onPointerDown={(event) => beginDrag(event, task.id, 'start')}
                          className={cn(
                            'absolute inset-y-0 -start-1 w-2 cursor-ew-resize',
                            radius.xs,
                            'opacity-0 group-hover:bg-white/60 group-hover:opacity-100',
                          )}
                        />
                        <span
                          role="presentation"
                          onPointerDown={(event) => beginDrag(event, task.id, 'end')}
                          className={cn(
                            'absolute inset-y-0 -end-1 w-2 cursor-ew-resize',
                            radius.xs,
                            'opacity-0 group-hover:bg-white/60 group-hover:opacity-100',
                          )}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {conflicts.size > 0 && (
          <p role="status" className="text-foreground mt-2 text-[11px] font-medium">
            {conflicts.size} dependency {conflicts.size === 1 ? 'conflict' : 'conflicts'}: a task
            starts before what it depends on finishes.
          </p>
        )}
      </div>
    </div>
  )
}

export { Gantt }
export type { GanttProps }
