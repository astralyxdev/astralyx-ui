import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  CircleSlash,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The CI check list on a pull request.
 *
 * The summary line states the *blocking* outcome, not the raw tally: a failing
 * optional check and a failing required one produce very different sentences,
 * and "3 failing" tells you nothing about whether you can merge. `required` is
 * what decides that, so the rollup reads it rather than counting statuses.
 */
export type CheckStatus = 'success' | 'failure' | 'pending' | 'running' | 'skipped'

export type StatusCheck = {
  id: string
  name: string
  status: CheckStatus
  description?: string
  duration?: string
  required?: boolean
  detail?: ReactNode
}

const ICON = {
  success: { Icon: Check, tone: 'text-[var(--green-soft-foreground)]' },
  failure: { Icon: X, tone: 'text-[var(--destructive-soft-foreground)]' },
  pending: { Icon: CircleDot, tone: 'text-[var(--amber-soft-foreground)]' },
  // Spinner has no entry: it wraps its ring in a span, so it does not share
  // the lucide call signature and is rendered separately below.
  running: { Icon: null, tone: 'text-[var(--blue-soft-foreground)]' },
  skipped: { Icon: CircleSlash, tone: 'text-muted-foreground' },
} as const

function StatusChecks({
  checks,
  defaultExpanded = [],
  optionalLabel = 'optional',
  className,
  ...props
}: ComponentProps<'div'> & {
  checks: StatusCheck[]
  defaultExpanded?: string[]
  /** Marks a non-blocking check. */
  optionalLabel?: ReactNode
}) {
  const [expanded, setExpanded] = useState<string[]>(defaultExpanded)

  const blocking = checks.filter(
    (check) => check.required !== false && check.status === 'failure',
  )
  const running = checks.filter(
    (check) => check.status === 'running' || check.status === 'pending',
  )
  const passed = checks.filter((check) => check.status === 'success')

  const summary = blocking.length
    ? {
        text: `${blocking.length} required ${blocking.length === 1 ? 'check has' : 'checks have'} failed`,
        tone: 'text-[var(--destructive-soft-foreground)]',
      }
    : running.length
      ? {
          text: `${running.length} ${running.length === 1 ? 'check is' : 'checks are'} still running`,
          tone: 'text-[var(--amber-soft-foreground)]',
        }
      : {
          text: `All ${passed.length} checks have passed`,
          tone: 'text-[var(--green-soft-foreground)]',
        }

  return (
    <div
      data-slot="status-checks"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex items-center gap-2 border-b p-3">
        <span className={cn('text-sm font-medium', summary.tone)}>
          {summary.text}
        </span>
        <Badge size="sm" className="ms-auto">
          {checks.length}
        </Badge>
      </div>

      <ul className="divide-border/60 flex list-none flex-col divide-y">
        {checks.map((check) => {
          const { Icon, tone } = ICON[check.status]
          const open = expanded.includes(check.id)

          return (
            <li key={check.id}>
              <div className="flex items-center gap-2.5 px-3 py-2">
                {check.detail ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? 'Hide' : 'Show'} ${check.name} detail`}
                    onClick={() =>
                      setExpanded((current) =>
                        open
                          ? current.filter((id) => id !== check.id)
                          : [...current, check.id],
                      )
                    }
                    className={cn(
                      'text-muted-foreground hover:text-foreground -m-1 shrink-0 p-1',
                      radius.xs,
                      interactive,
                      focusRing,
                    )}
                  >
                    {open ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                {Icon ? (
                  <Icon className={cn('size-4 shrink-0', tone)} aria-hidden="true" />
                ) : (
                  <Spinner size="sm" className={cn('shrink-0', tone)} label="Running" />
                )}

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {check.name}
                  {check.description && (
                    <span className="text-muted-foreground ms-2 font-normal">
                      {check.description}
                    </span>
                  )}
                </span>

                {check.required === false && (
                  <Badge size="sm" className="hidden sm:inline-flex">
                    {optionalLabel}
                  </Badge>
                )}
                {check.duration && (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {check.duration}
                  </span>
                )}
              </div>

              {open && check.detail && (
                <div className="bg-muted/30 border-border/60 border-t p-3">
                  {check.detail}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { StatusChecks }
