'use client'

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
  /** False while nothing but the dialog's own controls may close it. */
  dismissable: boolean
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
  /**
   * Whether Escape and a backdrop press may close the dialog. False refuses
   * both — for a dialog whose action is in flight, where closing it would
   * orphan the request. Its own close controls still work.
   */
  dismissable?: boolean
  children: ReactNode
}

export function DialogProvider({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  dismissable = true,
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

  // What the state says right now, for the native listeners below — they are
  // bound once and must not read a stale render.
  const openRef = useRef(open)
  const dismissableRef = useRef(dismissable)
  useEffect(() => {
    dismissableRef.current = dismissable
  }, [dismissable])
  // Bumped when the element closed on its own while the state still says
  // open, so the effect below runs again and puts it back.
  const [resync, setResync] = useState(0)

  // Drive the DOM element from state. `showModal` throws if already open, so
  // both calls are guarded by the element's own `open` property.
  useEffect(() => {
    openRef.current = open
    const element = dialogRef.current
    if (!element) return

    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open, resync])

  // The state owns open and closed, never the browser. Escape fires `cancel`,
  // which is cancelled here and turned into a request — `onOpenChange(false)` —
  // that a controlled owner may refuse by keeping `open`, and that
  // `dismissable={false}` refuses outright.
  //
  // Cancelling is not always enough: under the close-watcher rules a browser
  // may skip `cancel` on a repeated Escape and close the element anyway. So
  // `close` is watched too, and if the state still says open the dialog is
  // shown again. Without that, a controlled dialog the owner kept open would
  // be gone from the screen while every prop still said it was there.
  useEffect(() => {
    const element = dialogRef.current
    if (!element) return

    const onCancel = (event: Event) => {
      event.preventDefault()
      if (dismissableRef.current) setOpen(false)
    }
    const onClose = () => {
      if (!openRef.current || element.open) return
      if (dismissableRef.current) setOpen(false)
      setResync((count) => count + 1)
    }
    element.addEventListener('cancel', onCancel)
    element.addEventListener('close', onClose)
    return () => {
      element.removeEventListener('cancel', onCancel)
      element.removeEventListener('close', onClose)
    }
  }, [setOpen])

  const context = useMemo(
    () => ({ open, setOpen, dismissable, dialogRef, ids }),
    [open, setOpen, dismissable, ids],
  )

  return <DialogContext value={context}>{children}</DialogContext>
}
