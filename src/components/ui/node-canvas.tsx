import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A pannable, zoomable canvas of draggable nodes and the edges between them.
 *
 * The substrate for anything graph-shaped: an agent pipeline, a retrieval
 * chain, a build DAG, a state machine. Nothing here knows what a node *means* —
 * `renderNode` draws whatever you like inside the box, and the canvas only owns
 * position, selection and the wires.
 *
 * **Why it is not a `<canvas>`.** Nodes are real DOM, so their contents stay
 * selectable, focusable and readable by a screen reader, and you can put a
 * Badge or a Switch inside one without reimplementing it in a 2D context. Only
 * the edges are drawn, in one SVG layer underneath.
 *
 * **Coordinates.** Nodes are positioned in graph space; the whole layer is
 * moved and scaled by a single `transform` on a wrapper, so panning and zooming
 * cost one style write rather than one per node. `toGraph` converts a pointer
 * position back through that transform — without it, dragging a node while
 * zoomed moves it by the wrong distance, which is the classic bug in a
 * hand-rolled canvas.
 *
 * **Pointer capture, not window listeners.** A drag that leaves the element
 * still needs its moves; capture routes them back without a global handler that
 * outlives the gesture and fires into an unmounted component.
 *
 * **Keyboard.** Every node is a tab stop, arrows nudge the focused node, and
 * shift-arrow nudges it by ten. A graph editor reachable only by mouse is not
 * an editor for everyone, and the arrow-key path is also the precise one.
 */
export type CanvasNode = {
  id: string
  x: number
  y: number
  /** Falls back to the canvas-level `nodeWidth`. */
  width?: number
  label?: ReactNode
  /** Anything: a kind, a status, your own payload. Passed back to renderNode. */
  data?: unknown
  /** Off for a terminal step that nothing may follow. Defaults to on. */
  connectable?: boolean
  /** Off to pin a node in place while the rest of the graph stays draggable. */
  draggable?: boolean
  /** Off for a node the graph cannot exist without — a trigger, an entry point. */
  deletable?: boolean
}

export type CanvasEdge = {
  id: string
  from: string
  to: string
  label?: ReactNode
  /** Draws dashed and animated — for a path that is speculative or inactive. */
  dashed?: boolean
}

type Point = { x: number; y: number }

type NodeCanvasProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  nodes: CanvasNode[]
  edges?: CanvasEdge[]
  /** Draws a node's contents. Defaults to its label. */
  renderNode?: (node: CanvasNode, state: { selected: boolean }) => ReactNode
  /** Omit to make the canvas read-only — nodes stay focusable but will not move. */
  onNodesChange?: (nodes: CanvasNode[]) => void
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Uniform node width in graph units. Individual nodes may override it. */
  nodeWidth?: number
  /** Background dot spacing in graph units. `0` turns the grid off. */
  grid?: number
  /** Clamp for the wheel zoom. */
  minZoom?: number
  maxZoom?: number
  /**
   * Wheel over the canvas zooms, and the page stays put.
   *
   * Off restores normal scrolling through the canvas — the right choice for a
   * read-only graph sitting in the middle of a long document, where trapping
   * the wheel is a trap rather than a feature.
   */
  zoomOnWheel?: boolean
  /** Start position and scale of the viewport. */
  defaultPan?: Point
  defaultZoom?: number
  /** Canvas height. Graphs need a stated box; they have no intrinsic one. */
  height?: number | string
  /** Accessible name for the graph region. */
  label?: string
  /** How far an arrow key moves a node, in graph units. */
  nudge?: number

  /**
   * Add a node at a point on the canvas — fired by a double-click on empty
   * space, in graph coordinates. Omit and double-click does nothing.
   */
  onAddNode?: (position: Point) => void
  /**
   * Something was dragged in from outside and dropped. `payload` is whatever
   * `NodePalette` (or your own drag source) put on the dataTransfer.
   */
  onDropNode?: (payload: string, position: Point) => void
  /**
   * Wire two nodes together, by dragging from a node's trailing port to
   * another node. Omit and the ports are not rendered.
   */
  onConnect?: (from: string, to: string) => void
  /** Remove a node — fired on Backspace/Delete with a node focused. */
  onRemoveNode?: (id: string) => void
  /**
   * The `+` on a node: create a new node already wired to this one, at a point
   * to its right. Building a chain is the common case by a wide margin, and
   * making it one click beats drag-a-node-then-drag-a-wire every time.
   */
  onAddConnected?: (fromId: string, position: Point) => void
  /** Accessible name for that button. Receives the source node's label. */
  addConnectedLabel?: string
}

/** The dataTransfer type `NodePalette` writes and the canvas reads. */
export const NODE_DRAG_TYPE = 'application/x-astralyx-node'

/**
 * A cubic bezier with horizontal control arms.
 *
 * Arms scale with the horizontal gap so short hops stay tight and long ones
 * bow out, and never fall below a floor — two nodes stacked vertically have
 * almost no horizontal distance, and a straight line between their side ports
 * reads as a glitch rather than a connection.
 */
function edgePath(from: Point, to: Point) {
  const arm = Math.max(40, Math.abs(to.x - from.x) * 0.5)
  return `M ${from.x} ${from.y} C ${from.x + arm} ${from.y}, ${to.x - arm} ${to.y}, ${to.x} ${to.y}`
}

function NodeCanvas({
  nodes,
  edges = [],
  renderNode,
  onNodesChange,
  selectedId,
  onSelect,
  nodeWidth = 180,
  grid = 24,
  minZoom = 0.35,
  maxZoom = 2.5,
  zoomOnWheel = true,
  defaultPan,
  defaultZoom = 1,
  height = 420,
  label = 'Node graph',
  nudge = 8,
  onAddNode,
  onDropNode,
  onConnect,
  onRemoveNode,
  onAddConnected,
  addConnectedLabel = 'Add a connected step',
  className,
  ...props
}: NodeCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState<Point>(defaultPan ?? { x: 40, y: 40 })
  const [zoom, setZoom] = useState(defaultZoom)
  const patternId = useId()

  // Gesture state. A ref, not state: it changes on every pointermove and none
  // of it needs to paint on its own.
  const drag = useRef<
    | { kind: 'pan'; pointer: Point; origin: Point }
    | { kind: 'node'; id: string; pointer: Point; origin: Point }
    | null
  >(null)

  /**
   * Measured node heights, so an edge lands on the vertical centre of a box
   * whose contents you chose.
   *
   * State, not a ref: the edges are drawn during render from these numbers, and
   * a ref read at render time is both a compiler bail-out and a real bug — a
   * node that grows would keep its wire attached where it used to end.
   */
  const [heights, setHeights] = useState<Record<string, number>>({})

  // The wire being dragged out of a port, in graph units. State rather than a
  // ref because it paints on every move.
  const [wire, setWire] = useState<{ from: string; to: Point } | null>(null)

  /** Pointer position in graph units, undoing pan and zoom. */
  const toGraph = useCallback(
    (event: { clientX: number; clientY: number }): Point => {
      const box = viewportRef.current?.getBoundingClientRect()
      if (!box) return { x: 0, y: 0 }
      return {
        x: (event.clientX - box.left - pan.x) / zoom,
        y: (event.clientY - box.top - pan.y) / zoom,
      }
    },
    [pan.x, pan.y, zoom],
  )

  function moveNode(id: string, next: Point) {
    onNodesChange?.(
      nodes.map((node) => (node.id === id ? { ...node, x: next.x, y: next.y } : node)),
    )
  }

  function onPointerDownBackground(event: ReactPointerEvent<HTMLDivElement>) {
    // Only a primary press on the background pans; a press that started on a
    // node is that node's drag.
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      kind: 'pan',
      pointer: { x: event.clientX, y: event.clientY },
      origin: { ...pan },
    }
    onSelect?.(null)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (wire) {
      setWire({ from: wire.from, to: toGraph(event) })
      return
    }

    const gesture = drag.current
    if (!gesture) return

    if (gesture.kind === 'pan') {
      setPan({
        x: gesture.origin.x + (event.clientX - gesture.pointer.x),
        y: gesture.origin.y + (event.clientY - gesture.pointer.y),
      })
      return
    }

    // Divided by zoom: at 0.5x, a 100px pointer move is 200 graph units.
    moveNode(gesture.id, {
      x: gesture.origin.x + (event.clientX - gesture.pointer.x) / zoom,
      y: gesture.origin.y + (event.clientY - gesture.pointer.y) / zoom,
    })
  }

  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (wire) {
      // Pointer capture means the event target is the viewport, not whatever is
      // under the cursor — so ask the document what is actually there.
      const under = document.elementFromPoint(event.clientX, event.clientY)
      const dropped = under?.closest<HTMLElement>('[data-node-id]')
      const target = dropped?.dataset.nodeId
      if (target && target !== wire.from) onConnect?.(wire.from, target)
      setWire(null)
    }

    drag.current = null
  }

  /** Zoom toward the pointer, so the point under the cursor stays put. */
  // Read inside the native listener below, so it can stay attached across
  // zooms instead of being torn down and rebuilt on every wheel tick.
  const view = useRef({ pan, zoom })
  view.current = { pan, zoom }

  /**
   * Zoom on wheel, and keep the page still while doing it.
   *
   * Attached natively rather than through `onWheel`, because React registers
   * its wheel listener at the root as **passive** — `preventDefault()` inside a
   * React `onWheel` handler does nothing but log a warning, and the page scrolls
   * away underneath the canvas you are trying to zoom. A non-passive listener on
   * the element itself is the only way to hold the page still.
   *
   * The zoom is anchored to the pointer: the graph point under the cursor is the
   * one that stays put, which is what makes zooming feel like moving a camera
   * rather than resizing a picture.
   */
  useEffect(() => {
    const node = viewportRef.current
    if (!node || !zoomOnWheel) return

    function onWheel(event: WheelEvent) {
      // A trackpad pinch arrives as ctrl+wheel; both mean zoom here, and both
      // must be stopped from reaching the page.
      event.preventDefault()

      const box = node!.getBoundingClientRect()
      const { pan: currentPan, zoom: currentZoom } = view.current

      const next = Math.min(
        maxZoom,
        Math.max(minZoom, currentZoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08)),
      )
      if (next === currentZoom) return

      const px = event.clientX - box.left
      const py = event.clientY - box.top
      const ratio = next / currentZoom

      setPan({
        x: px - (px - currentPan.x) * ratio,
        y: py - (py - currentPan.y) * ratio,
      })
      setZoom(next)
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [maxZoom, minZoom, zoomOnWheel])

  const widthOf = (node: CanvasNode) => node.width ?? nodeWidth
  // 56 is the height of a one-line node, used until the real one is measured.
  const heightOf = (node: CanvasNode) => heights[node.id] ?? 56

  const measure = useCallback((id: string, element: HTMLElement | null) => {
    if (!element) return
    const next = element.offsetHeight
    // Guarded, or every commit schedules another render with the same numbers.
    setHeights((current) => (current[id] === next ? current : { ...current, [id]: next }))
  }, [])

  /** Edges leave the right edge of the source and enter the left of the target. */
  function anchors(edge: CanvasEdge) {
    const from = nodes.find((node) => node.id === edge.from)
    const to = nodes.find((node) => node.id === edge.to)
    if (!from || !to) return null
    return {
      start: { x: from.x + widthOf(from), y: from.y + heightOf(from) / 2 },
      end: { x: to.x, y: to.y + heightOf(to) / 2 },
    }
  }

  return (
    <div
      data-slot="node-canvas"
      className={cn('relative overflow-hidden', surface, radius.surface, className)}
      style={{ height }}
      {...props}
    >
      <div
        ref={viewportRef}
        role="application"
        aria-label={label}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDownBackground}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onDoubleClick={(event) => {
          if (!onAddNode) return
          onAddNode(toGraph(event))
        }}
        // Both handlers are required: without `onDragOver` calling
        // preventDefault, the browser refuses the drop and `onDrop` never runs.
        onDragOver={(event) => {
          if (onDropNode) event.preventDefault()
        }}
        onDrop={(event) => {
          if (!onDropNode) return
          event.preventDefault()
          const payload = event.dataTransfer.getData(NODE_DRAG_TYPE)
          if (payload) onDropNode(payload, toGraph(event))
        }}
      >
        {grid > 0 && (
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <pattern
                id={patternId}
                width={grid * zoom}
                height={grid * zoom}
                patternUnits="userSpaceOnUse"
                // Offset by the pan so the grid travels with the graph rather
                // than sitting still under it.
                x={pan.x}
                y={pan.y}
              >
                <circle cx={1} cy={1} r={1} className="fill-border" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
          </svg>
        )}

        {/* Edges under nodes, in the same transformed space. `overflow-visible`
            matters: paths routinely run outside the SVG's own box. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <g style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {edges.map((edge) => {
              const points = anchors(edge)
              if (!points) return null
              return (
                <path
                  key={edge.id}
                  d={edgePath(points.start, points.end)}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray={edge.dashed ? '4 4' : undefined}
                  className="stroke-border"
                />
              )
            })}

            {/* The wire in flight. Drawn from the source port to the pointer,
                so a connection you are making looks like the ones you made. */}
            {wire &&
              (() => {
                const from = nodes.find((node) => node.id === wire.from)
                if (!from) return null
                const start = {
                  x: from.x + widthOf(from),
                  y: from.y + heightOf(from) / 2,
                }
                return (
                  <path
                    d={edgePath(start, wire.to)}
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    className="stroke-primary"
                  />
                )
              })()}
          </g>
        </svg>

        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {nodes.map((node) => {
            const selected = node.id === selectedId
            return (
              <div
                key={node.id}
                ref={(element) => measure(node.id, element)}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                data-selected={selected}
                data-node-id={node.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: widthOf(node),
                }}
                className={cn(
                  'group bg-card border-border border p-3 text-start text-sm',
                  radius.control,
                  focusRing,
                  onNodesChange && node.draggable !== false && 'cursor-grab active:cursor-grabbing',
                  selected ? 'border-primary ring-ring/40 ring-2' : 'hover:border-foreground/25',
                )}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  // The background would otherwise start a pan underneath.
                  event.stopPropagation()
                  onSelect?.(node.id)
                  if (!onNodesChange || node.draggable === false) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  drag.current = {
                    kind: 'node',
                    id: node.id,
                    pointer: { x: event.clientX, y: event.clientY },
                    origin: { x: node.x, y: node.y },
                  }
                }}
                onPointerMove={onPointerMove}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect?.(node.id)
                    return
                  }
                  if (
                    onRemoveNode &&
                    node.deletable !== false &&
                    (event.key === 'Backspace' || event.key === 'Delete')
                  ) {
                    event.preventDefault()
                    onRemoveNode(node.id)
                    return
                  }
                  if (!onNodesChange) return

                  const step = event.shiftKey ? nudge * 10 : nudge
                  const delta =
                    event.key === 'ArrowLeft'
                      ? { x: -step, y: 0 }
                      : event.key === 'ArrowRight'
                        ? { x: step, y: 0 }
                        : event.key === 'ArrowUp'
                          ? { x: 0, y: -step }
                          : event.key === 'ArrowDown'
                            ? { x: 0, y: step }
                            : null
                  if (!delta) return

                  event.preventDefault()
                  moveNode(node.id, { x: node.x + delta.x, y: node.y + delta.y })
                }}
              >
                {renderNode ? renderNode(node, { selected }) : node.label}

                {onConnect && node.connectable !== false && (
                  <>
                    {/* Target. A plain div, not a button: it is a drop area for
                        a pointer gesture, and the keyboard path to connecting
                        belongs in the panel beside the canvas, not here. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'bg-card border-border absolute top-1/2 -start-1.5 size-3 -translate-y-1/2 rounded-full border',
                        wire && wire.from !== node.id && 'border-primary bg-primary/20',
                      )}
                    />
                    <span
                      aria-hidden="true"
                      title="Drag to connect"
                      className={cn(
                        'bg-card border-border absolute top-1/2 -end-1.5 size-3 -translate-y-1/2 cursor-crosshair rounded-full border',
                        'hover:border-primary hover:bg-primary/20',
                      )}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        // Capture on the viewport, so the wire keeps tracking
                        // once the pointer leaves this 12px dot.
                        viewportRef.current?.setPointerCapture(event.pointerId)
                        setWire({ from: node.id, to: toGraph(event) })
                      }}
                    />

                    {onAddConnected && (
                      // A real button, so building a chain has a keyboard path
                      // even though dragging a wire does not. Shown on hover,
                      // focus, or while selected — a persistent one on every
                      // node turns a busy graph into a field of plus signs.
                      <button
                        type="button"
                        aria-label={addConnectedLabel}
                        className={cn(
                          'bg-card border-border text-muted-foreground absolute top-1/2 -end-8 flex size-5 -translate-y-1/2',
                          'items-center justify-center rounded-full border text-sm leading-none',
                          'hover:border-primary hover:text-foreground',
                          'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
                          'motion-reduce:transition-none',
                          selected && 'opacity-100',
                          focusRing,
                        )}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation()
                          onAddConnected(node.id, {
                            x: node.x + widthOf(node) + 80,
                            y: node.y,
                          })
                        }}
                      >
                        +
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * The tray of things you can drag onto a canvas.
 *
 * Uses HTML drag-and-drop rather than the pointer gestures the canvas uses
 * internally, because this drag crosses element boundaries and may leave the
 * window entirely — that is exactly what the native API is for, and it gives
 * the drag image and the cursor affordances for free.
 *
 * Each item is a `<button>`, so the palette is not a mouse-only feature: the
 * canvas takes `onAddNode` for a double-click, and clicking a palette item
 * calls `onPick`, which is the keyboard path to the same result.
 */
function NodePalette({
  items,
  onPick,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  items: { id: string; label: ReactNode; hint?: ReactNode }[]
  /** Clicked rather than dragged — place it wherever your layout prefers. */
  onPick?: (id: string) => void
}) {
  return (
    <div
      data-slot="node-palette"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(NODE_DRAG_TYPE, item.id)
            event.dataTransfer.effectAllowed = 'copy'
          }}
          onClick={() => onPick?.(item.id)}
          className={cn(
            'border-border bg-card hover:border-foreground/25 flex cursor-grab flex-col gap-0.5',
            'border p-2.5 text-start active:cursor-grabbing',
            radius.control,
            focusRing,
          )}
        >
          <span className="text-sm font-medium">{item.label}</span>
          {item.hint && (
            <span className="text-muted-foreground text-xs">{item.hint}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export { NodeCanvas, NodePalette, edgePath }
export type { NodeCanvasProps }
