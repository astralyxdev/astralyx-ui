import { useSyncExternalStore } from 'react'

/**
 * Subscribe to a media query.
 *
 * `useSyncExternalStore` rather than an effect: the value is read during the
 * first render instead of after it, so a component that branches on the
 * breakpoint does not paint the wrong layout and then correct itself.
 *
 * The server snapshot is `false` — a layout that stacks by default degrades
 * more gracefully than one that assumes room it may not have.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind's default breakpoints, so JS and CSS agree on where things change. */
export const BREAKPOINTS = {
  sm: '40rem',
  md: '48rem',
  lg: '64rem',
  xl: '80rem',
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/** True once the viewport is at or above the named breakpoint. */
export function useBreakpoint(breakpoint: Breakpoint) {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]})`)
}
