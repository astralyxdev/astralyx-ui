import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A sheet that slides from the bottom and can be dragged away.
 *
 * `Sheet` covers side panels; this is the mobile gesture — a grab handle, a
 * drag that follows the finger, and a release that either snaps back or
 * dismisses.
 *
 * Built on a native `<dialog>` with `showModal()`, like the rest of the
 * overlays here, so focus containment, inerting the page and the top layer come
 * from the platform rather than from a hand-rolled trap.
 *
 * Two details make the drag feel right. Movement is applied as a transform with
 * the transition switched off while the finger is down — animating a value you
 * are also setting every frame produces lag against the pointer. And dismissal
 * is decided by velocity as well as distance, so a quick flick closes it
 * without dragging the whole height.
 */
function Drawer({
  open,
  onOpenChange,
  children,
  className,
  ...props
}: Omit<ComponentProps<'dialog'>, 'open' | 'onToggle'> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [offset, setOffset] = useState(0)
  const drag = useRef<{ startY: number; startTime: number } | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      setOffset(0)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    drag.current = { startY: event.clientY, startTime: performance.now() }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    // Downward only: dragging up should not lift the drawer off the edge.
    setOffset(Math.max(0, event.clientY - drag.current.startY))
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    event.currentTarget.releasePointerCapture(event.pointerId)

    const distance = offset
    const elapsed = performance.now() - drag.current.startTime
    const velocity = distance / Math.max(elapsed, 1)
    drag.current = null

    const height = dialogRef.current?.offsetHeight ?? 1
    // A flick counts even when it barely moved.
    if (distance > height * 0.4 || velocity > 0.5) onOpenChange(false)
    else setOffset(0)
  }

  return (
    <dialog
      ref={dialogRef}
      data-slot="drawer"
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClick={(event) => {
        // The dialog element itself is the backdrop area.
        if (event.target === dialogRef.current) onOpenChange(false)
      }}
      style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
      className={cn(
        'bg-card text-card-foreground border-border w-full max-w-none border-t',
        // The UA centres a dialog; release the other edges so it sits flush.
        'top-auto bottom-0 m-0 mt-auto max-h-[90svh] p-0',
        radius.panel,
        'rounded-b-none',
        'backdrop:bg-black/50',
        offset === 0 && 'transition-transform duration-200 ease-out motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <div
        // The grab handle. Pointer-only by design: keyboard users dismiss with
        // Escape, which the native dialog already handles.
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex touch-none justify-center py-3"
      >
        <span aria-hidden="true" className="bg-border h-1 w-10 rounded-full [corner-shape:round]" />
      </div>

      <div className="max-h-[calc(90svh-2.5rem)] overflow-y-auto px-4 pb-6">
        {children}
      </div>
    </dialog>
  )
}

function DrawerHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn('mb-3 flex flex-col gap-1', className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="drawer-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  )
}

function DrawerDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="drawer-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export { Drawer, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle }
