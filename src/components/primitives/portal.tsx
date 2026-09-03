import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children into another part of the document.
 *
 * Mounting is deferred by one effect rather than portalling during render.
 * `document.body` does not exist while rendering on the server, and reading it
 * during the first client render would produce markup that does not match what
 * the server sent.
 *
 * Most overlays in this kit do not need this: Dialog and Sheet use a native
 * `<dialog>`, which the browser already promotes to the top layer. Portal is
 * for the cases that cannot — an element that must escape an ancestor's
 * `overflow: hidden` or stacking context without becoming modal.
 */
function Portal({
  children,
  container,
}: {
  children: ReactNode
  /** Defaults to `document.body`. */
  container?: Element | null
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null
  return createPortal(children, container ?? document.body)
}

export { Portal }
