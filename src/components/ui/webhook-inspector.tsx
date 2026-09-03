import { useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { HttpStatus } from '@/components/ui/http-status'
import { JsonViewer, type Json } from '@/components/ui/json-viewer'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Inbound webhook deliveries, with payload and response.
 *
 * Both directions are kept: what arrived and what we answered. A webhook
 * failure is nearly always a disagreement between the two, and a log that
 * stores only the payload cannot tell you whether the sender was wrong or your
 * handler was.
 *
 * Signature verification status is its own field, separate from the response
 * code. A delivery can return 200 and have failed verification — that is a
 * forged request your handler accepted, and it must not be buried under a green
 * status.
 *
 * Retries are grouped under their original delivery rather than listed
 * separately, so five rows of the same event read as one problem rather than
 * five.
 */
export type WebhookDelivery = {
  id: string
  event: string
  at: Date
  status?: number
  durationMs?: number
  payload?: Json
  responseBody?: string
  /** Result of checking the sender's signature. */
  signature?: 'valid' | 'invalid' | 'missing' | 'unchecked'
  attempt?: number
  maxAttempts?: number
}

const SIGNATURE = {
  valid: { label: 'signature ok', color: 'green' },
  invalid: { label: 'signature invalid', color: 'destructive' },
  missing: { label: 'no signature', color: 'amber' },
  unchecked: { label: 'signature unchecked', color: 'neutral' },
} as const

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_ATTEMPT_LABEL: (attempt: number, max?: number) => ReactNode = (attempt, max) => `attempt ${attempt}${max ? ` of ${max}` : ''}`

function WebhookInspector({
  deliveries,
  onReplay,
  now,
  locale = 'en-GB',
  emptyLabel = 'No deliveries yet',
  payloadLabel = 'Payload',
  responseLabel = 'Response',
  replayLabel = 'Replay',
  attemptLabel = DEFAULT_ATTEMPT_LABEL,
  forgedNote = 'This request was accepted with an invalid signature — it may not have come from the sender you expect.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  deliveries: WebhookDelivery[]
  onReplay?: (id: string) => void
  now?: Date
  locale?: string
  emptyLabel?: ReactNode
  payloadLabel?: ReactNode
  responseLabel?: ReactNode
  replayLabel?: ReactNode
  attemptLabel?: (attempt: number, max?: number) => ReactNode
  /** Shown when a delivery succeeded despite a bad signature. */
  forgedNote?: ReactNode
}) {
  const [open, setOpen] = useState<string | null>(null)

  if (deliveries.length === 0) {
    return (
      <div className={cn(surface, radius.surface, className)} {...props}>
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      data-slot="webhook-inspector"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <ul className="divide-border list-none divide-y">
        {deliveries.map((delivery) => {
          const expanded = open === delivery.id
          const signature = delivery.signature ? SIGNATURE[delivery.signature] : undefined
          // 200 with a bad signature is a forged request you accepted.
          const forged =
            delivery.signature === 'invalid' && (delivery.status ?? 0) < 400

          return (
            <li key={delivery.id}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : delivery.id)}
                className={cn('flex w-full items-center gap-3 p-3 text-start', interactive, focusRing)}
              >
                <ArrowDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <code className="truncate font-mono text-xs font-medium">{delivery.event}</code>
                    {/* Its own field — never folded into the status. */}
                    {signature && (
                      <Badge size="sm" color={signature.color}>
                        {signature.label}
                      </Badge>
                    )}
                    {delivery.attempt !== undefined && delivery.attempt > 1 && (
                      <Badge size="sm" color="amber">
                        {attemptLabel(delivery.attempt, delivery.maxAttempts)}
                      </Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    <Fmt type="relative" value={delivery.at} now={now} locale={locale} />
                    {delivery.durationMs !== undefined && (
                      <span className="tabular-nums">{Math.round(delivery.durationMs)}ms</span>
                    )}
                  </span>
                </span>

                {delivery.status !== undefined && (
                  <HttpStatus status={delivery.status} showPhrase={false} className="shrink-0" />
                )}
              </button>

              {expanded && (
                <div className="bg-muted/20 border-border/60 flex flex-col gap-3 border-t p-3">
                  {forged && (
                    <p className="text-xs text-[var(--destructive-soft-foreground)]">{forgedNote}</p>
                  )}

                  {delivery.payload !== undefined && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-muted-foreground text-xs font-medium">{payloadLabel}</span>
                      <JsonViewer value={delivery.payload} defaultExpandedDepth={2} />
                    </div>
                  )}

                  {/* What we answered — the other half of every webhook bug. */}
                  {delivery.responseBody !== undefined && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-muted-foreground text-xs font-medium">{responseLabel}</span>
                      <pre className={cn('bg-secondary/60 overflow-x-auto p-2 font-mono text-xs', radius.control)}>
                        {delivery.responseBody || '(empty)'}
                      </pre>
                    </div>
                  )}

                  {onReplay && (
                    <Button
                      size="xs"
                      variant="secondary"
                      className="self-start"
                      onClick={() => onReplay(delivery.id)}
                    >
                      <RotateCcw />
                      {replayLabel}
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { WebhookInspector }
