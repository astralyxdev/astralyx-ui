import { useState, type ComponentProps, type ReactNode } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A map, drawn from raster tiles.
 *
 * The look is near-monochrome by default. A full-colour street map fights
 * everything drawn on top of it; a greyscale ground lets a marker, a route or a
 * heat layer be the only saturated thing on screen, which is why analytics
 * products use styles like CARTO's Dark Matter.
 *
 * Those styles need an API key, so the default source here is OpenStreetMap's
 * standard tiles — genuinely keyless — desaturated in CSS instead. `invert`
 * after `grayscale` turns the light basemap dark, which lands close to Dark
 * Matter with no token and no third-party account. It is a filter rather than a
 * real dark cartography, and it is worth being honest that it approximates one.
 *
 * OSM's Tile Usage Policy asks that their servers not carry a production
 * product's traffic. For anything past local work and internal tools, pass
 * `tiles` as a function pointing at your own or a keyed provider; `filter={null}`
 * then turns the CSS treatment off when that style is already monochrome.
 *
 * Tiles are plain `<img>` elements in a grid — no iframe, no mapping library,
 * so no third-party JavaScript or cookies. The remaining exposure is the tile
 * requests themselves, the same as any remote image. This is a static view by
 * design: anything needing pan and zoom wants MapLibre, not this.
 */
export type MapTheme = 'dark' | 'light' | 'auto'

export type TileSource = 'osm' | ((z: number, x: number, y: number) => string)

/**
 * Desaturation applied to a full-colour raster. `invert` after `grayscale` is
 * what produces the dark ground; the brightness and contrast nudges stop roads
 * blowing out to white and keep labels legible.
 */
const FILTER = {
  dark: 'grayscale(1) invert(1) brightness(0.92) contrast(1.08)',
  light: 'grayscale(1) brightness(1.04) contrast(0.96)',
} as const

const CREDIT = '© OpenStreetMap contributors'

const TILE = 256
/** Tiles either side of centre. 2 gives a 5×5 grid — 1280px of cover. */
const RADIUS = 2
/** Web Mercator cannot represent the poles; this is where the projection ends. */
const MAX_LAT = 85.05112878

/** Longitude/latitude to fractional tile coordinates at a zoom level. */
function project(lat: number, lng: number, zoom: number) {
  const scale = 2 ** zoom
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat))
  const radians = (clamped * Math.PI) / 180
  return {
    x: ((lng + 180) / 360) * scale,
    y:
      ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
      scale,
  }
}

/** OSM standard. Keyless; no retina variant and no dark style of its own. */
function osmUrl(z: number, x: number, y: number) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
}

function MapEmbed({
  lat,
  lng,
  zoom = 14,
  tiles = 'osm',
  theme = 'dark',
  filter,
  marker = true,
  label,
  eager = true,
  height = 280,
  linkOut = true,
  loadLabel = 'Load map',
  consentNote,
  attribution,
  linkLabel = 'Open map',
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'children'> & {
  lat: number
  lng: number
  zoom?: number
  /**
   * Where tiles come from. `'osm'` is the keyless default; pass
   * `(z, x, y) => url` for your own or a keyed provider.
   */
  tiles?: TileSource
  /** Which desaturation to apply. `auto` follows the page theme. */
  theme?: MapTheme
  /**
   * Overrides the CSS filter. Pass `null` when the tiles are already
   * monochrome and should be left alone.
   */
  filter?: string | null
  marker?: boolean
  /** Place name, shown in the caption and used as the image description. */
  label?: ReactNode
  /** Set false to hold the tiles behind a click, for a consent gate. */
  eager?: boolean
  height?: number | string
  linkOut?: boolean
  loadLabel?: ReactNode
  consentNote?: ReactNode
  /** Overrides the required OpenStreetMap credit. */
  attribution?: ReactNode
  linkLabel?: ReactNode
}) {
  const [loaded, setLoaded] = useState(eager)

  const custom = typeof tiles === 'function' ? tiles : undefined
  const url = custom ?? osmUrl

  const centre = project(lat, lng, zoom)
  const originX = Math.floor(centre.x) - RADIUS
  const originY = Math.floor(centre.y) - RADIUS
  const span = RADIUS * 2 + 1

  // Where the target sits inside the rendered grid, in pixels. The grid is then
  // shifted by this much from the container's centre, putting the point dead
  // centre whatever size the container happens to be.
  const offsetX = (centre.x - originX) * TILE
  const offsetY = (centre.y - originY) * TILE

  const max = 2 ** zoom
  const wrap = (value: number) => ((value % max) + max) % max

  const external = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`
  const described = label
    ? `Map centred on ${typeof label === 'string' ? label : 'the selected location'}`
    : `Map centred on ${lat.toFixed(4)}, ${lng.toFixed(4)}`

  const layer = (css: string | undefined, extraClass?: string) => (
    <div
      aria-hidden="true"
      className={cn('absolute top-1/2 left-1/2', extraClass)}
      style={{
        width: span * TILE,
        height: span * TILE,
        filter: css,
        // Grid is placed from the container centre, then pulled back by the
        // target's own offset within it.
        transform: `translate(${-offsetX}px, ${-offsetY}px)`,
        display: 'grid',
        gridTemplateColumns: `repeat(${span}, ${TILE}px)`,
      }}
    >
      {Array.from({ length: span * span }, (_, index) => {
        const column = index % span
        const row = Math.floor(index / span)
        const tileY = originY + row
        // Outside the vertical range there is no map, only empty projection.
        if (tileY < 0 || tileY >= max) {
          return <span key={index} style={{ width: TILE, height: TILE }} />
        }
        return (
          <img
            key={index}
            src={url(zoom, wrap(originX + column), tileY)}
            alt=""
            loading="lazy"
            draggable={false}
            width={TILE}
            height={TILE}
            className="block select-none"
          />
        )
      })}
    </div>
  )

  const chosen = (mode: 'dark' | 'light') =>
    filter === null ? undefined : (filter ?? FILTER[mode])

  return (
    <figure
      data-slot="map-embed"
      data-theme-mode={theme}
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      <div
        role="img"
        aria-label={described}
        className="relative w-full overflow-hidden bg-[oklch(0.19_0_0)]"
        style={{ height }}
      >
        {loaded ? (
          <>
            {/* `auto` renders both layers and lets CSS pick, so the theme
                toggle costs no tile requests. */}
            {theme === 'auto' ? (
              <>
                {layer(chosen('light'), 'dark:hidden')}
                {layer(chosen('dark'), 'hidden dark:grid')}
              </>
            ) : (
              layer(chosen(theme))
            )}

            {marker && (
              <MapPin
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-full fill-[var(--primary)] text-[var(--primary-foreground)] drop-shadow"
              />
            )}
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center">
            <MapPin className="size-6 text-[oklch(0.65_0_0)]" aria-hidden="true" />
            <p className="max-w-xs text-xs text-[oklch(0.72_0_0)]">
              {consentNote ??
                `This map loads tiles from ${custom ? 'your tile server' : 'OpenStreetMap'}, which will see your IP address.`}
            </p>
            <Button size="sm" variant="secondary" onClick={() => setLoaded(true)}>
              {loadLabel}
            </Button>
          </div>
        )}
      </div>

      <figcaption className="border-border text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 border-t p-3 text-xs">
        <span className="min-w-0 flex-1 truncate">
          {label ?? (
            <span className="tabular-nums">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          )}
        </span>

        {/* Required by the tile provider. */}
        <span className="text-muted-foreground/60 shrink-0">{attribution ?? CREDIT}</span>

        {linkOut && (
          <a
            href={external}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground flex shrink-0 items-center gap-1 underline-offset-4 hover:underline"
          >
            {linkLabel}
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}
      </figcaption>
    </figure>
  )
}

export { MapEmbed, project as projectMercator, osmUrl, FILTER as mapFilters }
