import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Pin, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * What an agent has remembered, and where each piece came from.
 *
 * Distinct from `RetrievalResults`, which shows what one query pulled back.
 * This is the durable store — the things that will be injected into *every*
 * future run whether they are relevant or not, which is why it needs to be
 * inspectable and editable by a person.
 *
 * **Provenance is mandatory in the type, not optional.** A memory with no
 * source cannot be audited, and an agent that has silently learned something
 * wrong is exactly the case this screen exists for. `source` is required.
 *
 * Pinned entries sort first and are exempt from eviction — they are the ones a
 * person asserted, as opposed to the ones the agent inferred.
 */
export type MemoryEntry = {
  id: string
  content: ReactNode
  /** Where it came from. Required: an unattributable memory cannot be audited. */
  source: string
  /** Already formatted — this component does not own your locale. */
  at?: string
  /** 0–1. How strongly it is weighted at retrieval time. */
  importance?: number
  /** Held permanently, exempt from eviction. */
  pinned?: boolean
  /** Free-form grouping — 'preference', 'fact', 'correction'. */
  kind?: string
}

type AgentMemoryProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  entries: MemoryEntry[]
  onPin?: (id: string, pinned: boolean) => void
  onForget?: (id: string) => void
  searchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  pinLabel?: string
  unpinLabel?: string
  forgetLabel?: string
  emptyLabel?: string
  emptyHint?: string
  sourceLabel?: (source: string) => ReactNode
}

function AgentMemory({
  entries,
  onPin,
  onForget,
  searchable = true,
  searchPlaceholder = 'Search memory…',
  searchLabel = 'Search memory',
  pinLabel = 'Pin',
  unpinLabel = 'Unpin',
  forgetLabel = 'Forget',
  emptyLabel = 'Nothing remembered yet',
  emptyHint = 'Memories appear here as the agent learns them.',
  sourceLabel = (source) => source,
  className,
  ...props
}: AgentMemoryProps) {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = needle
      ? entries.filter((entry) =>
          `${typeof entry.content === 'string' ? entry.content : ''} ${entry.source} ${entry.kind ?? ''}`
            .toLowerCase()
            .includes(needle),
        )
      : entries
    // Pinned first: those were asserted by a person, not inferred.
    return [...matched].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
  }, [entries, query])

  return (
    <div data-slot="agent-memory" className={cn('flex flex-col gap-3', className)} {...props}>
      {searchable && (
        <Input
          size="sm"
          value={query}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          icon={<Search />}
          clearable
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      {rows.length === 0 ? (
        <Empty title={emptyLabel} description={emptyHint} />
      ) : (
        <ul className={cn(surface, radius.surface, 'divide-border list-none divide-y overflow-hidden')}>
          {rows.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{entry.content}</p>

                <div className="text-muted-foreground/70 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className="font-mono">{sourceLabel(entry.source)}</span>
                  {entry.at && <span className="tabular-nums">{entry.at}</span>}
                  {entry.importance !== undefined && (
                    <span className="tabular-nums">
                      weight {entry.importance.toFixed(2)}
                    </span>
                  )}
                  {entry.kind && (
                    <Badge size="sm" variant="outline">
                      {entry.kind}
                    </Badge>
                  )}
                  {entry.pinned && (
                    <Badge size="sm" color="amber">
                      <Pin className="size-3" aria-hidden="true" />
                      pinned
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {onPin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${entry.pinned ? unpinLabel : pinLabel}: ${entry.source}`}
                    onClick={() => onPin(entry.id, !entry.pinned)}
                  >
                    <Pin className={cn(entry.pinned && 'text-[var(--amber-soft-foreground)]')} />
                  </Button>
                )}
                {onForget && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${forgetLabel}: ${entry.source}`}
                    onClick={() => onForget(entry.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { AgentMemory }
export type { AgentMemoryProps }
