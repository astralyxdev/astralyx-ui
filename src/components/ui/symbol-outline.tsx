import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Box, Braces, FunctionSquare, Hash, Search, Type, Variable } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A file's symbols as a tree.
 *
 * Filtering keeps ancestors of a match. Flattening to matched leaves loses the
 * class a method belongs to, and `render` on its own is useless when six
 * components define one.
 *
 * Order is the order in the file, not alphabetical. An outline is a map of the
 * document you are reading; re-sorting it means the outline and the editor
 * disagree about where things are.
 *
 * Exported symbols are marked. "Is this part of the public surface" is the
 * question an outline gets used for most, and it cannot be answered from the
 * name.
 */
export type SymbolKind =
  | 'function' | 'class' | 'interface' | 'type' | 'constant' | 'variable' | 'property'

export type CodeSymbol = {
  id: string
  name: string
  kind: SymbolKind
  line?: number
  exported?: boolean
  children?: CodeSymbol[]
}

const ICON = {
  function: FunctionSquare,
  class: Box,
  interface: Braces,
  type: Type,
  constant: Hash,
  variable: Variable,
  property: Hash,
} as const

/** Keeps a node when it matches, or when any descendant does. */
function filterTree(nodes: CodeSymbol[], needle: string): CodeSymbol[] {
  if (!needle) return nodes
  const out: CodeSymbol[] = []
  for (const node of nodes) {
    const children = filterTree(node.children ?? [], needle)
    if (node.name.toLowerCase().includes(needle) || children.length > 0) {
      out.push({ ...node, children })
    }
  }
  return out
}

function SymbolOutline({
  symbols,
  onSelect,
  selected,
  searchable = true,
  searchPlaceholder = 'Filter symbols',
  searchLabel = 'Filter symbols',
  emptyMessage = 'No symbols match.',
  exportedLabel = 'exported',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  symbols: CodeSymbol[]
  onSelect?: (id: string) => void
  selected?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  emptyMessage?: ReactNode
  /** Accessible name for the export marker. */
  exportedLabel?: string
}) {
  const [query, setQuery] = useState('')
  const tree = useMemo(() => filterTree(symbols, query.trim().toLowerCase()), [symbols, query])

  const render = (nodes: CodeSymbol[], depth = 0): ReactNode =>
    nodes.map((symbol) => {
      const Icon = ICON[symbol.kind]
      return (
        <li key={symbol.id}>
          <button
            type="button"
            onClick={() => onSelect?.(symbol.id)}
            style={{ paddingInlineStart: depth * 14 + 12 }}
            className={cn(
              'flex w-full items-center gap-2 py-1.5 pe-3 text-start',
              selected === symbol.id && 'bg-accent/50',
              onSelect && interactive,
              focusRing,
            )}
          >
            <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{symbol.name}</span>
            {/* The question an outline is opened to answer. */}
            {symbol.exported && (
              <span
                className="size-1.5 shrink-0 rounded-full bg-[var(--green)]"
                aria-label={exportedLabel}
              />
            )}
            {symbol.line !== undefined && (
              <span className="text-muted-foreground/50 shrink-0 text-xs tabular-nums">
                {symbol.line}
              </span>
            )}
          </button>
          {symbol.children && symbol.children.length > 0 && (
            <ul className="list-none">{render(symbol.children, depth + 1)}</ul>
          )}
        </li>
      )
    })

  return (
    <div
      data-slot="symbol-outline"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {searchable && (
        <div className="border-border border-b p-3">
          <Input
            size="sm"
            value={query}
            icon={<Search />}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      {tree.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyMessage}</p>
      ) : (
        <ul className="list-none py-1.5">{render(tree)}</ul>
      )}
    </div>
  )
}

export { SymbolOutline, filterTree as filterSymbols }
