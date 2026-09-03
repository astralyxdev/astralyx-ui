import type { ComponentProps, ReactNode } from 'react'
import { CodeBlock } from '@/components/ui/code-block'
import type { Language } from '@/lib/highlighter'
import { HttpStatus } from '@/components/ui/http-status'
import { JsonViewer, type Json } from '@/components/ui/json-viewer'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An HTTP response: status, timing, size, headers and body.
 *
 * Status, time and size sit together on one line because they are read
 * together — a 200 that took 4 seconds and returned 8MB is a different result
 * from a 200 that took 40ms, and separating them into panels makes that
 * comparison impossible.
 *
 * Body, headers and raw are stacked disclosures rather than tabs. Their heights
 * differ by an order of magnitude, so a shared tab panel resizes the card on
 * every switch — the strip moves out from under the pointer and the next click
 * lands on nothing. Stacking also lets headers and body be read together, which
 * is what diagnosing a response actually takes.
 *
 * A JSON body gets the tree view, anything else gets syntax-highlighted text.
 * Rendering JSON as a wall of text is technically honest and practically
 * useless; rendering HTML as a tree is nonsense.
 *
 * Header names are lower-cased for display. HTTP header names are
 * case-insensitive and servers are inconsistent about them, so preserving the
 * original casing means `Content-Type` and `content-type` sort apart in a list
 * someone is scanning alphabetically.
 */
export type ResponseHeader = { name: string; value: string }

function ResponseViewer({
  status,
  statusText,
  durationMs,
  sizeBytes,
  headers = [],
  body,
  contentType,
  bodyLabel = 'Body',
  headersLabel = 'Headers',
  rawLabel = 'Raw',
  emptyBodyLabel = 'No body',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  status: number
  statusText?: string
  durationMs?: number
  sizeBytes?: number
  headers?: ResponseHeader[]
  /** A string, or a parsed object for the tree view. */
  body?: string | object
  contentType?: string
  bodyLabel?: ReactNode
  headersLabel?: ReactNode
  rawLabel?: ReactNode
  emptyBodyLabel?: ReactNode
}) {
  const json =
    typeof body === 'object' && body !== null
      ? (body as Json)
      : typeof body === 'string' && /json/i.test(contentType ?? '')
        ? (() => {
            try {
              return JSON.parse(body) as Json
            } catch {
              return undefined
            }
          })()
        : undefined

  const raw = typeof body === 'string' ? body : body ? JSON.stringify(body, null, 2) : ''
  // The highlighter has no plain-text grammar; JSON is the closest neutral one.
  const language: Language = /html|xml/i.test(contentType ?? '')
    ? 'html'
    : /json/i.test(contentType ?? '')
      ? 'json'
      : 'bash'

  return (
    <div
      data-slot="response-viewer"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {/* Status, time and size on one line: they are only meaningful together. */}
      <div className="border-border flex flex-wrap items-center gap-3 border-b p-3">
        <HttpStatus status={status} phrase={statusText} />
        {durationMs !== undefined && (
          <span
            className={cn(
              'text-xs tabular-nums',
              durationMs > 1000 ? 'text-[var(--amber-soft-foreground)]' : 'text-muted-foreground',
            )}
          >
            {durationMs < 1000 ? `${Math.round(durationMs)}ms` : `${(durationMs / 1000).toFixed(2)}s`}
          </span>
        )}
        {sizeBytes !== undefined && (
          <span className="text-muted-foreground text-xs tabular-nums">
            <Fmt type="bytes" value={sizeBytes} />
          </span>
        )}
        {contentType && (
          <span className="text-muted-foreground/70 ms-auto truncate font-mono text-xs">
            {contentType}
          </span>
        )}
      </div>

      <Section title={bodyLabel} defaultOpen>
        {json !== undefined ? (
          <JsonViewer value={json} defaultExpandedDepth={2} />
        ) : raw ? (
          <CodeBlock code={raw} language={language} maxLines={20} header={false} />
        ) : (
          <p className="text-muted-foreground p-4 text-center text-sm">{emptyBodyLabel}</p>
        )}
      </Section>

      <Section title={headersLabel} count={headers.length}>
        <dl className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 font-mono text-xs">
          {[...headers]
            // Lower-cased and sorted: HTTP header names are case-insensitive
            // and servers are inconsistent, which breaks an A–Z scan.
            .map((h) => ({ name: h.name.toLowerCase(), value: h.value }))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((header) => (
              <div key={header.name} className="contents">
                <dt className="text-muted-foreground truncate">{header.name}</dt>
                <dd className="min-w-0 break-all">{header.value}</dd>
              </div>
            ))}
        </dl>
      </Section>

      <Section title={rawLabel}>
        <CodeBlock code={raw || '(empty)'} language={language} maxLines={24} header={false} />
      </Section>

    </div>
  )
}

/**
 * One disclosure row. At module scope so it is not a new component type on
 * every render of the viewer.
 */
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
    <Collapsible defaultOpen={defaultOpen} className="border-border border-t first:border-t-0">
      <CollapsibleTrigger className="hover:bg-accent/40 w-full p-3 text-start text-xs font-medium">
        <span className="flex-1">{title}</span>
        {count !== undefined && (
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

export { ResponseViewer }
