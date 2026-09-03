import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@/components/primitives/slot'
import {
  buttonText,
  colorSet,
  controlBase,
  controlSize,
  tintStyle,
  type ColorSet,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Every variant reads the `--ui-*` set, so `color` restyles all of them at once.
 *
 * Press is colour only, like hover, and it lands instantly: `active:duration-0`
 * skips the transition on the way down so the button answers the click, while
 * the release still eases back. Nothing moves, resizes or gains elevation.
 */
const SOLID = 'bg-[var(--ui)] text-[var(--ui-fg)] hover:bg-[var(--ui-hover)]'
const SOFT = 'bg-[var(--ui-soft)] text-[var(--ui-soft-fg)] hover:bg-[var(--ui-soft-hover)]'

/**
 * Press continues past hover in the same direction, mixed with `--press-shade`
 * so one declaration is correct in both themes and for every colour set.
 */
const SOLID_PRESS =
  'active:bg-[color-mix(in_oklab,var(--ui-hover),var(--press-shade)_14%)]'
const SOFT_PRESS =
  'active:bg-[color-mix(in_oklab,var(--ui-soft-hover),var(--press-shade)_10%)]'

const buttonVariants = cva(
  [
    controlBase,
    // Focus ring picks up the active colour set instead of a fixed accent.
    'focus-visible:ring-[color-mix(in_oklab,var(--ui),transparent_55%)]',
    'focus-visible:border-[var(--ui)]',
  ].join(' '),
  {
    variants: {
      variant: {
        /** Solid fill in the current colour set — neutral unless `color` says otherwise. */
        default: `${SOLID} ${SOLID_PRESS}`,
        /** Identical to `default`, named for when the colour is the point. */
        colored: `${SOLID} ${SOLID_PRESS}`,
        /** Tinted fill: low-contrast background, saturated text. */
        secondary: `${SOFT} ${SOFT_PRESS}`,
        /** Stroke only — never a fill. The border matches the text exactly. */
        outline:
          'border bg-transparent border-[var(--ui-soft-fg)] text-[var(--ui-soft-fg)] hover:border-[var(--ui-soft-fg-hover)] hover:text-[var(--ui-soft-fg-hover)] active:bg-[var(--ui-soft)]',
        ghost: `text-[var(--ui-soft-fg)] hover:bg-[var(--ui-soft)] ${SOFT_PRESS}`,
        link: 'text-[var(--ui-soft-fg)] underline-offset-4 hover:underline active:opacity-70',
      },
      color: colorSet,
      // `buttonText` trails `controlSize` so twMerge takes the smaller label
      // size. Icon-only sizes carry no text at all.
      size: {
        xs: `${controlSize.xs} ${buttonText.xs}`,
        sm: `${controlSize.sm} ${buttonText.sm}`,
        default: `${controlSize.md} ${buttonText.md}`,
        lg: `${controlSize.lg} ${buttonText.lg}`,
        xl: `${controlSize.xl} ${buttonText.xl}`,
        'icon-xs': controlSize.iconXs,
        'icon-sm': controlSize.iconSm,
        icon: controlSize.icon,
        'icon-lg': controlSize.iconLg,
        'icon-xl': controlSize.iconXl,
      },
    },
    defaultVariants: {
      variant: 'default',
      color: 'neutral',
      size: 'default',
    },
  },
)

type ButtonProps = Omit<ComponentProps<'button'>, 'color'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element instead of a `<button>`, keeping the styles. */
    asChild?: boolean
    /**
     * Any CSS colour, used instead of a named `color` set. Fill, text, tint and
     * border are all derived from it, and every variant keeps working.
     */
    tint?: string
  }

function Button({
  className,
  variant,
  color,
  size,
  asChild = false,
  tint,
  style,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size, className }))}
      style={tint ? { ...tintStyle(tint), ...style } : style}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonProps, ColorSet }
