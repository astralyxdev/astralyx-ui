import { useState } from 'react'
import { AddressInput, emptyAddress, type AddressValue } from '@/components/ui/address-input'
import { CoordinateInput, type Coordinate } from '@/components/ui/coordinate-input'
import { LocationPicker, type LocationResult } from '@/components/ui/location-picker'
import { MapEmbed, type MapTheme } from '@/components/ui/map-embed'
import { TimezoneSelect } from '@/components/ui/timezone-select'
import type { ComponentEntry, ComposerState } from './types'

/* ---------------------------------------------------------------- map embed */

export const mapEmbedEntry: ComponentEntry = {
  id: 'map-embed',
  label: 'Map Embed',
  description:
    "A map on CARTO's near-monochrome basemap. A full-colour street map fights everything drawn on top of it; a greyscale ground lets the marker be the only saturated thing on screen.",
  usage: `import { MapEmbed } from '@/components/ui/map-embed'

<MapEmbed lat={51.5074} lng={-0.1278} label="Trafalgar Square, London" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'theme', label: 'theme', options: ['dark', 'light', 'auto'], default: 'dark' },
      { type: 'number', prop: 'zoom', label: 'zoom', default: 14, min: 3, max: 18, step: 1 },
      { type: 'boolean', prop: 'monochrome', label: 'monochrome filter', default: true },
      { type: 'boolean', prop: 'marker', label: 'marker', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <MapEmbed
          lat={51.5074}
          lng={-0.1278}
          zoom={Number(state.zoom)}
          theme={state.theme as MapTheme}
          filter={state.monochrome ? undefined : null}
          marker={Boolean(state.marker)}
          label="Trafalgar Square, London"
          height={240}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<MapEmbed\n  lat={51.5074}\n  lng={-0.1278}\n  zoom={${state.zoom}}\n  theme="${state.theme}"${state.monochrome ? '' : '\n  filter={null}'}\n  label="Trafalgar Square"\n/>`,
  },
  api: [
    { name: 'tiles', type: 'TileSource', default: "'osm'", description: "OpenStreetMap's keyless tiles by default. CARTO's Dark Matter and Positron need an API key, so the monochrome look here comes from a CSS filter instead. Pass `(z, x, y) => url` for your own or a keyed provider — OSM's usage policy asks their servers not carry production traffic." },
    { name: 'theme', type: 'MapTheme', default: "'dark'", description: "'dark' inverts a greyscale raster to a dark ground; 'light' desaturates it. 'auto' renders both layers and lets CSS pick, so the theme toggle costs no tile requests." },
    { name: 'filter', type: 'string | null', description: 'Overrides the CSS treatment. `null` leaves tiles alone — right when your provider already serves a monochrome style.' },
    { name: 'rendering', type: 'raster tiles', description: 'Plain `<img>` tiles in a grid — no iframe, no mapping library, no third-party JavaScript or cookies. The remaining exposure is the tile requests, the same as any remote image.' },
    { name: 'interaction', type: 'none', description: 'A static view. Anything needing pan and zoom wants MapLibre; this is deliberately not that.' },
    { name: 'eager', type: 'boolean', default: 'true', description: 'Set false to hold the tiles behind a click, which is where a consent gate goes.' },
    { name: 'attribution', type: 'ReactNode', description: 'Overrides the CARTO/OpenStreetMap credit. It is rendered by default because both providers require it.' },
  ],
}

/* --------------------------------------------------------- coordinate input */

function CoordinateDemo() {
  const [value, setValue] = useState<Coordinate | null>({ lat: 51.5074, lng: -0.1278 })
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <CoordinateInput value={value} onValueChange={setValue} />
      <p className="text-muted-foreground font-mono text-xs">
        {value ? `${value.lat}, ${value.lng}` : 'invalid or empty'}
      </p>
    </div>
  )
}

export const coordinateInputEntry: ComponentEntry = {
  id: 'coordinate-input',
  label: 'Coordinate Input',
  description:
    'Latitude and longitude, accepting decimal degrees or DMS. A latitude above 90 is reported as "is this a longitude?" rather than "out of range" — swapped pairs are the most common coordinate bug there is.',
  usage: `import { CoordinateInput } from '@/components/ui/coordinate-input'

<CoordinateInput value={value} onValueChange={setValue} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'md'], default: 'md' },
      { type: 'boolean', prop: 'copyable', label: 'copy button', default: true },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <CoordinateInput
          value={{ lat: 51.5074, lng: -0.1278 }}
          size={state.size as 'sm' | 'md'}
          copyable={Boolean(state.copyable)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: () => `<CoordinateInput value={value} onValueChange={setValue} />`,
  },
  api: [
    { name: 'value', type: 'Coordinate | null', description: '`{ lat, lng }`. `null` while the fields do not parse to a valid pair.' },
    { name: 'input formats', type: 'decimal or DMS', description: "Both `51.5074` and `51°30'26.6\"N` parse. Rejecting the second means the user converts by hand, which is where a digit gets dropped." },
    { name: 'paste', type: 'splits a pair', description: 'Pasting `51.5074, -0.1278` into either field fills both — a comma-separated pair is how coordinates travel.' },
    { name: 'precision', type: '6 places', description: 'About 11cm. More digits imply an accuracy no consumer GPS has.' },
  ],
  demos: [
    { title: 'Round-tripping a pair', stack: true, code: `const [value, setValue] = useState({ lat: 51.5074, lng: -0.1278 })\n\n<CoordinateInput value={value} onValueChange={setValue} />`, render: () => <CoordinateDemo /> },
  ],
}

/* ------------------------------------------------------------ location picker */

const PLACES: LocationResult[] = [
  { id: 'l1', label: 'Trafalgar Square', detail: 'London, WC2N, United Kingdom', lat: 51.508, lng: -0.128 },
  { id: 'l2', label: 'London Bridge', detail: 'London, SE1, United Kingdom', lat: 51.5079, lng: -0.0877 },
  { id: 'l3', label: 'London, Ontario', detail: 'Ontario, Canada', lat: 42.9849, lng: -81.2453 },
  { id: 'l4', label: 'Londonderry', detail: 'County Londonderry, Northern Ireland', lat: 54.9966, lng: -7.3086 },
]

function LocationDemo() {
  const [value, setValue] = useState<Coordinate | null>(null)
  return (
    <div className="w-full max-w-md">
      <LocationPicker
        value={value}
        onValueChange={setValue}
        onSearch={async (query) =>
          PLACES.filter((place) =>
            `${place.label} ${place.detail}`.toLowerCase().includes(query.toLowerCase()),
          )
        }
      />
    </div>
  )
}

export const locationPickerEntry: ComponentEntry = {
  id: 'location-picker',
  label: 'Location Picker',
  description:
    'Pick a place by searching, or by typing coordinates. Both routes stay open: search covers the common case, the fields cover the field site or mooring that no geocoder knows.',
  usage: `import { LocationPicker } from '@/components/ui/location-picker'

<LocationPicker value={value} onValueChange={setValue} onSearch={geocode} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'map', label: 'map preview', default: true },
      { type: 'boolean', prop: 'coordinates', label: 'coordinate fields', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <LocationPicker
          value={{ lat: 51.508, lng: -0.128 }}
          showMap={Boolean(state.map)}
          showCoordinates={Boolean(state.coordinates)}
          onSearch={async (query) =>
            PLACES.filter((place) =>
              `${place.label} ${place.detail}`.toLowerCase().includes(query.toLowerCase()),
            )
          }
        />
      </div>
    ),
    code: () => `<LocationPicker value={value} onValueChange={setValue} onSearch={geocode} />`,
  },
  api: [
    { name: 'onSearch', type: '(query) => Promise<LocationResult[]>', description: 'Your geocoder. A component library has no business picking one — they need keys, terms differ wildly, and several forbid storing results.' },
    { name: 'stale responses', type: 'dropped', description: 'Requests are debounced and tagged by sequence, so the answer for "Berl" cannot land last and beat the one for "Berlin".' },
    { name: 'showCoordinates', type: 'boolean', default: 'true', description: 'The manual fallback. Not hidden behind an "advanced" toggle, because the people who need it are the ones who cannot find it there.' },
    { name: 'showMap', type: 'boolean', default: 'true', description: 'Renders a `MapEmbed` preview of the chosen point on the monochrome basemap.' },
  ],
  demos: [
    { title: 'Search a place list', stack: true, code: `<LocationPicker value={value} onValueChange={setValue} onSearch={geocode} />`, render: () => <LocationDemo /> },
  ],
}

/* -------------------------------------------------------------- address input */

function AddressDemo() {
  const [value, setValue] = useState<AddressValue>({ ...emptyAddress, country: 'US' })
  return (
    <div className="w-full max-w-lg">
      <AddressInput value={value} onValueChange={setValue} />
    </div>
  )
}

export const addressInputEntry: ComponentEntry = {
  id: 'address-input',
  label: 'Address Input',
  description:
    'A postal address whose shape follows the country. A US form asks for a State and a ZIP; a UK one asks for a County and a Postcode; Japan puts the postal code first. Shipping the US layout everywhere is how forms reject valid addresses.',
  usage: `import { AddressInput } from '@/components/ui/address-input'

<AddressInput value={address} onValueChange={setAddress} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'country', label: 'country', options: ['US', 'GB', 'JP', 'AE', 'DE'], default: 'US' },
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default'], default: 'default' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <AddressInput
          value={{ ...emptyAddress, country: String(state.country) }}
          size={state.size as 'sm' | 'default'}
        />
      </div>
    ),
    code: () => `<AddressInput value={address} onValueChange={setAddress} />`,
  },
  api: [
    { name: 'value', type: 'AddressValue', description: '`{ country, line1, line2, city, region, postalCode }`. Structured, not a single textarea, so it can be validated and shipped.' },
    { name: 'country-driven labels', type: 'automatic', description: 'Region and postal-code labels, requiredness and field order all follow the selected country. Hong Kong and the UAE have no postal codes at all.' },
    { name: 'validation', type: 'requiredness only', description: 'No postal-code regexes. They are famously wrong — Eircodes, BFPO, new UK districts — and a form that refuses a real address is worse than one that accepts a typo.' },
    { name: 'autoComplete', type: 'set on every field', description: 'Which is the only reason a browser can fill the whole address from one tap.' },
  ],
  demos: [
    { title: 'Country-aware fields', stack: true, code: `const [address, setAddress] = useState({ ...emptyAddress, country: 'US' })\n\n<AddressInput value={address} onValueChange={setAddress} />`, render: () => <AddressDemo /> },
  ],
}

/* ------------------------------------------------------------ timezone select */

function TimezoneDemo() {
  const [zone, setZone] = useState('Europe/London')
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <TimezoneSelect value={zone} onValueChange={setZone} />
      <p className="text-muted-foreground font-mono text-xs">{zone}</p>
    </div>
  )
}

export const timezoneSelectEntry: ComponentEntry = {
  id: 'timezone-select',
  label: 'Timezone Select',
  description:
    'An IANA timezone picker showing each zone\'s current offset and local time. Zones are named by city, never by abbreviation — "CST" is Central, China and Cuba Standard Time.',
  usage: `import { TimezoneSelect } from '@/components/ui/timezone-select'

<TimezoneSelect value={zone} onValueChange={setZone} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'localTime', label: 'show local time', default: true },
      { type: 'boolean', prop: 'shortlist', label: 'restricted list', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <TimezoneSelect
          defaultValue="Europe/London"
          showLocalTime={Boolean(state.localTime)}
          zones={state.shortlist ? ['UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo'] : undefined}
        />
      </div>
    ),
    code: () => `<TimezoneSelect value={zone} onValueChange={setZone} />`,
  },
  api: [
    { name: 'options', type: 'from the runtime', description: '`Intl.supportedValuesOf("timeZone")`, so the list is whatever the browser actually supports rather than a table that rots each time a government moves a DST boundary.' },
    { name: 'offsets', type: 'computed live', description: 'A zone\'s offset is a function of the date. A list built in January is wrong for half the year.' },
    { name: 'zones', type: 'string[]', description: 'Restrict the list. A booking form rarely needs all four hundred.' },
    { name: 'showLocalTime', type: 'boolean', default: 'true', description: "The zone's current wall-clock time — usually the fastest way to recognise the right one." },
    { name: 'search', type: 'city or region', description: 'The region stays in the label, so `Europe/London` is findable by "Europe" as well as by "London".' },
  ],
  demos: [
    { title: 'Controlled selection', stack: true, code: `const [zone, setZone] = useState('Europe/London')\n\n<TimezoneSelect value={zone} onValueChange={setZone} />`, render: () => <TimezoneDemo /> },
  ],
}
