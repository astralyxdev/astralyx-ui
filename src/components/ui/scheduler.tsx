import { useId, useMemo, type ComponentProps, type ReactNode } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A week of days with events laid out against the hours.
 *
 * **`Calendar` picks a date; this shows what is in it.** They are different
 * components with different jobs, and conflating them produces a date picker
 * with a broken agenda glued on.
 *
 * **Overlapping events are laid out in columns, not stacked.** Two meetings at
 * the same time drawn on top of each other means one is invisible, which is the
 * single worst thing a calendar can do — the hidden one is the one you miss.
 * Overlaps are grouped into clusters and each cluster is split into as many
 * columns as it needs, so every event keeps a visible edge.
 *
 * **Times are rendered in the caller's timezone via `Intl`, and days are keyed
 * by local date.** A calendar that keys by UTC date puts a 23:00 event on the
 * wrong day for anyone west of Greenwich, which is a very common bug and hard
 * to spot from the timezone it was written in.
 *
 * `dayStart`/`dayEnd` crop the grid to working hours, because eight of the
 * twenty-four rows carry all the information in most calendars.
 */
export type SchedulerEvent = {
  id: string
  title: ReactNode
  start: Date | string
  end: Date | string
  color?: string
  /** Drawn as a full-width band above the grid. */
  allDay?: boolean
}

type SchedulerProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  events: SchedulerEvent[]
  /** Any date inside the week to show. */
  week?: Date
  /** 0 is Sunday, 1 Monday. */
  weekStartsOn?: number
  days?: number
  /** First and last hour drawn. */
  dayStart?: number
  dayEnd?: number
  hourHeight?: number
  onSelect?: (event: SchedulerEvent) => void
  onSelectSlot?: (start: Date) => void
  locale?: string
  emptyLabel?: string
  label?: string
}

const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))
/** Local date key — never UTC, or evening events land on the wrong day. */
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

function Scheduler({
  events,
  week,
  weekStartsOn = 1,
  days = 7,
  dayStart = 8,
  dayEnd = 20,
  hourHeight = 44,
  onSelect,
  onSelectSlot,
  locale,
  emptyLabel = 'Nothing this week.',
  label = 'Schedule',
  className,
  ...props
}: SchedulerProps) {
  const titleId = useId()

  const model = useMemo(() => {
    const anchor = week ? new Date(week) : new Date()
    anchor.setHours(0, 0, 0, 0)
    const offset = (anchor.getDay() - weekStartsOn + 7) % 7
    anchor.setDate(anchor.getDate() - offset)

    const columns = Array.from({ length: days }, (_, index) => {
      const date = new Date(anchor)
      date.setDate(anchor.getDate() + index)
      return date
    })

    const parsed = events.map((event) => ({
      event,
      start: asDate(event.start),
      end: asDate(event.end),
    }))

    /**
     * Split a day's events into overlap clusters, then give each cluster as
     * many columns as its widest overlap — so nothing is ever hidden behind
     * something else.
     */
    const layoutDay = (date: Date) => {
      const key = dayKey(date)
      const timed = parsed
        .filter((item) => !item.event.allDay && dayKey(item.start) === key)
        .sort((a, b) => a.start.getTime() - b.start.getTime())

      const placed: {
        event: SchedulerEvent
        top: number
        height: number
        column: number
        columns: number
      }[] = []

      let cluster: typeof timed = []
      let clusterEnd = 0

      const flush = () => {
        if (cluster.length === 0) return
        // Greedy column assignment inside the cluster.
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

        for (const { item, lane } of assigned) {
          const startHour = item.start.getHours() + item.start.getMinutes() / 60
          const endHour = item.end.getHours() + item.end.getMinutes() / 60
          placed.push({
            event: item.event,
            top: ((startHour - dayStart) / (dayEnd - dayStart)) * 100,
            height: Math.max(1.5, ((endHour - startHour) / (dayEnd - dayStart)) * 100),
            column: lane,
            columns: lanes.length,
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

      const allDay = parsed.filter(
        (item) => item.event.allDay && dayKey(item.start) === key,
      )

      return { placed, allDay }
    }

    return { columns, layoutDay, count: parsed.length }
  }, [events, week, weekStartsOn, days, dayStart, dayEnd])

  const { columns, layoutDay, count } = model
  const hours = Array.from({ length: dayEnd - dayStart }, (_, index) => dayStart + index)

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

      {count === 0 && <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>}

      <div className="grid min-w-[40rem]" style={{ gridTemplateColumns: `3.5rem repeat(${days}, 1fr)` }}>
        <span />
        {columns.map((date) => (
          <div key={date.toISOString()} className="border-border border-b px-1 pb-1 text-center">
            <p className="text-muted-foreground text-[11px]">
              {date.toLocaleDateString(locale, { weekday: 'short' })}
            </p>
            <p className="text-sm font-medium tabular-nums">{date.getDate()}</p>
          </div>
        ))}

        <span />
        {columns.map((date) => {
          const { allDay } = layoutDay(date)
          return (
            <div key={`allday-${date.toISOString()}`} className="border-border min-h-6 border-b p-0.5">
              {allDay.map(({ event }) => (
                <button
                  key={event.id}
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(event)}
                  className="mb-0.5 block w-full truncate rounded-[3px] px-1 py-0.5 text-start text-[10px] text-white"
                  style={{ background: event.color ?? dataPalette[0].fill }}
                >
                  {event.title}
                </button>
              ))}
            </div>
          )
        })}

        <div className="border-border border-e">
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-muted-foreground pe-1 text-end text-[10px] tabular-nums"
              style={{ height: hourHeight }}
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {columns.map((date) => {
          const { placed } = layoutDay(date)
          return (
            <div
              key={`grid-${date.toISOString()}`}
              className="border-border relative border-e"
              style={{ height: hours.length * hourHeight }}
            >
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  disabled={!onSelectSlot}
                  aria-label={`${date.toLocaleDateString(locale)} ${hour}:00`}
                  onClick={() => {
                    const slot = new Date(date)
                    slot.setHours(hour, 0, 0, 0)
                    onSelectSlot?.(slot)
                  }}
                  className="border-border/60 block w-full border-b"
                  style={{ height: hourHeight }}
                />
              ))}

              {placed.map((item) => (
                <button
                  key={item.event.id}
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(item.event)}
                  title={`${asDate(item.event.start).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} – ${asDate(item.event.end).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
                  className="absolute overflow-hidden rounded-[3px] px-1 py-0.5 text-start text-[10px] leading-tight text-white"
                  style={{
                    top: `${item.top}%`,
                    height: `${item.height}%`,
                    // Columns, so a clash never hides an event entirely.
                    insetInlineStart: `${(item.column / item.columns) * 100}%`,
                    width: `calc(${100 / item.columns}% - 2px)`,
                    background: item.event.color ?? dataPalette[1].fill,
                  }}
                >
                  {item.event.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { Scheduler }
export type { SchedulerProps }
