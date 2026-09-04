import type { ComponentProps, ReactNode } from 'react'
import { CircleAlert, CircleCheck, CircleSlash, CircleX, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The safety checks around a run, and how each one landed.
 *
 * Guardrails are the part of an agent people are asked to sign off on, so the
 * list is ordered by consequence rather than by execution: everything that
 * blocked comes first, then warnings, then passes. A screen that renders
 * fifteen green rows and buries the one that blocked in the middle is
 * technically complete and useless in a review.
 *
 * **A skipped check is not a passing one.** `skipped` is its own state, drawn
 * neutrally, because "we did not run the PII scan" and "the PII scan found
 * nothing" are opposite facts and folding them together is how an unchecked
 * output ships. Same reasoning for `pending` during a live run.
 *
 * Counts come from the data rather than being passed in, so a summary cannot
 * disagree with the rows beneath it.
 */
export type GuardrailOutcome = 'pass' | 'warn' | 'block' | 'skipped' | 'pending'

export type Guardrail = {
  id: string
  name: string
  outcome: GuardrailOutcome
  /** What it checked, or why it landed the way it did. */
  detail?: ReactNode
  /** Where it ran — 'input', 'output', a stage name. */
  stage?: string
  /** Trailing slot — a score, a duration, a link to the policy. */
  meta?: ReactNode
}

const OUTCOME: Record<
  GuardrailOutcome,
  {
    label: string
    icon: typeof CircleCheck
    color: 'green' | 'amber' | 'destructive' | 'neutral' | 'blue'
    /** Sort weight — worst first. */
    rank: number
  }
> = {
  block: { label: 'Blocked', icon: CircleX, color: 'destructive', rank: 0 },
  warn: { label: 'Warning', icon: CircleAlert, color: 'amber', rank: 1 },
  pending: { label: 'Running', icon: Clock, color: 'blue', rank: 2 },
  skipped: { label: 'Skipped', icon: CircleSlash, color: 'neutral', rank: 3 },
  pass: { label: 'Passed', icon: CircleCheck, color: 'green', rank: 4 },
}

const ICON_TONE: Record<GuardrailOutcome, string> = {
  block: 'text-[var(--destructive-soft-foreground)]',
  warn: 'text-[var(--amber-soft-foreground)]',
  pending: 'text-[var(--blue-soft-foreground)]',
  skipped: 'text-muted-foreground/60',
  pass: 'text-[var(--green-soft-foreground)]',
}

type GuardrailListProps = Omit<ComponentProps<'div'>, 'children'> & {
  guardrails: Guardrail[]
  /** Worst-first. Off to keep the order you passed. */
  sorted?: boolean
  /** Override any outcome's wording. */
  outcomeLabels?: Partial<Record<GuardrailOutcome, string>>
  /** Caption above the list. Receives the tallies. */
  summary?: (counts: Record<GuardrailOutcome, number>) => ReactNode
  emptyLabel?: string
  label?: string
}

function GuardrailList({
  guardrails,
  sorted = true,
  outcomeLabels,
  summary,
  emptyLabel = 'No guardrails configured.',
  label = 'Guardrails',
  className,
  ...props
}: GuardrailListProps) {
  const counts: Record<GuardrailOutcome, number> = {
    pass: 0,
    warn: 0,
    block: 0,
    skipped: 0,
    pending: 0,
  }
  for (const rail of guardrails) counts[rail.outcome]++

  const rows = sorted
    ? // A copy: sorting the caller's array in place is a side effect on a prop.
      [...guardrails].sort((a, b) => OUTCOME[a.outcome].rank - OUTCOME[b.outcome].rank)
    : guardrails

  return (
    <div
      data-slot="guardrail-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {summary && (
        <div className="border-border bg-muted/40 border-b px-4 py-2.5 text-xs">
          {summary(counts)}
        </div>
      )}

      {guardrails.length === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <ul aria-label={label} className="divide-border list-none divide-y">
          {rows.map((rail) => {
            const meta = OUTCOME[rail.outcome]
            const Icon = meta.icon
            return (
              <li key={rail.id} className="flex items-start gap-3 px-4 py-3">
                <Icon
                  className={cn('mt-0.5 size-4 shrink-0', ICON_TONE[rail.outcome])}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{rail.name}</p>
                    {rail.stage && (
                      <span className="text-muted-foreground/60 font-mono text-[11px]">
                        {rail.stage}
                      </span>
                    )}
                  </div>
                  {rail.detail && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {rail.detail}
                    </p>
                  )}
                </div>

                {rail.meta && (
                  <span className="text-muted-foreground/70 shrink-0 text-[11px] tabular-nums">
                    {rail.meta}
                  </span>
                )}

                <Badge size="sm" color={meta.color} className="shrink-0">
                  {outcomeLabels?.[rail.outcome] ?? meta.label}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { GuardrailList }
export type { GuardrailListProps }
