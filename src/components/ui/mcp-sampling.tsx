import type { ComponentProps, ReactNode } from 'react'
import { Bot, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A server asking the client to run a model on its behalf.
 *
 * MCP sampling inverts the usual direction: the server sends a request, and the
 * *client's* model and the *client's* budget answer it. That inversion is the
 * whole risk. A server you installed for its file search can ask for a
 * completion, and unless the client shows the request, nobody sees the prompt
 * that was sent or the tokens that were spent.
 *
 * So the messages are shown verbatim, before the buttons, in the order the
 * server proposed them — the same rule as `ToolApproval`, for the same reason.
 * `maxTokens` is displayed because it is what the request will cost, and a
 * request that omits it is flagged rather than defaulted quietly.
 *
 * Approve is not the primary action by default. This is a server spending your
 * budget on its own initiative; the emphasis belongs on reading it first.
 */
export type SamplingMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type McpSamplingProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  /** The server making the request. */
  server: string
  messages: SamplingMessage[]
  /** The server's stated intent, when it sends one. */
  intent?: ReactNode
  /** Ceiling the server asked for. Absent is flagged, not defaulted. */
  maxTokens?: number
  /** Model preference hints from the request. */
  modelHint?: string
  onApprove?: () => void
  onDeny?: () => void
  busy?: boolean
  approveLabel?: string
  denyLabel?: string
  messagesLabel?: string
  unboundedLabel?: string
}

const ROLE_TONE: Record<SamplingMessage['role'], string> = {
  system: 'text-[var(--violet-soft-foreground)]',
  user: 'text-[var(--blue-soft-foreground)]',
  assistant: 'text-muted-foreground',
}

function McpSampling({
  server,
  messages,
  intent,
  maxTokens,
  modelHint,
  onApprove,
  onDeny,
  busy = false,
  approveLabel = 'Run it',
  denyLabel = 'Deny',
  messagesLabel = 'Messages the server wants sent',
  unboundedLabel = 'No token ceiling requested',
  className,
  ...props
}: McpSamplingProps) {
  return (
    <div
      data-slot="mcp-sampling"
      role="alertdialog"
      aria-label={`Sampling request from ${server}`}
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <code className="font-mono font-medium">{server}</code>{' '}
            <span className="text-muted-foreground">wants to use your model.</span>
          </p>
          {intent && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{intent}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {maxTokens === undefined ? (
            <Badge size="sm" color="amber">
              <ShieldAlert className="size-3" aria-hidden="true" />
              {unboundedLabel}
            </Badge>
          ) : (
            <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
              ≤ {maxTokens.toLocaleString()} tokens
            </span>
          )}
          {modelHint && (
            <span className="text-muted-foreground/60 font-mono text-[11px]">{modelHint}</span>
          )}
        </div>
      </div>

      {/* Verbatim, in the server's order, before the buttons. */}
      <div>
        <p className="text-muted-foreground/70 mb-1.5 text-[11px] font-medium tracking-[0.14em] uppercase">
          {messagesLabel}
        </p>
        <ul className={cn('bg-muted/60 max-h-56 list-none space-y-2.5 overflow-auto p-3', radius.control)}>
          {messages.map((message, index) => (
            <li key={index} className="space-y-0.5">
              <p className={cn('font-mono text-[10px] tracking-wide uppercase', ROLE_TONE[message.role])}>
                {message.role}
              </p>
              <p className="text-foreground/85 text-xs leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {(onApprove || onDeny) && (
        <div className="flex flex-wrap gap-2">
          {/* Secondary, not primary: this is a server spending your budget on
              its own initiative, so the emphasis belongs on reading it. */}
          {onApprove && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={onApprove}>
              {approveLabel}
            </Button>
          )}
          {onDeny && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={onDeny}>
              {denyLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export { McpSampling }
export type { McpSamplingProps }
