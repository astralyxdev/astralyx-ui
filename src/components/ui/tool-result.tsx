import { useState, type ComponentProps } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * What a tool actually returned, rendered by content type.
 *
 * `ToolCall` shows the invocation. This shows the payload coming back, which is
 * where MCP gets awkward: a single result is a *list* of content blocks, and
 * they can mix — text, an image, an embedded resource — in one response.
 * Rendering `JSON.stringify(result)` is the usual shortcut and it turns a
 * returned screenshot into four thousand characters of base64.
 *
 * So each block is rendered as what it is, and only text and JSON are copyable,
 * because those are the ones anyone wants on the clipboard.
 *
 * **`isError` is part of the payload, not the transport.** An MCP tool reports
 * failure with a normal, successful response carrying `isError: true` — so a UI
 * that only styles transport errors shows a failed tool call as a success. This
 * takes the flag explicitly.
 */
export type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'json'; value: unknown }
  | { type: 'image'; data: string; mimeType?: string; alt?: string }
  | { type: 'resource'; uri: string; mimeType?: string; text?: string }

type ToolResultProps = Omit<ComponentProps<'div'>, 'content'> & {
  /** The blocks the tool returned, in order. */
  content: ToolContent[]
  /** The tool reported failure. Comes from the payload, not the transport. */
  isError?: boolean
  /** Tool name, shown in the header. */
  tool?: string
  durationMs?: number
  /** Collapse everything past this many blocks. */
  maxBlocks?: number
  errorLabel?: string
  emptyLabel?: string
  moreLabel?: (hidden: number) => string
  copyLabel?: string
}

function ToolResult({
  content,
  isError = false,
  tool,
  durationMs,
  maxBlocks = 3,
  errorLabel = 'Tool reported an error',
  emptyLabel = 'Returned nothing.',
  moreLabel = (hidden) => `Show ${hidden} more block${hidden === 1 ? '' : 's'}`,
  copyLabel = 'Copy',
  className,
  ...props
}: ToolResultProps) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? content : content.slice(0, maxBlocks)
  const hidden = content.length - shown.length

  return (
    <div
      data-slot="tool-result"
      data-error={isError || undefined}
      className={cn(
        surface,
        radius.surface,
        'overflow-hidden',
        isError && 'border-destructive',
        className,
      )}
      {...props}
    >
      {(tool || isError || durationMs !== undefined) && (
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
          {tool && <code className="min-w-0 flex-1 truncate font-mono text-xs">{tool}</code>}
          {isError && (
            <Badge size="sm" color="destructive">
              <TriangleAlert className="size-3" aria-hidden="true" />
              {errorLabel}
            </Badge>
          )}
          {durationMs !== undefined && (
            <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
              {durationMs}ms
            </span>
          )}
        </div>
      )}

      {content.length === 0 ? (
        <p className="text-muted-foreground p-3 text-xs">{emptyLabel}</p>
      ) : (
        <div className="divide-border/60 divide-y">
          {shown.map((block, index) => (
            <div key={index} className="p-3">
              {block.type === 'text' && (
                <div className="flex items-start gap-2">
                  <p className="text-foreground/85 min-w-0 flex-1 text-xs leading-relaxed whitespace-pre-wrap">
                    {block.text}
                  </p>
                  <CopyButton value={block.text} label={copyLabel} />
                </div>
              )}

              {block.type === 'json' && (
                <div className="flex items-start gap-2">
                  <pre className="text-foreground/85 min-w-0 flex-1 overflow-x-auto font-mono text-[11px] leading-relaxed">
                    {JSON.stringify(block.value, null, 2)}
                  </pre>
                  <CopyButton value={JSON.stringify(block.value, null, 2)} label={copyLabel} />
                </div>
              )}

              {/* Rendered, not stringified. A returned screenshot is a picture,
                  not four thousand characters of base64. */}
              {block.type === 'image' && (
                <img
                  src={
                    block.data.startsWith('data:')
                      ? block.data
                      : `data:${block.mimeType ?? 'image/png'};base64,${block.data}`
                  }
                  alt={block.alt ?? ''}
                  className={cn('max-h-64 w-auto max-w-full', radius.control)}
                />
              )}

              {block.type === 'resource' && (
                <div className="space-y-1.5">
                  <p className="text-muted-foreground truncate font-mono text-xs" title={block.uri}>
                    {block.uri}
                  </p>
                  {block.text && (
                    <pre className="text-foreground/85 overflow-x-auto font-mono text-[11px] leading-relaxed">
                      {block.text}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-3 py-2 text-xs"
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
              {moreLabel(hidden)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { ToolResult }
export type { ToolResultProps }
