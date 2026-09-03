import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { useMediaQuery } from '@/components/primitives/media-query'
import { cn } from '@/lib/utils'

/**
 * Text revealed as it arrives, with a caret while it is still coming.
 *
 * Reveal is driven by elapsed time rather than a per-character interval. A
 * `setInterval` per character drifts under load and queues up a backlog when
 * the tab is inactive, so a message that streamed while you were away finishes
 * by dumping a thousand characters at once. Reading the clock each frame makes
 * the reveal correct at any frame rate.
 *
 * Under `prefers-reduced-motion` the text appears complete immediately. The
 * animation carries no information the text does not, so there is nothing to
 * lose by skipping it.
 *
 * The output is a live region: a screen reader should hear the answer arrive,
 * not sit in silence until it finishes.
 */
function StreamingText({
  text,
  speed = 240,
  streaming = true,
  caret = true,
  onDone,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> & {
  text: string
  /** Characters per second. */
  speed?: number
  /** False renders the whole string at once. */
  streaming?: boolean
  caret?: boolean
  onDone?: () => void
}) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const instant = !streaming || reduced

  const [count, setCount] = useState(instant ? text.length : 0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (instant) {
      setCount(text.length)
      return
    }

    doneRef.current = false
    setCount(0)

    const started = performance.now()
    let frame = 0

    const tick = (now: number) => {
      // Derived from elapsed time, never accumulated per frame — so a dropped
      // or delayed frame catches up instead of falling behind.
      const next = Math.min(Math.floor(((now - started) / 1000) * speed), text.length)
      setCount(next)

      if (next < text.length) {
        frame = requestAnimationFrame(tick)
      } else if (!doneRef.current) {
        doneRef.current = true
        onDone?.()
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // `onDone` is deliberately not a dependency: a caller passing an inline
    // arrow would otherwise restart the stream on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, instant])

  const complete = count >= text.length

  return (
    <span
      data-slot="streaming-text"
      data-streaming={!complete || undefined}
      aria-live="polite"
      aria-busy={!complete}
      className={cn('whitespace-pre-wrap', className)}
      {...props}
    >
      {text.slice(0, count)}
      {caret && !complete && (
        <span
          aria-hidden="true"
          className="bg-foreground ms-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse motion-reduce:animate-none"
        />
      )}
    </span>
  )
}

export { StreamingText }
