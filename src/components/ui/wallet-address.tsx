import type { ComponentProps, ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An address, shortened for display but never for copying.
 *
 * The truncation is the security-relevant part. Addresses are compared by their
 * ends, so an attacker generates a lookalike sharing the first and last few
 * characters — "address poisoning". Showing too few characters makes that
 * attack trivial, which is why the minimum here is 6 leading and 4 trailing and
 * `chars` cannot go below it.
 *
 * Copy always yields the full address. A UI that copies what it displays is how
 * funds get sent to a truncated string.
 *
 * A `name` (ENS or similar) replaces the address visually but never replaces it
 * for copying — names are re-registrable and are not identity.
 */
export type WalletAddressProps = Omit<ComponentProps<'span'>, 'children'> & {
  address: string
  /** ENS or label. Shown instead of the address; the address is still copied. */
  name?: ReactNode
  /** Leading characters. Clamped to a minimum of 6. */
  chars?: number
  copyable?: boolean
  /** Block explorer URL for this address. */
  href?: string
  avatar?: ReactNode
  mono?: boolean
  size?: 'sm' | 'default'
  /** Accessible name for the explorer link. */
  explorerLabel?: string
  copyLabel?: string
}

/** Middle ellipsis, with a floor that keeps lookalikes distinguishable. */
function shortenAddress(address: string, chars = 6) {
  const lead = Math.max(6, chars)
  const tail = 4
  if (address.length <= lead + tail + 1) return address
  return `${address.slice(0, lead)}…${address.slice(-tail)}`
}

function WalletAddress({
  address,
  name,
  chars = 6,
  copyable = true,
  href,
  avatar,
  mono = true,
  size = 'default',
  explorerLabel = 'View on block explorer',
  copyLabel = 'Copy address',
  className,
  ...props
}: WalletAddressProps) {
  const shown = name ?? shortenAddress(address, chars)

  return (
    <span
      data-slot="wallet-address"
      className={cn(
        'inline-flex items-center gap-1.5',
        size === 'sm' ? 'text-xs' : 'text-sm',
        className,
      )}
      {...props}
    >
      {avatar}

      <span
        className={cn('truncate', mono && !name && 'font-mono')}
        // The full value on hover, so it can be verified without copying.
        title={address}
      >
        {shown}
      </span>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={explorerLabel}
          className={cn(
            'text-muted-foreground hover:text-foreground shrink-0',
            radius.xs,
            focusRing,
          )}
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}

      {/* Always the full address, never what is displayed. */}
      {copyable && <CopyButton value={address} label={copyLabel} />}
    </span>
  )
}

export { WalletAddress, shortenAddress }
