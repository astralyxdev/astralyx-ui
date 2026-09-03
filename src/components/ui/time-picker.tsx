import { useMemo, useRef, useState, type ComponentProps } from 'react'
import { Clock } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import {
  fieldBase,
  fieldSize,
  focusRing,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Pick a time of day.
 *
 * The value is `HH:mm` in 24-hour form regardless of how it is displayed. A
 * component that hands back "2:30 PM" pushes parsing onto every caller and
 * breaks the moment the locale changes; the display format is presentation and
 * the value is data.
 *
 * Options are generated at a fixed interval rather than offering free entry.
 * Typing a time is a parsing problem with a dozen ambiguous cases ("230",
 * "2.30", "14h"), and for scheduling a list of slots is what people actually
 * want.
 */
function toMinutes(value: string) {
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function toValue(minutes: number) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function TimePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  interval = 30,
  min = '00:00',
  max = '23:59',
  hour12 = false,
  placeholder = 'Select a time',
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  locale = 'en-GB',
  listLabel = 'Times',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  /** `HH:mm`, 24-hour. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Minutes between options. */
  interval?: number
  min?: string
  max?: string
  hour12?: boolean
  placeholder?: string
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  disabled?: boolean
  locale?: string
  /** Accessible name for the listbox. */
  listLabel?: string
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { style } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side: 'bottom',
    align: 'start',
    offset: 4,
    matchAnchorWidth: true,
  })

  useDismissable({
    open,
    onDismiss: () => {
      setOpen(false)
      triggerRef.current?.focus()
    },
    refs: [triggerRef, panelRef],
  })

  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12,
      }),
    [locale, hour12],
  )

  const label = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    // A fixed date; only the clock part is ever read.
    return format.format(new Date(2000, 0, 1, h, m))
  }

  const options = useMemo(() => {
    const start = toMinutes(min)
    const end = toMinutes(max)
    const list: string[] = []
    for (let minutes = start; minutes <= end; minutes += interval) {
      list.push(toValue(minutes))
    }
    return list
  }, [min, max, interval])

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'hover:bg-accent border border-transparent bg-transparent',
  }[variant]

  return (
    <div data-slot="time-picker" className={cn('relative w-full', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          fieldBase,
          fieldSize[size],
          VARIANT,
          error && 'border-destructive',
          'justify-start text-start',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <Clock className="text-muted-foreground shrink-0" />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground/70')}>
          {value ? label(value) : placeholder}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          style={style}
          className={cn(menuSurface, radius.surface, 'max-h-60 p-1')}
        >
          <ul role="listbox" aria-label={listLabel} className="list-none">
            {options.map((time) => {
              const selected = value === time
              return (
                <li key={time}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    ref={(node) => {
                      // Open with the current value in view rather than at
                      // midnight — the list is 48 entries long.
                      if (node && selected) node.scrollIntoView({ block: 'center' })
                    }}
                    onClick={() => {
                      if (!controlled) setUncontrolled(time)
                      onValueChange?.(time)
                      setOpen(false)
                      triggerRef.current?.focus()
                    }}
                    className={cn(
                      'hover:bg-accent flex w-full items-center justify-between px-2.5 py-1.5 text-sm tabular-nums',
                      radius.control,
                      focusRing,
                      'transition-colors duration-150 ease-out motion-reduce:transition-none',
                      selected && 'bg-accent text-accent-foreground font-medium',
                    )}
                  >
                    {label(time)}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export { TimePicker }
