import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Pause, X } from 'lucide-react'
import { Portal } from '@/components/primitives/portal'
import { FocusTrap } from '@/components/primitives/focus-trap'
import { Button } from '@/components/ui/button'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A full-screen sequence of panels over a darkened page — the stories pattern.
 *
 * It is a dialog underneath: same overlay, same focus trap, same Escape, same
 * scroll lock. What makes it a story rather than a modal is that it **advances
 * on its own**, and everything below follows from that.
 *
 * **The timer is wall-clock, not a tick count.** A `setInterval` that
 * decrements a counter drifts, and browsers throttle intervals in background
 * tabs — so a story left in another tab races through every panel and is
 * finished when you come back. Progress is recomputed from `Date.now()` on each
 * animation frame instead, which survives throttling and a suspended tab.
 *
 * **It pauses on press, and on focus.** Holding to read is the gesture everyone
 * already knows. Focus matters more: a panel containing a link or a button is
 * unusable if it advances while you are tabbing through it, so any focus inside
 * the content stops the clock.
 *
 * **It pauses for `prefers-reduced-motion`.** An auto-advancing carousel is
 * exactly what that setting is asking not to happen, so the timer starts
 * stopped and the viewer moves by tap or arrow key.
 *
 * Panels are `ReactNode`, so a story panel is not limited to an image — a chart,
 * a form, a changelog entry all work.
 */
export type StoryPanel = {
  id: string
  content: ReactNode
  /** Milliseconds. Falls back to the story-level `duration`. */
  duration?: number
}

type StoryProps = Omit<ComponentProps<'div'>, 'content' | 'onSelect'> & {
  open: boolean
  onOpenChange: (open: boolean) => void
  panels: StoryPanel[]
  /** Panel to start on. Controlled when paired with `onIndexChange`. */
  index?: number
  onIndexChange?: (index: number) => void
  /** Default panel duration. */
  duration?: number
  /** Advance automatically. Off makes it a plain panel viewer. */
  autoPlay?: boolean
  /** Fires after the last panel finishes. Defaults to closing. */
  onFinish?: () => void
  /** Header slot — an avatar, a name, a timestamp. */
  header?: ReactNode
  closeLabel?: string
  previousLabel?: string
  nextLabel?: string
  pausedLabel?: string
  /** Width of the panel column. Stories are portrait by convention. */
  width?: number | string
}

function Story({
  open,
  onOpenChange,
  panels,
  index: indexProp,
  onIndexChange,
  duration = 5000,
  autoPlay = true,
  onFinish,
  header,
  closeLabel = 'Close',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pausedLabel = 'Paused',
  width = 420,
  className,
  ...props
}: StoryProps) {
  const controlled = indexProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(0)
  const index = controlled ? indexProp : uncontrolled

  const [progress, setProgress] = useState(0)
  // How far into the current panel we are, in milliseconds. A ref because the
  // animation loop reads it to resume after a pause, and a state read there
  // would either restart the loop every frame or capture a stale value.
  const elapsedRef = useRef(0)
  const [held, setHeld] = useState(false)
  const [focusInside, setFocusInside] = useState(false)

  // The system setting is read once per open rather than at module scope, so a
  // viewer who changes it mid-session gets the new behaviour next time.
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (!open) return
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [open])

  const paused = held || focusInside || reducedMotion || !autoPlay

  const go = useCallback(
    (next: number) => {
      if (next >= panels.length) {
        if (onFinish) onFinish()
        else onOpenChange(false)
        return
      }
      const clamped = Math.max(0, next)
      if (!controlled) setUncontrolled(clamped)
      onIndexChange?.(clamped)
      elapsedRef.current = 0
      setProgress(0)
    },
    [controlled, onFinish, onIndexChange, onOpenChange, panels.length],
  )

  // Reset to the first panel each time it opens, unless the caller drives it.
  useEffect(() => {
    if (!open || controlled) return
    setUncontrolled(0)
    elapsedRef.current = 0
    setProgress(0)
  }, [open, controlled])

  /**
   * Wall-clock progress.
   *
   * `elapsed` accumulates only while running, so a pause does not silently
   * consume the panel's time — the classic bug in a story that decrements a
   * counter on an interval.
   */
  useEffect(() => {
    if (!open || paused) return

    const total = panels[index]?.duration ?? duration
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      // Accumulates only while running, so pausing does not silently consume
      // the panel's time — the classic bug in a story built on setInterval.
      elapsedRef.current += now - last
      last = now

      const fraction = Math.min(1, elapsedRef.current / total)
      setProgress(fraction)

      if (fraction >= 1) go(index + 1)
      else frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [open, paused, index, duration, panels, go])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
      if (event.key === 'ArrowRight') go(index + 1)
      if (event.key === 'ArrowLeft') go(index - 1)
    }

    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while a full-screen layer is up.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, index, go, onOpenChange])

  if (!open) return null

  const panel = panels[index]

  return (
    <Portal>
      <div
        data-slot="story"
        role="dialog"
        aria-modal="true"
        aria-label="Story"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        onPointerDown={(event) => {
          // A press on the backdrop closes; a press on the panel column does
          // not, and is handled by the tap zones inside it.
          if (event.target === event.currentTarget) onOpenChange(false)
        }}
        {...props}
      >
        <FocusTrap>
          <div
            // Sized from the viewport, not `h-full`. A percentage height
            // resolves against the parent box, and FocusTrap renders a
            // wrapper between this and the overlay — so `h-full` measured
            // against a content-sized div and the whole column collapsed.
            className={cn('relative flex h-[88vh] w-full flex-col', className)}
            style={{ maxWidth: width }}
            onFocusCapture={() => setFocusInside(true)}
            onBlurCapture={() => setFocusInside(false)}
          >
            {/* One segment per panel: filled behind, animating on the current
                one, empty ahead. The whole sequence has to be legible at a
                glance — how far in you are is the question a story answers. */}
            <div className="flex shrink-0 gap-1" aria-hidden="true">
              {panels.map((item, position) => (
                <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{
                      width:
                        position < index ? '100%' : position === index ? `${progress * 100}%` : '0%',
                    }}
                  />
                </span>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2 py-3 text-white">
              <div className="min-w-0 flex-1">{header}</div>
              {paused && autoPlay && !reducedMotion && (
                <span className="flex items-center gap-1 text-[11px] text-white/70">
                  <Pause className="size-3" aria-hidden="true" />
                  {pausedLabel}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={closeLabel}
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => onOpenChange(false)}
              >
                <X />
              </Button>
            </div>

            <div
              className={cn(
                'relative min-h-0 flex-1 overflow-hidden bg-neutral-950 text-white',
                radius.panel,
              )}
              // Hold to pause — the gesture everyone already knows from the
              // apps this pattern comes from.
              onPointerDown={() => setHeld(true)}
              onPointerUp={() => setHeld(false)}
              onPointerLeave={() => setHeld(false)}
            >
              <div className="h-full overflow-auto">{panel?.content}</div>

              {/* Tap zones sit above the content but below anything focusable
                  in it, so a button inside a panel still takes its own click.
                  They are real buttons, so the sequence is keyboard- and
                  screen-reader-navigable rather than pointer-only. */}
              <button
                type="button"
                aria-label={previousLabel}
                onClick={() => go(index - 1)}
                className={cn('absolute inset-y-0 start-0 w-1/3 cursor-default', focusRing)}
              />
              <button
                type="button"
                aria-label={nextLabel}
                onClick={() => go(index + 1)}
                className={cn('absolute inset-y-0 end-0 w-1/3 cursor-default', focusRing)}
              />
            </div>
          </div>
        </FocusTrap>
      </div>
    </Portal>
  )
}

export { Story }
export type { StoryProps }
