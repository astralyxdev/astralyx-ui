import { useState, type ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { focusRing, sliderSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A native `<input type="range">`, restyled.
 *
 * Track and thumb can only be reached through vendor pseudo-elements, so their
 * rules live in `index.css` under `.slider`; this component supplies the size
 * variables and the fill percentage they read. Doing it natively keeps arrow
 * keys, Home/End, touch dragging and form submission working with no JS.
 */
const sliderVariants = cva(['slider w-full', focusRing].join(' '), {
  variants: {
    size: {
      sm: sliderSize.sm,
      default: sliderSize.default,
      lg: sliderSize.lg,
    },
  },
  defaultVariants: { size: 'default' },
})

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
  ...props
}: SliderProps) {
  const controlled = value !== undefined
  const [uncontrolled, setUncontrolled] = useState(
    () => Number(defaultValue ?? (Number(min) + Number(max)) / 2),
  )
  const current = controlled ? Number(value) : uncontrolled

  // The webkit track is painted with a gradient, so it needs a percentage.
  const span = Number(max) - Number(min)
  const progress = span === 0 ? 0 : ((current - Number(min)) / span) * 100

  const input = (
    <input
      type="range"
      data-slot="slider"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={controlled ? value : uncontrolled}
      onChange={(event) => {
        if (!controlled) setUncontrolled(Number(event.target.value))
        onChange?.(event)
      }}
      className={cn(sliderVariants({ size }), className)}
      style={{ '--slider-progress': `${progress}%`, ...style } as React.CSSProperties}
      {...props}
    />
  )

  if (!showValue) return input

  return (
    <div className="flex w-full items-center gap-3">
      {input}
      <span className="text-muted-foreground w-10 shrink-0 text-right font-mono text-xs tabular-nums">
        {formatValue(current)}
      </span>
    </div>
  )
}

export { Slider, sliderVariants }
export type { SliderProps }
