import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { colorSet, tintStyle } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * How far along a task is.
 *
 * With no `value` it becomes indeterminate: the bar animates position, which is
 * the one honest way to say "working, duration unknown". It stops under
 * `prefers-reduced-motion`, where the track alone still communicates progress.
 */
const trackVariants = cva('bg-secondary w-full overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-1',
      default: 'h-1.5',
      lg: 'h-2.5',
    },
  },
  defaultVariants: { size: 'default' },
})

type ProgressProps = Omit<ComponentProps<'div'>, 'color'> &
  VariantProps<typeof trackVariants> & {
    /** 0–100. Omit for an indeterminate bar. */
    value?: number
    color?: keyof typeof colorSet
    tint?: string
    /** Render the percentage beside the track. */
    showValue?: boolean
  }

function Progress({
  className,
  size,
  value,
  color = 'neutral',
  tint,
  showValue = false,
  style,
  ...props
}: ProgressProps) {
  const indeterminate = value === undefined
  const clamped = indeterminate ? 0 : Math.min(100, Math.max(0, value))

  const track = (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      data-slot="progress"
      className={cn(trackVariants({ size }), colorSet[color], className)}
      style={tint ? { ...tintStyle(tint), ...style } : style}
      {...props}
    >
      <div
        data-slot="progress-fill"
        className={cn(
          'h-full rounded-full bg-[var(--ui)]',
          indeterminate
            ? 'w-2/5 animate-[progress-indeterminate_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50'
            : 'transition-[width] duration-300 ease-out motion-reduce:transition-none',
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  )

  if (!showValue) return track

  return (
    <div className="flex w-full items-center gap-3">
      {track}
      <span className="text-muted-foreground w-9 shrink-0 text-right font-mono text-xs tabular-nums">
        {indeterminate ? '—' : `${Math.round(clamped)}%`}
      </span>
    </div>
  )
}

export { Progress, trackVariants as progressVariants }
export type { ProgressProps }
