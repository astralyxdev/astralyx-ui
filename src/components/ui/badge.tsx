import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@/components/primitives/slot'
import {
  badgeSize,
  colorSet,
  iconChild,
  tintStyle,
  type ColorSet,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A short status or category marker.
 *
 * Unlike a field, a badge exists to be noticed, so it keeps the full colour
 * system — the same `--ui-*` sets and `tint` escape hatch a Button uses.
 *
 * `secondary` is the default because it is the right answer nearly every time:
 * tinted enough to read as a badge, quiet enough to sit in a table row or a
 * heading without shouting. Reach for `default` only when a badge has to be the
 * loudest thing on screen, and for `outline` only on an already-tinted surface
 * where a second fill would compete. Meaning belongs in `color`, not `variant`.
 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center',
    'font-medium whitespace-nowrap',
    'transition-colors duration-150 ease-out motion-reduce:transition-none',
    iconChild,
  ].join(' '),
  {
    variants: {
      variant: {
        /** Solid fill in the current colour set. */
        default: 'bg-[var(--ui)] text-[var(--ui-fg)]',
        /** Tinted fill, saturated text — the quiet default for most labels. */
        secondary: 'bg-[var(--ui-soft)] text-[var(--ui-soft-fg)]',
        outline:
          'border border-[var(--ui-soft-fg)] text-[var(--ui-soft-fg)] bg-transparent',
        ghost: 'text-[var(--ui-soft-fg)] bg-transparent',
      },
      color: colorSet,
      size: {
        sm: badgeSize.sm,
        default: badgeSize.default,
        lg: badgeSize.lg,
      },
      shape: {
        pill: 'rounded-full [corner-shape:round]',
        rounded: 'rounded-[var(--radius-check-lg)]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      color: 'neutral',
      size: 'default',
      shape: 'pill',
    },
  },
)

type BadgeProps = Omit<ComponentProps<'span'>, 'color'> &
  VariantProps<typeof badgeVariants> & {
    /** Any CSS colour, used instead of a named `color` set. */
    tint?: string
    /** Rendered inside the badge, before or after the text. */
    icon?: ReactNode
    iconPosition?: 'start' | 'end'
    /** Render the child element instead of a `<span>`, keeping the styles. */
    asChild?: boolean
  }

function Badge({
  className,
  variant,
  color,
  size,
  shape,
  tint,
  icon,
  iconPosition = 'start',
  asChild = false,
  style,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span'

  // With `asChild` the caller owns the children entirely, so an icon prop would
  // have nowhere to go without cloning their element.
  const content =
    icon && !asChild ? (
      <>
        {iconPosition === 'start' && icon}
        {children}
        {iconPosition === 'end' && icon}
      </>
    ) : (
      children
    )

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, color, size, shape }), className)}
      style={tint ? { ...tintStyle(tint), ...style } : style}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Badge, badgeVariants }
export type { BadgeProps, ColorSet }
