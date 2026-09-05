import { useId, useMemo, useState, type ComponentProps } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Part-to-whole as nested rectangles, sized by area.
 *
 * **Squarified, not sliced.** The naive layout cuts the space into strips, which
 * produces slivers — rectangles hundreds of times longer than they are wide.
 * Slivers cannot be labelled, are almost impossible to compare, and are hard to
 * hit with a pointer. This uses the squarify algorithm (Bruls, Huizing, van
 * Wijk): it grows a row while the worst aspect ratio in that row improves, and
 * closes it as soon as adding the next item would make it worse. The result is
 * tiles close to square at every size.
 *
 * **Area encodes the value, and area is read poorly.** People judge area far
 * less accurately than length, so a treemap is the right choice for "what is
 * big, roughly, and what is inside what" and the wrong one for "is A bigger
 * than B" when A and B are close — for that, use a bar chart. The honest use is
 * disk usage, bundle composition, spend by category: hierarchies where the
 * nesting matters and precision does not.
 *
 * **Labels are drawn only where they fit.** A label wider or taller than its
 * tile is not truncated to an ellipsis that tells you nothing; it is dropped,
 * and the tile keeps its tooltip. Everything about the value stays reachable
 * through the title and the legend.
 */
export type TreemapNode = {
  id: string
  label: string
  /** Leaf magnitude. Ignored when `children` is present — parents sum. */
  value?: number
  children?: TreemapNode[]
  color?: string
}

type Tile = {
  node: TreemapNode
  x: number
  y: number
  width: number
  height: number
  depth: number
  value: number
}

// Omitted because the DOM declares it too, and in an intersection the DOM
// signature wins — which left the prop below unusable and the generated docs
// advertising the browser's handler instead of ours.
type TreemapProps = Omit<ComponentProps<'figure'>, 'height' | 'onSelect'> & {
  nodes: TreemapNode[]
  height?: number
  /** Levels to draw. 1 flattens the hierarchy to its top level. */
  depth?: number
  valueFormat?: (value: number) => string
  onSelect?: (node: TreemapNode) => void
  /** Gap between tiles, in pixels. */
  gap?: number
  emptyLabel?: string
  label?: string
}

const DEFAULT_FORMAT: (value: number) => string = (value: number) =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : String(Math.round(value))

const total = (node: TreemapNode): number =>
  node.children?.length ? node.children.reduce((sum, child) => sum + total(child), 0) : (node.value ?? 0)

/**
 * Squarify: lay `items` into `rect`, keeping tiles as square as possible.
 *
 * The worst aspect ratio in a row is the objective; a row is closed as soon as
 * adding the next item would make that worse.
 */
function squarify(
  items: { node: TreemapNode; value: number }[],
  rect: { x: number; y: number; width: number; height: number },
  out: Tile[],
  depth: number,
) {
  if (items.length === 0 || rect.width <= 0 || rect.height <= 0) return

  const sum = items.reduce((acc, item) => acc + item.value, 0)
  if (sum <= 0) return

  const area = rect.width * rect.height
  const scaled = items.map((item) => ({ ...item, area: (item.value / sum) * area }))

  let cursor = { ...rect }
  let index = 0

  while (index < scaled.length) {
    const vertical = cursor.width >= cursor.height
    const side = vertical ? cursor.height : cursor.width

    const row: typeof scaled = []
    let rowArea = 0
    let best = Infinity

    while (index < scaled.length) {
      const candidate = scaled[index]
      const nextArea = rowArea + candidate.area
      const thickness = nextArea / side

      // Worst aspect ratio if this item joins the row.
      const worst = Math.max(
        ...[...row, candidate].map((item) => {
          const length = item.area / thickness
          return Math.max(thickness / length, length / thickness)
        }),
      )

      if (row.length > 0 && worst > best) break
      row.push(candidate)
      rowArea = nextArea
      best = worst
      index++
    }

    const thickness = rowArea / side
    let offset = vertical ? cursor.y : cursor.x

    for (const item of row) {
      const length = item.area / thickness
      out.push({
        node: item.node,
        value: item.value,
        depth,
        x: vertical ? cursor.x : offset,
        y: vertical ? offset : cursor.y,
        width: vertical ? thickness : length,
        height: vertical ? length : thickness,
      })
      offset += length
    }

    cursor = vertical
      ? { x: cursor.x + thickness, y: cursor.y, width: cursor.width - thickness, height: cursor.height }
      : { x: cursor.x, y: cursor.y + thickness, width: cursor.width, height: cursor.height - thickness }
  }
}

function Treemap({
  nodes,
  height = 320,
  depth = 2,
  valueFormat = DEFAULT_FORMAT,
  onSelect,
  gap = 2,
  emptyLabel = 'Nothing to show.',
  label = 'Treemap',
  className,
  ...props
}: TreemapProps) {
  const titleId = useId()
  const [hovered, setHovered] = useState<string | null>(null)

  const tiles = useMemo(() => {
    const out: Tile[] = []
    // Percentage space, so the layout is resolution independent.
    const top = nodes
      .map((node) => ({ node, value: total(node) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    squarify(top, { x: 0, y: 0, width: 100, height: 100 }, out, 0)

    if (depth > 1) {
      // Children are laid out inside their parent's rectangle, recursively.
      const parents = out.filter((tile) => tile.node.children?.length)
      for (const parent of parents) {
        const inner = (parent.node.children ?? [])
          .map((node) => ({ node, value: total(node) }))
          .filter((item) => item.value > 0)
          .sort((a, b) => b.value - a.value)
        squarify(
          inner,
          // Inset leaves the parent's own edge visible as a frame.
          { x: parent.x, y: parent.y + 3, width: parent.width, height: Math.max(0, parent.height - 3) },
          out,
          1,
        )
      }
    }

    return out
  }, [nodes, depth])

  if (tiles.length === 0) {
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </figure>
    )
  }

  const colourFor = (tile: Tile, index: number) =>
    tile.node.color ?? dataPalette[index % dataPalette.length].fill

  return (
    <figure
      data-slot="treemap"
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <figcaption id={titleId} className="sr-only">
        {label}
      </figcaption>

      {/* Positioned elements, not SVG: text inside a stretched viewBox would be
          sheared, and these tiles must hold readable labels. */}
      <div className="relative w-full overflow-hidden" style={{ height }}>
        {tiles.map((tile, index) => {
          const leaf = tile.depth > 0 || !tile.node.children?.length
          const fits = tile.width > 12 && tile.height > 9

          return (
            <button
              key={`${tile.node.id}-${tile.depth}`}
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(tile.node)}
              onMouseEnter={() => setHovered(tile.node.id)}
              onMouseLeave={() => setHovered(null)}
              title={`${tile.node.label}: ${valueFormat(tile.value)}`}
              className={cn(
                'absolute overflow-hidden text-start transition-opacity',
                onSelect ? 'cursor-pointer' : 'cursor-default',
                leaf ? 'rounded-[3px]' : 'rounded-[4px] ring-1 ring-inset ring-white/25',
              )}
              style={{
                insetInlineStart: `${tile.x}%`,
                top: `${tile.y}%`,
                width: `calc(${tile.width}% - ${gap}px)`,
                height: `calc(${tile.height}% - ${gap}px)`,
                background: colourFor(tile, index),
                opacity: hovered === null || hovered === tile.node.id ? (leaf ? 0.85 : 0.35) : 0.3,
              }}
            >
              {/* Dropped rather than truncated: "Node_m…" tells you nothing. */}
              {fits && (
                <span className="pointer-events-none block p-1.5 leading-tight text-white">
                  <span className="block truncate text-[11px] font-medium">{tile.node.label}</span>
                  <span className="block truncate text-[10px] tabular-nums opacity-80">
                    {valueFormat(tile.value)}
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </figure>
  )
}

export { Treemap }
export type { TreemapProps }
