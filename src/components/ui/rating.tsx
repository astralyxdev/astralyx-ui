import {
  useState,
  type ComponentProps,
  type ComponentType,
  type KeyboardEvent,
} from 'react'
import { Hexagon } from 'lucide-react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A rating, readable or settable.
 *
 * Read-only mode renders a single `img` with a text alternative rather than a
 * row of interactive elements — "4 out of 5" is what a reader needs, not five
 * separate announcements. Interactive mode is a radio group, which is exactly
 * what picking one of five mutually exclusive values is.
 *
 * Hover preview is a colour change only; nothing grows or moves, in line with
 * the rest of the kit.
 *
 * Marks are monochrome: filled is the foreground colour, empty is an outline.
 * A rating is a quantity, not a status, and colouring it amber makes it read as
 * a warning next to components where amber means exactly that.
 *
 * `icon` takes a component, not an element, because each mark is drawn twice —
 * once as the outline and once clipped for the fill. An element could only be
 * rendered once, so a half value would have nothing to clip.
 *
 * Half values are supported for display by clipping the icon, not by rendering
 * a second half-filled glyph — that keeps a 3.5 aligned with a 3 on the grid.
 */
function Rating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  count = 5,
  readOnly = false,
  icon: Icon = Hexagon,
  size = 'default',
  label = 'Rating',
  showValue = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  count?: number
  readOnly?: boolean
  /**
   * The mark. Any component taking a `className` — a lucide icon, or your own
   * SVG. Must be a component rather than an element: each mark renders twice.
   */
  icon?: ComponentType<{ className?: string }>
  size?: 'sm' | 'default' | 'lg'
  label?: string
  showValue?: boolean
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled
  const [preview, setPreview] = useState<number | null>(null)

  const shown = preview ?? value
  const iconSize = { sm: 'size-3.5', default: 'size-4', lg: 'size-5' }[size]

  function set(next: number) {
    if (readOnly) return
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly) return
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    }
    if (event.key in deltas) {
      event.preventDefault()
      set(Math.min(count, Math.max(0, value + deltas[event.key])))
    } else if (event.key === 'Home') {
      event.preventDefault()
      set(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      set(count)
    }
  }

  const stars = Array.from({ length: count }, (_, index) => {
    const position = index + 1
    // Clip rather than swap in a half glyph, so partial stars stay on grid.
    const fill = Math.max(0, Math.min(1, shown - index))

    return (
      // `inline-flex`, not the default inline: width and height do not apply
      // to an inline box, so in read-only mode — where the star is not a flex
      // item of a button — the icon collapsed to nothing.
      <span key={index} className={cn('relative inline-flex shrink-0', iconSize)}>
        {/* Empty: outline only, no fill. */}
        <Icon className={cn(iconSize, 'text-muted-foreground/50 absolute inset-0 fill-none')} />
        {fill > 0 && (
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${fill * 100}%` }}
          >
            <Icon
              // Monochrome by design: filled stars take the foreground colour
              // rather than a hue, so a rating reads as a quantity and not as
              // a status. Inverts correctly in the dark theme.
              className={cn(iconSize, 'fill-foreground text-foreground')}
            />
          </span>
        )}
        <span className="sr-only">{position}</span>
      </span>
    )
  })

  if (readOnly) {
    return (
      <div
        data-slot="rating"
        role="img"
        aria-label={`${label}: ${value} out of ${count}`}
        className={cn('inline-flex items-center gap-0.5', className)}
        {...props}
      >
        {stars.map((star, index) => (
          <span key={index} aria-hidden="true">
            {star}
          </span>
        ))}
        {showValue && (
          <span className="text-muted-foreground ms-1.5 text-xs tabular-nums">
            {value.toFixed(1)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      data-slot="rating"
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerLeave={() => setPreview(null)}
      className={cn('inline-flex items-center gap-0.5', className)}
      {...props}
    >
      {Array.from({ length: count }, (_, index) => {
        const position = index + 1
        const checked = Math.ceil(value) === position

        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${position} of ${count}`}
            // One tab stop for the group, as a radio group should have.
            tabIndex={checked || (value === 0 && index === 0) ? 0 : -1}
            onPointerEnter={() => setPreview(position)}
            onFocus={() => setPreview(position)}
            onBlur={() => setPreview(null)}
            onClick={() => set(value === position ? 0 : position)}
            className={cn(
              'flex items-center justify-center p-0.5',
              radius.xs,
              focusRing,
              'transition-colors duration-150 ease-out motion-reduce:transition-none',
            )}
          >
            {stars[index]}
          </button>
        )
      })}

      {showValue && (
        <span className="text-muted-foreground ms-1.5 text-xs tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}

export { Rating }
