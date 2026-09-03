import { useId, useMemo, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A metric plotted against its expected range, with outliers marked.
 *
 * The band is the point. A spike means nothing without knowing what normal
 * looked like at that moment — 400ms at 03:00 may be an incident while 400ms at
 * peak is Tuesday. Detection stays outside this component: it renders the
 * `expected` range you give it and marks whatever falls outside, rather than
 * inventing a threshold of its own.
 *
 * Points are drawn in a second, unstretched layer. The plot is stretched to fit
 * its container, and a circle inside that stretch would render as an ellipse.
 */
export type AnomalyPoint = {
  value: number
  /** Expected [low, high] at this moment. */
  expected?: [number, number]
  label?: string
}

const PLOT = { width: 100, height: 60 } as const

function AnomalyChart({
  points,
  height = 160,
  color = 'var(--blue)',
  bandColor = 'var(--blue)',
  anomalyColor = 'var(--destructive)',
  labels,
  observedLabel = 'Observed',
  expectedLabel = 'Expected range',
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'height'> & {
  points: AnomalyPoint[]
  height?: number
  color?: string
  bandColor?: string
  anomalyColor?: string
  labels?: string[]
  /** Legend entries. */
  observedLabel?: ReactNode
  expectedLabel?: ReactNode
}) {
  const titleId = useId()

  const { min, span } = useMemo(() => {
    const values = points.flatMap((point) => [
      point.value,
      ...(point.expected ?? []),
    ])
    const low = Math.min(...values)
    const high = Math.max(...values)
    // A little headroom, so an anomaly never sits exactly on the edge.
    const pad = (high - low || 1) * 0.1
    return { min: low - pad, span: high - low + pad * 2 || 1 }
  }, [points])

  const x = (index: number) =>
    points.length === 1 ? PLOT.width / 2 : (index / (points.length - 1)) * PLOT.width
  const y = (value: number) => PLOT.height - ((value - min) / span) * PLOT.height

  const anomalies = points
    .map((point, index) => ({ point, index }))
    .filter(
      ({ point }) =>
        point.expected &&
        (point.value < point.expected[0] || point.value > point.expected[1]),
    )

  const banded = points.filter((point) => point.expected)
  const bandPath =
    banded.length === points.length && points.length > 0
      ? [
          ...points.map((point, index) => `${x(index)},${y(point.expected![1])}`),
          ...[...points]
            .reverse()
            .map((point, index) => `${x(points.length - 1 - index)},${y(point.expected![0])}`),
        ].join(' ')
      : undefined

  return (
    <figure
      data-slot="anomaly-chart"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    >
      <div className="relative min-w-0" style={{ height }}>
        <svg
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={titleId}
          className="size-full"
        >
          {/* One string: React cannot join multiple children into a <title>. */}
          <title id={titleId}>
            {`Metric against expected range${
              anomalies.length > 0 ? `, ${anomalies.length} outside the band` : ''
            }`}
          </title>

          {bandPath && <polygon points={bandPath} fill={bandColor} opacity={0.12} />}

          <polyline
            points={points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Unstretched overlay: a circle in the layer above keeps its shape. */}
        <svg
          viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          {anomalies.map(({ point, index }) => (
            <circle
              key={index}
              cx={x(index)}
              cy={y(point.value)}
              r={2.5}
              fill={anomalyColor}
              stroke="var(--background)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {labels && (
        <div className="text-muted-foreground/70 flex justify-between text-[10px]" aria-hidden="true">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      )}

      <figcaption className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
          {observedLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-3 rounded-sm"
            style={{ backgroundColor: bandColor, opacity: 0.25 }}
          />
          {expectedLabel}
        </span>
        {anomalies.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full [corner-shape:round]"
              style={{ backgroundColor: anomalyColor }}
            />
            {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}
          </span>
        )}
      </figcaption>
    </figure>
  )
}

export { AnomalyChart }
