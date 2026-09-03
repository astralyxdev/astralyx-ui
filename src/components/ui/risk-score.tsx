import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A 0–100 risk score with the signals that produced it.
 *
 * The contributing factors are the component, not a detail beside it. A bare
 * number is unactionable — an analyst cannot approve or decline on "82" — and an
 * unexplained score is also the one thing a regulator will ask you to justify.
 *
 * Bands are named, not just coloured. "High" survives being printed, screenshot
 * into a ticket, or read by someone who cannot distinguish amber from green;
 * the colour is reinforcement.
 *
 * Weights are drawn relative to the largest contributor rather than to 100, so
 * a set of small signals still shows its shape instead of five invisible bars.
 */
export type RiskFactor = {
  label: ReactNode
  /** Points contributed. Negative values lower the score. */
  weight: number
  detail?: ReactNode
}

export type RiskBand = { min: number; label: string; color: string; ink: string }

const BANDS: RiskBand[] = [
  { min: 0, label: 'Low', color: 'var(--green)', ink: 'var(--green-soft-foreground)' },
  { min: 34, label: 'Elevated', color: 'var(--amber)', ink: 'var(--amber-soft-foreground)' },
  { min: 67, label: 'High', color: 'var(--destructive)', ink: 'var(--destructive-soft-foreground)' },
]

function bandFor(score: number, bands: RiskBand[]) {
  return [...bands].reverse().find((band) => score >= band.min) ?? bands[0]
}

function RiskScore({
  score,
  factors,
  bands = BANDS,
  max = 100,
  label = 'Risk score',
  size = 'md',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  score: number
  factors?: RiskFactor[]
  bands?: RiskBand[]
  max?: number
  label?: ReactNode
  size?: 'sm' | 'md'
}) {
  const clamped = Math.max(0, Math.min(max, score))
  const band = bandFor((clamped / max) * 100, bands)
  // Relative to the biggest signal, so small ones still read.
  const peak = factors?.reduce((top, factor) => Math.max(top, Math.abs(factor.weight)), 0) ?? 0

  return (
    <div
      data-slot="risk-score"
      data-band={band.label.toLowerCase()}
      className={cn('flex flex-col gap-3', className)}
      {...props}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn('font-semibold tabular-nums', size === 'sm' ? 'text-2xl' : 'text-3xl')}
          style={{ color: band.ink }}
        >
          {Math.round(clamped)}
        </span>
        <span className="text-muted-foreground text-xs">/ {max}</span>
        {/* Named as well as coloured — this gets screenshotted into tickets. */}
        <span className="ms-auto text-xs font-medium" style={{ color: band.ink }}>
          {band.label}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${Math.round(clamped)} of ${max}, ${band.label}`}
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn('bg-secondary relative h-1.5 w-full overflow-hidden', 'rounded-full')}
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${(clamped / max) * 100}%`, background: band.color }}
        />
      </div>

      {factors && factors.length > 0 && (
        <ul className="flex list-none flex-col gap-1.5">
          {factors.map((factor, index) => {
            const share = peak > 0 ? Math.abs(factor.weight) / peak : 0
            const negative = factor.weight < 0
            return (
              <li key={index} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{factor.label}</span>
                  <span
                    className="shrink-0 font-medium tabular-nums"
                    style={{ color: negative ? 'var(--green-soft-foreground)' : undefined }}
                  >
                    {negative ? '' : '+'}
                    {factor.weight}
                  </span>
                </div>
                <div className={cn('bg-secondary h-1 w-full overflow-hidden', 'rounded-full')}>
                  <div
                    className="h-full"
                    style={{
                      width: `${share * 100}%`,
                      background: negative ? 'var(--green)' : band.color,
                      opacity: negative ? 1 : 0.65,
                    }}
                  />
                </div>
                {factor.detail && (
                  <p className="text-muted-foreground text-xs">{factor.detail}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { RiskScore, BANDS as riskBands, bandFor as riskBandFor }
