import type { ComponentProps, ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A quota and what is filling it.
 *
 * The bar is scaled to the **quota**, not to what is used, so free space reads
 * as free space. A bar normalised to the total consumed is always full, which
 * is exactly backwards for a component whose job is "how much room is left".
 *
 * Segments below a pixel still get a sliver, for the reason every stacked bar
 * in this kit does: "logs are tiny" and "there are no logs" must not render
 * identically.
 *
 * Over quota is a real state, not a clamped bar. Object stores keep accepting
 * writes and bill for them, so a component that silently pins at 100% hides the
 * one number someone is about to be charged for.
 */
export type StorageSegment = {
  id: string
  label: ReactNode
  bytes: number
  color?: string
}

const COLORS = [
  'var(--blue-soft-foreground)',
  'var(--violet-soft-foreground)',
  'var(--cyan-soft-foreground)',
  'var(--amber-soft-foreground)',
  'var(--green-soft-foreground)',
]

export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = Math.abs(bytes)
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 || value >= 100 ? 0 : 1)} ${units[unit]}`
}

type StorageUsageProps = Omit<ComponentProps<'div'>, 'children'> & {
  segments: StorageSegment[]
  /** Bytes. Omit for an unmetered store — the bar then scales to the total. */
  quota?: number
  /** Warn past this fraction of the quota. */
  warnAt?: number
  label?: ReactNode
  freeLabel?: string
  overLabel?: (over: string) => ReactNode
  format?: (bytes: number) => string
}

function StorageUsage({
  segments,
  quota,
  warnAt = 0.85,
  label = 'Storage',
  freeLabel = 'Free',
  overLabel = (over) => `${over} over quota`,
  format = formatBytes,
  className,
  ...props
}: StorageUsageProps) {
  const used = segments.reduce((total, segment) => total + segment.bytes, 0)
  const ceiling = quota ?? (used || 1)
  const free = quota === undefined ? undefined : Math.max(0, quota - used)
  const over = quota !== undefined && used > quota ? used - quota : 0
  const pressure = used / ceiling

  return (
    <div
      data-slot="storage-usage"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn(
            'font-mono text-xs tabular-nums',
            over > 0
              ? 'text-[var(--destructive-soft-foreground)]'
              : pressure >= warnAt
                ? 'text-[var(--amber-soft-foreground)]'
                : 'text-muted-foreground',
          )}
        >
          {format(used)}
          {quota !== undefined && <> / {format(quota)}</>}
        </p>
      </div>

      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        {segments.map((segment, index) => (
          <span
            key={segment.id}
            className="h-full"
            style={{
              width: `${Math.min(100, (segment.bytes / ceiling) * 100)}%`,
              minWidth: segment.bytes > 0 ? 2 : 0,
              background: segment.color ?? COLORS[index % COLORS.length],
            }}
          />
        ))}
      </div>

      {/* Not clamped: an object store keeps accepting writes and billing for
          them, and pinning the bar at 100% hides the overage. */}
      {over > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {overLabel(format(over))}
        </p>
      )}

      <ul className="flex list-none flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment, index) => (
          <li key={segment.id} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: segment.color ?? COLORS[index % COLORS.length] }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="tabular-nums">{format(segment.bytes)}</span>
          </li>
        ))}
        {free !== undefined && (
          <li className="text-muted-foreground/60 flex items-center gap-1.5 text-xs">
            {freeLabel}
            <span className="tabular-nums">{format(free)}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

export { StorageUsage }
export type { StorageUsageProps }
