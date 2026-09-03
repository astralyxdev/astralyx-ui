import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Builds a tagged campaign URL.
 *
 * Values are lower-cased and spaces become underscores, because analytics tools
 * treat `Summer Sale`, `summer sale` and `summer_sale` as three different
 * campaigns. Cleaning at the point the link is made is the only reliable place
 * — nobody reconciles them afterwards.
 *
 * Existing query parameters on the base URL are preserved rather than
 * overwritten. Pasting a link that already carries a referral code and having
 * it silently dropped is how attribution disappears.
 *
 * Encoding is done by `URL`, not by hand. A campaign name with an ampersand
 * quietly truncates every parameter after it when the string is concatenated.
 */
type UtmField = {
  key: string
  label: string
  placeholder: string
  required?: boolean
}

const FIELDS: UtmField[] = [
  { key: 'utm_source', label: 'Source', placeholder: 'newsletter', required: true },
  { key: 'utm_medium', label: 'Medium', placeholder: 'email', required: true },
  { key: 'utm_campaign', label: 'Campaign', placeholder: 'summer_sale', required: true },
  { key: 'utm_term', label: 'Term', placeholder: 'running+shoes' },
  { key: 'utm_content', label: 'Content', placeholder: 'header_link' },
]

/** Lower-case, underscores for spaces — three spellings become one campaign. */
function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

function UtmBuilder({
  baseUrl: baseProp,
  onUrlChange,
  destinationLabel = 'Destination URL',
  destinationPlaceholder = 'https://example.com/pricing',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  baseUrl?: string
  onUrlChange?: (url: string) => void
  destinationLabel?: ReactNode
  destinationPlaceholder?: string
}) {
  const [base, setBase] = useState(baseProp ?? '')
  const [values, setValues] = useState<Record<string, string>>({})

  const { url, error } = useMemo(() => {
    if (!base.trim()) return { url: '', error: undefined }
    try {
      // `URL` handles encoding and keeps existing parameters intact.
      const parsed = new URL(base.includes('://') ? base : `https://${base}`)
      for (const field of FIELDS) {
        const value = normalise(values[field.key] ?? '')
        if (value) parsed.searchParams.set(field.key, value)
      }
      return { url: parsed.toString(), error: undefined }
    } catch {
      return { url: '', error: 'That does not look like a valid URL.' }
    }
  }, [base, values])

  const missing = FIELDS.filter(
    (field) => field.required && !normalise(values[field.key] ?? ''),
  )

  return (
    <div
      data-slot="utm-builder"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="utm-base">{destinationLabel}</Label>
        <Input
          id="utm-base"
          value={base}
          placeholder={destinationPlaceholder}
          error={Boolean(error)}
          onChange={(event) => setBase(event.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`utm-${field.key}`} className="font-mono text-xs">
              {field.key}
              {field.required && <span className="text-muted-foreground"> *</span>}
            </Label>
            <Input
              id={`utm-${field.key}`}
              size="sm"
              placeholder={field.placeholder}
              value={values[field.key] ?? ''}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.key]: event.target.value }))
              }
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {missing.length > 0 && !error && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">
          {missing.map((field) => field.label).join(', ')} needed for attribution to work.
        </p>
      )}

      <div className={cn('bg-secondary/60 flex items-start gap-2 p-3', radius.control)}>
        <code className="min-w-0 flex-1 font-mono text-xs break-all">
          {url || 'Your tagged URL will appear here'}
        </code>
        {url && (
          <CopyButton
            value={url}
            label="Copy tagged URL"
            onClick={() => onUrlChange?.(url)}
          />
        )}
      </div>
    </div>
  )
}

export { UtmBuilder, normalise as normaliseUtm }
