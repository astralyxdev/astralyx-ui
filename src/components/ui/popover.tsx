import {
  createContext,
  use,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper, type Align, type Side } from '@/components/primitives/popper'
import { Slot } from '@/components/primitives/slot'
import { menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/** Rich content anchored to a trigger, dismissed by Escape or an outside press. */
type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

function usePopover() {
  const context = use(PopoverContext)
  if (!context) throw new Error('Must be used inside <Popover>')
  return context
}

function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const controlled = openProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ? openProp : uncontrolled

  const anchorRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const context = useMemo<PopoverContextValue>(
    () => ({
      open,
      anchorRef,
      contentRef,
      setOpen: (next) => {
        if (!controlled) setUncontrolled(next)
        onOpenChange?.(next)
      },
    }),
    [open, controlled, onOpenChange],
  )

  return <PopoverContext value={context}>{children}</PopoverContext>
}

function PopoverTrigger({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { open, setOpen, anchorRef } = usePopover()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      // The anchor ref is typed for any element, since `asChild` can make this
      // an anchor, a div, anything — the cast keeps that generality.
      ref={anchorRef as React.Ref<HTMLButtonElement>}
      data-slot="popover-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      {...props}
    />
  )
}

function PopoverContent({
  className,
  side = 'bottom',
  align = 'center',
  offset = 6,
  ...props
}: ComponentProps<'div'> & {
  side?: Side
  align?: Align
  offset?: number
}) {
  const { open, setOpen, anchorRef, contentRef } = usePopover()

  const { style, side: resolved } = usePopper({
    open,
    anchorRef,
    floatingRef: contentRef,
    side,
    align,
    offset,
  })

  useDismissable({
    open,
    onDismiss: () => setOpen(false),
    refs: [anchorRef, contentRef],
  })

  if (!open) return null

  return (
    <div
      ref={contentRef}
      role="dialog"
      data-slot="popover-content"
      data-side={resolved}
      style={style}
      className={cn(menuSurface, radius.surface, 'w-72 p-4 text-sm', className)}
      {...props}
    />
  )
}

export { Popover, PopoverContent, PopoverTrigger, usePopover }
