import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The bar that appears once rows are selected.
 *
 * Floating over the content rather than pushing it down. A bar that inserts
 * itself into the flow shifts every row the moment you tick a checkbox, and the
 * second checkbox you aim for has moved — the classic way to select the wrong
 * thing.
 *
 * Destructive actions state the count in the label. "Delete" and "Delete 240
 * users" deserve different amounts of hesitation, and the number is the only
 * thing that supplies it.
 */
function BulkActionBar({
  count,
  onClear,
  children,
  label,
  floating = true,
  barLabel = 'Bulk actions',
  clearLabel = 'Clear selection',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  count: number
  onClear?: () => void
  children?: ReactNode
  label?: (count: number) => ReactNode
  /** Overlay the content instead of taking layout space. */
  floating?: boolean
  /** Accessible name for the bar itself. */
  barLabel?: string
  clearLabel?: string
}) {
  if (count === 0) return null

  return (
    <div
      role="region"
      aria-label={barLabel}
      data-slot="bulk-action-bar"
      className={cn(
        'bg-foreground text-background flex flex-wrap items-center gap-3 p-3',
        radius.control,
        // Overlaid, so ticking a box never moves the next one.
        floating &&
          'fixed inset-x-4 bottom-4 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2',
        className,
      )}
      {...props}
    >
      <span className="text-sm font-medium whitespace-nowrap">
        {label ? label(count) : `${count} selected`}
      </span>

      <span className="flex flex-wrap items-center gap-1.5">{children}</span>

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className={cn(
            'text-background/70 hover:text-background ms-1 flex size-6 shrink-0 items-center justify-center',
            radius.xs,
            'focus-visible:ring-background/50 outline-none focus-visible:ring-2',
          )}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export { BulkActionBar }
