import { useId, useMemo, type ComponentProps } from 'react'
import { encodeQr, type EccLevel } from '@/lib/qr'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A QR code, encoded here and drawn as SVG.
 *
 * **Nothing leaves the page.** The common shortcut is an `<img>` pointed at a
 * QR-as-a-service URL, which means the two things people most often encode —
 * a TOTP enrolment secret and a wallet address — get handed to a third party
 * and written into someone's access log. The encoder is `@/lib/qr`; see it for
 * why that is worth 200 lines.
 *
 * **SVG, not canvas.** A QR is a grid of squares, which is what vectors are
 * for: it stays sharp at any size and when printed, it costs no raster memory
 * at 512px, and it survives a server render. Canvas would need an effect, a
 * ref, and a device-pixel-ratio dance to look right on a retina screen.
 *
 * **The quiet zone is not decoration.** Four modules of margin are part of the
 * spec, and a code butted against a coloured background is the single most
 * common reason a QR will not scan. It is included by default and `quietZone`
 * only makes it larger.
 *
 * Contrast is the other scanning failure: dark must be darker than light, and
 * inverting them (light code on a dark card) defeats most scanners. The
 * defaults are near-black on white regardless of theme, deliberately — this is
 * one of the few components that should not follow a dark mode.
 */
type QrCodeProps = Omit<ComponentProps<'svg'>, 'children'> & {
  /** The text to encode. A URL, an `otpauth://` string, an address. */
  value: string
  /**
   * Error correction. Higher survives more damage and holds less: `H` is worth
   * it when a logo covers the middle or the code is printed on something that
   * creases.
   */
  level?: EccLevel
  /** Rendered size in pixels. The SVG scales, so this is a hint, not a raster. */
  size?: number
  /** Quiet zone in modules. Four is the spec minimum and the default. */
  quietZone?: number
  /** Any CSS colour. Keep the contrast high and the dark one dark. */
  darkColor?: string
  lightColor?: string
  /** Centred over the code. Needs `level="H"` to stay scannable. */
  logo?: React.ReactNode
  /** Fraction of the code the logo may cover. Past ~0.25 it stops scanning. */
  logoSize?: number
  /** Accessible name. The encoded value is not read out — it is rarely useful. */
  label?: string
  /** Rendered instead of the code when the value is too long to encode. */
  fallback?: React.ReactNode
}

function QrCode({
  value,
  level = 'M',
  size = 160,
  quietZone = 4,
  darkColor = '#000000',
  lightColor = '#ffffff',
  logo,
  logoSize = 0.22,
  label = 'QR code',
  fallback,
  className,
  ...props
}: QrCodeProps) {
  const titleId = useId()

  // Encoding throws when the value is too long for version 10. Rendering
  // nothing at all is worse than saying so, so it is caught and reported.
  const result = useMemo(() => {
    try {
      return { matrix: encodeQr(value, level), error: null as string | null }
    } catch (error) {
      return { matrix: null, error: error instanceof Error ? error.message : String(error) }
    }
  }, [value, level])

  if (!result.matrix) {
    return (
      <>
        {fallback ?? (
          <p role="status" className="text-muted-foreground text-xs">
            {result.error}
          </p>
        )}
      </>
    )
  }

  const { modules, size: count } = result.matrix
  const span = count + quietZone * 2

  /**
   * One path for every dark module, rather than one `<rect>` each.
   *
   * A version 10 code is 57×57 — up to 3,249 elements, most of them dark. As a
   * single path it is one node and a fraction of the DOM, which matters because
   * these are often rendered in a list of devices or addresses.
   */
  const path = modules
    .flatMap((row, y) =>
      row.map((dark, x) =>
        dark ? `M${x + quietZone} ${y + quietZone}h1v1h-1z` : '',
      ),
    )
    .join('')

  const logoSpan = count * logoSize

  return (
    <svg
      data-slot="qr-code"
      viewBox={`0 0 ${span} ${span}`}
      width={size}
      height={size}
      role="img"
      aria-labelledby={titleId}
      // `crispEdges` keeps module boundaries on pixel lines; antialiasing them
      // blurs the edges a scanner is looking for.
      shapeRendering="crispEdges"
      className={cn('shrink-0', radius.xs, className)}
      {...props}
    >
      <title id={titleId}>{label}</title>
      <rect width={span} height={span} fill={lightColor} />
      <path d={path} fill={darkColor} />

      {logo && (
        <>
          {/* Knocked out, not drawn over: the modules underneath would show
              through a transparent logo and break the pattern either way. */}
          <rect
            x={(span - logoSpan) / 2}
            y={(span - logoSpan) / 2}
            width={logoSpan}
            height={logoSpan}
            fill={lightColor}
          />
          <foreignObject
            x={(span - logoSpan) / 2}
            y={(span - logoSpan) / 2}
            width={logoSpan}
            height={logoSpan}
          >
            <div className="flex size-full items-center justify-center">{logo}</div>
          </foreignObject>
        </>
      )}
    </svg>
  )
}

export { QrCode }
export type { QrCodeProps }
