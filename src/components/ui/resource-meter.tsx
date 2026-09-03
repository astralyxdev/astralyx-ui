import type { ComponentProps, ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import { cn } from '@/lib/utils'

/**
 * A used-against-cap bar: build minutes, storage, seats, rate limits.
 *
 * Not `Progress`, which reports how far along a task is. This reports
 * consumption of a fixed budget, so it warns as it fills and can overflow past
 * 100% — a task cannot be 130% done, but a quota can be 130% used, and hiding
 * that by clamping is how a bill becomes a surprise.
 */
function ResourceMeter({
  label,
  used,
  cap,
  unit = 'number',
  tone,
  hint,
  size = 'default',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  label: ReactNode
  used: number
  cap: number
  /** How the numbers are written. */
  unit?: 'number' | 'bytes' | 'duration'
  /** Any CSS colour. Defaults to a threshold ramp. */
  tone?: string
  hint?: ReactNode
  size?: 'sm' | 'default'
}) {
  const ratio = cap > 0 ? used / cap : 0
  const over = ratio > 1
  const percent = Math.round(ratio * 100)

  const colour =
    tone ??
    (over || ratio >= 0.95
      ? 'var(--destructive)'
      : ratio >= 0.8
        ? 'var(--amber)'
        : 'var(--blue)')

  return (
    <div
      data-slot="resource-meter"
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className={cn('font-medium', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          <Fmt type={unit} value={used} /> / <Fmt type={unit} value={cap} />
          <span className={cn('ms-1.5', over && 'text-[var(--destructive-soft-foreground)] font-medium')}>
            ({percent}%)
          </span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn(
          'bg-secondary w-full overflow-hidden rounded-full [corner-shape:round]',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300 ease-out [corner-shape:round] motion-reduce:transition-none"
          style={{
            // Clamped for the bar only — the number above still says 130%.
            width: `${Math.min(ratio, 1) * 100}%`,
            backgroundColor: colour,
          }}
        />
      </div>

      {hint && <p className="text-muted-foreground/70 text-xs">{hint}</p>}
      {over && !hint && (
        <p className="text-[var(--destructive-soft-foreground)] text-xs">
          Over budget by <Fmt type={unit} value={used - cap} />
        </p>
      )}
    </div>
  )
}

export { ResourceMeter }
