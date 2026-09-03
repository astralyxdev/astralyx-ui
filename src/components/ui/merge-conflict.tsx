import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A merge conflict, with a resolution per hunk.
 *
 * Both sides are shown in full, stacked, with the base labelled. Side-by-side
 * looks tidier and is worse: conflict hunks are rarely the same height, so the
 * columns desynchronise and you end up comparing line 4 against line 9.
 *
 * "Both" is offered as a resolution because it is frequently the right answer —
 * two people adding a different import to the same block conflict textually and
 * agree semantically. A two-button ours/theirs forces a manual re-edit for the
 * commonest case there is.
 *
 * Nothing resolves itself. Unresolved hunks are counted in the header and the
 * count does not go down until a choice is made, because a conflict UI that
 * quietly defaults to one side is how code silently disappears in a merge.
 */
export type ConflictSide = 'ours' | 'theirs' | 'both'

export type ConflictHunk = {
  id: string
  ours: string
  theirs: string
  /** Common ancestor, from a diff3-style conflict. */
  base?: string
  /** Unchanged lines before the hunk, for orientation. */
  context?: string
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_UNRESOLVED_LABEL: (count: number) => ReactNode = (count) => `${count} unresolved`

function MergeConflict({
  path,
  hunks,
  resolutions: resolutionsProp,
  onResolve,
  oursLabel = 'Ours',
  theirsLabel = 'Theirs',
  baseLabel = 'Base',
  bothLabel = 'Keep both',
  unresolvedLabel = DEFAULT_UNRESOLVED_LABEL,
  resolvedLabel = 'All conflicts resolved',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  path?: ReactNode
  hunks: ConflictHunk[]
  /** Controlled resolutions by hunk id. */
  resolutions?: Record<string, ConflictSide>
  onResolve?: (id: string, side: ConflictSide) => void
  oursLabel?: ReactNode
  theirsLabel?: ReactNode
  baseLabel?: ReactNode
  bothLabel?: ReactNode
  unresolvedLabel?: (count: number) => ReactNode
  resolvedLabel?: ReactNode
}) {
  const [own, setOwn] = useState<Record<string, ConflictSide>>({})
  const resolutions = resolutionsProp ?? own

  const unresolved = useMemo(
    () => hunks.filter((hunk) => !resolutions[hunk.id]).length,
    [hunks, resolutions],
  )

  const choose = (id: string, side: ConflictSide) => {
    if (resolutionsProp === undefined) setOwn((current) => ({ ...current, [id]: side }))
    onResolve?.(id, side)
  }

  const pane = (label: ReactNode, text: string, active: boolean, tone: string) => (
    <div
      className={cn(
        'border-s-2 ps-3',
        active ? 'opacity-100' : 'opacity-45',
      )}
      style={{ borderInlineStartColor: tone }}
    >
      <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">{text}</pre>
    </div>
  )

  return (
    <div
      data-slot="merge-conflict"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        {path && <code className="min-w-0 flex-1 truncate font-mono text-xs">{path}</code>}
        <span
          className={cn(
            'ms-auto text-xs',
            unresolved > 0 ? 'text-[var(--amber-soft-foreground)]' : 'text-[var(--green-soft-foreground)]',
          )}
        >
          {unresolved > 0 ? unresolvedLabel(unresolved) : resolvedLabel}
        </span>
      </div>

      <ul className="divide-border list-none divide-y">
        {hunks.map((hunk) => {
          const choice = resolutions[hunk.id]
          return (
            <li key={hunk.id} className="flex flex-col gap-3 p-3">
              {hunk.context && (
                <pre className="text-muted-foreground/60 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                  {hunk.context}
                </pre>
              )}

              {/* Stacked, not side by side: unequal heights desynchronise columns. */}
              <div className="flex flex-col gap-3">
                {pane(oursLabel, hunk.ours, !choice || choice === 'ours' || choice === 'both', 'var(--blue)')}
                {hunk.base !== undefined &&
                  pane(baseLabel, hunk.base, false, 'var(--muted-foreground)')}
                {pane(theirsLabel, hunk.theirs, !choice || choice === 'theirs' || choice === 'both', 'var(--green)')}
              </div>

              <div className="flex flex-wrap gap-2">
                {(['ours', 'theirs', 'both'] as const).map((side) => (
                  <Button
                    key={side}
                    size="xs"
                    variant={choice === side ? 'default' : 'secondary'}
                    aria-pressed={choice === side}
                    className={focusRing}
                    onClick={() => choose(hunk.id, side)}
                  >
                    {side === 'ours' ? oursLabel : side === 'theirs' ? theirsLabel : bothLabel}
                  </Button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { MergeConflict }
