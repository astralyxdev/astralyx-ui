import type { ComponentProps, ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { HoverCard } from '@/components/ui/hover-card'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Numbered sources for a generated answer.
 *
 * A citation marker is a link to something the reader can verify, so it is a
 * real anchor with an accessible name — "Source 3: Tailwind v4 release notes",
 * not a bare "3". A superscript number alone is meaningless read aloud, which
 * is exactly the case where checking a claim matters most.
 *
 * The hover preview is supplementary. Everything it shows also appears in the
 * source list, because hover is not available to every reader.
 *
 * `scope` namespaces the anchor ids. Two answers on one page each carry their
 * own source list, and without a scope both would mint `#citation-3` — giving
 * duplicate ids and markers that jump to the wrong list.
 */
export type Citation = {
  id: string
  title: string
  url?: string
  /** Quoted passage or summary shown on hover. */
  snippet?: ReactNode
  source?: string
}

/** An inline marker. Index is 1-based to match the list below. */
function CitationMark({
  citation,
  index,
  scope = 'citation',
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'children'> & {
  citation: Citation
  index: number
  /** Must match the `scope` on the matching Citations list. */
  scope?: string
}) {
  const mark = (
    <a
      href={citation.url ?? `#${scope}-${citation.id}`}
      aria-label={`Source ${index}: ${citation.title}`}
      className={cn(
        'bg-secondary text-muted-foreground hover:text-foreground ms-0.5 inline-flex h-4 min-w-4 items-center justify-center px-1 align-super text-[10px] font-medium tabular-nums',
        radius.xs,
        interactive,
        focusRing,
        className,
      )}
      {...props}
    >
      {index}
    </a>
  )

  if (!citation.snippet) return mark

  return (
    <HoverCard
      content={
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{citation.title}</p>
          {citation.source && (
            <p className="text-muted-foreground text-xs">{citation.source}</p>
          )}
          <p className="text-muted-foreground text-xs">{citation.snippet}</p>
        </div>
      }
    >
      {mark}
    </HoverCard>
  )
}

/** The numbered list under an answer. */
function Citations({
  citations,
  label = 'Sources',
  scope = 'citation',
  className,
  ...props
}: ComponentProps<'section'> & {
  citations: Citation[]
  label?: ReactNode
  /** Namespaces the anchor ids. Give each list on a page its own. */
  scope?: string
}) {
  if (citations.length === 0) return null

  return (
    <section
      data-slot="citations"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    >
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </h3>

      <ol className="flex list-none flex-col gap-1">
        {citations.map((citation, index) => (
          <li
            key={citation.id}
            id={`${scope}-${citation.id}`}
            className="flex gap-2 text-sm"
          >
            <span className="text-muted-foreground/70 min-w-4 shrink-0 text-end text-xs tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              {citation.url ? (
                <a
                  href={citation.url}
                  className={cn(
                    'hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline',
                    focusRing,
                    radius.xs,
                  )}
                >
                  {citation.title}
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                citation.title
              )}
              {citation.source && (
                <span className="text-muted-foreground ms-1.5 text-xs">
                  {citation.source}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export { CitationMark, Citations }
