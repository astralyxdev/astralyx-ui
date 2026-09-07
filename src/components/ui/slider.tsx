import { useState, type ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { focusRing, sliderSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A native `<input type="range">`, restyled.
 *
 * The input keeps every behaviour that makes a range input worth using — arrow
 * keys, Home/End, touch dragging, form submission, the announced role — and
 * paints none of it. Track, fill and thumb are the three elements beside it,
 * and the input sits transparently on top as the hit target.
 *
 * **Why not just style the pseudo-elements.** A native thumb's position is
 * derived from `value` by the browser, and there is no property on it that can
 * be transitioned, so it can only ever snap. The thumb here is positioned from
 * `--slider-progress`, a registered custom property, which means it can be
 * interpolated — and so it trails the pointer slightly instead of being welded
 * to it. The fill reads the same variable, so the two can never drift apart.
 *
 * The vendor pseudo-elements still matter for one thing: a range input insets
 * the thumb's travel by half its own width at each end, and the maths below has
 * to match. `index.css` keeps their size and strips their borders so the two
 * agree exactly.
 *
 * **Three colours are variables, not classes**, alongside the sizes that
 * already were:
 *
 *   `--slider-rail`  the unfilled track   (default `--secondary`)
 *   `--slider-fill`  the filled part      (default `--foreground`)
 *   `--slider-knob`  the thumb's ring     (default `--foreground`)
 *
 * They exist so this component can be reused where the page tokens are wrong
 * rather than reimplemented there. A player's chrome is black in both themes,
 * so `--foreground` is invisible on it; a waveform scrubber wants no rail or
 * fill at all because the peaks behind are the track. Both were hand-rolled
 * range inputs until these existed, and both looked like a different product.
 */
const sliderVariants = cva(
  ['slider-shell relative block w-full touch-none select-none'].join(' '),
  {
    variants: {
      size: {
        sm: sliderSize.sm,
        default: sliderSize.default,
        lg: sliderSize.lg,
      },
    },
    defaultVariants: { size: 'default' },
  },
)

/**
 * Where the centre of the thumb sits, as a length across the shell.
 *
 * `100%` is the shell; the thumb's centre travels between half a thumb from
 * each edge, which is exactly what the native control does with its own thumb
 * and therefore where a click lands.
 */
const THUMB_OFFSET =
  'calc(var(--slider-thumb) / 2 + (100% - var(--slider-thumb)) * var(--slider-progress))'

/** Shared by the track and the fill, so the two line up. */
const BAR = 'pointer-events-none absolute top-1/2 h-[var(--slider-track)] -translate-y-1/2 rounded-full [corner-shape:round]'

type SliderProps = Omit<ComponentProps<'input'>, 'size' | 'type'> &
  VariantProps<typeof sliderVariants> & {
    /**
     * Accessible name. A range input with no name is announced as just
     * "slider", so this is the one prop that should never be skipped — pass
     * `aria-label`/`aria-labelledby` directly if you already have a visible
     * label to point at.
     */
    label?: string
    /** Render the current value beside the track. */
    showValue?: boolean
    /** Format the displayed value. */
    formatValue?: (value: number) => string
  }

function Slider({
  className,
  size,
  label,
  showValue = false,
  formatValue = String,
  min = 0,
  max = 100,
  step,
  value,
  defaultValue,
  onChange,
  style,
  disabled,
  ...props
}: SliderProps) {
  const controlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(
    () => Number(defaultValue ?? (Number(min) + Number(max)) / 2),
  )
  const current = controlled ? Number(value) : uncontrolled

  // A unitless 0–1 ratio rather than a percentage: `--slider-progress` is
  // registered as a `<number>`, which is what makes it interpolable, and a
  // number multiplies cleanly into both a length and a percentage.
  const span = Number(max) - Number(min)
  const ratio = span === 0 ? 0 : (current - Number(min)) / span

  const control = (
    <span
      data-slot="slider-shell"
      className={cn(sliderVariants({ size }), className)}
      style={{ '--slider-progress': ratio, ...style } as React.CSSProperties}
    >
      <input
        type="range"
        data-slot="slider"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={controlled ? value : uncontrolled}
        onChange={(event) => {
          if (!controlled) setUncontrolled(Number(event.target.value))
          onChange?.(event)
        }}
        // On top of the painted parts and transparent, so every pointer and
        // key event still reaches the real control.
        className={cn('slider peer absolute inset-0 size-full', focusRing)}
        {...props}
      />

      <span
        aria-hidden="true"
        className={cn(BAR, 'inset-x-0 bg-[var(--slider-rail,var(--secondary))]')}
      />
      <span
        aria-hidden="true"
        data-slot="slider-fill"
        className={cn(BAR, 'start-0 bg-[var(--slider-fill,var(--foreground))]')}
        // Ends at the thumb's centre, not at a plain percentage of the track,
        // or the fill runs ahead of the thumb at both ends.
        style={{ width: THUMB_OFFSET }}
      />
      <span
        aria-hidden="true"
        data-slot="slider-thumb"
        className={cn(
          'pointer-events-none absolute top-1/2 size-[var(--slider-thumb)]',
          'rounded-full border-2 [corner-shape:round]',
          'border-[var(--slider-knob,var(--foreground))] bg-background',
          '-translate-x-1/2 -translate-y-1/2',
          'transition-[border-color] duration-150 ease-out motion-reduce:transition-none',
          'peer-hover:border-[var(--border-active)] peer-focus-visible:border-[var(--border-active)]',
          'peer-disabled:opacity-50',
        )}
        style={{ left: THUMB_OFFSET }}
      />
    </span>
  )

  if (!showValue) return control

  return (
    <div className="flex w-full items-center gap-3">
      {control}
      <span className="text-muted-foreground w-10 shrink-0 text-right font-mono text-xs tabular-nums">
        {formatValue(current)}
      </span>
    </div>
  )
}

export { Slider, sliderVariants }
export type { SliderProps }
