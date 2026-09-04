import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Text broken into tokens, so a prompt's cost stops being a mystery number.
 *
 * The thing this makes visible: tokenisation is not words. `astralyx` is three
 * tokens, a run of emoji can be one each, and indentation in a code block is
 * often billed per level. People shorten prose to save tokens while a JSON
 * blob three lines down costs ten times more.
 *
 * **It does not tokenise.** Real tokenisation needs the model's own vocabulary,
 * which is a multi-megabyte table this kit is not going to embed — and a
 * component that shipped an approximation would produce numbers people quote in
 * budgets. `tokens` is a required prop: hand it the output of the tokeniser you
 * already have, and this renders it.
 *
 * Alternating tints rather than gaps, so the boundaries are visible without the
 * text reflowing into something that no longer reads like the prompt.
 */
export type InspectedToken = {
  /** The token's text as it appears in the source. */
  text: string
  /** Vocabulary id, when your tokeniser reports it. */
  id?: number
}

type TokenInspectorProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Already tokenised. This component renders; it does not tokenise. */
  tokens: InspectedToken[]
  /** Cost per thousand tokens, in whatever unit you pass to `formatCost`. */
  pricePerThousand?: number
  formatCost?: (cost: number) => ReactNode
  /** Show vocabulary ids under each token. */
  showIds?: boolean
  /** Highlight tokens past this index — for showing what a limit truncates. */
  limit?: number
  limitLabel?: string
  label?: string
  emptyLabel?: string
}

const TINTS = ['bg-[var(--blue-soft)]', 'bg-[var(--violet-soft)]']

function TokenInspector({
  tokens,
  pricePerThousand,
  formatCost = (cost) => `$${cost.toFixed(4)}`,
  showIds = false,
  limit,
  limitLabel = 'past the limit',
  label = 'Tokens',
  emptyLabel = 'Nothing to inspect.',
  className,
  ...props
}: TokenInspectorProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const overflowing = useMemo(
    () => (limit === undefined ? 0 : Math.max(0, tokens.length - limit)),
    [limit, tokens.length],
  )

  return (
    <div
      data-slot="token-inspector"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {overflowing > 0 && (
            <Badge size="sm" color="destructive">
              {overflowing} {limitLabel}
            </Badge>
          )}
          <span className="font-mono text-xs tabular-nums">
            {tokens.length.toLocaleString()}
            {pricePerThousand !== undefined && (
              <span className="text-muted-foreground">
                {' · '}
                {formatCost((tokens.length / 1000) * pricePerThousand)}
              </span>
            )}
          </span>
        </div>
      </div>

      {tokens.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      ) : (
        <p className="font-mono text-xs leading-7 break-all">
          {tokens.map((token, index) => {
            const past = limit !== undefined && index >= limit
            return (
              <span
                key={index}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                title={token.id === undefined ? undefined : `id ${token.id}`}
                className={cn(
                  'rounded-[3px] py-0.5',
                  // Alternating tint, not a gap: the text has to keep reading
                  // like the prompt it came from.
                  past
                    ? 'bg-[var(--destructive-soft)] text-[var(--destructive-soft-foreground)]'
                    : TINTS[index % 2],
                  hovered === index && 'ring-ring/50 ring-2',
                )}
              >
                {/* Whitespace is a token too, and an invisible one reads as a
                    gap in the sequence — so it gets a visible glyph. */}
                {token.text.replace(/ /g, '·').replace(/\n/g, '↵\n')}
                {showIds && token.id !== undefined && (
                  <span className="text-muted-foreground/50 ms-0.5 text-[9px]">{token.id}</span>
                )}
              </span>
            )
          })}
        </p>
      )}
    </div>
  )
}

export { TokenInspector }
export type { TokenInspectorProps }
