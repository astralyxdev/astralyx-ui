import type { ComponentProps, ReactNode } from 'react'
import { Ban, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Spend and token caps, against what a run has actually consumed.
 *
 * The distinction the component is built around: a **soft** limit warns, a
 * **hard** limit stops. Collapsing them into one bar is how a team ends up
 * believing they have a spend cap when what they have is a notification.
 *
 * So a hard limit is drawn as a wall on the track — a solid marker with a stop
 * glyph — and a soft one as a dashed threshold. Once a hard limit is passed the
 * whole row is destructive and says `stopped`, because at that point the run is
 * not running and every other reading on the screen is historical.
 *
 * Bars are scaled to the hard limit when there is one, so "how much room is
 * left before it stops" is the length being read. Scaling to the soft limit
 * makes a run look finished when it has half its budget left.
 */
export type Budget = {
  id: string
  label: ReactNode
  /** Consumed so far, in whatever unit `format` renders. */
  used: number
  /** Warns when passed. */
  soft?: number
  /** Stops the run when passed. */
  hard?: number
  format?: (value: number) => string
  note?: ReactNode
}

type BudgetGuardProps = Omit<ComponentProps<'div'>, 'children'> & {
  budgets: Budget[]
  stoppedLabel?: string
  warningLabel?: string
  hardLabel?: string
  softLabel?: string
  emptyLabel?: string
  label?: string
}

function BudgetGuard({
  budgets,
  stoppedLabel = 'stopped',
  warningLabel = 'over the warning threshold',
  hardLabel = 'hard limit',
  softLabel = 'warn at',
  emptyLabel = 'No budgets configured — this run is uncapped.',
  label = 'Budgets',
  className,
  ...props
}: BudgetGuardProps) {
  return (
    <div
      data-slot="budget-guard"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <p className="border-border bg-muted/40 text-muted-foreground/70 border-b px-4 py-2 text-[11px] font-medium tracking-[0.14em] uppercase">
        {label}
      </p>

      {budgets.length === 0 ? (
        <p className="flex items-start gap-2 px-4 py-3 text-xs text-[var(--amber-soft-foreground)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-border list-none divide-y">
          {budgets.map((budget) => {
            const format = budget.format ?? ((value: number) => value.toLocaleString())
            // Scaled to the wall, so the length being read is room-until-stop.
            const ceiling = budget.hard ?? budget.soft ?? budget.used ?? 1
            const stopped = budget.hard !== undefined && budget.used >= budget.hard
            const warning =
              !stopped && budget.soft !== undefined && budget.used >= budget.soft

            return (
              <li key={budget.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {budget.label}
                    {stopped && (
                      <Badge size="sm" color="destructive">
                        <Ban className="size-3" aria-hidden="true" />
                        {stoppedLabel}
                      </Badge>
                    )}
                    {warning && (
                      <Badge size="sm" color="amber">
                        {warningLabel}
                      </Badge>
                    )}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs tabular-nums',
                      stopped
                        ? 'text-[var(--destructive-soft-foreground)]'
                        : 'text-muted-foreground',
                    )}
                  >
                    {format(budget.used)}
                    {budget.hard !== undefined && <> / {format(budget.hard)}</>}
                  </span>
                </div>

                <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      stopped
                        ? 'bg-[var(--destructive-soft-foreground)]'
                        : warning
                          ? 'bg-[var(--amber-soft-foreground)]'
                          : 'bg-muted-foreground/50',
                    )}
                    style={{ width: `${Math.min(100, (budget.used / ceiling) * 100)}%` }}
                  />

                  {/* A dashed threshold; the hard wall is drawn below it. */}
                  {budget.soft !== undefined && budget.hard !== undefined && (
                    <span
                      aria-hidden="true"
                      title={`${softLabel} ${format(budget.soft)}`}
                      className="absolute inset-y-0 w-px bg-[var(--amber-soft-foreground)]/60"
                      style={{ insetInlineStart: `${(budget.soft / ceiling) * 100}%` }}
                    />
                  )}
                </div>

                <div className="text-muted-foreground/60 flex flex-wrap gap-x-3 text-[11px]">
                  {budget.soft !== undefined && (
                    <span>
                      {softLabel} {format(budget.soft)}
                    </span>
                  )}
                  {budget.hard !== undefined && (
                    <span>
                      {hardLabel} {format(budget.hard)}
                    </span>
                  )}
                  {budget.note && <span>{budget.note}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { BudgetGuard }
export type { BudgetGuardProps }
