import {
  useCallback,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two images stacked, with a handle that wipes between them.
 *
 * The honest way to show a before and after. Side-by-side thumbnails make the
 * reader do the diffing from memory and lose every small change; a wipe puts
 * the two states in the same pixels, so the difference is the only thing that
 * moves.
 *
 * The overlay is clipped with `inset()` rather than resized, which matters:
 * a resized image re-lays-out and re-samples on every pointer move, so a subtle
 * difference gets buried under scaling artefacts and the drag janks. Clipping
 * moves a rectangle over an image that never changes size.
 *
 * The handle is an `<input type="range">` in disguise. It looks like a divider,
 * but it is a real slider, so arrow keys, Home and End all work and it announces
 * itself properly — none of which is true of the `div` with a pointer handler
 * that this component usually is.
 */
type CompareSliderProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  /** Rendered underneath, revealed on the trailing side. */
  after: ReactNode
  /** Rendered on top, clipped to the handle's position. */
  before: ReactNode
  /** 0-100. Controlled when paired with onValueChange. */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** Width over height. Both layers fill the box. */
  ratio?: number
  beforeLabel?: ReactNode
  afterLabel?: ReactNode
  /** Accessible name for the slider itself. */
  label?: string
  /** Arrow-key step, in percent. */
  step?: number
}

function CompareSlider({
  before,
  after,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  ratio = 16 / 9,
  beforeLabel,
  afterLabel,
  label = 'Compare before and after',
  step = 1,
  className,
  ...props
}: CompareSliderProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const position = controlled ? valueProp : uncontrolled
  const frameRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const set = useCallback(
    (next: number) => {
      const clamped = Math.min(100, Math.max(0, next))
      if (!controlled) setUncontrolled(clamped)
      onValueChange?.(clamped)
    },
    [controlled, onValueChange],
  )

  /** Dragging anywhere on the image moves the handle, not just on the grip. */
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const frame = frameRef.current
    if (!frame) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const box = frame.getBoundingClientRect()
    set(((event.clientX - box.left) / box.width) * 100)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const frame = frameRef.current
    if (!frame) return
    const box = frame.getBoundingClientRect()
    set(((event.clientX - box.left) / box.width) * 100)
  }

  return (
    <div
      data-slot="compare-slider"
      className={cn('relative overflow-hidden select-none', surface, radius.surface, className)}
      style={{ aspectRatio: ratio }}
      {...props}
    >
      <div
        ref={frameRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) =>
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      >
        <div className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&>*]:h-full [&>*]:w-full">
          {after}
        </div>

        {/* Clipped, not resized — the image keeps its size, a rectangle moves
            over it, so nothing re-samples while you drag. */}
        <div
          className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&>*]:h-full [&>*]:w-full"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {before}
        </div>

        {beforeLabel && (
          <span className="bg-background/85 text-foreground absolute start-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
            {beforeLabel}
          </span>
        )}
        {afterLabel && (
          <span className="bg-background/85 text-foreground absolute end-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
            {afterLabel}
          </span>
        )}

        <div
          aria-hidden="true"
          className="bg-background pointer-events-none absolute inset-y-0 w-0.5"
          style={{ insetInlineStart: `calc(${position}% - 1px)` }}
        >
          <span className="bg-background border-border absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm">
            <span className="text-muted-foreground text-xs">‹›</span>
          </span>
        </div>
      </div>

      {/* The real control. Transparent and stretched over the divider, so the
          visible handle above is decoration and this is what everything —
          pointer, keyboard, assistive tech — actually operates. */}
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={step}
        value={position}
        aria-label={label}
        aria-valuetext={`${Math.round(position)}%`}
        onChange={(event) => set(Number(event.target.value))}
        className={cn(
          'absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent',
          'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
          '[&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:opacity-0',
          '[&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0',
          radius.surface,
        )}
      />
    </div>
  )
}

export { CompareSlider }
export type { CompareSliderProps }
