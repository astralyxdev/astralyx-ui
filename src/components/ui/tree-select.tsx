import { useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import { fieldBase, fieldOutline, fieldSize, focusRing, menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A tree in a popover, with checkboxes and real tri-state parents.
 *
 * **The tri-state is the whole problem.** A parent whose children are partly
 * chosen is neither checked nor unchecked, and rendering it as unchecked is a
 * lie people act on — they tick it, and silently replace a careful selection
 * with everything. The indeterminate state is set through the DOM property,
 * because `indeterminate` is not an HTML attribute and cannot be expressed in
 * JSX; `aria-checked="mixed"` carries the same fact to assistive technology.
 *
 * **Checking a branch checks its subtree, and `value` holds only the leaves.**
 * Storing branch ids as well means every consumer has to know whether a parent
 * in the list implies its children, and two consumers will answer differently.
 * Leaves are unambiguous, and parent state is derived on render.
 *
 * Searching filters to matching nodes **and keeps their ancestors**, because a
 * result with its path cut off is unplaceable — you cannot tell which "General"
 * you found.
 */
export type TreeSelectNode = {
  value: string
  label: ReactNode
  children?: TreeSelectNode[]
  disabled?: boolean
}

type TreeSelectProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  nodes: TreeSelectNode[]
  /** Selected leaf values. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  /** Values of branches open on first render. */
  defaultExpanded?: string[]
  size?: 'sm' | 'md' | 'lg'
  /** Summarises the selection on the trigger. */
  summary?: (values: string[]) => ReactNode
  emptyLabel?: string
  disabled?: boolean
  invalid?: boolean
  label?: string
}

const leavesOf = (node: TreeSelectNode): string[] =>
  node.children?.length ? node.children.flatMap(leavesOf) : [node.value]

/** Every value in a subtree, branches included — used to force-open a search. */
const allValues = (node: TreeSelectNode): string[] => [
  node.value,
  ...(node.children ?? []).flatMap(allValues),
]

/** Keep a node if it matches, or if any descendant does. */
function filterTree(nodes: TreeSelectNode[], needle: string): TreeSelectNode[] {
  if (!needle) return nodes
  const out: TreeSelectNode[] = []
  for (const node of nodes) {
    const label = typeof node.label === 'string' ? node.label : node.value
    const kept = node.children ? filterTree(node.children, needle) : undefined
    if (label.toLowerCase().includes(needle) || kept?.length) {
      out.push({ ...node, children: kept?.length ? kept : node.children && [] })
    }
  }
  return out
}

function Row({
  node,
  depth,
  chosen,
  expanded,
  onToggleExpand,
  onToggle,
  disabled,
}: {
  node: TreeSelectNode
  depth: number
  chosen: Set<string>
  expanded: Set<string>
  onToggleExpand: (value: string) => void
  onToggle: (node: TreeSelectNode, next: boolean) => void
  disabled?: boolean
}) {
  const leaves = leavesOf(node)
  const picked = leaves.filter((leaf) => chosen.has(leaf)).length
  const all = picked === leaves.length && leaves.length > 0
  const some = picked > 0 && !all
  const branch = Boolean(node.children?.length)
  const open = expanded.has(node.value)

  return (
    <li role="treeitem" aria-expanded={branch ? open : undefined} aria-selected={all}>
      <div
        className={cn('flex items-center gap-1.5 py-1 pe-2', radius.xs, 'hover:bg-muted')}
        style={{ paddingInlineStart: `${depth * 16 + 6}px` }}
      >
        {branch ? (
          <button
            type="button"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => onToggleExpand(node.value)}
            className={cn('text-muted-foreground shrink-0', radius.xs, focusRing)}
          >
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            )}
          </button>
        ) : (
          <span aria-hidden="true" className="size-3.5 shrink-0" />
        )}

        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={all}
            disabled={node.disabled || disabled}
            // `indeterminate` is a property, never an attribute — a ref
            // callback is the only way to express it from JSX.
            ref={(element) => {
              if (element) element.indeterminate = some
            }}
            aria-checked={some ? 'mixed' : all}
            onChange={(event) => onToggle(node, event.target.checked)}
            className={cn('size-3.5 shrink-0 accent-[var(--primary)]', focusRing)}
          />
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {branch && (
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {picked}/{leaves.length}
            </span>
          )}
        </label>
      </div>

      {branch && open && (
        <ul role="group" className="list-none">
          {node.children?.map((child) => (
            <Row
              key={child.value}
              node={child}
              depth={depth + 1}
              chosen={chosen}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggle={onToggle}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function TreeSelect({
  nodes,
  value,
  defaultValue = [],
  onChange,
  placeholder = 'Select…',
  searchable = true,
  searchPlaceholder = 'Search',
  defaultExpanded = [],
  size = 'md',
  summary,
  emptyLabel = 'Nothing matches.',
  disabled,
  invalid,
  label,
  className,
  ...props
}: TreeSelectProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const floatingRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [internal, setInternal] = useState<string[]>(defaultValue)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded))

  const selected = value ?? internal
  const chosen = useMemo(() => new Set(selected), [selected])

  const { style } = usePopper({
    open,
    anchorRef,
    floatingRef,
    side: 'bottom',
    align: 'start',
    matchAnchorWidth: true,
  })
  useDismissable({ open, onDismiss: () => setOpen(false), refs: [anchorRef, floatingRef] })

  const shown = useMemo(() => filterTree(nodes, query.trim().toLowerCase()), [nodes, query])

  const commit = (next: string[]) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  const toggle = (node: TreeSelectNode, on: boolean) => {
    const leaves = leavesOf(node)
    const next = new Set(selected)
    for (const leaf of leaves) {
      if (on) next.add(leaf)
      else next.delete(leaf)
    }
    commit([...next])
  }

  const toggleExpand = (target: string) => {
    const next = new Set(expanded)
    if (next.has(target)) next.delete(target)
    else next.add(target)
    setExpanded(next)
  }

  return (
    <div data-slot="tree-select" className={cn('relative inline-block', className)} {...props}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-haspopup="tree"
        aria-expanded={open}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          fieldBase, fieldOutline,
          fieldSize[size],
          'flex w-full items-center justify-between gap-2 text-start',
          invalid && 'border-[var(--destructive)]',
        )}
      >
        <span
          className={cn('min-w-0 flex-1 truncate', selected.length === 0 && 'text-muted-foreground')}
        >
          {selected.length === 0
            ? placeholder
            : (summary?.(selected) ?? `${selected.length} selected`)}
        </span>
        <ChevronDown aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
      </button>

      {open && (
        <div
          ref={floatingRef}
          style={style}
          className={cn(menuSurface, radius.surface, 'flex max-h-80 flex-col overflow-hidden p-0')}
        >
          {searchable && (
            <div className="border-border border-b p-2">
              <div className={cn(fieldBase, fieldOutline, 'flex h-8 items-center gap-2 px-2')}>
                <Search aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          )}

          <ul role="tree" aria-label={label} className="min-h-0 flex-1 list-none overflow-y-auto p-1">
            {shown.length === 0 ? (
              <li className="text-muted-foreground p-2 text-xs">{emptyLabel}</li>
            ) : (
              shown.map((node) => (
                <Row
                  key={node.value}
                  node={node}
                  depth={0}
                  chosen={chosen}
                  // While searching every branch is open, or the matches are
                  // hidden behind collapsed parents and the search looks broken.
                  expanded={query ? new Set(shown.flatMap(allValues)) : expanded}
                  onToggleExpand={toggleExpand}
                  onToggle={toggle}
                  disabled={disabled}
                />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export { TreeSelect }
export type { TreeSelectProps }
