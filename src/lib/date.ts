/**
 * Date helpers for Calendar. Local-time only and deliberately dependency-free.
 *
 * Everything here works on a date's local Y/M/D. Using UTC would shift the
 * displayed day for anyone west of Greenwich after 00:00 UTC, which is the
 * classic off-by-one-day calendar bug.
 */

export function startOfDay(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function addMonths(date: Date, count: number) {
  // Set the day to 1 first: adding a month to 31 January would otherwise land
  // in March, because 31 February does not exist and rolls over.
  const copy = new Date(date.getFullYear(), date.getMonth() + count, 1)
  const days = daysInMonth(copy)
  copy.setDate(Math.min(date.getDate(), days))
  return copy
}

export function addDays(date: Date, count: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + count)
  return copy
}

export function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * The 6x7 grid for a month, including the leading and trailing days that fill
 * the first and last weeks. Always 42 cells, so the calendar never changes
 * height as you page through months.
 */
export function monthGrid(month: Date, weekStartsOn = 1) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const shift = (first.getDay() - weekStartsOn + 7) % 7
  const start = addDays(first, -shift)

  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export function weekdayNames(locale: string, weekStartsOn = 1) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-07 was a Sunday, so index 0 lines up with getDay() === 0.
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(2024, 0, 7 + ((index + weekStartsOn) % 7))),
  )
}

export function formatMonth(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}

export function isBetween(date: Date, from: Date, to: Date) {
  const time = startOfDay(date).getTime()
  const lo = Math.min(startOfDay(from).getTime(), startOfDay(to).getTime())
  const hi = Math.max(startOfDay(from).getTime(), startOfDay(to).getTime())
  return time >= lo && time <= hi
}

/* ------------------------------------------------------------------ ranges */

export type DateRange = { from?: Date; to?: Date }

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** `weekStartsOn` is 0–6, Sunday through Saturday. */
export function startOfWeek(date: Date, weekStartsOn = 1) {
  const shift = (date.getDay() - weekStartsOn + 7) % 7
  return startOfDay(addDays(date, -shift))
}

export function isBefore(a: Date, b: Date) {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

export function isAfter(a: Date, b: Date) {
  return startOfDay(a).getTime() > startOfDay(b).getTime()
}

/** Always six rows of seven, so paging months never changes the height. */
export function monthWeeks(month: Date, weekStartsOn = 1) {
  const first = startOfWeek(startOfMonth(month), weekStartsOn)
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)),
  )
}

/** Put the two ends of a range in order, whichever way it was drawn. */
export function orderRange(a: Date, b: Date): DateRange {
  return isAfter(a, b) ? { from: b, to: a } : { from: a, to: b }
}

/**
 * Carry the clock from one date onto another.
 *
 * Picking a new day should not silently reset a time the user already chose,
 * which is exactly what `new Date(y, m, d)` would do.
 */
export function withTimeOf(date: Date, source?: Date) {
  if (!source) return date
  const next = new Date(date)
  next.setHours(source.getHours(), source.getMinutes(), 0, 0)
  return next
}

export function setTime(date: Date, hours: number, minutes: number) {
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

export function isRangeStart(date: Date, range?: DateRange) {
  return Boolean(range?.from && isSameDay(date, range.from))
}

export function isRangeEnd(date: Date, range?: DateRange) {
  return Boolean(range?.to && isSameDay(date, range.to))
}

export function isInRange(date: Date, range?: DateRange) {
  if (!range?.from || !range.to) return false
  return isBetween(date, range.from, range.to)
}

export function formatRange(range: DateRange | undefined, locale: string) {
  if (!range?.from) return ''
  if (!range.to || isSameDay(range.from, range.to)) {
    return formatDate(range.from, locale)
  }
  return `${formatDate(range.from, locale)} – ${formatDate(range.to, locale)}`
}

export function formatTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Ranges people ask for often enough to be worth a button. */
export function defaultPresets(): { label: string; range: DateRange }[] {
  const today = startOfDay(new Date())
  const back = (days: number) => addDays(today, -days)

  return [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Last 7 days', range: { from: back(6), to: today } },
    { label: 'Last 30 days', range: { from: back(29), to: today } },
    { label: 'This month', range: { from: startOfMonth(today), to: today } },
    {
      label: 'Last month',
      range: {
        from: startOfMonth(addMonths(today, -1)),
        to: addDays(startOfMonth(today), -1),
      },
    },
  ]
}
