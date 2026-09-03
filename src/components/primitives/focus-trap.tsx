import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

/**
 * Keeps Tab inside a container while it is active.
 *
 * Only for surfaces that cannot use a native `<dialog>` — a tour step, a
 * non-modal panel that still owns the keyboard. `showModal()` traps focus and
 * inerts the rest of the page for free, and a hand-rolled trap is strictly
 * worse than it, so Dialog and Sheet stay on the native element.
 *
 * The tabbable set is recomputed on each Tab rather than cached on mount,
 * because the content behind it changes: a step that reveals a button would
 * otherwise skip it, and one that removes the element focus is on would trap
 * the user against a node that no longer exists.
 */
const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function tabbableWithin(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (node) =>
      !node.hasAttribute('inert') &&
      node.offsetWidth + node.offsetHeight > 0 &&
      getComputedStyle(node).visibility !== 'hidden',
  )
}

function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active = true,
  { restoreFocus = true }: { restoreFocus?: boolean } = {},
) {
  useEffect(() => {
    const root = ref.current
    if (!active || !root) return

    const previous = document.activeElement as HTMLElement | null

    // Focus the first thing inside, or the container, so the next Tab starts
    // from within the trap rather than from wherever focus happened to be.
    const initial = tabbableWithin(root)[0] ?? root
    initial.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = tabbableWithin(root)
      if (nodes.length === 0) {
        event.preventDefault()
        return
      }

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const current = document.activeElement

      if (event.shiftKey && (current === first || !root.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (restoreFocus) previous?.focus?.({ preventScroll: true })
    }
  }, [ref, active, restoreFocus])
}

/** Component form, for when a ref is inconvenient. */
function FocusTrap({
  active = true,
  restoreFocus = true,
  children,
}: {
  active?: boolean
  restoreFocus?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, active, { restoreFocus })

  return (
    <div ref={ref} tabIndex={-1} className="outline-none">
      {children}
    </div>
  )
}

export { FocusTrap, useFocusTrap, tabbableWithin }
