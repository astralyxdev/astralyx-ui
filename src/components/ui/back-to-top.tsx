import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowUp } from 'lucide-react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A button that appears once you have scrolled, and takes you back up.
 *
 * **Visibility is driven by a sentinel, not a scroll handler.** An
 * `IntersectionObserver` watching an element near the top of the page fires
 * twice — when it leaves and when it returns — where a scroll listener runs on
 * every frame of every scroll, on the main thread, for the entire life of the
 * page, to compute a boolean. On a long document that is the difference between
 * nothing and a measurable jank budget.
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
  /** How far down before it appears. */
  showAfter?: number
  /** Scrolled instead of the window. Pass a ref to a scroll container. */
  targetRef?: React.RefObject<HTMLElement | null>
  /** Focused after scrolling. Defaults to the first heading or the body. */
  focusRef?: React.RefObject<HTMLElement | null>
  label?: string
  children?: ReactNode
  /** Fixed to the corner of the viewport. */
  fixed?: boolean
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
  const sentinelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    // Two callbacks for the life of the page, rather than one per frame.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { root: targetRef?.current ?? null, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [targetRef])

  const scrollUp = () => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth'
    const scroller = targetRef?.current
    if (scroller) scroller.scrollTo({ top: 0, behavior })
    else window.scrollTo({ top: 0, behavior })

    // Without this the viewport moves and the keyboard does not.
    const target =
      focusRef?.current ??
      document.querySelector<HTMLElement>('h1') ??
      document.body
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }

  return (
    <>
      {/* Watched, never seen: sits at the offset that decides visibility. */}
      <span
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 block"
        style={{ height: showAfter }}
      />

      <button
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
          'transition-opacity duration-200 motion-reduce:transition-none',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
          fixed && 'fixed end-4 bottom-4 z-40',
          className,
        )}
        {...props}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
        {children}
      </button>
    </>
  )
}

export { BackToTop }
export type { BackToTopProps }
