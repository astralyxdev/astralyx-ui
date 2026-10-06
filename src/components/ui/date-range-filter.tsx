'use client'

import { useState } from 'react'
import type { CalendarPreset } from '@/components/ui/calendar'
import { DatePicker } from '@/components/ui/date-picker'
import { addDays, startOfDay, type DateRange } from '@/lib/date'

/**
 * A date range as a list filter: a DatePicker in range mode that reports a
 * range only once it is whole, spanning whole days.
 *
 * A range picker reports every click, and the first click of a range is half
 * of one — `{ from }` with no end. Handed straight to a filter, that half range
 * fires a request for "everything since Tuesday", replaces the table, and then
 * fires a second one when the end is picked. Here the half range stays a draft
 * in the picker, and `onChange` hears about the range once, when it is
 * complete — or about `undefined` when it is cleared.
 *
 * The range it reports runs from the start of the first day to the last
 * millisecond of the last one, so "1 to 5 October" includes everything on the
 * 5th. A picked day is midnight, and a filter that compares against midnight
 * of the end date quietly drops the whole last day.
 */
type DateRangeFilterProps = {
  value: DateRange | undefined
  onChange: (range: { from: Date; to: Date } | undefined) => void
  id?: string
  /** Quick picks above the grid. Defaults to today, 7 days and 30 days. */
  presets?: CalendarPreset[]
  placeholder?: string
  locale?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** The last millisecond of `date`'s day. */
function endOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function defaultFilterPresets(today: Date): CalendarPreset[] {
  return [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Last 7 days', range: { from: addDays(today, -6), to: today } },
    { label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
  ]
}

function DateRangeFilter({
  value,
  onChange,
  id,
  presets,
  placeholder = 'Any date',
  locale,
  size = 'sm',
  className = 'w-full',
}: DateRangeFilterProps) {
  // A range being picked — one end so far — lives here until it is complete.
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)
  // A new value from outside (a chip removed, Reset) drops the draft.
  const [seen, setSeen] = useState(value)
  if (seen?.from?.getTime() !== value?.from?.getTime() || seen?.to?.getTime() !== value?.to?.getTime()) {
    setSeen(value)
    setDraft(undefined)
  }
  // Fixed for the life of the picker, so the presets do not shift under a
  // filter left open across midnight.
  const [today] = useState(() => startOfDay(new Date()))

  return (
    <DatePicker
      id={id}
      mode="range"
      size={size}
      className={className}
      locale={locale}
      placeholder={placeholder}
      presets={presets ?? defaultFilterPresets(today)}
      // One month: a filter sits in a panel or a sheet, not a page.
      numberOfMonths={1}
      value={draft ?? value ?? {}}
      onValueChange={(range) => {
        if (!range?.from) {
          setDraft(undefined)
          onChange(undefined)
        } else if (range.to) {
          setDraft(undefined)
          onChange({ from: startOfDay(range.from), to: endOfDay(range.to) })
        } else {
          setDraft(range)
        }
      }}
    />
  )
}

export { DateRangeFilter, endOfDay }
export type { DateRangeFilterProps }
