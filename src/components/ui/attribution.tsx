import { useId, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Credit for a conversion, split across the touchpoints that led to it.
 *
 * **The model is a control, not a setting buried in a config.** Last-touch says
 * paid search won; first-touch says the blog post did; linear says everyone
 * helped. These are the *same journeys* — the disagreement is entirely in the
 * rule, and any single number presented without its model is a claim
 * masquerading as a measurement. Switching models in place is the point of the
 * component: a channel whose share collapses when you change the rule was never
 * really driving conversions.
 *
 * **Five models, computed here from the raw journeys:**
 * - *First touch* — all credit to the first interaction.
 * - *Last touch* — all credit to the last. The default in most tools, and the
 *   most flattering to bottom-of-funnel spend.
 * - *Linear* — split evenly. No assumption, which is its virtue and its flaw.
 * - *Time decay* — later touches earn more, on a configurable half-life.
 * - *Position based* — 40/20/40 across first, middle and last.
 *
 * **None of them are causal.** Every model here divides observed credit among
 * touchpoints that were present; none establishes that a touchpoint *caused*
 * anything, and none can see the channels that never got a click. Incrementality
 * testing answers that question; this one shows you how sensitive your answer is
 * to an arbitrary rule, which is the honest thing a chart can do.
 */
export type Touchpoint = {
  channel: string
  at: Date | string
}

export type Journey = {
  id: string
  touchpoints: Touchpoint[]
  /** Revenue or count. Defaults to 1 conversion. */
  value?: number
}

export type AttributionModel = 'first' | 'last' | 'linear' | 'decay' | 'position'

type AttributionProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  journeys: Journey[]
  model?: AttributionModel
  defaultModel?: AttributionModel
  onModelChange?: (model: AttributionModel) => void
  /** Models offered in the switcher. */
  models?: AttributionModel[]
  /** Half-life in days for time decay. */
  halfLife?: number
  valueFormat?: (value: number) => string
  emptyLabel?: string
  label?: string
  footnote?: ReactNode
}

const MODEL_LABELS: Record<AttributionModel, string> = {
  first: 'First touch',
  last: 'Last touch',
  linear: 'Linear',
  decay: 'Time decay',
  position: 'Position based',
}

const asTime = (value: Date | string) =>
  (value instanceof Date ? value : new Date(value)).getTime()

/** Weights for one journey, summing to 1. */
function weightsFor(journey: Journey, model: AttributionModel, halfLife: number): number[] {
  const points = journey.touchpoints
  const n = points.length
  if (n === 0) return []
  if (n === 1) return [1]

  switch (model) {
    case 'first':
      return points.map((_, index) => (index === 0 ? 1 : 0))
    case 'last':
      return points.map((_, index) => (index === n - 1 ? 1 : 0))
    case 'linear':
      return points.map(() => 1 / n)
    case 'position': {
      // 40% first, 40% last, 20% shared by the middle.
      if (n === 2) return [0.5, 0.5]
      const middle = 0.2 / (n - 2)
      return points.map((_, index) => (index === 0 || index === n - 1 ? 0.4 : middle))
    }
    case 'decay': {
      const last = asTime(points[n - 1].at)
      const dayMs = 86_400_000
      const raw = points.map((point) => {
        const daysBefore = (last - asTime(point.at)) / dayMs
        return Math.pow(2, -daysBefore / halfLife)
      })
      const sum = raw.reduce((total, weight) => total + weight, 0) || 1
      return raw.map((weight) => weight / sum)
    }
  }
}

function Attribution({
  journeys,
  model: modelProp,
  defaultModel = 'last',
  onModelChange,
  models = ['first', 'last', 'linear', 'decay', 'position'],
  halfLife = 7,
  valueFormat = (value) => value.toFixed(1),
  emptyLabel = 'No journeys.',
  label = 'Attribution',
  footnote,
  className,
  ...props
}: AttributionProps) {
  const titleId = useId()
  const [internal, setInternal] = useState<AttributionModel>(defaultModel)
  const model = modelProp ?? internal

  const rows = useMemo(() => {
    const credit = new Map<string, number>()
    let total = 0

    for (const journey of journeys) {
      const value = journey.value ?? 1
      const weights = weightsFor(journey, model, halfLife)
      journey.touchpoints.forEach((point, index) => {
        credit.set(point.channel, (credit.get(point.channel) ?? 0) + value * (weights[index] ?? 0))
      })
      total += value
    }

    return {
      total,
      channels: [...credit.entries()]
        .map(([channel, amount]) => ({ channel, amount }))
        .sort((a, b) => b.amount - a.amount),
    }
  }, [journeys, model, halfLife])

  if (journeys.length === 0) {
    return (
      <div className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </div>
    )
  }

  const max = Math.max(...rows.channels.map((row) => row.amount), 1)

  const setModel = (next: AttributionModel) => {
    if (modelProp === undefined) setInternal(next)
    onModelChange?.(next)
  }

  return (
    <div
      data-slot="attribution"
      className={cn('flex flex-col gap-3', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={titleId} className="text-sm font-medium">
          {label}
        </p>

        {/* The model belongs on the chart, not in a settings panel: the number
            means nothing without it. */}
        <div role="radiogroup" aria-label="Attribution model" className="flex flex-wrap gap-1">
          {models.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={model === option}
              onClick={() => setModel(option)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs',
                model === option
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {MODEL_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex list-none flex-col gap-2">
        {rows.channels.map((row, index) => {
          const share = rows.total > 0 ? row.amount / rows.total : 0
          return (
            <li key={row.channel} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs">{row.channel}</span>
              <span className="bg-muted relative h-5 min-w-0 flex-1 overflow-hidden rounded-[3px]">
                <span
                  className="absolute inset-y-0 start-0 rounded-[3px]"
                  style={{
                    width: `${(row.amount / max) * 100}%`,
                    background: dataPalette[index % dataPalette.length].fill,
                    opacity: 0.75,
                  }}
                />
              </span>
              <span className="text-muted-foreground w-24 shrink-0 text-end text-xs tabular-nums">
                {valueFormat(row.amount)}
                <span className="ms-1 opacity-70">({(share * 100).toFixed(0)}%)</span>
              </span>
            </li>
          )
        })}
      </ul>

      <p className="text-muted-foreground text-xs">
        {footnote ?? (
          <>
            {journeys.length.toLocaleString()} journeys under {MODEL_LABELS[model].toLowerCase()}.
            Attribution divides observed credit; it does not establish cause.
          </>
        )}
      </p>
    </div>
  )
}

export { Attribution }
export type { AttributionProps }
