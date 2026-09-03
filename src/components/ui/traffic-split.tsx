import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Traffic weights across versions — a canary or blue/green rollout.
 *
 * Weights are normalised for display rather than assumed to total 100. A
 * rollout config that adds up to 97 is a real state during an edit, and a bar
 * that renders it as a gap is more honest than one that silently rescales and
 * hides the mistake — so the shortfall is called out instead.
 *
 * Each segment is labelled inside when it is wide enough and in the legend
 * always, since a 3% canary has no room for text but is precisely the segment
 * you are watching.
 */
export type TrafficTarget = {
  id: string
  label: ReactNode
  weight: number
  version?: string
  color?: string
  /** Marks the version being rolled out. */
  canary?: boolean
}



function TrafficSplit({
  targets,
  label,
  canaryLabel = 'canary',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  targets: TrafficTarget[]
  label?: ReactNode
  /** Badge on the canary variant. */
  canaryLabel?: ReactNode
}) {
  const total = targets.reduce((sum, target) => sum + target.weight, 0)
  const shortfall = Math.round((100 - total) * 100) / 100

  return (
    <div
      data-slot="traffic-split"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {(label || shortfall !== 0) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {shortfall !== 0 && (
            <span className="text-xs text-[var(--amber-soft-foreground)]">
              {shortfall > 0
                ? `${shortfall}% unassigned`
                : `${Math.abs(shortfall)}% over 100`}
            </span>
          )}
        </div>
      )}

      <div
        className="bg-secondary flex h-8 w-full overflow-hidden rounded-lg"
        role="img"
        aria-label={targets
          .map((target) => `${target.version ?? target.id}: ${target.weight}%`)
          .join(', ')}
      >
        {targets.map((target, index) => {
          const share = total > 0 ? (target.weight / total) * 100 : 0
          return (
            <div
              key={target.id}
              style={{
                width: `${share}%`,
                backgroundColor: target.color ?? dataPalette[index % dataPalette.length].fill,
                // The label sits on the fill, so it reads the paired ink —
                // white on the amber entry fails contrast. A caller-supplied
                // colour has no known pairing, so it falls back to white.
                color: target.color ? 'white' : dataPalette[index % dataPalette.length].ink,
              }}
              className="flex items-center justify-center overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none"
            >
              {/* Only label inside when there is genuinely room. */}
              {share > 12 && (
                <span className="truncate px-2 text-xs font-medium">
                  {target.weight}%
                </span>
              )}
            </div>
          )
        })}
      </div>

      <ul className="flex list-none flex-wrap gap-x-4 gap-y-1.5">
        {targets.map((target, index) => (
          <li key={target.id} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full [corner-shape:round]"
              style={{ backgroundColor: target.color ?? dataPalette[index % dataPalette.length].fill }}
            />
            <span className="text-muted-foreground">{target.label}</span>
            {target.version && (
              <code className="text-muted-foreground/70 font-mono">{target.version}</code>
            )}
            {target.canary && (
              <Badge size="sm" color="amber">
                {canaryLabel}
              </Badge>
            )}
            <span className="font-medium tabular-nums">{target.weight}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { TrafficSplit }
