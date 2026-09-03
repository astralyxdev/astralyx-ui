import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A server-to-server postback URL with its macros.
 *
 * The available macros are listed and validated against the URL. A postback
 * missing `{click_id}` silently attributes nothing — the requests arrive, they
 * return 200, and no conversion is ever matched — so an unresolved or unknown
 * macro is called out before it ships rather than discovered in a reconciliation
 * weeks later.
 *
 * `http://` is flagged. Postbacks carry payout amounts and click identifiers,
 * and sending them in the clear is a real leak, not a style preference.
 */
export type Macro = { token: string; description: ReactNode; required?: boolean }

/**
 * Default formatters at module scope — an inline arrow default is a value
 * the React Compiler cannot reorder, and it bails on the whole component.
 */
const DEFAULT_UNKNOWN_NOTE = (tokens: string[]) =>
  `Unknown macro${tokens.length > 1 ? 's' : ''}: ${tokens.join(', ')}`
const DEFAULT_MISSING_NOTE = (tokens: string[]) =>
    `Missing ${tokens.join(', ')} — conversions will arrive but match nothing.`

function PostbackConfig({
  url: urlProp,
  onUrlChange,
  macros,
  method = 'GET',
  onMethodChange,
  lastFired,
  status,
  urlLabel = 'Postback URL',
  urlPlaceholder = 'https://tracker.example.com/pb?cid={click_id}&payout={payout}',
  macrosLabel = 'Available macros',
  requiredLabel = 'required',
  inUseLabel = 'in use',
  insecureNote = 'This posts click identifiers and payouts over plain HTTP.',
  missingNote = DEFAULT_MISSING_NOTE,
  unknownNote = DEFAULT_UNKNOWN_NOTE,
  statusLabels = { ok: 'Firing', failing: 'Failing', untested: 'Not tested' },
  lastFiredLabel = 'last fired',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  url?: string
  onUrlChange?: (url: string) => void
  macros: Macro[]
  method?: 'GET' | 'POST'
  onMethodChange?: (method: 'GET' | 'POST') => void
  lastFired?: ReactNode
  status?: 'ok' | 'failing' | 'untested'
  urlLabel?: ReactNode
  urlPlaceholder?: string
  macrosLabel?: ReactNode
  /** Badge on a macro that must appear in the URL. */
  requiredLabel?: ReactNode
  /** Accessible name for the tick beside a macro already in the URL. */
  inUseLabel?: string
  insecureNote?: ReactNode
  /** Warning for required macros absent from the URL. */
  missingNote?: (tokens: string[]) => ReactNode
  unknownNote?: (tokens: string[]) => ReactNode
  statusLabels?: { ok?: ReactNode; failing?: ReactNode; untested?: ReactNode }
  /** Precedes the last-fired time. */
  lastFiredLabel?: ReactNode
}) {
  const controlled = urlProp !== undefined
  const [uncontrolled, setUncontrolled] = useState('')
  const url = controlled ? urlProp : uncontrolled

  const analysis = useMemo(() => {
    const used = [...url.matchAll(/\{(\w+)\}/g)].map((match) => match[1])
    const known = new Set(macros.map((macro) => macro.token))
    return {
      used,
      unknown: used.filter((token) => !known.has(token)),
      missing: macros.filter((macro) => macro.required && !used.includes(macro.token)),
      insecure: url.startsWith('http://'),
    }
  }, [url, macros])

  const set = (next: string) => {
    if (!controlled) setUncontrolled(next)
    onUrlChange?.(next)
  }

  return (
    <div
      data-slot="postback-config"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="postback-url">{urlLabel}</Label>
          <Input
            id="postback-url"
            value={url}
            placeholder={urlPlaceholder}
            error={analysis.missing.length > 0 || analysis.unknown.length > 0}
            onChange={(event) => set(event.target.value)}
            className="font-mono text-xs"
          />
        </div>

        {onMethodChange && (
          <Select
            size="default"
            value={method}
            onValueChange={(next) => onMethodChange(next as 'GET' | 'POST')}
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
            ]}
            className="w-24 shrink-0"
          />
        )}

        {url && <CopyButton value={url} label="Copy postback URL" />}
      </div>

      {/* Called out before it ships, not found in a reconciliation later. */}
      {analysis.missing.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {missingNote(analysis.missing.map((macro) => `{${macro.token}}`))}
        </p>
      )}

      {analysis.unknown.length > 0 && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">
          {unknownNote(analysis.unknown.map((token) => `{${token}}`))}
        </p>
      )}

      {analysis.insecure && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">
          {insecureNote}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs font-medium">{macrosLabel}</span>
        <ul className="grid list-none gap-1.5 sm:grid-cols-2">
          {macros.map((macro) => {
            const used = analysis.used.includes(macro.token)
            return (
              <li key={macro.token} className="flex items-start gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => set(url + `{${macro.token}}`)}
                  className={cn(
                    'bg-secondary hover:bg-accent shrink-0 px-1.5 py-0.5 font-mono',
                    radius.xs,
                  )}
                >
                  {`{${macro.token}}`}
                </button>
                <span className="text-muted-foreground min-w-0 flex-1">{macro.description}</span>
                {used && <Check className="size-3.5 shrink-0 text-[var(--green-soft-foreground)]" aria-label={inUseLabel} />}
                {macro.required && !used && (
                  <Badge size="sm" color="destructive">
                    {requiredLabel}
                  </Badge>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {(lastFired || status) && (
        <div className="border-border text-muted-foreground flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
          {status && (
            <Badge
              size="sm"
              color={status === 'ok' ? 'green' : status === 'failing' ? 'destructive' : 'neutral'}
            >
              {status === 'ok'
                ? statusLabels.ok
                : status === 'failing'
                  ? statusLabels.failing
                  : statusLabels.untested}
            </Badge>
          )}
          {lastFired && (
            <span>
              {lastFiredLabel} {lastFired}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export { PostbackConfig }
