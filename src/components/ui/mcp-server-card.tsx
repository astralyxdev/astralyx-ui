import type { ComponentProps, ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Spinner } from '@/components/ui/spinner'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * One MCP server: what it is, how it is attached, and what it brought with it.
 *
 * An MCP client is only as trustworthy as the servers plugged into it, and the
 * fact that decides that is the **command line**, not the name. A server called
 * "filesystem" tells you nothing; `npx @acme/fs-server --root /` tells you it
 * can read your home directory.
 *
 * Which is why the target gets its own full-width row and **wraps instead of
 * truncating**. The first version of this card put it in a single-line ellipsis
 * beside the name, which cut off `--root /` — hiding exactly the argument the
 * card exists to surface. A component that claims one field is the important
 * one and then clips it is arguing against itself.
 *
 * The body is a fixed three-band layout — identity, target, capabilities — with
 * the footer pinned to the bottom by `mt-auto`. Cards in a grid then line their
 * footers up even when one of them is carrying an error block and the others
 * are not, which is the usual way a card grid goes ragged.
 *
 * Status is a dot and a word rather than a badge, so it does not compete with
 * the transport chip beside it; capability counts are shown for all three kinds
 * with the zeroes dimmed, because "no prompts" is a real answer and hiding it
 * makes an absent capability indistinguishable from an unreported one.
 */
export type McpTransport = 'stdio' | 'http' | 'sse' | 'websocket'

export type McpStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

const STATUS: Record<McpStatus, { label: string; dot: string }> = {
  connected: { label: 'Connected', dot: 'bg-[var(--green-soft-foreground)]' },
  connecting: { label: 'Connecting', dot: 'bg-[var(--blue-soft-foreground)]' },
  disconnected: { label: 'Disconnected', dot: 'bg-muted-foreground/40' },
  error: { label: 'Failed', dot: 'bg-[var(--destructive-soft-foreground)]' },
}

type McpServerCardProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  name: string
  /** The command line or endpoint. Shown in full — never truncated. */
  target?: string
  transport?: McpTransport
  status?: McpStatus
  /** Protocol version negotiated at handshake. */
  protocolVersion?: string
  /** The server's own version string. */
  version?: string
  /** Counts per kind — they carry very different risk. */
  capabilities?: { tools?: number; resources?: number; prompts?: number }
  /** Handshake or runtime failure. */
  error?: ReactNode
  onReconnect?: () => void
  reconnectLabel?: string
  /** Copy the target. Off for an endpoint nobody needs on the clipboard. */
  copyTarget?: boolean
  copyLabel?: string
  /** Trailing slot in the header — a menu, a disable switch. */
  actions?: ReactNode
  selected?: boolean
  onSelect?: () => void
  statusLabels?: Partial<Record<McpStatus, string>>
  capabilityLabels?: { tools?: string; resources?: string; prompts?: string }
}

function McpServerCard({
  name,
  target,
  transport = 'stdio',
  status = 'connected',
  protocolVersion,
  version,
  capabilities,
  error,
  onReconnect,
  reconnectLabel = 'Reconnect',
  copyTarget = true,
  copyLabel = 'Copy command',
  actions,
  selected = false,
  onSelect,
  statusLabels,
  capabilityLabels,
  className,
  ...props
}: McpServerCardProps) {
  const meta = STATUS[status]

  const counts = [
    { key: 'tools' as const, label: capabilityLabels?.tools ?? 'tools' },
    { key: 'resources' as const, label: capabilityLabels?.resources ?? 'resources' },
    { key: 'prompts' as const, label: capabilityLabels?.prompts ?? 'prompts' },
  ]
  const hasCounts = capabilities !== undefined
  const footer = version || protocolVersion || onReconnect

  return (
    <div
      data-slot="mcp-server-card"
      data-status={status}
      className={cn(
        surface,
        radius.surface,
        // `h-full` + `flex-col` + a footer on `mt-auto` is what keeps a grid of
        // these aligned when only some of them carry an error.
        'flex h-full flex-col gap-3.5 p-4',
        onSelect &&
          'hover:border-foreground/25 cursor-pointer transition-colors motion-reduce:transition-none',
        selected && 'border-primary ring-ring/40 ring-2',
        status === 'error' && 'border-destructive',
        className,
      )}
      onClick={onSelect}
      {...props}
    >
      <div className="flex items-center gap-2.5">
        {status === 'connecting' ? (
          <Spinner size="sm" label={statusLabels?.connecting ?? meta.label} className="shrink-0" />
        ) : (
          <span
            aria-hidden="true"
            className={cn('size-2 shrink-0 rounded-full', meta.dot)}
          />
        )}

        <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>

        <span className="text-muted-foreground shrink-0 text-xs">
          {statusLabels?.[status] ?? meta.label}
        </span>
        <span
          className={cn(
            'bg-secondary text-secondary-foreground shrink-0 px-1.5 py-0.5 font-mono text-[10px]',
            radius.xs,
          )}
        >
          {transport}
        </span>

        {actions && <span className="flex shrink-0 items-center gap-1">{actions}</span>}
      </div>

      {/* Full width, wrapping. Clipping this would hide the argument that
          decides whether the server is safe to run. */}
      {target && (
        <div className="flex items-start gap-1.5">
          <code className="bg-muted/60 text-foreground/85 min-w-0 flex-1 rounded-lg px-2.5 py-2 font-mono text-[11px] leading-relaxed break-all">
            {target}
          </code>
          {copyTarget && (
            <span onClick={(event) => event.stopPropagation()}>
              <CopyButton value={target} label={copyLabel} />
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
        </p>
      )}

      {hasCounts && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {counts.map((entry) => {
            const value = capabilities?.[entry.key]
            if (value === undefined) return null
            return (
              <span
                key={entry.key}
                className={cn(
                  'text-xs tabular-nums',
                  // Zero is a real answer, kept visible but quiet: an absent
                  // capability must not look like an unreported one.
                  value === 0 ? 'text-muted-foreground/40' : 'text-muted-foreground',
                )}
              >
                <span className={cn('font-medium', value > 0 && 'text-foreground')}>{value}</span>{' '}
                {entry.label}
              </span>
            )
          })}
        </div>
      )}

      {footer && (
        <div className="border-border mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground/60 min-w-0 truncate font-mono text-[11px]">
            {[version, protocolVersion && `MCP ${protocolVersion}`].filter(Boolean).join(' · ') ||
              ' '}
          </span>

          {onReconnect && status !== 'connecting' && (
            <Button
              variant="ghost"
              size="sm"
              className="-me-2 shrink-0"
              onClick={(event) => {
                event.stopPropagation()
                onReconnect()
              }}
            >
              <RefreshCw />
              {reconnectLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export { McpServerCard }
export type { McpServerCardProps }
