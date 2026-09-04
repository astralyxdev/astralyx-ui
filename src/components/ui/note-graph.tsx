import {
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useForceGraph, type ForceLink } from '@/lib/use-force-graph'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A vault of linked notes, laid out by force.
 *
 * The Obsidian-shaped view: notes as circles, links as lines, and the thing you
 * are looking for found by shape rather than by name.
 *
 * **Size is degree, not recency or length.** A hub with thirty backlinks is the
 * note the vault is organised around, and it should be the one your eye lands
 * on. Sizing by word count or edit date produces a picture of your typing
 * habits instead of your structure.
 *
 * **Orphans are drawn, and drawn differently.** A note nothing links to is the
 * most actionable thing this view can surface — it is either miscategorised or
 * forgotten — so hiding unconnected nodes to tidy the picture removes its main
 * use. They sit in a ring at the edge, hollow.
 *
 * **Hovering dims everything except the neighbourhood.** At a few hundred nodes
 * the hairball is unreadable at rest; focus is what makes it legible, and it
 * costs one CSS class rather than a second layout.
 *
 * The layout stops once it settles — see `useForceGraph`. Dragging a note pins
 * it, which is how you pull a cluster apart to read it.
 */
export type Note = {
  id: string
  title: string
  /** Colours the node. A folder, a tag, whatever you group by. */
  group?: string
  /** Overrides the degree-derived size. */
  size?: number
}

type NoteGraphProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  notes: Note[]
  links: ForceLink[]
  onSelect?: (note: Note) => void
  selectedId?: string
  height?: number | string
  /** Show every title, rather than only hubs and the hovered neighbourhood. */
  showAllLabels?: boolean
  /** Degree at or above which a title is always drawn. */
  labelFrom?: number
  /** Map a group to a CSS colour. */
  colorFor?: (group: string | undefined) => string
  orphanLabel?: string
  emptyLabel?: string
  label?: string
}

const GROUP_COLORS = [
  'var(--blue-soft-foreground)',
  'var(--violet-soft-foreground)',
  'var(--cyan-soft-foreground)',
  'var(--amber-soft-foreground)',
  'var(--green-soft-foreground)',
]

function NoteGraph({
  notes,
  links,
  onSelect,
  selectedId,
  height = 460,
  showAllLabels = false,
  labelFrom = 4,
  colorFor,
  orphanLabel = 'no links',
  emptyLabel = 'This vault has no notes.',
  label = 'Note graph',
  className,
  ...props
}: NoteGraphProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 720, height: 460 })
  const [hovered, setHovered] = useState<string | null>(null)
  const dragging = useRef<string | null>(null)

  const { positions, drag, release } = useForceGraph(notes, links, size)

  /** How many links touch each note, and who its neighbours are. */
  const { degree, neighbours } = useMemo(() => {
    const degree = new Map<string, number>()
    const neighbours = new Map<string, Set<string>>()

    for (const note of notes) {
      degree.set(note.id, 0)
      neighbours.set(note.id, new Set())
    }
    for (const link of links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1)
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1)
      neighbours.get(link.source)?.add(link.target)
      neighbours.get(link.target)?.add(link.source)
    }
    return { degree, neighbours }
  }, [notes, links])

  const groups = useMemo(
    () => [...new Set(notes.map((note) => note.group).filter(Boolean))] as string[],
    [notes],
  )

  const colour = (group: string | undefined) =>
    colorFor?.(group) ??
    (group ? GROUP_COLORS[groups.indexOf(group) % GROUP_COLORS.length] : 'var(--muted-foreground)')

  const at = useMemo(
    () => new Map(positions.map((position) => [position.id, position])),
    [positions],
  )

  /** Dimmed unless it is the hovered note or one of its neighbours. */
  const lit = (id: string) =>
    !hovered || hovered === id || neighbours.get(hovered)?.has(id) === true

  function pointerToBox(event: ReactPointerEvent) {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return { x: 0, y: 0 }
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  return (
    <div
      data-slot="note-graph"
      ref={(node) => {
        boxRef.current = node
        if (node) {
          const box = node.getBoundingClientRect()
          // Only on a real change, or this loops.
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
      {notes.length === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <svg className="h-full w-full touch-none" role="img" aria-label={label}>
          <g>
            {links.map((link, index) => {
              const a = at.get(link.source)
              const b = at.get(link.target)
              if (!a || !b) return null
              const shown = lit(link.source) && lit(link.target)

              return (
                <line
                  key={index}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className="stroke-border"
                  strokeWidth={hovered && shown ? 1.4 : 1}
                  opacity={shown ? 0.9 : 0.12}
                />
              )
            })}
          </g>

          <g>
            {notes.map((note) => {
              const position = at.get(note.id)
              if (!position) return null

              const links = degree.get(note.id) ?? 0
              // Degree, damped: a hub with thirty backlinks should read as
              // bigger than one with three without swamping the canvas.
              const r = note.size ?? Math.min(18, 4 + Math.sqrt(links) * 2.6)
              const orphan = links === 0
              const shown = lit(note.id)
              const selected = note.id === selectedId
              const labelled =
                showAllLabels || selected || hovered === note.id || links >= labelFrom

              return (
                <g
                  key={note.id}
                  transform={`translate(${position.x} ${position.y})`}
                  opacity={shown ? 1 : 0.15}
                  className={cn(onSelect && 'cursor-pointer')}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    dragging.current = note.id
                    ;(event.target as Element).releasePointerCapture?.(event.pointerId)
                  }}
                  onPointerEnter={() => setHovered(note.id)}
                  onClick={() => onSelect?.(note)}
                >
                  <circle
                    r={r}
                    // Hollow for an orphan: the note nothing links to is the
                    // most actionable thing here, so it must not blend in.
                    fill={orphan ? 'transparent' : colour(note.group)}
                    stroke={
                      selected
                        ? 'var(--primary)'
                        : orphan
                          ? colour(note.group)
                          : 'transparent'
                    }
                    strokeWidth={selected ? 2.5 : orphan ? 1.5 : 0}
                    strokeDasharray={orphan && !selected ? '3 3' : undefined}
                  />
                  {labelled && (
                    <text
                      y={r + 12}
                      textAnchor="middle"
                      className="fill-foreground pointer-events-none text-[10px]"
                    >
                      {note.title}
                    </text>
                  )}
                  {/* One string: React cannot join multiple children into a <title>. */}
                  <title>{`${note.title}${orphan ? ` — ${orphanLabel}` : ` — ${links}`}`}</title>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {groups.length > 0 && (
        <ul className="absolute start-3 bottom-3 flex list-none flex-wrap gap-x-3 gap-y-1">
          {groups.map((group) => (
            <li key={group} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: colour(group) }}
              />
              {group}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { NoteGraph }
export type { NoteGraphProps }
