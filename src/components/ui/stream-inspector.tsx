import { useMemo, useState, type ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A model's token stream, event by event, with the timing between them.
 *
 * The devtool for the two numbers that decide whether a stream feels fast:
 * **time to first token**, and the gaps after it. An average tokens-per-second
 * hides both — a stream that stalls for two seconds mid-sentence and then
 * catches up scores identically to one that never stalled, and only one of them
 * is unpleasant to read.
 *
 * So gaps above `stallMs` are marked inline, in the sequence, where they can be
 * traced to the event that caused them — usually a tool call the stream paused
 * for.
 *
 * Text deltas collapse into runs. A stream is thousands of two-character
 * events; rendering each as a row makes the tool-call boundaries impossible to
 * find, which is the only reason to open a stream inspector at all.
 */
export type StreamEvent = {
  id: string
  /** Milliseconds from the start of the request. */
  at: number
  kind: 'start' | 'text' | 'tool' | 'thinking' | 'stop' | 'error'
  /** Text delta, tool name, or an error message. */
  content?: string
}

const KIND_TONE: Record<StreamEvent['kind'], string> = {
  start: 'text-muted-foreground',
  text: 'text-foreground/80',
  thinking: 'text-[var(--violet-soft-foreground)]',
  tool: 'text-[var(--amber-soft-foreground)]',
  stop: 'text-muted-foreground',
  error: 'text-[var(--destructive-soft-foreground)]',
}

type Run =
  | { type: 'run'; kind: StreamEvent['kind']; text: string; from: number; to: number; count: number }
  | { type: 'event'; event: StreamEvent }
  | { type: 'stall'; ms: number; at: number }

type StreamInspectorProps = Omit<ComponentProps<'div'>, 'children'> & {
  events: StreamEvent[]
  /** A gap longer than this is called out in the sequence. */
  stallMs?: number
  /** Collapse consecutive text deltas into one run. */
  collapseText?: boolean
  formatDuration?: (ms: number) => string
  emptyLabel?: string
  ttftLabel?: string
  stallLabel?: string
  label?: string
}

function defaultDuration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
}

function StreamInspector({
  events,
  stallMs = 400,
  collapseText = true,
  formatDuration = defaultDuration,
  emptyLabel = 'No events captured.',
  ttftLabel = 'to first token',
  stallLabel = 'stalled',
  label = 'Stream',
  className,
  ...props
}: StreamInspectorProps) {
  const [expanded, setExpanded] = useState(!collapseText)

  const firstToken = useMemo(
    () => events.find((event) => event.kind === 'text' || event.kind === 'thinking'),
    [events],
  )

  const rows = useMemo(() => {
    const out: Run[] = []
    let previous: StreamEvent | undefined

    for (const event of events) {
      if (previous && event.at - previous.at >= stallMs) {
        out.push({ type: 'stall', ms: event.at - previous.at, at: previous.at })
      }

      const last = out[out.length - 1]
      if (
        expanded === false &&
        event.kind === 'text' &&
        last?.type === 'run' &&
        last.kind === 'text'
      ) {
        last.text += event.content ?? ''
        last.to = event.at
        last.count++
      } else if (expanded === false && event.kind === 'text') {
        out.push({
          type: 'run',
          kind: 'text',
          text: event.content ?? '',
          from: event.at,
          to: event.at,
          count: 1,
        })
      } else {
        out.push({ type: 'event', event })
      }

      previous = event
    }
    return out
  }, [events, stallMs, expanded])

  return (
    <div
      data-slot="stream-inspector"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <p className="text-muted-foreground/70 min-w-0 flex-1 text-[11px] font-medium tracking-[0.14em] uppercase">
          {label}
        </p>
        {firstToken && (
          <span className="font-mono text-[11px] tabular-nums">
            {formatDuration(firstToken.at)}{' '}
            <span className="text-muted-foreground">{ttftLabel}</span>
          </span>
        )}
        {collapseText && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-muted-foreground hover:text-foreground text-[11px] underline"
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="max-h-80 list-none overflow-auto px-4 py-2 font-mono text-[11px]">
          {rows.map((row, index) => {
            if (row.type === 'stall') {
              return (
                <li key={index} className="py-1">
                  <Badge size="sm" color="amber">
                    {stallLabel} {formatDuration(row.ms)}
                  </Badge>
                </li>
              )
            }

            if (row.type === 'run') {
              return (
                <li key={index} className="flex gap-3 py-0.5">
                  <span className="text-muted-foreground/40 w-14 shrink-0 tabular-nums">
                    {formatDuration(row.from)}
                  </span>
                  <span className={cn('min-w-0 flex-1 break-all', KIND_TONE.text)}>
                    {row.text}
                    <span className="text-muted-foreground/40"> ({row.count} deltas)</span>
                  </span>
                </li>
              )
            }

            const event = row.event
            return (
              <li key={event.id} className="flex gap-3 py-0.5">
                <span className="text-muted-foreground/40 w-14 shrink-0 tabular-nums">
                  {formatDuration(event.at)}
                </span>
                <span className="text-muted-foreground/60 w-16 shrink-0">{event.kind}</span>
                <span className={cn('min-w-0 flex-1 break-all', KIND_TONE[event.kind])}>
                  {event.content}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { StreamInspector }
export type { StreamInspectorProps }
