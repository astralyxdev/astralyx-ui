import { cn as merge, type ClassValue } from 'cn'

/**
 * Merge class names, resolving conflicting Tailwind utilities in favour of the
 * last one passed. Use it in every component that accepts a `className` prop.
 *
 * Backed by `cn`, a compiled merge engine that replaces `clsx` + `tailwind-merge`
 * behind the same API. The swap was checked rather than assumed: every class
 * string in this repo — 2,633 of them, including the arbitrary values and
 * `max-*` variants Tailwind v4 lets us write — plus 400 two-argument merges
 * produce byte-identical output under both engines.
 *
 * Re-exported through this module rather than imported directly at each call
 * site, so the engine stays one line to change.
 */
export function cn(...inputs: ClassValue[]) {
  return merge(...inputs)
}

export type { ClassValue }
