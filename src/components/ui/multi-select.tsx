import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import {
  fieldBase,
  fieldSize,
  focusRing,
  menuItem,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Select several options from a list.
 *
 * The gap `Select` cannot fill: it is a single-value combobox by construction,
 * which is why LogViewer's level filter had to become a threshold instead of a
 * set. This is the set version.
 *
 * The trigger shows chips up to `maxShown` and then a count. Rendering every
 * chip makes the control grow without limit and pushes the rest of the form
 * around as options are picked — the count keeps the height stable.
 *
 * Selecting does not close the panel. Multi-select exists because people pick
 * more than one thing, and closing after each is the single most common
 * complaint about these controls.
 */
export type MultiSelectOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_REMOVE_LABEL: (option: string) => string = (option) => `Remove ${option}`

function MultiSelect({
  options,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  placeholder = 'Select…',
  searchable = true,
  maxShown = 2,
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  searchPlaceholder = 'Filter',
  searchLabel = 'Filter options',
  emptyMessage = 'No options match.',
  clearLabel = 'Clear',
  removeLabel = DEFAULT_REMOVE_LABEL,
  className,
  triggerClassName,
  ...props
}: Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  options: MultiSelectOption[]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  searchable?: boolean
  /** Chips shown before collapsing to a count. */
  maxShown?: number
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  disabled?: boolean
  searchPlaceholder?: string
  /** Accessible name for the filter field. */
  searchLabel?: string
  emptyMessage?: ReactNode
  clearLabel?: ReactNode
  /** Accessible name for a chip's remove button. */
  removeLabel?: (option: string) => string
  triggerClassName?: string
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<string[]>(defaultValue)
  const selected = controlled ? valueProp : uncontrolled

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

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
      setQuery('')
      triggerRef.current?.focus()
    },
    refs: [triggerRef, panelRef],
  })

  const visible = useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [options, query],
  )

  function setSelected(next: string[]) {
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
  }

  function toggle(option: MultiSelectOption) {
    if (option.disabled) return
    setSelected(
      selected.includes(option.value)
        ? selected.filter((v) => v !== option.value)
        : [...selected, option.value],
    )
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((index) => Math.min(index + 1, visible.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' || event.key === ' ') {
      const option = visible[highlighted]
      if (!option) return
      event.preventDefault()
      toggle(option)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  const chosen = options.filter((option) => selected.includes(option.value))
  const shown = chosen.slice(0, maxShown)
  const overflow = chosen.length - shown.length

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'hover:bg-accent border border-transparent bg-transparent',
  }[variant]

  return (
    <div
      data-slot="multi-select"
      className={cn('relative w-full', className)}
      {...props}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setOpen(!open)
          if (!open) requestAnimationFrame(() => searchRef.current?.focus())
        }}
        className={cn(
          fieldBase,
          fieldSize[size],
          VARIANT,
          error && 'border-destructive',
          'justify-between gap-1.5 text-start',
          'disabled:pointer-events-none disabled:opacity-50',
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {chosen.length === 0 && (
            <span className="text-muted-foreground/70 truncate">{placeholder}</span>
          )}

          {shown.map((option) => (
            <span
              key={option.value}
              className={cn(
                'bg-secondary text-secondary-foreground inline-flex h-5 shrink-0 items-center gap-1 ps-2 pe-1 text-xs',
                radius.xs,
              )}
            >
              {option.label}
              <span
                role="button"
                tabIndex={-1}
                aria-label={removeLabel(option.label)}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelected(selected.filter((v) => v !== option.value))
                }}
                className="text-muted-foreground hover:text-foreground flex size-3.5 items-center justify-center rounded-sm"
              >
                <X className="size-2.5" />
              </span>
            </span>
          ))}

          {overflow > 0 && (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              +{overflow} more
            </span>
          )}
        </span>

        <ChevronDown
          className={cn(
            'text-muted-foreground shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={style}
          onKeyDown={onPanelKeyDown}
          className={cn(menuSurface, radius.surface, 'max-h-72 min-w-44 p-0 outline-none')}
        >
          {searchable && (
            <div className="border-border flex items-center gap-2 border-b p-2.5">
              <Search className="text-muted-foreground size-3.5 shrink-0" />
              <input
                ref={searchRef}
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchLabel}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setHighlighted(0)
                }}
                className="placeholder:text-muted-foreground/70 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          )}

          <ul
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 list-none overflow-y-auto p-1"
          >
            {visible.map((option, index) => {
              const isSelected = selected.includes(option.value)
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-highlighted={index === highlighted || undefined}
                    disabled={option.disabled}
                    onPointerEnter={() => setHighlighted(index)}
                    // Deliberately does not close: picking several things is
                    // the entire point of the control.
                    onClick={() => toggle(option)}
                    className={cn(menuItem, radius.control, 'text-start')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="size-3.5 shrink-0" />}
                  </button>
                </li>
              )
            })}

            {visible.length === 0 && (
              <li className="text-muted-foreground px-2.5 py-3 text-center text-sm">
                {emptyMessage}
              </li>
            )}
          </ul>

          {chosen.length > 0 && (
            <div className="border-border flex items-center justify-between gap-2 border-t p-2.5">
              <span className="text-muted-foreground text-xs tabular-nums">
                {chosen.length} selected
              </span>
              <button
                type="button"
                onClick={() => setSelected([])}
                className={cn(
                  'text-muted-foreground hover:text-foreground text-xs',
                  radius.xs,
                  focusRing,
                )}
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { MultiSelect }
