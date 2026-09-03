import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Fmt } from '@/components/ui/fmt'
import { cn } from '@/lib/utils'

/**
 * The branch graph beside a commit list.
 *
 * Lanes are assigned by walking the list newest-first and keeping a set of
 * "open" lanes, each waiting for a specific commit. When a commit arrives it
 * takes the lane that was waiting for it — that is what keeps a branch on one
 * vertical line instead of drifting sideways every merge.
 *
 * A commit with two parents keeps its lane for the first and opens a new one
 * for the second, which is why a merge shows as a curve rejoining the trunk.
 *
 * Rendered as one SVG per row rather than a single tall SVG, so rows can carry
 * ordinary DOM content beside the graph and stay selectable.
 */
export type GraphCommit = {
  sha: string
  message: ReactNode
  parents: string[]
  author?: string
  date?: Date
  /** Branch or tag heads to show as chips. */
  refs?: ReactNode
}

const LANE_COLORS = [
  'var(--blue)',
  'var(--violet)',
  'var(--green)',
  'var(--amber)',
  'var(--cyan)',
  'var(--rose)',
]

type Row = {
  commit: GraphCommit
  lane: number
  /** Lanes occupied while this row is drawn, for the pass-through lines. */
  through: number[]
  /** Lane a merge edge curves into, if any. */
  merge?: number
}

function layout(commits: GraphCommit[]): { rows: Row[]; width: number } {
  // `open[i]` is the sha the lane at index i is waiting for.
  const open: (string | undefined)[] = []
  const rows: Row[] = []

  const claim = (sha: string) => {
    const existing = open.indexOf(sha)
    if (existing !== -1) return existing
    const free = open.indexOf(undefined)
    const index = free === -1 ? open.length : free
    open[index] = sha
    return index
  }

  for (const commit of commits) {
    const lane = claim(commit.sha)
    const through = open
      .map((value, index) => (value !== undefined ? index : -1))
      .filter((index) => index !== -1)

    // The first parent inherits this lane; the rest open their own.
    open[lane] = commit.parents[0]
    let merge: number | undefined
    for (const parent of commit.parents.slice(1)) {
      merge = claim(parent)
    }

    rows.push({ commit, lane, through, merge })
  }

  return { rows, width: Math.max(1, open.length) }
}

const LANE_WIDTH = 14
/**
 * Rows are a fixed height and the SVG is drawn to exactly that.
 *
 * The lanes are per-row SVGs, so a row that grows to fit its text leaves the
 * next one's lines starting below where this one's ended — a visible break in
 * every branch. Pinning the height is what makes the segments meet.
 */
const ROW_HEIGHT = 56

function CommitGraph({
  commits,
  locale = 'en-GB',
  className,
  ...props
}: ComponentProps<'div'> & {
  commits: GraphCommit[]
  locale?: string
}) {
  const { rows, width } = useMemo(() => layout(commits), [commits])
  const graphWidth = width * LANE_WIDTH + LANE_WIDTH

  return (
    <div
      data-slot="commit-graph"
      className={cn('flex flex-col', className)}
      {...props}
    >
      {rows.map((row, index) => {
        const x = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2
        const colour = LANE_COLORS[row.lane % LANE_COLORS.length]
        const last = index === rows.length - 1

        return (
          <div
            key={row.commit.sha}
            className="flex items-stretch gap-3"
            style={{ height: ROW_HEIGHT }}
          >
            <svg
              width={graphWidth}
              height={ROW_HEIGHT}
              aria-hidden="true"
              className="shrink-0 overflow-visible"
            >
              {/* Lines for every lane still open through this row. */}
              {row.through.map((lane) => (
                <line
                  key={lane}
                  x1={x(lane)}
                  y1={0}
                  x2={x(lane)}
                  y2={last && lane === row.lane ? ROW_HEIGHT / 2 : ROW_HEIGHT}
                  stroke={LANE_COLORS[lane % LANE_COLORS.length]}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              ))}

              {row.merge !== undefined && (
                <path
                  d={`M ${x(row.lane)} ${ROW_HEIGHT / 2} C ${x(row.lane)} ${ROW_HEIGHT * 0.8}, ${x(row.merge)} ${ROW_HEIGHT * 0.7}, ${x(row.merge)} ${ROW_HEIGHT}`}
                  fill="none"
                  stroke={LANE_COLORS[row.merge % LANE_COLORS.length]}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )}

              <circle
                cx={x(row.lane)}
                cy={ROW_HEIGHT / 2}
                r={row.commit.parents.length > 1 ? 5 : 4}
                fill={row.commit.parents.length > 1 ? 'var(--background)' : colour}
                stroke={colour}
                strokeWidth={2}
              />
            </svg>

            <div className="border-border/60 flex min-w-0 flex-1 items-center gap-2 overflow-hidden border-b">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm">{row.commit.message}</span>
                  {row.commit.refs}
                </div>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                  <code className="font-mono">{row.commit.sha.slice(0, 7)}</code>
                  {row.commit.author && <>· {row.commit.author}</>}
                  {row.commit.date && (
                    <>
                      ·{' '}
                      <Fmt type="relative" value={row.commit.date} locale={locale} />
                    </>
                  )}
                </p>
              </div>
              {row.commit.author && (
                <Avatar size="xs" name={row.commit.author} className="shrink-0" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { CommitGraph }
