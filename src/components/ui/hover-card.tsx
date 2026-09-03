import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
import { usePopper, type Align, type Side } from '@/components/primitives/popper'
import { menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A preview card shown on hover — richer than a tooltip, and pointer-only.
 *
 * There is a close delay as well as an open delay, so the pointer can travel
 * from the trigger into the card without it vanishing on the way.
 *
 * Deliberately not keyboard-triggered: the content is supplementary, and a
 * keyboard user reaches the same information by following the link. A Popover is
 * the right component when the content must be reachable.
 */
function HoverCard({
  children,
  content,
  side = 'bottom',
  align = 'center',
  openDelay = 300,
  closeDelay = 200,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'content'> & {
  children: ReactElement<Record<string, unknown>>
  content: ReactNode
  side?: Side
  align?: Align
  openDelay?: number
  closeDelay?: number
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLElement>(null)
  const floatingRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)

  const { style, side: resolved } = usePopper({
    open,
    anchorRef,
    floatingRef,
    side,
    align,
    offset: 8,
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  const schedule = (next: boolean, delay: number) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), delay)
  }

  if (!isValidElement(children)) return children

  // Passing the ref object as a prop is React 19's ref-as-prop, not a read of
  // `.current` during render — the rule cannot tell the two apart.
  // oxlint-disable-next-line react/refs
  const trigger = cloneElement(children, {
    ref: anchorRef,
    onPointerEnter: () => schedule(true, openDelay),
    onPointerLeave: () => schedule(false, closeDelay),
  })

  return (
    <>
      {trigger}
      {open && (
        <div
          ref={floatingRef}
          data-slot="hover-card"
          data-side={resolved}
          style={style}
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={() => schedule(false, closeDelay)}
          className={cn(menuSurface, radius.surface, 'w-64 p-4 text-sm', className)}
          {...props}
        >
          {content}
        </div>
      )}
    </>
  )
}

export { HoverCard }
