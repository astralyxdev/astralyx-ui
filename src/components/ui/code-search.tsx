import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, FileCode } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Search hits grouped by file, with the match marked in its own line.
 *
 * Matches carry a column range rather than pre-split strings, so the same
 * result can be rendered here, counted, and jumped to in an editor without the
 * caller keeping three shapes of the same data in sync.
 *
 * Ranges are clamped on render. An off-by-one from a backend that counts
 * columns from one would otherwise slice the line silently and show the wrong
 * text — a wrong highlight is worse than no highlight, because it looks right.
 */
export type CodeMatch = {
  line: number
  text: string
  /** 0-based [start, end) within `text`. */
  range?: [number, number]
}

export type CodeSearchFile = {
  path: string
  matches: CodeMatch[]
  language?: string
}

function MatchLine({ match, query }: { match: CodeMatch; query?: string }) {
  let start: number
  let end: number

  if (match.range) {
    start = Math.max(0, Math.min(match.range[0], match.text.length))
    end = Math.max(start, Math.min(match.range[1], match.text.length))
  } else if (query) {
    const at = match.text.toLowerCase().indexOf(query.toLowerCase())
    start = at === -1 ? 0 : at
    end = at === -1 ? 0 : at + query.length
  } else {
    start = 0
    end = 0
  }

  return (
    <div className="hover:bg-accent/40 flex gap-3 px-3 py-1 font-mono text-xs transition-colors duration-150 ease-out motion-reduce:transition-none">
      <span className="text-muted-foreground/50 w-10 shrink-0 text-end tabular-nums select-none">
        {match.line}
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-pre">
        {match.text.slice(0, start)}
        {end > start && (
          <mark className="bg-[var(--amber)]/30 text-foreground rounded-sm">
            {match.text.slice(start, end)}
          </mark>
        )}
        {match.text.slice(end)}
      </span>
    </div>
  )
}

function CodeSearch({
  files,
  query,
  defaultCollapsed = false,
  onOpen,
  empty,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  files: CodeSearchFile[]
  /** Used to locate the hit when a match carries no explicit range. */
  query?: string
  defaultCollapsed?: boolean
  onOpen?: (path: string, line: number) => void
  empty?: ReactNode
}) {
  const [collapsed, setCollapsed] = useState<string[]>(
    defaultCollapsed ? files.map((file) => file.path) : [],
  )

  const total = files.reduce((sum, file) => sum + file.matches.length, 0)

  if (files.length === 0) {
    return <div className={className}>{empty ?? null}</div>
  }

  return (
    <div
      data-slot="code-search"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      <p className="text-muted-foreground text-xs">
        {total} {total === 1 ? 'result' : 'results'} in {files.length}{' '}
        {files.length === 1 ? 'file' : 'files'}
      </p>

      {files.map((file) => {
        const open = !collapsed.includes(file.path)
        const Chevron = open ? ChevronDown : ChevronRight

        return (
          <div
            key={file.path}
            className={cn('border-border overflow-hidden border', radius.surface)}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() =>
                setCollapsed((current) =>
                  open
                    ? [...current, file.path]
                    : current.filter((path) => path !== file.path),
                )
              }
              className={cn(
                'bg-muted/40 hover:bg-muted flex w-full items-center gap-2 p-3',
                interactive,
                focusRing,
              )}
            >
              <Chevron className="text-muted-foreground size-4 shrink-0" />
              <FileCode className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-start font-mono text-xs">
                {file.path}
              </span>
              {file.language && <Badge size="sm">{file.language}</Badge>}
              <Badge size="sm">{file.matches.length}</Badge>
            </button>

            {open && (
              <div className="divide-border/50 divide-y">
                {file.matches.map((match, index) =>
                  onOpen ? (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onOpen(file.path, match.line)}
                      className={cn('block w-full text-start', focusRing)}
                    >
                      <MatchLine match={match} query={query} />
                    </button>
                  ) : (
                    <MatchLine key={index} match={match} query={query} />
                  ),
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { CodeSearch }
