import type { ComponentProps } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * A run of per-period bars: uptime history, or a contribution heatmap.
 *
 * One primitive for both, because they are the same picture — a sequence of
 * buckets coloured by intensity or state. The difference is only whether the
 * scale is categorical (up, degraded, down) or continuous (a count).
 *
 * Bars flex rather than taking a fixed width, so ninety days compress on a
 * phone instead of scrolling. A missing bucket renders as an explicit gap
 * rather than being dropped, which keeps the axis honest.
 */
export type UptimeBucket = {
  /** Label for the tooltip — a date, usually. */
  label: string
  /** Categorical state. Ignored when `value` is given. */
  status?: 'up' | 'degraded' | 'down' | 'none'
  /** Continuous intensity, 0 to 1, for a heatmap. */
  value?: number
  detail?: string
}

const STATUS_TONE = {
  up: 'bg-[var(--green)]',
  degraded: 'bg-[var(--amber)]',
  down: 'bg-[var(--destructive)]',
  none: 'bg-border',
} as const

/** Five steps is enough to read a gradient and few enough to stay distinct. */
function intensityTone(value: number) {
  if (value <= 0) return 'bg-border'
  if (value < 0.25) return 'bg-[var(--green)]/25'
  if (value < 0.5) return 'bg-[var(--green)]/45'
  if (value < 0.75) return 'bg-[var(--green)]/70'
  return 'bg-[var(--green)]'
}

function UptimeStrip({
  buckets,
  height = 28,
  rounded = true,
  label,
  summary,
  className,
  ...props
}: ComponentProps<'div'> & {
  buckets: UptimeBucket[]
  height?: number
  rounded?: boolean
  label?: string
  /** Right-aligned caption — an uptime percentage, usually. */
  summary?: string
}) {
  return (
    <div data-slot="uptime-strip" className={cn('flex flex-col gap-1.5', className)} {...props}>
      {(label || summary) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && <span className="text-sm font-medium">{label}</span>}
          {summary && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {summary}
            </span>
          )}
        </div>
      )}

      <div
        className="flex items-stretch gap-[2px]"
        style={{ height }}
        role="img"
        aria-label={
          label ? `${label} history${summary ? `, ${summary}` : ''}` : 'History'
        }
      >
        {buckets.map((bucket, index) => (
          <Tooltip
            key={index}
            content={
              <span className="flex flex-col">
                <span>{bucket.label}</span>
                {bucket.detail && (
                  <span className="opacity-70">{bucket.detail}</span>
                )}
              </span>
            }
          >
            <span
              tabIndex={0}
              className={cn(
                'min-w-[3px] flex-1 transition-colors duration-150 ease-out motion-reduce:transition-none',
                'focus-visible:ring-ring/50 outline-none focus-visible:ring-2',
                rounded && 'rounded-[2px]',
                bucket.value !== undefined
                  ? intensityTone(bucket.value)
                  : STATUS_TONE[bucket.status ?? 'none'],
              )}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

export { UptimeStrip }
