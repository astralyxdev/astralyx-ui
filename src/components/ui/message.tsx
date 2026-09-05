import type { ComponentProps, ReactNode } from 'react'
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { radius } from '@/lib/styles'
import { useClipboard } from '@/lib/use-clipboard'
import { cn } from '@/lib/utils'

/**
 * One turn in a conversation.
 *
 * The two roles are shaped differently on purpose: a user message is a bubble
 * pinned to the trailing edge, an assistant message is full-width prose. Giving
 * both the same bubble makes a long answer unreadable, and makes it harder to
 * tell at a glance who said what.
 */
// Omitted because the DOM declares it too, and in an intersection the DOM
// signature wins — which left the prop below unusable and the generated docs
// advertising the browser's handler instead of ours.
type MessageProps = Omit<ComponentProps<'div'>, 'onCopy'> & {
  role: 'user' | 'assistant'
  /** Author name, used for the avatar's initials. */
  name?: string
  avatar?: ReactNode
  /** Action row under an assistant message. */
  actions?: boolean
  onCopy?: () => void
  onRetry?: () => void
  onVote?: (vote: 'up' | 'down') => void
  /** Raw text used by the copy button. Falls back to nothing. */
  copyText?: string
  copyLabel?: string
  /** Replaces `copyLabel` in the tooltip once copied. */
  copiedLabel?: string
  retryLabel?: string
  upvoteLabel?: string
  downvoteLabel?: string
}

function Message({
  className,
  role,
  name,
  avatar,
  actions = role === 'assistant',
  onCopy,
  onRetry,
  onVote,
  copyText,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  retryLabel = 'Retry',
  upvoteLabel = 'Good response',
  downvoteLabel = 'Bad response',
  children,
  ...props
}: MessageProps) {
  const { copy: writeClipboard, copied } = useClipboard()
  const user = role === 'user'

  function copy() {
    if (copyText) void writeClipboard(copyText)
    onCopy?.()
  }

  return (
    <div
      data-slot="message"
      data-role={role}
      className={cn(
        'flex w-full gap-3',
        user ? 'justify-end' : 'justify-start',
        className,
      )}
      {...props}
    >
      {!user && (avatar ?? <Avatar size="sm" name={name ?? 'Assistant'} />)}

      <div className={cn('min-w-0 space-y-2', user ? 'max-w-[80%]' : 'flex-1')}>
        <div
          className={cn(
            'text-sm leading-relaxed',
            user
              ? cn('bg-secondary text-secondary-foreground px-4 py-2.5', radius.panel)
              : 'text-foreground',
          )}
        >
          {children}
        </div>

        {actions && (
          <div className="flex items-center gap-0.5">
            <Tooltip content={copied ? copiedLabel : copyLabel}>
              <Button variant="ghost" size="icon-xs" aria-label={copyLabel} onClick={copy}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </Tooltip>
            {onRetry && (
              <Tooltip content="Try again">
                <Button variant="ghost" size="icon-xs" aria-label={retryLabel} onClick={onRetry}>
                  <RefreshCw />
                </Button>
              </Tooltip>
            )}
            {onVote && (
              <>
                <Tooltip content={upvoteLabel}>
                  <Button variant="ghost" size="icon-xs" aria-label={upvoteLabel} onClick={() => onVote('up')}>
                    <ThumbsUp />
                  </Button>
                </Tooltip>
                <Tooltip content={downvoteLabel}>
                  <Button variant="ghost" size="icon-xs" aria-label={downvoteLabel} onClick={() => onVote('down')}>
                    <ThumbsDown />
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        )}
      </div>

      {user && (avatar ?? <Avatar size="sm" name={name ?? 'You'} fallback={<User className="size-3.5" />} />)}
    </div>
  )
}

/**
 * The three-dot pulse shown while a reply is being generated.
 *
 * `role="status"` with a screen-reader label, because a purely visual animation
 * tells a screen-reader user nothing about why the interface has gone quiet.
 */
function MessagePending({
  className,
  label = 'Generating a response',
  ...props
}: ComponentProps<'div'> & { label?: string }) {
  return (
    <div
      role="status"
      data-slot="message-pending"
      className={cn('flex items-center gap-3', className)}
      {...props}
    >
      <Avatar size="sm" name="Assistant" />
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="bg-muted-foreground/60 size-1.5 rounded-full motion-safe:animate-[message-dot_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${index * 0.16}s` }}
          />
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}

export { Message, MessagePending }
export type { MessageProps }
