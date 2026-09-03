import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, FileCode, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { menuItem, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Picks what an assistant can see: files, selections, docs, tools.
 *
 * A dropdown rather than a dialog, because attaching context happens mid-thought
 * — a modal would take focus away from the prompt you were part-way through
 * writing. Already-attached sources stay in the list with a tick rather than
 * disappearing, so the menu does not reshuffle under the pointer.
 */
export type ContextSource = {
  id: string
  label: string
  group?: string
  detail?: string
  icon?: ReactNode
  disabled?: boolean
}

function ContextPicker({
  sources,
  selected = [],
  onSelect,
  onDeselect,
  trigger,
  emptyMessage = 'Nothing matches',
  triggerLabel = 'Context',
  searchPlaceholder = 'Search files and docs',
  searchLabel = 'Search context sources',
  ...props
  // 'onSelect' is also a DOM event on the underlying div; omitting it stops the
  // native signature from shadowing this one.
}: Omit<ComponentProps<typeof DropdownMenuContent>, 'children' | 'onSelect'> & {
  sources: ContextSource[]
  selected?: string[]
  onSelect?: (id: string) => void
  onDeselect?: (id: string) => void
  trigger?: ReactNode
  emptyMessage?: string
  /** Text on the default trigger. Ignored when `trigger` is given. */
  triggerLabel?: ReactNode
  searchPlaceholder?: string
  /** Accessible name for the search field. */
  searchLabel?: string
}) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = needle
      ? sources.filter((s) =>
          `${s.label} ${s.detail ?? ''} ${s.group ?? ''}`
            .toLowerCase()
            .includes(needle),
        )
      : sources

    const map = new Map<string, ContextSource[]>()
    for (const source of matched) {
      const key = source.group ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(source)
    }
    return [...map.entries()]
  }, [sources, query])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="xs">
            <Plus /> {triggerLabel}
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-0" {...props}>
        <div className="border-border border-b p-1.5">
          <Input
            size="sm"
            icon={<Search />}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={searchLabel}
          />
        </div>

        <div className="max-h-64 overflow-auto p-1">
          {groups.length === 0 && (
            <p className="text-muted-foreground px-2.5 py-6 text-center text-sm">
              {emptyMessage}
            </p>
          )}

          {groups.map(([group, items]) => (
            <div key={group || 'ungrouped'}>
              {group && <DropdownMenuLabel>{group}</DropdownMenuLabel>}
              {items.map((source) => {
                const on = selected.includes(source.id)
                return (
                  <button
                    key={source.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    data-disabled={source.disabled || undefined}
                    disabled={source.disabled}
                    onClick={() => (on ? onDeselect?.(source.id) : onSelect?.(source.id))}
                    className={cn(menuItem, radius.control, 'w-full')}
                  >
                    {source.icon ?? <FileCode />}
                    <span className="min-w-0 flex-1 truncate text-start">
                      {source.label}
                    </span>
                    {source.detail && (
                      <span className="text-muted-foreground/70 shrink-0 font-mono text-xs">
                        {source.detail}
                      </span>
                    )}
                    {on && <Check className="size-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator className="mx-0 my-0" />
            <div className="text-muted-foreground flex items-center justify-between gap-2 p-3 text-xs">
              <span>{selected.length} attached</span>
              <Badge size="sm" variant="secondary">
                {selected.length}
              </Badge>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ContextPicker }
