import type { ComponentProps } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Who else is here.
 *
 * Stacked avatars with a status ring. The overflow count is a real element with
 * its own tooltip listing the rest, not a truncated visual — "+5" that cannot
 * tell you who is unhelpful in exactly the moment you care.
 *
 * The ring colour is the only signal that changes, so someone going idle does
 * not reflow the row.
 */
export type Peer = {
  id: string
  name: string
  status?: 'active' | 'idle' | 'away'
  color?: string
}

const RING = {
  active: 'ring-[var(--green)]',
  idle: 'ring-[var(--amber)]',
  away: 'ring-border',
} as const

function Presence({
  peers,
  max = 4,
  size = 'sm',
  label = 'Viewing now',
  className,
  ...props
}: ComponentProps<'div'> & {
  peers: Peer[]
  max?: number
  size?: 'xs' | 'sm' | 'default'
  label?: string
}) {
  const shown = peers.slice(0, max)
  const rest = peers.slice(max)

  return (
    <div
      data-slot="presence"
      role="group"
      aria-label={`${label}: ${peers.map((peer) => peer.name).join(', ')}`}
      className={cn('flex items-center -space-x-2', className)}
      {...props}
    >
      {shown.map((peer) => (
        <Tooltip
          key={peer.id}
          content={
            <span>
              {peer.name}
              {peer.status && peer.status !== 'active' && (
                <span className="opacity-70"> · {peer.status}</span>
              )}
            </span>
          }
        >
          <span
            tabIndex={0}
            className={cn(
              'ring-background relative rounded-full ring-2 outline-none [corner-shape:round]',
              'focus-visible:ring-ring focus-visible:ring-2',
            )}
          >
            <Avatar
              size={size}
              name={peer.name}
              className={cn(
                'ring-2 [corner-shape:round]',
                RING[peer.status ?? 'active'],
              )}
              style={peer.color ? { backgroundColor: peer.color } : undefined}
            />
          </span>
        </Tooltip>
      ))}

      {rest.length > 0 && (
        <Tooltip content={rest.map((peer) => peer.name).join(', ')}>
          <span
            tabIndex={0}
            className={cn(
              'bg-secondary text-muted-foreground ring-background relative flex items-center justify-center rounded-full ring-2 outline-none [corner-shape:round]',
              'focus-visible:ring-ring focus-visible:ring-2',
              size === 'xs' ? 'size-6 text-[10px]' : size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm',
            )}
          >
            +{rest.length}
          </span>
        </Tooltip>
      )}
    </div>
  )
}

export { Presence }
