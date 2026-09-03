import type { ComponentProps } from 'react'
import { Progress } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * How much of a context window is spoken for.
 *
 * The colour crosses to amber at 75% and destructive at 90%, because the number
 * only matters once it is close — a green bar at 12% is noise, an amber one at
 * 80% is a warning you can act on before the conversation truncates.
 */
function TokenUsage({
  className,
  used,
  limit,
  label = 'Context used',
  size = 'sm',
  showNumbers = true,
  ...props
}: ComponentProps<'div'> & {
  used: number
  limit: number
  label?: string
  size?: 'sm' | 'default' | 'lg'
  showNumbers?: boolean
}) {
  const share = limit === 0 ? 0 : Math.min(100, (used / limit) * 100)
  const color = share >= 90 ? 'destructive' : share >= 75 ? 'amber' : 'blue'

  const compact = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)

  return (
    <div
      data-slot="token-usage"
      className={cn('w-full space-y-1.5', className)}
      {...props}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-xs">{label}</span>
        {showNumbers && (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {compact(used)} / {compact(limit)}
          </span>
        )}
      </div>
      <Tooltip content={`${used.toLocaleString()} of ${limit.toLocaleString()} tokens`}>
        <div>
          <Progress value={share} color={color} size={size} />
        </div>
      </Tooltip>
    </div>
  )
}

export { TokenUsage }
