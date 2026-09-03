import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ConfidenceMeter } from '@/components/ui/confidence-meter'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The chunks a retrieval step pulled, with their relevance.
 *
 * Chunks below `threshold` are still listed, dimmed, rather than dropped. When
 * an answer is wrong the useful question is usually "what did it nearly
 * retrieve" — a list that silently hides the near-misses cannot answer it.
 *
 * Scores use `ConfidenceMeter`'s banding rather than a raw number, for the same
 * reason: a cosine similarity of 0.82 is not a calibrated probability and
 * printing two decimals implies a precision it does not have.
 */
export type RetrievedChunk = {
  id: string
  /** 0–1. */
  score: number
  content: ReactNode
  source: string
  page?: number
  metadata?: Record<string, string>
}

function RetrievalResults({
  chunks,
  query,
  threshold = 0.5,
  defaultExpanded,
  title = 'Retrieved context',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  chunks: RetrievedChunk[]
  query?: ReactNode
  /** Below this a chunk is dimmed, not hidden. */
  threshold?: number
  defaultExpanded?: string[]
  title?: ReactNode
}) {
  const [expanded, setExpanded] = useState<string[]>(
    // The top hit opens: it is the one that shaped the answer.
    defaultExpanded ?? (chunks[0] ? [chunks[0].id] : []),
  )

  const used = chunks.filter((chunk) => chunk.score >= threshold).length

  return (
    <div
      data-slot="retrieval-results"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="text-sm font-medium">{title}</span>
        <Badge size="sm">{used} of {chunks.length} above threshold</Badge>
        {query && (
          <span className="text-muted-foreground w-full truncate text-xs">
            for “{query}”
          </span>
        )}
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {chunks.map((chunk) => {
          const open = expanded.includes(chunk.id)
          const weak = chunk.score < threshold

          return (
            <li key={chunk.id} className={cn(weak && 'opacity-55')}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setExpanded((current) =>
                    open
                      ? current.filter((id) => id !== chunk.id)
                      : [...current, chunk.id],
                  )
                }
                className={cn(
                  'hover:bg-accent/40 flex w-full items-center gap-2 p-3 text-start',
                  interactive,
                  focusRing,
                )}
              >
                {open ? (
                  <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{chunk.source}</span>
                  {chunk.page !== undefined && (
                    <span className="text-muted-foreground block text-xs">
                      page {chunk.page}
                    </span>
                  )}
                </span>

                <ConfidenceMeter
                  value={chunk.score}
                  showLabel={false}
                  size="sm"
                  label="Relevance"
                  className="w-16 shrink-0"
                />
              </button>

              {open && (
                <div className="bg-muted/30 border-border/60 border-t p-3">
                  <p className="text-muted-foreground text-sm">{chunk.content}</p>

                  {chunk.metadata && (
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {Object.entries(chunk.metadata).map(([key, value]) => (
                        <div key={key} className="flex gap-1.5">
                          <dt className="text-muted-foreground/70">{key}</dt>
                          <dd className="font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { RetrievalResults }
