import {
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
} from 'react'
import { fieldBase } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A fixed-length code entry, one box per character.
 *
 * Every box is a real input, so password managers and SMS autofill can target
 * them, and `inputMode="numeric"` brings up the right keyboard. Paste is handled
 * on any box and distributed across the rest — pasting a code is the common
 * case, and per-box paste would drop all but one character.
 */
type InputOTPProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  length?: number
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  /** Insert a gap after this many boxes, e.g. 3 for a 6-digit code. */
  groupAfter?: number
  pattern?: 'numeric' | 'alphanumeric'
}

function InputOTP({
  className,
  length = 6,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onComplete,
  disabled = false,
  groupAfter,
  pattern = 'numeric',
  ...props
}: InputOTPProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = (controlled ? valueProp : uncontrolled).slice(0, length)

  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const allowed = pattern === 'numeric' ? /[^0-9]/g : /[^a-zA-Z0-9]/g

  function commit(next: string) {
    const clean = next.replace(allowed, '').slice(0, length)
    if (!controlled) setUncontrolled(clean)
    onValueChange?.(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }

  function setCharAt(index: number, char: string) {
    const chars = value.padEnd(length, ' ').split('')
    chars[index] = char || ' '
    return commit(chars.join('').replace(/ +$/, ''))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (value[index]) setCharAt(index, '')
      else if (index > 0) {
        setCharAt(index - 1, '')
        inputs.current[index - 1]?.focus()
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(allowed, '')
    if (!pasted) return

    const chars = value.padEnd(length, ' ').split('')
    for (let i = 0; i < pasted.length && index + i < length; i++) {
      chars[index + i] = pasted[i]
    }

    const next = commit(chars.join('').replace(/ +$/, ''))
    const focusAt = Math.min(index + pasted.length, length - 1)
    inputs.current[focusAt]?.focus()
    return next
  }

  return (
    <div
      data-slot="input-otp"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {Array.from({ length }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            ref={(node) => {
              inputs.current[index] = node
            }}
            type="text"
            inputMode={pattern === 'numeric' ? 'numeric' : 'text'}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            aria-label={`Character ${index + 1} of ${length}`}
            value={value[index] ?? ''}
            onChange={(event) => {
              const char = event.target.value.slice(-1)
              if (!char) return setCharAt(index, '')
              setCharAt(index, char)
              if (index < length - 1) inputs.current[index + 1]?.focus()
            }}
            onKeyDown={(event) => onKeyDown(event, index)}
            onPaste={(event) => onPaste(event, index)}
            onFocus={(event) => event.target.select()}
            className={cn(
              fieldBase,
              // A field, so it sits on the control ladder: 48px, the xl rung,
              // with the matching radius. 44px was between two rungs.
              'size-12 rounded-[var(--radius-control-xl)]',
              'border-border bg-background justify-center border text-center font-mono text-base',
              'focus:border-[var(--border-active)] focus:outline-none',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          />
          {groupAfter && index === groupAfter - 1 && index < length - 1 && (
            <span aria-hidden="true" className="text-muted-foreground px-1">
              &ndash;
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export { InputOTP }
export type { InputOTPProps }
