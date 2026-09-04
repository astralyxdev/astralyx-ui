import { useState, type ComponentProps, type ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The worked examples in a few-shot prompt, as editable pairs.
 *
 * Few-shot examples are the highest-leverage and least-maintained part of a
 * prompt: they are pasted in as one long string, they drift out of date, and
 * nobody can tell how many there are or how much of the context they occupy.
 *
 * Editing them as **structured pairs** rather than as prose is the whole point —
 * you can count them, reorder them, disable one to test its effect, and see
 * what they cost. A textarea containing six examples supports none of that.
 *
 * Disabled examples are kept, not deleted. "Does this example help?" is the
 * most common question here and it is answered by toggling, not by cutting the
 * text out and pasting it back afterwards.
 *
 * Reordering is by button rather than drag. Order matters to a model — recency
 * inside the prompt carries weight — and two buttons work on a keyboard, on
 * touch, and in a screen reader, which a drag handle does not.
 */
export type FewShotExample = {
  id: string
  input: string
  output: string
  /** Kept in the list but excluded from the prompt. */
  disabled?: boolean
}

type FewShotEditorProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  examples: FewShotExample[]
  onChange: (next: FewShotExample[]) => void
  inputLabel?: string
  outputLabel?: string
  addLabel?: string
  removeLabel?: string
  moveUpLabel?: string
  moveDownLabel?: string
  emptyLabel?: string
  /** Rough size of each example, for the budget readout. */
  estimateTokens?: (example: FewShotExample) => number
  tokensLabel?: (tokens: number) => ReactNode
  rows?: number
}

function FewShotEditor({
  examples,
  onChange,
  inputLabel = 'Input',
  outputLabel = 'Expected output',
  addLabel = 'Add an example',
  removeLabel = 'Remove',
  moveUpLabel = 'Move earlier',
  moveDownLabel = 'Move later',
  emptyLabel = 'No examples yet — the prompt is zero-shot.',
  estimateTokens,
  tokensLabel = (tokens) => `~${tokens.toLocaleString()} tokens`,
  rows = 2,
  className,
  ...props
}: FewShotEditorProps) {
  const [nextId, setNextId] = useState(0)

  const active = examples.filter((example) => !example.disabled)
  const budget = estimateTokens
    ? active.reduce((total, example) => total + estimateTokens(example), 0)
    : undefined

  function patch(id: string, change: Partial<FewShotExample>) {
    onChange(examples.map((example) => (example.id === id ? { ...example, ...change } : example)))
  }

  function move(index: number, by: number) {
    const target = index + by
    if (target < 0 || target >= examples.length) return
    const next = [...examples]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div data-slot="few-shot-editor" className={cn('flex flex-col gap-3', className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {active.length} of {examples.length} in the prompt
          {budget !== undefined && <> · {tokensLabel(budget)}</>}
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setNextId((current) => current + 1)
            onChange([...examples, { id: `example-${Date.now()}-${nextId}`, input: '', output: '' }])
          }}
        >
          <Plus />
          {addLabel}
        </Button>
      </div>

      {examples.length === 0 ? (
        <div className={cn(surface, radius.surface, 'p-4')}>
          <p className="text-muted-foreground text-xs">{emptyLabel}</p>
        </div>
      ) : (
        <ol className="flex list-none flex-col gap-3">
          {examples.map((example, index) => (
            <li
              key={example.id}
              className={cn(
                surface,
                radius.surface,
                'flex gap-3 p-3',
                example.disabled && 'opacity-55',
              )}
            >
              <div className="flex shrink-0 flex-col items-center gap-1">
                <GripVertical className="text-muted-foreground/30 size-3.5" aria-hidden="true" />
                <span className="text-muted-foreground/50 font-mono text-[11px] tabular-nums">
                  {index + 1}
                </span>
              </div>

              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground/70 text-[11px] tracking-wide uppercase">
                    {inputLabel}
                  </span>
                  <Textarea
                    rows={rows}
                    value={example.input}
                    onChange={(event) => patch(example.id, { input: event.target.value })}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground/70 text-[11px] tracking-wide uppercase">
                    {outputLabel}
                  </span>
                  <Textarea
                    rows={rows}
                    value={example.output}
                    onChange={(event) => patch(example.id, { output: event.target.value })}
                  />
                </label>
              </div>

              <div className="flex shrink-0 flex-col gap-0.5">
                {/* Buttons, not a drag handle: order carries weight with a
                    model, and this works on a keyboard and by touch. */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${moveUpLabel}: ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${moveDownLabel}: ${index + 1}`}
                  disabled={index === examples.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${removeLabel}: ${index + 1}`}
                  onClick={() => onChange(examples.filter((item) => item.id !== example.id))}
                >
                  <Trash2 />
                </Button>
                <button
                  type="button"
                  onClick={() => patch(example.id, { disabled: !example.disabled })}
                  className="mt-1"
                >
                  <Badge size="sm" variant={example.disabled ? 'outline' : 'secondary'}>
                    {example.disabled ? 'off' : 'on'}
                  </Badge>
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export { FewShotEditor }
export type { FewShotEditorProps }
