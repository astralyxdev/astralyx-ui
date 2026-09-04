import type { ComponentProps, ReactNode } from 'react'
import { CheckCircle2, Construction, FileQuestion, Lock, ServerCrash, XCircle } from 'lucide-react'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The whole-page outcome: not found, forbidden, server error, done.
 *
 * **Distinct from `Empty`, and the difference matters.** An empty state means
 * "this worked, there is nothing here yet" and its job is to invite a first
 * action. A result means "your request ended this way" — it reports a status,
 * often one the user cannot fix, and its job is to say what happened and where
 * to go next. Using an empty state for a 403 tells someone to create something
 * they are not allowed to see.
 *
 * **Every status offers a way out.** A 404 with no link is a dead end that
 * sends people to the back button; the `actions` slot is where the escape goes,
 * and the presets set an icon and tone but never invent the copy — only you
 * know whether "Go back" or "Contact support" is right.
 *
 * The status is announced: errors get `role="alert"`, everything else
 * `role="status"`, so a client-side route change to an error page is not
 * silent for a screen reader — which is the failure mode of every SPA that
 * renders one of these without saying anything.
 */
export type ResultStatus = 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500'

type ResultProps = Omit<ComponentProps<'div'>, 'title'> & {
  status?: ResultStatus
  title: ReactNode
  description?: ReactNode
  /** Buttons or links. A result with no way onward is a dead end. */
  actions?: ReactNode
  /** Replaces the preset icon. */
  icon?: ReactNode
  /** Stack traces, request ids — anything a support ticket would want. */
  details?: ReactNode
  compact?: boolean
}

const PRESETS: Record<ResultStatus, { icon: ReactNode; tint: string; alert: boolean }> = {
  success: { icon: <CheckCircle2 />, tint: 'text-[var(--green-soft-foreground)]', alert: false },
  error: { icon: <XCircle />, tint: 'text-[var(--destructive)]', alert: true },
  warning: { icon: <Construction />, tint: 'text-[var(--amber-soft-foreground)]', alert: true },
  info: { icon: <FileQuestion />, tint: 'text-[var(--blue-soft-foreground)]', alert: false },
  '404': { icon: <FileQuestion />, tint: 'text-muted-foreground', alert: true },
  '403': { icon: <Lock />, tint: 'text-[var(--amber-soft-foreground)]', alert: true },
  '500': { icon: <ServerCrash />, tint: 'text-[var(--destructive)]', alert: true },
}

function Result({
  status = 'info',
  title,
  description,
  actions,
  icon,
  details,
  compact = false,
  className,
  ...props
}: ResultProps) {
  const preset = PRESETS[status]

  return (
    <div
      data-slot="result"
      data-status={status}
      // A route change to an error page is otherwise silent for a screen reader.
      role={preset.alert ? 'alert' : 'status'}
      aria-live={preset.alert ? 'assertive' : 'polite'}
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-2 py-8' : 'gap-3 py-16',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center',
          preset.tint,
          compact ? '[&_svg]:size-8' : '[&_svg]:size-12',
        )}
      >
        {icon ?? preset.icon}
      </span>

      {/* The numeric statuses read as a code first; the sentence is the title. */}
      {(status === '404' || status === '403' || status === '500') && (
        <p className="text-muted-foreground font-mono text-xs tracking-widest">{status}</p>
      )}

      <h2 className={cn('font-semibold tracking-tight', compact ? 'text-base' : 'text-xl')}>
        {title}
      </h2>

      {description && (
        <p className="text-muted-foreground max-w-prose text-sm text-balance">{description}</p>
      )}

      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>}

      {details && (
        <details className="mt-4 w-full max-w-lg text-start">
          <summary className="text-muted-foreground cursor-pointer text-xs select-none">
            Details
          </summary>
          <pre
            className={cn(
              'bg-muted text-muted-foreground mt-2 overflow-x-auto p-3 font-mono text-xs whitespace-pre-wrap',
              radius.control,
            )}
          >
            {details}
          </pre>
        </details>
      )}
    </div>
  )
}

export { Result }
export type { ResultProps }
