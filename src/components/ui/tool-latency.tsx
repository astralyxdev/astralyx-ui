import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Per-tool latency and failure rate — the ops view of a tool fleet.
 *
 * **p95, not the mean.** A tool averaging 200ms that spikes to nine seconds
 * one call in twenty is the one blowing your agent's timeout, and the mean
 * hides it completely. The bar is drawn from p95 for the same reason.
 *
 * Bars are scaled against the slowest tool in the set, so the row that is
 * actually the problem is visually the longest. Scaling each to its own maximum
 * would draw every tool as a full bar and rank nothing.
 *
 * Error rate is coloured by threshold rather than on a gradient: anything above
 * `errorThreshold` is a problem and everything below it is noise, and a smooth
 * ramp makes 0.4% and 4% look like neighbours.
 */
export type ToolLatencyRow = {
  name: string
  /** Milliseconds. */
  p50: number
  p95: number
  /** Invocations in the window. */
  calls: number
  /** 0–1. */
  errorRate?: number
  meta?: ReactNode
}

type ToolLatencyProps = Omit<ComponentProps<'div'>, 'children'> & {
  tools: ToolLatencyRow[]
  /** Above this fraction, the error rate is drawn as a problem. */
  errorThreshold?: number
  /** Sort slowest-p95 first. Off keeps your order. */
  sorted?: boolean
  formatDuration?: (ms: number) => string
  emptyLabel?: string
  label?: string
  headers?: { tool?: string; p50?: string; p95?: string; calls?: string; errors?: string }
}

function defaultFormat(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
}

function ToolLatency({
  tools,
  errorThreshold = 0.01,
  sorted = true,
  formatDuration = defaultFormat,
  emptyLabel = 'No calls in this window.',
  label = 'Tool latency',
  headers,
  className,
  ...props
}: ToolLatencyProps) {
  const rows = useMemo(
    // A copy — sorting the caller's array in place is a side effect on a prop.
    () => (sorted ? [...tools].sort((a, b) => b.p95 - a.p95) : tools),
    [sorted, tools],
  )
  const slowest = Math.max(1, ...tools.map((tool) => tool.p95))

  return (
    <div
      data-slot="tool-latency"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <>
          <div className="border-border text-muted-foreground/70 flex items-center gap-3 border-b px-4 py-2 text-[11px] tracking-wide uppercase">
            <span className="min-w-0 flex-1">{headers?.tool ?? 'Tool'}</span>
            <span className="w-16 shrink-0 text-end">{headers?.p50 ?? 'p50'}</span>
            <span className="w-16 shrink-0 text-end">{headers?.p95 ?? 'p95'}</span>
            <span className="hidden w-16 shrink-0 text-end sm:block">{headers?.calls ?? 'Calls'}</span>
            <span className="w-14 shrink-0 text-end">{headers?.errors ?? 'Err'}</span>
          </div>

          <ul aria-label={label} className="divide-border/60 list-none divide-y">
            {rows.map((tool) => {
              const bad = (tool.errorRate ?? 0) > errorThreshold
              return (
                <li key={tool.name} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <code className="block truncate font-mono text-xs">{tool.name}</code>
                    {/* Scaled against the slowest tool, so the worst row is the
                        longest bar rather than every row being full. */}
                    <div className="bg-muted/60 mt-1.5 h-1 w-full overflow-hidden rounded-full">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          bad ? 'bg-[var(--destructive-soft-foreground)]' : 'bg-muted-foreground/50',
                        )}
                        style={{ width: `${Math.max(2, (tool.p95 / slowest) * 100)}%` }}
                      />
                    </div>
                    {tool.meta && (
                      <span className="text-muted-foreground/60 text-[11px]">{tool.meta}</span>
                    )}
                  </div>

                  <span className="text-muted-foreground w-16 shrink-0 text-end font-mono text-[11px] tabular-nums">
                    {formatDuration(tool.p50)}
                  </span>
                  <span className="w-16 shrink-0 text-end font-mono text-[11px] tabular-nums">
                    {formatDuration(tool.p95)}
                  </span>
                  <span className="text-muted-foreground hidden w-16 shrink-0 text-end font-mono text-[11px] tabular-nums sm:block">
                    {tool.calls.toLocaleString()}
                  </span>
                  <span
                    className={cn(
                      'w-14 shrink-0 text-end font-mono text-[11px] tabular-nums',
                      bad ? 'text-[var(--destructive-soft-foreground)]' : 'text-muted-foreground/60',
                    )}
                  >
                    {tool.errorRate === undefined ? '—' : `${(tool.errorRate * 100).toFixed(1)}%`}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

export { ToolLatency }
export type { ToolLatencyProps }
