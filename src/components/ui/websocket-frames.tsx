import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Select } from '@/components/ui/select'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A WebSocket frame log, by direction.
 *
 * Direction is carried by an arrow, not by colour alone. A frame log is scanned
 * for "what did we send just before it broke", and that scan fails the moment
 * someone screenshots it into a monochrome ticket. Rows stay flush: indenting
 * one direction ragged the left edge of the payload column, which is the column
 * being read.
 *
 * Timestamps show the delta from the previous frame as well as the absolute
 * time. Protocol bugs are about the gap between frames — a heartbeat that
 * stopped arriving is visible as a 30-second delta and invisible as a list of
 * clock times.
 *
 * Control frames (ping, pong, close) are filterable and off by default in the
 * data view. A ping every 15 seconds buries the four frames that matter.
 */
export type WsFrame = {
  id: string
  direction: 'sent' | 'received'
  /** `text` and `binary` are data; the rest are control frames. */
  opcode?: 'text' | 'binary' | 'ping' | 'pong' | 'close'
  data: string
  at: Date
  /** Payload size. Falls back to the data length. */
  bytes?: number
}

const CONTROL = new Set(['ping', 'pong', 'close'])

function WebSocketFrames({
  frames,
  showControl: showControlProp,
  locale = 'en-GB',
  emptyLabel = 'No frames',
  filterLabel = 'Frames shown',
  allLabel = 'All frames',
  dataLabel = 'Data only',
  sentLabel = 'sent',
  receivedLabel = 'received',
  className,
  ...props
}: ComponentProps<'div'> & {
  frames: WsFrame[]
  /** Include ping/pong/close. Off by default — they bury the real traffic. */
  showControl?: boolean
  locale?: string
  emptyLabel?: ReactNode
  /** Accessible name for the filter. */
  filterLabel?: string
  allLabel?: string
  dataLabel?: string
  sentLabel?: string
  receivedLabel?: string
}) {
  const [own, setOwn] = useState(showControlProp ? 'all' : 'data')
  const mode = showControlProp === undefined ? own : showControlProp ? 'all' : 'data'
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => {
    const visible =
      mode === 'all' ? frames : frames.filter((f) => !CONTROL.has(f.opcode ?? 'text'))
    // Delta from the previous *visible* frame — the gap is the signal.
    return visible.map((frame, index) => ({
      frame,
      delta: index === 0 ? undefined : frame.at.getTime() - visible[index - 1].at.getTime(),
    }))
  }, [frames, mode])

  return (
    <div
      data-slot="websocket-frames"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="text-muted-foreground text-xs tabular-nums">
          {rows.length} / {frames.length}
        </span>
        <Select
          size="sm"
          className="ms-auto w-36"
          aria-label={filterLabel}
          value={mode}
          onValueChange={setOwn}
          options={[
            { value: 'data', label: dataLabel },
            { value: 'all', label: allLabel },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="divide-border/60 max-h-96 list-none divide-y overflow-y-auto">
          {rows.map(({ frame, delta }) => {
            const sent = frame.direction === 'sent'
            const control = CONTROL.has(frame.opcode ?? 'text')
            const expanded = open === frame.id
            const size = frame.bytes ?? frame.data.length

            return (
              <li key={frame.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : frame.id)}
                  className={cn('flex w-full items-start gap-2.5 p-3 text-start', interactive, focusRing)}
                >
                  {/* Arrow and position, never colour alone. */}
                  {sent ? (
                    <ArrowUp className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-label={sentLabel} />
                  ) : (
                    <ArrowDown className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-label={receivedLabel} />
                  )}

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate font-mono text-xs',
                        control && 'text-muted-foreground/70 italic',
                      )}
                    >
                      {frame.data || '(empty)'}
                    </span>
                    <span className="text-muted-foreground/70 mt-0.5 flex flex-wrap gap-x-2 text-xs">
                      <Fmt type="date" value={frame.at} format="HH:mm:ss.SSS" locale={locale} />
                      {/* The gap between frames is where protocol bugs live. */}
                      {delta !== undefined && (
                        <span className={cn('tabular-nums', delta > 30_000 && 'text-[var(--amber-soft-foreground)]')}>
                          +{delta < 1000 ? `${delta}ms` : `${(delta / 1000).toFixed(1)}s`}
                        </span>
                      )}
                      <span className="tabular-nums">
                        <Fmt type="bytes" value={size} locale={locale} />
                      </span>
                    </span>
                  </span>

                  {control && (
                    <Badge size="sm" color="neutral" className="shrink-0">
                      <Circle className="fill-current" />
                      {frame.opcode}
                    </Badge>
                  )}
                </button>

                {expanded && (
                  <pre className="bg-muted/30 border-border/60 overflow-x-auto border-t p-3 font-mono text-xs whitespace-pre-wrap">
                    {frame.data}
                  </pre>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { WebSocketFrames }
