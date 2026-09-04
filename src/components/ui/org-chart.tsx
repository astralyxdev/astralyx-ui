import { useId, useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A reporting hierarchy, drawn top-down with connectors.
 *
 * **Why not `Tree`.** A tree is an indented list — it is the right shape for a
 * filesystem, where depth is all that matters and breadth is unbounded. An org
 * chart is read for *spans*: how many people report to this person, and are
 * these two peers. Siblings side by side answer both at a glance; siblings
 * stacked vertically answer neither, and an org of forty people becomes forty
 * indented rows you have to count.
 *
 * **It builds the tree from flat `{ id, managerId }` rows**, because that is
 * how every HR system, directory and database actually stores it. Requiring
 * pre-nested input pushes the same recursion into every caller.
 *
 * **Multiple roots and orphans are rendered, not dropped.** Real directories
 * have a vacant manager slot, a contractor with no manager, a recent transfer
 * pointing at a deleted record. Silently omitting those rows makes the chart
 * quietly wrong; they are shown as additional roots so the gap is visible. A
 * cycle — A reports to B reports to A — is detected and reported rather than
 * recursed into.
 *
 * Nodes are `<li>` inside nested `<ul>`s: the semantics are already a tree, so
 * the connectors are drawn with borders on top of correct markup rather than
 * replacing it.
 */
export type OrgNode = {
  id: string
  name: ReactNode
  title?: ReactNode
  avatar?: ReactNode
  managerId?: string | null
  meta?: ReactNode
}

type Built = OrgNode & { children: Built[] }

type OrgChartProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  nodes: OrgNode[]
  onSelect?: (node: OrgNode) => void
  selectedId?: string
  /** Depth open on first render. `Infinity` expands everything. */
  defaultDepth?: number
  /** Lay a node's children out in a column past this many. */
  stackAfter?: number
  onError?: (error: Error) => void
  emptyLabel?: string
  label?: string
}

function build(nodes: OrgNode[]): { roots: Built[]; error: Error | null } {
  const byId = new Map<string, Built>(nodes.map((node) => [node.id, { ...node, children: [] }]))
  const roots: Built[] = []

  for (const node of byId.values()) {
    const parent = node.managerId ? byId.get(node.managerId) : undefined
    // An orphan — no manager, or a manager who is not in the data — becomes a
    // root, so the row stays visible instead of vanishing.
    if (parent && parent.id !== node.id) parent.children.push(node)
    else roots.push(node)
  }

  // Reachability check: anything not reached from a root is in a cycle.
  const seen = new Set<string>()
  const walk = (node: Built) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    node.children.forEach(walk)
  }
  roots.forEach(walk)

  const error =
    seen.size < byId.size
      ? new Error(`${byId.size - seen.size} node(s) are in a reporting cycle and are not shown.`)
      : null

  return { roots, error }
}

function Node({
  node,
  depth,
  open,
  onToggle,
  onSelect,
  selectedId,
  stackAfter,
  position,
}: {
  node: Built
  depth: number
  open: Set<string>
  onToggle: (id: string) => void
  onSelect?: (node: OrgNode) => void
  selectedId?: string
  stackAfter: number
  /** Where this node sits in its parent's row, for the connector geometry. */
  position?: { index: number; count: number; row: boolean }
}) {
  const expanded = open.has(node.id)
  const hasChildren = node.children.length > 0
  const stacked = node.children.length > stackAfter

  return (
    <li className="relative flex flex-col items-center">
      {/*
        Each child draws its own half of the horizontal rule, from its own
        centre outward.

        One rule spanning the row cannot be positioned correctly: it would have
        to start at the first child's centre and end at the last child's, and
        with variable-width names those centres are not at any percentage of the
        row. (Sizing every child equally would fix the geometry by making the
        layout worse.) Half-segments anchored to each child's own box meet in
        the gaps regardless of how wide any name is, so the rule lands on the
        stubs at every width.

        The 0.5rem is half the row's `gap-4`, so adjacent halves meet.
      */}
      {position?.row && position.count > 1 && (
        <>
          {position.index > 0 && (
            <span
              aria-hidden="true"
              className="bg-border absolute top-0 -start-2 h-px w-[calc(50%+0.5rem)]"
            />
          )}
          {position.index < position.count - 1 && (
            <span
              aria-hidden="true"
              className="bg-border absolute top-0 -end-2 h-px w-[calc(50%+0.5rem)]"
            />
          )}
        </>
      )}

      {/* The stub joining this node up to that rule. */}
      {depth > 0 && <span aria-hidden="true" className="bg-border h-4 w-px shrink-0" />}

      <div
        className={cn(
          'relative flex items-center gap-2 px-3 py-2',
          surface,
          radius.surface,
          selectedId === node.id && 'ring-2 ring-[var(--primary)]',
        )}
      >
        {node.avatar && <span className="shrink-0">{node.avatar}</span>}
        <span className="min-w-0">
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(node)}
            className={cn(
              'block max-w-40 truncate text-start text-sm font-medium',
              onSelect ? 'cursor-pointer hover:underline' : 'cursor-default',
              radius.xs,
              focusRing,
            )}
          >
            {node.name}
          </button>
          {node.title && (
            <span className="text-muted-foreground block max-w-40 truncate text-xs">{node.title}</span>
          )}
          {node.meta}
        </span>

        {hasChildren && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse reports' : 'Expand reports'}
            onClick={() => onToggle(node.id)}
            className={cn('text-muted-foreground ms-1 shrink-0', radius.xs, focusRing)}
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5 rtl:rotate-180" />}
            <span className="sr-only">{node.children.length} reports</span>
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <>
          <span aria-hidden="true" className="bg-border h-4 w-px shrink-0" />
          <ul
            className={cn(
              'relative flex list-none',
              stacked ? 'flex-col items-start gap-2 ps-6' : 'flex-row items-start gap-4',
            )}
          >
            {/* Stacked children get a vertical spine instead; a very long
                horizontal rule reads worse than a column. */}
            {stacked && (
              <span aria-hidden="true" className="bg-border absolute top-0 bottom-4 start-2 w-px" />
            )}

            {node.children.map((child, index) => (
              <Node
                key={child.id}
                node={child}
                depth={depth + 1}
                open={open}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedId={selectedId}
                stackAfter={stackAfter}
                position={{ index, count: node.children.length, row: !stacked }}
              />
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

function OrgChart({
  nodes,
  onSelect,
  selectedId,
  defaultDepth = 2,
  stackAfter = 4,
  onError,
  emptyLabel = 'No people.',
  label = 'Organisation chart',
  className,
  ...props
}: OrgChartProps) {
  const titleId = useId()
  const { roots, error } = useMemo(() => build(nodes), [nodes])

  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    const walk = (node: Built, depth: number) => {
      if (depth < defaultDepth) initial.add(node.id)
      node.children.forEach((child) => walk(child, depth + 1))
    }
    build(nodes).roots.forEach((root) => walk(root, 0))
    return initial
  })

  if (error) onError?.(error)

  if (roots.length === 0) {
    return (
      <div className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </div>
    )
  }

  const toggle = (id: string) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }

  return (
    <div
      data-slot="org-chart"
      className={cn('w-full overflow-x-auto', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <p id={titleId} className="sr-only">
        {label}
      </p>

      <ul className="flex list-none justify-center gap-8 p-2">
        {roots.map((root) => (
          <Node
            key={root.id}
            node={root}
            depth={0}
            open={open}
            onToggle={toggle}
            onSelect={onSelect}
            selectedId={selectedId}
            stackAfter={stackAfter}
          />
        ))}
      </ul>

      {error && (
        <p role="status" className="text-[var(--destructive)] px-2 text-[11px]">
          {error.message}
        </p>
      )}
    </div>
  )
}

export { OrgChart }
export type { OrgChartProps }
