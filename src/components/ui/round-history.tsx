import type { ComponentProps, ReactNode } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Recent round outcomes as a strip of chips.
 *
 * Newest first, left to right. Game histories are read the way a ticker is —
 * the most recent result is the one being reacted to — and appending to the end
 * buries it off the right edge on a phone.
 *
 * The thresholds that colour a chip are props, because "high" means 2× in one
 * game and 100× in another. Hard-coding them produces a strip that is all one
 * colour on half the games it is used for.
 *
 * A note about what this cannot tell you is included deliberately: past rounds
 * carry no information about the next one, and a history strip is the single
 * most common surface for the gambler's fallacy.
 */
export type Round = {
  id: string
  /** The result — a multiplier, a score, a number. */
  value: number
  at?: Date
  /** Marks a round the player took part in. */
  played?: boolean
  detail?: ReactNode
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_FORMAT: (value: number) => ReactNode = (value) => `${value.toFixed(2)}×`

function RoundHistory({
  rounds,
  lowBelow = 2,
  highAbove = 10,
  format = DEFAULT_FORMAT,
  now,
  locale = 'en-GB',
  note = 'Past rounds do not affect future ones.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  rounds: Round[]
  /** Below this reads as a loss. Game-specific, hence a prop. */
  lowBelow?: number
  highAbove?: number
  format?: (value: number) => ReactNode
  now?: Date
  locale?: string
  note?: ReactNode
}) {
  return (
    <div
      data-slot="round-history"
      className={cn(surface, radius.surface, 'flex flex-col gap-2 p-3', className)}
      {...props}
    >
      {/* Newest first: the last result is the one being reacted to. */}
      <div className="flex flex-wrap gap-1.5">
        {rounds.map((round) => {
          const low = round.value < lowBelow
          const high = round.value >= highAbove

          return (
            <Tooltip
              key={round.id}
              content={
                <span className="flex flex-col">
                  <span>{format(round.value)}</span>
                  {round.at && (
                    <span className="opacity-70">
                      <Fmt type="relative" value={round.at} now={now} locale={locale} />
                    </span>
                  )}
                  {round.detail && <span className="opacity-70">{round.detail}</span>}
                </span>
              }
            >
              <span
                tabIndex={0}
                className={cn(
                  'inline-flex h-6 items-center px-2 text-xs font-medium tabular-nums outline-none',
                  radius.xs,
                  'focus-visible:ring-ring/50 focus-visible:ring-2',
                  low && 'bg-[color-mix(in_oklab,var(--destructive),transparent_86%)] text-[var(--destructive-soft-foreground)]',
                  high && 'bg-[color-mix(in_oklab,var(--green),transparent_82%)] text-[var(--green-soft-foreground)]',
                  !low && !high && 'bg-secondary text-muted-foreground',
                  round.played && 'ring-primary/40 ring-2',
                )}
              >
                {format(round.value)}
              </span>
            </Tooltip>
          )
        })}
      </div>

      {/* Stated on purpose — this strip is where the gambler's fallacy lives. */}
      {note && <p className="text-muted-foreground/70 text-xs">{note}</p>}
    </div>
  )
}

export { RoundHistory }
