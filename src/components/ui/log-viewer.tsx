import { useMemo, useState, type ComponentProps } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Structured logs: level filters, search, timestamps.
 *
 * Distinct from `Terminal`, which renders an opaque stream of bytes. Here every
 * line is a record with a level and a time, so it can be filtered and counted
 * — and that is the whole reason to prefer structured logging in the first
 * place.
 *
 * Matches are highlighted rather than the list being silently reduced, so a
 * search shows you where the hits are in context.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogEntry = {
  id: string
  level: LogLevel
  message: string
  time?: Date
  source?: string
}

const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']

/**
 * Severity order. The filter is a threshold rather than a set of independent
 * toggles: "show me warnings and worse" is the question people actually ask of
 * a log, and it maps onto a single Select instead of four controls whose 16
 * combinations are mostly meaningless.
 */
const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: 'Debug and above',
  info: 'Info and above',
  warn: 'Warnings and errors',
  error: 'Errors only',
}

const LEVEL_TONE = {
  debug: 'text-muted-foreground',
  info: 'text-[var(--blue-soft-foreground)]',
  warn: 'text-[var(--amber-soft-foreground)]',
  error: 'text-[var(--destructive-soft-foreground)]',
} as const

const ROW_TONE = {
  debug: '',
  info: '',
  warn: 'bg-[color-mix(in_oklab,var(--amber),transparent_94%)]',
  error: 'bg-[color-mix(in_oklab,var(--destructive),transparent_94%)]',
} as const

/** Split a message at the query so the hit can be marked. */
function highlight(message: string, query: string) {
  if (!query) return message
  const at = message.toLowerCase().indexOf(query.toLowerCase())
  if (at === -1) return message
  return (
    <>
      {message.slice(0, at)}
      <mark className="bg-[var(--amber)]/30 text-foreground rounded-sm">
        {message.slice(at, at + query.length)}
      </mark>
      {message.slice(at + query.length)}
    </>
  )
}

function LogViewer({
  entries,
  locale = 'en-GB',
  searchable = true,
  filterable = true,
  searchPlaceholder = 'Filter logs',
  searchLabel = 'Filter logs',
  levelLabel = 'Minimum log level',
  className,
  ...props
}: ComponentProps<'div'> & {
  entries: LogEntry[]
  locale?: string
  searchable?: boolean
  filterable?: boolean
  searchPlaceholder?: string
  /** Accessible name for the search field. */
  searchLabel?: string
  /** Accessible name for the level threshold select. */
  levelLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [minLevel, setMinLevel] = useState<LogLevel>('debug')

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [locale],
  )

  const matchesQuery = (entry: LogEntry) =>
    !query || entry.message.toLowerCase().includes(query.toLowerCase())

  /*
   * Counts follow the search but ignore the level threshold.
   *
   * Both halves matter. Counting the unfiltered list makes the numbers
   * contradict the rows the moment you type. Counting the fully filtered list
   * would show zero beside every level you are not currently showing, so the
   * option offering to widen the filter would claim there is nothing to widen
   * to.
   */
  const counts = useMemo(() => {
    const tally: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 }
    for (const entry of entries) {
      if (!query || entry.message.toLowerCase().includes(query.toLowerCase())) {
        tally[entry.level]++
      }
    }
    return tally
  }, [entries, query])

  const visible = entries.filter(
    (entry) => LEVEL_RANK[entry.level] >= LEVEL_RANK[minLevel] && matchesQuery(entry),
  )

  return (
    <div
      data-slot="log-viewer"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      {(searchable || filterable) && (
        <div className="border-border bg-muted/40 flex flex-col gap-2 border-b p-2 sm:flex-row sm:items-center">
          {searchable && (
            <Input
              size="sm"
              variant="secondary"
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              icon={<Search />}
              value={query}
              clearable
              onChange={(event) => setQuery(event.target.value)}
              containerClassName="sm:w-44"
            />
          )}

          {filterable && (
            <div className="sm:ms-auto sm:w-56">
              <Select
                size="sm"
                variant="secondary"
                aria-label={levelLabel}
                value={minLevel}
                onValueChange={(value) => setMinLevel(value as LogLevel)}
                options={LEVELS.map((level) => ({
                  value: level,
                  label: `${LEVEL_LABEL[level]} (${LEVELS.filter(
                    (l) => LEVEL_RANK[l] >= LEVEL_RANK[level],
                  ).reduce((sum, l) => sum + counts[l], 0)})`,
                }))}
              />
            </div>
          )}
        </div>
      )}

      <div className="max-h-80 overflow-auto font-mono text-xs">
        {visible.map((entry) => (
          <div
            key={entry.id}
            data-level={entry.level}
            className={cn(
              'border-border/50 flex gap-3 border-b px-3 py-1.5 last:border-b-0',
              ROW_TONE[entry.level],
            )}
          >
            {entry.time && (
              <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                {time.format(entry.time)}
              </span>
            )}
            <span
              className={cn('w-11 shrink-0 font-medium uppercase', LEVEL_TONE[entry.level])}
            >
              {entry.level}
            </span>
            {entry.source && (
              <span className="text-muted-foreground/70 hidden shrink-0 sm:inline">
                {entry.source}
              </span>
            )}
            <span className="min-w-0 flex-1 break-words">
              {highlight(entry.message, query)}
            </span>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            {query
              ? `No entries match "${query}".`
              : `Nothing at ${LEVEL_LABEL[minLevel].toLowerCase()}.`}
          </p>
        )}
      </div>

      <div className="border-border text-muted-foreground flex items-center gap-2 border-t p-3 text-xs">
        <Badge size="sm">{visible.length}</Badge>
        <span>
          of {entries.length} entries
          {minLevel !== 'debug' && ` · ${LEVEL_LABEL[minLevel].toLowerCase()}`}
        </span>
      </div>
    </div>
  )
}

export { LogViewer }
