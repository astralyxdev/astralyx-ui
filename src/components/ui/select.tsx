import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper, type Side } from '@/components/primitives/popper'
import {
  fieldBase,
  fieldSize,
  menuItem,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * A custom dropdown, not a native `<select>`: the trigger matches Input exactly,
 * and the panel is real markup that can nest.
 *
 * An option with `children` becomes a submenu, and those nest without limit.
 * Each level owns its own open state and highlight rather than flattening into
 * one index — a flat model cannot express "the third item of the second
 * submenu is focused while its parent row stays highlighted".
 */
export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
  /** Present makes this a submenu rather than a selectable value. */
  children?: SelectOption[]
}

/** Submenus prefer the right, then the left, then above. */
const SUBMENU_SIDES: Side[] = ['left', 'top']

const triggerVariants = cva([fieldBase, 'justify-between text-start'].join(' '), {
  variants: {
    variant: {
      default: 'border-border bg-background border',
      secondary: 'bg-secondary border border-transparent',
      ghost: 'hover:bg-accent border border-transparent bg-transparent',
    },
    size: {
      xs: fieldSize.xs,
      sm: fieldSize.sm,
      default: fieldSize.md,
      lg: fieldSize.lg,
      xl: fieldSize.xl,
    },
    error: {
      true: 'border-destructive focus-within:border-destructive',
      false: '',
    },
  },
  defaultVariants: { variant: 'default', size: 'default', error: false },
})

/** Depth-first walk, so a nested value can be labelled in the trigger. */
function findOption(
  options: SelectOption[],
  value: string | undefined,
): SelectOption | undefined {
  if (value === undefined) return undefined
  for (const option of options) {
    if (option.value === value && !option.children) return option
    if (option.children) {
      const found = findOption(option.children, value)
      if (found) return found
    }
  }
  return undefined
}

type SelectProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> &
  VariantProps<typeof triggerVariants> & {
    options: SelectOption[]
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    disabled?: boolean
    icon?: ReactNode
    triggerClassName?: string
    /**
     * Accessible name for the trigger.
     *
     * The trigger is a `role="combobox"` button, so it needs a name. A visible
     * `<Label>` pointing at it is the better answer when there is room for one;
     * this is for the cases where there is not — a filter bar, a row in a query
     * builder — where the alternative is an unnamed control.
     */
    triggerLabel?: string
    /** Shown when `options` is empty. */
    emptyMessage?: ReactNode
  }

function Select({
  emptyMessage = 'No options',
  className,
  triggerClassName,
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  disabled = false,
  variant,
  size,
  error,
  icon,
  triggerLabel,
  ...props
}: SelectProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { style } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side: 'bottom',
    align: 'start',
    offset: 4,
    matchAnchorWidth: true,
  })

  useDismissable({
    open,
    onDismiss: () => {
      setOpen(false)
      triggerRef.current?.focus()
    },
    refs: [triggerRef, panelRef],
  })

  const selected = findOption(options, value)

  function choose(next: string) {
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div data-slot="select" className={cn('relative w-full', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={triggerLabel}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          triggerVariants({ variant, size, error }),
          'disabled:pointer-events-none disabled:opacity-50',
          triggerClassName,
        )}
      >
        {icon}
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            !selected && 'text-muted-foreground/70',
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <OptionList
          emptyMessage={emptyMessage}
          ref={panelRef}
          options={options}
          value={value}
          onChoose={choose}
          onClose={() => {
            setOpen(false)
            triggerRef.current?.focus()
          }}
          style={style}
          autoFocus
        />
      )}
    </div>
  )
}

/**
 * One level of the menu. Renders its own submenu, recursively.
 *
 * The open submenu is tracked by value rather than index so it survives the
 * list changing underneath it.
 */
function OptionList({
  ref,
  options,
  value,
  onChoose,
  onClose,
  style,
  autoFocus = false,
  labelledBy,
  emptyMessage,
}: {
  ref?: React.Ref<HTMLDivElement>
  options: SelectOption[]
  value: string | undefined
  onChoose: (value: string) => void
  onClose: () => void
  style?: React.CSSProperties
  autoFocus?: boolean
  labelledBy?: string
  emptyMessage?: ReactNode
}) {
  const [highlighted, setHighlighted] = useState(0)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  // Type-ahead is per level: typing "s" inside a submenu should search that
  // submenu, not the root list.
  const search = useRef({ query: '', at: 0 })

  useEffect(() => {
    if (!autoFocus) return
    // Cancelled on unmount: an uncancelled frame fires against a torn-down
    // ref, and a re-render while one is pending stacks a second.
    const frame = requestAnimationFrame(() => listRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [autoFocus])

  useEffect(() => {
    rowRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const step = (from: number, delta: number) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + delta * i + options.length * i) % options.length
      if (!options[next]?.disabled) return next
    }
    return from
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const option = options[highlighted]

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlighted(step(highlighted, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlighted(step(highlighted, -1))
        break
      case 'ArrowRight':
        if (option?.children) {
          event.preventDefault()
          event.stopPropagation()
          setOpenSub(option.value)
        }
        break
      case 'ArrowLeft':
        event.preventDefault()
        // Closing this level returns focus to the row that opened it.
        onClose()
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (!option || option.disabled) break
        if (option.children) setOpenSub(option.value)
        else onChoose(option.value)
        break
      case 'Escape':
        event.preventDefault()
        onClose()
        break
      default: {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey) break
        const now = Date.now()
        const state = search.current
        // A pause resets the buffer, so "ba" finds Banana but a later "b"
        // starts again rather than searching for "bab".
        state.query = now - state.at > 600 ? event.key : state.query + event.key
        state.at = now

        const match = options.findIndex(
          (o) =>
            !o.disabled &&
            o.label.toLowerCase().startsWith(state.query.toLowerCase()),
        )
        if (match !== -1) {
          event.preventDefault()
          setHighlighted(match)
        }
      }
    }
  }

  return (
    <div
      ref={(node) => {
        listRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node
      }}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      style={style}
      className={cn(menuSurface, radius.surface, 'max-h-60 min-w-44 outline-none')}
    >
      {options.map((option, index) => (
        <OptionRow
          key={option.value}
          ref={(node) => {
            rowRefs.current[index] = node
          }}
          option={option}
          selected={option.value === value}
          highlighted={index === highlighted}
          subOpen={openSub === option.value}
          onHighlight={() => {
            setHighlighted(index)
            // Hovering a leaf closes any open submenu, which is what makes a
            // cascading menu feel like one surface rather than several.
            setOpenSub(option.children ? option.value : null)
          }}
          onActivate={() =>
            option.children ? setOpenSub(option.value) : onChoose(option.value)
          }
          onCloseSub={() => {
            setOpenSub(null)
            listRef.current?.focus()
          }}
          value={value}
          onChoose={onChoose}
        />
      ))}

      {options.length === 0 && (
        <div className="text-muted-foreground px-2.5 py-1.5 text-sm">
          {emptyMessage}
        </div>
      )}
    </div>
  )
}

function OptionRow({
  ref,
  option,
  selected,
  highlighted,
  subOpen,
  onHighlight,
  onActivate,
  onCloseSub,
  value,
  onChoose,
}: {
  ref?: React.Ref<HTMLDivElement>
  option: SelectOption
  selected: boolean
  highlighted: boolean
  subOpen: boolean
  onHighlight: () => void
  onActivate: () => void
  onCloseSub: () => void
  value: string | undefined
  onChoose: (value: string) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)

  const { style } = usePopper({
    open: subOpen,
    anchorRef: rowRef,
    floatingRef: subRef,
    side: 'right',
    align: 'start',
    offset: 2,
    fallbackSides: SUBMENU_SIDES,
  })

  return (
    <>
      <div
        ref={(node) => {
          rowRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node
        }}
        role="option"
        aria-selected={selected}
        aria-haspopup={option.children ? 'listbox' : undefined}
        aria-expanded={option.children ? subOpen : undefined}
        data-highlighted={highlighted}
        data-disabled={option.disabled}
        onPointerEnter={() => !option.disabled && onHighlight()}
        onClick={() => !option.disabled && onActivate()}
        className={cn(menuItem, radius.control)}
      >
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {option.children ? (
          <ChevronRight className="size-3.5 shrink-0" />
        ) : (
          selected && <Check className="size-3.5 shrink-0" />
        )}
      </div>

      {option.children && subOpen && (
        <OptionList
          ref={subRef}
          options={option.children}
          value={value}
          onChoose={onChoose}
          onClose={onCloseSub}
          style={style}
          autoFocus
        />
      )}
    </>
  )
}

export { Select, triggerVariants as selectVariants }
export type { SelectProps }
