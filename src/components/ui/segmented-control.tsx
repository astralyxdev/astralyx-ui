import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A small set of mutually exclusive choices, shown all at once.
 *
 * **Not a button group, and not a tab list.** A button group is a row of
 * independent actions; tabs switch which panel is visible and carry
 * `aria-controls`. This picks a *value* — day/week/month, grid/list — so it is
 * a radio group, and it is built as one: real `<input type="radio">` elements
 * in a `<fieldset>`. That gives arrow-key navigation, form submission,
 * `:checked`, and screen-reader announcement of "2 of 3" for free, none of
 * which a row of `<button>`s with `aria-pressed` gets right.
 *
 * **Use it below about five options, with short labels.** Past that a `Select`
 * is faster to read and does not fight for horizontal space; this is the
 * control you reach for when seeing all the options at once is the point.
 *
 * The moving indicator is one absolutely-positioned element sized by the
 * selected index, rather than a background on the selected item — so it slides
 * between options instead of blinking, and there is one thing to animate.
 */
export type Segment = {
  value: string
  label: ReactNode
  /** Announced when the visible label is an icon. */
  srLabel?: string
  disabled?: boolean
}

type SegmentedControlProps = Omit<ComponentProps<'fieldset'>, 'onChange' | 'defaultValue'> & {
  options: Segment[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Accessible name for the group. Required unless one is supplied elsewhere. */
  label?: string
  size?: 'sm' | 'md' | 'lg'
  /** Fill the container, splitting the width evenly. */
  fullWidth?: boolean
  name?: string
  disabled?: boolean
}

const SIZES = {
  sm: 'h-8 text-xs',
  md: 'h-9 text-sm',
  lg: 'h-10 text-sm',
} as const

function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  size = 'md',
  fullWidth = false,
  name,
  disabled,
  className,
  ...props
}: SegmentedControlProps) {
  const scope = useId()
  const groupName = name ?? scope
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value)
  const listRef = useRef<HTMLDivElement>(null)

  const current = value ?? internal
  const index = Math.max(0, options.findIndex((option) => option.value === current))

  const commit = (next: string) => {
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
  }

  return (
    <fieldset
      data-slot="segmented-control"
      disabled={disabled}
      className={cn('min-w-0 border-0 p-0', fullWidth && 'w-full', className)}
      {...props}
    >
      {label && <legend className="sr-only">{label}</legend>}

      <div
        ref={listRef}
        className={cn(
          'bg-muted relative inline-grid auto-cols-fr grid-flow-col gap-1 p-1',
          radius.control,
          fullWidth && 'flex w-full',
          SIZES[size],
          'h-auto',
        )}
      >
        {/* The indicator, positioned by index. Percentages of the track rather
            than measured pixels, so it survives a resize with no observer. */}
        <span
          aria-hidden="true"
          className={cn(
            'bg-background pointer-events-none absolute inset-y-1 shadow-sm transition-[inset-inline-start] duration-150 ease-out',
            radius.control,
            'motion-reduce:transition-none',
          )}
          style={{
            insetInlineStart: `calc(${(index / options.length) * 100}% + 0.25rem)`,
            width: `calc(${100 / options.length}% - 0.5rem)`,
          }}
        />

        {options.map((option) => {
          const id = `${scope}-${option.value}`
          const checked = option.value === current

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'relative z-10 flex cursor-pointer items-center justify-center gap-1.5 px-3 font-medium whitespace-nowrap select-none',
                SIZES[size],
                radius.control,
                'text-muted-foreground transition-colors',
                checked && 'text-foreground',
                option.disabled && 'pointer-events-none opacity-50',
                fullWidth && 'flex-1',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]',
              )}
            >
              <input
                id={id}
                type="radio"
                name={groupName}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => commit(option.value)}
                // Visually hidden but focusable and hit-testable: this is what
                // makes arrow keys and form submission work without any JS.
                className={cn('absolute inset-0 cursor-pointer opacity-0', focusRing)}
              />
              {option.label}
              {option.srLabel && <span className="sr-only">{option.srLabel}</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export { SegmentedControl }
export type { SegmentedControlProps }
