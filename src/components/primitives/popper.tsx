import { useCallback, useEffect, useState, type RefObject } from 'react'

/**
 * Position a floating layer against an anchor, without a positioning library.
 *
 * `position: fixed` is deliberate — it takes the layer out of every ancestor's
 * overflow, so a menu inside a scrolling panel is not clipped by it. The cost is
 * that the position has to be recomputed on scroll and resize, which is what the
 * listeners below do.
 *
 * Collision handling flips to the opposite side when the preferred one does not
 * fit, then clamps along the cross axis so the layer stays on screen.
 */
export type Side = 'top' | 'right' | 'bottom' | 'left'
export type Align = 'start' | 'center' | 'end'

type PopperOptions = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  floatingRef: RefObject<HTMLElement | null>
  side?: Side
  align?: Align
  /** Gap between anchor and layer, in px. */
  offset?: number
  /** Keep at least this much room to the viewport edge. */
  padding?: number
  /** Stretch the layer to the anchor's width — for select and combobox menus. */
  matchAnchorWidth?: boolean
  /**
   * Sides to try, in order, when the preferred one does not fit.
   *
   * Defaults to the opposite side, which is right for a panel hanging off a
   * trigger. A submenu wants a longer chain — right, then left, then above —
   * because a cascading menu near the corner of the viewport can run out of
   * room on both sides.
   */
  fallbackSides?: Side[]
}

export type PopperState = {
  style: React.CSSProperties
  side: Side
}

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

function place(
  anchor: DOMRect,
  layer: { width: number; height: number },
  side: Side,
  align: Align,
  offset: number,
) {
  const vertical = side === 'top' || side === 'bottom'

  const main =
    side === 'bottom'
      ? anchor.bottom + offset
      : side === 'top'
        ? anchor.top - layer.height - offset
        : side === 'right'
          ? anchor.right + offset
          : anchor.left - layer.width - offset

  const size = vertical ? layer.width : layer.height
  const start = vertical ? anchor.left : anchor.top
  const extent = vertical ? anchor.width : anchor.height

  const cross =
    align === 'start'
      ? start
      : align === 'end'
        ? start + extent - size
        : start + extent / 2 - size / 2

  return vertical ? { top: main, left: cross } : { top: cross, left: main }
}

function fits(
  position: { top: number; left: number },
  layer: { width: number; height: number },
  padding: number,
) {
  return (
    position.top >= padding &&
    position.left >= padding &&
    position.top + layer.height <= window.innerHeight - padding &&
    position.left + layer.width <= window.innerWidth - padding
  )
}

/**
 * Where a `position: fixed` element's coordinates are actually measured from.
 *
 * Normally the viewport — which is why every number above can be a viewport
 * number. But a `transform`, `filter` or `perspective` on any ancestor makes
 * *that element* the containing block instead, and the layer lands at the
 * ancestor's origin plus our viewport offset, which can be an entire screen
 * away. `NodeCanvas` is exactly this shape: its node layer is one transformed
 * div, so a Select or a Popover inside a node was positioned off-canvas.
 *
 * Returns the origin to subtract. `null` means the viewport, the common case,
 * where the numbers are already right and nothing is adjusted at all.
 */
function fixedOrigin(element: HTMLElement) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (
      style.transform !== 'none' ||
      style.filter !== 'none' ||
      style.perspective !== 'none' ||
      style.contain.includes('paint')
    ) {
      // The containing block is the padding box, so a border on that ancestor
      // shifts the origin by its own width.
      const box = parent.getBoundingClientRect()
      return {
        top: box.top + parseFloat(style.borderTopWidth),
        left: box.left + parseFloat(style.borderLeftWidth),
      }
    }
  }
  return null
}

export function usePopper({
  open,
  anchorRef,
  floatingRef,
  side = 'bottom',
  align = 'center',
  offset = 6,
  padding = 8,
  matchAnchorWidth = false,
  fallbackSides,
}: PopperOptions): PopperState {
  // `fallbackSides` is normally a literal array, so a new identity arrives on
  // every render. Comparing its contents keeps the callback stable without
  // asking every caller to memoise the array.
  const fallbackKey = fallbackSides?.join() ?? ''
  const [state, setState] = useState<PopperState>({
    // Hidden until measured, or the layer flashes at 0,0 on first paint.
    style: { position: 'fixed', top: 0, left: 0, visibility: 'hidden' },
    side,
  })

  const update = useCallback(() => {
    const anchor = anchorRef.current
    const floating = floatingRef.current
    if (!anchor || !floating) return

    const anchorRect = anchor.getBoundingClientRect()

    // Painted size, not layout size. The two are the same everywhere except
    // under a scaling ancestor, and every comparison below is against the
    // viewport — which is painted space, the space `anchorRect` is already in.
    const floatingRect = floating.getBoundingClientRect()
    const layer = { width: floatingRect.width, height: floatingRect.height }

    // How much that ancestor scales us by, read off the element itself: the
    // transformed ancestor is often a zero-size positioned div, so its own box
    // cannot be measured, but this ratio always can.
    const scaleX = floating.offsetWidth ? floatingRect.width / floating.offsetWidth : 1
    const scaleY = floating.offsetHeight ? floatingRect.height / floating.offsetHeight : 1

    let resolved = side
    let position = place(anchorRect, layer, side, align, offset)

    if (!fits(position, layer, padding)) {
      // First side that fits wins; if none do, the clamp below keeps the
      // preferred placement on screen rather than leaving it half outside.
      for (const candidate of fallbackSides ?? [OPPOSITE[side]]) {
        const next = place(anchorRect, layer, candidate, align, offset)
        if (fits(next, layer, padding)) {
          resolved = candidate
          position = next
          break
        }
      }
    }

    // Clamp whatever side won, so a layer wider than the gap still stays on
    // screen rather than running off the edge.
    const top = Math.min(
      Math.max(position.top, padding),
      Math.max(padding, window.innerHeight - layer.height - padding),
    )
    const left = Math.min(
      Math.max(position.left, padding),
      Math.max(padding, window.innerWidth - layer.width - padding),
    )

    // Everything above is a viewport number. Convert to the space the layer is
    // actually positioned in — the same numbers when that is the viewport.
    const origin = fixedOrigin(floating)

    setState({
      side: resolved,
      style: {
        position: 'fixed',
        top: origin ? (top - origin.top) / scaleY : top,
        left: origin ? (left - origin.left) / scaleX : left,
        visibility: 'visible',
        // Divided too: a width the anchor's painted width, once the ancestor
        // scales it, is that width again.
        ...(matchAnchorWidth ? { width: anchorRect.width / scaleX } : null),
        maxHeight: origin
          ? (window.innerHeight - padding * 2) / scaleY
          : `calc(100vh - ${padding * 2}px)`,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    anchorRef,
    floatingRef,
    side,
    align,
    offset,
    padding,
    matchAnchorWidth,
    fallbackKey,
  ])

  useEffect(() => {
    if (!open) return

    update()

    // `true` for capture: catches scrolling in any ancestor, not just the page.
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)

    const observer = new ResizeObserver(update)
    if (floatingRef.current) observer.observe(floatingRef.current)
    if (anchorRef.current) observer.observe(anchorRef.current)

    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [open, update, anchorRef, floatingRef])

  return state
}
