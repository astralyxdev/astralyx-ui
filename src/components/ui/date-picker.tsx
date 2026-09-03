import { useState, type ComponentProps, type ReactNode } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  Calendar,
  type CalendarPreset,
  type WeekStart,
} from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  formatDate,
  formatRange,
  formatTime,
  type DateRange,
} from '@/lib/date'
import { fieldBase, fieldSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/** The same three treatments Input and Select offer. */
const FIELD_VARIANT = {
  default: 'border-border bg-background border',
  secondary: 'bg-secondary border border-transparent',
  ghost: 'hover:bg-accent border border-transparent bg-transparent',
} as const

/**
 * Calendar in a Popover, with a trigger that reads like an Input.
 *
 * Composed from existing parts rather than written fresh, so it inherits the
 * popper's flipping, the popover's dismissal and the field's sizing for free.
 * Every Calendar capability is passed through — range, presets, times, multiple
 * months — so there is only one date implementation to reason about.
 */
type Common = {
  placeholder?: string
  locale?: string
  fromDate?: Date
  toDate?: Date
  disabled?: boolean
  disabledDate?: (date: Date) => boolean
  size?: keyof typeof fieldSize
  /** Matches Input and Select, so a form can be uniform. */
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  numberOfMonths?: number
  weekStartsOn?: WeekStart
  captionLayout?: 'label' | 'dropdown'
  showTime?: boolean
  timeStep?: number
  footer?: ReactNode
  /** Keep the popover open after a pick — useful with times. */
  closeOnSelect?: boolean
  className?: string
}

type SingleProps = Common & {
  mode?: 'single'
  value?: Date
  defaultValue?: Date
  onValueChange?: (date: Date | undefined) => void
  presets?: never
}

type RangeProps = Common & {
  mode: 'range'
  value?: DateRange
  defaultValue?: DateRange
  onValueChange?: (range: DateRange | undefined) => void
  presets?: CalendarPreset[]
}

export type DatePickerProps = (SingleProps | RangeProps) &
  Omit<ComponentProps<'button'>, 'value' | 'defaultValue' | 'onSelect' | 'mode'>

/**
 * Destructuring a discriminated union leaves the variant-only keys in `...rest`,
 * which would then be spread onto a `<button>` — `value` as a Date is not a
 * valid button attribute. Reading through this shape strips them cleanly.
 */
type AnyDatePicker = Common &
  Omit<ComponentProps<'button'>, 'value' | 'defaultValue' | 'onSelect' | 'mode'> & {
    mode?: 'single' | 'range'
    value?: Date | DateRange
    defaultValue?: Date | DateRange
    onValueChange?: (value: never) => void
    presets?: CalendarPreset[]
  }

function DatePicker(props: DatePickerProps) {
  const {
    mode: _mode,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    presets: _presets,
    className,
    placeholder = props.mode === 'range' ? 'Pick a range' : 'Pick a date',
    locale = 'en-GB',
    fromDate,
    toDate,
    disabled,
    disabledDate,
    size = 'md',
    variant = 'default',
    error,
    numberOfMonths = props.mode === 'range' ? 2 : 1,
    weekStartsOn = 1,
    captionLayout = 'label',
    showTime = false,
    timeStep = 5,
    footer,
    // With a time picker the popover must stay open — closing on the day click
    // would give no chance to set the hour.
    closeOnSelect = !showTime,
    ...rest
  } = props as AnyDatePicker

  const range = props.mode === 'range'
  const controlled = props.value !== undefined
  const [own, setOwn] = useState<Date | DateRange | undefined>(props.defaultValue)
  const selected = controlled ? props.value : own
  const [open, setOpen] = useState(false)

  function emit(next: Date | DateRange | undefined) {
    if (!controlled) setOwn(next)
    ;(props.onValueChange as (v: typeof next) => void)?.(next)

    // A range is only finished once both ends exist.
    const complete = range ? Boolean((next as DateRange)?.to) : Boolean(next)
    if (closeOnSelect && complete) setOpen(false)
  }

  const label = range
    ? formatRange(selected as DateRange | undefined, locale)
    : selected
      ? formatDate(selected as Date, locale) +
        (showTime ? ` · ${formatTime(selected as Date, locale)}` : '')
      : ''

  const calendar = range ? (
    <Calendar
      mode="range"
      selected={selected as DateRange | undefined}
      onSelect={emit}
      presets={props.presets}
      locale={locale}
      fromDate={fromDate}
      toDate={toDate}
      disabled={disabledDate}
      numberOfMonths={numberOfMonths}
      weekStartsOn={weekStartsOn}
      captionLayout={captionLayout}
      showTime={showTime}
      timeStep={timeStep}
      footer={footer}
    />
  ) : (
    <Calendar
      selected={selected as Date | undefined}
      onSelect={emit}
      locale={locale}
      fromDate={fromDate}
      toDate={toDate}
      disabled={disabledDate}
      numberOfMonths={numberOfMonths}
      weekStartsOn={weekStartsOn}
      captionLayout={captionLayout}
      showTime={showTime}
      timeStep={timeStep}
      footer={footer}
    />
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={placeholder}
        className={cn(
          fieldBase,
          fieldSize[size],
          'text-start',
          FIELD_VARIANT[variant],
          error && 'border-destructive',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...rest}
      >
        <CalendarDays className="text-muted-foreground" />
        <span className={cn('flex-1 truncate', !label && 'text-muted-foreground/70')}>
          {label || placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {calendar}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
