import type { ComponentProps, ReactNode } from 'react'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A vertical run of events sharing one rail.
 *
 * The connector is drawn by each item rather than by the container, as a line
 * that stops at the last one (`last:before:hidden`). A single line behind the
 * whole list is easier to write and wrong at both ends: it overshoots the
 * final marker and starts above the first.
 *
 * An ordered list, because a timeline is one — sequence is the meaning, and a
 * screen reader should announce the count and position.
 */
function Timeline({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="timeline"
      className={cn('flex list-none flex-col', className)}
      {...props}
    />
  )
}

type TimelineItemProps = ComponentProps<'li'> & {
  /** The marker. A dot is drawn when omitted. */
  icon?: ReactNode
  title: ReactNode
  /** Right-aligned on wide screens, under the title on narrow ones. */
  time?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
  /** Draw the marker as an outline. For pending or skipped events. */
  pending?: boolean
}

const TONE = {
  default: 'bg-primary text-primary-foreground border-primary',
  success: 'bg-[var(--green)] text-[var(--green-foreground)] border-[var(--green)]',
  warning: 'bg-[var(--amber)] text-[var(--amber-foreground)] border-[var(--amber)]',
  danger: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] border-[var(--destructive)]',
  info: 'bg-[var(--blue)] text-[var(--blue-foreground)] border-[var(--blue)]',
  muted: 'bg-muted text-muted-foreground border-border',
} as const

const PENDING_TONE = {
  default: 'text-muted-foreground border-border',
  success: 'text-[var(--green-soft-foreground)] border-[var(--green)]',
  warning: 'text-[var(--amber-soft-foreground)] border-[var(--amber)]',
  danger: 'text-[var(--destructive-soft-foreground)] border-[var(--destructive)]',
  info: 'text-[var(--blue-soft-foreground)] border-[var(--blue)]',
  muted: 'text-muted-foreground border-border',
} as const

function TimelineItem({
  icon,
  title,
  time,
  tone = 'default',
  pending = false,
  children,
  className,
  ...props
}: TimelineItemProps) {
  return (
    <li
      data-slot="timeline-item"
      className={cn(
        'relative flex gap-3 pb-5 ps-0 last:pb-0',
        // The rail: a 1px line behind the marker column, hidden on the last
        // item so it never dangles past the final event.
        'before:bg-border before:absolute before:top-6 before:bottom-0 before:start-[11px] before:w-px before:content-[""]',
        'last:before:hidden',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border [corner-shape:round]',
          "[&_svg:not([class*='size-'])]:size-3.5",
          pending ? cn('bg-background', PENDING_TONE[tone]) : TONE[tone],
        )}
      >
        {icon ?? <span className="size-1.5 rounded-full bg-current [corner-shape:round]" />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <div className="flex flex-col gap-x-3 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="min-w-0 text-sm font-medium">{title}</div>
          {time && (
            <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {time}
            </div>
          )}
        </div>
        {children && (
          <div className="text-muted-foreground text-sm">{children}</div>
        )}
      </div>
    </li>
  )
}

/** A framed body under an event — a log excerpt, a diff, a message. */
function TimelineContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="timeline-content"
      className={cn('border-border bg-muted/40 mt-1 border p-3 text-sm', radius.control, className)}
      {...props}
    />
  )
}

export { Timeline, TimelineContent, TimelineItem }
export type { TimelineItemProps }
