import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { interactive, switchSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A checkbox under the hood, presented as a track and thumb.
 *
 * `role="switch"` on the native input keeps form submission and keyboard
 * toggling while announcing the right thing. The thumb travels by `translate`,
 * which is a transform — but it is the control's *state*, not a hover flourish,
 * so the kit's no-motion rule does not apply.
 */
const trackVariants = cva(
  [
    'relative inline-flex shrink-0 items-center',
    'bg-secondary border-border border',
    'rounded-full [corner-shape:round]',
    interactive,
    'peer-checked:bg-primary peer-checked:border-primary',
    'peer-focus-visible:border-ring peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]',
    'peer-disabled:pointer-events-none peer-disabled:opacity-50',
    // `peer-*` reaches siblings only, and the thumb is a descendant — so the
    // track owns these variants and targets the thumb through a child selector.
    'peer-checked:[&>span]:translate-x-[var(--thumb)]',
    'peer-checked:[&>span]:bg-primary-foreground',
  ].join(' '),
  {
    variants: {
      size: {
        sm: switchSize.sm,
        default: switchSize.default,
        lg: switchSize.lg,
      },
    },
    defaultVariants: { size: 'default' },
  },
)

/**
 * The thumb pairs with whatever token the track is painted in, so it always has
 * contrast: `--muted-foreground` on the subtle off track, `--primary-foreground`
 * on the solid on track. It cannot use `--background` — that is near-black in
 * dark mode, so the thumb would read as a black dot, and near-white in light
 * mode, where it would vanish into the off track. With no shadows in the kit,
 * colour is the only thing separating the thumb from its track.
 */
const THUMB = [
  'pointer-events-none block rounded-full [corner-shape:round]',
  'bg-muted-foreground size-[var(--thumb)]',
  'transition-[transform,background-color] duration-150 ease-out',
  'motion-reduce:transition-none',
].join(' ')

type SwitchProps = Omit<ComponentProps<'input'>, 'size' | 'type'> &
  VariantProps<typeof trackVariants> & {
    label?: ReactNode
    description?: ReactNode
    /**
     * Which side the label sits on.
     *
     * `start` is what a settings row wants: label left, control right. Without
     * it, `justify-between` on the container spreads a control-then-label row
     * and strands the text against the far edge.
     */
    labelPosition?: 'start' | 'end'
    containerClassName?: string
  }

function Switch({
  className,
  containerClassName,
  size,
  label,
  description,
  labelPosition = 'end',
  ...props
}: SwitchProps) {
  const text = (label || description) && (
    <span className="grid gap-0.5 leading-tight">
      {label && <span className="text-sm font-medium">{label}</span>}
      {description && (
        <span className="text-muted-foreground text-xs">{description}</span>
      )}
    </span>
  )

  return (
    <label
      data-slot="switch"
      className={cn(
        'flex w-fit items-center gap-2.5 select-none',
        props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        containerClassName,
      )}
    >
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />

      {/* Safe to put the label here: `peer-*` compiles to the general sibling
          combinator, which matches the track wherever it follows the input. */}
      {labelPosition === 'start' && text}

      <span className={cn(trackVariants({ size }), className)}>
        <span className={THUMB} />
      </span>

      {labelPosition === 'end' && text}
    </label>
  )
}

export { Switch, trackVariants as switchVariants }
export type { SwitchProps }
