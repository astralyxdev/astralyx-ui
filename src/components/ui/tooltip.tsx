import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
import { usePopper, type Align, type Side } from '@/components/primitives/popper'
import { cn } from '@/lib/utils'

/**
 * A short hint shown on hover or focus.
 *
 * Focus opens it without a delay — a keyboard user has already committed, and
 * making them wait is just latency. Pointer hover waits, so sweeping across a
 * toolbar does not fire a row of tooltips.
 *
 * The trigger is cloned rather than wrapped, so the tooltip adds no element to
 * the layout and cannot break a flex or grid parent.
 */
function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delay = 400,
  offset = 6,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'content'> & {
  children: ReactElement<Record<string, unknown>>
  content: ReactNode
  side?: Side
  align?: Align
  delay?: number
  offset?: number
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLElement>(null)
  const floatingRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const id = useId()

  const { style, side: resolved } = usePopper({
    open,
    anchorRef,
    floatingRef,
    side,
    align,
    offset,
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  function show(immediate = false) {
    clearTimeout(timer.current)
    if (immediate) return setOpen(true)
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }

  function hide() {
    clearTimeout(timer.current)
    setOpen(false)
  }

  // Escape must dismiss a tooltip that focus opened, per the ARIA practices.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!isValidElement(children)) return children

  // Passing the ref object as a prop is React 19's ref-as-prop, not a read of
  // `.current` during render — the rule cannot tell the two apart.
  // oxlint-disable-next-line react/refs
  const trigger = cloneElement(children, {
    ref: anchorRef,
    'aria-describedby': open ? id : undefined,
    onPointerEnter: () => show(),
    onPointerLeave: hide,
    onFocus: () => show(true),
    onBlur: hide,
  })

  return (
    <>
      {trigger}
      {open && (
        <div
          ref={floatingRef}
          id={id}
          role="tooltip"
          data-slot="tooltip"
          data-side={resolved}
          style={style}
          className={cn(
            'bg-foreground text-background pointer-events-none z-50 max-w-64 rounded-lg px-2.5 py-1.5 text-xs font-medium',
            className,
          )}
          {...props}
        >
          {content}
        </div>
      )}
    </>
  )
}

export { Tooltip }
