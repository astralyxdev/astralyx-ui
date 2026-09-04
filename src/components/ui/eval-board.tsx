import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Which model to ship, and what is still broken — as a ranking, not a grid.
 *
 * This replaced a models-across/cases-down matrix, which was the obvious shape
 * and the wrong one. A matrix needs a column per model, so it starts scrolling
 * sideways at three of them; it needs a sticky first column to stay readable
 * while it does; and every cell is a coloured block whose glyph is too small to
 * carry the meaning, so the colour ends up doing all the work and the screen
 * reads as noise.
 *
 * The two questions are separated instead, because they are asked at different
 * moments and want different shapes:
 *
 * **Which model?** A ranked list, one row per model, each with a bar segmented
 * by outcome. Comparing four numbers down a column is something people are good
 * at; comparing them across a scrolling header is not.
 *
 * **What is broken?** A case list, each case carrying one labelled chip per
 * model. The chip names its model, so there is no column header to align to and
 * nothing to scroll — it wraps at any width, on any number of models.
 *
 * Scores are computed from the results here rather than accepted as a prop. A
 * rate passed in can disagree with the rows beneath it, and when it does nobody
 * notices, because the number is what gets read.
 */
export type EvalOutcome = 'pass' | 'fail' | 'partial' | 'skip'

export type EvalModel = { id: string; name: string }

export type EvalCase = {
  id: string
  name: string
  description?: ReactNode
  /** Keyed by model id. A missing entry is "not run", distinct from skipped. */
  results: Record<string, EvalOutcome>
}

const OUTCOME: Record<
  EvalOutcome,
  { label: string; glyph: string; chip: string; bar: string }
> = {
  pass: {
    label: 'Pass',
    glyph: '✓',
    chip: 'bg-[var(--green-soft)] text-[var(--green-soft-foreground)]',
    bar: 'bg-[var(--green-soft-foreground)]',
  },
  partial: {
    label: 'Partial',
    glyph: '~',
    chip: 'bg-[var(--amber-soft)] text-[var(--amber-soft-foreground)]',
    bar: 'bg-[var(--amber-soft-foreground)]',
  },
  fail: {
    label: 'Fail',
    glyph: '✕',
    chip: 'bg-[var(--destructive-soft)] text-[var(--destructive-soft-foreground)]',
    bar: 'bg-[var(--destructive-soft-foreground)]',
  },
  skip: {
    label: 'Skipped',
    glyph: '–',
    chip: 'bg-muted text-muted-foreground/70',
    bar: 'bg-muted-foreground/25',
  },
}

const ORDER: EvalOutcome[] = ['pass', 'partial', 'fail', 'skip']

type EvalBoardProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  models: EvalModel[]
  cases: EvalCase[]
  /** What a partial counts for when scoring. */
  partialWeight?: number
  /** Drill into one case. */
  onSelectCase?: (evalCase: EvalCase) => void
  /** Flag a case no model passed — usually a broken test, not four bad models. */
  flagUniversalFailures?: boolean
  universalFailureLabel?: string
  leaderboardLabel?: string
  casesLabel?: string
  emptyLabel?: string
  /** Formats a model's score. Defaults to a whole percentage. */
  formatScore?: (rate: number, scored: number, total: number) => ReactNode
}

function EvalBoard({
  models,
  cases,
  partialWeight = 0.5,
  onSelectCase,
  flagUniversalFailures = true,
  universalFailureLabel = 'No model passed',
  leaderboardLabel = 'Models',
  casesLabel = 'Cases',
  emptyLabel = 'No cases yet.',
  formatScore,
  className,
  ...props
}: EvalBoardProps) {
  const board = useMemo(() => {
    const rows = models.map((model) => {
      const counts: Record<EvalOutcome, number> = { pass: 0, partial: 0, fail: 0, skip: 0 }
      let missing = 0

      for (const evalCase of cases) {
        const outcome = evalCase.results[model.id]
        if (!outcome) missing++
        else counts[outcome]++
      }

      // Skips and not-run are excluded from the denominator: a model is not
      // penalised for a case that never ran against it.
      const scored = counts.pass + counts.partial + counts.fail
      const earned = counts.pass + counts.partial * partialWeight

      return {
        model,
        counts,
        missing,
        scored,
        rate: scored === 0 ? 0 : earned / scored,
      }
    })

    return [...rows].sort((a, b) => b.rate - a.rate)
  }, [models, cases, partialWeight])

  const universalFailures = useMemo(
    () =>
      new Set(
        cases
          .filter(
            (evalCase) =>
              models.length > 0 &&
              models.every((model) => evalCase.results[model.id] === 'fail'),
          )
          .map((evalCase) => evalCase.id),
      ),
    [cases, models],
  )

  const best = board[0]

  if (cases.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div data-slot="eval-board" className={cn('flex flex-col gap-4', className)} {...props}>
      {/* Ranked down the page, so the numbers being compared sit in a column. */}
      <section className={cn(surface, radius.surface, 'overflow-hidden')}>
        <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
          {leaderboardLabel}
        </p>

        <ul className="divide-border list-none divide-y">
          {board.map((row) => (
            <li key={row.model.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{row.model.name}</span>
                  {row.model.id === best.model.id && row.rate > 0 && (
                    <Trophy
                      className="size-3.5 shrink-0 text-[var(--amber-soft-foreground)]"
                      aria-label="Highest score"
                    />
                  )}
                </div>

                <div
                  className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full"
                  role="img"
                  aria-label={ORDER.filter((outcome) => row.counts[outcome] > 0)
                    .map((outcome) => `${row.counts[outcome]} ${OUTCOME[outcome].label}`)
                    .join(', ')}
                >
                  {ORDER.map((outcome) =>
                    row.counts[outcome] > 0 ? (
                      <span
                        key={outcome}
                        className={cn('h-full', OUTCOME[outcome].bar)}
                        style={{ width: `${(row.counts[outcome] / cases.length) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>

                <p className="text-muted-foreground/70 flex flex-wrap gap-x-3 text-[11px] tabular-nums">
                  {ORDER.filter((outcome) => row.counts[outcome] > 0).map((outcome) => (
                    <span key={outcome}>
                      {row.counts[outcome]} {OUTCOME[outcome].label.toLowerCase()}
                    </span>
                  ))}
                  {row.missing > 0 && <span>{row.missing} not run</span>}
                </p>
              </div>

              <p className="w-16 shrink-0 text-end font-mono text-lg tabular-nums">
                {formatScore
                  ? formatScore(row.rate, row.scored, cases.length)
                  : `${Math.round(row.rate * 100)}%`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Chips carry their own model name, so there is no header to align to
          and nothing that has to scroll sideways. */}
      <section className={cn(surface, radius.surface, 'overflow-hidden')}>
        <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
          {casesLabel}
        </p>

        <ul className="divide-border list-none divide-y">
          {cases.map((evalCase) => {
            const flagged = flagUniversalFailures && universalFailures.has(evalCase.id)
            const Row = onSelectCase ? 'button' : 'div'

            return (
              <li key={evalCase.id}>
                <Row
                  {...(onSelectCase
                    ? { type: 'button' as const, onClick: () => onSelectCase(evalCase) }
                    : {})}
                  className={cn(
                    'flex w-full flex-col gap-2 px-4 py-3 text-start',
                    onSelectCase && cn('hover:bg-accent/40', focusRing),
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{evalCase.name}</span>
                    {flagged && (
                      <Badge size="sm" color="amber">
                        {universalFailureLabel}
                      </Badge>
                    )}
                  </div>

                  {evalCase.description && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {evalCase.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {models.map((model) => {
                      const outcome = evalCase.results[model.id]
                      const meta = outcome ? OUTCOME[outcome] : undefined

                      return (
                        <span
                          key={model.id}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px]',
                            radius.xs,
                            meta?.chip ??
                              'text-muted-foreground/50 border-border border border-dashed',
                          )}
                        >
                          <span aria-hidden="true" className="font-mono">
                            {meta?.glyph ?? '·'}
                          </span>
                          {model.name}
                          <span className="sr-only">: {meta?.label ?? 'Not run'}</span>
                        </span>
                      )
                    })}
                  </div>
                </Row>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export { EvalBoard }
export type { EvalBoardProps }
