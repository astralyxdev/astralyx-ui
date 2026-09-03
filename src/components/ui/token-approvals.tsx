import { useState, type ComponentProps, type ReactNode } from 'react'
import { Infinity as InfinityIcon, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { WalletAddress } from '@/components/ui/wallet-address'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Spending allowances granted to contracts, and a way to revoke them.
 *
 * An unlimited approval is called out as a risk rather than shown as a number.
 * Wallets grant `2^256-1` by default and it renders as an absurd figure that
 * reads like a display bug; stating "unlimited" is the only honest rendering,
 * because that is exactly what it is — a standing permission to move the entire
 * balance, forever, with no further signature.
 *
 * Revoking is confirmed inline beside the row. A modal that hides which
 * approval is being revoked is how the wrong one goes.
 */
export type Approval = {
  id: string
  token: ReactNode
  tokenIcon?: ReactNode
  /** The contract holding the allowance. */
  spender: string
  spenderName?: ReactNode
  /** Formatted amount, or omit for unlimited. */
  allowance?: ReactNode
  unlimited?: boolean
  lastUsed?: Date
  /** Fiat value currently at risk under this approval. */
  atRisk?: number
  explorerHref?: string
}

function TokenApprovals({
  approvals,
  onRevoke,
  currency = 'USD',
  locale = 'en-GB',
  now,
  emptyLabel = 'No active approvals',
  title = 'Approvals',
  unlimitedLabel = 'Unlimited',
  revokeLabel = 'Revoke',
  spenderLabel = 'spender',
  lastUsedLabel = 'last used',
  confirmNote = 'Revoking costs gas and requires a signature.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  approvals: Approval[]
  onRevoke?: (id: string) => void
  currency?: string
  locale?: string
  now?: Date
  emptyLabel?: ReactNode
  title?: ReactNode
  /** Badge on an unbounded allowance. */
  unlimitedLabel?: ReactNode
  revokeLabel?: ReactNode
  /** Precedes the spender address. */
  spenderLabel?: ReactNode
  /** Precedes the last-used time. */
  lastUsedLabel?: ReactNode
  confirmNote?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const unlimited = approvals.filter((a) => a.unlimited).length

  return (
    <div
      data-slot="token-approvals"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="text-sm font-medium">{title}</span>
        <Badge size="sm">{approvals.length}</Badge>
        {unlimited > 0 && (
          <Badge size="sm" color="destructive">
            <ShieldAlert />
            {unlimited} unlimited
          </Badge>
        )}
      </div>

      {approvals.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border)]">
          {approvals.map((approval) => (
            <li key={approval.id} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex min-w-0 items-center gap-2">
                  {approval.tokenIcon}
                  <span className="truncate text-sm font-medium">{approval.token}</span>
                </span>

                {approval.unlimited ? (
                  <Badge size="sm" color="destructive">
                    <InfinityIcon />
                    {unlimitedLabel}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {approval.allowance}
                  </span>
                )}

                {onRevoke && (
                  <Button
                    variant="secondary"
                    size="xs"
                    className="ms-auto"
                    onClick={() => setConfirming(approval.id)}
                  >
                    {revokeLabel}
                  </Button>
                )}
              </div>

              <div className="text-muted-foreground/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  {spenderLabel}
                  <WalletAddress
                    address={approval.spender}
                    name={approval.spenderName}
                    href={approval.explorerHref}
                    size="sm"
                    copyable={false}
                  />
                </span>
                {approval.lastUsed && (
                  <span>
                    {lastUsedLabel} <Fmt type="relative" value={approval.lastUsed} now={now} />
                  </span>
                )}
                {approval.atRisk !== undefined && (
                  <span className="text-[var(--amber-soft-foreground)]">
                    <Fmt type="currency" value={approval.atRisk} currency={currency} locale={locale} />{' '}
                    at risk
                  </span>
                )}
              </div>

              {confirming === approval.id && (
                <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border p-2 text-xs">
                  <span className="text-muted-foreground min-w-0 flex-1">
                    {confirmNote}
                  </span>
                  <Button
                    size="xs"
                    color="destructive"
                    onClick={() => {
                      onRevoke?.(approval.id)
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
          ))}
        </ul>
      )}
    </div>
  )
}

export { TokenApprovals }
