import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  ChevronRight, File, FileCode, FileJson, FileText, Folder, FolderOpen,
} from 'lucide-react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A file and directory tree.
 *
 * Uses the ARIA tree pattern: one `role="tree"`, nested `role="group"`, and
 * every row a `role="treeitem"` carrying `aria-expanded` and `aria-level`. Only
 * the selected row is in the tab order, and arrow keys move between rows — the
 * same roving pattern Tabs uses, because a tree with 200 files should not cost
 * 200 tab stops.
 */
export type FileNode = {
  name: string
  /** Children make it a directory; a leaf is a file. */
  children?: FileNode[]
  /** Extra text on the right — a commit message, a size, a status. */
  meta?: ReactNode
  /** Marks the row, e.g. a modified file. */
  badge?: ReactNode
  defaultOpen?: boolean
}

const ICON = 'size-3.5 shrink-0'

/**
 * Pick an icon from the extension, so callers do not have to.
 *
 * Returns an element rather than a component type: assigning a component to a
 * capitalised variable during render creates a new type on every pass, which
 * remounts the node and resets any state inside it.
 */
function iconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'css'].includes(ext)) return <FileCode className={ICON} />
  if (['json', 'lock'].includes(ext)) return <FileJson className={ICON} />
  if (['md', 'txt', 'mdx'].includes(ext)) return <FileText className={ICON} />
  return <File className={ICON} />
}

type FileTreeProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  nodes: FileNode[]
  /** Path of the selected row, joined with "/". */
  value?: string
  onSelect?: (path: string) => void
  /** Show the meta column. */
  showMeta?: boolean
  /** Accessible name for the tree. */
  label?: string
}

function FileTree({
  label = 'Files',
  className,
  nodes,
  value,
  onSelect,
  showMeta = true,
  ...props
}: FileTreeProps) {
  const [selected, setSelected] = useState(value)
  const current = value ?? selected

  function select(path: string) {
    setSelected(path)
    onSelect?.(path)
  }

  return (
    <div
      role="tree"
      aria-label={label}
      data-slot="file-tree"
      className={cn('text-sm', className)}
      onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        const rows = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'),
        )
        if (!rows.length) return
        const at = rows.indexOf(document.activeElement as HTMLElement)
        event.preventDefault()
        const next =
          event.key === 'Home' ? 0
          : event.key === 'End' ? rows.length - 1
          : event.key === 'ArrowDown' ? Math.min(at + 1, rows.length - 1)
          : Math.max(at - 1, 0)
        rows[next]?.focus()
      }}
      {...props}
    >
      {nodes.map((node) => (
        <Node
          key={node.name}
          node={node}
          path={node.name}
          level={1}
          selected={current}
          onSelect={select}
          showMeta={showMeta}
        />
      ))}
    </div>
  )
}

function Node({
  node,
  path,
  level,
  selected,
  onSelect,
  showMeta,
}: {
  node: FileNode
  path: string
  level: number
  selected?: string
  onSelect: (path: string) => void
  showMeta: boolean
  /** Accessible name for the tree. */
  label?: string
}) {
  const [open, setOpen] = useState(node.defaultOpen ?? false)
  const isDirectory = Boolean(node.children)
  const isSelected = selected === path
  const icon = isDirectory ? (
    open ? <FolderOpen className={ICON} /> : <Folder className={ICON} />
  ) : (
    iconFor(node.name)
  )

  return (
    <div>
      <button
        type="button"
        role="treeitem"
        aria-level={level}
        aria-selected={isSelected}
        aria-expanded={isDirectory ? open : undefined}
        // Roving: only the selected row is reachable by Tab.
        tabIndex={isSelected ? 0 : -1}
        onClick={() => {
          if (isDirectory) setOpen(!open)
          onSelect(path)
        }}
        onKeyDown={(event) => {
          if (!isDirectory) return
          if (event.key === 'ArrowRight' && !open) {
            event.preventDefault()
            setOpen(true)
          } else if (event.key === 'ArrowLeft' && open) {
            event.preventDefault()
            setOpen(false)
          }
        }}
        // Indentation is padding rather than a margin so the hover and selected
        // backgrounds still span the full row.
        style={{ paddingInlineStart: `${level * 12}px` }}
        className={cn(
          'flex w-full items-center gap-1.5 py-1 pe-2 text-start',
          radius.control,
          focusRing,
          'transition-colors duration-150 ease-out motion-reduce:transition-none',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground',
        )}
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            isDirectory ? (open ? 'rotate-90' : '') : 'invisible',
          )}
        />
        {icon}
        <span className="truncate">{node.name}</span>
        {node.badge}
        {showMeta && node.meta && (
          <span className="text-muted-foreground/70 ms-auto shrink-0 truncate ps-3 text-xs">
            {node.meta}
          </span>
        )}
      </button>

      {isDirectory && open && (
        <div role="group">
          {node.children!.map((child) => (
            <Node
              key={child.name}
              node={child}
              path={`${path}/${child.name}`}
              level={level + 1}
              selected={selected}
              onSelect={onSelect}
              showMeta={showMeta}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { FileTree }
export type { FileTreeProps }
