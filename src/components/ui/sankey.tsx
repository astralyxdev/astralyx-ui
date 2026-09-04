import { useId, useMemo, useState, type ComponentProps } from 'react'
import { dataPalette } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Flow between stages, where the width of a band is the quantity moving.
 *
 * **This is the chart for "where did it all go".** Traffic from source to
 * landing page to conversion, a budget from department to project, energy from
 * generation to loss — anything where a quantity splits and merges and the
 * interesting part is the *proportion* taking each route. A funnel shows the
 * same drop-off as a single column of shrinking bars; a Sankey shows where the
 * loss went, which is usually the actual question.
 *
 * **Nodes are placed in layers by longest path from a source, not by input
 * order.** Using the order the caller happened to list them in produces
 * backward-pointing links and a diagram that reads as a tangle. Layering by
 * depth guarantees every link runs left to right.
 *
 * **It requires a DAG and says so.** A cycle has no consistent layering — the
 * depth of a node in a loop is undefined — so a cycle is detected and reported
 * through `onError` rather than being drawn as something plausible but wrong.
 *
 * Bands are cubic Béziers with horizontal control points, which is what keeps
 * them readable where several cross: the eye follows a smooth curve through an
 * intersection and loses a polyline.
 */
export type SankeyNode = {
  id: string
  label: string
  color?: string
}

export type SankeyLink = {
  source: string
  target: string
  value: number
}

type SankeyProps = Omit<ComponentProps<'figure'>, 'height' | 'onError'> & {
  nodes: SankeyNode[]
  links: SankeyLink[]
  height?: number
  /** Width of a node column, in the 100-wide coordinate space. */
  nodeWidth?: number
  /** Vertical gap between nodes in the same layer. */
  nodePadding?: number
  valueFormat?: (value: number) => string
  showValues?: boolean
  onError?: (error: Error) => void
  emptyLabel?: string
  label?: string
}

const DEFAULT_FORMAT: (value: number) => string = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)

function Sankey({
  nodes,
  links,
  height = 320,
  nodeWidth = 3,
  nodePadding = 2,
  valueFormat = DEFAULT_FORMAT,
  showValues = true,
  onError,
  emptyLabel = 'No flows.',
  label = 'Sankey diagram',
  className,
  ...props
}: SankeyProps) {
  const titleId = useId()
  const [hovered, setHovered] = useState<string | null>(null)

  const model = useMemo(() => {
    if (nodes.length === 0 || links.length === 0) return null

    const byId = new Map(nodes.map((node) => [node.id, node]))
    const outgoing = new Map<string, SankeyLink[]>()
    const incoming = new Map<string, SankeyLink[]>()
    for (const node of nodes) {
      outgoing.set(node.id, [])
      incoming.set(node.id, [])
    }
    for (const link of links) {
      if (!byId.has(link.source) || !byId.has(link.target)) continue
      outgoing.get(link.source)?.push(link)
      incoming.get(link.target)?.push(link)
    }

    /**
     * Depth = longest path from any source. Computed with an explicit stack and
     * a colour marking, so a cycle is *detected* rather than overflowing.
     */
    const depth = new Map<string, number>()
    const state = new Map<string, 'open' | 'done'>()
    let cyclic = false

    const visit = (id: string): number => {
      if (state.get(id) === 'done') return depth.get(id) ?? 0
      if (state.get(id) === 'open') {
        cyclic = true
        return 0
      }
      state.set(id, 'open')
      const parents = incoming.get(id) ?? []
      const value = parents.length === 0 ? 0 : Math.max(...parents.map((link) => visit(link.source) + 1))
      state.set(id, 'done')
      depth.set(id, value)
      return value
    }
    for (const node of nodes) visit(node.id)
    if (cyclic) {
      return { kind: 'error' as const, error: new Error('Sankey input contains a cycle; it must be a DAG.') }
    }

    const maxDepth = Math.max(...[...depth.values()], 0)

    // Group into layers, then size each node by the larger of what flows in and
    // what flows out — a node that emits more than it receives is a source too.
    const layers: string[][] = Array.from({ length: maxDepth + 1 }, () => [])
    for (const node of nodes) layers[depth.get(node.id) ?? 0].push(node.id)

    const throughput = new Map<string, number>()
    for (const node of nodes) {
      const inSum = (incoming.get(node.id) ?? []).reduce((sum, link) => sum + link.value, 0)
      const outSum = (outgoing.get(node.id) ?? []).reduce((sum, link) => sum + link.value, 0)
      throughput.set(node.id, Math.max(inSum, outSum))
    }

    // The busiest layer sets the scale, so nothing overflows vertically.
    const layerTotals = layers.map(
      (layer) => layer.reduce((sum, id) => sum + (throughput.get(id) ?? 0), 0),
    )
    const busiest = Math.max(...layerTotals, 1)
    const tallestCount = Math.max(...layers.map((layer) => layer.length), 1)
    const usable = 100 - nodePadding * (tallestCount - 1)
    const scale = usable / busiest

    const placed = new Map<string, { x: number; y: number; height: number; layer: number }>()
    layers.forEach((layer, index) => {
      const total = layer.reduce((sum, id) => sum + (throughput.get(id) ?? 0) * scale, 0)
      const gaps = nodePadding * Math.max(0, layer.length - 1)
      let cursor = (100 - total - gaps) / 2
      for (const id of layer) {
        const nodeHeight = Math.max(0.8, (throughput.get(id) ?? 0) * scale)
        placed.set(id, {
          x: maxDepth === 0 ? 0 : (index / maxDepth) * (100 - nodeWidth),
          y: cursor,
          height: nodeHeight,
          layer: index,
        })
        cursor += nodeHeight + nodePadding
      }
    })

    // Stack the bands on each side of every node, in a stable order.
    const outCursor = new Map<string, number>()
    const inCursor = new Map<string, number>()
    const ribbons = links
      .filter((link) => placed.has(link.source) && placed.has(link.target))
      .map((link) => {
        const from = placed.get(link.source) as NonNullable<ReturnType<typeof placed.get>>
        const to = placed.get(link.target) as NonNullable<ReturnType<typeof placed.get>>
        const thickness = link.value * scale

        const sourceOffset = outCursor.get(link.source) ?? 0
        const targetOffset = inCursor.get(link.target) ?? 0
        outCursor.set(link.source, sourceOffset + thickness)
        inCursor.set(link.target, targetOffset + thickness)

        return {
          link,
          x1: from.x + nodeWidth,
          y1: from.y + sourceOffset,
          x2: to.x,
          y2: to.y + targetOffset,
          thickness: Math.max(0.4, thickness),
        }
      })

    return { kind: 'ok' as const, placed, ribbons, byId, throughput }
  }, [nodes, links, nodeWidth, nodePadding])

  if (model?.kind === 'error') {
    onError?.(model.error)
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {model.error.message}
      </figure>
    )
  }

  if (!model) {
    return (
      <figure className={cn('text-muted-foreground p-4 text-xs', className)} {...props}>
        {emptyLabel}
      </figure>
    )
  }

  const { placed, ribbons, byId, throughput } = model

  const colourFor = (id: string) => {
    const explicit = byId.get(id)?.color
    if (explicit) return explicit
    const index = [...placed.keys()].indexOf(id)
    return dataPalette[index % dataPalette.length].fill
  }

  const lit = (id: string) => !hovered || hovered === id

  return (
    <figure
      data-slot="sankey"
      className={cn('flex flex-col gap-2', className)}
      aria-labelledby={titleId}
      {...props}
    >
      <figcaption id={titleId} className="sr-only">
        {label}
      </figcaption>

      <div style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full">
          <g>
            {ribbons.map((ribbon, index) => {
              const mid = (ribbon.x1 + ribbon.x2) / 2
              const shown = lit(ribbon.link.source) && lit(ribbon.link.target)

              return (
                <path
                  key={index}
                  /*
                   * A filled ribbon, not a thick stroke.
                   *
                   * The plot is stretched with `preserveAspectRatio: none`, and
                   * a stroke under a non-uniform transform is scaled unevenly —
                   * the band would thicken or thin purely with the container's
                   * aspect ratio, which is a lie about the quantity. Two Béziers
                   * closed into a shape are filled, and fills transform exactly.
                   *
                   * Control points are horizontal so the band leaves and arrives
                   * flat, which is what keeps crossings followable.
                   */
                  d={`M${ribbon.x1} ${ribbon.y1}
                      C${mid} ${ribbon.y1}, ${mid} ${ribbon.y2}, ${ribbon.x2} ${ribbon.y2}
                      L${ribbon.x2} ${ribbon.y2 + ribbon.thickness}
                      C${mid} ${ribbon.y2 + ribbon.thickness}, ${mid} ${ribbon.y1 + ribbon.thickness}, ${ribbon.x1} ${ribbon.y1 + ribbon.thickness}
                      Z`}
                  fill={colourFor(ribbon.link.source)}
                  fillOpacity={shown ? 0.35 : 0.08}
                  onMouseEnter={() => setHovered(ribbon.link.source)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* One string: React cannot join multiple children into a <title>. */}
                  <title>
                    {`${byId.get(ribbon.link.source)?.label} → ${byId.get(
                      ribbon.link.target,
                    )?.label}: ${valueFormat(ribbon.link.value)}`}
                  </title>
                </path>
              )
            })}
          </g>

          <g>
            {[...placed.entries()].map(([id, position]) => (
              <rect
                key={id}
                x={position.x}
                y={position.y}
                width={nodeWidth}
                height={position.height}
                fill={colourFor(id)}
                opacity={lit(id) ? 1 : 0.3}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* One string: React cannot join multiple children into a <title>. */}
                <title>{`${byId.get(id)?.label}: ${valueFormat(throughput.get(id) ?? 0)}`}</title>
              </rect>
            ))}
          </g>
        </svg>
      </div>

      {/* Labels are HTML, positioned over the plot — text inside a stretched
          SVG is distorted by preserveAspectRatio:none. */}
      <ul className="flex list-none flex-wrap gap-x-3 gap-y-1">
        {[...placed.keys()].map((id) => (
          <li key={id} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: colourFor(id) }}
            />
            {byId.get(id)?.label}
            {showValues && (
              <span className="tabular-nums opacity-70">{valueFormat(throughput.get(id) ?? 0)}</span>
            )}
          </li>
        ))}
      </ul>
    </figure>
  )
}

export { Sankey }
export type { SankeyProps }
