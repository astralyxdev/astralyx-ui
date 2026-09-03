import type { ComponentProps, ReactNode } from 'react'
import { DialogProvider, useDialog } from '@/components/primitives/dialog'
import { Slot } from '@/components/primitives/slot'
import { Button } from '@/components/ui/button'
import { cardPadding, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A modal that interrupts to confirm something consequential.
 *
 * Distinct from Dialog in three ways that matter: `role="alertdialog"`, no
 * backdrop dismissal and no corner close — a destructive confirmation should
 * take a deliberate answer, not an accidental click outside. Escape still works,
 * because trapping someone in a modal is worse.
 */
function AlertDialog({
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

function AlertDialogTrigger({
  asChild = false,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { setOpen } = useDialog()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="alert-dialog-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(true)
      }}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: ComponentProps<'dialog'>) {
  const { dialogRef, ids } = useDialog()

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      data-slot="alert-dialog"
      aria-labelledby={ids.title}
      aria-describedby={ids.description}
      className={cn(
        surface,
        radius.panel,
        'text-card-foreground m-auto w-[calc(100vw-2rem)] max-w-md p-0',
        'backdrop:bg-transparent',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col">{children}</div>
    </dialog>
  )
}

function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2', cardPadding.lg, className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  const { ids } = useDialog()

  return (
    <h2
      id={ids.title}
      data-slot="alert-dialog-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }: ComponentProps<'p'>) {
  const { ids } = useDialog()

  return (
    <p
      id={ids.description}
      data-slot="alert-dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'border-border flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end',
        cardPadding.lg,
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { setOpen } = useDialog()

  return (
    <Button
      variant="secondary"
      data-slot="alert-dialog-cancel"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      className={className}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  onClick,
  ...props
}: ComponentProps<typeof Button>) {
  const { setOpen } = useDialog()

  return (
    <Button
      data-slot="alert-dialog-action"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(false)
      }}
      className={className}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}
