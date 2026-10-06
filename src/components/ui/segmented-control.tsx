'use client'

import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { focusRing, segmentSize, segmentText, type SegmentSize } from '@/lib/styles'
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

type SegmentedControlSize = SegmentSize | 'md'

type SegmentedControlProps = Omit<ComponentProps<'fieldset'>, 'onChange' | 'defaultValue'> & {
  options: Segment[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Accessible name for the group. Required unless one is supplied elsewhere. */
  label?: string
  /** The Button size this control matches. `md` is the older name for `default`. */
  size?: SegmentedControlSize
  /** Fill the container, splitting the width evenly. */
  fullWidth?: boolean
  name?: string
  disabled?: boolean
}

/**
 * Sizes are the Button's — `xs`, `sm`, `default`, `lg`, `xl` — and `md` stays
 * as another name for `default`, so code written against the old three sizes
 * keeps compiling.
 *
 * The old scale padded a fixed-height option inside the track, which made
 * every size 8px taller than the Button of the same name. Now the track has the
 * Button's height and corner and the options fill it, inset 3px, with the
 * indicator's corner the track's minus that inset so the two stay concentric.
 */
function resolveSize(size: SegmentedControlSize): SegmentSize {
  return size === 'md' ? 'default' : size
}

function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  size: sizeProp = 'default',
  fullWidth = false,
  name,
  disabled,
  className,
  ...props
}: SegmentedControlProps) {
  const size = segmentSize[resolveSize(sizeProp)]
  const text = segmentText[resolveSize(sizeProp)]
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
          'bg-muted relative inline-grid auto-cols-fr grid-flow-col gap-[3px] p-[3px]',
          size.height,
          size.radius,
          fullWidth && 'flex w-full',
        )}
      >
        {/* The indicator, positioned by index. Percentages of the track rather
            than measured pixels, so it survives a resize with no observer. */}
        <span
          aria-hidden="true"
          className={cn(
            'bg-background pointer-events-none absolute inset-y-[3px] shadow-sm transition-[inset-inline-start] duration-150 ease-out',
            size.inner,
            'motion-reduce:transition-none',
          )}
          style={{
            insetInlineStart: `calc(${(index / options.length) * 100}% + 3px)`,
            width: `calc(${100 / options.length}% - 6px)`,
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
                'relative z-10 flex h-full cursor-pointer items-center justify-center gap-1.5 font-semibold [&_svg]:shrink-0 whitespace-nowrap select-none',
                size.padX,
                size.icon,
                text,
                size.inner,
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
export type { SegmentedControlProps, SegmentedControlSize }
