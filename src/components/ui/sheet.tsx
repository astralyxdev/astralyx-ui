import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { DialogProvider, useDialog } from '@/components/primitives/dialog'
import { Slot } from '@/components/primitives/slot'
import { Button } from '@/components/ui/button'
import { cardPadding } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A panel that slides in from an edge — the same native `<dialog>` machinery as
 * Dialog, pinned to one side instead of centred.
 *
 * The entrance translates, which the kit's motion rule otherwise forbids. That
 * rule is about hover and press feedback; a panel arriving from an edge needs to
 * show where it came from, or it reads as a flash. It is disabled entirely under
 * `prefers-reduced-motion`.
 */
type Side = 'right' | 'left' | 'top' | 'bottom'

function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <DialogProvider
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      {children}
    </DialogProvider>
  )
}

function SheetTrigger({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="sheet-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

/*
 * Each side pins two edges and explicitly releases the opposite one.
 *
 * The `auto` is not redundant: the user-agent stylesheet for `<dialog>` sets
 * both `inset-inline-start` and `inset-inline-end` to 0. Setting only `end-0`
 * leaves the start inset in place, and with a fixed width the box resolves
 * against the start edge — a right sheet silently opens on the left.
 */
const SIDE = {
  right: 'inset-y-0 end-0 start-auto h-dvh max-h-dvh rounded-s-3xl',
  left: 'inset-y-0 start-0 end-auto h-dvh max-h-dvh rounded-e-3xl',
  top: 'inset-x-0 top-0 bottom-auto max-h-[80dvh] w-full rounded-b-3xl',
  bottom: 'inset-x-0 bottom-0 top-auto max-h-[80dvh] w-full rounded-t-3xl',
}

/** Sides that take a width; the other two take a height. */
const HORIZONTAL = new Set<Side>(['right', 'left'])

function SheetContent({
  className,
  children,
  side = 'right',
  showClose = true,
  dismissable = true,
  width,
  height,
  style,
  closeLabel = 'Close',
  ...props
}: ComponentProps<'dialog'> & {
  side?: Side
  showClose?: boolean
  dismissable?: boolean
  /** Accessible name for the close button. */
  closeLabel?: string
  /** Any CSS length. Applies to a left or right sheet. */
  width?: string
  /** Any CSS length. Applies to a top or bottom sheet. */
  height?: string
}) {
  const { dialogRef, setOpen, ids } = useDialog()
  const horizontal = HORIZONTAL.has(side)

  const size = horizontal
    ? { width: width ?? 'min(24rem, 100vw - 2rem)' }
    : height
      ? { height }
      : undefined

  return (
    <dialog
      ref={dialogRef}
      data-slot="sheet"
      data-side={side}
      aria-labelledby={ids.title}
      onClick={(event) => {
        if (!dismissable || event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        if (!inside) setOpen(false)
      }}
      // `m-0` overrides the UA's centring margin; the SIDE classes pin it.
      // No border: the sheet meets the viewport edge on three sides, so an
      // outline would only draw a line down the middle of the screen.
      style={{ ...size, ...style }}
      className={cn(
        'bg-card text-card-foreground fixed m-0 max-w-none border-0 p-0',
        'backdrop:bg-transparent',
        SIDE[side],
        className,
      )}
      {...props}
    >
      <div className="relative flex h-full flex-col overflow-auto">
        {children}
        {showClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute end-3 top-3"
          >
            <X />
          </Button>
        )}
      </div>
    </dialog>
  )
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        'border-border flex flex-col gap-1.5 border-b pe-10',
        cardPadding.lg,
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: ComponentProps<'h2'>) {
  const { ids } = useDialog()

  return (
    <h2
      id={ids.title}
      data-slot="sheet-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('flex-1 overflow-auto p-6 text-sm', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'border-border flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end',
        cardPadding.lg,
        className,
      )}
      {...props}
    />
  )
}

function SheetClose({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="sheet-close"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
export type { Side as SheetSide }
