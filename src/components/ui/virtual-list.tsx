import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

/**
 * Renders only the rows in view.
 *
 * `DataGrid` and `LogViewer` both render every row they are given, which is
 * fine until a few thousand and then stalls the main thread on every update.
 * This is the layer they can sit on.
 *
 * Fixed row height by design. Variable heights need measurement, a cache and a
 * correction pass for the scroll position when an estimate turns out wrong —
 * an order of magnitude more code, and wrong estimates make the scrollbar jump
 * under the user's hand. A fixed height keeps the maths exact.
 *
 * `overscan` renders a few rows beyond the viewport so a fast scroll does not
 * expose blank space before the next paint.
 */
function VirtualList<Item>({
  items,
  rowHeight,
  renderItem,
  overscan = 4,
  height = 400,
  onEndReached,
  endThreshold = 200,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'height'> & {
  items: Item[]
  rowHeight: number
  renderItem: (item: Item, index: number) => ReactNode
  overscan?: number
  height?: number | string
  /** Fires once per approach to the end — for infinite scrolling. */
  onEndReached?: () => void
  endThreshold?: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(0)
  const firedAt = useRef(-1)

  // Measure the viewport instead of trusting the `height` prop, which may be a
  // percentage or a clamp.
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      setViewport(entry.contentRect.height)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const total = items.length * rowHeight
  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visibleCount = Math.ceil((viewport || 0) / rowHeight) + overscan * 2
  const last = Math.min(items.length, first + visibleCount)
  const slice = items.slice(first, last)

  return (
    <div
      ref={scrollRef}
      data-slot="virtual-list"
      style={{ height }}
      onScroll={(event) => {
        const node = event.currentTarget
        setScrollTop(node.scrollTop)

        if (!onEndReached) return
        const remaining = node.scrollHeight - node.scrollTop - node.clientHeight
        // Guard by item count, so it fires once per batch rather than on
        // every scroll event while sitting near the bottom.
        if (remaining < endThreshold && firedAt.current !== items.length) {
          firedAt.current = items.length
          onEndReached()
        }
      }}
      className={cn('relative overflow-y-auto', className)}
      {...props}
    >
      {/* Spacer gives the scrollbar the full height of the list. */}
      <div style={{ height: total }} className="relative">
        <div
          style={{ transform: `translateY(${first * rowHeight}px)` }}
          className="absolute inset-x-0 top-0"
        >
          {slice.map((item, index) => (
            <div key={first + index} style={{ height: rowHeight }}>
              {renderItem(item, first + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { VirtualList }
