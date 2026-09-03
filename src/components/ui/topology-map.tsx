import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A service dependency graph with health.
 *
 * Laid out in layers by dependency depth rather than by a force simulation. A
 * force layout puts the same architecture in a different place on every render,
 * which makes it useless as a thing to learn — and during an incident nobody
 * wants to re-find the database.
 *
 * Depth is computed by walking edges, with a visited set: service graphs have
 * cycles (an API that calls a worker that calls the API), and a naive recursion
 * over one hangs the tab.
 *
 * Edges carry the downstream node's health, so a red line means the thing it
 * points at is unhealthy — you follow the colour to the cause.
 */
export type TopologyNode = {
  id: string
  label: ReactNode
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  /** Ids this depends on. */
  dependsOn?: string[]
  meta?: ReactNode
}

const STATUS = {
  healthy: { fill: 'var(--green)', label: 'Healthy' },
  degraded: { fill: 'var(--amber)', label: 'Degraded' },
  down: { fill: 'var(--destructive)', label: 'Down' },
  unknown: { fill: 'var(--border)', label: 'Unknown' },
} as const

const NODE_WIDTH = 132
const NODE_HEIGHT = 44
const GAP_X = 56
const GAP_Y = 20

/** Longest path to a root, guarded against cycles. */
function computeDepths(nodes: TopologyNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const depths = new Map<string, number>()

  const visit = (id: string, seen: Set<string>): number => {
    if (depths.has(id)) return depths.get(id)!
    if (seen.has(id)) return 0
    const node = byId.get(id)
    if (!node?.dependsOn?.length) {
      depths.set(id, 0)
      return 0
    }

    const next = new Set(seen).add(id)
    const depth =
      1 + Math.max(...node.dependsOn.map((parent) => visit(parent, next)), -1)
    depths.set(id, depth)
    return depth
  }

  for (const node of nodes) visit(node.id, new Set())
  return depths
}

function TopologyMap({
  nodes,
  healthyLabel = 'All services healthy',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  nodes: TopologyNode[]
  /** Shown when nothing is degraded. */
  healthyLabel?: ReactNode
}) {
  const { positions, width, height } = useMemo(() => {
    const depths = computeDepths(nodes)
    const columns = new Map<number, TopologyNode[]>()

    for (const node of nodes) {
      const depth = depths.get(node.id) ?? 0
      columns.set(depth, [...(columns.get(depth) ?? []), node])
    }

    const placed = new Map<string, { x: number; y: number }>()
    let tallest = 0

    for (const [depth, column] of columns) {
      column.forEach((node, index) => {
        placed.set(node.id, {
          x: depth * (NODE_WIDTH + GAP_X),
          y: index * (NODE_HEIGHT + GAP_Y),
        })
      })
      tallest = Math.max(tallest, column.length)
    }

    return {
      positions: placed,
      width: (Math.max(...columns.keys(), 0) + 1) * (NODE_WIDTH + GAP_X) - GAP_X,
      height: tallest * (NODE_HEIGHT + GAP_Y) - GAP_Y,
    }
  }, [nodes])

  return (
    <div
      data-slot="topology-map"
      className={cn(surface, radius.surface, 'w-full overflow-x-auto p-4', className)}
      {...props}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Service topology: ${nodes
          .map((node) => `${typeof node.label === 'string' ? node.label : node.id} ${node.status}`)
          .join(', ')}`}
        className="min-w-full"
      >
        {nodes.flatMap((node) =>
          (node.dependsOn ?? []).map((parentId) => {
            const from = positions.get(parentId)
            const to = positions.get(node.id)
            if (!from || !to) return null

            const x1 = from.x + NODE_WIDTH
            const y1 = from.y + NODE_HEIGHT / 2
            const x2 = to.x
            const y2 = to.y + NODE_HEIGHT / 2
            const mid = (x1 + x2) / 2

            return (
              <path
                key={`${parentId}-${node.id}`}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                // The edge takes the downstream node's health: follow the red.
                stroke={STATUS[node.status].fill}
                strokeWidth={1.5}
                opacity={node.status === 'healthy' ? 0.3 : 0.7}
              />
            )
          }),
        )}

        {nodes.map((node) => {
          const position = positions.get(node.id)
          if (!position) return null
          const status = STATUS[node.status]

          return (
            <g key={node.id} transform={`translate(${position.x}, ${position.y})`}>
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={10}
                fill="var(--card)"
                stroke={status.fill}
                strokeWidth={node.status === 'healthy' ? 1 : 2}
              />
              <circle cx={14} cy={NODE_HEIGHT / 2} r={4} fill={status.fill} />
              <text
                x={26}
                y={NODE_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-[var(--foreground)] text-[11px] font-medium"
              >
                {typeof node.label === 'string' ? node.label : node.id}
              </text>
            </g>
          )
        })}
      </svg>

      <ul className="mt-3 flex list-none flex-wrap gap-x-4 gap-y-1.5">
        {nodes
          .filter((node) => node.status !== 'healthy')
          .map((node) => (
            <li key={node.id}>
              <Tooltip content={node.meta ?? STATUS[node.status].label}>
                <span
                  tabIndex={0}
                  className="focus-visible:ring-ring/50 flex items-center gap-1.5 text-xs outline-none focus-visible:ring-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full [corner-shape:round]"
                    style={{ backgroundColor: STATUS[node.status].fill }}
                  />
                  <span className="text-muted-foreground">
                    {typeof node.label === 'string' ? node.label : node.id}
                  </span>
                  <span className="font-medium">{STATUS[node.status].label}</span>
                </span>
              </Tooltip>
            </li>
          ))}
        {nodes.every((node) => node.status === 'healthy') && (
          <li className="text-muted-foreground text-xs">{healthyLabel}</li>
        )}
      </ul>
    </div>
  )
}

export { TopologyMap, computeDepths }
