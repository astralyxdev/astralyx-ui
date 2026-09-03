import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoordinateInput, type Coordinate } from '@/components/ui/coordinate-input'
import { Input } from '@/components/ui/input'
import { MapEmbed } from '@/components/ui/map-embed'
import { Spinner } from '@/components/ui/spinner'
import { menuItem, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Pick a place by searching for it, or by entering coordinates directly.
 *
 * Geocoding is the caller's: pass `onSearch` and it is called with the query.
 * A component library has no business choosing a geocoder for you — they need
 * keys, they have wildly different terms, and several forbid storing results.
 *
 * Both routes stay open. Search covers the common case; the coordinate fields
 * cover the one search cannot — a field site, a mooring, an address that no
 * geocoder knows. Hiding the fallback behind an "advanced" toggle just means
 * the people who need it cannot find it.
 *
 * Results are requested on a trailing debounce and stale responses are dropped
 * by sequence number. Typing "Berlin" fires five requests, and without the
 * guard the answer for "Berl" can land last and win.
 */
export type LocationResult = {
  id: string
  label: ReactNode
  detail?: ReactNode
  lat: number
  lng: number
}

function LocationPicker({
  value,
  onValueChange,
  onSearch,
  placeholder = 'Search for a place or address…',
  showMap = true,
  showCoordinates = true,
  debounce = 300,
  emptyMessage = 'No places matched.',
  searchLabel = 'Search for a place',
  clearLabel = 'Clear selected place',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'value'> & {
  value?: Coordinate | null
  onValueChange?: (value: Coordinate | null, result?: LocationResult) => void
  /** Your geocoder. Without it, only the coordinate fields are offered. */
  onSearch?: (query: string) => Promise<LocationResult[]>
  placeholder?: string
  showMap?: boolean
  showCoordinates?: boolean
  debounce?: number
  emptyMessage?: ReactNode
  /** Accessible name for the search field. */
  searchLabel?: string
  clearLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState<LocationResult | null>(null)
  // Sequence guard: the answer for "Berl" must not beat the one for "Berlin".
  const sequence = useRef(0)

  useEffect(() => {
    if (!onSearch) return
    const text = query.trim()
    if (text.length < 2) {
      setResults(null)
      setBusy(false)
      return
    }

    setBusy(true)
    const ticket = ++sequence.current
    const timer = setTimeout(async () => {
      try {
        const found = await onSearch(text)
        if (ticket !== sequence.current) return
        setResults(found)
      } catch {
        if (ticket === sequence.current) setResults([])
      } finally {
        if (ticket === sequence.current) setBusy(false)
      }
    }, debounce)

    return () => clearTimeout(timer)
  }, [query, onSearch, debounce])

  function choose(result: LocationResult) {
    setChosen(result)
    setQuery('')
    setResults(null)
    onValueChange?.({ lat: result.lat, lng: result.lng }, result)
  }

  return (
    <div data-slot="location-picker" className={cn('flex flex-col gap-3', className)} {...props}>
      {onSearch && (
        <div className="relative flex flex-col gap-1.5">
          <Input
            value={query}
            placeholder={placeholder}
            aria-label={searchLabel}
            // Input carries one icon slot, so the search glyph becomes the
            // spinner while a query is in flight rather than sitting beside it.
            icon={busy ? <Spinner size="xs" /> : <Search />}
            onChange={(event) => setQuery(event.target.value)}
          />

          {results !== null && (
            <div
              className={cn(
                surface,
                radius.control,
                'max-h-56 overflow-auto p-1 shadow-md',
              )}
            >
              {results.length === 0 && !busy ? (
                <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                  {emptyMessage}
                </p>
              ) : (
                <ul className="flex list-none flex-col">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        className={cn(menuItem, 'w-full')}
                        onClick={() => choose(result)}
                      >
                        <MapPin className="text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{result.label}</span>
                          {result.detail && (
                            <span className="text-muted-foreground block truncate text-xs">
                              {result.detail}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {chosen && (
        <div className={cn('bg-secondary flex items-center gap-2 p-3', radius.control)}>
          <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm">{chosen.label}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={clearLabel}
            onClick={() => {
              setChosen(null)
              onValueChange?.(null)
            }}
          >
            <X />
          </Button>
        </div>
      )}

      {/* Always reachable, never behind an "advanced" toggle. */}
      {showCoordinates && (
        <CoordinateInput
          value={value ?? null}
          onValueChange={(next) => {
            setChosen(null)
            onValueChange?.(next)
          }}
        />
      )}

      {showMap && value && (
        <MapEmbed lat={value.lat} lng={value.lng} height={220} label={chosen?.label} />
      )}
    </div>
  )
}

export { LocationPicker }
