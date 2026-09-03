import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronRight } from 'lucide-react'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A collapsible hierarchy with full keyboard navigation.
 *
 * The generalisation of `FileTree` — anything nested: a JSON document, a
 * dependency graph, a causal chain.
 *
 * Two things are worth knowing. Navigation runs over a *flattened* list of the
 * currently visible nodes, because arrow keys move by what is on screen, not
 * by tree depth: pressing Down on the last child of a collapsed-sibling branch
 * has to land on the next visible row, wherever that sits in the hierarchy.
 *
 * And the tree owns exactly one tab stop (`tabIndex` roves with the active
 * row), per the ARIA practices — a tree of two hundred nodes that puts every
 * row in the tab order is unusable with a keyboard.
 */
export type TreeNode = {
  id: string
  label: ReactNode
  icon?: ReactNode
  /** Right-aligned annotation — a count, a size, a status. */
  meta?: ReactNode
  children?: TreeNode[]
  disabled?: boolean
}

type FlatNode = {
  node: TreeNode
  level: number
  parentId?: string
  /** Position within its own sibling group, for the flat-DOM ARIA pattern. */
  posinset: number
  setsize: number
}

/** Depth-first walk of what is currently visible. */
function flatten(
  nodes: TreeNode[],
  expanded: Set<string>,
  level = 0,
  parentId?: string,
): FlatNode[] {
  return nodes.flatMap((node, index) => {
    const row: FlatNode = {
      node,
      level,
      parentId,
      posinset: index + 1,
      setsize: nodes.length,
    }
    const open = node.children?.length && expanded.has(node.id)
    return open
      ? [row, ...flatten(node.children ?? [], expanded, level + 1, node.id)]
      : [row]
  })
}

function Tree({
  nodes,
  defaultExpanded = [],
  expanded: expandedProp,
  onExpandedChange,
  selected,
  onSelect,
  guides = true,
  className,
  ...props
}: Omit<ComponentProps<'ul'>, 'onSelect'> & {
  nodes: TreeNode[]
  defaultExpanded?: string[]
  expanded?: string[]
  onExpandedChange?: (expanded: string[]) => void
  selected?: string
  onSelect?: (id: string) => void
  /** Indent guide lines. */
  guides?: boolean
}) {
  const controlled = expandedProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<string[]>(defaultExpanded)
  const expandedList = controlled ? expandedProp : uncontrolled
  const expanded = useMemo(() => new Set(expandedList), [expandedList])

  const rows = useMemo(() => flatten(nodes, expanded), [nodes, expanded])
  const [active, setActive] = useState(0)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const setExpanded = useCallback(
    (next: Set<string>) => {
      const list = [...next]
      if (!controlled) setUncontrolled(list)
      onExpandedChange?.(list)
    },
    [controlled, onExpandedChange],
  )

  const toggle = useCallback(
    (id: string, open?: boolean) => {
      const next = new Set(expanded)
      const shouldOpen = open ?? !next.has(id)
      if (shouldOpen) next.add(id)
      else next.delete(id)
      setExpanded(next)
    },
    [expanded, setExpanded],
  )

  const focusRow = (index: number) => {
    const clamped = Math.max(0, Math.min(index, rows.length - 1))
    setActive(clamped)
    rowRefs.current[clamped]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const row = rows[active]
    if (!row) return
    const hasChildren = Boolean(row.node.children?.length)
    const isOpen = expanded.has(row.node.id)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(active + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusRow(active - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        // Open a closed branch; step into an open one.
        if (hasChildren && !isOpen) toggle(row.node.id, true)
        else if (hasChildren) focusRow(active + 1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        // Close an open branch; otherwise climb to the parent.
        if (hasChildren && isOpen) toggle(row.node.id, false)
        else if (row.parentId) {
          const parent = rows.findIndex((r) => r.node.id === row.parentId)
          if (parent !== -1) focusRow(parent)
        }
        break
      case 'Home':
        event.preventDefault()
        focusRow(0)
        break
      case 'End':
        event.preventDefault()
        focusRow(rows.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (row.node.disabled) break
        if (hasChildren) toggle(row.node.id)
        else onSelect?.(row.node.id)
        break
    }
  }

  return (
    <ul
      role="tree"
      data-slot="tree"
      onKeyDown={onKeyDown}
      className={cn('flex list-none flex-col outline-none', className)}
      {...props}
    >
      {rows.map((row, index) => {
        const hasChildren = Boolean(row.node.children?.length)
        const isOpen = expanded.has(row.node.id)
        const isSelected = selected === row.node.id

        return (
          <li
            key={row.node.id}
            role="treeitem"
            aria-expanded={hasChildren ? isOpen : undefined}
            aria-selected={isSelected}
            aria-level={row.level + 1}
            // Rows are siblings in the DOM, so depth alone cannot say "third of
            // five in this branch". These carry that.
            aria-posinset={row.posinset}
            aria-setsize={row.setsize}
            aria-disabled={row.node.disabled || undefined}
          >
            <div
              ref={(node) => {
                rowRefs.current[index] = node
              }}
              // One tab stop for the whole tree; it roves with the active row.
              tabIndex={index === active ? 0 : -1}
              onFocus={() => setActive(index)}
              onClick={() => {
                if (row.node.disabled) return
                setActive(index)
                if (hasChildren) toggle(row.node.id)
                else onSelect?.(row.node.id)
              }}
              style={{ paddingInlineStart: `${row.level * 16 + 6}px` }}
              className={cn(
                'flex h-7 cursor-pointer items-center gap-1.5 pe-2 text-sm select-none',
                radius.control,
                interactive,
                focusRing,
                "[&_svg:not([class*='size-'])]:size-3.5",
                row.node.disabled && 'pointer-events-none opacity-50',
                isSelected
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                guides && row.level > 0 && 'relative',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center',
                  !hasChildren && 'invisible',
                )}
              >
                <ChevronRight
                  className={cn(
                    'transition-transform duration-150 ease-out motion-reduce:transition-none',
                    isOpen && 'rotate-90',
                  )}
                />
              </span>

              {row.node.icon && (
                <span className="shrink-0">{row.node.icon}</span>
              )}
              <span className="min-w-0 flex-1 truncate">{row.node.label}</span>
              {row.node.meta && (
                <span className="text-muted-foreground/70 shrink-0 text-xs tabular-nums">
                  {row.node.meta}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export { Tree }
