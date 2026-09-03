import { useId, useMemo, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * OHLC candles with an optional volume strip.
 *
 * Candles are drawn in an unstretched SVG — a fixed viewBox scaled by the
 * container, with `preserveAspectRatio` left at its default. Every other chart
 * here stretches, but a stretched candle is a lie: the body width would vary
 * with the container while the wick stays one unit, and the classic reading of
 * body-versus-wick stops working.
 *
 * The price axis is padded to the extremes of the *wicks*, not the bodies, or
 * the highest high clips at the top edge exactly when it matters.
 */
export type Candle = {
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

function CandlestickChart({
  candles,
  height = 220,
  showVolume = true,
  upColor = 'var(--green)',
  downColor = 'var(--destructive)',
  locale = 'en-GB',
  upLabel = 'Up',
  downLabel = 'Down',
  volumeLabel = 'Volume below',
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'height'> & {
  candles: Candle[]
  height?: number
  showVolume?: boolean
  upColor?: string
  downColor?: string
  locale?: string
  /** Legend entries. */
  upLabel?: ReactNode
  downLabel?: ReactNode
  volumeLabel?: ReactNode
}) {
  const titleId = useId()

  const { min, max, maxVolume } = useMemo(() => {
    if (candles.length === 0) return { min: 0, max: 1, maxVolume: 1 }
    // Wicks, not bodies: the extreme is the whole point of a high and a low.
    const low = Math.min(...candles.map((c) => c.low))
    const high = Math.max(...candles.map((c) => c.high))
    const pad = (high - low || 1) * 0.06
    return {
      min: low - pad,
      max: high + pad,
      maxVolume: Math.max(...candles.map((c) => c.volume ?? 0), 1),
    }
  }, [candles])

  if (candles.length === 0) return null

  const width = candles.length * 10
  const priceHeight = showVolume ? 76 : 100
  const span = max - min || 1

  const x = (index: number) => index * 10 + 5
  const y = (price: number) => ((max - price) / span) * priceHeight

  const money = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

  return (
    <figure
      data-slot="candlestick-chart"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    >
      <div className="flex min-w-0 gap-2">
        <div
          className="text-muted-foreground/70 flex shrink-0 flex-col justify-between text-[10px] tabular-nums"
          style={{ height }}
          aria-hidden="true"
        >
          <span>{money.format(max)}</span>
          <span>{money.format((max + min) / 2)}</span>
          <span>{money.format(min)}</span>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} 100`}
            style={{ height, width: Math.max(width * 2, 100) }}
            role="img"
            aria-labelledby={titleId}
          >
            <title id={titleId}>
              {`${candles.length} candles, ${money.format(min)} to ${money.format(max)}`}
            </title>

            {candles.map((candle, index) => {
              const up = candle.close >= candle.open
              const colour = up ? upColor : downColor
              const bodyTop = y(Math.max(candle.open, candle.close))
              const bodyBottom = y(Math.min(candle.open, candle.close))

              return (
                <g key={index}>
                  <line
                    x1={x(index)}
                    x2={x(index)}
                    y1={y(candle.high)}
                    y2={y(candle.low)}
                    stroke={colour}
                    strokeWidth={1}
                  />
                  <rect
                    x={x(index) - 3}
                    y={bodyTop}
                    width={6}
                    // A doji still needs a visible line.
                    height={Math.max(bodyBottom - bodyTop, 0.75)}
                    fill={up ? 'none' : colour}
                    stroke={colour}
                    strokeWidth={1}
                  />

                  {showVolume && candle.volume !== undefined && (
                    <rect
                      x={x(index) - 3}
                      y={100 - (candle.volume / maxVolume) * 18}
                      width={6}
                      height={(candle.volume / maxVolume) * 18}
                      fill={colour}
                      opacity={0.35}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <figcaption className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border" style={{ borderColor: upColor }} />
          {upLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: downColor }} />
          {downLabel}
        </span>
        {showVolume && <span>{volumeLabel}</span>}
      </figcaption>
    </figure>
  )
}

export { CandlestickChart }
