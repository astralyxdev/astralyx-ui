import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { GripVertical } from 'lucide-react'
import { useBreakpoint } from '@/components/primitives/media-query'
import { focusRing, type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two panels with a draggable divider between them.
 *
 * Sizes are percentages, so the split survives a container resize. Pointer
 * capture is what makes the drag reliable — without it, moving faster than the
 * browser repaints drops the pointer outside the handle and the drag stops.
 *
 * The handle is also a real slider: arrow keys move it, which is the only way a
 * keyboard user can resize at all.
 */
function Resizable({
  handleLabel = 'Resize panels',
  className,
  orientation = 'horizontal',
  defaultSize = 50,
  minSize = 15,
  maxSize = 85,
  onResize,
  responsive = 'md',
  children,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'onResize'> & {
  orientation?: 'horizontal' | 'vertical'
  /** Percentage taken by the first panel. */
  defaultSize?: number
  minSize?: number
  maxSize?: number
  onResize?: (size: number) => void
  /**
   * Breakpoint a horizontal split stays side by side at. Below it the panels
   * stack, because two columns on a phone give each about 180px.
   *
   * Unlike the other responsive components this cannot be done in CSS: the
   * pointer maths, the arrow keys and the ARIA orientation all depend on which
   * axis is being dragged, so the orientation has to genuinely change.
   */
  responsive?: Responsive
  /** Accessible name for the drag handle. */
  handleLabel?: string
  children: [ReactNode, ReactNode]
}) {
  const wide = useBreakpoint(responsive === false ? 'sm' : responsive)
  const vertical =
    orientation === 'vertical' || (responsive !== false && !wide)

  const [size, setSize] = useState(defaultSize)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const apply = useCallback(
    (next: number) => {
      const clamped = Math.min(maxSize, Math.max(minSize, next))
      setSize(clamped)
      onResize?.(clamped)
    },
    [minSize, maxSize, onResize],
  )

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const ratio = vertical
        ? (event.clientY - rect.top) / rect.height
        : (event.clientX - rect.left) / rect.width
      apply(ratio * 100)
    },
    [vertical, apply],
  )

  useEffect(() => {
    const stop = () => {
      dragging.current = false
      document.body.style.userSelect = ''
    }
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', stop)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', stop)
      stop()
    }
  }, [onPointerMove])

  const step = (delta: number) => apply(size + delta)

  return (
    <div
      ref={containerRef}
      data-slot="resizable"
      className={cn('flex w-full', vertical ? 'flex-col' : 'flex-row', className)}
      {...props}
    >
      {/* Each panel is a flex column, so a single child can take `flex-1` and
          fill it. `height: 100%` inside a panel would depend on the parent's
          height being definite, which it is not while the split is being
          dragged. */}
      <div
        style={{ flexBasis: `${size}%` }}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
      >
        {children[0]}
      </div>

      <div
        role="separator"
        tabIndex={0}
        aria-orientation={vertical ? 'horizontal' : 'vertical'}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        aria-label={handleLabel}
        onPointerDown={(event) => {
          event.preventDefault()
          dragging.current = true
          // Keeps events coming to this element even when the pointer outruns
          // it, which is what makes a fast drag not fall off the handle.
          event.currentTarget.setPointerCapture(event.pointerId)
          document.body.style.userSelect = 'none'
        }}
        onKeyDown={(event) => {
          const back = vertical ? 'ArrowUp' : 'ArrowLeft'
          const forward = vertical ? 'ArrowDown' : 'ArrowRight'
          if (event.key === back) {
            event.preventDefault()
            step(event.shiftKey ? -10 : -2)
          } else if (event.key === forward) {
            event.preventDefault()
            step(event.shiftKey ? 10 : 2)
          } else if (event.key === 'Home') {
            event.preventDefault()
            apply(minSize)
          } else if (event.key === 'End') {
            event.preventDefault()
            apply(maxSize)
          }
        }}
        className={cn(
          'bg-border hover:bg-[var(--border-active)] group relative flex shrink-0 items-center justify-center transition-colors duration-150 ease-out motion-reduce:transition-none',
          focusRing,
          // `self-stretch` rather than `h-full`: the handle is a flex child, so
          // stretching fills the cross axis whether or not the container's
          // height is definite. `h-full` collapses the line to nothing when it
          // is not.
          vertical
            ? 'h-px w-full cursor-row-resize'
            : 'w-px cursor-col-resize self-stretch',
        )}
      >
        <span
          className={cn(
            'bg-border group-hover:bg-[var(--border-active)] text-muted-foreground absolute grid place-items-center rounded-sm transition-colors duration-150 ease-out motion-reduce:transition-none',
            vertical ? 'h-3 w-6' : 'h-6 w-3',
          )}
        >
          <GripVertical className={cn('size-3', vertical && 'rotate-90')} />
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children[1]}
      </div>
    </div>
  )
}

export { Resizable }
