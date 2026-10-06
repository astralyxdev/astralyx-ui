import type { ComponentProps, ReactNode } from 'react'
import { enterFade } from '@/lib/motion'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The state a list is in before it has anything in it.
 *
 * Worth a component because the empty case is the one most often left as a bare
 * sentence — an icon, a reason and a next action are what make it useful rather
 * than merely honest.
 */
function Empty({
  className,
  icon,
  title,
  description,
  action,
  bordered = true,
  ...props
}: ComponentProps<'div'> & {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  bordered?: boolean
}) {
  return (
    <div
      data-slot="empty"
      className={cn(
        enterFade,
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        bordered && `border-border border border-dashed ${radius.panel}`,
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="bg-secondary text-muted-foreground grid size-10 place-items-center rounded-full [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        {description && (
          <p className="text-muted-foreground mx-auto max-w-sm text-xs">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}

/**
 * An empty list inside a section: one quiet line where the first row would
 * start.
 *
 * `Empty` is for a page or a whole panel with nothing in it. Inside a card
 * that already has a heading — "Recent payouts", "API keys" — a centred block
 * with an icon in a circle is the loudest thing on the page and says the least,
 * and in a wide column it floats a long way from the heading it belongs to.
 */
function EmptyNote({
  className,
  icon,
  inset = false,
  children,
  ...props
}: ComponentProps<'p'> & {
  icon?: ReactNode
  /** On a quiet fill, standing in for the surface the list would have drawn. */
  inset?: boolean
}) {
  return (
    <p
      data-slot="empty-note"
      className={cn(
        'text-muted-foreground flex items-center gap-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0',
        inset && cn('bg-muted/50 px-3 py-2.5', radius.control),
        className,
      )}
      {...props}
    >
      {icon}
      <span className="min-w-0">{children}</span>
    </p>
  )
}

export { Empty, EmptyNote }
