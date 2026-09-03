import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * A calendar heatmap — the contribution grid.
 *
 * Weeks are columns and weekdays are rows, which is the layout everyone reads
 * without a legend. Building it means padding to a week boundary at both ends;
 * without that the first column starts on the wrong weekday and every row is
 * shifted by a day.
 *
 * Intensity is bucketed rather than continuous. Five steps is what the eye can
 * actually distinguish in a 10px square, and a smooth gradient just makes
 * neighbouring cells look identical.
 */
export type HeatmapCell = {
  date: Date
  value: number
  detail?: ReactNode
}

const WEEKDAYS = ['Mon', 'Wed', 'Fri']

function startOfWeek(date: Date) {
  const copy = new Date(date)
  // Monday-first: getDay() is 0 for Sunday, so shift it to the end.
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_SUMMARY_LABEL: (total: number, days: number) => string = (total, days) => `${total} contributions across ${days} days`

function HeatmapGrid({
  cells,
  levels = 5,
  color = 'var(--green)',
  locale = 'en-GB',
  showMonths = true,
  showWeekdays = true,
  lessLabel = 'Less',
  moreLabel = 'More',
  summaryLabel = DEFAULT_SUMMARY_LABEL,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  cells: HeatmapCell[]
  levels?: number
  color?: string
  locale?: string
  showMonths?: boolean
  showWeekdays?: boolean
  /** Ends of the intensity legend. */
  lessLabel?: ReactNode
  moreLabel?: ReactNode
  /** Accessible summary of the whole grid. */
  summaryLabel?: (total: number, days: number) => string
}) {
  const { weeks, max, monthLabels } = useMemo(() => {
    if (cells.length === 0) return { weeks: [], max: 1, monthLabels: [] }

    const sorted = [...cells].sort((a, b) => a.date.getTime() - b.date.getTime())
    const byDay = new Map(
      sorted.map((cell) => [cell.date.toDateString(), cell] as const),
    )

    const start = startOfWeek(sorted[0].date)
    const end = sorted[sorted.length - 1].date

    const columns: (HeatmapCell | null)[][] = []
    const months: { index: number; label: string }[] = []
    const monthFormat = new Intl.DateTimeFormat(locale, { month: 'short' })

    const cursor = new Date(start)
    let lastMonth = -1

    while (cursor <= end) {
      const column: (HeatmapCell | null)[] = []
      for (let day = 0; day < 7; day++) {
        const key = cursor.toDateString()
        column.push(cursor > end ? null : (byDay.get(key) ?? { date: new Date(cursor), value: 0 }))
        cursor.setDate(cursor.getDate() + 1)
      }

      const monthOfColumn = column.find(Boolean)?.date.getMonth()
      if (monthOfColumn !== undefined && monthOfColumn !== lastMonth) {
        lastMonth = monthOfColumn
        months.push({
          index: columns.length,
          label: monthFormat.format(column.find(Boolean)!.date),
        })
      }

      columns.push(column)
    }

    return {
      weeks: columns,
      max: Math.max(...sorted.map((cell) => cell.value), 1),
      monthLabels: months,
    }
  }, [cells, locale])

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale],
  )

  const total = cells.reduce((sum, cell) => sum + cell.value, 0)

  return (
    <div data-slot="heatmap-grid" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex gap-1.5 overflow-x-auto">
        {showWeekdays && (
          <div className="flex shrink-0 flex-col gap-[3px] pt-[18px]">
            {Array.from({ length: 7 }, (_, day) => (
              <span
                key={day}
                className="text-muted-foreground/70 h-[11px] text-[9px] leading-[11px]"
              >
                {day % 2 === 0 ? (WEEKDAYS[day / 2] ?? '') : ''}
              </span>
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-1">
          {showMonths && (
            <div className="relative h-3.5">
              {monthLabels.map((month) => (
                <span
                  key={`${month.label}-${month.index}`}
                  className="text-muted-foreground/70 absolute text-[10px]"
                  style={{ left: month.index * 14 }}
                >
                  {month.label}
                </span>
              ))}
            </div>
          )}

          <div
            className="flex gap-[3px]"
            role="img"
            aria-label={summaryLabel(total, cells.length)}
          >
            {weeks.map((week, index) => (
              <div key={index} className="flex flex-col gap-[3px]">
                {week.map((cell, day) =>
                  cell ? (
                    <Tooltip
                      key={day}
                      content={
                        <span className="flex flex-col">
                          <span>
                            {cell.value} on {dateFormat.format(cell.date)}
                          </span>
                          {cell.detail && <span className="opacity-70">{cell.detail}</span>}
                        </span>
                      }
                    >
                      <span
                        tabIndex={0}
                        className="focus-visible:ring-ring/50 size-[11px] shrink-0 rounded-[2px] outline-none focus-visible:ring-2"
                        style={{
                          backgroundColor:
                            cell.value === 0
                              ? 'var(--secondary)'
                              : color,
                          // Bucketed, not continuous: five steps is what the
                          // eye can separate at this size.
                          opacity:
                            cell.value === 0
                              ? 1
                              : 0.25 +
                                (Math.ceil((cell.value / max) * levels) / levels) * 0.75,
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <span key={day} className="size-[11px] shrink-0" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span>{lessLabel}</span>
        {Array.from({ length: levels }, (_, index) => (
          <span
            key={index}
            className="size-[11px] rounded-[2px]"
            style={{
              backgroundColor: index === 0 ? 'var(--secondary)' : color,
              opacity: index === 0 ? 1 : 0.25 + ((index + 1) / levels) * 0.75,
            }}
          />
        ))}
        <span>{moreLabel}</span>
      </div>
    </div>
  )
}

export { HeatmapGrid }
