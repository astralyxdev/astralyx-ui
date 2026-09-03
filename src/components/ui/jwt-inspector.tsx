import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { JsonViewer, type Json } from '@/components/ui/json-viewer'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Decodes a JWT into its header, payload and signature.
 *
 * Decoding is not verification, and the component says so rather than implying
 * a checked token. Signature verification needs the key and belongs on the
 * server; a green tick here would be actively dangerous.
 *
 * `exp` and `nbf` are resolved to real times, because a bare epoch integer is
 * the single most common thing people misread in a token — off-by-1000 between
 * seconds and milliseconds is an afternoon lost.
 *
 * `alg: none` is called out loudly. It is the classic JWT vulnerability and it
 * looks like an ordinary field in a JSON dump.
 *
 * The signature is masked by default. This gets screenshotted into tickets, and
 * a token with its signature is a live credential.
 */
type Decoded = {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
} | null

/** base64url → JSON. Padding is restored; `atob` requires it. */
function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(decodeURIComponent(escape(atob(padded))))
  } catch {
    return null
  }
}

function JwtInspector({
  token,
  now,
  revealSignature = false,
  headerLabel = 'Header',
  payloadLabel = 'Payload',
  signatureLabel = 'Signature',
  unverifiedNote = 'Decoded only — the signature has not been verified. That needs the signing key and belongs on the server.',
  invalidNote = 'That does not parse as a JWT. A token has three dot-separated base64url segments.',
  algNoneNote = 'alg is "none": this token asserts it is unsigned. Anything accepting it accepts a forgery.',
  expiredLabel = 'Expired',
  activeLabel = 'Active',
  notYetValidLabel = 'Not yet valid',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  token: string
  /** Reference instant for expiry. Defaults to now. */
  now?: Date
  /** Show the signature rather than masking it. */
  revealSignature?: boolean
  headerLabel?: ReactNode
  payloadLabel?: ReactNode
  signatureLabel?: ReactNode
  unverifiedNote?: ReactNode
  invalidNote?: ReactNode
  algNoneNote?: ReactNode
  expiredLabel?: ReactNode
  activeLabel?: ReactNode
  notYetValidLabel?: ReactNode
}) {
  const [shown, setShown] = useState(revealSignature)

  const decoded = useMemo<Decoded>(() => {
    const parts = token.trim().split('.')
    if (parts.length !== 3) return null
    const header = decodeSegment(parts[0])
    const payload = decodeSegment(parts[1])
    if (!header || !payload) return null
    return { header, payload, signature: parts[2] }
  }, [token])

  const reference = now ?? new Date()

  // Seconds since epoch by spec — but tokens in the wild carry milliseconds,
  // so anything implausibly large is treated as ms rather than shown as a
  // date in the year 55000.
  const asDate = (value: unknown) => {
    if (typeof value !== 'number') return undefined
    return new Date(value > 1e11 ? value : value * 1000)
  }

  const exp = asDate(decoded?.payload.exp)
  const nbf = asDate(decoded?.payload.nbf) ?? asDate(decoded?.payload.iat)
  const expired = exp !== undefined && exp < reference
  const early = nbf !== undefined && nbf > reference
  const algNone = String(decoded?.header.alg ?? '').toLowerCase() === 'none'

  if (!decoded) {
    return (
      <div
        data-slot="jwt-inspector"
        className={cn(surface, radius.surface, 'p-4', className)}
        {...props}
      >
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {invalidNote}
        </p>
      </div>
    )
  }

  return (
    <div
      data-slot="jwt-inspector"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge size="sm" className="font-mono">
          {String(decoded.header.alg ?? '?')}
        </Badge>
        {exp && (
          <Badge size="sm" color={expired ? 'destructive' : 'green'}>
            {expired ? expiredLabel : activeLabel}
          </Badge>
        )}
        {early && (
          <Badge size="sm" color="amber">
            {notYetValidLabel}
          </Badge>
        )}
        {exp && (
          <span className="text-muted-foreground text-xs">
            {expired ? '' : 'expires '}
            <Fmt type="relative" value={exp} now={reference} />
            {' · '}
            <Fmt type="date" value={exp} format="DD MMM YYYY HH:mm" />
          </span>
        )}
      </div>

      {/* The classic JWT vulnerability, which looks like an ordinary field. */}
      {algNone && (
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {algNoneNote}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">{headerLabel}</span>
        <JsonViewer value={decoded.header as Json} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">{payloadLabel}</span>
        <JsonViewer value={decoded.payload as Json} defaultExpandedDepth={2} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
          {signatureLabel}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={shown ? 'Hide signature' : 'Reveal signature'}
            aria-pressed={shown}
            onClick={() => setShown((current) => !current)}
          >
            {shown ? <EyeOff /> : <Eye />}
          </Button>
        </span>
        <code className={cn('bg-secondary/60 p-2 font-mono text-xs break-all', radius.control)}>
          {shown ? decoded.signature : '•'.repeat(Math.min(decoded.signature.length, 44))}
        </code>
      </div>

      <p className="text-muted-foreground border-border border-t pt-3 text-xs">
        {unverifiedNote}
      </p>
    </div>
  )
}

export { JwtInspector, decodeSegment as decodeJwtSegment }
