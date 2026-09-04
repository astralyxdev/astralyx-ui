import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A week of days with events laid out against the hours, and edited in place.
 *
 * **`Calendar` picks a date; this shows what is in it.** They are different
 * components with different jobs, and conflating them produces a date picker
 * with a broken agenda glued on.
 *
 * **A calendar you cannot drag on is a printout.** Moving a meeting, making it
 * longer, and blocking out an hour are the three things people do with a week
 * view, so all three are direct: drag an event to move it — across days as well
 * as hours — drag its bottom edge to change the end, and drag on empty grid to
 * create.
 *
 * **Everything snaps to `snapMinutes`.** Fifteen is the unit calendars are
 * actually kept in; without a grid a drag produces 10:07–11:04 and nobody wants
 * that meeting.
 *
 * **Events are cards, in the same surface the rest of the kit uses.** A week
 * view is a reading surface, not a heat map: a card with a border, a title and
 * a time is scannable, and it sits in a page beside other cards without looking
 * like a different product. A solid rail down the leading edge is what marks it
 * as an event, and it is the one element that stays at full strength when the
 * card is dimmed.
 *
 * **It is monochrome.** A week is read for shape — where the gaps are, what
 * collides — and colouring events by an arbitrary category adds a legend
 * without adding information. Overlapping blocks are separated by a hairline in
 * the page's own background rather than by hue, which keeps them distinct at
 * any theme and in print.
 *
 * **Overlapping events are laid out in columns, not stacked.** Two meetings at
 * the same time drawn on top of each other means one is invisible, which is the
 * worst thing a calendar can do — the hidden one is the one you miss. Overlaps
 * are grouped into clusters and each cluster is split into as many columns as
 * it needs, so every event keeps a visible edge, and that stays true while you
 * are dragging one on top of another.
 *
 * **Times are rendered in the caller's timezone and days are keyed by local
 * date.** A calendar that keys by UTC puts a 23:00 event on the wrong day for
 * anyone west of Greenwich — a common bug, and invisible from the timezone it
 * was written in.
 *
 * Events are also editable from the keyboard: arrow keys move by a snap,
 * shift-arrow changes the end, and the current time is announced through
 * `aria-valuetext`.
 */
export type SchedulerEvent = {
  id: string
  title: ReactNode
  start: Date | string
  end: Date | string
  /** Drawn as a full-width band above the grid. */
  allDay?: boolean
  /** Excluded from dragging and keyboard editing. */
  locked?: boolean
}

type SchedulerProps = Omit<ComponentProps<'div'>, 'onSelect' | 'onChange'> & {
  events: SchedulerEvent[]
  /** The whole list after an edit. Omit to make the grid read-only. */
  onChange?: (events: SchedulerEvent[]) => void
  /** Just the event that moved. */
  onEventChange?: (event: SchedulerEvent, previous: SchedulerEvent) => void
  /** A drag on empty grid. Return an id, or nothing to decline. */
  onCreate?: (start: Date, end: Date) => SchedulerEvent | void
  onSelect?: (event: SchedulerEvent) => void
  /** Any date inside the week to show. */
  week?: Date
  /** 0 is Sunday, 1 Monday. */
  weekStartsOn?: number
  days?: number
  /** First and last hour drawn. */
  dayStart?: number
  dayEnd?: number
  /**
   * Pixels per hour. Generous by default — a week view is a reading surface,
   * and an hour compressed to 40px cannot hold a title and a time.
   */
  hourHeight?: number
  /** Grid the drag snaps to. */
  snapMinutes?: number
  locale?: string
  emptyLabel?: string
  label?: string
}

const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))
/** Local date key — never UTC, or evening events land on the wrong day. */
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes()

type Mode = 'move' | 'resize' | 'create'
type Drag = {
  mode: Mode
  id?: string
  /** Minutes from the top of the event to the grab point, for `move`. */
  grabOffset: number
  duration: number
  /** Live result, mirrored into state for rendering. */
  dayIndex: number
  startMinutes: number
  endMinutes: number
}

function Scheduler({
  events,
  onChange,
  onEventChange,
  onCreate,
  onSelect,
  week,
  weekStartsOn = 1,
  days = 7,
  dayStart = 8,
  dayEnd = 20,
  hourHeight = 64,
  snapMinutes = 15,
  locale,
  emptyLabel = 'Nothing this week.',
  label = 'Schedule',
  className,
  ...props
}: SchedulerProps) {
  const titleId = useId()
  const gridRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [preview, setPreview] = useState<Drag | null>(null)

  const editable = Boolean(onChange || onEventChange)

  const columns = useMemo(() => {
    const anchor = week ? new Date(week) : new Date()
    anchor.setHours(0, 0, 0, 0)
    anchor.setDate(anchor.getDate() - ((anchor.getDay() - weekStartsOn + 7) % 7))
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(anchor)
      date.setDate(anchor.getDate() + index)
      return date
    })
  }, [week, weekStartsOn, days])

  /** Events with the in-flight drag applied, so layout reflows as you move. */
  const resolved = useMemo(() => {
    return events.map((event) => {
      const start = asDate(event.start)
      const end = asDate(event.end)
      if (!preview || preview.id !== event.id) return { event, start, end }

      const day = columns[preview.dayIndex] ?? start
      const moved = new Date(day)
      moved.setHours(0, preview.startMinutes, 0, 0)
      const until = new Date(day)
      until.setHours(0, preview.endMinutes, 0, 0)
      return { event, start: moved, end: until }
    })
  }, [events, preview, columns])

  /** Cluster overlaps and give each cluster as many columns as it needs. */
  const layoutFor = (date: Date) => {
    const key = dayKey(date)
    const timed = resolved
      .filter((item) => !item.event.allDay && dayKey(item.start) === key)
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const placed: {
      event: SchedulerEvent
      start: Date
      end: Date
      top: number
      height: number
      column: number
      columns: number
      short: boolean
    }[] = []

    let cluster: typeof timed = []
    let clusterEnd = 0

    const flush = () => {
      if (cluster.length === 0) return
      const lanes: number[] = []
      const assigned = cluster.map((item) => {
        let lane = lanes.findIndex((free) => free <= item.start.getTime())
        if (lane === -1) {
          lane = lanes.length
          lanes.push(0)
        }
        lanes[lane] = item.end.getTime()
        return { item, lane }
      })

      const window = (dayEnd - dayStart) * 60
      for (const { item, lane } of assigned) {
        const from = minutesOf(item.start)
        const to = minutesOf(item.end)
        placed.push({
          event: item.event,
          start: item.start,
          end: item.end,
          top: ((from - dayStart * 60) / window) * 100,
          height: Math.max(1.5, ((to - from) / window) * 100),
          column: lane,
          columns: lanes.length,
          // A short event has no room for a second line, so it gets a single
          // one rather than two clipped halves. Stacking title over time in a
          // 26px card shows the top of each and neither in full.
          short: to - from < 45,
        })
      }
      cluster = []
    }

    for (const item of timed) {
      if (cluster.length > 0 && item.start.getTime() >= clusterEnd) flush()
      cluster.push(item)
      clusterEnd = Math.max(clusterEnd, item.end.getTime())
    }
    flush()

    return {
      placed,
      allDay: resolved.filter((item) => item.event.allDay && dayKey(item.start) === key),
    }
  }

  /* ------------------------------------------------------------ dragging */

  const latest = useRef({ events, columns, onChange, onEventChange, onCreate, snapMinutes, dayStart, dayEnd })
  latest.current = { events, columns, onChange, onEventChange, onCreate, snapMinutes, dayStart, dayEnd }

  const commit = (id: string, day: Date, startMinutes: number, endMinutes: number) => {
    const list = latest.current.events
    const previous = list.find((item) => item.id === id)
    if (!previous) return

    const start = new Date(day)
    start.setHours(0, startMinutes, 0, 0)
    const end = new Date(day)
    end.setHours(0, endMinutes, 0, 0)

    const next: SchedulerEvent = { ...previous, start, end }
    latest.current.onEventChange?.(next, previous)
    latest.current.onChange?.(list.map((item) => (item.id === id ? next : item)))
  }

  const beginDrag = (
    event: ReactPointerEvent,
    mode: Mode,
    payload: { id?: string; dayIndex: number; startMinutes: number; endMinutes: number },
  ) => {
    if (!editable && mode !== 'create') return
    if (mode === 'create' && !onCreate) return

    event.preventDefault()
    event.stopPropagation()

    const pointer = pointerToGrid(event.clientX, event.clientY)
    const state: Drag = {
      mode,
      id: payload.id,
      grabOffset: pointer ? pointer.minutes - payload.startMinutes : 0,
      duration: payload.endMinutes - payload.startMinutes,
      dayIndex: payload.dayIndex,
      startMinutes: payload.startMinutes,
      endMinutes: payload.endMinutes,
    }
    drag.current = state
    setPreview(state)
  }

  /** Pointer position as a day column and a snapped minute of that day. */
  const pointerToGrid = (clientX: number, clientY: number) => {
    const grid = gridRef.current
    if (!grid) return null
    const box = grid.getBoundingClientRect()
    const { snapMinutes: step, dayStart: from, dayEnd: to, columns: cols } = latest.current

    const width = box.width / cols.length
    const dayIndex = Math.min(cols.length - 1, Math.max(0, Math.floor((clientX - box.left) / width)))

    const window = (to - from) * 60
    const raw = from * 60 + ((clientY - box.top) / box.height) * window
    const minutes = Math.round(raw / step) * step

    return { dayIndex, minutes: Math.min(to * 60, Math.max(from * 60, minutes)) }
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const state = drag.current
      if (!state) return
      const point = pointerToGrid(event.clientX, event.clientY)
      if (!point) return

      const { snapMinutes: step, dayEnd: to } = latest.current

      if (state.mode === 'resize') {
        // The end cannot pass the start; one snap is the shortest event.
        const end = Math.max(state.startMinutes + step, Math.min(point.minutes, to * 60))
        const next = { ...state, endMinutes: end }
        drag.current = next
        setPreview(next)
        return
      }

      if (state.mode === 'create') {
        const from = Math.min(state.startMinutes, point.minutes)
        const end = Math.max(state.startMinutes + step, point.minutes)
        const next = { ...state, startMinutes: from, endMinutes: end, dayIndex: state.dayIndex }
        drag.current = next
        setPreview(next)
        return
      }

      // Move: the grab offset keeps the pointer on the same part of the event,
      // rather than snapping its top to the cursor.
      const start = Math.max(
        latest.current.dayStart * 60,
        Math.min(point.minutes - state.grabOffset, to * 60 - state.duration),
      )
      const next = {
        ...state,
        dayIndex: point.dayIndex,
        startMinutes: start,
        endMinutes: start + state.duration,
      }
      drag.current = next
      setPreview(next)
    }

    const onUp = () => {
      const state = drag.current
      drag.current = null
      setPreview(null)
      if (!state) return

      const day = latest.current.columns[state.dayIndex]
      if (!day) return

      if (state.mode === 'create') {
        const start = new Date(day)
        start.setHours(0, state.startMinutes, 0, 0)
        const end = new Date(day)
        end.setHours(0, state.endMinutes, 0, 0)
        const created = latest.current.onCreate?.(start, end)
        if (created) latest.current.onChange?.([...latest.current.events, created])
        return
      }

      if (state.id) commit(state.id, day, state.startMinutes, state.endMinutes)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const hours = Array.from({ length: dayEnd - dayStart }, (_, index) => dayStart + index)
  const windowMinutes = (dayEnd - dayStart) * 60
  const timeOf = (date: Date) =>
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      data-slot="scheduler"
      className={cn('w-full overflow-x-auto', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <p id={titleId} className="sr-only">
        {label}
      </p>

      {events.length === 0 && <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>}

      <div className="min-w-[40rem]">
        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days}, 1fr)` }}>
          <span />
          {columns.map((date) => {
            const isToday = dayKey(date) === dayKey(new Date())
            return (
              <div
                key={date.toISOString()}
                className="border-border flex items-baseline justify-center gap-1.5 border-b px-2 pt-1 pb-2"
              >
                <span className="text-muted-foreground text-xs uppercase">
                  {date.toLocaleDateString(locale, { weekday: 'short' })}
                </span>
                <span
                  className={cn(
                    'text-base font-medium tabular-nums',
                    // Today is weighted, not tinted — the whole grid is
                    // monochrome, so emphasis has to come from weight.
                    isToday &&
                      'bg-foreground text-background flex size-6 items-center justify-center rounded-full text-sm',
                  )}
                >
                  {date.getDate()}
                </span>
              </div>
            )
          })}

          <span />
          {columns.map((date) => (
            <div
              key={`allday-${date.toISOString()}`}
              className="border-border min-h-9 border-b border-e p-1"
            >
              {layoutFor(date).allDay.map(({ event }) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelect?.(event)}
                  className={cn(
                    'relative mb-1 block w-full truncate ps-2.5 pe-2 py-1 text-start text-xs',
                    surface,
                    radius.control,
                    'hover:bg-muted',
                    focusRing,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="bg-foreground absolute inset-y-1 start-1 w-[3px] rounded-full"
                  />
                  {event.title}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days}, 1fr)` }}>
          <div className="border-border border-e">
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: hourHeight }}>
                {/* Sat on the line it labels, not centred in the band below it. */}
                <span className="text-muted-foreground absolute end-2 -top-1.5 text-[11px] tabular-nums">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/*
            One grid element spanning every day, measured once.

            The pointer has to be resolvable to a *day* as well as a time — a
            drag that starts on Tuesday and ends on Thursday is the ordinary
            case — so the geometry is taken from the whole grid rather than from
            whichever column the gesture began in.
          */}
          <div
            ref={gridRef}
            className="col-span-full grid"
            style={{
              gridTemplateColumns: `repeat(${days}, 1fr)`,
              gridColumn: '2 / -1',
              height: hours.length * hourHeight,
            }}
          >
            {columns.map((date, dayIndex) => {
              const { placed } = layoutFor(date)

              return (
                <div
                  key={`grid-${date.toISOString()}`}
                  className="border-border relative border-e px-px"
                  onPointerDown={(event) => {
                    // Empty grid: start drawing a new event.
                    if (event.target !== event.currentTarget) return
                    const point = pointerToGrid(event.clientX, event.clientY)
                    if (!point) return
                    beginDrag(event, 'create', {
                      dayIndex,
                      startMinutes: point.minutes,
                      endMinutes: point.minutes + snapMinutes,
                    })
                  }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      aria-hidden="true"
                      className="border-border pointer-events-none relative border-b"
                      style={{ height: hourHeight }}
                    >
                      {/* The half hour, lighter — enough to aim a 30-minute
                          drag at without ruling the grid twice. */}
                      <span className="border-border/40 absolute inset-x-0 top-1/2 border-b border-dashed" />
                    </div>
                  ))}

                  {/* The event being drawn, before it exists. */}
                  {preview?.mode === 'create' && preview.dayIndex === dayIndex && (
                    <div
                      aria-hidden="true"
                      className="border-foreground/40 bg-foreground/10 pointer-events-none absolute inset-x-1 rounded-[3px] border border-dashed"
                      style={{
                        top: `${((preview.startMinutes - dayStart * 60) / windowMinutes) * 100}%`,
                        height: `${((preview.endMinutes - preview.startMinutes) / windowMinutes) * 100}%`,
                      }}
                    />
                  )}

                  {placed.map((item) => {
                    const locked = item.event.locked || !editable
                    const dragging = preview?.id === item.event.id
                    const readable = `${timeOf(item.start)} – ${timeOf(item.end)}`

                    return (
                      <div
                        key={item.event.id}
                        role={locked ? undefined : 'slider'}
                        tabIndex={locked ? undefined : 0}
                        aria-label={
                          typeof item.event.title === 'string' ? item.event.title : 'Event'
                        }
                        aria-valuetext={`${readable}, ${item.start.toLocaleDateString(locale)}`}
                        title={readable}
                        onPointerDown={(pointerEvent) =>
                          !locked &&
                          beginDrag(pointerEvent, 'move', {
                            id: item.event.id,
                            dayIndex,
                            startMinutes: minutesOf(item.start),
                            endMinutes: minutesOf(item.end),
                          })
                        }
                        onClick={() => onSelect?.(item.event)}
                        onKeyDown={(keyEvent) => {
                          if (locked) return
                          const step =
                            keyEvent.key === 'ArrowDown' ? snapMinutes
                            : keyEvent.key === 'ArrowUp' ? -snapMinutes
                            : 0
                          const dayStep =
                            keyEvent.key === 'ArrowRight' ? 1 : keyEvent.key === 'ArrowLeft' ? -1 : 0
                          if (!step && !dayStep) return
                          keyEvent.preventDefault()

                          const from = minutesOf(item.start)
                          const to = minutesOf(item.end)
                          const targetDay =
                            columns[Math.min(columns.length - 1, Math.max(0, dayIndex + dayStep))]

                          if (keyEvent.shiftKey && step) {
                            commit(item.event.id, targetDay, from, Math.max(from + snapMinutes, to + step))
                          } else {
                            commit(item.event.id, targetDay, from + step, to + step)
                          }
                        }}
                        className={cn(
                          'group absolute flex overflow-hidden ps-2.5 pe-1.5 text-start',
                          item.short ? 'items-center py-0' : 'flex-col py-1',
                          surface,
                          radius.control,
                          'shadow-sm',
                          locked ? 'cursor-default' : 'cursor-grab hover:bg-muted',
                          dragging && 'ring-foreground cursor-grabbing shadow-md ring-2',
                          focusRing,
                        )}
                        style={{
                          top: `${item.top}%`,
                          height: `${item.height}%`,
                          // Enough to hold a title and a time even for a
                          // fifteen-minute event, which is the shortest one the
                          // default snap can produce.
                          minHeight: item.short ? 20 : 34,
                          // Columns, so a clash never hides an event entirely.
                          insetInlineStart: `calc(${(item.column / item.columns) * 100}% + 2px)`,
                          width: `calc(${100 / item.columns}% - 6px)`,
                        }}
                      >
                        {/* The rail is what reads as "event"; it stays at full
                            strength when the card itself is quiet. */}
                        <span
                          aria-hidden="true"
                          className="bg-foreground absolute inset-y-1 start-1 w-[3px] rounded-full"
                        />
                        {item.short ? (
                          <span className="flex min-w-0 items-baseline gap-1.5">
                            <span className="truncate text-xs font-medium">{item.event.title}</span>
                            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                              {timeOf(item.start)}
                            </span>
                          </span>
                        ) : (
                          <>
                            <span className="truncate text-xs font-medium">{item.event.title}</span>
                            <span className="text-muted-foreground truncate text-[11px] tabular-nums">
                              {timeOf(item.start)} – {timeOf(item.end)}
                            </span>
                          </>
                        )}

                        {/* Bottom edge: change the end without moving the start. */}
                        {!locked && (
                          <span
                            role="presentation"
                            onPointerDown={(pointerEvent) => {
                              pointerEvent.stopPropagation()
                              beginDrag(pointerEvent, 'resize', {
                                id: item.event.id,
                                dayIndex,
                                startMinutes: minutesOf(item.start),
                                endMinutes: minutesOf(item.end),
                              })
                            }}
                            className={cn(
                              'absolute inset-x-0 bottom-0 h-2 cursor-ns-resize',
                              // Invisible until you are near it, then a clear
                              // grip — a permanent bar on every card is noise.
                              'after:bg-muted-foreground/50 after:absolute after:inset-x-1/3 after:bottom-0.5 after:h-0.5',
                              'after:rounded-full after:opacity-0 group-hover:after:opacity-100',
                            )}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export { Scheduler }
export type { SchedulerProps }
