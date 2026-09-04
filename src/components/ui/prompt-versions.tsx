import type { ComponentProps, ReactNode } from 'react'
import { GitBranch, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A prompt's version history, with what each change did to the score.
 *
 * The pairing that makes this useful: a version and its eval result on the same
 * row. A history that lists edits without outcomes tells you what happened; a
 * dashboard that shows scores without the edits tells you something changed.
 * Neither answers "which edit made it worse", which is the only question anyone
 * opens this for.
 *
 * **Deltas are against the previous version, not against the best.** Regression
 * hunting walks backwards one step at a time, and a delta against a distant
 * high-water mark makes every version after it look equally bad.
 *
 * The live version is marked rather than sorted to the top — its position in
 * the sequence is information, and moving it hides how many versions have
 * shipped since.
 */
export type PromptVersion = {
  id: string
  /** A label, tag or hash — whatever you version by. */
  label: string
  /** Already formatted — this component does not own your locale. */
  at?: string
  author?: string
  /** One line on what changed. */
  note?: ReactNode
  /** Eval score, 0–1. Omit for a version that was never scored. */
  score?: number
  /** Currently deployed. */
  live?: boolean
}

type PromptVersionsProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  /** Newest first. Order is preserved — position carries meaning. */
  versions: PromptVersion[]
  selectedId?: string
  onSelect?: (version: PromptVersion) => void
  /** Compare two versions — usually opens a PromptDiff. */
  onCompare?: (a: PromptVersion, b: PromptVersion) => void
  compareLabel?: string
  liveLabel?: string
  unscoredLabel?: string
  emptyLabel?: string
  formatScore?: (score: number) => string
  label?: string
}

function PromptVersions({
  versions,
  selectedId,
  onSelect,
  onCompare,
  compareLabel = 'Diff',
  liveLabel = 'Live',
  unscoredLabel = 'not scored',
  emptyLabel = 'No versions yet.',
  formatScore = (score) => `${Math.round(score * 100)}%`,
  label = 'Versions',
  className,
  ...props
}: PromptVersionsProps) {
  if (versions.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      data-slot="prompt-versions"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
        {label}
      </p>

      <ul className="divide-border list-none divide-y">
        {versions.map((version, index) => {
          // Against the immediately previous version — regression hunting walks
          // backwards one step at a time.
          const previous = versions[index + 1]
          const delta =
            version.score !== undefined && previous?.score !== undefined
              ? version.score - previous.score
              : undefined

          const selected = version.id === selectedId
          const Row = onSelect ? 'button' : 'div'

          return (
            <li key={version.id} className="flex items-center gap-2">
              <Row
                {...(onSelect
                  ? { type: 'button' as const, onClick: () => onSelect(version) }
                  : {})}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start',
                  onSelect && cn('hover:bg-accent/40', focusRing),
                  selected && 'bg-accent/60',
                )}
              >
                <GitBranch className="text-muted-foreground/50 size-3.5 shrink-0" aria-hidden="true" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs font-medium">{version.label}</code>
                    {version.live && (
                      <Badge size="sm" color="green">
                        {liveLabel}
                      </Badge>
                    )}
                    {version.at && (
                      <span className="text-muted-foreground/60 text-[11px] tabular-nums">
                        {version.at}
                      </span>
                    )}
                    {version.author && (
                      <span className="text-muted-foreground/60 text-[11px]">{version.author}</span>
                    )}
                  </div>
                  {version.note && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {version.note}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {version.score === undefined ? (
                    <span className="text-muted-foreground/50 text-[11px]">{unscoredLabel}</span>
                  ) : (
                    <span className="font-mono text-sm tabular-nums">
                      {formatScore(version.score)}
                    </span>
                  )}

                  {delta !== undefined && Math.abs(delta) > 0.0001 && (
                    <span
                      className={cn(
                        'flex items-center gap-0.5 font-mono text-[11px] tabular-nums',
                        delta > 0
                          ? 'text-[var(--green-soft-foreground)]'
                          : 'text-[var(--destructive-soft-foreground)]',
                      )}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="size-3" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="size-3" aria-hidden="true" />
                      )}
                      {delta > 0 ? '+' : ''}
                      {Math.round(delta * 100)}
                    </span>
                  )}
                </div>
              </Row>

              {onCompare && previous && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="me-2 shrink-0"
                  onClick={() => onCompare(previous, version)}
                >
                  {compareLabel}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { PromptVersions }
export type { PromptVersionsProps }
