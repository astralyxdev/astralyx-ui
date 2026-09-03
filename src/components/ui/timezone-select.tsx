import { useMemo, type ComponentProps } from 'react'
import { Combobox } from '@/components/ui/combobox'

/**
 * An IANA timezone picker showing each zone's current offset and local time.
 *
 * The list comes from `Intl.supportedValuesOf('timeZone')`, so it is whatever
 * the runtime actually supports rather than a hardcoded table that goes stale
 * every time a government moves a DST boundary. Older runtimes without that
 * method fall back to a small common set — a short list beats a crash.
 *
 * Offsets are computed live rather than stored. A zone's offset is a function of
 * the date, and a list built in January is wrong for half the year.
 *
 * Zones are labelled by city, not by abbreviation. "CST" is Central Standard
 * Time, China Standard Time and Cuba Standard Time; `America/Chicago` is one
 * place. The abbreviation is shown alongside for recognition, never alone.
 */
const FALLBACK = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

function listZones(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf
  try {
    // Whatever the runtime supports, not a table that rots.
    return supported ? supported('timeZone') : FALLBACK
  } catch {
    return FALLBACK
  }
}

/** Current UTC offset of a zone, in minutes, derived from a formatted date. */
function offsetMinutes(zone: string, at: Date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    }).formatToParts(at)
    const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
    const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (!match) return 0
    const sign = match[1] === '-' ? -1 : 1
    return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0))
  } catch {
    return 0
  }
}

function formatOffset(minutes: number) {
  if (minutes === 0) return 'UTC'
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const rest = abs % 60
  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`
}

function localTime(zone: string, at: Date) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(at)
  } catch {
    return ''
  }
}

/** `Europe/Berlin` → `Berlin`, `America/Argentina/Salta` → `Salta`. */
function cityOf(zone: string) {
  const last = zone.split('/').pop() ?? zone
  return last.replace(/_/g, ' ')
}

type TimezoneSelectProps = Omit<
  ComponentProps<typeof Combobox>,
  'options' | 'searchPlaceholder'
> & {
  /** Restrict the list — a booking form rarely needs all 400-odd zones. */
  zones?: string[]
  /** Show each zone's current local time beside its offset. */
  showLocalTime?: boolean
  /** Reference instant for offsets. Defaults to now. */
  now?: Date
}

function TimezoneSelect({
  zones,
  showLocalTime = true,
  now,
  placeholder = 'Select timezone…',
  ...props
}: TimezoneSelectProps) {
  const options = useMemo(() => {
    const at = now ?? new Date()
    return (zones ?? listZones())
      .map((zone) => {
        const offset = offsetMinutes(zone, at)
        const time = showLocalTime ? localTime(zone, at) : ''
        return {
          zone,
          offset,
          value: zone,
          // Region kept in the label so `Europe/London` is still searchable
          // by "Europe", and the city leads because that is what is unique.
          label: `${cityOf(zone)} · ${formatOffset(offset)}${time ? ` · ${time}` : ''} — ${zone}`,
        }
      })
      .sort((a, b) => a.offset - b.offset || a.zone.localeCompare(b.zone))
      .map(({ value, label }) => ({ value, label }))
  }, [zones, showLocalTime, now])

  return (
    <Combobox
      data-slot="timezone-select"
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Search city or region…"
      emptyMessage="No matching timezone"
      {...props}
    />
  )
}

export { TimezoneSelect, formatOffset, offsetMinutes, listZones as listTimezones }
export type { TimezoneSelectProps }
