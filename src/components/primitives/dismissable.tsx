import { useEffect, type RefObject } from 'react'

/**
 * Close on Escape, or on a pointer press outside every given element.
 *
 * Uses `pointerdown` rather than `click`: a click fires after the press
 * completes, so a press that starts inside and drags out would close the layer
 * on release. Escape is bound on keydown at the document, so it works whether
 * focus is inside the layer or still on the trigger.
 */
export function useDismissable({
  open,
  onDismiss,
  refs,
  closeOnEscape = true,
  closeOnOutside = true,
}: {
  open: boolean
  onDismiss: () => void
  /** Presses inside any of these are not "outside". */
  refs: RefObject<HTMLElement | null>[]
  closeOnEscape?: boolean
  closeOnOutside?: boolean
}) {
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!closeOnOutside) return
      const target = event.target as Node
      if (refs.some((ref) => ref.current?.contains(target))) return
      onDismiss()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!closeOnEscape || event.key !== 'Escape') return
      event.stopPropagation()
      onDismiss()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
    // `refs` is a fresh array each render; its contents are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss, closeOnEscape, closeOnOutside])
}
