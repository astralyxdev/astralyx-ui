import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { Portal } from '@/components/primitives/portal'
import { useFocusTrap } from '@/components/primitives/focus-trap'
import { usePopper, type Side } from '@/components/primitives/popper'
import { Button } from '@/components/ui/button'
import { menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Guided coach marks over the real interface.
 *
 * Each step points at a selector rather than at a ref, so a tour can be defined
 * as data next to the copy it belongs to instead of being threaded through
 * every component it visits.
 *
 * A step whose target is missing is skipped rather than shown floating in the
 * middle of the page. Targets disappear all the time — a feature behind a flag,
 * a panel that is closed — and a tour that stops dead on the first absent one
 * is worse than a shorter tour.
 *
 * The spotlight is a ring around the target drawn with a huge outline: one
 * element, no four-panel overlay to keep in sync, and the target stays fully
 * interactive because nothing covers it.
 */
export type TourStep = {
  /** CSS selector for the element to point at. */
  target: string
  title: ReactNode
  content: ReactNode
  side?: Side
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_STEP_LABEL: (index: number, total: number) => string = (index, total) => `Step ${index} of ${total}`

function Tour({
  steps,
  open,
  onOpenChange,
  onFinish,
  backLabel = 'Back',
  endLabel = 'End tour',
  stepLabel = DEFAULT_STEP_LABEL,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'content'> & {
  steps: TourStep[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onFinish?: () => void
  backLabel?: ReactNode
  /** Accessible name for the dismiss button. */
  endLabel?: string
  /** Accessible name for the progress dots. */
  stepLabel?: (index: number, total: number) => string
}) {
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const anchorRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const step = steps[index]

  const { style } = usePopper({
    open: open && Boolean(target),
    anchorRef,
    floatingRef: panelRef,
    side: step?.side ?? 'bottom',
    align: 'center',
    offset: 12,
  })

  useFocusTrap(panelRef, open && Boolean(target))

  // Resolve the target, skipping steps whose element is not on the page.
  useEffect(() => {
    if (!open) return

    let cursor = index
    let node: HTMLElement | null = null

    while (cursor < steps.length) {
      node = document.querySelector<HTMLElement>(steps[cursor].target)
      if (node) break
      cursor++
    }

    if (!node) {
      onOpenChange(false)
      onFinish?.()
      return
    }

    if (cursor !== index) setIndex(cursor)
    anchorRef.current = node
    setTarget(node)
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [open, index, steps, onOpenChange, onFinish])

  useEffect(() => {
    if (!open) setIndex(0)
  }, [open])

  if (!open || !step || !target) return null

  const last = index === steps.length - 1
  const rect = target.getBoundingClientRect()

  function finish() {
    onOpenChange(false)
    onFinish?.()
  }

  return (
    <Portal>
      {/* Spotlight: an outline large enough to cover the viewport dims
          everything except the target, in one element. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          outline: '9999px solid color-mix(in oklab, black, transparent 40%)',
          borderRadius: 12,
          pointerEvents: 'none',
          zIndex: 60,
        }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label={stepLabel(index + 1, steps.length)}
        style={{ ...style, zIndex: 61 }}
        className={cn(menuSurface, radius.surface, 'w-72 p-4 outline-none', className)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') finish()
        }}
        {...props}
      >
        <div className="mb-2 flex items-start gap-2">
          <h2 className="min-w-0 flex-1 text-sm font-semibold">{step.title}</h2>
          <Button variant="ghost" size="icon-xs" aria-label={endLabel} onClick={finish}>
            <X />
          </Button>
        </div>

        <div className="text-muted-foreground mb-4 text-sm">{step.content}</div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
            {index + 1} / {steps.length}
          </span>

          <div className="ms-auto flex gap-2">
            {index > 0 && (
              <Button variant="secondary" size="xs" onClick={() => setIndex(index - 1)}>
                {backLabel}
              </Button>
            )}
            <Button size="xs" onClick={() => (last ? finish() : setIndex(index + 1))}>
              {last ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export { Tour }
