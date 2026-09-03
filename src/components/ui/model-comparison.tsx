import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface, type Responsive } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two or more model outputs side by side, with a pick.
 *
 * Columns are equal width and equal height regardless of content, so neither
 * answer is visually favoured — a taller box reads as the more substantial one
 * before a word of it is read, which is exactly the bias a comparison is
 * supposed to avoid. Metadata sits in a footer for the same reason: latency and
 * cost are compared after the answers, not before them.
 *
 * Stacks below the breakpoint, where two columns would be too narrow to read.
 */
export type ModelOutput = {
  id: string
  model: string
  output: ReactNode
  /** Seconds. */
  latency?: number
  tokens?: number
  cost?: number
  badge?: ReactNode
}

const RESPONSIVE_ROW = {
  sm: 'grid-cols-1 sm:grid-cols-2',
  md: 'grid-cols-1 md:grid-cols-2',
  lg: 'grid-cols-1 lg:grid-cols-2',
} as const

function ModelComparison({
  outputs,
  selected: selectedProp,
  onSelect,
  responsive = 'md',
  pickedLabel = 'Picked',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  outputs: ModelOutput[]
  selected?: string
  onSelect?: (id: string) => void
  responsive?: Responsive
  /** Badge on the chosen model. */
  pickedLabel?: ReactNode
}) {
  const controlled = selectedProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<string | undefined>()
  const selected = controlled ? selectedProp : uncontrolled

  function pick(id: string) {
    if (!controlled) setUncontrolled(id)
    onSelect?.(id)
  }

  return (
    <div
      data-slot="model-comparison"
      className={cn(
        'grid gap-3',
        responsive === false ? 'grid-cols-2' : RESPONSIVE_ROW[responsive],
        className,
      )}
      {...props}
    >
      {outputs.map((entry) => {
        const isSelected = selected === entry.id

        return (
          <article
            key={entry.id}
            data-selected={isSelected || undefined}
            className={cn(
              surface,
              radius.surface,
              'flex min-w-0 flex-col transition-colors duration-150 ease-out motion-reduce:transition-none',
              isSelected && 'border-primary',
            )}
          >
            <header className="border-border flex items-center gap-2 border-b p-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {entry.model}
              </span>
              {entry.badge}
              {isSelected && (
                <Badge size="sm" color="green">
                  <Check />
                  {pickedLabel}
                </Badge>
              )}
            </header>

            <div className="text-muted-foreground flex-1 p-3 text-sm">
              {entry.output}
            </div>

            <footer className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 border-t p-2">
              <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs tabular-nums">
                {entry.latency !== undefined && (
                  <span>
                    <Fmt type="duration" value={entry.latency} />
                  </span>
                )}
                {entry.tokens !== undefined && (
                  <span>
                    <Fmt type="number" value={entry.tokens} /> tokens
                  </span>
                )}
                {entry.cost !== undefined && (
                  <span>
                    <Fmt type="currency" value={entry.cost} currency="USD" decimals={4} />
                  </span>
                )}
              </span>

              {onSelect !== undefined || !controlled ? (
                <Button
                  size="xs"
                  variant={isSelected ? 'default' : 'secondary'}
                  className="ms-auto"
                  onClick={() => pick(entry.id)}
                >
                  {isSelected ? 'Picked' : 'Pick this'}
                </Button>
              ) : null}
            </footer>
          </article>
        )
      })}
    </div>
  )
}

export { ModelComparison }
