import type { ComponentProps, ReactNode } from 'react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Category scores as rings, with the metrics behind them.
 *
 * Scores are banded at 50 and 90, matching the tool everyone compares against.
 * Inventing our own bands would make a "green" here mean something different
 * from a "green" in the report the number came from, which is worse than
 * useless.
 *
 * Metric values are shown in their own units next to the score. A performance
 * score of 62 is not actionable; "LCP 4.1s" is. The score is a summary of the
 * metrics, so hiding them behind the summary removes the only part you can act
 * on.
 *
 * The ring is drawn with `stroke-dasharray` on a circle rather than a conic
 * gradient, so it prints, scales, and respects the theme's own colours.
 */
export type LighthouseCategory = {
  id: string
  label: ReactNode
  /** 0–100. */
  score: number
  metrics?: { label: ReactNode; value: ReactNode; poor?: boolean }[]
}

/** Thresholds match the reference tool — diverging would make colours lie. */
function band(score: number) {
  if (score >= 90) return { color: 'var(--green)', ink: 'var(--green-soft-foreground)', label: 'Good' }
  if (score >= 50) return { color: 'var(--amber)', ink: 'var(--amber-soft-foreground)', label: 'Needs work' }
  return { color: 'var(--destructive)', ink: 'var(--destructive-soft-foreground)', label: 'Poor' }
}

function Ring({ score, size = 56 }: { score: number; size?: number }) {
  const meta = band(score)
  const radiusPx = size / 2 - 4
  const circumference = 2 * Math.PI * radiusPx

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radiusPx}
        fill="none"
        stroke="var(--secondary)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radiusPx}
        fill="none"
        stroke={meta.color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={meta.ink}
        style={{ fontSize: size * 0.3, fontWeight: 600 }}
      >
        {Math.round(score)}
      </text>
    </svg>
  )
}

function LighthouseScore({
  categories,
  ringSize = 56,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  categories: LighthouseCategory[]
  ringSize?: number
}) {
  return (
    <div
      data-slot="lighthouse-score"
      className={cn(surface, radius.surface, 'divide-border flex flex-col divide-y', className)}
      {...props}
    >
      {categories.map((category) => {
        const meta = band(category.score)
        return (
          <section key={category.id} className="flex items-start gap-4 p-4">
            <Ring score={category.score} size={ringSize} />

            <div className="min-w-0 flex-1">
              <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-medium">
                {category.label}
                <span className="text-xs font-normal" style={{ color: meta.ink }}>
                  {meta.label}
                </span>
              </h3>

              {/* The metrics are the actionable part; the score only summarises. */}
              {category.metrics && category.metrics.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                  {category.metrics.map((metric, index) => (
                    <div key={index}>
                      <dt className="text-muted-foreground truncate">{metric.label}</dt>
                      <dd
                        className="mt-0.5 font-medium tabular-nums"
                        style={{ color: metric.poor ? 'var(--destructive-soft-foreground)' : undefined }}
                      >
                        {metric.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export { LighthouseScore, band as lighthouseBand }
