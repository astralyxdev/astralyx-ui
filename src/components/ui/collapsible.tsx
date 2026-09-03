import {
  createContext,
  use,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { useCollapsibleHeight } from '@/components/primitives/collapsible'
import { Slot } from '@/components/primitives/slot'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/** A panel that expands and collapses, driven by its own trigger. */
type CollapsibleContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  ids: { trigger: string; content: string }
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

function useCollapsible() {
  const context = use(CollapsibleContext)
  if (!context) throw new Error('Must be used inside <Collapsible>')
  return context
}

function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const controlled = openProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ? openProp : uncontrolled
  const id = useId()

  const context = useMemo<CollapsibleContextValue>(
    () => ({
      open,
      ids: { trigger: `${id}-trigger`, content: `${id}-content` },
      setOpen: (next) => {
        if (!controlled) setUncontrolled(next)
        onOpenChange?.(next)
      },
    }),
    [open, id, controlled, onOpenChange],
  )

  return (
    <CollapsibleContext value={context}>
      <div
        data-slot="collapsible"
        data-state={open ? 'open' : 'closed'}
        className={className}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext>
  )
}

function CollapsibleTrigger({
  className,
  asChild = false,
  showChevron = true,
  children,
  onClick,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean; showChevron?: boolean }) {
  const { open, setOpen, ids } = useCollapsible()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      type="button"
      id={ids.trigger}
      data-slot="collapsible-trigger"
      aria-expanded={open}
      aria-controls={ids.content}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-2 text-start text-sm font-medium',
        radius.control,
        focusRing,
        className,
      )}
      {...props}
    >
      {children}
      {showChevron && !asChild && (
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      )}
    </Comp>
  )
}

function CollapsibleContent({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  const { open, ids } = useCollapsible()
  const innerRef = useRef<HTMLDivElement>(null)
  const height = useCollapsibleHeight(innerRef, open)

  return (
    <div
      id={ids.content}
      role="region"
      aria-labelledby={ids.trigger}
      data-slot="collapsible-content"
      style={{ height }}
      className={cn(
        'overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      {/* Measured separately, so the animating wrapper never affects the
          natural height being measured. */}
      <div ref={innerRef}>{children}</div>
    </div>
  )
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
