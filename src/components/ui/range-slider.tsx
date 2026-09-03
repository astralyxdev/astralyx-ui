import {
  useCallback,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { focusRing, sliderSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two thumbs over one track, for a minimum and maximum.
 *
 * `Slider` is a restyled native `input[type=range]`, which has exactly one
 * thumb by construction — a range cannot be built from it, so this is a custom
 * control with the ARIA and keyboard behaviour written out.
 *
 * Track and thumb come from the shared `sliderSize` scale, which sets
 * `--slider-track` and `--slider-thumb` — so a range slider and a plain one of
 * the same size line up exactly.
 *
 * Both thumbs are real buttons with `role="slider"`, so each is a tab stop with
 * its own value and its own bounds. A single element reporting two numbers has
 * no way to be announced or operated.
 *
 * The thumbs can cross: dragging the low one past the high one swaps which is
 * which rather than stopping dead at the other. Clamping is the more common
 * implementation and it feels broken — the pointer keeps moving while the thumb
 * stays put.
 */
type RangeValue = [number, number]

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_FORMAT_VALUE: (value: number) => string = (value: number) => String(value)

function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value: valueProp,
  defaultValue = [25, 75],
  onValueChange,
  onValueCommit,
  disabled = false,
  size = 'default',
  label,
  formatValue = DEFAULT_FORMAT_VALUE,
  showValues = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  min?: number
  max?: number
  step?: number
  value?: RangeValue
  defaultValue?: RangeValue
  onValueChange?: (value: RangeValue) => void
  /** Fires once on release, for anything expensive. */
  onValueCommit?: (value: RangeValue) => void
  disabled?: boolean
  size?: keyof typeof sliderSize
  label?: string
  formatValue?: (value: number) => string
  showValues?: boolean
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<RangeValue>(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<0 | 1 | null>(null)
  const id = useId()

  const [low, high] = value
  const span = max - min || 1
  const percent = (v: number) => ((v - min) / span) * 100

  const clamp = useCallback(
    (raw: number) => {
      const snapped = Math.round((raw - min) / step) * step + min
      return Math.min(max, Math.max(min, Number(snapped.toFixed(6))))
    },
    [min, max, step],
  )

  const commit = useCallback(
    (next: RangeValue, release = false) => {
      // Sorted on write, so a crossed drag simply becomes the other thumb
      // instead of jamming against its neighbour.
      const sorted: RangeValue = next[0] <= next[1] ? next : [next[1], next[0]]
      if (!controlled) setUncontrolled(sorted)
      onValueChange?.(sorted)
      if (release) onValueCommit?.(sorted)
    },
    [controlled, onValueChange, onValueCommit],
  )

  function valueFromPointer(clientX: number) {
    const track = trackRef.current
    if (!track) return min
    const rect = track.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    // Right-to-left reverses the mapping; the track box does not.
    const adjusted = getComputedStyle(track).direction === 'rtl' ? 1 - ratio : ratio
    return clamp(min + adjusted * span)
  }

  function onPointerDown(index: 0 | 1) {
    return (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return
      dragging.current = index
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (dragging.current === null) return
    const next = valueFromPointer(event.clientX)
    const updated: RangeValue = [...value] as RangeValue
    updated[dragging.current] = next
    commit(updated)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (dragging.current === null) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragging.current = null
    commit(value, true)
  }

  function onKeyDown(index: 0 | 1) {
    return (event: KeyboardEvent<HTMLElement>) => {
      if (disabled) return
      const big = (max - min) / 10
      const deltas: Record<string, number> = {
        ArrowRight: step,
        ArrowUp: step,
        ArrowLeft: -step,
        ArrowDown: -step,
        PageUp: big,
        PageDown: -big,
      }

      let next: number | undefined
      if (event.key in deltas) next = clamp(value[index] + deltas[event.key])
      else if (event.key === 'Home') next = min
      else if (event.key === 'End') next = max
      if (next === undefined) return

      event.preventDefault()
      const updated: RangeValue = [...value] as RangeValue
      updated[index] = next
      commit(updated, true)
    }
  }

  const metrics = sliderSize[size]

  return (
    <div
      data-slot="range-slider"
      className={cn('flex w-full flex-col gap-2', disabled && 'opacity-50', className)}
      {...props}
    >
      {(label || showValues) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && (
            <span id={id} className="text-sm font-medium">
              {label}
            </span>
          )}
          {showValues && (
            <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
              {formatValue(low)} – {formatValue(high)}
            </span>
          )}
        </div>
      )}

      <div
        ref={trackRef}
        className={cn('relative w-full touch-none select-none', metrics)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="bg-secondary absolute inset-x-0 top-1/2 h-[var(--slider-track)] -translate-y-1/2 rounded-full [corner-shape:round]" />
        <div
          className="bg-primary absolute top-1/2 h-[var(--slider-track)] -translate-y-1/2 rounded-full [corner-shape:round]"
          style={{ left: `${percent(low)}%`, width: `${percent(high) - percent(low)}%` }}
        />

        {([0, 1] as const).map((index) => (
          <button
            key={index}
            type="button"
            role="slider"
            aria-labelledby={label ? id : undefined}
            aria-label={label ? undefined : index === 0 ? 'Minimum' : 'Maximum'}
            aria-valuemin={index === 0 ? min : low}
            aria-valuemax={index === 0 ? high : max}
            aria-valuenow={value[index]}
            aria-valuetext={formatValue(value[index])}
            aria-orientation="horizontal"
            disabled={disabled}
            onPointerDown={onPointerDown(index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown(index)}
            style={{ left: `${percent(value[index])}%` }}
            className={cn(
              'border-primary bg-background absolute top-1/2 size-[var(--slider-thumb)] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 [corner-shape:round]',
              'transition-colors duration-150 ease-out motion-reduce:transition-none',
              focusRing,
              !disabled && 'hover:bg-secondary cursor-grab active:cursor-grabbing',
            )}
          />
        ))}
      </div>
    </div>
  )
}

export { RangeSlider }
export type { RangeValue }
