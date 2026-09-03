import type { ComponentProps, ReactNode } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A ranked table with the viewer pinned.
 *
 * The current user's row is always rendered, even at rank 4,812 — pinned to the
 * bottom with an ellipsis above it if they fall outside the visible page. A
 * leaderboard that simply omits you is the one thing people check it for.
 *
 * Ties share a rank and the next rank skips accordingly (1, 2, 2, 4), which is
 * standard competition ranking. Numbering rows sequentially silently breaks
 * ties in favour of whoever the sort happened to put first.
 */
export type LeaderboardEntry = {
  id: string
  name: ReactNode
  avatar?: ReactNode
  score: number
  /** Rank in the previous period, for the movement arrow. */
  previousRank?: number
  isCurrentUser?: boolean
  meta?: ReactNode
}

type RankedRow = { entry: LeaderboardEntry; rank: number }

/** Competition ranking: ties share a rank and the next one skips (1, 2, 2, 4). */
function rankEntries(entries: LeaderboardEntry[]): RankedRow[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score)
  const rows: RankedRow[] = []
  let rank = 0
  let lastScore: number | null = null

  for (const [index, entry] of sorted.entries()) {
    if (lastScore === null || entry.score !== lastScore) rank = index + 1
    lastScore = entry.score
    rows.push({ entry, rank })
  }
  return rows
}

/**
 * One row.
 *
 * Declared at module scope rather than inside `LeaderboardTable`: a component
 * defined during render is a new type on every render, so React unmounts and
 * remounts every row instead of updating it — losing focus and any transition
 * along with it.
 */
function Row({
  row,
  pinned,
  format,
  currentUserLabel,
}: {
  row: RankedRow
  pinned?: boolean
  format: (score: number) => ReactNode
  currentUserLabel: ReactNode
}) {
  const movement =
    row.entry.previousRank === undefined ? 0 : row.entry.previousRank - row.rank
  const Icon = movement > 0 ? TrendingUp : movement < 0 ? TrendingDown : Minus

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-2',
        row.entry.isCurrentUser && 'bg-accent/50',
        pinned && 'border-border border-t',
      )}
    >
      <span className="text-muted-foreground w-8 shrink-0 text-end text-sm font-medium tabular-nums">
        {row.rank}
      </span>

      {row.entry.avatar ?? <Avatar size="xs" name={String(row.entry.name)} className="shrink-0" />}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{row.entry.name}</span>
          {row.entry.isCurrentUser && <Badge size="sm">{currentUserLabel}</Badge>}
        </span>
        {row.entry.meta && (
          <span className="text-muted-foreground block truncate text-xs">{row.entry.meta}</span>
        )}
      </span>

      {row.entry.previousRank !== undefined && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-0.5 text-xs tabular-nums',
            movement > 0 && 'text-[var(--green-soft-foreground)]',
            movement < 0 && 'text-[var(--destructive-soft-foreground)]',
            movement === 0 && 'text-muted-foreground/40',
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
          {movement !== 0 && Math.abs(movement)}
        </span>
      )}

      <span className="min-w-16 shrink-0 text-end text-sm font-semibold tabular-nums">
        {format(row.entry.score)}
      </span>
    </li>
  )
}

function LeaderboardTable({
  entries,
  limit,
  scoreLabel = 'Score',
  formatScore,
  locale = 'en-GB',
  rankHeader = '#',
  playerHeader = 'Player',
  currentUserLabel = 'You',
  className,
  ...props
}: ComponentProps<'div'> & {
  entries: LeaderboardEntry[]
  /** Rows shown before the current user is pinned. */
  limit?: number
  scoreLabel?: ReactNode
  formatScore?: (score: number) => ReactNode
  locale?: string
  rankHeader?: ReactNode
  playerHeader?: ReactNode
  /** Badge on the viewer's own row. */
  currentUserLabel?: ReactNode

}) {
  const num = new Intl.NumberFormat(locale)
  const format = formatScore ?? ((score: number) => num.format(score))

  const withRanks = rankEntries(entries)

  const visible = limit ? withRanks.slice(0, limit) : withRanks
  const me = withRanks.find((row) => row.entry.isCurrentUser)
  const meIsHidden = me && !visible.includes(me)

  return (
    <div
      data-slot="leaderboard"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border text-muted-foreground flex items-center gap-3 border-b p-3 text-xs font-medium">
        <span className="w-8 text-end">{rankHeader}</span>
        <span className="flex-1">{playerHeader}</span>
        <span>{scoreLabel}</span>
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {visible.map((row) => (
          <Row key={row.entry.id} row={row} format={format} currentUserLabel={currentUserLabel} />
        ))}

        {/* Pinned: a leaderboard that omits you is the one thing you check. */}
        {meIsHidden && me && (
          <>
            <li className="text-muted-foreground/40 px-3 py-1 text-center text-xs">···</li>
            <Row row={me} pinned format={format} currentUserLabel={currentUserLabel} />
          </>
        )}
      </ul>
    </div>
  )
}

export { LeaderboardTable }
