import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A microchart: enough shape to read a trend, no axes, no legend, no library.
 *
 * Plain SVG rather than a charting dependency. A sparkline is a polyline over
 * a normalised range — the whole implementation is the `points` calculation
 * below, and pulling in a chart library to draw it would cost more than every
 * other component in the kit combined.
 *
 * The viewBox is a fixed 100-unit grid stretched by `preserveAspectRatio:none`,
 * so the chart fills whatever width it is given without measuring anything.
 * `vector-effect: non-scaling-stroke` is what keeps the line an even weight
 * once that stretch is applied — without it the stroke skews with the aspect
 * ratio and a wide sparkline draws visibly thicker verticals than horizontals.
 */
type SparklineProps = Omit<ComponentProps<'svg'>, 'values'> & {
  values: number[]
  variant?: 'line' | 'area' | 'bar'
  /** Any CSS colour. Defaults to the inherited text colour. */
  color?: string
  /** Baseline for the fill and bars. Defaults to the lowest value. */
  baseline?: number
  strokeWidth?: number
}

const VIEW = { width: 100, height: 32 } as const

function Sparkline({
  values,
  variant = 'line',
  color = 'currentColor',
  baseline,
  strokeWidth = 1.5,
  className,
  ...props
}: SparklineProps) {
  if (values.length === 0) return null

  const min = Math.min(...values, baseline ?? Infinity)
  const max = Math.max(...values, baseline ?? -Infinity)
  // A flat series has no range to divide by; centre it instead of dividing by
  // zero and rendering NaN into the path.
  const span = max - min || 1
  const pad = strokeWidth

  const x = (index: number) =>
    values.length === 1
      ? VIEW.width / 2
      : (index / (values.length - 1)) * VIEW.width
  const y = (value: number) =>
    pad + (1 - (value - min) / span) * (VIEW.height - pad * 2)

  const points = values.map((value, index) => `${x(index)},${y(value)}`)

  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
      data-slot="sparkline"
      className={cn('h-8 w-full', className)}
      {...props}
    >
      {variant === 'bar' ? (
        values.map((value, index) => {
          const width = VIEW.width / values.length
          const top = y(value)
          return (
            <rect
              key={index}
              x={index * width + width * 0.15}
              y={top}
              width={width * 0.7}
              height={Math.max(VIEW.height - pad - top, 0.5)}
              fill={color}
            />
          )
        })
      ) : (
        <>
          {variant === 'area' && (
            <polygon
              points={[
                `0,${VIEW.height}`,
                ...points,
                `${VIEW.width},${VIEW.height}`,
              ].join(' ')}
              fill={color}
              opacity={0.14}
            />
          )}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  )
}

export { Sparkline }
export type { SparklineProps }
