import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  addMonths,
  formatMonth,
  isAfter,
  isBefore,
  isInRange,
  isRangeEnd,
  isRangeStart,
  isSameDay,
  isSameMonth,
  monthWeeks,
  orderRange,
  setTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  withTimeOf,
  type DateRange,
} from '@/lib/date'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A date picker grid, in single or range mode.
 *
 * No date library — the grid, weekday names, month labels and times all come
 * from `Intl` plus the helpers in `lib/date.ts`. Always six weeks per month, so
 * paging never changes the height and the layout around it never jumps.
 *
 * Range picking is drafted before it is committed: the first click sets an
 * anchor, the pointer paints a preview, and the second click (or the release of
 * a drag) confirms. Dragging and clicking are the same gesture here, which is
 * why the release is watched on the window rather than on a cell.
 */
export type CalendarMode = 'single' | 'range'
export type CalendarPreset = { label: string; range: DateRange }
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6

type CalendarBaseProps = {
  /** Months shown side by side. */
  numberOfMonths?: number
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  weekStartsOn?: WeekStart
  locale?: string
  /** Bounds. Days outside them cannot be picked. */
  fromDate?: Date
  toDate?: Date
  disabled?: (date: Date) => boolean
  showOutsideDays?: boolean
  /** A static heading, or month and year dropdowns for fast navigation. */
  captionLayout?: 'label' | 'dropdown'
  showTime?: boolean
  /** Minute granularity in the time selects. */
  timeStep?: number
  renderDay?: (date: Date) => ReactNode
  footer?: ReactNode
  /** Accessible name for the previous-month button. */
  previousMonthLabel?: string
  /** Accessible name for the next-month button. */
  nextMonthLabel?: string
  /** Accessible name for the month dropdown, under `captionLayout="dropdown"`. */
  monthLabel?: string
  /** Accessible name for the year dropdown. */
  yearLabel?: string
  /** Names the hour select, given the row's own label ("Start", "End"). */
  hourLabel?: (row: string) => string
  /** Names the minute select the same way. */
  minuteLabel?: (row: string) => string
  className?: string
}

type CalendarSingleProps = CalendarBaseProps & {
  mode?: 'single'
  selected?: Date
  defaultSelected?: Date
  onSelect?: (date: Date | undefined) => void
  presets?: never
}

type CalendarRangeProps = CalendarBaseProps & {
  mode: 'range'
  selected?: DateRange
  defaultSelected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  /** Quick ranges listed beside the grid. */
  presets?: CalendarPreset[]
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps

function Calendar(props: CalendarProps) {
  const {
    numberOfMonths = 1,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    weekStartsOn = 1,
    locale = 'en-GB',
    fromDate,
    toDate,
    disabled,
    showOutsideDays = true,
    captionLayout = 'label',
    showTime = false,
    timeStep = 5,
    renderDay,
    footer,
    previousMonthLabel = 'Previous month',
    nextMonthLabel = 'Next month',
    monthLabel = 'Month',
    yearLabel = 'Year',
    hourLabel = (row) => `${row} hour`,
    minuteLabel = (row) => `${row} minute`,
    className,
  } = props

  const range = props.mode === 'range'

  /* ---------------------------------------------------------- selection */

  const controlled = props.selected !== undefined
  const [ownSelected, setOwnSelected] = useState<Date | DateRange | undefined>(
    props.defaultSelected,
  )
  const selected = controlled ? props.selected : ownSelected

  const single = range ? undefined : (selected as Date | undefined)
  const picked = range ? (selected as DateRange | undefined) : undefined

  // Read out of the union before the callback, so the dependency is the handler
  // itself rather than the whole props object.
  const onSelectProp = props.onSelect as
    | ((value: Date | DateRange | undefined) => void)
    | undefined

  const emit = useCallback(
    (next: Date | DateRange | undefined) => {
      if (!controlled) setOwnSelected(next)
      onSelectProp?.(next)
    },
    [controlled, onSelectProp],
  )

  /* -------------------------------------------------------------- month */

  const seed = useMemo(() => {
    if (defaultMonth) return startOfMonth(defaultMonth)
    const from = range ? picked?.from : single
    return startOfMonth(from ?? new Date())
    // Seeds the uncontrolled month once; later changes come from setMonth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [ownMonth, setOwnMonth] = useState(seed)
  const month = monthProp ? startOfMonth(monthProp) : ownMonth

  const setMonth = (next: Date) => {
    const value = startOfMonth(next)
    if (!monthProp) setOwnMonth(value)
    onMonthChange?.(value)
  }

  /* ------------------------------------------------------- range draft */

  const [anchor, setAnchor] = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const dragging = useRef(false)
  const dragFrom = useRef<Date | null>(null)

  const unavailable = useCallback(
    (date: Date) => {
      if (fromDate && isBefore(date, fromDate)) return true
      if (toDate && isAfter(date, toDate)) return true
      return disabled?.(date) ?? false
    },
    [disabled, fromDate, toDate],
  )

  const commit = useCallback(
    (a: Date, b: Date) => {
      const ordered = orderRange(a, b)
      emit({
        from: withTimeOf(ordered.from!, picked?.from),
        to: withTimeOf(ordered.to!, picked?.to),
      })
    },
    [emit, picked],
  )

  // A drag can end anywhere on the page, so the release is watched globally.
  useEffect(() => {
    if (!range) return

    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      const from = dragFrom.current
      // Press and release on one day is a click: keep the anchor pending so the
      // next click closes the range.
      if (from && hover && !isSameDay(from, hover)) {
        commit(from, hover)
        setAnchor(null)
      }
    }

    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [commit, hover, range])

  /** What the grid paints: the draft while picking, otherwise the selection. */
  const shown: DateRange | undefined = useMemo(() => {
    if (!range) return undefined
    if (anchor) return orderRange(anchor, hover ?? anchor)
    return picked
  }, [anchor, hover, range, picked])

  function onDayDown(date: Date) {
    if (unavailable(date)) return

    if (!range) {
      // Clicking the selected day clears it — the only way to undo a choice in
      // a picker with no clear button.
      const same = single && isSameDay(single, date)
      emit(same ? undefined : withTimeOf(date, single))
      return
    }

    if (anchor) {
      commit(anchor, date)
      setAnchor(null)
      dragging.current = false
      dragFrom.current = null
      return
    }

    setAnchor(date)
    setHover(date)
    dragging.current = true
    dragFrom.current = date
  }

  /* ------------------------------------------------------------ render */

  const months = Array.from({ length: Math.max(1, numberOfMonths) }, (_, i) =>
    addMonths(month, i),
  )

  const weekdays = useMemo(() => {
    const base = startOfWeek(new Date(), weekStartsOn)
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    return Array.from({ length: 7 }, (_, i) =>
      format.format(new Date(base.getTime() + i * 86_400_000)),
    )
  }, [locale, weekStartsOn])

  return (
    <div
      data-slot="calendar"
      data-mode={props.mode ?? 'single'}
      className={cn('w-fit select-none', className)}
      onPointerLeave={() => {
        if (!dragging.current) setHover(null)
      }}
    >
      <div className="flex gap-5">
        {range && props.presets?.length ? (
          <Presets
            presets={props.presets}
            onPick={(next) => {
              emit(next)
              if (next.from) setMonth(next.from)
              setAnchor(null)
            }}
          />
        ) : null}

        <div className="grid gap-3">
          <Caption
            captionLayout={captionLayout}
            fromDate={fromDate}
            monthLabel={monthLabel}
            nextMonthLabel={nextMonthLabel}
            previousMonthLabel={previousMonthLabel}
            yearLabel={yearLabel}
            locale={locale}
            month={month}
            onMonthChange={setMonth}
            toDate={toDate}
          />

          <div className="flex gap-6">
            {months.map((m) => (
              <Month
                key={m.toISOString()}
                locale={locale}
                mode={props.mode ?? 'single'}
                month={m}
                onDayDown={onDayDown}
                onDayEnter={(date) => range && setHover(date)}
                range={shown}
                renderDay={renderDay}
                selected={single}
                showCaption={months.length > 1}
                showOutsideDays={showOutsideDays}
                unavailable={unavailable}
                weekdays={weekdays}
                weekStartsOn={weekStartsOn}
              />
            ))}
          </div>

          {showTime && (
            <>
              <Separator />
              <TimeRow
                hourLabel={hourLabel}
                locale={locale}
                minuteLabel={minuteLabel}
                mode={props.mode ?? 'single'}
                onChange={emit}
                range={picked}
                single={single}
                step={timeStep}
              />
            </>
          )}

          {footer}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- sub-parts */

function Presets({
  presets,
  onPick,
}: {
  presets: CalendarPreset[]
  onPick: (range: DateRange) => void
}) {
  return (
    <div className="border-border flex w-36 shrink-0 flex-col gap-1 border-e pe-3">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => onPick(preset.range)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}

function Caption({
  month,
  onMonthChange,
  locale,
  captionLayout,
  fromDate,
  toDate,
  previousMonthLabel,
  nextMonthLabel,
  monthLabel,
  yearLabel,
}: {
  month: Date
  onMonthChange: (month: Date) => void
  locale: string
  captionLayout: 'label' | 'dropdown'
  fromDate?: Date
  toDate?: Date
  previousMonthLabel: string
  nextMonthLabel: string
  monthLabel: string
  yearLabel: string
}) {
  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: 'long' })
    return Array.from({ length: 12 }, (_, i) => format.format(new Date(2024, i, 1)))
  }, [locale])

  const years = useMemo(() => {
    const now = month.getFullYear()
    const first = fromDate?.getFullYear() ?? now - 10
    const last = toDate?.getFullYear() ?? now + 10
    return Array.from({ length: Math.max(1, last - first + 1) }, (_, i) => first + i)
  }, [month, fromDate, toDate])

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={previousMonthLabel}
        disabled={fromDate ? isBefore(addMonths(month, -1), startOfMonth(fromDate)) : false}
        onClick={() => onMonthChange(addMonths(month, -1))}
      >
        <ChevronLeft />
      </Button>

      {captionLayout === 'dropdown' ? (
        <div className="flex flex-1 gap-1.5">
          <Select
            size="sm"
            aria-label={monthLabel}
            value={String(month.getMonth())}
            onValueChange={(v) =>
              onMonthChange(new Date(month.getFullYear(), Number(v), 1))
            }
            options={monthNames.map((name, i) => ({ value: String(i), label: name }))}
          />
          <Select
            size="sm"
            aria-label={yearLabel}
            value={String(month.getFullYear())}
            onValueChange={(v) =>
              onMonthChange(new Date(Number(v), month.getMonth(), 1))
            }
            options={years.map((year) => ({
              value: String(year),
              label: String(year),
            }))}
          />
        </div>
      ) : (
        <div aria-live="polite" className="flex-1 text-center text-sm font-medium">
          {formatMonth(month, locale)}
        </div>
      )}

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={nextMonthLabel}
        disabled={toDate ? isAfter(addMonths(month, 1), startOfMonth(toDate)) : false}
        onClick={() => onMonthChange(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

function Month({
  month,
  weekStartsOn,
  weekdays,
  locale,
  mode,
  selected,
  range,
  unavailable,
  onDayDown,
  onDayEnter,
  showOutsideDays,
  showCaption,
  renderDay,
}: {
  month: Date
  weekStartsOn: WeekStart
  weekdays: string[]
  locale: string
  mode: CalendarMode
  selected?: Date
  range?: DateRange
  unavailable: (date: Date) => boolean
  onDayDown: (date: Date) => void
  onDayEnter: (date: Date) => void
  showOutsideDays: boolean
  showCaption: boolean
  renderDay?: (date: Date) => ReactNode
}) {
  const weeks = useMemo(
    () => monthWeeks(month, weekStartsOn),
    [month, weekStartsOn],
  )
  const today = startOfDay(new Date())

  return (
    <div>
      {showCaption && (
        <div className="mb-2 text-center text-sm font-medium">
          {formatMonth(month, locale)}
        </div>
      )}

      <div role="grid" className="grid grid-cols-7">
        {weekdays.map((day) => (
          <div
            key={day}
            role="columnheader"
            aria-label={day}
            className={cn(
              'text-muted-foreground grid place-items-center text-[11px] font-medium',
              renderDay ? 'h-9 w-12' : 'size-9',
            )}
          >
            <span aria-hidden="true">{day.slice(0, 2)}</span>
          </div>
        ))}

        {weeks.flat().map((date) => {
          const outside = !isSameMonth(date, month)
          if (outside && !showOutsideDays) {
            return (
              <div
                key={date.toISOString()}
                className={renderDay ? 'h-14 w-12' : 'size-9'}
              />
            )
          }

          const off = unavailable(date)
          const start = isRangeStart(date, range)
          const end = isRangeEnd(date, range)
          const middle = isInRange(date, range) && !start && !end
          const isSelected =
            mode === 'range' ? start || end : Boolean(selected && isSameDay(date, selected))

          return (
            <button
              key={date.toISOString()}
              type="button"
              role="gridcell"
              disabled={off}
              aria-selected={isSelected || middle}
              aria-current={isSameDay(date, today) ? 'date' : undefined}
              onPointerDown={() => onDayDown(date)}
              onPointerEnter={() => onDayEnter(date)}
              className={cn(
                'relative grid text-sm tabular-nums',
                renderDay ? 'h-14 w-12 place-items-start p-1.5' : 'size-9 place-items-center',
                focusRing,
                'transition-colors duration-150 ease-out motion-reduce:transition-none',
                'disabled:pointer-events-none disabled:opacity-30',
                outside && 'text-muted-foreground/50',
                // The band has to be square where it continues and rounded only
                // at the ends, or a range reads as separate pills.
                middle && 'bg-accent text-accent-foreground rounded-none',
                (start || end) && 'bg-primary text-primary-foreground font-medium',
                start && !end && 'rounded-s-lg rounded-e-none',
                end && !start && 'rounded-e-lg rounded-s-none',
                start && end && radius.control,
                mode === 'single' && isSelected && cn(radius.control, 'bg-primary text-primary-foreground font-medium'),
                !isSelected && !middle && cn(radius.control, 'hover:bg-accent hover:text-accent-foreground'),
                !isSelected && !middle && isSameDay(date, today) && 'border-border border font-medium',
              )}
            >
              {renderDay ? renderDay(date) : date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TimeRow({
  mode,
  single,
  range,
  step,
  locale,
  onChange,
  hourLabel,
  minuteLabel,
}: {
  mode: CalendarMode
  single?: Date
  range?: DateRange
  step: number
  locale: string
  onChange: (value: Date | DateRange | undefined) => void
  hourLabel: (row: string) => string
  minuteLabel: (row: string) => string
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step)
  const pad = (n: number) => String(n).padStart(2, '0')

  function field(date: Date | undefined, apply: (next: Date) => void, label: string) {
    // Times are meaningless without a day, so the selects wait for one.
    const base = date ?? startOfDay(new Date())

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground w-10 text-xs">{label}</span>
        <Select
          size="sm"
          aria-label={hourLabel(label)}
          disabled={!date}
          value={String(base.getHours())}
          onValueChange={(v) => apply(setTime(base, Number(v), base.getMinutes()))}
          className="w-20"
          options={hours.map((h) => ({ value: String(h), label: pad(h) }))}
        />
        <Select
          size="sm"
          aria-label={minuteLabel(label)}
          disabled={!date}
          value={String(Math.round(base.getMinutes() / step) * step % 60)}
          onValueChange={(v) => apply(setTime(base, base.getHours(), Number(v)))}
          className="w-20"
          options={minutes.map((m) => ({ value: String(m), label: pad(m) }))}
        />
      </div>
    )
  }

  if (mode === 'single') {
    return (
      <div className="flex flex-col gap-2" data-locale={locale}>
        {field(single, (next) => onChange(next), 'Time')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {field(range?.from, (next) => onChange({ ...range, from: next }), 'From')}
      {field(range?.to, (next) => onChange({ ...range, to: next }), 'To')}
    </div>
  )
}

export { Calendar }
