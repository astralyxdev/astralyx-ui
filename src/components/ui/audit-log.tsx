import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Input } from '@/components/ui/input'
import { JsonViewer } from '@/components/ui/json-viewer'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An append-only record of who did what.
 *
 * There is no edit or delete affordance anywhere in this component, by design.
 * An audit log that can be changed from the interface that displays it is not
 * evidence, and the absence of those buttons is the feature.
 *
 * Timestamps show both the relative and the absolute form. Relative is how
 * people scan; absolute is what gets quoted in an incident review, and having
 * to hover for it wastes the reviewer's time.
 *
 * A failed action is recorded and shown. An attempt that was denied is often
 * the most interesting row on the page.
 */
export type AuditEvent = {
  id: string
  actor: ReactNode
  actorAvatar?: ReactNode
  /** Verb — "updated", "deleted", "signed in". */
  action: string
  target?: ReactNode
  at: Date
  ip?: string
  outcome?: 'success' | 'denied' | 'error'
  /** Before/after, request payload — anything structured. */
  detail?: unknown
}

const OUTCOME = {
  success: { label: 'OK', color: 'green' },
  denied: { label: 'Denied', color: 'amber' },
  error: { label: 'Error', color: 'destructive' },
} as const

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_TOGGLE_DETAIL_LABEL: (open: boolean) => string = (open) => `${open ? 'Hide' : 'Show'} detail`

function AuditLog({
  events,
  searchable = true,
  now,
  locale = 'en-GB',
  filterPlaceholder = 'Filter by actor, action or IP',
  filterLabel = 'Filter audit log',
  toggleDetailLabel = DEFAULT_TOGGLE_DETAIL_LABEL,
  emptyMessage = 'No events match.',
  className,
  ...props
}: ComponentProps<'div'> & {
  events: AuditEvent[]
  searchable?: boolean
  now?: Date
  locale?: string
  filterPlaceholder?: string
  /** Accessible name for the filter field. */
  filterLabel?: string
  /** Accessible name for a row's detail toggle. */
  toggleDetailLabel?: (open: boolean) => string
  emptyMessage?: ReactNode
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return events
    return events.filter((event) =>
      [event.actor, event.action, event.target, event.ip]
        .map((part) => String(part ?? '').toLowerCase())
        .some((part) => part.includes(term)),
    )
  }, [events, query])

  return (
    <div
      data-slot="audit-log"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {searchable && (
        <div className="border-border border-b p-2">
          <Input
            size="sm"
            variant="secondary"
            icon={<Search />}
            placeholder={filterPlaceholder}
            aria-label={filterLabel}
            value={query}
            clearable
            onChange={(event) => setQuery(event.target.value)}
            containerClassName="sm:w-72"
          />
        </div>
      )}

      <ul className="list-none divide-y divide-[var(--border)]">
        {rows.map((event) => {
          const open = expanded.includes(event.id)
          const outcome = event.outcome ? OUTCOME[event.outcome] : undefined

          return (
            <li key={event.id}>
              <div className="flex items-start gap-2.5 p-3">
                {event.detail !== undefined ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={toggleDetailLabel(open)}
                    onClick={() =>
                      setExpanded((current) =>
                        open ? current.filter((id) => id !== event.id) : [...current, event.id],
                      )
                    }
                    className={cn(
                      'text-muted-foreground hover:text-foreground -m-1 mt-0 shrink-0 p-1',
                      radius.xs,
                      interactive,
                      focusRing,
                    )}
                  >
                    {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                {event.actorAvatar ?? <Avatar size="xs" name={String(event.actor)} className="mt-0.5 shrink-0" />}

                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{event.actor}</span>{' '}
                    <span className="text-muted-foreground">{event.action}</span>{' '}
                    {event.target && <span className="font-medium">{event.target}</span>}
                  </p>

                  <p className="text-muted-foreground/80 mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    {/* Both forms: relative to scan, absolute to quote. */}
                    <span>
                      <Fmt type="relative" value={event.at} now={now} locale={locale} />
                    </span>
                    <span className="tabular-nums">
                      <Fmt type="date" value={event.at} format="DD/MM/YYYY HH:mm:ss" locale={locale} />
                    </span>
                    {event.ip && <span className="font-mono">{event.ip}</span>}
                  </p>
                </div>

                {outcome && (
                  <Badge size="sm" color={outcome.color} className="shrink-0">
                    {outcome.label}
                  </Badge>
                )}
              </div>

              {open && event.detail !== undefined && (
                <div className="bg-muted/30 border-border/60 border-t p-3">
                  <JsonViewer value={event.detail as never} defaultExpandedDepth={2} />
                </div>
              )}
            </li>
          )
        })}

        {rows.length === 0 && (
          <li className="text-muted-foreground p-8 text-center text-sm">{emptyMessage}</li>
        )}
      </ul>
    </div>
  )
}

export { AuditLog }
