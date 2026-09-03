import type { ComponentProps, ReactNode } from 'react'
import { GitMerge, GitPullRequest, GitPullRequestClosed, MessageSquare } from 'lucide-react'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DiffStat } from '@/components/ui/diff-stat'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A pull request at a glance.
 *
 * The state is an icon *and* a word, never colour alone — merged and closed are
 * purple and red in every forge, which is exactly the pair that disappears for
 * the most common form of colour blindness.
 */
export type PullRequestState = 'open' | 'draft' | 'merged' | 'closed'

const STATE = {
  open: { Icon: GitPullRequest, label: 'Open', color: 'green' },
  draft: { Icon: GitPullRequest, label: 'Draft', color: 'neutral' },
  merged: { Icon: GitMerge, label: 'Merged', color: 'violet' },
  closed: { Icon: GitPullRequestClosed, label: 'Closed', color: 'destructive' },
} as const

function PullRequestCard({
  number,
  title,
  state = 'open',
  author,
  branch,
  baseBranch = 'main',
  updated,
  comments,
  additions,
  deletions,
  reviewers,
  labels,
  checks,
  reviewersLabel = 'Reviewers',
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'title'> & {
  number: number
  title: ReactNode
  state?: PullRequestState
  author?: string
  branch?: string
  baseBranch?: string
  updated?: Date
  comments?: number
  additions?: number
  deletions?: number
  reviewers?: string[]
  labels?: ReactNode
  /** A StatusChecks summary, or any node. */
  checks?: ReactNode
  reviewersLabel?: ReactNode
}) {
  const { Icon, label, color } = STATE[state]

  return (
    <article
      data-slot="pull-request-card"
      data-state={state}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            state === 'open' && 'text-[var(--green-soft-foreground)]',
            state === 'merged' && 'text-[var(--violet-soft-foreground)]',
            state === 'closed' && 'text-[var(--destructive-soft-foreground)]',
            state === 'draft' && 'text-muted-foreground',
          )}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-pretty">{title}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            #{number} · {label}
            {author && ` · by ${author}`}
            {updated && (
              <>
                {' · updated '}
                <Fmt type="relative" value={updated} />
              </>
            )}
          </p>
        </div>

        <Badge size="sm" color={color}>
          {label}
        </Badge>
      </div>

      {branch && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span className="bg-muted rounded-sm px-1.5 py-0.5">{branch}</span>
          <span aria-hidden="true">→</span>
          <span className="bg-muted rounded-sm px-1.5 py-0.5">{baseBranch}</span>
        </div>
      )}

      {labels && <div className="flex flex-wrap gap-1.5">{labels}</div>}
      {checks}

      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        {(additions !== undefined || deletions !== undefined) && (
          <DiffStat additions={additions ?? 0} deletions={deletions ?? 0} />
        )}
        {comments !== undefined && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            {comments}
          </span>
        )}
        {reviewers && reviewers.length > 0 && (
          <span className="ms-auto inline-flex items-center gap-1.5">
            <span className="sr-only">{reviewersLabel}</span>
            <AvatarGroup>
              {reviewers.map((name) => (
                <Avatar key={name} size="xs" name={name} />
              ))}
            </AvatarGroup>
          </span>
        )}
      </div>
    </article>
  )
}

export { PullRequestCard }
