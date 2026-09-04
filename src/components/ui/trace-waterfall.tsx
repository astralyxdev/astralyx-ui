import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An agent run as a waterfall of spans.
 *
 * The question a trace has to answer is "where did the time go", and a list of
 * steps cannot answer it — steps tell you the order, a waterfall tells you the
 * shape. Two tool calls that ran in parallel look identical to two that ran in
 * sequence until you put them on a shared time axis.
 *
 * **Bars are positioned against the root's window, not each row's own.** Every
 * span is offset by `start` and sized by `duration` as fractions of the whole
 * run, which is what makes overlap visible. Scaling each row to its own width —
 * the easy version — draws every span as a full bar and hides exactly the
 * concurrency you opened the trace to see.
 *
 * A span that is a rounding error still gets a visible sliver: `minWidth` keeps
 * a 2ms call from vanishing, because "it ran and was instant" and "it never ran"
 * must not look the same.
 *
 * Children collapse. A run with forty retrieval spans under one node is
 * unreadable open, and the parent's own bar already says how long the subtree
 * took.
 */
export type TraceSpan = {
  id: string
  name: string
  /** Milliseconds from the start of the run. */
  start: number
  /** Milliseconds. */
  duration: number
  /** Drives the bar colour. Unknown kinds fall back to neutral. */
  kind?: 'model' | 'tool' | 'retrieval' | 'guard' | string
  /** Draws the bar as failed, whatever its kind. */
  error?: boolean
  /** Trailing detail — tokens, cost, a status code. */
  meta?: ReactNode
  children?: TraceSpan[]
}

const KIND_BAR: Record<string, string> = {
  model: 'bg-[var(--violet-soft-foreground)]',
  tool: 'bg-[var(--amber-soft-foreground)]',
  retrieval: 'bg-[var(--blue-soft-foreground)]',
  guard: 'bg-[var(--cyan-soft-foreground)]',
}

type TraceWaterfallProps = Omit<ComponentProps<'div'>, 'children'> & {
  spans: TraceSpan[]
  /** Total run length. Defaults to the furthest span end. */
  total?: number
  /** Levels open on first render. */
  defaultDepth?: number
  /** Formats a duration. Defaults to ms under a second, then seconds. */
  formatDuration?: (ms: number) => string
  /** Width of the name column. */
  nameWidth?: number | string
  emptyLabel?: string
  /** Accessible name for the whole trace. */
  label?: string
}

function defaultFormat(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
}

/** The furthest point any span reaches, including nested ones. */
function endOf(spans: TraceSpan[]): number {
  return spans.reduce((furthest, span) => {
    const own = span.start + span.duration
    const nested = span.children ? endOf(span.children) : 0
    return Math.max(furthest, own, nested)
  }, 0)
}

function SpanRow({
  span,
  total,
  depth,
  openDepth,
  format,
  nameWidth,
}: {
  span: TraceSpan
  total: number
  depth: number
  openDepth: number
  format: (ms: number) => string
  nameWidth: number | string
}) {
  const [open, setOpen] = useState(depth < openDepth)
  const hasChildren = Boolean(span.children?.length)

  const left = total > 0 ? (span.start / total) * 100 : 0
  const width = total > 0 ? (span.duration / total) * 100 : 0

  return (
    <>
      <li className="hover:bg-accent/40 flex items-center gap-3 px-3 py-1.5">
        <div
          className="flex min-w-0 shrink-0 items-center gap-1.5"
          style={{ width: nameWidth, paddingInlineStart: depth * 14 }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${span.name}`}
              onClick={() => setOpen((current) => !current)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronRight
                className={cn(
                  'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
                  open && 'rotate-90',
                )}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate font-mono text-xs">{span.name}</span>
        </div>

        <div className="bg-muted/60 relative h-4 min-w-0 flex-1 overflow-hidden rounded-sm">
          <div
            className={cn(
              'absolute inset-y-0 rounded-sm',
              span.error
                ? 'bg-[var(--destructive-soft-foreground)]'
                : (KIND_BAR[span.kind ?? ''] ?? 'bg-muted-foreground/60'),
            )}
            style={{
              insetInlineStart: `${left}%`,
              width: `${width}%`,
              // A span too short to draw still has to be visible: "instant" and
              // "never happened" must not render identically.
              minWidth: 2,
            }}
          />
        </div>

        <span className="text-muted-foreground w-16 shrink-0 text-end font-mono text-[11px] tabular-nums">
          {format(span.duration)}
        </span>

        {span.meta && (
          <span className="text-muted-foreground/70 hidden w-28 shrink-0 truncate text-end text-[11px] sm:block">
            {span.meta}
          </span>
        )}
      </li>

      {hasChildren &&
        open &&
        span.children!.map((child) => (
          <SpanRow
            key={child.id}
            span={child}
            total={total}
            depth={depth + 1}
            openDepth={openDepth}
            format={format}
            nameWidth={nameWidth}
          />
        ))}
    </>
  )
}

function TraceWaterfall({
  spans,
  total,
  defaultDepth = 2,
  formatDuration = defaultFormat,
  nameWidth = 200,
  emptyLabel = 'No spans recorded.',
  label = 'Run trace',
  className,
  ...props
}: TraceWaterfallProps) {
  const window = total ?? endOf(spans)

  return (
    <div
      data-slot="trace-waterfall"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {spans.length === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <>
          <div className="border-border text-muted-foreground/70 flex items-center gap-3 border-b px-3 py-2 text-[11px] tracking-wide uppercase">
            <span className="shrink-0" style={{ width: nameWidth }}>
              Span
            </span>
            <span className="min-w-0 flex-1">Timeline</span>
            <span className="w-16 shrink-0 text-end">{formatDuration(window)}</span>
          </div>

          <ul aria-label={label} className="divide-border/60 list-none divide-y">
            {spans.map((span) => (
              <SpanRow
                key={span.id}
                span={span}
                total={window}
                depth={0}
                openDepth={defaultDepth}
                format={formatDuration}
                nameWidth={nameWidth}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export { TraceWaterfall, endOf as traceEnd }
export type { TraceWaterfallProps }
