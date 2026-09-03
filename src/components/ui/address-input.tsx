import { useId, type ComponentProps, type ReactNode } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * A structured postal address whose shape follows the selected country.
 *
 * The country comes first and everything below it re-labels. A US form asks for
 * a State and a ZIP code; a UK one asks for a County and a Postcode and treats
 * the region as optional; Japan puts the postal code above the prefecture.
 * Shipping the US layout to everyone is how forms end up rejecting valid
 * addresses.
 *
 * Nothing is validated against a format table beyond requiredness. Postal code
 * regexes are famously wrong — Irish Eircodes, BFPO addresses, new UK districts
 * — and a form that refuses a real address is worse than one that accepts a
 * typo the courier will query.
 *
 * `autoComplete` tokens are set on every field. The browser can fill a whole
 * address from one tap, and it only does so when the tokens are right.
 */
export type AddressValue = {
  country: string
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
}

type CountryRules = {
  regionLabel: string
  postalLabel: string
  regionRequired: boolean
  postalRequired: boolean
  /** Postal code sits above city and region. */
  postalFirst?: boolean
}

const DEFAULT_RULES: CountryRules = {
  regionLabel: 'Region',
  postalLabel: 'Postal code',
  regionRequired: false,
  postalRequired: true,
}

const RULES: Record<string, CountryRules> = {
  US: { regionLabel: 'State', postalLabel: 'ZIP code', regionRequired: true, postalRequired: true },
  CA: { regionLabel: 'Province', postalLabel: 'Postal code', regionRequired: true, postalRequired: true },
  GB: { regionLabel: 'County', postalLabel: 'Postcode', regionRequired: false, postalRequired: true },
  IE: { regionLabel: 'County', postalLabel: 'Eircode', regionRequired: false, postalRequired: false },
  AU: { regionLabel: 'State', postalLabel: 'Postcode', regionRequired: true, postalRequired: true },
  DE: { regionLabel: 'State', postalLabel: 'Postleitzahl', regionRequired: false, postalRequired: true },
  FR: { regionLabel: 'Region', postalLabel: 'Code postal', regionRequired: false, postalRequired: true },
  NL: { regionLabel: 'Province', postalLabel: 'Postcode', regionRequired: false, postalRequired: true },
  JP: { regionLabel: 'Prefecture', postalLabel: '郵便番号', regionRequired: true, postalRequired: true, postalFirst: true },
  // Hong Kong, the UAE and a handful of others have no postal codes at all.
  HK: { regionLabel: 'District', postalLabel: 'Postal code', regionRequired: false, postalRequired: false },
  AE: { regionLabel: 'Emirate', postalLabel: 'Postal code', regionRequired: true, postalRequired: false },
}

const COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'SE',
  'NO', 'DK', 'FI', 'PL', 'PT', 'CH', 'AT', 'JP', 'SG', 'HK', 'AE', 'IN', 'BR',
  'MX', 'ZA',
]

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

const EMPTY: AddressValue = {
  country: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
}

function AddressInput({
  value = EMPTY,
  onValueChange,
  countries = COUNTRIES,
  size = 'default',
  disabled,
  countryLabel = 'Country',
  countryPlaceholder = 'Select country…',
  countrySearchPlaceholder = 'Search countries…',
  addressLabel = 'Address',
  addressLine2Label = 'Apartment, suite, etc.',
  cityLabel = 'City',
  optionalLabel = '(optional)',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'value'> & {
  value?: AddressValue
  onValueChange?: (value: AddressValue) => void
  countries?: string[]
  size?: 'sm' | 'default'
  disabled?: boolean
  countryLabel?: ReactNode
  countryPlaceholder?: string
  countrySearchPlaceholder?: string
  addressLabel?: string
  addressLine2Label?: string
  cityLabel?: string
  /** Suffix marking a non-required field. */
  optionalLabel?: ReactNode
}) {
  const scope = useId()
  const rules = RULES[value.country] ?? DEFAULT_RULES

  const set = (patch: Partial<AddressValue>) => onValueChange?.({ ...value, ...patch })

  const field = (
    key: keyof AddressValue,
    label: string,
    autoComplete: string,
    required = false,
    extra?: string,
  ) => (
    <div className={cn('flex flex-col gap-1.5', extra)}>
      <Label htmlFor={`${scope}-${key}`} className="text-xs">
        {label}
        {!required && key !== 'line1' && key !== 'city' && (
          <span className="text-muted-foreground font-normal"> {optionalLabel}</span>
        )}
      </Label>
      <Input
        id={`${scope}-${key}`}
        size={size}
        value={value[key]}
        disabled={disabled}
        required={required}
        // One tap fills the lot — but only when these tokens are right.
        autoComplete={autoComplete}
        onChange={(event) => set({ [key]: event.target.value } as Partial<AddressValue>)}
      />
    </div>
  )

  const postal = rules.postalRequired || value.postalCode
    ? field('postalCode', rules.postalLabel, 'postal-code', rules.postalRequired)
    : null

  return (
    <div
      data-slot="address-input"
      className={cn('grid gap-3 sm:grid-cols-2', className)}
      {...props}
    >
      {/* First, because everything below it re-labels. */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${scope}-country`} className="text-xs">
          {countryLabel}
        </Label>
        <Combobox
          size={size === 'sm' ? 'sm' : 'md'}
          value={value.country}
          disabled={disabled}
          placeholder={countryPlaceholder}
          searchPlaceholder={countrySearchPlaceholder}
          options={countries.map((code) => ({ value: code, label: countryName(code) }))}
          onValueChange={(country) => set({ country })}
        />
      </div>

      {field('line1', addressLabel, 'address-line1', true, 'sm:col-span-2')}
      {field('line2', addressLine2Label, 'address-line2', false, 'sm:col-span-2')}

      {rules.postalFirst && postal}
      {field('city', cityLabel, 'address-level2', true)}
      {field('region', rules.regionLabel, 'address-level1', rules.regionRequired)}
      {!rules.postalFirst && postal}
    </div>
  )
}

export { AddressInput, RULES as addressRules, EMPTY as emptyAddress }
