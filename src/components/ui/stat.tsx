import type { ComponentProps, ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cardPadding, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A single measurement: label, value, and how it moved.
 *
 * The direction of a change and whether that change is *good* are different
 * questions, which is why `goodDirection` exists. Deployments rising is
 * healthy; open incidents rising is not, and a component that colours every
 * increase green would say the opposite of what the number means.
 */
type StatProps = Omit<ComponentProps<'div'>, 'title'> & {
  label: ReactNode
  value: ReactNode
  /** Signed change. Sign picks the arrow; `goodDirection` picks the colour. */
  delta?: number
  /** How the delta is written. Defaults to a percentage. */
  deltaSuffix?: string
  /**
   * Which direction counts as healthy. `'none'` keeps the delta neutral, for
   * measures where neither direction is good or bad.
   */
  goodDirection?: 'up' | 'down' | 'none'
  icon?: ReactNode
  /** A Sparkline, usually. Sits under the value. */
  chart?: ReactNode
  hint?: ReactNode
  size?: 'sm' | 'default' | 'lg'
  /** Draw the card. Off when the caller supplies its own container. */
  bordered?: boolean
}

function Stat({
  label,
  value,
  delta,
  deltaSuffix = '%',
  goodDirection = 'up',
  icon,
  chart,
  hint,
  size = 'default',
  bordered = true,
  className,
  ...props
}: StatProps) {
  const rising = delta !== undefined && delta > 0
  const flat = delta === undefined || delta === 0
  const good =
    goodDirection === 'none' || flat
      ? undefined
      : (rising && goodDirection === 'up') || (!rising && goodDirection === 'down')

  const Arrow = flat ? ArrowRight : rising ? ArrowUpRight : ArrowDownRight

  return (
    <div
      data-slot="stat"
      className={cn(
        'flex min-w-0 flex-col gap-1',
        bordered && [surface, radius.surface, cardPadding[size]],
        className,
      )}
      {...props}
    >
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        {icon && (
          <span className="[&_svg]:size-3.5 [&_svg]:shrink-0">{icon}</span>
        )}
        <span className="truncate">{label}</span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            'font-semibold tabular-nums',
            size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl',
          )}
        >
          {value}
        </span>

        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
              good === undefined && 'text-muted-foreground',
              good === true && 'text-[var(--green-soft-foreground)]',
              good === false && 'text-[var(--destructive-soft-foreground)]',
            )}
          >
            <Arrow className="size-3.5 shrink-0" aria-hidden="true" />
            {/* The sign is already carried by the arrow. */}
            {Math.abs(delta)}
            {deltaSuffix}
          </span>
        )}
      </div>

      {chart && <div className="mt-1 min-w-0">{chart}</div>}
      {hint && <p className="text-muted-foreground/70 text-xs">{hint}</p>}
    </div>
  )
}

export { Stat }
export type { StatProps }
