import type { ComponentProps, ReactNode } from 'react'
import { LogOut, TriangleAlert, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WalletAddress } from '@/components/ui/wallet-address'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Connect button and connected account, in one control.
 *
 * Wrong-network is a separate state from connected, and it takes priority over
 * showing a balance. A balance rendered while the wallet sits on an unexpected
 * chain is a number from the wrong ledger — worse than showing nothing, because
 * it looks authoritative.
 *
 * Connecting is a distinct state too: wallet prompts open in another window and
 * can sit unanswered for a long time, so the button has to stop inviting a
 * second click.
 */
export type WalletConnectProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  address?: string
  ensName?: ReactNode
  avatar?: ReactNode
  balance?: ReactNode
  chainName?: ReactNode
  /** True when the wallet is on a chain the app does not support. */
  wrongNetwork?: boolean
  connecting?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onSwitchNetwork?: () => void
  explorerHref?: string
  connectLabel?: ReactNode
  wrongNetworkLabel?: ReactNode
  disconnectLabel?: ReactNode
}

function WalletConnect({
  address,
  ensName,
  avatar,
  balance,
  chainName,
  wrongNetwork = false,
  connecting = false,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  explorerHref,
  connectLabel = 'Connect wallet',
  wrongNetworkLabel = 'Wrong network',
  disconnectLabel = 'Disconnect',
  className,
  ...props
}: WalletConnectProps) {
  // Disconnected — including while a wallet prompt is open elsewhere.
  if (!address) {
    return (
      <div data-slot="wallet-connect" className={className} {...props}>
        <Button onClick={onConnect} disabled={connecting}>
          <Wallet />
          {connecting ? 'Check your wallet…' : connectLabel}
        </Button>
      </div>
    )
  }

  // Wrong network outranks everything: no balance from the wrong ledger.
  if (wrongNetwork) {
    return (
      <div data-slot="wallet-connect" data-state="wrong-network" className={className} {...props}>
        <Button color="destructive" onClick={onSwitchNetwork}>
          <TriangleAlert />
          {wrongNetworkLabel}
        </Button>
      </div>
    )
  }

  return (
    <div data-slot="wallet-connect" data-state="connected" className={className} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'bg-secondary hover:bg-accent flex items-center gap-2 py-1.5 pe-3 ps-2',
              radius.control,
              interactive,
              focusRing,
            )}
          >
            {avatar}
            <span className="flex min-w-0 flex-col items-start">
              <span className="truncate text-sm font-medium">
                {ensName ?? <WalletAddress address={address} copyable={false} />}
              </span>
              {balance && (
                <span className="text-muted-foreground truncate text-xs tabular-nums">
                  {balance}
                </span>
              )}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-1.5 py-2">
            <span className="text-foreground text-xs font-normal">
              <WalletAddress address={address} href={explorerHref} chars={10} />
            </span>
            {chainName && (
              <span className="flex">
                <Badge size="sm">{chainName}</Badge>
              </span>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {onDisconnect && (
            <DropdownMenuItem
              onSelect={onDisconnect}
              className="text-[var(--destructive-soft-foreground)]"
            >
              <LogOut />
              {disconnectLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export { WalletConnect }
