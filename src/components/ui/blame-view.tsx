import { useMemo, type ComponentProps } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Fmt } from '@/components/ui/fmt'
import { Tooltip } from '@/components/ui/tooltip'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Git blame: every line attributed to the commit that last touched it.
 *
 * Consecutive lines from the same commit collapse into one gutter entry rather
 * than repeating the author on all forty. A blame view that repeats itself is
 * unreadable, and the repetition hides exactly the thing you are looking for —
 * where one commit's territory ends and the next begins.
 *
 * Age is shown as a colour ramp on the gutter edge, so "what is old and stable
 * versus new and suspect" is answerable without reading a single date.
 */
export type BlameLine = {
  line: number
  content: string
  sha: string
  author: string
  date: Date
  summary?: string
}

function BlameView({
  lines,
  now,
  onSelectCommit,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  lines: BlameLine[]
  now?: Date
  onSelectCommit?: (sha: string) => void
}) {
  const reference = now ?? new Date()

  // Group consecutive lines sharing a commit; the first of each run carries
  // the attribution and the rest are blank in the gutter.
  const runs = useMemo(() => {
    const out: { sha: string; lines: BlameLine[] }[] = []
    for (const line of lines) {
      const last = out.at(-1)
      if (last?.sha === line.sha) last.lines.push(line)
      else out.push({ sha: line.sha, lines: [line] })
    }
    return out
  }, [lines])

  const oldest = Math.min(...lines.map((line) => line.date.getTime()))
  const newest = Math.max(...lines.map((line) => line.date.getTime()))
  const span = newest - oldest || 1

  /** Newer is hotter. */
  const heat = (date: Date) => (date.getTime() - oldest) / span

  return (
    <div
      data-slot="blame-view"
      className={cn(
        'border-border overflow-x-auto border font-mono text-xs',
        radius.surface,
        className,
      )}
      {...props}
    >
      {runs.map((run) => {
        const first = run.lines[0]
        const intensity = heat(first.date)

        return (
          <div key={run.sha + first.line} className="flex min-w-max">
            <div
              className="border-border/60 bg-muted/30 relative flex w-56 shrink-0 border-e"
              style={{
                // The age ramp lives on the gutter's inner edge.
                boxShadow: `inset -2px 0 0 0 color-mix(in oklab, var(--blue), transparent ${Math.round(
                  (1 - intensity) * 90,
                )}%)`,
              }}
            >
              <Tooltip
                content={
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">{first.summary ?? first.sha}</span>
                    <span className="opacity-70">
                      {first.author} · <Fmt type="relative" value={first.date} now={reference} />
                    </span>
                  </span>
                }
              >
                <button
                  type="button"
                  onClick={() => onSelectCommit?.(first.sha)}
                  className="hover:bg-accent/50 flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-start transition-colors duration-150 ease-out motion-reduce:transition-none"
                >
                  <Avatar size="xs" name={first.author} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-muted-foreground block truncate">
                      {first.summary ?? first.author}
                    </span>
                  </span>
                  <span className="text-muted-foreground/60 shrink-0">
                    {first.sha.slice(0, 7)}
                  </span>
                </button>
              </Tooltip>
            </div>

            <div className="min-w-0 flex-1">
              {run.lines.map((line) => (
                <div key={line.line} className="flex">
                  <span className="text-muted-foreground/40 w-12 shrink-0 px-2 text-end select-none">
                    {line.line}
                  </span>
                  <code className="flex-1 pe-3 whitespace-pre">{line.content}</code>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { BlameView }
