import { useState, type ComponentProps, type ReactNode } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Thumbs up or down on a response, with an optional reason.
 *
 * The rating is sent the moment it is clicked; the reason is a separate,
 * optional follow-up. Holding the rating hostage to a comment box is how
 * feedback widgets collect almost nothing — the signal you actually get is the
 * click, and asking for prose first loses it.
 *
 * A second click on the same thumb clears the rating, because the most common
 * correction is having hit the wrong one.
 */
export type Rating = 'up' | 'down'

function Feedback({
  rating: ratingProp,
  onRate,
  onComment,
  reasons,
  prompt = 'Was this helpful?',
  commentLabel = 'Additional feedback',
  commentPlaceholder = 'Anything else? (optional)',
  sendLabel = 'Send',
  thanksLabel = 'Thanks — that helps.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  rating?: Rating | null
  onRate?: (rating: Rating | null) => void
  onComment?: (comment: string, rating: Rating | null) => void
  /** Quick-pick reasons offered after a thumbs down. */
  reasons?: string[]
  prompt?: ReactNode
  /** Accessible name for the free-text field. */
  commentLabel?: string
  commentPlaceholder?: string
  sendLabel?: ReactNode
  /** Confirmation shown once feedback is sent. */
  thanksLabel?: ReactNode
}) {
  const controlled = ratingProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<Rating | null>(null)
  const rating = controlled ? ratingProp : uncontrolled

  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)

  function rate(next: Rating) {
    const value = rating === next ? null : next
    if (!controlled) setUncontrolled(value)
    onRate?.(value)
    if (value === null) setSent(false)
  }

  return (
    <div
      data-slot="feedback"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">{prompt}</span>

        <div className="flex items-center gap-1">
          {(['up', 'down'] as const).map((value) => {
            const active = rating === value
            const Icon = value === 'up' ? ThumbsUp : ThumbsDown
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                aria-label={value === 'up' ? 'Helpful' : 'Not helpful'}
                onClick={() => rate(value)}
                className={cn(
                  'inline-flex size-7 items-center justify-center',
                  radius.control,
                  interactive,
                  focusRing,
                  active
                    ? value === 'up'
                      ? 'bg-[color-mix(in_oklab,var(--green),transparent_85%)] text-[var(--green-soft-foreground)]'
                      : 'bg-[color-mix(in_oklab,var(--destructive),transparent_85%)] text-[var(--destructive-soft-foreground)]'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
              </button>
            )
          })}
        </div>
      </div>

      {rating === 'down' && reasons && reasons.length > 0 && !sent && (
        <div className="flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => {
                onComment?.(reason, rating)
                setSent(true)
              }}
              className={cn(
                'bg-secondary text-muted-foreground hover:text-foreground h-6 px-2.5 text-xs',
                radius.control,
                interactive,
                focusRing,
              )}
            >
              {reason}
            </button>
          ))}
        </div>
      )}

      {rating && onComment && !sent && (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            autoResize
            aria-label={commentLabel}
            placeholder={commentPlaceholder}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <div>
            <Button
              size="xs"
              variant="secondary"
              disabled={!comment.trim()}
              onClick={() => {
                onComment(comment, rating)
                setSent(true)
              }}
            >
              {sendLabel}
            </Button>
          </div>
        </div>
      )}

      {sent && (
        <p className="text-muted-foreground text-xs" role="status">
          {thanksLabel}
        </p>
      )}
    </div>
  )
}

export { Feedback }
