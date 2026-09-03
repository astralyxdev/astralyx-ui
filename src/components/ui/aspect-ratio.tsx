import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Hold a box at a fixed ratio while its width is fluid.
 *
 * Modern `aspect-ratio` makes the old padding-top trick unnecessary; this exists
 * so the ratio is a prop rather than an inline style at every call site.
 */
function AspectRatio({
  className,
  ratio = 16 / 9,
  style,
  ...props
}: ComponentProps<'div'> & { ratio?: number }) {
  return (
    <div
      data-slot="aspect-ratio"
      className={cn('w-full overflow-hidden', className)}
      style={{ aspectRatio: ratio, ...style }}
      {...props}
    />
  )
}

export { AspectRatio }
