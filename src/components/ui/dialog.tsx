import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { DialogProvider, useDialog } from '@/components/primitives/dialog'
import { Slot } from '@/components/primitives/slot'
import { Button } from '@/components/ui/button'
import { cardPadding, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A modal window, built on the native `<dialog>` element.
 *
 * That gets the focus trap, background inerting, Escape handling and top-layer
 * stacking from the platform rather than from JavaScript — the parts a hand-made
 * modal usually gets subtly wrong.
 */
function Dialog({
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

function DialogTrigger({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="dialog-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

function DialogClose({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="dialog-close"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      {...props}
    />
  )
}

type DialogContentProps = ComponentProps<'dialog'> & {
  /** Show the corner close button. */
  showClose?: boolean
  /** Clicking the backdrop closes the dialog. */
  dismissable?: boolean
  size?: 'sm' | 'default' | 'lg' | 'xl'
  /** Accessible name for the close button. */
  closeLabel?: string
}

const WIDTH = {
  sm: 'max-w-sm',
  default: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

function DialogContent({
  className,
  children,
  showClose = true,
  dismissable = true,
  size = 'default',
  closeLabel = 'Close',
  ...props
}: DialogContentProps) {
  const { dialogRef, setOpen, ids } = useDialog()

  return (
    <dialog
      ref={dialogRef}
      data-slot="dialog"
      aria-labelledby={ids.title}
      // The backdrop is part of the dialog's own box, so a press is "outside"
      // only when it lands beyond the element's rectangle.
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
      className={cn(
        surface,
        radius.panel,
        'text-card-foreground m-auto w-[calc(100vw-2rem)] p-0',
        WIDTH[size],
        'backdrop:bg-transparent',
        className,
      )}
      {...props}
    >
      <div className="relative flex flex-col">
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

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pe-10', cardPadding.lg, className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  const { ids } = useDialog()

  return (
    <h2
      id={ids.title}
      data-slot="dialog-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: ComponentProps<'p'>) {
  const { ids } = useDialog()

  return (
    <p
      id={ids.description}
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('px-6 pb-6 text-sm', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'border-border flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end',
        cardPadding.lg,
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
