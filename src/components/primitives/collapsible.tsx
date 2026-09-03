import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Animate a panel between zero and its natural height.
 *
 * `height: auto` cannot be transitioned, so the open height has to be measured
 * and applied as a pixel value.
 *
 * The first measurement is synchronous, in a layout effect, and seeds state
 * before the browser paints. Deferring it to `requestAnimationFrame` looks
 * equivalent and is not: a panel that starts open then has one frame at zero
 * height, and any observer callback arriving in that window cancels the pending
 * frame and reschedules — so a panel rendered open could sit collapsed
 * indefinitely while still reporting `aria-expanded="true"`.
 *
 * A ResizeObserver keeps the value honest afterwards, when content loads late
 * or reflows while open. Those updates stay on a frame, since they are
 * reactions to layout rather than the initial paint.
 */
export function useCollapsibleHeight(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const [height, setHeight] = useState(0)
  const raf = useRef(0)

  // Seeds the open height before paint, so a panel that mounts open is never
  // rendered at zero.
  useLayoutEffect(() => {
    const element = ref.current
    if (element) setHeight(element.scrollHeight)
  }, [ref, open])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        // Re-read rather than closing over a stale value: the observer fires
        // precisely because the size changed.
        setHeight(element.scrollHeight)
      })
    })
    observer.observe(element)

    return () => {
      cancelAnimationFrame(raf.current)
      observer.disconnect()
    }
  }, [ref])

  return open ? height : 0
}
