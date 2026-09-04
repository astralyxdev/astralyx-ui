import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Pause, Play, X } from 'lucide-react'
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
 * **The timer is wall-clock, and it does not use `requestAnimationFrame`.**
 * rAF does not fire at all in a hidden tab, so a story in a background tab
 * simply stops — and a counter decremented on an interval drifts instead.
 * Elapsed time is recomputed from `Date.now()` on a coarse interval, which is
 * correct whatever the interval actually did, and a CSS transition on the bar
 * makes 20fps of state look continuous.
 *
 * **It pauses on press, and on focus.** Holding to read is the gesture everyone
 * already knows. Focus matters more: a panel containing a link or a button is
 * unusable if it advances while you are tabbing through it, so any focus inside
 * the content stops the clock.
 *
 * **`prefers-reduced-motion` removes the animation, not the story.** An earlier
 * version froze the timer outright, which meant anyone with that setting on
 * opened a story that silently never advanced and said nothing about why. Now
 * the bar jumps between steps instead of gliding, and the panels still turn.
 *
 * **There is a real pause button.** Holding to pause is the expected gesture
 * but it is neither discoverable nor reachable from a keyboard, and
 * auto-advancing content has to be pausable by everyone.
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
  pauseLabel?: string
  resumeLabel?: string
  /**
   * Panel width. Stories are portrait by convention.
   *
   * Height follows from it at 9:16 unless you set one — a story is a fixed
   * shape, not a column that stretches to the window. Tying the height to the
   * viewport instead produced a 359x1163 sliver on a tall screen.
   */
  width?: number | string
  /** Panel height. Defaults to filling `maxHeight`. */
  height?: number | string
  /** Width over height. 9:16 — the shape the pattern is named for. */
  ratio?: number
  /** Caps for small windows, so the fixed box still fits. */
  maxWidth?: number | string
  maxHeight?: number | string
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
  pauseLabel = 'Pause',
  resumeLabel = 'Resume',
  width,
  height,
  ratio = 9 / 16,
  maxWidth = '92vw',
  maxHeight = '88vh',
  className,
  ...props
}: StoryProps) {
  /**
   * One dimension plus an aspect ratio, never both dimensions.
   *
   * With both set, `max-height` biting on a short window clamps the height
   * alone and squashes the shape. With a ratio, the other side follows and the
   * story stays a story.
   *
   * The default fills the available height, because on a desktop a fixed 400px
   * box floats in the middle of a large screen looking like a dialog rather
   * than a story.
   */
  const box: React.CSSProperties =
    width !== undefined
      ? { width, aspectRatio: ratio, maxWidth, maxHeight }
      : { height: height ?? maxHeight, aspectRatio: ratio, maxWidth, maxHeight }

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

  const [manuallyPaused, setManuallyPaused] = useState(false)
  const paused = held || focusInside || manuallyPaused || !autoPlay

  /**
   * The current panel's length, as a number.
   *
   * The animation effect depends on this rather than on `panels`, because an
   * array literal built in the caller's render is a new identity every time —
   * and this effect sets state on every frame. Depending on the array meant
   * tearing the loop down and rebuilding it sixty times a second, which ran the
   * story at several times real speed and then wedged it.
   */
  const panelDuration = panels[index]?.duration ?? duration

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

    const total = panelDuration
    let last = Date.now()

    const id = setInterval(() => {
      const now = Date.now()
      // Accumulates only while running, so pausing does not silently consume
      // the panel's time. Recomputed from the clock, so an interval that fired
      // late — or a tab that was throttled — cannot make it drift.
      elapsedRef.current += now - last
      last = now

      const fraction = Math.min(1, elapsedRef.current / total)
      setProgress(fraction)

      if (fraction >= 1) go(index + 1)
    }, 50)

    return () => clearInterval(id)
  }, [open, paused, index, panelDuration, go])

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
            className={cn('relative flex flex-col', className)}
            // Neither dimension can be a percentage — FocusTrap renders a
            // bare wrapper between this and the overlay, so a percentage would
            // resolve against a content-sized div and collapse the column.
            style={box}
          >
            {/* One segment per panel: filled behind, animating on the current
                one, empty ahead. The whole sequence has to be legible at a
                glance — how far in you are is the question a story answers. */}
            <div className="flex shrink-0 gap-1" aria-hidden="true">
              {panels.map((item, position) => (
                <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  <span
                    className={cn(
                      'block h-full rounded-full bg-white',
                      // 20fps of state looks continuous with a transition, and
                      // reduced motion gets the steps instead of the glide.
                      !reducedMotion && 'transition-[width] duration-100 ease-linear',
                    )}
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
              {autoPlay && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={manuallyPaused ? resumeLabel : pauseLabel}
                  className="text-white hover:bg-white/15 hover:text-white"
                  onClick={() => setManuallyPaused((current) => !current)}
                >
                  {manuallyPaused ? <Play /> : <Pause />}
                </Button>
              )}
              {paused && autoPlay && (
                <span className="text-[11px] text-white/60">{pausedLabel}</span>
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
              {/* Focus-pausing is scoped to the content, not the whole
                  column. On the column it also caught the tap zones and the
                  close button — so one tap focused a zone, `focusInside`
                  latched true, and the story never advanced again. */}
              <div
                className="h-full overflow-auto"
                onFocusCapture={() => setFocusInside(true)}
                onBlurCapture={() => setFocusInside(false)}
              >
                {panel?.content}
              </div>

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
