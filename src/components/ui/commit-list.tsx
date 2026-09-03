import type { ComponentProps, ReactNode } from 'react'
import { Check, CircleDot, GitCommitHorizontal, ShieldCheck, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DiffStat } from '@/components/ui/diff-stat'
import { Tooltip } from '@/components/ui/tooltip'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A list of commits, grouped by day.
 *
 * The grouping is the point: a flat list of forty commits is unreadable, and
 * "when" is the axis people actually scan a history along.
 */
export type Commit = {
  sha: string
  message: string
  author: string
  /** Any date-ish value; grouped by local day. */
  date: Date
  status?: 'passed' | 'failed' | 'running'
  verified?: boolean
  additions?: number
  deletions?: number
  body?: ReactNode
}

const STATUS = {
  passed: { icon: Check, color: 'text-[var(--green-soft-foreground)]', label: 'Checks passed' },
  failed: { icon: X, color: 'text-[var(--destructive-soft-foreground)]', label: 'Checks failed' },
  running: { icon: CircleDot, color: 'text-[var(--blue-soft-foreground)]', label: 'Checks running' },
} as const

function dayKey(date: Date) {
  return date.toDateString()
}

function CommitList({
  verifiedLabel = 'Verified',
  className,
  commits,
  locale = 'en-GB',
  onSelect,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  commits: Commit[]
  locale?: string
  onSelect?: (sha: string) => void
  /** Badge on a signed commit. */
  verifiedLabel?: ReactNode
}) {
  // Preserve the caller's order within each day; only group, never re-sort.
  const groups: [string, Commit[]][] = []
  for (const commit of commits) {
    const key = dayKey(commit.date)
    const last = groups.at(-1)
    if (last?.[0] === key) last[1].push(commit)
    else groups.push([key, [commit]])
  }

  const heading = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div data-slot="commit-list" className={cn('space-y-5', className)} {...props}>
      {groups.map(([key, group]) => (
        <section key={key} className="space-y-2">
          <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <GitCommitHorizontal className="size-3.5" />
            {heading.format(group[0].date)}
          </h3>

          {/* `overflow-hidden`: the rows run edge to edge, so any row
              background would otherwise square off the container's corners. */}
          <div
            className={cn(
              surface,
              radius.panel,
              'divide-border divide-y overflow-hidden',
            )}
          >
            {group.map((commit) => {
              const status = commit.status ? STATUS[commit.status] : null
              const StatusIcon = status?.icon

              return (
                <div
                  key={commit.sha}
                  className="flex items-start gap-3 p-3.5"
                  data-slot="commit"
                >
                  <Avatar size="sm" name={commit.author} />

                  <div className="min-w-0 flex-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => onSelect?.(commit.sha)}
                      className="block max-w-full truncate text-start text-sm font-medium hover:underline"
                    >
                      {commit.message}
                    </button>
                    <p className="text-muted-foreground text-xs">
                      {commit.author} committed at {time.format(commit.date)}
                    </p>
                    {commit.body && (
                      <p className="text-muted-foreground text-xs">{commit.body}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {commit.additions !== undefined && (
                      <DiffStat
                        additions={commit.additions}
                        deletions={commit.deletions ?? 0}
                        showCounts={false}
                        className="hidden sm:inline-flex"
                      />
                    )}
                    {commit.verified && (
                      <Tooltip content="Signature verified">
                        <Badge size="sm" color="green" icon={<ShieldCheck />}>
                          {verifiedLabel}
                        </Badge>
                      </Tooltip>
                    )}
                    {status && StatusIcon && (
                      <Tooltip content={status.label}>
                        <span className={cn('flex', status.color)}>
                          <StatusIcon className="size-4" />
                        </span>
                      </Tooltip>
                    )}
                    <Button
                      variant="secondary"
                      size="xs"
                      className="font-mono"
                      onClick={() => onSelect?.(commit.sha)}
                    >
                      {commit.sha.slice(0, 7)}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export { CommitList }
