import {
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useForceGraph } from '@/lib/use-force-graph'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Entities and the named relations between them.
 *
 * The distinction from `NoteGraph`, which shares the same layout: a note graph
 * answers *what is connected*, and every edge means the same thing — "links
 * to". A knowledge graph answers *how* things are connected, and the edge label
 * carries as much meaning as the nodes. "Ada — **founded** → Astralyx" and
 * "Ada — **left** → Astralyx" are the same two circles and the same line.
 *
 * So relations are labelled and **directed**, drawn with an arrowhead, because
 * `employs` and `employed by` are not the same fact and a knowledge graph that
 * loses direction is a set of vague associations.
 *
 * Entities are drawn as labelled pills rather than circles. A knowledge graph
 * is read entity-first — you are looking for *Astralyx*, not for a hub — and a
 * circle with a caption underneath makes you match shapes to text. This is
 * denser and it is why these graphs stay smaller than note vaults.
 */
export type Entity = {
  id: string
  label: string
  /** 'person', 'company', 'concept' — colours the pill and the legend. */
  type?: string
}

export type Relation = {
  source: string
  target: string
  /** The verb. The reason this component exists. */
  label?: string
}

type KnowledgeGraphProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  entities: Entity[]
  relations: Relation[]
  onSelect?: (entity: Entity) => void
  selectedId?: string
  height?: number | string
  /** Hide relation labels when the graph is dense enough that they collide. */
  showRelationLabels?: boolean
  colorFor?: (type: string | undefined) => string
  emptyLabel?: string
  label?: string
}

const TYPE_COLORS = [
  'var(--violet-soft)',
  'var(--blue-soft)',
  'var(--green-soft)',
  'var(--amber-soft)',
  'var(--cyan-soft)',
]
const TYPE_INK = [
  'var(--violet-soft-foreground)',
  'var(--blue-soft-foreground)',
  'var(--green-soft-foreground)',
  'var(--amber-soft-foreground)',
  'var(--cyan-soft-foreground)',
]

function KnowledgeGraph({
  entities,
  relations,
  onSelect,
  selectedId,
  height = 460,
  showRelationLabels = true,
  colorFor,
  emptyLabel = 'Nothing in this graph yet.',
  label = 'Knowledge graph',
  className,
  ...props
}: KnowledgeGraphProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 720, height: 460 })
  const [hovered, setHovered] = useState<string | null>(null)
  const dragging = useRef<string | null>(null)
  // `useId`, not a random string: a random id differs between the server
  // render and the hydrated one, which is a mismatch React will replace the
  // whole subtree over.
  const arrowId = `arrow-${useId().replace(/:/g, '')}`

  const links = useMemo(
    () => relations.map((relation) => ({ source: relation.source, target: relation.target })),
    [relations],
  )
  // Longer links than a note graph: the labels sit on them and need the room.
  const { positions, drag, release } = useForceGraph(entities, links, {
    ...size,
    linkDistance: 130,
    charge: 4200,
  })

  const types = useMemo(
    () => [...new Set(entities.map((entity) => entity.type).filter(Boolean))] as string[],
    [entities],
  )

  const fill = (type: string | undefined) =>
    colorFor?.(type) ?? (type ? TYPE_COLORS[types.indexOf(type) % TYPE_COLORS.length] : 'var(--muted)')
  const ink = (type: string | undefined) =>
    type ? TYPE_INK[types.indexOf(type) % TYPE_INK.length] : 'var(--muted-foreground)'

  const at = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions])

  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const entity of entities) map.set(entity.id, new Set())
    for (const relation of relations) {
      map.get(relation.source)?.add(relation.target)
      map.get(relation.target)?.add(relation.source)
    }
    return map
  }, [entities, relations])

  const lit = (id: string) =>
    !hovered || hovered === id || neighbours.get(hovered)?.has(id) === true

  function pointerToBox(event: ReactPointerEvent) {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return { x: 0, y: 0 }
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  return (
    <div
      data-slot="knowledge-graph"
      ref={(node) => {
        boxRef.current = node
        if (node) {
          const box = node.getBoundingClientRect()
          if (Math.abs(box.width - size.width) > 1 || Math.abs(box.height - size.height) > 1) {
            setSize({ width: box.width, height: box.height })
          }
        }
      }}
      className={cn('relative overflow-hidden', surface, radius.surface, className)}
      style={{ height }}
      onPointerMove={(event) => {
        if (!dragging.current) return
        const point = pointerToBox(event)
        drag(dragging.current, point.x, point.y)
      }}
      onPointerUp={() => {
        if (dragging.current) release(dragging.current)
        dragging.current = null
      }}
      onPointerLeave={() => {
        if (dragging.current) release(dragging.current)
        dragging.current = null
        setHovered(null)
      }}
      {...props}
    >
      {entities.length === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <svg className="h-full w-full touch-none" role="img" aria-label={label}>
          <defs>
            {/* Scoped per instance: a document-wide id would be reused by a
                second graph on the page and inherit the first one's colour. */}
            <marker
              id={arrowId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-border" />
            </marker>
          </defs>

          <g>
            {relations.map((relation, index) => {
              const a = at.get(relation.source)
              const b = at.get(relation.target)
              if (!a || !b) return null
              const shown = lit(relation.source) && lit(relation.target)

              // Stop the line short of the pill so the arrowhead is not buried
              // underneath it.
              const dx = b.x - a.x
              const dy = b.y - a.y
              const distance = Math.hypot(dx, dy) || 1
              const inset = 44
              const x2 = b.x - (dx / distance) * inset
              const y2 = b.y - (dy / distance) * inset

              return (
                <g key={index} opacity={shown ? 1 : 0.1}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={x2}
                    y2={y2}
                    className="stroke-border"
                    strokeWidth={1.2}
                    markerEnd={`url(#${arrowId})`}
                  />
                  {showRelationLabels && relation.label && (
                    <text
                      x={(a.x + x2) / 2}
                      y={(a.y + y2) / 2 - 4}
                      textAnchor="middle"
                      className="fill-muted-foreground pointer-events-none text-[9px]"
                    >
                      {relation.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          <g>
            {entities.map((entity) => {
              const position = at.get(entity.id)
              if (!position) return null

              const shown = lit(entity.id)
              const selected = entity.id === selectedId
              // Enough for the label; SVG cannot measure text before layout, so
              // it is estimated from the character count.
              const width = Math.max(56, entity.label.length * 6.6 + 18)

              return (
                <g
                  key={entity.id}
                  transform={`translate(${position.x} ${position.y})`}
                  opacity={shown ? 1 : 0.12}
                  className={cn(onSelect && 'cursor-pointer')}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    dragging.current = entity.id
                  }}
                  onPointerEnter={() => setHovered(entity.id)}
                  onClick={() => onSelect?.(entity)}
                >
                  <rect
                    x={-width / 2}
                    y={-13}
                    width={width}
                    height={26}
                    rx={13}
                    fill={fill(entity.type)}
                    stroke={selected ? 'var(--primary)' : 'transparent'}
                    strokeWidth={selected ? 2 : 0}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none text-[10px] font-medium"
                    fill={ink(entity.type)}
                  >
                    {entity.label}
                  </text>
                  <title>
                    {entity.label}
                    {entity.type ? ` — ${entity.type}` : ''}
                  </title>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {types.length > 0 && (
        <ul className="absolute start-3 bottom-3 flex list-none flex-wrap gap-x-3 gap-y-1">
          {types.map((type) => (
            <li key={type} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: ink(type) }}
              />
              {type}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { KnowledgeGraph }
export type { KnowledgeGraphProps }
