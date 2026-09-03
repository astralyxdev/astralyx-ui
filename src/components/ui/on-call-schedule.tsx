import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Tooltip } from '@/components/ui/tooltip'
import { dataPalette, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An on-call rotation across a window of days.
 *
 * Shifts are positioned proportionally in the window rather than snapped to a
 * day grid. Rotations hand over at 09:00 on a Tuesday, not at midnight, and a
 * calendar that rounds to whole days shows the wrong person as on call for
 * most of two of them.
 *
 * Who is on call *now* is stated in words above the timeline. That is the only
 * question this component is ever opened to answer, and making someone read it
 * off a bar chart during an incident is a poor trade.
 */
export type Shift = {
  id: string
  person: string
  start: Date
  end: Date
  /** e.g. "Primary", "Secondary" */
  layer?: string
  color?: string
}

function OnCallSchedule({
  shifts,
  start,
  end,
  now,
  locale = 'en-GB',
  title = 'On call now',
  nobodyLabel = 'Nobody',
  untilLabel = 'until',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  shifts: Shift[]
  start: Date
  end: Date
  now?: Date
  locale?: string
  title?: ReactNode
  /** Shown when no shift covers the current moment. */
  nobodyLabel?: ReactNode
  /** Precedes the shift's end time. */
  untilLabel?: ReactNode
}) {
  const reference = now ?? new Date()
  const windowStart = start.getTime()
  const windowSpan = end.getTime() - windowStart || 1

  const layers = useMemo(() => {
    const map = new Map<string, Shift[]>()
    for (const shift of shifts) {
      const key = shift.layer ?? 'Rotation'
      map.set(key, [...(map.get(key) ?? []), shift])
    }
    return [...map.entries()]
  }, [shifts])

  const people = useMemo(
    () => [...new Set(shifts.map((shift) => shift.person))],
    [shifts],
  )
  const paletteFor = (person: string) =>
    dataPalette[people.indexOf(person) % dataPalette.length]

  const onCallNow = shifts.filter(
    (shift) => shift.start <= reference && shift.end > reference,
  )

  const dayLabels = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' })
    const out: { label: string; offset: number }[] = []
    const cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)

    while (cursor <= end) {
      if (cursor >= start) {
        out.push({
          label: format.format(cursor),
          offset: ((cursor.getTime() - windowStart) / windowSpan) * 100,
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [start, end, locale, windowStart, windowSpan])

  return (
    <div
      data-slot="on-call-schedule"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Phone className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
        {onCallNow.length === 0 ? (
          <Badge size="sm" color="destructive">
            {nobodyLabel}
          </Badge>
        ) : (
          onCallNow.map((shift) => (
            <span key={shift.id} className="flex items-center gap-1.5">
              <Avatar size="xs" name={shift.person} />
              <span className="text-sm">{shift.person}</span>
              {shift.layer && <Badge size="sm">{shift.layer}</Badge>}
              <span className="text-muted-foreground text-xs">
                {untilLabel} <Fmt type="relative" value={shift.end} now={reference} locale={locale} />
              </span>
            </span>
          ))
        )}
      </div>

      <div className="relative">
        <div className="text-muted-foreground/70 relative mb-1 h-4 text-[10px]">
          {dayLabels.map((day) => (
            <span
              key={day.label}
              className="absolute whitespace-nowrap"
              style={{ left: `${day.offset}%` }}
            >
              {day.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {layers.map(([layer, entries]) => (
            <div key={layer} className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0 truncate text-xs">
                {layer}
              </span>

              <div className="bg-secondary relative h-7 min-w-0 flex-1 overflow-hidden rounded-md">
                {entries.map((shift) => {
                  // Proportional, not snapped: handovers are mid-day.
                  const left =
                    ((shift.start.getTime() - windowStart) / windowSpan) * 100
                  const width =
                    ((shift.end.getTime() - shift.start.getTime()) / windowSpan) * 100

                  return (
                    <Tooltip
                      key={shift.id}
                      content={
                        <span className="flex flex-col">
                          <span>{shift.person}</span>
                          <span className="opacity-70">
                            <Fmt type="date" value={shift.start} format="ddd D MMM HH:mm" locale={locale} />
                            {' → '}
                            <Fmt type="date" value={shift.end} format="ddd D MMM HH:mm" locale={locale} />
                          </span>
                        </span>
                      }
                    >
                      <span
                        tabIndex={0}
                        style={{
                          left: `${Math.max(left, 0)}%`,
                          width: `${Math.min(width, 100 - Math.max(left, 0))}%`,
                          backgroundColor: shift.color ?? paletteFor(shift.person).fill,
                          // Name sits on the fill: read the paired ink, since
                          // white on the amber entry fails contrast.
                          color: shift.color ? 'white' : paletteFor(shift.person).ink,
                        }}
                        className="focus-visible:ring-ring absolute inset-y-0 flex items-center overflow-hidden rounded-md px-2 outline-none focus-visible:ring-2"
                      >
                        <span className="truncate text-[10px] font-medium">
                          {shift.person}
                        </span>
                      </span>
                    </Tooltip>
                  )
                })}

                {reference >= start && reference <= end && (
                  <span
                    aria-hidden="true"
                    className="bg-foreground absolute inset-y-0 w-px"
                    style={{
                      left: `${((reference.getTime() - windowStart) / windowSpan) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { OnCallSchedule }
