import type { ComponentProps, ReactNode } from 'react'
import { Laptop, ShieldCheck, Smartphone, Tablet, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Devices trusted to skip a second factor.
 *
 * Distinct from `SessionList`: a session is a login that can be signed out, a
 * trusted device is a standing exemption from 2FA that survives sign-out. They
 * are revoked separately and confusing them is how someone "signs out
 * everywhere" and is still not protected.
 *
 * Trust expiry is shown, because these grants are time-boxed and a device
 * listed as trusted with no end date reads as permanent.
 */
export type TrustedDevice = {
  id: string
  name: ReactNode
  kind: 'desktop' | 'mobile' | 'tablet'
  os?: ReactNode
  addedAt?: Date
  lastSeen?: Date
  /** When the trust grant lapses. */
  trustedUntil?: Date
  current?: boolean
}

const ICON = { desktop: Laptop, mobile: Smartphone, tablet: Tablet } as const

function DeviceList({
  devices,
  onRevoke,
  now,
  locale = 'en-GB',
  title = 'Trusted devices',
  emptyLabel = 'No trusted devices',
  currentLabel = 'This device',
  expiredLabel = 'Trust expired',
  revokeLabel = 'Revoke',
  seenLabel = 'seen',
  trustedUntilLabel = 'trusted until',
  expiredPrefix = 'expired',
  footer = 'Revoking trust asks for a second factor next time. It does not sign the device out — do that from active sessions.',
  className,
  ...props
}: ComponentProps<'div'> & {
  devices: TrustedDevice[]
  onRevoke?: (id: string) => void
  now?: Date
  locale?: string
  title?: ReactNode
  emptyLabel?: ReactNode
  /** Badge on the device being used right now. */
  currentLabel?: ReactNode
  /** Badge on a device whose trust grant has lapsed. */
  expiredLabel?: ReactNode
  revokeLabel?: ReactNode
  /** Precedes the last-seen time. */
  seenLabel?: ReactNode
  /** Precedes the expiry date while the grant still holds. */
  trustedUntilLabel?: ReactNode
  /** Precedes the expiry date once it has lapsed. */
  expiredPrefix?: ReactNode
  /** Explanatory note beneath the list. Pass `null` to drop it. */
  footer?: ReactNode
}) {
  const reference = now ?? new Date()

  return (
    <div
      data-slot="device-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex items-center gap-2 border-b p-3">
        <ShieldCheck className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
        <Badge size="sm" className="ms-auto">
          {devices.length}
        </Badge>
      </div>

      {devices.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border)]">
          {devices.map((device) => {
            const Icon = ICON[device.kind]
            const lapsed = device.trustedUntil && device.trustedUntil < reference

            return (
              <li key={device.id} className={cn('flex items-start gap-3 p-3', lapsed && 'opacity-60')}>
                <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {device.name}
                    {device.current && (
                      <Badge size="sm" color="green">
                        {currentLabel}
                      </Badge>
                    )}
                    {lapsed && (
                      <Badge size="sm" color="amber">
                        <TriangleAlert />
                        {expiredLabel}
                      </Badge>
                    )}
                  </p>

                  <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    {device.os && <span>{device.os}</span>}
                    {device.lastSeen && (
                      <span>
                        {seenLabel} <Fmt type="relative" value={device.lastSeen} now={reference} locale={locale} />
                      </span>
                    )}
                    {/* Time-boxed grants need their end date stated. */}
                    {device.trustedUntil && (
                      <span>
                        {lapsed ? expiredPrefix : trustedUntilLabel}{' '}
                        <Fmt type="date" value={device.trustedUntil} format="D MMM YYYY" locale={locale} />
                      </span>
                    )}
                  </p>
                </div>

                {onRevoke && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="shrink-0 text-[var(--destructive-soft-foreground)]"
                    onClick={() => onRevoke(device.id)}
                  >
                    {revokeLabel}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {footer && (
        <p className="border-border text-muted-foreground border-t p-3 text-xs">
          {footer}
        </p>
      )}
    </div>
  )
}

export { DeviceList }
