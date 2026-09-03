import type { ComponentProps, ReactNode } from 'react'
import { Check, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sparkline } from '@/components/ui/sparkline'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Endpoint probes: status, latency, and recent history.
 *
 * Latency carries a threshold so "200 OK in 4 seconds" reads as degraded rather
 * than healthy. A probe list that only reports the status code is why slow
 * outages get noticed by customers first.
 *
 * The sparkline is latency over recent probes, which turns "is this getting
 * worse" into something answerable at a glance — the single number cannot say
 * whether 400ms is the new normal or the start of something.
 */
export type HealthCheck = {
  id: string
  name: string
  url?: string
  status: 'healthy' | 'degraded' | 'down'
  /** Milliseconds. */
  latency?: number
  /** Above this, a healthy response still reads as degraded. */
  latencyThreshold?: number
  code?: number
  history?: number[]
  region?: ReactNode
}

const STATUS = {
  healthy: { Icon: Check, tone: 'text-[var(--green-soft-foreground)]', color: 'green', label: 'Healthy' },
  degraded: { Icon: TriangleAlert, tone: 'text-[var(--amber-soft-foreground)]', color: 'amber', label: 'Degraded' },
  down: { Icon: X, tone: 'text-[var(--destructive-soft-foreground)]', color: 'destructive', label: 'Down' },
} as const

/** A slow success is not a success. */
function effectiveStatus(check: HealthCheck) {
  if (check.status === 'healthy' && check.latencyThreshold && check.latency) {
    return check.latency > check.latencyThreshold ? 'degraded' : 'healthy'
  }
  return check.status
}

function HealthChecks({
  checks,
  className,
  ...props
}: ComponentProps<'div'> & { checks: HealthCheck[] }) {
  return (
    <div
      data-slot="health-checks"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <ul className="list-none divide-y divide-[var(--border)]">
        {checks.map((check) => {
          const status = effectiveStatus(check)
          const { Icon, tone, color, label } = STATUS[status]
          const slow =
            status === 'degraded' && check.status === 'healthy'

          return (
            <li key={check.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <Icon className={cn('size-4 shrink-0', tone)} aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{check.name}</span>
                  {check.region}
                </p>
                {check.url && (
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {check.url}
                  </p>
                )}
              </div>

              {check.history && check.history.length > 1 && (
                <Sparkline
                  values={check.history}
                  color={
                    status === 'healthy'
                      ? 'var(--green)'
                      : status === 'degraded'
                        ? 'var(--amber)'
                        : 'var(--destructive)'
                  }
                  className="h-6 w-20 shrink-0"
                />
              )}

              {check.latency !== undefined && (
                <span
                  className={cn(
                    'min-w-16 shrink-0 text-end text-xs tabular-nums whitespace-nowrap',
                    slow ? 'text-[var(--amber-soft-foreground)]' : 'text-muted-foreground',
                  )}
                >
                  {check.latency} ms
                </span>
              )}

              {check.code !== undefined && (
                <code className="text-muted-foreground shrink-0 font-mono text-xs">
                  {check.code}
                </code>
              )}

              <Badge size="sm" color={color}>
                {label}
              </Badge>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { HealthChecks, effectiveStatus }
