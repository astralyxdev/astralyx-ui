import { useRef, useState, type ComponentProps, type KeyboardEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  disabledState,
  fieldBase,
  fieldInput,
  fieldSize,
  focusRing,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A number field with steppers.
 *
 * `inputMode="decimal"` with `type="text"`, not `type="number"`. The native
 * number input silently discards what it cannot parse, so a half-typed "1e" or
 * "-" vanishes as you type it; it also exposes a spinner that cannot be styled
 * and scrolls the value on wheel over the field. Keeping the text input means
 * the caller sees every keystroke and the value is parsed on commit.
 *
 * Clamping happens on blur rather than on each keystroke, so typing "5" on the
 * way to "50" in a field with a minimum of 10 is not rewritten under the
 * cursor.
 */
function NumberInput({
  value: valueProp,
  defaultValue,
  onValueChange,
  min,
  max,
  step = 1,
  precision,
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  prefix,
  suffix,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'prefix'> & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
  /** Decimal places kept when stepping. Inferred from `step` when omitted. */
  precision?: number
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  prefix?: string
  suffix?: string
}) {
  const controlled = valueProp !== undefined
  const [text, setText] = useState(
    () => (controlled ? valueProp : defaultValue)?.toString() ?? '',
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const display = controlled ? (valueProp?.toString() ?? '') : text
  const current = Number.parseFloat(display)

  // A step of 0.1 implies one decimal place; anything else would accumulate
  // float noise as you click.
  const places =
    precision ?? (String(step).includes('.') ? String(step).split('.')[1].length : 0)

  const clamp = (raw: number) => {
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, raw))
    return Number(bounded.toFixed(places))
  }

  function commit(next: number | undefined) {
    if (!controlled) setText(next?.toString() ?? '')
    onValueChange?.(next)
  }

  function nudge(direction: 1 | -1) {
    const base = Number.isNaN(current) ? (min ?? 0) : current
    commit(clamp(base + direction * step))
    inputRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      nudge(1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      nudge(-1)
    }
  }

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'border border-transparent bg-transparent',
  }[variant]

  const stepper = (direction: 1 | -1) => {
    const atLimit =
      direction === 1
        ? max !== undefined && current >= max
        : min !== undefined && current <= min

    return (
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || atLimit}
        aria-label={direction === 1 ? 'Increase' : 'Decrease'}
        onClick={() => nudge(direction)}
        className={cn(
          'text-muted-foreground hover:text-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center',
          radius.xs,
          'transition-colors duration-150 ease-out motion-reduce:transition-none',
          disabledState,
        )}
      >
        {direction === 1 ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
      </button>
    )
  }

  return (
    <div
      data-slot="number-input"
      className={cn(
        fieldBase,
        fieldSize[size],
        VARIANT,
        error && 'border-destructive',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      {prefix && (
        <span className="text-muted-foreground shrink-0 text-sm">{prefix}</span>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        role="spinbutton"
        aria-valuenow={Number.isNaN(current) ? undefined : current}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        value={display}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          const next = event.target.value
          if (!controlled) setText(next)
          const parsed = Number.parseFloat(next)
          onValueChange?.(next === '' ? undefined : Number.isNaN(parsed) ? undefined : parsed)
        }}
        onBlur={() => {
          // Clamp on blur, not per keystroke: rewriting "5" to "10" mid-type
          // fights the person entering "50".
          if (display === '') return commit(undefined)
          if (Number.isNaN(current)) return commit(undefined)
          commit(clamp(current))
        }}
        className={cn(fieldInput, 'tabular-nums', focusRing, 'focus-visible:ring-0')}
        {...props}
      />

      {suffix && (
        <span className="text-muted-foreground shrink-0 text-sm">{suffix}</span>
      )}

      <span className="flex shrink-0 items-center gap-0.5">
        {stepper(-1)}
        {stepper(1)}
      </span>
    </div>
  )
}

export { NumberInput }
