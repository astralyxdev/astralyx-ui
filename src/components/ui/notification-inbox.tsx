import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Inbox } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A notification list, grouped by day, with unread state.
 *
 * Unread is reported, never assumed. Marking things read on render is the
 * classic mistake: a panel that opens behind a click clears everything the user
 * never actually saw. Reading happens when someone acts, which is the caller's
 * call to make.
 *
 * Grouping by day rather than showing a flat list with timestamps — "when"
 * is the axis people scan a notification list along, exactly as with a commit
 * history.
 */
export type Notification = {
  id: string
  title: ReactNode
  description?: ReactNode
  time: Date
  read?: boolean
  actor?: string
  icon?: ReactNode
  onSelect?: () => void
}

function NotificationInbox({
  notifications,
  onRead,
  onReadAll,
  locale = 'en-GB',
  now,
  emptyLabel = 'Nothing new',
  title = 'Notifications',
  markAllLabel = 'Mark all',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  notifications: Notification[]
  onRead?: (id: string) => void
  onReadAll?: () => void
  locale?: string
  now?: Date
  emptyLabel?: ReactNode
  title?: ReactNode
  markAllLabel?: ReactNode
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unread = notifications.filter((entry) => !entry.read).length
  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const groups = useMemo(() => {
    const heading = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const out: [string, Notification[]][] = []
    for (const entry of visible) {
      const key = heading.format(entry.time)
      const last = out.at(-1)
      if (last?.[0] === key) last[1].push(entry)
      else out.push([key, [entry]])
    }
    return out
  }, [visible, locale])

  return (
    <div
      data-slot="notification-inbox"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex items-center gap-2 border-b p-2">
        <Inbox className="text-muted-foreground ms-1 size-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
        {unread > 0 && <Badge size="sm">{unread}</Badge>}

        <div className="ms-auto flex items-center gap-1">
          {(['all', 'unread'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'h-7 px-2.5 text-xs font-medium',
                radius.control,
                interactive,
                focusRing,
                filter === value
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'all' ? 'All' : 'Unread'}
            </button>
          ))}

          {onReadAll && unread > 0 && (
            <Button variant="ghost" size="xs" onClick={onReadAll}>
              <Check />
              {markAllLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {groups.map(([day, entries]) => (
          <section key={day}>
            <h3 className="bg-muted/40 text-muted-foreground sticky top-0 p-3 text-xs font-medium">
              {day}
            </h3>

            <ul className="list-none divide-y divide-[var(--border)]">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => {
                      entry.onSelect?.()
                      if (!entry.read) onRead?.(entry.id)
                    }}
                    className={cn(
                      'hover:bg-accent/40 flex w-full items-start gap-2.5 p-3 text-start',
                      interactive,
                      focusRing,
                    )}
                  >
                    <span className="relative mt-0.5 shrink-0">
                      {entry.icon ?? <Avatar size="xs" name={entry.actor ?? '?'} />}
                      {!entry.read && (
                        <span
                          aria-hidden="true"
                          className="bg-primary absolute -end-0.5 -top-0.5 size-2 rounded-full [corner-shape:round]"
                        />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm',
                          entry.read ? 'text-muted-foreground' : 'font-medium',
                        )}
                      >
                        {entry.title}
                        {!entry.read && <span className="sr-only"> (unread)</span>}
                      </span>
                      {entry.description && (
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {entry.description}
                        </span>
                      )}
                      <span className="text-muted-foreground/70 mt-1 block text-xs">
                        <Fmt type="relative" value={entry.time} now={now} locale={locale} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {visible.length === 0 && (
          <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}

export { NotificationInbox }
