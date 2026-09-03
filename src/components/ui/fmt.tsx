import type { ComponentProps } from 'react'

/**
 * One component for every formatted value: dates, numbers, currency, bytes,
 * durations, relative times.
 *
 * Formatting is where dashboards drift. Three developers reach for
 * `toLocaleString`, `toFixed` and a hand-rolled `padStart` on the same screen,
 * and the result is 1,234.5 beside 1234.50 beside 1 234,5. Routing all of it
 * through one component makes the locale a single decision.
 *
 * Numbers, currency and percentages go through `Intl`, which already knows
 * every locale's grouping and symbol placement. Dates support an `Intl` style
 * *and* a token pattern, because "DD.MM.YYYY" is a real requirement that
 * `Intl` deliberately cannot express — it formats by locale convention, not by
 * an exact layout someone specified.
 *
 * Note the token casing, which follows the moment/dayjs convention rather than
 * strftime: **MM is the month and mm is the minute**. `HH:MM:SS` would print
 * the month where you wanted minutes, so it is worth reading twice.
 */
export type FmtType =
  | 'date'
  | 'number'
  | 'currency'
  | 'percent'
  | 'bytes'
  | 'duration'
  | 'relative'

const PAD = (value: number, length = 2) => String(value).padStart(length, '0')

/**
 * Token pattern for dates.
 *
 * Ordered longest-first and applied in a single pass. Replacing token by token
 * would corrupt the output — substituting `MMMM` with "September" leaves a "D"
 * and an "S" behind for a later rule to hit.
 */
const DATE_TOKENS = /YYYY|YY|MMMM|MMM|MM|M|DDDD|DDD|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|SSS|A|a/g

function formatDate(value: Date, pattern: string, locale: string) {
  const month = (style: 'long' | 'short') =>
    new Intl.DateTimeFormat(locale, { month: style }).format(value)
  const weekday = (style: 'long' | 'short') =>
    new Intl.DateTimeFormat(locale, { weekday: style }).format(value)

  const hours12 = value.getHours() % 12 || 12

  const map: Record<string, string> = {
    YYYY: String(value.getFullYear()),
    YY: PAD(value.getFullYear() % 100),
    MMMM: month('long'),
    MMM: month('short'),
    MM: PAD(value.getMonth() + 1),
    M: String(value.getMonth() + 1),
    DDDD: weekday('long'),
    DDD: weekday('short'),
    DD: PAD(value.getDate()),
    D: String(value.getDate()),
    dddd: weekday('long'),
    ddd: weekday('short'),
    HH: PAD(value.getHours()),
    H: String(value.getHours()),
    hh: PAD(hours12),
    h: String(hours12),
    mm: PAD(value.getMinutes()),
    m: String(value.getMinutes()),
    ss: PAD(value.getSeconds()),
    s: String(value.getSeconds()),
    SSS: PAD(value.getMilliseconds(), 3),
    A: value.getHours() < 12 ? 'AM' : 'PM',
    a: value.getHours() < 12 ? 'am' : 'pm',
  }

  return pattern.replace(DATE_TOKENS, (token) => map[token] ?? token)
}

/** Binary-prefixed size. `1000` is a kilobyte to marketing, `1024` to a disk. */
function formatBytes(bytes: number, decimals: number | undefined, locale: string) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = Math.abs(bytes)
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const places = decimals ?? (unit === 0 ? 0 : value < 10 ? 1 : 0)
  const text = new Intl.NumberFormat(locale, {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(bytes < 0 ? -value : value)
  return `${text} ${units[unit]}`
}

/** Seconds as `1h 04m 12s`, dropping leading units that are zero. */
function formatDuration(totalSeconds: number) {
  const sign = totalSeconds < 0 ? '-' : ''
  const seconds = Math.floor(Math.abs(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h) return `${sign}${h}h ${PAD(m)}m ${PAD(s)}s`
  if (m) return `${sign}${m}m ${PAD(s)}s`
  return `${sign}${s}s`
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.34524],
  ['month', 12],
  ['year', Infinity],
]

/** Largest unit that keeps the number under its own threshold. */
function formatRelative(value: Date, locale: string, now: Date) {
  let delta = (value.getTime() - now.getTime()) / 1000
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) {
      return formatter.format(Math.round(delta), unit)
    }
    delta /= size
  }
  return formatter.format(Math.round(delta), 'year')
}

type FmtProps = Omit<ComponentProps<'span'>, 'children'> & {
  type: FmtType
  value: number | string | Date
  /**
   * Date: a token pattern (`'DD.MM.YYYY HH:mm'`) or an `Intl` style
   * (`'short' | 'medium' | 'long' | 'full'`).
   * Currency: `'symbol' | 'code' | 'name'`.
   */
  format?: string
  /** ISO 4217 code. Required for `type="currency"`. */
  currency?: string
  /** Fraction digits. Defaults per type. */
  decimals?: number
  locale?: string
  /** Thousands separators. Numbers and currency only. */
  grouping?: boolean
  /** Reference point for `type="relative"`. Defaults to now. */
  now?: Date
  /** Line up in a column. On by default for every numeric type. */
  tabular?: boolean
}

const DATE_STYLES = new Set(['short', 'medium', 'long', 'full'])

function Fmt({
  type,
  value,
  format,
  currency,
  decimals,
  locale = 'en-GB',
  grouping = true,
  now,
  tabular,
  className,
  ...props
}: FmtProps) {
  // Every type except a formatted date is a number in a column.
  const numeric = type !== 'date'
  const date =
    value instanceof Date ? value : type === 'date' || type === 'relative' ? new Date(value) : undefined

  let text: string
  let dateTime: string | undefined

  switch (type) {
    case 'date': {
      if (!date || Number.isNaN(date.getTime())) {
        text = String(value)
        break
      }
      dateTime = date.toISOString()
      text =
        format && !DATE_STYLES.has(format)
          ? formatDate(date, format, locale)
          : new Intl.DateTimeFormat(locale, {
              dateStyle: (format as Intl.DateTimeFormatOptions['dateStyle']) ?? 'medium',
            }).format(date)
      break
    }

    case 'relative': {
      if (!date || Number.isNaN(date.getTime())) {
        text = String(value)
        break
      }
      dateTime = date.toISOString()
      text = formatRelative(date, locale, now ?? new Date())
      break
    }

    case 'currency': {
      text = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency ?? 'USD',
        currencyDisplay: (format as Intl.NumberFormatOptions['currencyDisplay']) ?? 'symbol',
        useGrouping: grouping,
        ...(decimals !== undefined && {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      }).format(Number(value))
      break
    }

    case 'percent': {
      text = new Intl.NumberFormat(locale, {
        style: 'percent',
        useGrouping: grouping,
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 0,
      }).format(Number(value))
      break
    }

    case 'bytes':
      text = formatBytes(Number(value), decimals, locale)
      break

    case 'duration':
      text = formatDuration(Number(value))
      break

    default: {
      text = new Intl.NumberFormat(locale, {
        useGrouping: grouping,
        ...(decimals !== undefined && {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }),
      }).format(Number(value))
    }
  }

  const classes = [(tabular ?? numeric) && 'tabular-nums', className]
    .filter(Boolean)
    .join(' ')

  // A real <time> for anything on a clock, so the machine-readable value
  // travels with the display one.
  if (dateTime) {
    return (
      <time
        dateTime={dateTime}
        data-slot="fmt"
        className={classes || undefined}
        // The prop type is span-shaped; `ref` is the only member that differs,
        // and this component never forwards one.
        {...(props as ComponentProps<'time'>)}
      >
        {text}
      </time>
    )
  }

  return (
    <span data-slot="fmt" className={classes || undefined} {...props}>
      {text}
    </span>
  )
}

export { Fmt, Fmt as FMT, formatBytes, formatDate, formatDuration, formatRelative }
export type { FmtProps }
