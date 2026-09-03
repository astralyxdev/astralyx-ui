import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import {
  fieldBase,
  fieldInput,
  fieldSize,
  menuItem,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/** The same three treatments Input and Select offer. */
const FIELD_VARIANT = {
  default: 'border-border bg-background border',
  secondary: 'bg-secondary border border-transparent',
  ghost: 'hover:bg-accent border border-transparent bg-transparent',
} as const

export type ComboboxOption = {
  value: string
  label: string
  disabled?: boolean
}

/**
 * A Select you can type into.
 *
 * The trigger is a button until it opens; the search box lives inside the panel
 * rather than replacing the trigger, so the chosen value stays visible while you
 * filter. Highlight is tracked by index and reset on every keystroke, because
 * the list under it changes as you type.
 */
type ComboboxProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  options: ComboboxOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  size?: keyof typeof fieldSize
  /** Matches Input and Select, so a form can be uniform. */
  variant?: 'default' | 'secondary' | 'ghost'
  disabled?: boolean
  error?: boolean
}

function Combobox({
  className,
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results',
  size = 'md',
  variant = 'default',
  disabled = false,
  error = false,
  ...props
}: ComboboxProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    )
  }, [options, query])

  const { style } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side: 'bottom',
    align: 'start',
    matchAnchorWidth: true,
  })

  useDismissable({
    open,
    onDismiss: () => setOpen(false),
    refs: [triggerRef, panelRef],
  })

  // Clearing the search belongs to the open/closed transition, not to a render
  // pass — adjusting during render is React's documented way to say that
  // without an extra effect and the throwaway render it causes.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      setQuery('')
      setHighlighted(0)
    }
  }

  // Focus is a real DOM side effect, so it stays in one.
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const selected = options.find((option) => option.value === value)

  function choose(next: string) {
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div data-slot="combobox" className={cn('relative w-full', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          fieldBase,
          fieldSize[size],
          'justify-between text-start',
          FIELD_VARIANT[variant],
          error && 'border-destructive',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground/70')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={style}
          className={cn(menuSurface, radius.surface, 'p-0')}
        >
          <div className="border-border flex items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              placeholder={searchPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value)
                // The list under the highlight just changed; anchoring to the
                // top is the only index guaranteed to still exist.
                setHighlighted(0)
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setHighlighted((i) => Math.min(i + 1, filtered.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setHighlighted((i) => Math.max(i - 1, 0))
                } else if (event.key === 'Enter') {
                  event.preventDefault()
                  const option = filtered[highlighted]
                  if (option && !option.disabled) choose(option.value)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  setOpen(false)
                  triggerRef.current?.focus()
                }
              }}
              className={cn(fieldInput, 'h-9 text-sm')}
            />
          </div>

          <div role="listbox" className="max-h-56 overflow-auto p-1">
            {filtered.map((option, index) => (
              <div
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                data-highlighted={index === highlighted}
                data-disabled={option.disabled}
                onPointerEnter={() => setHighlighted(index)}
                onClick={() => !option.disabled && choose(option.value)}
                className={cn(menuItem, radius.control)}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value && <Check className="size-3.5 shrink-0" />}
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-muted-foreground px-2.5 py-6 text-center text-sm">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { Combobox }
export type { ComboboxProps }
