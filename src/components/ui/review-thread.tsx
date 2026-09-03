import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A review conversation anchored to a line of code.
 *
 * The anchor is rendered as context above the comments — a thread detached
 * from the line it is about is unreadable, and re-finding that line is the
 * main cost of reviewing in a browser.
 *
 * Resolving is a callback, never local state. A resolved thread is server
 * truth that other reviewers see; a component that hid it locally would show
 * two people different threads on the same diff.
 */
export type ReviewComment = {
  id: string
  author: string
  body: ReactNode
  time?: ReactNode
  /** Marks the review that requested changes. */
  pending?: boolean
}

function ReviewThread({
  path,
  line,
  snippet,
  comments,
  resolved = false,
  onResolve,
  onReply,
  resolvedLabel = 'Resolved',
  pendingLabel = 'Pending',
  replyLabel = 'Reply',
  replyPlaceholder = 'Reply…',
  replyFieldLabel = 'Reply to thread',
  resolveLabel = 'Resolve',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSubmit'> & {
  path?: string
  line?: number
  /** The anchored source line. */
  snippet?: string
  comments: ReviewComment[]
  resolved?: boolean
  onResolve?: () => void
  onReply?: (body: string) => void
  resolvedLabel?: ReactNode
  /** Badge on a comment awaiting a reply. */
  pendingLabel?: ReactNode
  replyLabel?: ReactNode
  replyPlaceholder?: string
  /** Accessible name for the reply field. */
  replyFieldLabel?: string
  resolveLabel?: ReactNode
}) {
  const [draft, setDraft] = useState('')

  return (
    <div
      data-slot="review-thread"
      data-resolved={resolved || undefined}
      className={cn(
        'border-border overflow-hidden border',
        radius.surface,
        resolved && 'opacity-70',
        className,
      )}
      {...props}
    >
      {(path || snippet) && (
        <div className="border-border bg-muted/40 border-b p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-muted-foreground size-3.5 shrink-0" />
            <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
              {path}
              {line !== undefined && `:${line}`}
            </span>
            {resolved && (
              <Badge size="sm" color="green">
                <Check />
                {resolvedLabel}
              </Badge>
            )}
          </div>

          {snippet && (
            <pre className="text-muted-foreground mt-2 overflow-x-auto font-mono text-xs">
              <code>{snippet}</code>
            </pre>
          )}
        </div>
      )}

      <ul className="divide-border/60 flex list-none flex-col divide-y">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5 px-3 py-2.5">
            <Avatar size="xs" name={comment.author} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">{comment.author}</span>
                {comment.time && (
                  <span className="text-muted-foreground text-xs">{comment.time}</span>
                )}
                {comment.pending && (
                  <Badge size="sm" color="amber">
                    {pendingLabel}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground mt-0.5 text-sm">
                {comment.body}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(onReply || onResolve) && !resolved && (
        <div className="border-border flex flex-col gap-2 border-t p-3">
          {onReply && (
            <Textarea
              rows={2}
              autoResize
              aria-label={replyFieldLabel}
              placeholder={replyPlaceholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {onReply && (
              <Button
                size="sm"
                disabled={!draft.trim()}
                onClick={() => {
                  onReply(draft)
                  setDraft('')
                }}
              >
                {replyLabel}
              </Button>
            )}
            {onResolve && (
              <Button variant="secondary" size="sm" onClick={onResolve}>
                <Check />
                {resolveLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { ReviewThread }
