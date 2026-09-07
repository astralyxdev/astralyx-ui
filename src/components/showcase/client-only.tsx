'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Renders its children in the browser and nowhere else.
 *
 * A live preview is the one thing on a docs page with no reason to exist in the
 * exported HTML: it is a component to click, not text to read, and the source
 * beside it already says what it is. Rendering all of them anyway put 2.7 MB of
 * markup in the home page and about 700 kB in every component page — weight a
 * crawler has to download to reach a few thousand characters that matter.
 *
 * `children` is a function so the tree is never even built on the server. Taking
 * elements would mean constructing all 343 previews to throw them away.
 *
 * `minHeight` reserves the space the preview will take, so arriving does not
 * shove the page around.
 */
export function ClientOnly({
  children,
  minHeight,
}: {
  children: () => ReactNode
  minHeight?: number
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div style={minHeight ? { minHeight } : undefined} aria-hidden="true" />

  return <>{children()}</>
}
