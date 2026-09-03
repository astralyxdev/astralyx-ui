import {
  createContext,
  use,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { useCollapsibleHeight } from '@/components/primitives/collapsible'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A stack of collapsible sections.
 *
 * `type="single"` closes the previous section when another opens; `"multiple"`
 * lets any number stand open. Each header is a real `<button>` inside a heading,
 * which is what makes the set navigable by heading in a screen reader.
 */
type AccordionContextValue = {
  open: string[]
  toggle: (value: string) => void
  collapsible: boolean
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

const ItemContext = createContext<{
  value: string
  open: boolean
  ids: { trigger: string; content: string }
} | null>(null)

function useAccordion() {
  const context = use(AccordionContext)
  if (!context) throw new Error('Must be used inside <Accordion>')
  return context
}

function useItem() {
  const context = use(ItemContext)
  if (!context) throw new Error('Must be used inside <AccordionItem>')
  return context
}

type AccordionProps = Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  type?: 'single' | 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** With `type="single"`, allow closing the open section. */
  collapsible?: boolean
}

function Accordion({
  className,
  type = 'single',
  value: valueProp,
  defaultValue = [],
  onValueChange,
  collapsible = true,
  ...props
}: AccordionProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const open = controlled ? valueProp : uncontrolled

  const context = useMemo<AccordionContextValue>(
    () => ({
      open,
      collapsible,
      toggle: (item) => {
        const isOpen = open.includes(item)
        const next =
          type === 'single'
            ? isOpen
              ? collapsible
                ? []
                : open
              : [item]
            : isOpen
              ? open.filter((v) => v !== item)
              : [...open, item]

        if (!controlled) setUncontrolled(next)
        onValueChange?.(next)
      },
    }),
    [open, type, collapsible, controlled, onValueChange],
  )

  return (
    <AccordionContext value={context}>
      <div
        data-slot="accordion"
        className={cn('border-border divide-border divide-y border-y', className)}
        {...props}
      />
    </AccordionContext>
  )
}

function AccordionItem({
  className,
  value,
  ...props
}: ComponentProps<'div'> & { value: string }) {
  const { open } = useAccordion()
  const id = useId()

  const context = useMemo(
    () => ({
      value,
      open: open.includes(value),
      ids: { trigger: `${id}-trigger`, content: `${id}-content` },
    }),
    [value, open, id],
  )

  return (
    <ItemContext value={context}>
      <div
        data-slot="accordion-item"
        data-state={context.open ? 'open' : 'closed'}
        className={className}
        {...props}
      />
    </ItemContext>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<'button'>) {
  const { toggle } = useAccordion()
  const { value, open, ids } = useItem()

  return (
    // The heading wrapper is what lets screen-reader users jump between
    // sections by heading rather than tabbing through every trigger.
    <h3 className="flex">
      <button
        type="button"
        id={ids.trigger}
        data-slot="accordion-trigger"
        aria-expanded={open}
        aria-controls={ids.content}
        onClick={() => toggle(value)}
        className={cn(
          'flex flex-1 cursor-pointer items-center justify-between gap-4 py-4 text-start text-sm font-medium',
          'hover:text-muted-foreground transition-colors duration-150 ease-out motion-reduce:transition-none',
          focusRing,
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
    </h3>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  const { open, ids } = useItem()
  const innerRef = useRef<HTMLDivElement>(null)
  const height = useCollapsibleHeight(innerRef, open)

  return (
    <div
      id={ids.content}
      role="region"
      aria-labelledby={ids.trigger}
      data-slot="accordion-content"
      style={{ height }}
      className={cn(
        'overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <div ref={innerRef} className="text-muted-foreground pb-4 text-sm">
        {children}
      </div>
    </div>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
