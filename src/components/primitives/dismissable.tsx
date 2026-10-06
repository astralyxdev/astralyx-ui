'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Every open dismissable layer, oldest first.
 *
 * Layers nest — a select inside a popover, a popover inside a sheet, a date
 * picker inside a filter panel — and each one used to listen to the document
 * on its own. One Escape then closed the whole stack, and a press on an option
 * of the inner layer, which is portalled out of the outer one's DOM, counted as
 * "outside" the outer one and closed it mid-choice. Kept in one list, a layer
 * can ask whether another sits above it.
 */
type Layer = { refs: RefObject<RefObject<HTMLElement | null>[]> }
const layers: Layer[] = []

const elements = (layer: Layer) =>
  layer.refs.current
    .map((ref) => ref.current)
    .filter((element): element is HTMLElement => Boolean(element))

const nestedIn = (inner: Layer, outer: Layer) =>
  elements(inner).some((element) =>
    elements(outer).some((container) => container !== element && container.contains(element)),
  )

/**
 * `other` sits above `layer`: inside it in the DOM, or — when neither contains
 * the other, as with portalled content — opened after it.
 */
function isAbove(other: Layer, layer: Layer): boolean {
  if (other === layer) return false
  if (nestedIn(other, layer)) return true
  if (nestedIn(layer, other)) return false
  return layers.indexOf(other) > layers.indexOf(layer)
}

const isTop = (layer: Layer) => !layers.some((other) => isAbove(other, layer))

/** A press inside a layer above is never "outside" the one below it. */
function insideLayerAbove(layer: Layer, target: Node): boolean {
  return layers.some(
    (other) =>
      isAbove(other, layer) && elements(other).some((element) => element.contains(target)),
  )
}

/**
 * Close on Escape, or on a pointer press outside every given element.
 *
 * Uses `pointerdown` rather than `click`: a click fires after the press
 * completes, so a press that starts inside and drags out would close the layer
 * on release. Escape is bound on keydown at the document, so it works whether
 * focus is inside the layer or still on the trigger.
 *
 * Escape closes the topmost layer only, and is marked handled — default
 * prevented — so a native `<dialog>` underneath does not close on the same
 * key press.
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
  // The latest refs and options, read through refs so the layer keeps its
  // place in the stack across renders. Re-subscribing whenever `onDismiss` or
  // the `refs` array is a fresh value would move it to the top every time.
  const refList = useRef(refs)
  const latest = useRef({ onDismiss, closeOnEscape, closeOnOutside })
  useEffect(() => {
    refList.current = refs
    latest.current = { onDismiss, closeOnEscape, closeOnOutside }
  })

  useEffect(() => {
    if (!open) return
    const layer: Layer = { refs: refList }
    layers.push(layer)

    function onPointerDown(event: PointerEvent) {
      if (!latest.current.closeOnOutside) return
      const target = event.target as Node
      if (refList.current.some((ref) => ref.current?.contains(target))) return
      if (insideLayerAbove(layer, target)) return
      latest.current.onDismiss()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !isTop(layer)) return
      if (!latest.current.closeOnEscape) return
      event.preventDefault()
      event.stopPropagation()
      latest.current.onDismiss()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      const index = layers.indexOf(layer)
      if (index !== -1) layers.splice(index, 1)
    }
  }, [open])
}
