import { useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { Field } from '@/components/primitives/field'
import { fieldBase, fieldInput, fieldSize, focusRingInset } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Built on the headless `Field` primitive, so clicking the padding or an icon
 * focuses the control rather than doing nothing.
 *
 * Deliberately monochrome: an input is a surface you type on, not an accent, so
 * it uses only the theme's own background, border and foreground tokens and has
 * no `color` or `tint`. It also takes no focus ring and no border change — the
 * caret is the focus indicator. `error` is the single exception: the one state
 * that earns a colour.
 */
const inputVariants = cva(fieldBase, {
  variants: {
    variant: {
      /** Bordered field; the border only changes on focus and on error. */
      default: 'border-border bg-background border',
      /** Filled field, no border. */
      secondary: 'bg-secondary border border-transparent',
      /** No chrome at rest; fills in on hover. */
      ghost: 'hover:bg-accent border border-transparent bg-transparent',
    },
    size: {
      xs: fieldSize.xs,
      sm: fieldSize.sm,
      default: fieldSize.md,
      lg: fieldSize.lg,
      xl: fieldSize.xl,
    },
    // Declared after `variant` so it also wins the focus border — an errored
    // field stays red while you type in it.
    error: {
      true: 'border-destructive focus-within:border-destructive',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
    error: false,
  },
})

type InputProps = Omit<ComponentProps<'input'>, 'size' | 'style'> &
  VariantProps<typeof inputVariants> & {
    /** Rendered inside the field, before or after the text. */
    icon?: ReactNode
    iconPosition?: 'start' | 'end'
    /** Show a clear button on the trailing side once the field has content. */
    clearable?: boolean
    /** Fires after the clear button empties the field. */
    onClear?: () => void
    clearLabel?: string
    /** Styles the wrapper; `className` styles the `<input>` itself. */
    containerClassName?: string
    style?: ComponentProps<'div'>['style']
  }

function Input({
  className,
  containerClassName,
  variant,
  size,
  error,
  icon,
  iconPosition = 'start',
  clearable = false,
  onClear,
  clearLabel = 'Clear',
  style,
  onChange,
  ...props
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Controlled callers own the value; uncontrolled ones need it tracked here so
  // the clear button knows whether there is anything to clear.
  const controlled = props.value !== undefined
  const [typed, setTyped] = useState(
    () => String(props.defaultValue ?? '') !== '',
  )
  const hasValue = controlled ? String(props.value ?? '') !== '' : typed

  const showClear =
    clearable && hasValue && !props.disabled && !props.readOnly

  function clear() {
    const element = inputRef.current
    if (!element) return

    // Assigning `.value` directly is invisible to React. Going through the
    // prototype setter and dispatching `input` makes React's own onChange fire,
    // so a controlled parent updates instead of silently reverting the field.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set

    setter?.call(element, '')
    element.dispatchEvent(new Event('input', { bubbles: true }))

    setTyped(false)
    element.focus()
    onClear?.()
  }

  const slot = icon ? <Field.Slot side={iconPosition}>{icon}</Field.Slot> : null

  return (
    <Field.Root
      data-slot="field"
      className={cn(
        inputVariants({ variant, size, error }),
        containerClassName,
      )}
      style={style}
    >
      {iconPosition === 'start' && slot}

      <Field.Control
        ref={inputRef}
        aria-invalid={error || undefined}
        className={cn(fieldInput, className)}
        onChange={(event) => {
          if (!controlled) setTyped(event.target.value !== '')
          onChange?.(event)
        }}
        {...props}
      />

      {iconPosition === 'end' && slot}

      {showClear && (
        <button
          type="button"
          aria-label={clearLabel}
          // Keep focus in the field: a press here must not blur it first.
          onMouseDown={(event) => event.preventDefault()}
          onClick={clear}
          className={cn(
            'text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer rounded-full transition-colors',
            focusRingInset,
          )}
        >
          <X />
        </button>
      )}
    </Field.Root>
  )
}

export { Input, inputVariants }
export type { InputProps }
