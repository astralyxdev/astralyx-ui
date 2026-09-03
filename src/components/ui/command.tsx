import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Search } from 'lucide-react'
import { DialogProvider, useDialog } from '@/components/primitives/dialog'
import { Kbd } from '@/components/ui/kbd'
import {
  fieldInput,
  menuItem,
  radius,
  surface,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A command palette: type to filter, arrows to move, Enter to run.
 *
 * Items are data rather than children, because filtering has to reorder and
 * hide them — doing that over arbitrary JSX means walking the tree and guessing
 * what is searchable. Groups collapse when every item in them is filtered out.
 */
export type CommandItem = {
  id: string
  label: string
  group?: string
  shortcut?: string
  icon?: ReactNode
  keywords?: string
  disabled?: boolean
  onSelect?: () => void
}

function score(item: CommandItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return 0
  const haystack = `${item.label} ${item.keywords ?? ''} ${item.group ?? ''}`.toLowerCase()
  const at = haystack.indexOf(needle)
  // A prefix match on the label ranks above a match anywhere else.
  if (item.label.toLowerCase().startsWith(needle)) return 0
  return at === -1 ? -1 : at + 1
}

function CommandList({
  items,
  emptyMessage = 'No results',
  onRun,
  className,
  autoFocus = true,
  placeholder = 'Type a command or search…',
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  items: CommandItem[]
  emptyMessage?: string
  placeholder?: string
  autoFocus?: boolean
  onRun?: (item: CommandItem) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const scored = items
      .map((item) => ({ item, rank: score(item, query) }))
      .filter((entry) => entry.rank !== -1)
      .sort((a, b) => a.rank - b.rank)
    return scored.map((entry) => entry.item)
  }, [items, query])

  // Group in result order, so a group's position follows its best match.
  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const item of results) {
      const key = item.group ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return [...map.entries()]
  }, [results])

  const flat = groups.flatMap(([, group]) => group)

  useEffect(() => {
    if (!autoFocus) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [autoFocus])

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function run(item: CommandItem) {
    if (item.disabled) return
    item.onSelect?.()
    onRun?.(item)
  }

  return (
    <div data-slot="command" className={cn('flex flex-col', className)} {...props}>
      <div className="border-border flex items-center gap-2 border-b px-4">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            // The filtered list just changed under the highlight; index 0 is
            // the only position guaranteed to still exist.
            setActive(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((i) => Math.min(i + 1, flat.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              const item = flat[active]
              if (item) run(item)
            }
          }}
          className={cn(fieldInput, 'h-12 text-sm')}
        />
      </div>

      <div ref={listRef} className="max-h-80 overflow-auto p-2">
        {flat.length === 0 && (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {emptyMessage}
          </p>
        )}

        {groups.map(([group, groupItems]) => (
          <div key={group || 'ungrouped'} className="mb-1 last:mb-0">
            {group && (
              <div className="text-muted-foreground px-2.5 py-1.5 text-[11px] font-medium tracking-wide uppercase">
                {group}
              </div>
            )}
            {groupItems.map((item) => {
              const index = flat.indexOf(item)
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={index === active}
                  data-highlighted={index === active}
                  data-disabled={item.disabled}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => run(item)}
                  className={cn(menuItem, radius.control)}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut && <Kbd keys={item.shortcut} />}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** The palette in a modal, which is how it is normally used. */
function CommandDialog({
  open,
  onOpenChange,
  items,
  ...props
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  items: CommandItem[]
} & ComponentProps<typeof CommandList>) {
  return (
    <DialogProvider open={open} onOpenChange={onOpenChange}>
      <CommandDialogContent items={items} {...props} />
    </DialogProvider>
  )
}

function CommandDialogContent({
  items,
  label = 'Command palette',
  ...props
}: {
  items: CommandItem[]
  /** Accessible name for the palette dialog. */
  label?: string
} & ComponentProps<typeof CommandList>) {
  const { dialogRef, setOpen } = useDialog()

  return (
    <dialog
      ref={dialogRef}
      data-slot="command-dialog"
      aria-label={label}
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
      className={cn(
        surface,
        radius.panel,
        'text-card-foreground mx-auto mt-[12vh] mb-auto w-[min(36rem,100vw-2rem)] p-0',
        'backdrop:bg-transparent',
      )}
    >
      <CommandList items={items} onRun={() => setOpen(false)} {...props} />
    </dialog>
  )
}

export { CommandDialog, CommandList }
