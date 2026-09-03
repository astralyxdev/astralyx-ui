import { useRef, type ComponentProps, type KeyboardEvent } from 'react'
import { tabbableWithin } from '@/components/primitives/focus-trap'
import { cn } from '@/lib/utils'

/**
 * A group of controls that arrow keys move between.
 *
 * This is the role `ButtonGroup` deliberately does not claim. `role="toolbar"`
 * is a promise: the group is one tab stop and arrow keys move within it. Making
 * that claim without implementing it is worse than not claiming it, since a
 * screen-reader user is told to use arrows that do nothing.
 *
 * Focus roves over whatever is currently focusable, recomputed on each key.
 * Toolbars gain and lose buttons as selection changes, and a list cached on
 * mount sends focus to a control that is no longer there.
 */
function Toolbar({
  orientation = 'horizontal',
  className,
  onKeyDown,
  ...props
}: ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  const ref = useRef<HTMLDivElement>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return

    const forward = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
    const back = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
    const keys = [forward, back, 'Home', 'End']
    if (!keys.includes(event.key)) return

    const root = ref.current
    if (!root) return
    const items = tabbableWithin(root)
    if (items.length === 0) return

    const current = items.indexOf(document.activeElement as HTMLElement)
    event.preventDefault()

    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === forward
            ? (current + 1 + items.length) % items.length
            : (current - 1 + items.length) % items.length

    items[next]?.focus()
  }

  return (
    <div
      ref={ref}
      role="toolbar"
      data-slot="toolbar"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-1',
        orientation === 'vertical' && 'flex-col items-stretch',
        className,
      )}
      {...props}
    />
  )
}

/** A hairline between groups of controls. */
function ToolbarSeparator({
  orientation = 'vertical',
  className,
  ...props
}: ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-slot="toolbar-separator"
      className={cn(
        'bg-border shrink-0',
        orientation === 'vertical' ? 'mx-1 h-5 w-px self-center' : 'my-1 h-px w-full',
        className,
      )}
      {...props}
    />
  )
}

export { Toolbar, ToolbarSeparator }
