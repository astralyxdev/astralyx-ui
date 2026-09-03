import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two environments' variables side by side.
 *
 * Values are masked by default and revealed per row. This is the screen someone
 * opens when staging behaves differently from production, and it is exactly the
 * screen that gets screenshotted into a shared channel with a database password
 * in it.
 *
 * A variable missing from one side is the finding, and it is drawn differently
 * from one whose value merely differs — "not set" and "set to something else"
 * have completely different causes. Both are ranked above equal rows.
 *
 * Whitespace and length differences are called out even when the masked values
 * look identical, because a trailing newline in a secret is a genuinely common
 * and genuinely invisible outage.
 *
 * One grid owns the columns and every row inherits them through `subgrid`.
 * Per-row grids only agree on fixed tracks: `1fr` and `auto` resolve against
 * whatever that row holds, so a row with a reveal button lines up differently
 * from one without.
 */
export type EnvEntry = { key: string; value: string | undefined; secret?: boolean }

type Row = {
  key: string
  left: string | undefined
  right: string | undefined
  secret: boolean
  state: 'missing-left' | 'missing-right' | 'differs' | 'same'
  whitespace: boolean
}

const RANK = { 'missing-left': 0, 'missing-right': 0, differs: 1, same: 2 }

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_TOGGLE_SAME_LABEL: (count: number) => ReactNode = (count) => `Show ${count} identical`

function EnvDiff({
  left,
  right,
  leftLabel = 'Left',
  rightLabel = 'Right',
  notSetLabel = 'not set',
  whitespaceNote = 'differs only in whitespace',
  revealLabel = 'Reveal value',
  hideLabel = 'Hide value',
  sameLabel = 'identical',
  showSame = false,
  toggleSameLabel = DEFAULT_TOGGLE_SAME_LABEL,
  hideSameLabel = 'Hide identical',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  left: EnvEntry[]
  right: EnvEntry[]
  leftLabel?: ReactNode
  rightLabel?: ReactNode
  notSetLabel?: ReactNode
  whitespaceNote?: ReactNode
  revealLabel?: string
  hideLabel?: string
  sameLabel?: ReactNode
  showSame?: boolean
  toggleSameLabel?: (count: number) => ReactNode
  hideSameLabel?: ReactNode
}) {
  const [revealed, setRevealed] = useState<string[]>([])
  const [same, setSame] = useState(showSame)

  const rows = useMemo<Row[]>(() => {
    const leftMap = new Map(left.map((e) => [e.key, e]))
    const rightMap = new Map(right.map((e) => [e.key, e]))
    const keys = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort()

    return keys
      .map((key) => {
        const a = leftMap.get(key)
        const b = rightMap.get(key)
        const state: Row['state'] =
          a?.value === undefined && b?.value !== undefined
            ? 'missing-left'
            : b?.value === undefined && a?.value !== undefined
              ? 'missing-right'
              : a?.value === b?.value
                ? 'same'
                : 'differs'
        return {
          key,
          left: a?.value,
          right: b?.value,
          secret: Boolean(a?.secret || b?.secret),
          state,
          // A trailing newline in a secret is invisible and takes a service down.
          whitespace:
            state === 'differs' &&
            (a?.value ?? '').trim() === (b?.value ?? '').trim(),
        }
      })
      .sort((x, y) => RANK[x.state] - RANK[y.state] || x.key.localeCompare(y.key))
  }, [left, right])

  const sameCount = rows.filter((row) => row.state === 'same').length
  const visible = same ? rows : rows.filter((row) => row.state !== 'same')

  const show = (row: Row, value: string | undefined) => {
    if (value === undefined) {
      return <span className="text-muted-foreground/60 italic">{notSetLabel}</span>
    }
    if (row.secret && !revealed.includes(row.key)) {
      return <span className="tracking-widest">{'•'.repeat(Math.min(value.length, 16))}</span>
    }
    return value === '' ? <span className="text-muted-foreground/60 italic">""</span> : value
  }

  return (
    <div
      data-slot="env-diff"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="border-border col-span-4 grid grid-cols-subgrid items-center gap-3 border-b p-3 text-xs font-medium">
        <span className="text-muted-foreground">Variable</span>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
        {sameCount > 0 && (
          <Button variant="ghost" size="xs" onClick={() => setSame((v) => !v)}>
            {same ? hideSameLabel : toggleSameLabel(sameCount)}
          </Button>
        )}
      </div>

      <ul className="divide-border/60 col-span-4 grid grid-cols-subgrid list-none divide-y">
        {visible.map((row) => (
          <li
            key={row.key}
            className="col-span-4 grid grid-cols-subgrid items-baseline gap-3 p-3"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <code className="truncate font-mono text-xs font-medium">{row.key}</code>
              {row.state === 'same' && (
                <Badge size="sm" color="neutral">
                  {sameLabel}
                </Badge>
              )}
            </span>

            <code
              className={cn(
                'min-w-0 truncate font-mono text-xs',
                row.state === 'missing-left' && 'bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] px-1',
              )}
            >
              {show(row, row.left)}
            </code>

            <code
              className={cn(
                'min-w-0 truncate font-mono text-xs',
                row.state === 'missing-right' && 'bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] px-1',
                row.state === 'differs' && 'bg-[color-mix(in_oklab,var(--amber)_14%,transparent)] px-1',
              )}
            >
              {show(row, row.right)}
            </code>

            {row.secret ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={revealed.includes(row.key) ? hideLabel : revealLabel}
                aria-pressed={revealed.includes(row.key)}
                onClick={() =>
                  setRevealed((current) =>
                    current.includes(row.key)
                      ? current.filter((k) => k !== row.key)
                      : [...current, row.key],
                  )
                }
              >
                {revealed.includes(row.key) ? <EyeOff /> : <Eye />}
              </Button>
            ) : (
              <span />
            )}

            {row.whitespace && (
              <p className="text-[var(--amber-soft-foreground)] col-span-4 flex items-center gap-1.5 text-xs">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                {whitespaceNote}
              </p>
            )}
          </li>
        ))}
      </ul>
      </div>
    </div>
  )
}

export { EnvDiff }
