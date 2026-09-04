import { useId, useMemo, useState, type ComponentProps } from 'react'
import { fieldBase, fieldOutline, fieldSize, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A country selector and a national number that together produce E.164.
 *
 * **The value is E.164** — `+441632960961`, digits and a leading plus, no
 * spaces or brackets. That is what every telephony API, SMS gateway and
 * database column wants, and storing the pretty version means every consumer
 * re-parses it and they disagree about how.
 *
 * **A mask input is not a substitute.** Phone formatting is per country and
 * frequently per prefix inside a country: a fixed `(___) ___-____` is wrong for
 * most of the world and actively blocks valid numbers. Here the dial code is
 * chosen explicitly and the national part is only lightly grouped.
 *
 * **It does not claim to validate.** Real validation is a per-country length
 * and prefix table that changes as regulators allocate ranges — that is
 * `libphonenumber`, and it is 200 kB+. This checks that the national part is
 * digits within a plausible length and says so, and `onValidChange` reports it
 * without blocking typing. If you need to reject a number confidently, do it on
 * the server where you can afford the library.
 *
 * The country list is a prop with a small default, because the right list is
 * usually "the countries you ship to", not all 249.
 */
export type Country = {
  /** ISO 3166-1 alpha-2, uppercase. */
  code: string
  name: string
  /** Dial code without the plus. */
  dial: string
  flag?: string
}

/** A short default. Pass `countries` for the list your product actually needs. */
export const COMMON_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '33', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', dial: '34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', dial: '39', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', dial: '31', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', dial: '48', flag: '🇵🇱' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
  { code: 'IN', name: 'India', dial: '91', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', dial: '65', flag: '🇸🇬' },
  { code: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵' },
  { code: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺' },
  { code: 'BR', name: 'Brazil', dial: '55', flag: '🇧🇷' },
]

type PhoneInputProps = Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'onChange' | 'size'> & {
  /** E.164, including the plus. */
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onValidChange?: (valid: boolean) => void
  countries?: Country[]
  /** Selected when the value has no dial code to infer one from. */
  defaultCountry?: string
  size?: 'sm' | 'md' | 'lg'
  countryLabel?: string
  /**
   * Accessible name for the number field.
   *
   * The wrapper looks like one control, but it is two: without this the number
   * input has no name at all, because the country `<select>` carries the only
   * label in sight.
   */
  numberLabel?: string
  invalid?: boolean
}

/** Split E.164 into a country and the national part, longest dial code first. */
function split(value: string, countries: Country[], fallback: string) {
  const digits = value.replace(/[^\d]/g, '')
  const ranked = [...countries].sort((a, b) => b.dial.length - a.dial.length)
  const match = value.startsWith('+') ? ranked.find((c) => digits.startsWith(c.dial)) : undefined
  const country = match ?? countries.find((c) => c.code === fallback) ?? countries[0]
  const national = match ? digits.slice(match.dial.length) : digits
  return { country, national }
}

/** Light grouping only — readable, and never country-specific enough to be wrong. */
function group(digits: string) {
  if (digits.length <= 4) return digits
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

function PhoneInput({
  value,
  defaultValue = '',
  onChange,
  onValidChange,
  countries = COMMON_COUNTRIES,
  defaultCountry = 'US',
  size = 'md',
  countryLabel = 'Country',
  numberLabel = 'Phone number',
  invalid,
  className,
  disabled,
  id: idProp,
  ...props
}: PhoneInputProps) {
  const scope = useId()
  const id = idProp ?? `${scope}-phone`
  const [internal, setInternal] = useState(defaultValue)

  const current = value ?? internal
  const { country, national } = useMemo(
    () => split(current, countries, defaultCountry),
    [current, countries, defaultCountry],
  )

  // Loose on purpose: enough to catch a typo, never enough to reject a real
  // number the caller's telephony provider would have accepted.
  const valid = national.length >= 6 && national.length <= 15

  const emit = (dial: string, digits: string) => {
    const next = digits ? `+${dial}${digits}` : ''
    if (value === undefined) setInternal(next)
    onChange?.(next)
    onValidChange?.(digits.length >= 6 && digits.length <= 15)
  }

  return (
    <div
      data-slot="phone-input"
      className={cn(
        fieldBase, fieldOutline,
        fieldSize[size],
        'flex items-center gap-0 ps-0 pe-0',
        invalid || (current && !valid) ? 'border-[var(--destructive)]' : '',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <select
        aria-label={countryLabel}
        value={country?.code}
        disabled={disabled}
        onChange={(event) => {
          const next = countries.find((c) => c.code === event.target.value)
          if (next) emit(next.dial, national)
        }}
        className={cn(
          'text-muted-foreground h-full cursor-pointer appearance-none bg-transparent ps-3 pe-1 text-sm outline-none',
          radius.control,
        )}
      >
        {countries.map((option) => (
          <option key={option.code} value={option.code}>
            {option.flag ? `${option.flag} ` : ''}
            +{option.dial}
          </option>
        ))}
      </select>

      <span aria-hidden="true" className="bg-border mx-1 h-4 w-px shrink-0" />

      <input
        id={id}
        type="tel"
        aria-label={numberLabel}
        // `tel` gets the phone keypad on mobile; `autoComplete` lets a password
        // manager fill it, which people expect for a phone field.
        autoComplete="tel-national"
        inputMode="tel"
        value={group(national)}
        disabled={disabled}
        aria-invalid={invalid || (Boolean(current) && !valid) || undefined}
        onChange={(event) => emit(country?.dial ?? '1', event.target.value.replace(/\D/g, ''))}
        className="min-w-0 flex-1 bg-transparent pe-3 text-sm outline-none"
        {...props}
      />
    </div>
  )
}

export { PhoneInput }
export type { PhoneInputProps }
