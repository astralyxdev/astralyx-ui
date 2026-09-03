import { useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A recovery phrase, blurred until revealed.
 *
 * Deliberately hostile to the convenient thing. There is no copy button and no
 * `select-all`: a seed phrase on the clipboard is readable by every page the
 * user visits afterwards, and clipboard managers persist it to disk. Every
 * wallet that got this wrong has a corresponding class of drainer.
 *
 * Blurred by default with an explicit reveal, because these are read in cafés,
 * on video calls and over shoulders. Revealing is a decision, not the default
 * state.
 *
 * `confirm` mode asks for specific words back — the only way to establish the
 * phrase was actually written down rather than clicked past.
 */
function SeedPhrase({
  words,
  revealed: revealedProp,
  onRevealedChange,
  columns = 3,
  warning,
  confirmIndices,
  onConfirm,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  words: string[]
  revealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
  columns?: 2 | 3 | 4
  warning?: ReactNode
  /** 0-based word positions to ask back. Switches to confirm mode. */
  confirmIndices?: number[]
  onConfirm?: (correct: boolean) => void
}) {
  const controlled = revealedProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(false)
  const revealed = controlled ? revealedProp : uncontrolled

  const [answers, setAnswers] = useState<Record<number, string>>({})

  function setRevealed(next: boolean) {
    if (!controlled) setUncontrolled(next)
    onRevealedChange?.(next)
  }

  const confirming = confirmIndices && confirmIndices.length > 0
  const allCorrect =
    confirming &&
    confirmIndices.every((i) => (answers[i] ?? '').trim().toLowerCase() === words[i]?.toLowerCase())

  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[columns]

  return (
    <div
      data-slot="seed-phrase"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert
          className="mt-0.5 size-4 shrink-0 text-[var(--amber-soft-foreground)]"
          aria-hidden="true"
        />
        <p className="text-muted-foreground min-w-0 flex-1 text-xs">
          {warning ??
            'Write these words down and store them offline. Anyone with this phrase controls the wallet — no support team will ever ask for it.'}
        </p>
      </div>

      {confirming ? (
        <div className="flex flex-col gap-2">
          {confirmIndices.map((index) => (
            <label key={index} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
                Word {index + 1}
              </span>
              <input
                value={answers[index] ?? ''}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [index]: event.target.value }))
                }
                className={cn(
                  'border-border bg-background h-8 min-w-0 flex-1 border px-2.5 font-mono text-sm outline-none',
                  radius.control,
                  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                )}
              />
            </label>
          ))}

          <Button
            className="mt-1"
            disabled={!allCorrect}
            onClick={() => onConfirm?.(Boolean(allCorrect))}
          >
            {allCorrect ? 'Confirm' : 'Enter the words above'}
          </Button>
        </div>
      ) : (
        <>
          <ol
            className={cn('grid list-none gap-2', grid)}
            // No copy affordance and no selection: the clipboard is not a
            // safe place for a recovery phrase.
            style={{ userSelect: revealed ? 'text' : 'none' }}
          >
            {words.map((word, index) => (
              <li
                key={index}
                className={cn(
                  'bg-secondary/60 flex items-baseline gap-2 px-2.5 py-1.5',
                  radius.control,
                )}
              >
                <span className="text-muted-foreground/60 w-5 shrink-0 text-end text-xs tabular-nums">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate font-mono text-sm transition-[filter] duration-150 ease-out motion-reduce:transition-none',
                    !revealed && 'blur-sm',
                  )}
                >
                  {revealed ? word : '••••••'}
                </span>
              </li>
            ))}
          </ol>

          <Button variant="secondary" onClick={() => setRevealed(!revealed)}>
            {revealed ? <EyeOff /> : <Eye />}
            {revealed ? 'Hide phrase' : 'Reveal phrase'}
          </Button>
        </>
      )}
    </div>
  )
}

export { SeedPhrase }
