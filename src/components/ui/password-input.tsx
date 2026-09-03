import { useId, useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  fieldBase,
  fieldInput,
  fieldSize,
  focusRing,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A password field with a reveal toggle and an optional strength meter.
 *
 * The toggle is a button, not a checkbox, and it is `tabIndex={-1}` so Tab goes
 * from the field to the next field rather than through it. Reaching it is a
 * pointer gesture; a keyboard user typing a password does not want a stop
 * between the field and the submit button.
 *
 * Strength is scored on length and variety only, and the component says so —
 * `zxcvbn`-style dictionary scoring is a 400 kB dependency and a genuinely
 * different claim. What is here rewards length above all else, which is the one
 * thing the naive meters get wrong when they demand a symbol from a passphrase.
 */
const BANDS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const

const BAND_TONE = [
  'bg-[var(--destructive)]',
  'bg-[var(--destructive)]',
  'bg-[var(--amber)]',
  'bg-[var(--green)]',
  'bg-[var(--green)]',
]

/** 0–4. Length dominates; variety is worth less than one more character. */
function scorePassword(value: string) {
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (value.length >= 16) score++

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((re) => re.test(value)).length
  if (variety >= 3) score++

  return Math.min(score, 4)
}

function PasswordInput({
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  strength = false,
  value,
  strengthLabel = 'Password strength',
  className,
  onChange,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'size'> & {
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  /** Show the strength meter under the field. */
  strength?: boolean
  /** Accessible name for the strength meter. */
  strengthLabel?: string
}) {
  const [visible, setVisible] = useState(false)
  const [internal, setInternal] = useState('')
  const meterId = useId()

  const text = value !== undefined ? String(value) : internal
  const score = scorePassword(text)

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'border border-transparent bg-transparent',
  }[variant]

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div
        data-slot="password-input"
        className={cn(
          fieldBase,
          fieldSize[size],
          VARIANT,
          error && 'border-destructive',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <input
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          value={value}
          aria-describedby={strength ? meterId : undefined}
          onChange={(event) => {
            if (value === undefined) setInternal(event.target.value)
            onChange?.(event)
          }}
          className={cn(fieldInput)}
          {...props}
        />

        <button
          type="button"
          // Out of the tab order deliberately: Tab should go field → submit.
          tabIndex={-1}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className={cn(
            'text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center',
            radius.xs,
            focusRing,
            'transition-colors duration-150 ease-out motion-reduce:transition-none',
          )}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {strength && (
        <div id={meterId} className="flex flex-col gap-1">
          <div
            role="meter"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuetext={BANDS[score]}
            aria-label={strengthLabel}
            className="flex gap-1"
          >
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full [corner-shape:round]',
                  text && index < score ? BAND_TONE[score] : 'bg-secondary',
                )}
              />
            ))}
          </div>
          {text && (
            <p className="text-muted-foreground text-xs">
              {BANDS[score]} — length matters more than symbols
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export { PasswordInput, scorePassword }
