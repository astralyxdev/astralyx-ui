import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check, Minus } from 'lucide-react'
import { checkIconSize, checkSize, indicatorBase } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A real `<input type="checkbox">` visually replaced by a sibling box.
 *
 * Keeping the native input (screen-reader-only, not hidden) means form
 * submission, the label association, keyboard toggling and the indeterminate
 * state all come for free — a div with `role="checkbox"` would have to
 * reimplement every one of them.
 */
const boxVariants = cva(
  [
    indicatorBase,
    'peer-checked:bg-primary peer-checked:border-primary peer-checked:text-primary-foreground',
    'peer-indeterminate:bg-primary peer-indeterminate:border-primary peer-indeterminate:text-primary-foreground',
    'peer-focus-visible:border-ring peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]',
    // The tick is painted by the box, so it must not intercept the click.
    '[&_svg]:pointer-events-none',
    // `peer-*` only reaches siblings of the input, and the tick is a descendant
    // of the box — so the box carries the variant and targets the svg itself.
    '[&_svg]:opacity-0',
    'peer-checked:[&_svg]:opacity-100 peer-indeterminate:[&_svg]:opacity-100',
  ].join(' '),
  {
    variants: {
      size: {
        sm: `${checkSize.sm} ${checkIconSize.sm}`,
        default: `${checkSize.default} ${checkIconSize.default}`,
        lg: `${checkSize.lg} ${checkIconSize.lg}`,
      },
      error: { true: 'border-destructive', false: '' },
    },
    defaultVariants: { size: 'default', error: false },
  },
)

type CheckboxProps = Omit<ComponentProps<'input'>, 'size' | 'type'> &
  VariantProps<typeof boxVariants> & {
    /** Text beside the box; also makes the whole row clickable. */
    label?: ReactNode
    description?: ReactNode
    /** Visually a dash, and `indeterminate` to assistive tech. */
    indeterminate?: boolean
    /** `start` puts the label before the box, for a settings row. */
    labelPosition?: 'start' | 'end'
    containerClassName?: string
  }

function Checkbox({
  className,
  containerClassName,
  size,
  error,
  label,
  description,
  indeterminate = false,
  labelPosition = 'end',
  ref,
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // `indeterminate` exists only as a DOM property — there is no attribute.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

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
      data-slot="checkbox"
      className={cn(
        'group flex w-fit items-start gap-2.5 select-none',
        props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        containerClassName,
      )}
    >
      <input
        type="checkbox"
        ref={(node) => {
          inputRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        aria-invalid={error || undefined}
        className="peer sr-only"
        {...props}
      />

      {labelPosition === 'start' && text}

      <span className={cn(boxVariants({ size, error }), className)}>
        {indeterminate ? <Minus /> : <Check />}
      </span>

      {labelPosition === 'end' && text}
    </label>
  )
}

export { Checkbox, boxVariants as checkboxVariants }
export type { CheckboxProps }
