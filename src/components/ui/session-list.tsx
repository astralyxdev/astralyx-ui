import { useState, type ComponentProps, type ReactNode } from 'react'
import { Globe, Laptop, Smartphone, Tablet, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Active sessions, revocable.
 *
 * The current session is marked and cannot be revoked from this list —
 * revoking it logs you out mid-action, which reads as a crash rather than a
 * choice. "Sign out everywhere else" is the safe form of that intent and is
 * offered separately.
 *
 * Location is labelled as approximate. It comes from IP geolocation, which is
 * routinely a different city and sometimes a different country; presenting it
 * as fact makes people hunt for a breach that is actually a VPN endpoint.
 */
export type Session = {
  id: string
  device: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser?: ReactNode
  os?: ReactNode
  ip?: string
  /** Approximate, from IP geolocation. */
  location?: ReactNode
  lastActive?: Date
  createdAt?: Date
  current?: boolean
  suspicious?: boolean
}

const ICON = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Globe,
} as const

/**
 * Default formatters at module scope — an inline arrow default is a value
 * the React Compiler cannot reorder, and it bails on the whole component.
 */
const DEFAULT_SIGN_OUT_OTHERS_LABEL = (count: number) =>
    `Sign out ${count} other ${count === 1 ? 'session' : 'sessions'}`

function SessionList({
  sessions,
  onRevoke,
  onRevokeOthers,
  now,
  locale = 'en-GB',
  title = 'Active sessions',
  currentLabel = 'This device',
  suspiciousLabel = 'Unusual',
  unknownBrowserLabel = 'Unknown browser',
  onLabel = 'on',
  approxLabel = '(approx.)',
  activeLabel = 'active',
  signOutLabel = 'Sign out',
  signOutOthersLabel = DEFAULT_SIGN_OUT_OTHERS_LABEL,
  confirmNote = 'This device will need to sign in again.',
  confirmLabel = 'Sign out',
  cancelLabel = 'Cancel',
  className,
  ...props
}: ComponentProps<'div'> & {
  sessions: Session[]
  onRevoke?: (id: string) => void
  onRevokeOthers?: () => void
  now?: Date
  locale?: string
  title?: ReactNode
  currentLabel?: ReactNode
  suspiciousLabel?: ReactNode
  /** Stand-in when a session reports no browser. */
  unknownBrowserLabel?: ReactNode
  /** Joins browser and OS — "Chrome 141 on macOS". */
  onLabel?: ReactNode
  /** Qualifies the IP-derived location. */
  approxLabel?: ReactNode
  /** Precedes the last-active time. */
  activeLabel?: ReactNode
  signOutLabel?: ReactNode
  /** Takes the count, so the plural is yours to form. */
  signOutOthersLabel?: (count: number) => ReactNode
  confirmNote?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const others = sessions.filter((session) => !session.current).length

  return (
    <div
      data-slot="session-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="text-sm font-medium">{title}</span>
        <Badge size="sm">{sessions.length}</Badge>
        {onRevokeOthers && others > 0 && (
          <Button variant="secondary" size="xs" className="ms-auto" onClick={onRevokeOthers}>
            {signOutOthersLabel(others)}
          </Button>
        )}
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {sessions.map((session) => {
          const Icon = ICON[session.device]
          return (
            <li key={session.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-start gap-3">
                <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {session.browser ?? unknownBrowserLabel}
                    {session.os && (
                      <span className="text-muted-foreground font-normal">
                        {onLabel} {session.os}
                      </span>
                    )}
                    {session.current && (
                      <Badge size="sm" color="green">
                        {currentLabel}
                      </Badge>
                    )}
                    {session.suspicious && (
                      <Badge size="sm" color="amber">
                        <TriangleAlert />
                        {suspiciousLabel}
                      </Badge>
                    )}
                  </p>

                  <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                    {session.location && (
                      // Approximate by construction — IP geolocation is often
                      // a different city, sometimes a different country.
                      <span>
                          {session.location} {approxLabel}
                        </span>
                    )}
                    {session.ip && <span className="font-mono">{session.ip}</span>}
                    {session.lastActive && (
                      <span>
                        {activeLabel} <Fmt type="relative" value={session.lastActive} now={now} locale={locale} />
                      </span>
                    )}
                  </p>
                </div>

                {/* Never offered for the current session. */}
                {onRevoke && !session.current && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="shrink-0 text-[var(--destructive-soft-foreground)]"
                    onClick={() => setConfirming(session.id)}
                  >
                    {signOutLabel}
                  </Button>
                )}
              </div>

              {confirming === session.id && (
                <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border p-2 text-xs">
                  <span className="text-muted-foreground min-w-0 flex-1">
                    {confirmNote}
                  </span>
                  <Button
                    size="xs"
                    color="destructive"
                    onClick={() => {
                      onRevoke?.(session.id)
                      setConfirming(null)
                    }}
                  >
                    {confirmLabel}
                  </Button>
                  <Button size="xs" variant="secondary" onClick={() => setConfirming(null)}>
                    {cancelLabel}
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { SessionList }
