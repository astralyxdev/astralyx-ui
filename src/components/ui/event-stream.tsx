import { useEffect, useId, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldBase, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A live tail of analytics events, newest first.
 *
 * **The debugging tool for the tracking itself.** Funnels and dashboards show
 * what was recorded; this shows what is *arriving*, right now, with its
 * properties — which is the only way to answer "did that click fire the event,
 * and did it carry the right payload" without opening a network panel.
 *
 * **Autoscroll pauses when you scroll away, and resumes at the top.** A stream
 * that yanks you back to the newest row every time one arrives makes reading
 * any event impossible — the thing you were looking at is gone before you
 * finish. Scroll position is the intent signal, so no toggle is needed for the
 * common case, and the explicit pause button exists for when the rate is high
 * enough that even hovering is a fight.
 *
 * **The list is capped and drops the oldest.** An unbounded live list is a
 * memory leak with a UI: at a few hundred events per minute a tab left open
 * over lunch is tens of thousands of nodes. `limit` is the ceiling, and the
 * count of what was dropped is shown rather than silently forgotten.
 *
 * Rendering is newest-first with `aria-live="off"` deliberately: announcing
 * every arriving event would make a screen reader unusable. The count is
 * announced politely instead.
 */
export type StreamEvent = {
  id: string
  name: string
  at: Date | string
  /** Shown expanded under the row. */
  properties?: Record<string, unknown>
  /** Colours the dot — 'error', 'page', whatever you group by. */
  kind?: string
  user?: ReactNode
}

type EventStreamProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  events: StreamEvent[]
  /** Rows kept. The oldest beyond this are dropped. */
  limit?: number
  height?: number
  /** Filter box over event names. */
  filterable?: boolean
  onSelect?: (event: StreamEvent) => void
  /** Kinds mapped to a CSS colour. */
  colorFor?: (kind: string | undefined) => string
  paused?: boolean
  onPausedChange?: (paused: boolean) => void
  timeFormat?: (date: Date) => string
  emptyLabel?: string
  filterPlaceholder?: string
  label?: string
}

const asDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))

const DEFAULT_TIME: (date: Date) => string = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour12: false }) +
  '.' +
  String(date.getMilliseconds()).padStart(3, '0')

function EventStream({
  events,
  limit = 500,
  height = 360,
  filterable = true,
  onSelect,
  colorFor,
  paused: pausedProp,
  onPausedChange,
  timeFormat = DEFAULT_TIME,
  emptyLabel = 'Waiting for events…',
  filterPlaceholder = 'Filter by name',
  label = 'Event stream',
  className,
  ...props
}: EventStreamProps) {
  const titleId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [internalPaused, setInternalPaused] = useState(false)
  /** Set when the reader has scrolled away from the top. */
  const [stuck, setStuck] = useState(false)

  const paused = pausedProp ?? internalPaused

  const setPaused = (next: boolean) => {
    if (pausedProp === undefined) setInternalPaused(next)
    onPausedChange?.(next)
  }

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? events.filter((event) => event.name.toLowerCase().includes(needle))
      : events
    // Newest first, then capped.
    return filtered.slice(0, limit)
  }, [events, query, limit])

  const dropped = Math.max(0, events.length - limit)

  useEffect(() => {
    const list = listRef.current
    if (!list || paused || stuck) return
    // Only when the reader is already at the top — otherwise the row being read
    // is scrolled out from under them.
    list.scrollTop = 0
  }, [shown.length, paused, stuck])

  const tint = (kind: string | undefined) =>
    colorFor?.(kind) ??
    (kind === 'error'
      ? 'var(--destructive)'
      : kind === 'page'
        ? 'var(--blue-soft-foreground)'
        : 'var(--muted-foreground)')

  return (
    <div
      data-slot="event-stream"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
        <p id={titleId} className="text-sm font-medium">
          {label}
        </p>
        <span
          className="text-muted-foreground text-xs tabular-nums"
          // The count is announced; the rows themselves are not.
          aria-live="polite"
        >
          {shown.length}
          {dropped > 0 && ` (+${dropped} dropped)`}
        </span>

        <span className="flex-1" />

        {filterable && (
          <div className={cn(fieldBase, 'flex h-7 w-40 items-center px-2')}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={filterPlaceholder}
              aria-label={filterPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </div>
        )}

        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={paused ? 'Resume' : 'Pause'}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      </div>

      <div
        ref={listRef}
        style={{ height }}
        // Never announce arrivals: at any real rate it makes a screen reader
        // unusable.
        aria-live="off"
        onScroll={(event) => setStuck(event.currentTarget.scrollTop > 8)}
        className="min-h-0 flex-1 overflow-y-auto font-mono text-xs"
      >
        {shown.length === 0 ? (
          <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
        ) : (
          <ul className="list-none">
            {shown.map((event) => {
              const open = expanded === event.id
              return (
                <li key={event.id} className="border-border/60 border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(open ? null : event.id)
                      onSelect?.(event)
                    }}
                    className="hover:bg-muted flex w-full items-center gap-2 px-3 py-1.5 text-start"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: tint(event.kind) }}
                    />
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {timeFormat(asDate(event.at))}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{event.name}</span>
                    {event.user && (
                      <span className="text-muted-foreground shrink-0 truncate">{event.user}</span>
                    )}
                  </button>

                  {open && event.properties && (
                    <pre className="bg-muted/50 text-muted-foreground overflow-x-auto px-3 py-2 text-[11px] whitespace-pre-wrap">
                      {JSON.stringify(event.properties, null, 2)}
                    </pre>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {stuck && !paused && (
        <button
          type="button"
          onClick={() => {
            listRef.current?.scrollTo({ top: 0 })
            setStuck(false)
          }}
          className="border-border text-muted-foreground hover:bg-muted border-t px-3 py-1.5 text-xs"
        >
          Autoscroll paused — jump to newest
        </button>
      )}
    </div>
  )
}

export { EventStream }
export type { EventStreamProps }
