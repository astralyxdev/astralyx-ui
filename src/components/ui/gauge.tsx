import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A radial meter — the circular counterpart to Progress.
 *
 * Drawn with `stroke-dasharray` on a circle rather than an arc path, so the
 * sweep is one number to animate and there is no arc-flag maths to get wrong
 * near 180 degrees.
 *
 * It reports as a real `progressbar` with `aria-valuenow`, because a ring of
 * SVG is otherwise invisible to a screen reader — the number in the middle is
 * decoration, not an accessible value.
 */
function Gauge({
  value,
  max = 100,
  size = 96,
  thickness = 8,
  label,
  hint,
  tone,
  showValue = true,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  value: number
  max?: number
  size?: number
  thickness?: number
  label?: ReactNode
  hint?: ReactNode
  /** Any CSS colour. Defaults to a threshold ramp: green, amber, red. */
  tone?: string
  showValue?: boolean
}) {
  const id = useId()
  const ratio = Math.max(0, Math.min(value / max, 1))
  const percent = Math.round(ratio * 100)

  // A 100-unit viewBox keeps the geometry independent of the rendered size.
  const radius = 50 - thickness / 2
  const circumference = 2 * Math.PI * radius

  const colour =
    tone ??
    (ratio >= 0.9
      ? 'var(--destructive)'
      : ratio >= 0.75
        ? 'var(--amber)'
        : 'var(--green)')

  return (
    <div
      data-slot="gauge"
      className={cn('inline-flex flex-col items-center gap-1', className)}
      {...props}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-labelledby={label ? id : undefined}
          aria-label={label ? undefined : `${percent} percent`}
          className="size-full -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            className="transition-[stroke-dashoffset,stroke] duration-300 ease-out motion-reduce:transition-none"
          />
        </svg>

        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold tabular-nums">{percent}%</span>
            {hint && (
              <span className="text-muted-foreground text-[10px]">{hint}</span>
            )}
          </div>
        )}
      </div>

      {label && (
        <span id={id} className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
      )}
    </div>
  )
}

export { Gauge }
