import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A bounded scrollable region.
 *
 * The scrollbar itself is styled globally in `index.css`, so this only decides
 * which axis scrolls — it exists to make that intent explicit at the call site
 * rather than to restyle anything.
 */
function ScrollArea({
  className,
  orientation = 'vertical',
  ...props
}: ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal' | 'both'
}) {
  return (
    <div
      data-slot="scroll-area"
      data-orientation={orientation}
      className={cn(
        'relative',
        orientation === 'vertical' && 'overflow-y-auto',
        orientation === 'horizontal' && 'overflow-x-auto',
        orientation === 'both' && 'overflow-auto',
        className,
      )}
      {...props}
    />
  )
}

export { ScrollArea }
