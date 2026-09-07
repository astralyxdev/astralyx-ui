import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ShieldAlert } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { enterFade } from '@/lib/motion'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Validators to delegate to, with commission, uptime and voting power.
 *
 * Cumulative voting power is the column nobody ships and everybody needs. A
 * chain where the top third of validators control a third of the stake is one
 * where those validators can halt it, and a list sorted by size actively pushes
 * delegators toward the validators that make that worse. Flagging membership of
 * the top-third set is the honest version.
 *
 * Sorted by voting power ascending by default, deliberately — the conventional
 * descending sort concentrates stake in whoever is already largest.
 */
export type Validator = {
  id: string
  name: ReactNode
  avatar?: ReactNode
  /** Percentage, e.g. 5 for 5%. */
  commission: number
  /** Percentage. */
  uptime?: number
  /** Share of total stake, 0–1. */
  votingPower: number
  stake?: ReactNode
  jailed?: boolean
  onSelect?: () => void
}

type SortKey = 'votingPower' | 'commission' | 'uptime'

/**
 * A sortable column header.
 *
 * At module scope, not inside `ValidatorList`. A component declared during
 * render is a fresh type each time, so React remounts the `<th>` on every
 * sort — and the button you just clicked loses focus mid-interaction.
 */
function Header({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: { key: SortKey; desc: boolean }
  onSort: (key: SortKey) => void
}) {
  return (
    <TableHead className="text-end">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'text-muted-foreground hover:text-foreground -mx-1 inline-flex items-center gap-1 px-1 text-xs font-medium',
          radius.xs,
          focusRing,
          sort.key === sortKey && 'text-foreground',
        )}
      >
        {label}
        {sort.key === sortKey && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </TableHead>
  )
}

function ValidatorList({
  validators,
  onSelect,
  validatorHeader = 'Validator',
  commissionHeader = 'Commission',
  uptimeHeader = 'Uptime',
  votingPowerHeader = 'Voting power',
  jailedLabel = 'Jailed',
  concentrationLabel = 'Top third',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  validators: Validator[]
  onSelect?: (id: string) => void
  validatorHeader?: ReactNode
  commissionHeader?: string
  uptimeHeader?: string
  votingPowerHeader?: string
  /** Badge on a jailed validator. */
  jailedLabel?: ReactNode
  /** Badge on a validator inside the concentrated top third of stake. */
  concentrationLabel?: ReactNode
}) {
  // Ascending by power: a descending default pushes stake toward the largest.
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: 'votingPower',
    desc: false,
  })

  const { rows, cartelIds } = useMemo(() => {
    // The smallest set of validators controlling a third of the stake could
    // halt the chain between them.
    const byPower = [...validators].sort((a, b) => b.votingPower - a.votingPower)
    const cartel = new Set<string>()
    let cumulative = 0
    for (const v of byPower) {
      if (cumulative >= 1 / 3) break
      cartel.add(v.id)
      cumulative += v.votingPower
    }

    const sorted = [...validators].sort((a, b) => {
      const av = a[sort.key] ?? 0
      const bv = b[sort.key] ?? 0
      return sort.desc ? Number(bv) - Number(av) : Number(av) - Number(bv)
    })
    return { rows: sorted, cartelIds: cartel }
  }, [validators, sort])

  const handleSort = (key: SortKey) =>
    setSort((current) => ({ key, desc: current.key === key ? !current.desc : true }))

  return (
    <div
      data-slot="validator-list"
      className={cn(enterFade, surface, radius.surface, 'w-full overflow-x-auto', className)}
      {...props}
    >
      {/* The kit's table parts. Heading ink, row rules and the hover come from
          the shared table; the only thing said here is that this list runs
          denser than the default. */}
      <table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>{validatorHeader}</TableHead>
            <Header label={commissionHeader} sortKey="commission" sort={sort} onSort={handleSort} />
            <Header label={uptimeHeader} sortKey="uptime" sort={sort} onSort={handleSort} />
            <Header label={votingPowerHeader} sortKey="votingPower" sort={sort} onSort={handleSort} />
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((validator) => {
            const concentrating = cartelIds.has(validator.id)
            return (
              <TableRow
                key={validator.id}
                onClick={onSelect ? () => onSelect(validator.id) : undefined}
                className={cn(
                  onSelect && 'hover:bg-accent/40 cursor-pointer',
                  validator.jailed && 'opacity-60',
                )}
              >
                <TableCell>
                  <span className="flex items-center gap-2">
                    {validator.avatar ?? <Avatar size="xs" name={String(validator.name)} />}
                    <span className="min-w-0 truncate font-medium">{validator.name}</span>
                    {validator.jailed && (
                      <Badge size="sm" color="destructive">
                        {jailedLabel}
                      </Badge>
                    )}
                    {concentrating && !validator.jailed && (
                      <Badge size="sm" color="amber">
                        <ShieldAlert />
                        {concentrationLabel}
                      </Badge>
                    )}
                  </span>
                </TableCell>

                <TableCell className="text-end tabular-nums">
                  {validator.commission.toFixed(1)}%
                </TableCell>

                <TableCell
                  className={cn(
                    'text-end tabular-nums',
                    validator.uptime !== undefined && validator.uptime < 98
                      ? 'text-[var(--amber-soft-foreground)]'
                      : 'text-muted-foreground',
                  )}
                >
                  {validator.uptime === undefined ? '—' : `${validator.uptime.toFixed(2)}%`}
                </TableCell>

                <TableCell className="text-end tabular-nums">
                  {(validator.votingPower * 100).toFixed(2)}%
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </table>
    </div>
  )
}

export { ValidatorList }
