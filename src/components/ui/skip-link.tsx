import type { ComponentProps } from 'react'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The first tab stop: jump straight to the main content.
 *
 * Visible only while focused, which is the whole design — it is there for
 * someone tabbing through, and invisible to everyone else.
 *
 * `sr-only` plus `focus:not-sr-only` rather than moving it off-screen with a
 * transform: an element positioned off-screen and animated back in is a
 * position change, and this kit does not move things. Appearing on focus is a
 * state change, not motion.
 *
 * The target needs `tabindex="-1"`, or clicking the link scrolls the page but
 * leaves focus on the link and the next Tab starts from the top again.
 */
function SkipLink({
  href = '#main',
  children = 'Skip to content',
  className,
  ...props
}: ComponentProps<'a'>) {
  return (
    <a
      href={href}
      data-slot="skip-link"
      className={cn(
        'sr-only',
        'focus:not-sr-only focus:bg-primary focus:text-primary-foreground focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:px-4 focus:py-2 focus:text-sm focus:font-medium',
        radius.control,
        'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}

export { SkipLink }
