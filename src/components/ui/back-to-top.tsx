'use client'

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowUp } from 'lucide-react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A button that appears once you have scrolled, and takes you back up.
 *
 * **It finds its own scroller.** An app that scrolls the document and an app
 * whose page is a scrolling `<main>` beside a fixed rail are both normal, and
 * the component cannot know which it is in. It walks up from itself to the
 * first ancestor that actually scrolls and listens to that, so it works in
 * either without being told. `targetRef` overrides the search.
 *
 * **A scroll listener, not a sentinel.** An earlier version watched an
 * absolutely positioned marker with an `IntersectionObserver`, which is cheaper
 * per frame and quietly wrong: an absolute box resolves against the nearest
 * *positioned* ancestor, so the marker sat at the top of whatever card the
 * button happened to be rendered inside rather than at the top of the page —
 * and a button placed at the foot of a document, which is where this button
 * goes, never appeared at all. The listener here is passive and coalesced into
 * one frame, and it only sets state when the answer changes.
 *
 * **It honours `prefers-reduced-motion`.** Smooth-scrolling a long page is
 * exactly the kind of large-field motion that triggers vestibular symptoms, so
 * the behaviour drops to an instant jump when the user has asked for less
 * motion. `scroll-behavior: smooth` in CSS with no media query is the common
 * version of this bug.
 *
 * **Focus follows the scroll.** Moving the viewport without moving focus leaves
 * a keyboard user's position where it was, so the next Tab continues from the
 * bottom of the page they just left — this focuses the target, which is what
 * makes it a real skip control rather than a visual one.
 */
type BackToTopProps = Omit<ComponentProps<'button'>, 'children'> & {
  /**
   * How far down before it appears. `0` shows it immediately, which is what a
   * demo or a permanently docked control wants.
   */
  showAfter?: number
  /**
   * The element that scrolls. Defaults to the nearest scrolling ancestor, and
   * to the window when there is none.
   */
  targetRef?: React.RefObject<HTMLElement | null>
  /** Focused after scrolling. Defaults to the first heading or the body. */
  focusRef?: React.RefObject<HTMLElement | null>
  label?: string
  children?: ReactNode
  /** Fixed to the corner of the viewport. */
  fixed?: boolean
}

/** The first ancestor that can actually scroll, or the window. */
function scrollParent(node: HTMLElement | null): HTMLElement | Window {
  for (let element = node?.parentElement; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element)
    const scrolls = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
    if (scrolls && element.scrollHeight > element.clientHeight) return element
  }
  return window
}

function offsetOf(scroller: HTMLElement | Window) {
  return scroller === window
    ? window.scrollY
    : (scroller as HTMLElement).scrollTop
}

function BackToTop({
  showAfter = 400,
  targetRef,
  focusRef,
  label = 'Back to top',
  children,
  fixed = true,
  className,
  ...props
}: BackToTopProps) {
  const [visible, setVisible] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Resolved once by the effect and reused by the click handler, so the button
  // always scrolls the same box it was measuring.
  const scrollerRef = useRef<HTMLElement | Window | null>(null)

  useEffect(() => {
    const scroller = targetRef?.current ?? scrollParent(buttonRef.current)
    scrollerRef.current = scroller

    let frame = 0
    const read = () => {
      frame = 0
      setVisible(offsetOf(scroller) >= showAfter)
    }
    // Coalesced to one read per frame: a fast wheel fires far more scroll
    // events than the screen has frames to show the result in.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }

    read()
    scroller.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetRef, showAfter])

  const scrollUp = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'

    const scroller = scrollerRef.current ?? window
    scroller.scrollTo({ top: 0, behavior })

    // Without this the viewport moves and the keyboard does not.
    const target =
      focusRef?.current ??
      document.querySelector<HTMLElement>('h1') ??
      document.body
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      data-slot="back-to-top"
      data-visible={visible || undefined}
      aria-label={label}
      // Removed from the tab order while hidden — a focusable control nobody
      // can see is a trap.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={scrollUp}
      className={cn(
        'bg-background border-border flex items-center gap-2 border px-3 py-2 text-sm shadow-lg',
        radius.control,
        focusRing,
        // Rises the last few pixels as it fades in, so it reads as arriving
        // from the edge it is pinned to rather than materialising over it.
        'transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
        fixed && 'fixed end-4 bottom-4 z-40',
        className,
      )}
      {...props}
    >
      <ArrowUp aria-hidden="true" className="size-4" />
      {children}
    </button>
  )
}

export { BackToTop }
export type { BackToTopProps }
