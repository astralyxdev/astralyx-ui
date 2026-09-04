import type { ComponentProps, ReactNode } from 'react'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * What is actually in the context right now, and how much room is left.
 *
 * `TokenUsage` answers "what did this cost". This answers "what is in there and
 * what is about to be evicted", which is a different question and the one you
 * ask while building.
 *
 * **Segments are drawn to scale against the window, not against the total
 * used.** A bar normalised to what is used always looks full, which is exactly
 * backwards — the free space is the information. At 12% utilisation this
 * renders as mostly empty, because it is.
 *
 * Segments below a pixel still get a sliver, for the same reason a trace span
 * does: "the system prompt is small" and "there is no system prompt" must not
 * look identical.
 *
 * `reserved` is drawn as its own hatched region rather than as free space. The
 * room set aside for the reply is not available, and a bar that shows it as
 * headroom is lying about how much you can add.
 */
export type ContextSegment = {
  id: string
  label: ReactNode
  tokens: number
  /** Any CSS colour. Defaults walk the data palette. */
  color?: string
}

const DEFAULT_COLORS = [
  'var(--violet-soft-foreground)',
  'var(--blue-soft-foreground)',
  'var(--cyan-soft-foreground)',
  'var(--amber-soft-foreground)',
  'var(--green-soft-foreground)',
]

type ContextWindowProps = Omit<ComponentProps<'div'>, 'children'> & {
  segments: ContextSegment[]
  /** The model's full context window, in tokens. */
  limit: number
  /** Held back for the reply. Drawn as unavailable, not as free. */
  reserved?: number
  /** Warn once used + reserved passes this fraction of the limit. */
  warnAt?: number
  formatTokens?: (tokens: number) => string
  freeLabel?: string
  reservedLabel?: string
  /** Caption. Receives used, limit and the free remainder. */
  summary?: (used: number, limit: number, free: number) => ReactNode
  label?: string
}

function defaultTokens(tokens: number) {
  if (tokens < 1000) return String(tokens)
  return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`
}

function ContextWindow({
  segments,
  limit,
  reserved = 0,
  warnAt = 0.9,
  formatTokens = defaultTokens,
  freeLabel = 'Free',
  reservedLabel = 'Reserved for the reply',
  summary,
  label = 'Context window',
  className,
  ...props
}: ContextWindowProps) {
  const used = segments.reduce((total, segment) => total + segment.tokens, 0)
  const free = Math.max(0, limit - used - reserved)
  const pressure = (used + reserved) / limit
  const tight = pressure >= warnAt

  return (
    <div
      data-slot="context-window"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn(
            'font-mono text-xs tabular-nums',
            tight ? 'text-[var(--destructive-soft-foreground)]' : 'text-muted-foreground',
          )}
        >
          {formatTokens(used)} / {formatTokens(limit)}
          <span className="text-muted-foreground/60"> · {Math.round(pressure * 100)}%</span>
        </p>
      </div>

      {/* Scaled to the window, so free space reads as free space. */}
      <div
        className="bg-muted flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`${formatTokens(used)} of ${formatTokens(limit)} tokens used`}
      >
        {segments.map((segment, index) => (
          <span
            key={segment.id}
            className="h-full"
            style={{
              width: `${(segment.tokens / limit) * 100}%`,
              minWidth: segment.tokens > 0 ? 2 : 0,
              background: segment.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            }}
          />
        ))}
        {reserved > 0 && (
          <span
            className="h-full opacity-60"
            style={{
              width: `${(reserved / limit) * 100}%`,
              // Hatched, so it never reads as another content segment.
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--muted-foreground) 0 2px, transparent 2px 5px)',
            }}
          />
        )}
      </div>

      <ul className="flex list-none flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((segment, index) => (
          <li key={segment.id} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: segment.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
            />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="tabular-nums">{formatTokens(segment.tokens)}</span>
          </li>
        ))}
        {reserved > 0 && (
          <li className="text-muted-foreground/70 flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, var(--muted-foreground) 0 2px, transparent 2px 4px)',
              }}
            />
            {reservedLabel}
            <span className="tabular-nums">{formatTokens(reserved)}</span>
          </li>
        )}
        <li className="text-muted-foreground/60 flex items-center gap-1.5 text-xs">
          {freeLabel}
          <span className="tabular-nums">{formatTokens(free)}</span>
        </li>
      </ul>

      {summary && <p className="text-muted-foreground text-xs">{summary(used, limit, free)}</p>}
    </div>
  )
}

export { ContextWindow }
export type { ContextWindowProps }
