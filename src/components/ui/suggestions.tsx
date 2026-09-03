import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Starter prompts, offered before the first message.
 *
 * Buttons rather than a list: each one performs an action, and the pill shape
 * signals "tap me" in a way a bulleted list does not.
 */
function Suggestions({
  className,
  items,
  onSelect,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  items: string[]
  onSelect?: (prompt: string) => void
}) {
  return (
    <div
      data-slot="suggestions"
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    >
      {items.map((item) => (
        <Button
          key={item}
          size="xs"
          variant="secondary"
          onClick={() => onSelect?.(item)}
          // Long prompts must not stretch the row into one wide line.
          className="max-w-full justify-start"
        >
          <span className="truncate">{item}</span>
        </Button>
      ))}
    </div>
  )
}

export { Suggestions }
