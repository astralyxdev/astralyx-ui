import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * Modal state on top of the native `<dialog>` element.
 *
 * `showModal()` gives the focus trap, the inert background, Escape-to-close and
 * top-layer stacking for free — all of which a div-based modal has to
 * reimplement, usually incompletely. This owns the open state and keeps the DOM
 * element in step with it.
 */
type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  dialogRef: React.RefObject<HTMLDialogElement | null>
  ids: { title: string; description: string }
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog() {
  const context = use(DialogContext)
  if (!context) throw new Error('Must be used inside <Dialog>')
  return context
}

type DialogProviderProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function DialogProvider({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProviderProps) {
  const controlled = openProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ? openProp : uncontrolled

  const dialogRef = useRef<HTMLDialogElement>(null)
  const id = useId()
  const ids = useMemo(
    () => ({ title: `${id}-title`, description: `${id}-description` }),
    [id],
  )

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )

  // Drive the DOM element from state. `showModal` throws if already open, so
  // both calls are guarded by the element's own `open` property.
  useEffect(() => {
    const element = dialogRef.current
    if (!element) return

    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  // Escape and the close button both fire `close`; `cancel` fires for Escape
  // only. Listening to `close` keeps React state in step however it happened.
  useEffect(() => {
    const element = dialogRef.current
    if (!element) return

    const onClose = () => setOpen(false)
    element.addEventListener('close', onClose)
    return () => element.removeEventListener('close', onClose)
  }, [setOpen])

  const context = useMemo(
    () => ({ open, setOpen, dialogRef, ids }),
    [open, setOpen, ids],
  )

  return <DialogContext value={context}>{children}</DialogContext>
}
