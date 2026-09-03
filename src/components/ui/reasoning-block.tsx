import { useState, type ComponentProps, type ReactNode } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { Fmt } from '@/components/ui/fmt'
import { Spinner } from '@/components/ui/spinner'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A model's intermediate reasoning, folded away by default.
 *
 * Collapsed by default on purpose: reasoning is supporting evidence, not the
 * answer, and a panel that opens itself pushes the thing the reader asked for
 * below the fold.
 *
 * While streaming it opens itself and shows a spinner, because during that time
 * it is the only thing happening — then collapses once the answer starts. That
 * transition is the whole interaction, so `streaming` is a prop rather than
 * something inferred from children changing.
 */
function ReasoningBlock({
  children,
  streaming = false,
  duration,
  defaultOpen,
  label = 'Reasoning',
  className,
  ...props
}: ComponentProps<'div'> & {
  streaming?: boolean
  /** Seconds spent thinking. Shown once finished. */
  duration?: number
  defaultOpen?: boolean
  label?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? streaming)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div
      data-slot="reasoning-block"
      data-streaming={streaming || undefined}
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'text-muted-foreground hover:text-foreground hover:bg-accent/40 flex w-full items-center gap-2 px-3 py-2',
          interactive,
          focusRing,
        )}
      >
        <Chevron className="size-4 shrink-0" aria-hidden="true" />
        {streaming ? (
          <Spinner size="xs" className="shrink-0" label="Thinking" />
        ) : (
          <Brain className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 truncate text-start text-xs font-medium">
          {streaming ? 'Thinking…' : label}
        </span>
        {!streaming && duration !== undefined && (
          <span className="shrink-0 text-xs tabular-nums">
            <Fmt type="duration" value={duration} />
          </span>
        )}
      </button>

      {open && (
        <div className="border-border text-muted-foreground border-t p-3 text-sm">
          {children}
        </div>
      )}
    </div>
  )
}

export { ReasoningBlock }
