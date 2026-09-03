import type { ComponentProps, ReactNode } from 'react'
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

export { Empty }
