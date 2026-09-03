import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { UptimeStrip, type UptimeBucket } from '@/components/ui/uptime-strip'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The rows of a status page: one service, its current state, its history.
 *
 * The overall banner is derived from the services rather than passed in. A
 * status page whose headline can disagree with its own rows is worse than no
 * status page — that is precisely the failure people remember.
 */
export type ServiceState = 'operational' | 'degraded' | 'outage' | 'maintenance'

export type Service = {
  id: string
  name: string
  state: ServiceState
  description?: ReactNode
  /** Usually 90 days. */
  history?: UptimeBucket[]
  uptime?: string
}

const STATE = {
  operational: { label: 'Operational', color: 'green', dot: 'bg-[var(--green)]' },
  degraded: { label: 'Degraded', color: 'amber', dot: 'bg-[var(--amber)]' },
  outage: { label: 'Outage', color: 'destructive', dot: 'bg-[var(--destructive)]' },
  maintenance: { label: 'Maintenance', color: 'blue', dot: 'bg-[var(--blue)]' },
} as const

/** Worst state wins: one outage means the system is not "all operational". */
function overallState(services: Service[]): ServiceState {
  if (services.some((s) => s.state === 'outage')) return 'outage'
  if (services.some((s) => s.state === 'degraded')) return 'degraded'
  if (services.some((s) => s.state === 'maintenance')) return 'maintenance'
  return 'operational'
}

function ServiceStatus({
  services,
  showBanner = true,
  className,
  ...props
}: ComponentProps<'div'> & {
  services: Service[]
  showBanner?: boolean
}) {
  const overall = overallState(services)
  const banner = STATE[overall]

  return (
    <div
      data-slot="service-status"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    >
      {showBanner && (
        <div
          className={cn(
            surface,
            radius.surface,
            'flex items-center gap-2.5 p-4',
          )}
        >
          <span
            className={cn('size-2.5 shrink-0 rounded-full [corner-shape:round]', banner.dot)}
            aria-hidden="true"
          />
          <p className="text-sm font-medium">
            {overall === 'operational'
              ? 'All systems operational'
              : `${banner.label} — ${services.filter((s) => s.state !== 'operational').length} of ${services.length} services affected`}
          </p>
        </div>
      )}

      <ul className={cn(surface, radius.surface, 'list-none divide-y divide-[var(--border)]')}>
        {services.map((service) => {
          const state = STATE[service.state]
          return (
            <li key={service.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn('size-2 shrink-0 rounded-full [corner-shape:round]', state.dot)}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {service.name}
                </span>
                <Badge size="sm" color={state.color}>
                  {state.label}
                </Badge>
              </div>

              {service.description && (
                <p className="text-muted-foreground text-xs">{service.description}</p>
              )}

              {service.history && (
                <UptimeStrip
                  buckets={service.history}
                  height={20}
                  summary={service.uptime}
                  aria-label={`${service.name} uptime history`}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { ServiceStatus, overallState }
