import type { ComponentProps } from 'react'
import { Slot } from '@/components/primitives/slot'
import { cn } from '@/lib/utils'

/**
 * Hidden from sight, present for screen readers.
 *
 * The clip-based technique, not `display: none` or `visibility: hidden` —
 * both of those remove the element from the accessibility tree, which defeats
 * the entire purpose. It is also not `opacity: 0`, which leaves the element
 * taking up layout.
 *
 * Tailwind's `sr-only` does exactly this; the component exists so intent is
 * legible in the markup, and so `asChild` can apply it to an element that
 * already carries its own classes.
 */
function VisuallyHidden({
  className,
  asChild = false,
  ...props
}: ComponentProps<'span'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp data-slot="visually-hidden" className={cn('sr-only', className)} {...props} />
  )
}

export { VisuallyHidden }
