import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { controlSize, type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Joins controls into one segmented unit — buttons, inputs, selects, or a mix.
 *
 * Not to be confused with `Group`, which is a tray *behind* a set of cards.
 * This one welds its children edge to edge.
 *
 * Two things make that work. The inner corners are squared so only the outer
 * two stay round, and each item after the first is pulled back a pixel so the
 * two adjacent borders land on top of each other instead of stacking into a
 * 2px seam.
 *
 * The child rules reach one level deeper as well as at the top level: Select
 * and Combobox render a positioning wrapper around their trigger, so the
 * element that actually carries the radius is a button one level down.
 */
const CHILD = [
  // Stacking context per item, so a focus ring is drawn over its neighbour
  // rather than clipped behind it.
  '[&>*]:relative [&>*:focus-within]:z-10 [&>*:hover]:z-10',
].join(' ')

const HORIZONTAL = [
  '[&>*:not(:first-child)]:rounded-s-none [&>*:not(:last-child)]:rounded-e-none',
  '[&>*:not(:first-child)>button]:rounded-s-none [&>*:not(:last-child)>button]:rounded-e-none',
  '[&>*:not(:first-child)]:-ms-px',
].join(' ')

const VERTICAL = [
  '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none',
  '[&>*:not(:first-child)>button]:rounded-t-none [&>*:not(:last-child)>button]:rounded-b-none',
  '[&>*:not(:first-child)]:-mt-px',
].join(' ')

/**
 * A joined row that becomes a joined column below the breakpoint.
 *
 * The two axes are written under `max-*` and the bare breakpoint so they are
 * mutually exclusive by media query. The obvious alternative — stack by
 * default, then undo it at the breakpoint — cannot work: restoring a squared
 * corner means naming the radius the child already had, and `rounded-t-[inherit]`
 * inherits the *group's* radius, not the button's.
 *
 * Both axes carry the `>button` rules too, for the wrapper Select and Combobox
 * render around their trigger.
 */
const RESPONSIVE_ROW = {
  sm: [
    'max-sm:flex-col',
    'max-sm:[&>*:not(:first-child)]:rounded-t-none max-sm:[&>*:not(:last-child)]:rounded-b-none',
    'max-sm:[&>*:not(:first-child)>button]:rounded-t-none max-sm:[&>*:not(:last-child)>button]:rounded-b-none',
    'max-sm:[&>*:not(:first-child)]:-mt-px',
    'sm:[&>*:not(:first-child)]:rounded-s-none sm:[&>*:not(:last-child)]:rounded-e-none',
    'sm:[&>*:not(:first-child)>button]:rounded-s-none sm:[&>*:not(:last-child)>button]:rounded-e-none',
    'sm:[&>*:not(:first-child)]:-ms-px',
  ].join(' '),
  md: [
    'max-md:flex-col',
    'max-md:[&>*:not(:first-child)]:rounded-t-none max-md:[&>*:not(:last-child)]:rounded-b-none',
    'max-md:[&>*:not(:first-child)>button]:rounded-t-none max-md:[&>*:not(:last-child)>button]:rounded-b-none',
    'max-md:[&>*:not(:first-child)]:-mt-px',
    'md:[&>*:not(:first-child)]:rounded-s-none md:[&>*:not(:last-child)]:rounded-e-none',
    'md:[&>*:not(:first-child)>button]:rounded-s-none md:[&>*:not(:last-child)>button]:rounded-e-none',
    'md:[&>*:not(:first-child)]:-ms-px',
  ].join(' '),
  lg: [
    'max-lg:flex-col',
    'max-lg:[&>*:not(:first-child)]:rounded-t-none max-lg:[&>*:not(:last-child)]:rounded-b-none',
    'max-lg:[&>*:not(:first-child)>button]:rounded-t-none max-lg:[&>*:not(:last-child)>button]:rounded-b-none',
    'max-lg:[&>*:not(:first-child)]:-mt-px',
    'lg:[&>*:not(:first-child)]:rounded-s-none lg:[&>*:not(:last-child)]:rounded-e-none',
    'lg:[&>*:not(:first-child)>button]:rounded-s-none lg:[&>*:not(:last-child)>button]:rounded-e-none',
    'lg:[&>*:not(:first-child)]:-ms-px',
  ].join(' '),
} as const

const buttonGroupVariants = cva([CHILD, 'inline-flex items-stretch'].join(' '), {
  variants: {
    orientation: {
      horizontal: HORIZONTAL,
      vertical: `flex-col ${VERTICAL}`,
    },
    /** Let fields take the free space, for a field-plus-button row. */
    grow: {
      true: 'flex w-full [&>[data-slot=combobox]]:flex-1 [&>[data-slot=field]]:flex-1 [&>[data-slot=select]]:flex-1',
      false: '',
    },
  },
  defaultVariants: { orientation: 'horizontal', grow: false },
})

type ButtonGroupProps = ComponentProps<'div'> &
  VariantProps<typeof buttonGroupVariants> & {
    /**
     * Breakpoint a horizontal group becomes a row at. Defaults to `false`: a
     * pair of icon buttons is fine at any width, and stacking it would be
     * surprising. Set it for a field-and-button row, which is not.
     */
    responsive?: Responsive
  }

function ButtonGroup({
  className,
  orientation = 'horizontal',
  grow,
  responsive = false,
  ...props
}: ButtonGroupProps) {
  const stacks = orientation === 'horizontal' && responsive !== false

  return (
    <div
      // `group` rather than `toolbar`: a toolbar implies arrow-key navigation
      // between its controls, which this does not provide. These are ordinary
      // tab stops that happen to share edges.
      role="group"
      data-slot="button-group"
      data-orientation={orientation ?? 'horizontal'}
      className={cn(
        // `null`, not undefined: cva skips a variant only on an explicit null,
        // and falls back to the default for undefined — which would lay the
        // unprefixed horizontal rules underneath the responsive ones.
        buttonGroupVariants({ orientation: stacks ? null : orientation, grow }),
        stacks ? RESPONSIVE_ROW[responsive] : undefined,
        className,
      )}
      {...props}
    />
  )
}

/**
 * A non-interactive segment — a unit, a prefix, a currency symbol.
 *
 * Sized from the same scales as the controls beside it, so it lines up without
 * the caller matching heights by hand.
 *
 * `variant` has to match whatever it is welded to. A bordered segment next to a
 * filled input reads as a mistake: the group is meant to look like one control,
 * and half of it having an outline breaks that. It defaults to `secondary`,
 * which is what the fields beside it default to.
 */
const textVariants = {
  default: 'border-border bg-secondary border',
  secondary: 'bg-secondary border border-transparent',
  ghost: 'border border-transparent bg-transparent',
} as const

function ButtonGroupText({
  className,
  size = 'default',
  variant = 'secondary',
  ...props
}: ComponentProps<'div'> & {
  size?: 'sm' | 'default' | 'lg'
  variant?: keyof typeof textVariants
}) {
  const height = { sm: controlSize.sm, default: controlSize.md, lg: controlSize.lg }[size]

  return (
    <div
      data-slot="button-group-text"
      className={cn(
        'text-muted-foreground inline-flex shrink-0 items-center font-medium whitespace-nowrap',
        textVariants[variant],
        height,
        // The height scale carries a gap and an icon trim meant for buttons.
        'gap-0',
        className,
      )}
      {...props}
    />
  )
}

/** A hairline between two segments that share a fill. */
function ButtonGroupSeparator({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      data-slot="button-group-separator"
      className={cn(
        'bg-border relative z-10 self-stretch',
        orientation === 'horizontal' ? 'w-px' : 'h-px w-full',
        className,
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants }
export type { ButtonGroupProps }
