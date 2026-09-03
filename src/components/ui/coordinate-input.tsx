import { useEffect, useId, useState, type ClipboardEvent, type ComponentProps, type ReactNode } from 'react'
import { CopyButton } from '@/components/ui/copy-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Latitude and longitude, accepting decimal degrees or DMS.
 *
 * People paste coordinates from wherever they found them — `51.5074, -0.1278`
 * from a URL, `51°30'26.6"N 0°07'39.9"W` from a chart. Rejecting the second
 * form means the user converts it by hand, which is exactly where a digit gets
 * dropped. Both are parsed; the canonical decimal pair is what leaves.
 *
 * A single field accepts a pasted pair and splits it, because a comma-separated
 * pair is how coordinates travel and forcing two paste operations is a small
 * cruelty.
 *
 * Ranges are checked and, more usefully, so is the *ordering*: a latitude above
 * 90 is almost always a longitude in the wrong box. Saying so is more helpful
 * than "out of range", and swapped pairs are the most common coordinate bug
 * there is.
 *
 * Six decimal places is the display precision — about 11cm. More digits imply an
 * accuracy no consumer GPS has.
 */
export type Coordinate = { lat: number; lng: number }

/** Decimal degrees, or degrees/minutes/seconds with an optional hemisphere. */
function parseComponent(raw: string): number | null {
  const text = raw.trim()
  if (!text) return null

  const decimal = Number(text)
  if (!Number.isNaN(decimal) && /^[+-]?\d*\.?\d+$/.test(text)) return decimal

  const dms = text.match(
    /^([NSEW])?\s*(\d+(?:\.\d+)?)\s*°?\s*(?:(\d+(?:\.\d+)?)\s*['′]?\s*)?(?:(\d+(?:\.\d+)?)\s*["″]?\s*)?([NSEW])?$/i,
  )
  if (!dms) return null

  const degrees = Number(dms[2]) + Number(dms[3] ?? 0) / 60 + Number(dms[4] ?? 0) / 3600
  const hemisphere = (dms[1] ?? dms[5] ?? '').toUpperCase()
  return hemisphere === 'S' || hemisphere === 'W' ? -degrees : degrees
}

/** Splits a pasted `lat, lng` pair on a comma or whitespace between the two. */
function parsePair(raw: string): Coordinate | null {
  const parts = raw.split(/\s*,\s*|\s{2,}|(?<=[NS])\s+/i).filter(Boolean)
  if (parts.length !== 2) return null
  const lat = parseComponent(parts[0])
  const lng = parseComponent(parts[1])
  return lat === null || lng === null ? null : { lat, lng }
}

function round(value: number) {
  // ~11cm. More digits claim an accuracy no consumer GPS has.
  return Math.round(value * 1e6) / 1e6
}

function CoordinateInput({
  value,
  onValueChange,
  size = 'md',
  disabled,
  copyable = true,
  latitudeLabel = 'Latitude',
  longitudeLabel = 'Longitude',
  latitudePlaceholder = '51.5074',
  longitudePlaceholder = '-0.1278',
  copyLabel = 'Copy coordinates',
  invalidNote = 'Not a coordinate',
  latitudeRangeNote = 'Above 90° — is this a longitude?',
  longitudeRangeNote = 'Beyond 180°',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'value'> & {
  value?: Coordinate | null
  onValueChange?: (value: Coordinate | null) => void
  size?: 'sm' | 'md'
  disabled?: boolean
  copyable?: boolean
  latitudeLabel?: ReactNode
  longitudeLabel?: ReactNode
  latitudePlaceholder?: string
  longitudePlaceholder?: string
  copyLabel?: string
  /** Shown when a field does not parse at all. */
  invalidNote?: ReactNode
  /** Shown for a latitude past ±90 — usually a swapped pair. */
  latitudeRangeNote?: ReactNode
  longitudeRangeNote?: ReactNode
}) {
  const scope = useId()
  const [lat, setLat] = useState(value ? String(round(value.lat)) : '')
  const [lng, setLng] = useState(value ? String(round(value.lng)) : '')

  useEffect(() => {
    if (!value) return
    setLat(String(round(value.lat)))
    setLng(String(round(value.lng)))
  }, [value])

  const latValue = parseComponent(lat)
  const lngValue = parseComponent(lng)

  // Swapped pairs are the most common coordinate bug there is.
  const latError =
    lat && (latValue === null ? invalidNote : Math.abs(latValue) > 90 ? latitudeRangeNote : undefined)
  const lngError =
    lng && (lngValue === null ? invalidNote : Math.abs(lngValue) > 180 ? longitudeRangeNote : undefined)

  function commit(nextLat: string, nextLng: string) {
    const a = parseComponent(nextLat)
    const b = parseComponent(nextLng)
    if (a === null || b === null || Math.abs(a) > 90 || Math.abs(b) > 180) {
      onValueChange?.(null)
      return
    }
    onValueChange?.({ lat: round(a), lng: round(b) })
  }

  /** A pasted pair fills both boxes rather than demanding two pastes. */
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pair = parsePair(event.clipboardData.getData('text'))
    if (!pair) return
    event.preventDefault()
    const nextLat = String(round(pair.lat))
    const nextLng = String(round(pair.lng))
    setLat(nextLat)
    setLng(nextLng)
    commit(nextLat, nextLng)
  }

  return (
    <div
      data-slot="coordinate-input"
      className={cn('flex flex-wrap items-start gap-2', className)}
      {...props}
    >
      <div className="flex min-w-32 flex-1 flex-col gap-1.5">
        <Label htmlFor={`${scope}-lat`} className="text-xs">
          {latitudeLabel}
        </Label>
        <Input
          id={`${scope}-lat`}
          size={size === 'sm' ? 'sm' : 'default'}
          inputMode="text"
          placeholder={latitudePlaceholder}
          value={lat}
          disabled={disabled}
          error={Boolean(latError)}
          onPaste={handlePaste}
          onChange={(event) => {
            setLat(event.target.value)
            commit(event.target.value, lng)
          }}
        />
        {latError && (
          <p className="text-[var(--destructive-soft-foreground)] text-xs">{latError}</p>
        )}
      </div>

      <div className="flex min-w-32 flex-1 flex-col gap-1.5">
        <Label htmlFor={`${scope}-lng`} className="text-xs">
          {longitudeLabel}
        </Label>
        <Input
          id={`${scope}-lng`}
          size={size === 'sm' ? 'sm' : 'default'}
          inputMode="text"
          placeholder={longitudePlaceholder}
          value={lng}
          disabled={disabled}
          error={Boolean(lngError)}
          onPaste={handlePaste}
          onChange={(event) => {
            setLng(event.target.value)
            commit(lat, event.target.value)
          }}
        />
        {lngError && (
          <p className="text-[var(--destructive-soft-foreground)] text-xs">{lngError}</p>
        )}
      </div>

      {copyable && latValue !== null && lngValue !== null && !latError && !lngError && (
        <CopyButton
          value={`${round(latValue)}, ${round(lngValue)}`}
          label={copyLabel}
          className="mt-6 shrink-0"
        />
      )}
    </div>
  )
}

export { CoordinateInput, parseComponent as parseCoordinate, parsePair as parseCoordinatePair }
