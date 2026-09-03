import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Globe, Monitor, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Accounts grouped by a shared IP address or device.
 *
 * The shape it draws is the finding: one node fanning out to eight accounts is
 * multi-accounting; eight accounts each on their own address is a coincidence of
 * a shared ISP. A flat list of "accounts that share an IP" cannot tell those
 * apart, which is why this is a grouped view rather than a table.
 *
 * Group sizes are printed and the list sorts largest-first, because an analyst
 * opening this has a queue and needs the worst cluster at the top without
 * scanning.
 *
 * Residential and mobile addresses are marked. Carrier-grade NAT puts thousands
 * of unrelated subscribers behind one address, so an unmarked shared-IP finding
 * on a mobile network is close to meaningless — the label is what stops someone
 * banning a whole apartment block.
 */
export type ClusterMember = {
  id: string
  label: ReactNode
  detail?: ReactNode
  /** Marks the account under review, so it stands out in its own cluster. */
  focus?: boolean
  status?: 'active' | 'banned' | 'flagged'
}

export type Cluster = {
  id: string
  /** The shared value — an IP, a device hash, a payout wallet. */
  value: ReactNode
  kind?: 'ip' | 'device' | 'account'
  /** Shared residential or mobile addresses are far weaker evidence. */
  network?: 'residential' | 'mobile' | 'datacenter' | 'vpn'
  location?: ReactNode
  members: ClusterMember[]
}

const KIND_ICON = { ip: Globe, device: Monitor, account: User } as const

const NETWORK_TONE = {
  datacenter: { color: 'destructive', note: 'datacenter' },
  vpn: { color: 'destructive', note: 'VPN / proxy' },
  residential: { color: 'neutral', note: 'residential' },
  // Worth spelling out: CGNAT puts thousands of strangers on one address.
  mobile: { color: 'amber', note: 'mobile — shared by carrier NAT' },
} as const

const STATUS_COLOR = { active: 'neutral', banned: 'destructive', flagged: 'amber' } as const

function IpCluster({
  clusters,
  onSelect,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'onSelect'> & {
  clusters: Cluster[]
  onSelect?: (member: ClusterMember, cluster: Cluster) => void
}) {
  // Worst cluster first — this is a queue, not a reference.
  const sorted = useMemo(
    () => [...clusters].sort((a, b) => b.members.length - a.members.length),
    [clusters],
  )

  return (
    <div data-slot="ip-cluster" className={cn('flex flex-col gap-3', className)} {...props}>
      {sorted.map((cluster) => {
        const Icon = KIND_ICON[cluster.kind ?? 'ip']
        const network = cluster.network ? NETWORK_TONE[cluster.network] : undefined
        return (
          <section
            key={cluster.id}
            className={cn(surface, radius.surface, 'flex flex-col gap-2.5 p-3')}
          >
            <header className="flex flex-wrap items-center gap-2">
              <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <code className="font-mono text-xs font-medium">{cluster.value}</code>
              {network && (
                <Badge size="sm" color={network.color}>
                  {network.note}
                </Badge>
              )}
              {cluster.location && (
                <span className="text-muted-foreground text-xs">{cluster.location}</span>
              )}
              <span className="text-muted-foreground ms-auto text-xs tabular-nums">
                {cluster.members.length} account{cluster.members.length === 1 ? '' : 's'}
              </span>
            </header>

            <ul className="flex list-none flex-wrap gap-1.5">
              {cluster.members.map((member) => {
                const content = (
                  <>
                    <span className="truncate">{member.label}</span>
                    {member.detail && (
                      <span className="text-muted-foreground shrink-0">{member.detail}</span>
                    )}
                    {member.status && member.status !== 'active' && (
                      <Badge size="sm" color={STATUS_COLOR[member.status]}>
                        {member.status}
                      </Badge>
                    )}
                  </>
                )
                const classes = cn(
                  'flex max-w-full items-center gap-1.5 px-2 py-1 text-xs',
                  radius.control,
                  member.focus
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground',
                  onSelect && !member.focus && 'hover:bg-accent',
                )

                return (
                  <li key={member.id} className="min-w-0">
                    {onSelect ? (
                      <button
                        type="button"
                        className={cn(classes, 'text-start')}
                        onClick={() => onSelect(member, cluster)}
                      >
                        {content}
                      </button>
                    ) : (
                      <span className={classes}>{content}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export { IpCluster }
