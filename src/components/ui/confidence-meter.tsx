import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A model's confidence in an answer.
 *
 * Segmented rather than continuous, deliberately. A smooth bar invites reading
 * 0.834 as meaningfully different from 0.851, which is not what a calibration
 * score supports. Five steps say "fairly confident" and stop there.
 *
 * The band label is the accessible name, so a screen reader hears "confidence:
 * high" instead of a percentage that implies more precision than exists.
 */
const BANDS = [
  { max: 0.2, label: 'Very low', tone: 'bg-[var(--destructive)]' },
  { max: 0.4, label: 'Low', tone: 'bg-[var(--destructive)]' },
  { max: 0.6, label: 'Moderate', tone: 'bg-[var(--amber)]' },
  { max: 0.8, label: 'High', tone: 'bg-[var(--green)]' },
  { max: 1.01, label: 'Very high', tone: 'bg-[var(--green)]' },
] as const

const SEGMENTS = 5

function ConfidenceMeter({
  value,
  label = 'Confidence',
  showLabel = true,
  hint,
  size = 'default',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  /** 0 to 1. */
  value: number
  label?: ReactNode
  showLabel?: boolean
  hint?: ReactNode
  size?: 'sm' | 'default'
}) {
  const ratio = Math.max(0, Math.min(value, 1))
  const band = BANDS.find((entry) => ratio < entry.max) ?? BANDS[BANDS.length - 1]
  const filled = Math.max(1, Math.ceil(ratio * SEGMENTS))

  return (
    <div
      data-slot="confidence-meter"
      className={cn('flex min-w-0 flex-col gap-1', className)}
      {...props}
    >
      {showLabel && (
        <div className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">{label}</span>
          <span>{band.label}</span>
        </div>
      )}

      <div
        role="meter"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={band.label}
        aria-label={typeof label === 'string' ? label : 'Confidence'}
        className="flex gap-1"
      >
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              'flex-1 rounded-full [corner-shape:round]',
              size === 'sm' ? 'h-1' : 'h-1.5',
              index < filled ? band.tone : 'bg-secondary',
            )}
          />
        ))}
      </div>

      {hint && <p className="text-muted-foreground/70 text-xs">{hint}</p>}
    </div>
  )
}

export { ConfidenceMeter }
