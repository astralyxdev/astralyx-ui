import { useId, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fieldBase, fieldOutline, focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two lists and the movement between them: choose a subset from a large pool.
 *
 * **The reason this exists rather than a multi-select** is that it shows the
 * chosen set as a *list* instead of a row of chips. Once a selection passes
 * roughly a dozen items, chips wrap into a wall you cannot scan, cannot search
 * and cannot sort — and the question "did I already add Maria?" stops being
 * answerable at a glance. Permissions, mailing lists and column pickers are all
 * this shape.
 *
 * **Both sides are searchable independently.** Filtering the source is obvious;
 * filtering the target is what makes a 200-item selection usable, and it is the
 * half most implementations leave out.
 *
 * Each side is a listbox with `aria-multiselectable`, and moving items is a
 * button — not a double-click only, which is undiscoverable and impossible on a
 * keyboard. Selection state is per-side and clears after a move, because the
 * items are no longer where you left them.
 */
export type TransferItem = {
  value: string
  label: ReactNode
  /** Searched against. Falls back to `label` when it is a string. */
  keywords?: string
  disabled?: boolean
}

type TransferProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  items: TransferItem[]
  /** Values on the right-hand side. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (value: string[]) => void
  titles?: [ReactNode, ReactNode]
  searchable?: boolean
  height?: number
  searchPlaceholder?: string
  emptyLabel?: string
  toTargetLabel?: string
  toSourceLabel?: string
  /** Rendered under each title. Defaults to "n of m". */
  countLabel?: (selected: number, total: number) => ReactNode
  disabled?: boolean
}

const text = (item: TransferItem) =>
  item.keywords ?? (typeof item.label === 'string' ? item.label : item.value)

function Panel({
  title,
  items,
  picked,
  onToggle,
  searchable,
  height,
  searchPlaceholder,
  emptyLabel,
  countLabel,
  disabled,
}: {
  title: ReactNode
  items: TransferItem[]
  picked: Set<string>
  onToggle: (value: string) => void
  searchable: boolean
  height: number
  searchPlaceholder: string
  emptyLabel: string
  countLabel: (selected: number, total: number) => ReactNode
  disabled?: boolean
}) {
  const scope = useId()
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => text(item).toLowerCase().includes(needle))
  }, [items, query])

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col', surface, radius.surface)}>
      <div className="border-border border-b px-3 py-2">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{countLabel(picked.size, items.length)}</p>
      </div>

      {searchable && (
        <div className="border-border border-b p-2">
          <div className={cn(fieldBase, fieldOutline, 'flex h-8 items-center gap-2 px-2')}>
            <Search aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
            <input
              value={query}
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      )}

      <ul
        role="listbox"
        aria-multiselectable="true"
        aria-label={typeof title === 'string' ? title : undefined}
        style={{ height }}
        className="min-h-0 flex-1 list-none overflow-y-auto p-1"
      >
        {shown.length === 0 ? (
          <li className="text-muted-foreground p-3 text-xs">{emptyLabel}</li>
        ) : (
          shown.map((item) => {
            const on = picked.has(item.value)
            return (
              <li key={item.value}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm',
                    radius.xs,
                    'hover:bg-muted',
                    on && 'bg-muted',
                    (item.disabled || disabled) && 'pointer-events-none opacity-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={item.disabled || disabled}
                    onChange={() => onToggle(item.value)}
                    aria-labelledby={`${scope}-${item.value}`}
                    className={cn('size-3.5 shrink-0 accent-[var(--primary)]', focusRing)}
                  />
                  <span id={`${scope}-${item.value}`} className="min-w-0 flex-1 truncate">
                    {item.label}
                  </span>
                </label>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

function Transfer({
  items,
  value,
  defaultValue = [],
  onChange,
  titles = ['Available', 'Selected'],
  searchable = true,
  height = 240,
  searchPlaceholder = 'Search',
  emptyLabel = 'Nothing here.',
  toTargetLabel = 'Move to selected',
  toSourceLabel = 'Move to available',
  countLabel = (selected, total) => `${selected} of ${total} selected`,
  disabled,
  className,
  ...props
}: TransferProps) {
  const [internal, setInternal] = useState<string[]>(defaultValue)
  const [sourcePicked, setSourcePicked] = useState<Set<string>>(new Set())
  const [targetPicked, setTargetPicked] = useState<Set<string>>(new Set())

  const selected = value ?? internal
  const chosen = useMemo(() => new Set(selected), [selected])

  const source = items.filter((item) => !chosen.has(item.value))
  const target = items.filter((item) => chosen.has(item.value))

  const commit = (next: string[]) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  const toggle = (set: Set<string>, update: (next: Set<string>) => void) => (value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    update(next)
  }

  const move = (direction: 'right' | 'left') => {
    if (direction === 'right') {
      commit([...selected, ...[...sourcePicked].filter((v) => !chosen.has(v))])
      // Cleared because those rows are now on the other side.
      setSourcePicked(new Set())
    } else {
      commit(selected.filter((v) => !targetPicked.has(v)))
      setTargetPicked(new Set())
    }
  }

  return (
    <div
      data-slot="transfer"
      className={cn('flex flex-col items-stretch gap-3 sm:flex-row sm:items-center', className)}
      {...props}
    >
      <Panel
        title={titles[0]}
        items={source}
        picked={sourcePicked}
        onToggle={toggle(sourcePicked, setSourcePicked)}
        searchable={searchable}
        height={height}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        countLabel={countLabel}
        disabled={disabled}
      />

      <div className="flex shrink-0 flex-row justify-center gap-2 sm:flex-col">
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label={toTargetLabel}
          disabled={disabled || sourcePicked.size === 0}
          onClick={() => move('right')}
        >
          <ChevronRight className="rtl:rotate-180" />
        </Button>
        <Button
          size="icon-sm"
          variant="secondary"
          aria-label={toSourceLabel}
          disabled={disabled || targetPicked.size === 0}
          onClick={() => move('left')}
        >
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
      </div>

      <Panel
        title={titles[1]}
        items={target}
        picked={targetPicked}
        onToggle={toggle(targetPicked, setTargetPicked)}
        searchable={searchable}
        height={height}
        searchPlaceholder={searchPlaceholder}
        emptyLabel={emptyLabel}
        countLabel={countLabel}
        disabled={disabled}
      />
    </div>
  )
}

export { Transfer }
export type { TransferProps }
