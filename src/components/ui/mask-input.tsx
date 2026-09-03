import { useRef, useState, type ComponentProps } from 'react'
import {
  fieldBase,
  fieldInput,
  fieldSize,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A text field that formats as you type — card numbers, phone numbers, dates.
 *
 * The mask is a pattern of placeholders: `#` for a digit, `A` for a letter, `*`
 * for either. Everything else is a literal that the component inserts.
 *
 * Two details make the difference between a mask that helps and one that
 * fights you. Deleting a literal deletes the character before it, so backspace
 * over the space in "4242 4242" removes a digit rather than sticking. And the
 * caller receives the raw value alongside the formatted one, because a form
 * that submits "(555) 010-9999" to an API expecting digits has just moved the
 * parsing problem downstream.
 */
const TOKENS: Record<string, RegExp> = {
  '#': /\d/,
  A: /[a-z]/i,
  '*': /[a-z0-9]/i,
}

/** Apply the mask, returning the formatted text and the raw characters kept. */
function applyMask(input: string, mask: string) {
  let formatted = ''
  let raw = ''
  let index = 0

  for (const slot of mask) {
    if (index >= input.length) break
    const token = TOKENS[slot]

    if (token) {
      // Skip anything that does not fit this slot rather than stopping, so
      // pasting "4242-4242" into a digits mask keeps the digits.
      while (index < input.length && !token.test(input[index])) index++
      if (index >= input.length) break
      formatted += input[index]
      raw += input[index]
      index++
    } else {
      formatted += slot
      // A literal typed by the user is consumed rather than duplicated.
      if (input[index] === slot) index++
    }
  }

  return { formatted, raw }
}

function MaskInput({
  mask,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  placeholder,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'size'> & {
  /** `#` digit, `A` letter, `*` either; anything else is a literal. */
  mask: string
  value?: string
  defaultValue?: string
  /** Receives both the formatted text and the raw characters. */
  onValueChange?: (formatted: string, raw: string) => void
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(
    () => applyMask(defaultValue, mask).formatted,
  )
  const value = controlled ? valueProp : uncontrolled
  const previous = useRef(value)

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'border border-transparent bg-transparent',
  }[variant]

  return (
    <div
      data-slot="mask-input"
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
      <input
        type="text"
        inputMode={/^[#\s\-/()+.]+$/.test(mask) ? 'numeric' : 'text'}
        disabled={disabled}
        value={value}
        placeholder={placeholder ?? mask.replace(/[#A*]/g, '_')}
        onChange={(event) => {
          let next = event.target.value

          // Deleting into a literal removes the character before it too,
          // otherwise backspace appears to do nothing.
          if (next.length < previous.current.length) {
            const trimmed = next.replace(/[^#A*]$/, '')
            if (trimmed !== next && !TOKENS[mask[next.length]]) {
              next = next.slice(0, -1)
            }
          }

          const { formatted, raw } = applyMask(next, mask)
          previous.current = formatted
          if (!controlled) setUncontrolled(formatted)
          onValueChange?.(formatted, raw)
        }}
        className={cn(fieldInput, 'tabular-nums')}
        {...props}
      />
    </div>
  )
}

export { MaskInput, applyMask }
