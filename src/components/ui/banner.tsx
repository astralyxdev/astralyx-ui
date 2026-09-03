import { useState, type ComponentProps, type ReactNode } from 'react'
import { Info, TriangleAlert, X, CircleCheck, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A page-level announcement strip: maintenance windows, trial expiry, an
 * outage notice.
 *
 * Distinct from `Alert`, which sits inside a layout and belongs to the content
 * around it. A banner spans the page and belongs to the session, so it is full
 * bleed, dismissible, and does not steal focus.
 *
 * `role="status"` rather than `role="alert"`. An assertive alert interrupts
 * whatever a screen reader is saying, which is right for a form error and
 * wrong for "scheduled maintenance on Sunday".
 */
const TONE = {
  info: {
    Icon: Info,
    surface: 'bg-[color-mix(in_oklab,var(--blue),transparent_88%)] text-foreground',
    icon: 'text-[var(--blue-soft-foreground)]',
  },
  success: {
    Icon: CircleCheck,
    surface: 'bg-[color-mix(in_oklab,var(--green),transparent_88%)] text-foreground',
    icon: 'text-[var(--green-soft-foreground)]',
  },
  warning: {
    Icon: TriangleAlert,
    surface: 'bg-[color-mix(in_oklab,var(--amber),transparent_88%)] text-foreground',
    icon: 'text-[var(--amber-soft-foreground)]',
  },
  danger: {
    Icon: CircleAlert,
    surface: 'bg-[color-mix(in_oklab,var(--destructive),transparent_88%)] text-foreground',
    icon: 'text-[var(--destructive-soft-foreground)]',
  },
  neutral: {
    Icon: Info,
    surface: 'bg-secondary text-foreground',
    icon: 'text-muted-foreground',
  },
} as const

function Banner({
  tone = 'info',
  title,
  children,
  action,
  dismissible = false,
  onDismiss,
  icon,
  sticky = false,
  dismissLabel = 'Dismiss',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  tone?: keyof typeof TONE
  title?: ReactNode
  action?: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  icon?: ReactNode
  sticky?: boolean
  /** Accessible name for the dismiss button. */
  dismissLabel?: string
}) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  const { Icon, surface, icon: iconTone } = TONE[tone]

  return (
    <div
      role="status"
      data-slot="banner"
      data-tone={tone}
      className={cn(
        'flex w-full items-center gap-3 p-4 text-sm',
        surface,
        sticky && 'sticky top-0 z-40',
        className,
      )}
      {...props}
    >
      <span className={cn('shrink-0', iconTone)} aria-hidden="true">
        {icon ?? <Icon className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        {title && <span className="font-medium">{title} </span>}
        <span className="text-muted-foreground">{children}</span>
      </div>

      {action && <div className="shrink-0">{action}</div>}

      {dismissible && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={dismissLabel}
          className={cn('shrink-0', radius.xs, focusRing)}
          onClick={() => {
            setOpen(false)
            onDismiss?.()
          }}
        >
          <X />
        </Button>
      )}
    </div>
  )
}

export { Banner }
