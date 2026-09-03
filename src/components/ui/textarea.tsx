import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { fieldBase, fieldInput } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The multi-line sibling of Input, and monochrome for the same reason.
 *
 * It styles the `<textarea>` directly rather than wrapping it: there is no icon
 * slot to place and no padding to click past, so a wrapper would add nothing.
 * Padding follows the same rule as a field — the leading side is the vertical
 * inset plus 4px — with the vertical inset applied literally, since height here
 * is content-driven rather than fixed.
 */
const textareaVariants = cva(
  [fieldBase, 'items-stretch', fieldInput, 'block'].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border bg-background border',
        secondary: 'bg-secondary border border-transparent',
        ghost: 'hover:bg-accent border border-transparent bg-transparent',
      },
      size: {
        sm: 'min-h-16 py-1.5 ps-2.5 pe-1.5 text-sm rounded-[var(--radius-control-sm)]',
        default:
          'min-h-20 py-2 ps-3 pe-2 text-sm rounded-[var(--radius-control-md)]',
        lg: 'min-h-24 py-2.5 ps-3.5 pe-2.5 text-sm rounded-[var(--radius-control-lg)]',
      },
      // The native grip is never drawn — see `[data-slot='textarea']` in
      // index.css. Dragging the edge still works where the browser allows it.
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        both: 'resize',
      },
      error: {
        true: 'border-destructive focus-within:border-destructive',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      resize: 'none',
      error: false,
    },
  },
)

type TextareaProps = Omit<ComponentProps<'textarea'>, 'size'> &
  VariantProps<typeof textareaVariants> & {
    /** Grow with the content instead of scrolling. Forces `resize="none"`. */
    autoResize?: boolean
  }

function Textarea({
  className,
  variant,
  size,
  resize,
  error,
  autoResize = false,
  value,
  onChange,
  ref,
  ...props
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null)

  const fit = useCallback(() => {
    const element = innerRef.current
    if (!element || !autoResize) return

    // Collapse first: scrollHeight only shrinks once the box is smaller than
    // its content, so measuring without this makes the field grow-only.
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [autoResize])

  // Layout effect, not effect: resizing after paint shows a one-frame jump.
  // Runs on mount and whenever a controlled value changes underneath us.
  useLayoutEffect(fit, [fit, value])

  return (
    <textarea
      data-slot="textarea"
      ref={(node) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      aria-invalid={error || undefined}
      value={value}
      onChange={(event) => {
        onChange?.(event)
        // Uncontrolled fields never change `value`, so measure here too.
        if (!onChange || value === undefined) fit()
      }}
      className={cn(
        textareaVariants({
          variant,
          size,
          resize: autoResize ? 'none' : resize,
          error,
        }),
        autoResize && 'overflow-hidden',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
export type { TextareaProps }
