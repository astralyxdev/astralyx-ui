import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A recessed container that holds a set of cards.
 *
 * The padding and the gap are the same value at every size, so the space
 * between two cards matches the space between a card and the container edge.
 *
 * The radius is concentric: the group's corner is the card's corner plus the
 * padding between them (`--radius-group-*` in index.css). Reusing the card's own
 * radius would make the gap between the two curves pinch at the corners.
 *
 * A horizontal group stacks below `responsive` — three cards side by side on a
 * phone gives each of them about a hundred pixels, which is not a layout.
 */
const groupVariants = cva(
  [
    'flex bg-[var(--group)]',
    // Cards inside a group lose their outline: the recess already separates
    // them from the page, and a border on top of that reads as a double edge.
    '[&>[data-slot=card]]:border-transparent',
  ].join(' '),
  {
    variants: {
      orientation: {
        vertical: 'flex-col',
        horizontal: 'flex-row flex-wrap items-stretch',
      },
      size: {
        sm: 'gap-3 p-3 rounded-[var(--radius-group-sm)]',
        default: 'gap-4.5 p-4.5 rounded-[var(--radius-group-md)]',
        lg: 'gap-6 p-6 rounded-[var(--radius-group-lg)]',
      },
      /** Give every child an equal share of the main axis. */
      even: {
        true: '[&>*]:min-w-0 [&>*]:flex-1',
        false: '',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
      size: 'default',
      even: false,
    },
  },
)

/**
 * A horizontal group written so it only becomes a row at the breakpoint.
 *
 * Spelled out per breakpoint rather than composed, because Tailwind scans
 * source text — a prefix built by interpolation produces no CSS.
 */
const RESPONSIVE_ROW = {
  sm: 'flex-col sm:flex-row sm:flex-wrap sm:items-stretch',
  md: 'flex-col md:flex-row md:flex-wrap md:items-stretch',
  lg: 'flex-col lg:flex-row lg:flex-wrap lg:items-stretch',
} as const

type GroupProps = ComponentProps<'div'> &
  VariantProps<typeof groupVariants> & {
    /** Breakpoint a horizontal group becomes a row at. `false` never stacks. */
    responsive?: Responsive
  }

function Group({
  className,
  orientation = 'vertical',
  size,
  even,
  responsive = 'sm',
  ...props
}: GroupProps) {
  const stacks = orientation === 'horizontal' && responsive !== false
  const rows = stacks ? RESPONSIVE_ROW[responsive] : undefined

  return (
    <div
      data-slot="group"
      data-orientation={orientation}
      className={cn(
        // `orientation` is passed as vertical while stacking so the row classes
        // do not fight the responsive ones.
        groupVariants({ orientation: stacks ? 'vertical' : orientation, size, even }),
        rows,
        className,
      )}
      {...props}
    />
  )
}

export { Group, groupVariants }
export type { GroupProps }
