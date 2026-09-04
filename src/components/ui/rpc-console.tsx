import { useMemo, useState, type ComponentProps } from 'react'
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The JSON-RPC wire between a client and an MCP server.
 *
 * When an MCP integration misbehaves, the answer is almost always in the
 * traffic: a method that was never called, a capability that was not
 * negotiated, an error code buried in a response nobody read. A console that
 * shows only tool calls hides all three.
 *
 * **Requests and responses are paired by `id`, not just listed.** That pairing
 * is what produces the latency figure and what makes an unanswered request
 * visible — a request with no matching response is the single most useful thing
 * this view can show, and a flat log renders it as an ordinary row.
 *
 * Notifications have no id by definition, so they are never paired and are
 * marked as their own kind rather than looking like an orphaned request.
 *
 * Payloads are collapsed. An `initialize` response carries every capability the
 * server has, and expanding it by default buries the next twenty messages.
 */
export type RpcMessage = {
  /** Row identity. Not the JSON-RPC id — several messages share that. */
  key: string
  direction: 'out' | 'in'
  /** JSON-RPC method. Absent on a response. */
  method?: string
  /** JSON-RPC id. Absent on a notification. */
  id?: string | number
  kind?: 'request' | 'response' | 'notification' | 'error'
  /** The params or result, pretty-printed by the caller or passed raw. */
  payload?: unknown
  /** Error code and message, when the response carried one. */
  error?: { code: number; message: string }
  /** Already formatted — this component does not own your locale. */
  at?: string
  /** Round-trip in ms. Computed by the caller, or derived from pairing. */
  durationMs?: number
}

type RpcConsoleProps = Omit<ComponentProps<'div'>, 'children'> & {
  messages: RpcMessage[]
  /** Hide everything but errors and unanswered requests. */
  onlyProblems?: boolean
  /** Levels of the payload to pretty-print. */
  emptyLabel?: string
  label?: string
  outLabel?: string
  inLabel?: string
  pendingLabel?: string
}

/** A request with no response sharing its id is still in flight — or lost. */
function findUnanswered(messages: RpcMessage[]) {
  const answered = new Set(
    messages
      .filter((message) => message.direction === 'in' && message.id !== undefined)
      .map((message) => String(message.id)),
  )
  return new Set(
    messages
      .filter(
        (message) =>
          message.direction === 'out' &&
          message.id !== undefined &&
          !answered.has(String(message.id)),
      )
      .map((message) => message.key),
  )
}

function RpcConsole({
  messages,
  onlyProblems = false,
  emptyLabel = 'No traffic yet.',
  label = 'JSON-RPC traffic',
  outLabel = 'Sent',
  inLabel = 'Received',
  className,
  ...props
}: RpcConsoleProps) {
  const [open, setOpen] = useState<string | null>(null)
  const unanswered = useMemo(() => findUnanswered(messages), [messages])

  const rows = onlyProblems
    ? messages.filter((message) => message.error || unanswered.has(message.key))
    : messages

  return (
    <div
      data-slot="rpc-console"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <ul aria-label={label} className="divide-border/60 list-none divide-y">
          {rows.map((message) => {
            const pending = unanswered.has(message.key)
            const expanded = open === message.key
            const notification = message.kind === 'notification' || message.id === undefined

            const Icon = notification
              ? Bell
              : message.direction === 'out'
                ? ArrowUpRight
                : ArrowDownLeft

            return (
              <li key={message.key}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Hide' : 'Show'} payload for ${message.method ?? `response ${message.id}`}`}
                  onClick={() => setOpen(expanded ? null : message.key)}
                  className="hover:bg-accent/40 flex w-full items-center gap-2.5 px-3 py-2 text-start"
                >
                  <ChevronRight
                    className={cn(
                      'text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
                      expanded && 'rotate-90',
                    )}
                    aria-hidden="true"
                  />

                  <Icon
                    className={cn(
                      'size-3.5 shrink-0',
                      message.error
                        ? 'text-[var(--destructive-soft-foreground)]'
                        : message.direction === 'out'
                          ? 'text-[var(--blue-soft-foreground)]'
                          : 'text-muted-foreground',
                    )}
                    aria-label={message.direction === 'out' ? outLabel : inLabel}
                  />

                  <code className="min-w-0 flex-1 truncate font-mono text-xs">
                    {message.method ?? <span className="text-muted-foreground">result</span>}
                  </code>

                  {message.id !== undefined && (
                    <span className="text-muted-foreground/50 shrink-0 font-mono text-[11px]">
                      #{message.id}
                    </span>
                  )}

                  {message.error && (
                    <Badge size="sm" color="destructive">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      {message.error.code}
                    </Badge>
                  )}

                  {pending && !message.error && (
                    <Badge size="sm" color="amber">
                      no reply
                    </Badge>
                  )}

                  {message.durationMs !== undefined && (
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
                      {message.durationMs}ms
                    </span>
                  )}

                  {message.at && (
                    <span className="text-muted-foreground/50 hidden shrink-0 font-mono text-[11px] tabular-nums sm:block">
                      {message.at}
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="bg-muted/40 border-border border-t px-3 py-2.5">
                    {message.error && (
                      <p className="mb-2 font-mono text-xs text-[var(--destructive-soft-foreground)]">
                        {message.error.code}: {message.error.message}
                      </p>
                    )}
                    <pre className="text-muted-foreground overflow-x-auto font-mono text-[11px] leading-relaxed">
                      {typeof message.payload === 'string'
                        ? message.payload
                        : JSON.stringify(message.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { RpcConsole, findUnanswered as rpcUnanswered }
export type { RpcConsoleProps }
