import type { ComponentProps, ReactNode } from 'react'
import { Paperclip, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A conversation list — inbox, DMs, support threads.
 *
 * Unread is carried by weight and a dot, never by colour alone. A list where
 * unread rows are simply a shade darker is unreadable to a good share of people
 * and invisible in bright sunlight, which is where phones are used.
 *
 * The preview is the last message regardless of who sent it, prefixed with
 * "You:" when it was yours. A list that only previews incoming messages leaves
 * a thread you just replied to looking untouched.
 */
export type Thread = {
  id: string
  title: ReactNode
  /** Last message, whoever sent it. */
  preview?: ReactNode
  /** True when the last message is the current user's. */
  fromMe?: boolean
  at?: Date
  unread?: number
  participants?: string[]
  avatar?: ReactNode
  attachments?: number
  badge?: ReactNode
  muted?: boolean
}

function ThreadList({
  threads,
  selected,
  onSelect,
  now,
  locale = 'en-GB',
  emptyLabel = 'No conversations',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  threads: Thread[]
  selected?: string
  onSelect?: (id: string) => void
  now?: Date
  locale?: string
  emptyLabel?: ReactNode
}) {
  return (
    <div
      data-slot="thread-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {threads.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border)]">
          {threads.map((thread) => {
            const unread = (thread.unread ?? 0) > 0
            const active = selected === thread.id

            return (
              <li key={thread.id}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect?.(thread.id)}
                  className={cn(
                    'hover:bg-accent/40 flex w-full items-start gap-3 p-3 text-start',
                    interactive,
                    focusRing,
                    active && 'bg-accent/60',
                  )}
                >
                  <span className="relative mt-0.5 shrink-0">
                    {thread.avatar ??
                      (thread.participants && thread.participants.length > 1 ? (
                        <span className="bg-secondary text-muted-foreground flex size-8 items-center justify-center rounded-full [corner-shape:round]">
                          <Users className="size-4" />
                        </span>
                      ) : (
                        <Avatar size="sm" name={thread.participants?.[0] ?? String(thread.title)} />
                      ))}
                    {/* A dot as well as weight — colour alone is not enough. */}
                    {unread && !thread.muted && (
                      <span
                        aria-hidden="true"
                        className="bg-primary ring-background absolute -end-0.5 -top-0.5 size-2.5 rounded-full ring-2 [corner-shape:round]"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          unread && !thread.muted ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {thread.title}
                      </span>
                      {thread.at && (
                        <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                          <Fmt type="relative" value={thread.at} now={now} locale={locale} />
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 flex items-center gap-1.5">
                      {thread.attachments ? (
                        <Paperclip className="text-muted-foreground size-3 shrink-0" aria-hidden="true" />
                      ) : null}
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-xs',
                          unread && !thread.muted ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {/* Prefixed when it was yours, so a thread you just
                            replied to does not look untouched. */}
                        {thread.fromMe && <span className="text-muted-foreground">You: </span>}
                        {thread.preview}
                      </span>

                      {thread.badge}
                      {unread && (
                        <Badge size="sm" color={thread.muted ? 'neutral' : 'blue'} className="shrink-0">
                          {thread.unread}
                        </Badge>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { ThreadList }
