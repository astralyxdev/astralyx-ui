import type { ComponentProps, ReactNode } from 'react'
import { Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Compose an HTTP request: method, URL, headers, query and body.
 *
 * Query parameters are edited as rows, not as a query string. Hand-editing a
 * URL is where encoding bugs come from — a `&` inside a value silently becomes
 * a parameter boundary — and the assembled URL is shown read-only underneath so
 * you can still see exactly what will be sent.
 *
 * Query, headers and body are stacked disclosures rather than tabs. Their
 * heights differ a lot, so a shared tab panel resizes the card on every switch
 * and the strip moves out from under the pointer. Stacking also lets you see
 * the parameters and the body at once, which is what composing a request takes.
 *
 * Rows can be disabled rather than only deleted. Toggling a header off to test
 * something and back on again is the actual workflow; deleting it means
 * retyping it.
 *
 * The body tab is disabled for methods that do not carry one. GET with a body
 * is legal in the RFC, widely unsupported in practice, and offering it invites
 * an afternoon debugging a proxy that stripped it.
 */
export type RequestRow = { id: string; name: string; value: string; enabled?: boolean }

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
const BODYLESS = new Set(['GET', 'HEAD'])

function RequestBuilder({
  method = 'GET',
  onMethodChange,
  url = '',
  onUrlChange,
  headers = [],
  onHeadersChange,
  params = [],
  onParamsChange,
  body = '',
  onBodyChange,
  onSend,
  sending = false,
  urlPlaceholder = 'https://api.example.com/v1/users',
  urlLabel = 'Request URL',
  sendLabel = 'Send',
  headersLabel = 'Headers',
  paramsLabel = 'Query',
  bodyLabel = 'Body',
  addLabel = 'Add row',
  removeLabel = 'Remove row',
  enableLabel = 'Include this row',
  nameePlaceholder = 'name',
  valuePlaceholder = 'value',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'children'> & {
  method?: string
  onMethodChange?: (method: string) => void
  url?: string
  onUrlChange?: (url: string) => void
  headers?: RequestRow[]
  onHeadersChange?: (rows: RequestRow[]) => void
  params?: RequestRow[]
  onParamsChange?: (rows: RequestRow[]) => void
  body?: string
  onBodyChange?: (body: string) => void
  onSend?: () => void
  sending?: boolean
  urlPlaceholder?: string
  urlLabel?: string
  sendLabel?: ReactNode
  headersLabel?: ReactNode
  paramsLabel?: ReactNode
  bodyLabel?: ReactNode
  addLabel?: ReactNode
  removeLabel?: string
  enableLabel?: string
  nameePlaceholder?: string
  valuePlaceholder?: string
}) {
  const bodyless = BODYLESS.has(method.toUpperCase())

  // Built with URL so values are encoded properly, not concatenated.
  const assembled = (() => {
    const active = params.filter((row) => row.enabled !== false && row.name)
    if (!url) return ''
    try {
      const parsed = new URL(url.includes('://') ? url : `https://${url}`)
      for (const row of active) parsed.searchParams.set(row.name, row.value)
      return parsed.toString()
    } catch {
      return url
    }
  })()

  const rowEditor = (
    rows: RequestRow[],
    onChange: ((rows: RequestRow[]) => void) | undefined,
  ) => (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          {/* Disable, don't delete — toggling off and on is the real workflow. */}
          <Switch
            size="sm"
            checked={row.enabled !== false}
            aria-label={enableLabel}
            onChange={(event) =>
              onChange?.(
                rows.map((r, i) => (i === index ? { ...r, enabled: event.target.checked } : r)),
              )
            }
          />
          <Input
            size="sm"
            value={row.name}
            placeholder={nameePlaceholder}
            containerClassName="flex-1"
            className="font-mono text-xs"
            onChange={(event) =>
              onChange?.(rows.map((r, i) => (i === index ? { ...r, name: event.target.value } : r)))
            }
          />
          <Input
            size="sm"
            value={row.value}
            placeholder={valuePlaceholder}
            containerClassName="flex-1"
            className="font-mono text-xs"
            onChange={(event) =>
              onChange?.(rows.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)))
            }
          />
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={removeLabel}
            onClick={() => onChange?.(rows.filter((_, i) => i !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        className="self-start"
        onClick={() =>
          onChange?.([...rows, { id: `row-${Date.now()}`, name: '', value: '', enabled: true }])
        }
      >
        <Plus />
        {addLabel}
      </Button>
    </div>
  )

  return (
    <div
      data-slot="request-builder"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <Select
          size="sm"
          className="w-28 shrink-0"
          aria-label="Method"
          value={method}
          onValueChange={(next) => onMethodChange?.(next)}
          options={METHODS.map((m) => ({ value: m, label: m }))}
        />
        <Input
          size="sm"
          value={url}
          placeholder={urlPlaceholder}
          aria-label={urlLabel}
          containerClassName="min-w-40 flex-1"
          className="font-mono text-xs"
          onChange={(event) => onUrlChange?.(event.target.value)}
        />
        {onSend && (
          <Button size="sm" disabled={sending || !url} onClick={onSend}>
            <Send />
            {sendLabel}
          </Button>
        )}
      </div>

      <Section title={paramsLabel} count={params.length} defaultOpen>
        {rowEditor(params, onParamsChange)}
      </Section>

      <Section title={headersLabel} count={headers.length}>
        {rowEditor(headers, onHeadersChange)}
      </Section>

      {/* A GET body is legal in the RFC and widely stripped by proxies.
          Offering it invites an afternoon of debugging. */}
      {!bodyless && (
        <Section title={bodyLabel}>
          <Textarea
            rows={6}
            value={body}
            className="font-mono text-xs"
            aria-label={typeof bodyLabel === 'string' ? bodyLabel : 'Body'}
            onChange={(event) => onBodyChange?.(event.target.value)}
          />
        </Section>
      )}

      {assembled && (
        <p className="border-border text-muted-foreground border-t p-3 font-mono text-xs break-all">
          {assembled}
        </p>
      )}
    </div>
  )
}

/** One disclosure row, at module scope so it is a stable component type. */
function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-border border-t">
      <CollapsibleTrigger className="hover:bg-accent/40 w-full p-3 text-start text-xs font-medium">
        <span className="flex-1">{title}</span>
        {count !== undefined && count > 0 && (
          <Badge size="sm" color="neutral">
            {count}
          </Badge>
        )}
      </CollapsibleTrigger>
      {/* Padding goes on the inner content, not on CollapsibleContent itself:
          that element's height is animated from its child's measured height,
          so padding on the wrapper is excluded from the measurement and the
          panel opens to the padding alone. */}
      <CollapsibleContent>
        <div className="p-3 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { RequestBuilder }
