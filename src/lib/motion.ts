'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

/**
 * The kit's motion contract.
 *
 * ---------------------------------------------------------------------------
 * Rule: motion reports state, it does not decorate.
 *
 * Every animation here answers a question the user just asked — *did my click
 * land*, *where did this panel come from*, *which way is this number moving*.
 * Nothing loops, nothing bounces, and nothing moves an element that was already
 * on screen and unchanged. If an animation would still be running when the next
 * one starts, it is too slow.
 * ---------------------------------------------------------------------------
 *
 * Composed the same way `styles.ts` is: components reach for a token rather
 * than spelling out their own timing, so the whole kit can be re-tuned from one
 * file. Durations live here twice — once as milliseconds for the JS-driven
 * tweens, once inside the class tokens for the CSS-driven ones — because
 * Tailwind reads source text and a duration built by interpolation generates no
 * CSS at all. Keep the two in step.
 *
 * Everything degrades to nothing under `prefers-reduced-motion: reduce`: the
 * class tokens are written with `motion-safe:` / `motion-reduce:` variants, and
 * the hooks jump straight to their final value.
 */

/**
 * `useLayoutEffect`, minus the server warning.
 *
 * The count-up hooks need to write their starting value before the browser
 * paints, or the first frame shows the destination and the animation reads as a
 * glitch. On the server there is no paint, so `useEffect` is the honest
 * fallback — it simply never runs.
 */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Durations, in milliseconds, for anything driven from JavaScript.
 *
 * The class tokens below use the same numbers. `fast` is a press or a colour
 * change — short enough that it reads as a response rather than an animation.
 * `count` is longer than everything else on purpose: a number that lands
 * instantly was never worth animating.
 */
export const motionDuration = {
  fast: 150,
  base: 200,
  slow: 400,
  count: 800,
} as const

/**
 * A floating layer arriving from the direction it is anchored to.
 *
 * Requires `data-side` on the same element — every layer positioned by
 * `usePopper` already has the resolved side to hand, and a menu that flipped
 * above its trigger should animate up from it, not down onto it.
 *
 * Opacity and a 4px slide only. Deliberately no scale: `usePopper` reads the
 * layer's painted width back off `getBoundingClientRect` to detect a scaling
 * ancestor, so a layer that scales itself would be measured mid-animation and
 * positioned against a size it is about to stop being.
 *
 * `animation-duration-*`, never `duration-*`. Tailwind's `duration-*` sets
 * `transition-duration`, and `transition-property` defaults to `all` — so a
 * class meant to time an *animation* silently switches on a transition for
 * every property the element has. On a popper layer that is `top` and `left`,
 * which start at 0 before the first measurement: the layer's first appearance
 * becomes a 150ms glide from the corner of the viewport, and every one after it
 * looks fine because the previous position is still in state.
 */
export const overlayIn = [
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:animation-duration-150 motion-safe:ease-out',
  'motion-safe:data-[side=top]:slide-in-from-bottom-1',
  'motion-safe:data-[side=bottom]:slide-in-from-top-1',
  'motion-safe:data-[side=left]:slide-in-from-right-1',
  'motion-safe:data-[side=right]:slide-in-from-left-1',
].join(' ')

/**
 * A layer that has no side to arrive from — a dialog body, a lightbox, an
 * inline panel that replaces what was there. Scales from 96% so it reads as
 * coming forward rather than fading up out of the page.
 */
export const enterPop =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:animation-duration-200 motion-safe:ease-out'

/**
 * The quietest entrance there is: opacity, nothing else.
 *
 * The kit's default for a component root — a card, a table, a panel, a chart —
 * so that content *arrives* instead of being there already, without any of it
 * moving. Cheap enough to wear everywhere: one composited property, one time,
 * on mount.
 *
 * Its own keyframe rather than `animate-in fade-in-0`, because that one sets
 * `transform` too and a root element is the worst possible place to grow a
 * containing block; see `ax-fade-in` in `index.css`.
 */
export const enterFade = 'motion-safe:animate-[ax-fade-in_250ms_ease-out]'

/**
 * Content arriving in a list — a row, a message, a log line, a card.
 *
 * Two pixels of travel, not twenty. A list that slides in from off-screen
 * announces itself; a list that settles the last 2px reads as having been
 * placed. Pair with `stagger()` when the items arrive together.
 */
export const enterRise =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:animation-duration-300 motion-safe:ease-out'

/**
 * A box whose size is the data — a bar, a segment, a fill, a track.
 *
 * Long enough to be read as growth rather than a repaint, and `ease-out` so the
 * value arrives decisively instead of drifting into place.
 */
export const growTransition =
  'transition-[width,height] duration-500 ease-out motion-reduce:transition-none'

/**
 * A bar, meter or segment revealed from its leading edge, once, on mount.
 *
 * Put it on the *fill* of a single-value bar, and on the *track* of a segmented
 * one — wiping each segment of a stacked bar separately opens gaps between them
 * that close as the animation ends, which reads as a layout bug rather than an
 * entrance.
 *
 * A clip, not a transform, so labels drawn on the bar stay their own width
 * throughout and nothing the element contains is distorted. It costs the
 * element its own `clip-path` for 600ms, which is the one thing to watch for.
 *
 * The wipe runs left to right, physically. In a right-to-left document a bar
 * drawn from the inline start will reveal from the wrong end; `growTransition`
 * with `useGrowIn` is the way out where that matters.
 */
export const growIn = 'motion-safe:animate-[ax-grow-x_600ms_ease-out]'

/** The same, for a column standing on a baseline. */
export const growInY = 'motion-safe:animate-[ax-grow-y_600ms_ease-out]'

/** The same, for anything drawn as an SVG arc: rings, donuts, gauges. */
export const strokeTransition =
  'transition-[stroke-dashoffset,stroke-dasharray] duration-700 ease-out motion-reduce:transition-none'

/** A needle, a thumb, a caret, an indicator that travels to its position. */
export const moveTransition =
  'transition-transform duration-300 ease-out motion-reduce:transition-none'

/**
 * Press feedback for a control.
 *
 * Split out from `interactive` in `styles.ts` so the fields that share that
 * token do not inherit it — a text input that shrinks when you click into it is
 * a bug, not a flourish.
 *
 * Carries no `transition-*` of its own, and must not: that utility is one merge
 * group, so a transition here would resolve against `interactive`'s and one of
 * the two would vanish. `interactive` already animates `transform` for exactly
 * this, and pairs with it everywhere `pressable` is used.
 */
export const pressable = 'motion-safe:active:scale-[0.97]'

/**
 * Delay one item's entrance by its position in a list.
 *
 * `backwards` fill is not optional: without it the item is fully visible during
 * its own delay and then snaps to the animation's first frame, which is worse
 * than no stagger at all.
 *
 * Capped, because a stagger is a texture and not a queue — the fortieth row of
 * a table should not wait a second and a half to exist. Past the cap everything
 * arrives together, which is what the eye expects that far down anyway.
 */
export function stagger(index: number, step = 40, max = 8): CSSProperties {
  return {
    animationDelay: `${Math.min(index, max) * step}ms`,
    animationFillMode: 'backwards',
  }
}

/** The media query, or `null` where there is no `matchMedia` to ask. */
function reducedMotionQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
}

/**
 * Whether the user has asked for less motion. Re-reads on change.
 *
 * Read once during the first render rather than in an effect: an effect runs
 * after the first paint, so someone who asked for no motion would get exactly
 * one animation before being obeyed. Nothing rendered depends on the answer at
 * that point — the tweens all start at their final value — so this cannot
 * produce a hydration mismatch.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => reducedMotionQuery()?.matches ?? false)

  useEffect(() => {
    const query = reducedMotionQuery()
    if (!query) return

    const onChange = () => setReduced(query.matches)
    onChange()

    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * The value — but only from the frame after the first paint.
 *
 * The cheap way to give a bar, an arc or a fill an *entrance* rather than only
 * a transition. Everything in the kit that draws a value already animates when
 * that value changes; what none of them did was animate the first one, because
 * the first render sets the final geometry and there is nothing to transition
 * from. Painting `from` once and swapping to `value` on the next frame turns
 * the transition that was already there into a mount animation, at the cost of
 * exactly one extra render — where tweening the number in JavaScript would cost
 * one per frame, per element, for the whole animation.
 *
 * The pre-paint value is also what a prerender writes to disk, which is the
 * right answer for the wrong-looking reason: a static HTML file has no
 * animation to play, so it should hold the state the animation starts from and
 * let the browser run it once React arrives.
 *
 * Keep `aria-valuenow` and any visible label on the real value, not this one —
 * a screen reader should not have to wait out an animation, and it will read
 * the number long before the frame that changes it.
 */
export function useGrowIn(value: number, from = 0) {
  const reduced = usePrefersReducedMotion()
  const [painted, setPainted] = useState(false)

  useEffect(() => {
    // A frame, not just an effect: the effect can be flushed inside the same
    // paint that rendered `from`, and a property that is set to its final value
    // before the browser has drawn the initial one does not transition at all.
    const frame = requestAnimationFrame(() => setPainted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return painted || reduced ? value : from
}

/** How many decimal places a number is *written* with, capped at four. */
function decimalsOf(value: number) {
  if (!Number.isFinite(value)) return 0
  const written = String(value).split('.')[1]
  return written ? Math.min(written.length, 4) : 0
}

type CountOptions = {
  /** Milliseconds. Defaults to `motionDuration.count`. */
  duration?: number
  /** Decimal places to hold on to. Defaults to however `value` is written. */
  decimals?: number
  /** Skip the tween and track `value` directly. */
  disabled?: boolean
}

/**
 * Tween a number towards its value, and return where it currently is.
 *
 * Runs on mount — counting up from zero — and again whenever the value moves,
 * always from wherever the last run got to, so a value that changes twice in
 * quick succession never jumps backwards to start again.
 *
 * The initial render returns `value`, not zero, and the tween's first frame is
 * written in a layout effect. That ordering matters for a prerendered page:
 * the HTML on disk carries the real number — which is what a crawler, a
 * text-only reader and this site's own markdown twins get — while a browser
 * with JavaScript rewinds it and counts before it paints.
 *
 * Not a spring, not an easing curve with overshoot: `1 - (1 - t)³` starts fast
 * and settles, which is how a number that is *arriving* should behave. Anything
 * that overshoots renders digits the value never had.
 */
export function useCountUp(value: number, options: CountOptions = {}) {
  const { duration = motionDuration.count, decimals, disabled = false } = options
  const reduced = usePrefersReducedMotion()
  const places = decimals ?? decimalsOf(value)
  const [shown, setShown] = useState(value)

  // Where the next run starts. Held in a ref rather than derived from `shown`
  // so an interrupted tween resumes from the frame it actually painted.
  const from = useRef(0)

  const still = disabled || reduced || !Number.isFinite(value)

  useIsomorphicLayoutEffect(() => {
    if (still) {
      from.current = value
      setShown(value)
      return
    }

    const start = from.current
    if (start === value) {
      setShown(value)
      return
    }

    const round = 10 ** places
    let frame = 0
    let began = 0

    const step = (now: number) => {
      began ||= now
      const t = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - t) ** 3
      const at = t === 1 ? value : start + (value - start) * eased

      from.current = at
      setShown(Math.round(at * round) / round)

      if (t < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, places, still])

  return shown
}

/**
 * `useCountUp`, formatted — the common case, in one call.
 *
 * Formatting has to happen inside the tween rather than around it: a caller
 * that formats the returned number loses the thousands separators on every
 * intermediate frame, so a counter crossing 1,000 flickers between grouped and
 * ungrouped and the label changes width on every frame.
 *
 * `en-US` rather than the ambient locale, deliberately. The number is rendered
 * on a server during prerender and again in a browser, and a locale that
 * disagrees between the two is a hydration mismatch that only shows up for
 * whoever has the other one set.
 */
export function useCountUpText(value: number, options: CountOptions = {}) {
  const places = options.decimals ?? decimalsOf(value)
  const count = useCountUp(value, { ...options, decimals: places })

  return count.toLocaleString('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  })
}
