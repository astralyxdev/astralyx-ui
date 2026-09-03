import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Flag, TriangleAlert, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A review queue for reported content.
 *
 * Reported content is blurred until revealed. Moderators do not consent to
 * seeing every image that gets flagged, and a queue that renders graphic
 * material on load is a duty-of-care failure — the reveal is per item and
 * deliberate.
 *
 * Decisions are reported, never applied locally. Two moderators working the
 * same queue must not both act on one item because each interface hid it
 * optimistically; the server decides who won.
 *
 * The report count and reason distribution are shown together — ten reports for
 * spam is a different problem from ten reports across five unrelated reasons,
 * which usually means brigading.
 */
export type ModerationItem = {
  id: string
  author: ReactNode
  authorAvatar?: ReactNode
  content: ReactNode
  /** Blur until revealed. Default for anything reported as graphic. */
  sensitive?: boolean
  reportedAt: Date
  reportCount?: number
  /** Reason to count. */
  reasons?: Record<string, number>
  status?: 'pending' | 'approved' | 'removed'
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_SELECT_ITEM_LABEL: (id: string) => string = (id) => `Select item ${id}`
const DEFAULT_SELECTED_LABEL: (count: number) => ReactNode = (count) => `${count} selected`
const DEFAULT_PENDING_LABEL: (count: number) => ReactNode = (count) => `${count} pending`

function ModerationQueue({
  items,
  onDecide,
  onBulkDecide,
  now,
  locale = 'en-GB',
  emptyLabel = 'Queue is clear',
  selectAllLabel = 'Select all pending',
  clearSelectionLabel = 'Clear selection',
  selectItemLabel = DEFAULT_SELECT_ITEM_LABEL,
  selectedLabel = DEFAULT_SELECTED_LABEL,
  pendingLabel = DEFAULT_PENDING_LABEL,
  approveLabel = 'Approve',
  removeLabel = 'Remove',
  approvedLabel = 'Approved',
  removedLabel = 'Removed',
  reportedLabel = 'reported',
  revealLabel = 'Reveal reported content',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  items: ModerationItem[]
  onDecide?: (id: string, decision: 'approve' | 'remove') => void
  onBulkDecide?: (ids: string[], decision: 'approve' | 'remove') => void
  now?: Date
  locale?: string
  emptyLabel?: ReactNode
  selectAllLabel?: string
  clearSelectionLabel?: string
  selectItemLabel?: (id: string) => string
  selectedLabel?: (count: number) => ReactNode
  pendingLabel?: (count: number) => ReactNode
  approveLabel?: ReactNode
  removeLabel?: ReactNode
  approvedLabel?: ReactNode
  removedLabel?: ReactNode
  /** Precedes the report time. */
  reportedLabel?: ReactNode
  /** Button that unblurs a sensitive item. */
  revealLabel?: ReactNode
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [revealed, setRevealed] = useState<string[]>([])

  const pending = items.filter((item) => (item.status ?? 'pending') === 'pending')
  const allSelected = pending.length > 0 && pending.every((i) => selected.includes(i.id))

  return (
    <div
      data-slot="moderation-queue"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-2">
        <Checkbox
          aria-label={allSelected ? clearSelectionLabel : selectAllLabel}
          checked={allSelected}
          indeterminate={selected.length > 0 && !allSelected}
          onChange={() => setSelected(allSelected ? [] : pending.map((i) => i.id))}
        />
        <span className="text-muted-foreground text-xs">
          {selected.length > 0 ? selectedLabel(selected.length) : pendingLabel(pending.length)}
        </span>

        {selected.length > 0 && onBulkDecide && (
          <div className="ms-auto flex gap-1.5">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                onBulkDecide(selected, 'approve')
                setSelected([])
              }}
            >
              <Check />
              {approveLabel}
            </Button>
            <Button
              size="xs"
              color="destructive"
              onClick={() => {
                onBulkDecide(selected, 'remove')
                setSelected([])
              }}
            >
              <X />
              {removeLabel}
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border)]">
          {items.map((item) => {
            const status = item.status ?? 'pending'
            const shown = revealed.includes(item.id) || !item.sensitive
            const reasons = Object.entries(item.reasons ?? {})

            return (
              <li key={item.id} className={cn('flex flex-col gap-3 p-3', status !== 'pending' && 'opacity-60')}>
                <div className="flex items-start gap-2.5">
                  {status === 'pending' && (
                    <Checkbox
                      aria-label={selectItemLabel(item.id)}
                      checked={selected.includes(item.id)}
                      className="mt-0.5"
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id],
                        )
                      }
                    />
                  )}

                  {item.authorAvatar ?? <Avatar size="xs" name={String(item.author)} className="mt-0.5 shrink-0" />}

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{item.author}</span>
                      {item.reportCount !== undefined && (
                        <Badge size="sm" color={item.reportCount >= 5 ? 'destructive' : 'amber'}>
                          <Flag />
                          {item.reportCount}
                        </Badge>
                      )}
                      {status === 'approved' && (
                        <Badge size="sm" color="green">
                          {approvedLabel}
                        </Badge>
                      )}
                      {status === 'removed' && (
                        <Badge size="sm" color="destructive">
                          {removedLabel}
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground/80 text-xs">
                      {reportedLabel} <Fmt type="relative" value={item.reportedAt} now={now} locale={locale} />
                    </p>
                  </div>
                </div>

                {/* Blurred until deliberately revealed. */}
                <div className="relative">
                  <div
                    className={cn(
                      'text-muted-foreground text-sm',
                      !shown && 'pointer-events-none blur-md select-none',
                    )}
                  >
                    {item.content}
                  </div>
                  {!shown && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setRevealed((current) => [...current, item.id])}
                      >
                        <TriangleAlert />
                        {revealLabel}
                      </Button>
                    </div>
                  )}
                </div>

                {reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {reasons.map(([reason, count]) => (
                      <Badge key={reason} size="sm">
                        {reason} · {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {status === 'pending' && onDecide && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" variant="secondary" onClick={() => onDecide(item.id, 'approve')}>
                      <Check />
                      {approveLabel}
                    </Button>
                    <Button size="xs" color="destructive" onClick={() => onDecide(item.id, 'remove')}>
                      <X />
                      {removeLabel}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { ModerationQueue }
