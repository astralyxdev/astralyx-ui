import { useId, type ComponentProps, type ReactNode } from 'react'
import { dataFills } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A donut or pie chart of parts against a whole.
 *
 * Arcs are drawn with `stroke-dasharray` on a circle rather than as wedge
 * paths: one number per slice, no arc-flag branch at the halfway point, and a
 * gap between slices is a dash pattern rather than trigonometry.
 *
 * The centre label is not the accessible content — the `<title>` lists every
 * slice with its share, because a ring with "62%" in the middle tells a screen
 * reader nothing about the other 38.
 *
 * Slices below `minSlice` are folded into an "Other" entry. A pie with fourteen
 * one-percent wedges communicates less than one with five and a remainder.
 */
export type DonutSlice = {
  label: string
  value: number
  color?: string
}

function Donut({
  slices,
  size = 160,
  thickness = 18,
  gap = 1,
  minSlice = 0.02,
  centerLabel,
  centerValue,
  legend = true,
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'children'> & {
  slices: DonutSlice[]
  size?: number
  /** 0 renders a pie rather than a donut. */
  thickness?: number
  /** Degrees of space between slices. */
  gap?: number
  /** Fold anything under this share into "Other". */
  minSlice?: number
  centerLabel?: ReactNode
  centerValue?: ReactNode
  legend?: boolean
}) {
  const titleId = useId()
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1

  const big = slices.filter((slice) => slice.value / total >= minSlice)
  const small = slices.filter((slice) => slice.value / total < minSlice)
  const rest = small.reduce((sum, slice) => sum + slice.value, 0)

  const data = rest > 0 ? [...big, { label: 'Other', value: rest }] : big

  // A 100-unit viewBox: geometry stays independent of the rendered size.
  const radius = 50 - thickness / 2
  const circumference = 2 * Math.PI * radius
  const gapLength = (gap / 360) * circumference

  let offset = 0

  return (
    <figure
      data-slot="donut"
      className={cn('flex min-w-0 flex-wrap items-center gap-4', className)}
      {...props}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" role="img" aria-labelledby={titleId} className="size-full -rotate-90">
          <title id={titleId}>
            {data
              .map((slice) => `${slice.label}: ${Math.round((slice.value / total) * 100)}%`)
              .join(', ')}
          </title>

          {data.map((slice, index) => {
            const share = slice.value / total
            const length = Math.max(share * circumference - gapLength, 0)
            const dash = `${length} ${circumference - length}`
            const element = (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color ?? dataFills[index % dataFills.length]}
                strokeWidth={thickness || 100}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            )
            offset += share * circumference
            return element
          })}
        </svg>

        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <span className="text-xl font-semibold tabular-nums">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-muted-foreground text-xs">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      {legend && (
        <figcaption className="flex min-w-0 flex-1 flex-col gap-1.5">
          {data.map((slice, index) => (
            <span key={slice.label} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full [corner-shape:round]"
                style={{ backgroundColor: slice.color ?? dataFills[index % dataFills.length] }}
              />
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {slice.label}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}

export { Donut }
