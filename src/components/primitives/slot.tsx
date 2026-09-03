import {
  Children,
  cloneElement,
  isValidElement,
  type AnyActionArg,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

type AnyProps = Record<string, unknown>

/**
 * Merge a parent's props onto a child element's own props.
 *
 * Event handlers are chained (child first, then parent), `className` is merged
 * through `cn`, `style` is shallow-merged, and everything else the parent sets
 * wins — except that a child's explicit value is never overwritten by
 * `undefined`.
 */
function mergeProps(parent: AnyProps, child: AnyProps): AnyProps {
  const merged: AnyProps = { ...child }

  for (const key in parent) {
    const parentValue = parent[key]
    const childValue = child[key]

    if (/^on[A-Z]/.test(key)) {
      if (typeof parentValue === 'function' && typeof childValue === 'function') {
        merged[key] = (...args: AnyActionArg) => {
          childValue(...args)
          parentValue(...args)
        }
      } else {
        merged[key] = parentValue ?? childValue
      }
      continue
    }

    if (key === 'className') {
      merged[key] = cn(parentValue as string, childValue as string)
      continue
    }

    if (key === 'style') {
      merged[key] = {
        ...(parentValue as CSSProperties),
        ...(childValue as CSSProperties),
      }
      continue
    }

    if (parentValue !== undefined) merged[key] = parentValue
  }

  return merged
}

type SlotProps = AnyProps & { children?: ReactNode }

/**
 * Render into the single child element instead of a wrapper of our own — the
 * primitive behind every `asChild` prop in the kit. React 19 treats `ref` as an
 * ordinary prop, so it merges like anything else.
 */
function Slot({ children, ...props }: SlotProps) {
  const child = Children.only(children)

  if (!isValidElement(child)) return null

  const element = child as ReactElement<AnyProps>

  return cloneElement(element, mergeProps(props, element.props))
}

export { Slot, mergeProps }
export type { SlotProps }
