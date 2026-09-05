import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
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
 * you register node types, and the canvas only owns position, selection and the
 * wires.
 *
 * **Why it is not a `<canvas>`.** Nodes are real DOM, so their contents stay
 * selectable, focusable and readable by a screen reader, and a node can be a
 * whole component — a form, a chart, a query builder — rather than a picture of
 * one. Only the edges are drawn, in one SVG layer underneath.
 *
 * **Event ownership.** A node's contents belong to whoever wrote them, so every
 * gesture here asks *what was actually hit* before acting on it. Dragging skips
 * controls and anything marked `data-nodrag`; the wheel skips a scrollable
 * region; keys are only the canvas's when the node itself has focus, not a
 * field inside it. Without those checks a text input inside a node cannot take
 * a space, a Backspace deletes the node instead of a character, and dragging to
 * select text moves the node — which is why this used to need a
 * `stopPropagation` wrapper that made the region undraggable in exchange.
 *
 * **A drag starts on movement, not on contact.** Nothing is captured until the
 * pointer travels `dragThreshold` pixels. A click stays a click, so buttons,
 * switches and links inside a node work, and the pointer capture that a slider
 * or a colour picker takes for itself is never stolen.
 *
 * **Coordinates.** Nodes are positioned in graph space; the whole layer is
 * moved and scaled by a single `transform` on a wrapper, so panning and zooming
 * cost one style write rather than one per node. `toGraph` converts a pointer
 * position back through that transform — without it, dragging a node while
 * zoomed moves it by the wrong distance, which is the classic bug in a
 * hand-rolled canvas.
 *
 * **Keyboard.** Every node is a tab stop, arrows nudge the focused node, and
 * shift-arrow nudges it by ten. Every edge carries a real button to detach it.
 * A graph editor reachable only by mouse is not an editor for everyone, and the
 * arrow-key path is also the precise one.
 */
export type CanvasNode = {
  id: string
  x: number
  y: number
  /** Falls back to the canvas-level `nodeWidth`. `'auto'` sizes to content. */
  width?: number | 'auto'
  /** Which registered `nodeTypes` entry draws this node. */
  type?: string
  label?: ReactNode
  /** Anything: a kind, a status, your own payload. Passed back to the renderer. */
  data?: unknown
  /** Off for a terminal step that nothing may follow. Defaults to on. */
  connectable?: boolean
  /** Off to pin a node in place while the rest of the graph stays draggable. */
  draggable?: boolean
  /** Off for a node the graph cannot exist without — a trigger, an entry point. */
  deletable?: boolean
  /** Stacking order. Selected and dragging nodes rise above it regardless. */
  z?: number
}

export type CanvasEdge = {
  id: string
  from: string
  to: string
  label?: ReactNode
  /** Draws dashed — for a path that is speculative or inactive. */
  dashed?: boolean
  /** Off for a connection that must not be detached from the canvas. */
  deletable?: boolean
}

type Point = { x: number; y: number }
type Size = { width: number; height: number }

/** What a registered node type is rendered with. */
export type CanvasNodeProps = {
  node: CanvasNode
  selected: boolean
  /** True while this node is being dragged — for a lifted shadow, say. */
  dragging: boolean
}

export type NodeTypes = Record<string, ComponentType<CanvasNodeProps>>

type NodeCanvasProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  nodes: CanvasNode[]
  edges?: CanvasEdge[]
  /**
   * The node components, by `node.type`.
   *
   * Write them as ordinary components — anything at all can go inside one, and
   * it can hold its own hooks and state — then refer to them by name from the
   * graph. A string type is what makes a graph serialisable: it survives
   * `JSON.stringify`, comes back from a server, and keys the palette too.
   *
   * Declare the map at module scope. A new object on every render re-registers
   * every type, and a component defined inline is a new component type each
   * time, which unmounts and remounts every node — losing focus mid-keystroke.
   */
  nodeTypes?: NodeTypes
  /** Draws any node without a registered type. Defaults to its label. */
  renderNode?: (node: CanvasNode, state: { selected: boolean }) => ReactNode
  /** Omit to make the canvas read-only — nodes stay focusable but will not move. */
  onNodesChange?: (nodes: CanvasNode[]) => void
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Uniform node width in graph units. Individual nodes may override it. */
  nodeWidth?: number
  /** Background dot spacing in graph units. `0` turns the grid off. */
  grid?: number
  /** Round positions to the grid while dragging and nudging. */
  snapToGrid?: boolean
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
  /** Names a node for a screen reader, when its contents are not text. */
  nodeLabel?: (node: CanvasNode) => string
  /** How far an arrow key moves a node, in graph units. */
  nudge?: number
  /** Pixels of travel before a press becomes a drag rather than a click. */
  dragThreshold?: number

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
  /** Whether a proposed connection is allowed. Self-links and duplicates are
   *  already refused before this is asked. */
  isValidConnection?: (from: string, to: string) => boolean
  /** Remove a node — fired on Backspace/Delete with a node focused. */
  onRemoveNode?: (id: string) => void
  /**
   * Detach a connection — the button on a hovered or focused edge, and
   * Backspace/Delete while that button has focus. Omit and edges are inert.
   */
  onRemoveEdge?: (id: string) => void
  /**
   * The `+` on a node: create a new node already wired to this one, at a point
   * to its right. Building a chain is the common case by a wide margin, and
   * making it one click beats drag-a-node-then-drag-a-wire every time.
   */
  onAddConnected?: (fromId: string, position: Point) => void
  /** Accessible name for that button. Receives the source node's label. */
  addConnectedLabel?: string
  /** Accessible name for an edge's detach button. */
  removeEdgeLabel?: string
  /** Reports pan and zoom, for a caller that wants to persist the viewport. */
  onViewportChange?: (viewport: { pan: Point; zoom: number }) => void
}

/** The dataTransfer type `NodePalette` writes and the canvas reads. */
export const NODE_DRAG_TYPE = 'application/x-astralyx-node'

/**
 * Things a press belongs to rather than to the canvas.
 *
 * A CSS selector rather than a prop on purpose: the element that must not drag
 * is arbitrary-depth JSX the canvas will never see, often inside a component
 * nobody here owns. The DOM is the one channel both sides share at the moment
 * a gesture starts, and `closest` gives containment for free — mark a wrapper
 * and everything inside it is covered.
 */
const INTERACTIVE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'audio',
  'video',
  'iframe',
  'label',
  'summary',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
  '[data-nodrag]',
].join(',')

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

/**
 * The middle of that curve.
 *
 * The control arms are horizontal mirrors of each other, so at t=0.5 they
 * cancel exactly and the midpoint is the plain average of the two ends — no
 * bezier evaluation needed.
 */
function edgeMidpoint(from: Point, to: Point): Point {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
}

/** The nearest match at or above `target`, but never outside `boundary`. */
function closestWithin(target: Element, selector: string, boundary: Element) {
  const hit = target.closest(selector)
  return hit && boundary.contains(hit) ? hit : null
}

/**
 * Whether a press on `target` should move the node rather than reach its
 * contents.
 *
 * Two policies, and the node picks which by what it renders. Mark an element
 * `data-drag-handle` — a title bar, a grip — and the policy inverts: nothing
 * drags except from inside that element. That is what a node whose whole
 * surface is a form needs, because there is no leftover pixel to grab.
 *
 * Presence, not a selector prop. A selector that matches nothing produces a
 * node that silently cannot be moved, and asking for the handle in props is
 * the prop-gymnastics this API exists to remove: the node already knows which
 * part of itself is the grip, and says so where it draws it.
 */
function canDragFrom(target: Element, node: HTMLElement) {
  const handles = node.querySelectorAll('[data-drag-handle]')
  if (handles.length) {
    for (const handle of handles) if (handle.contains(target)) return true
    return false
  }
  return !closestWithin(target, INTERACTIVE, node)
}

/**
 * A region inside a node that scrolls, and so owns the wheel.
 *
 * Detected rather than declared, because a log inside a node scrolling the page
 * instead of itself is never what anyone wanted. `data-nowheel` is the manual
 * override for a region the browser has not made scrollable yet — an element
 * that will overflow once its content arrives.
 */
function ownsWheel(target: Element, boundary: Element) {
  if (closestWithin(target, '[data-nowheel]', boundary)) return true

  for (let element: Element | null = target; element; element = element.parentElement) {
    if (element === boundary) return false
    if (!(element instanceof HTMLElement)) continue
    const style = getComputedStyle(element)
    const scrolls = /auto|scroll|overlay/
    if (
      (scrolls.test(style.overflowY) && element.scrollHeight > element.clientHeight) ||
      (scrolls.test(style.overflowX) && element.scrollWidth > element.clientWidth)
    ) {
      return true
    }
  }
  return false
}

/* ------------------------------------------------------------------ context */

type CanvasContextValue = {
  node: CanvasNode
  selected: boolean
  dragging: boolean
  /** Patch this node in place — its position, or its own `data`. */
  update: (patch: Partial<CanvasNode>) => void
  /** Remove it, if the canvas was given a way to. */
  remove: () => void
  /** Wire it to another node. */
  connect: (toId: string) => void
}

const CanvasNodeContext = createContext<CanvasContextValue | null>(null)

/**
 * The node a component is being rendered inside.
 *
 * A registered node type is handed its node as props, but anything nested
 * deeper — a field three components down — would otherwise have to be passed a
 * callback from the top. This is the way back up.
 */
export function useCanvasNode() {
  const context = use(CanvasNodeContext)
  if (!context) throw new Error('Must be used inside a NodeCanvas node')
  return context
}

/* ------------------------------------------------------------------- canvas */

function NodeCanvas({
  nodes,
  edges = [],
  nodeTypes,
  renderNode,
  onNodesChange,
  selectedId,
  onSelect,
  nodeWidth = 180,
  grid = 24,
  snapToGrid = false,
  minZoom = 0.35,
  maxZoom = 2.5,
  zoomOnWheel = true,
  defaultPan,
  defaultZoom = 1,
  height = 420,
  label = 'Node graph',
  nodeLabel,
  nudge = 8,
  dragThreshold = 4,
  onAddNode,
  onDropNode,
  onConnect,
  isValidConnection,
  onRemoveNode,
  onRemoveEdge,
  onAddConnected,
  addConnectedLabel = 'Add a connected step',
  removeEdgeLabel = 'Detach this connection',
  onViewportChange,
  className,
  ...props
}: NodeCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState<Point>(defaultPan ?? { x: 40, y: 40 })
  const [zoom, setZoom] = useState(defaultZoom)
  const patternId = useId()

  // Gesture state. A ref, not state: it changes on every pointermove and none
  // of it needs to paint on its own. `started` is what separates a click from a
  // drag — nothing moves, and nothing is captured, until the pointer travels.
  const drag = useRef<
    | { kind: 'pan'; pointerId: number; pointer: Point; origin: Point; started: boolean }
    | {
        kind: 'node'
        pointerId: number
        id: string
        pointer: Point
        origin: Point
        started: boolean
      }
    | null
  >(null)

  /** Which node is being dragged, for the node's own `dragging` state. */
  const [draggingId, setDraggingId] = useState<string | null>(null)

  /**
   * Measured node sizes, so an edge lands on the vertical centre of a box whose
   * contents you chose.
   *
   * State, not a ref: the edges are drawn during render from these numbers, and
   * a ref read at render time is both a compiler bail-out and a real bug — a
   * node that grows would keep its wire attached where it used to end.
   */
  const [sizes, setSizes] = useState<Record<string, Size>>({})

  // The wire being dragged out of a port, in graph units. State rather than a
  // ref because it paints on every move.
  const [wire, setWire] = useState<{ from: string; to: Point } | null>(null)
  const [activeEdge, setActiveEdge] = useState<string | null>(null)

  /**
   * One observer for every node.
   *
   * A ref callback fires when an element mounts, which the old measurement
   * relied on — but not when its contents grow later, so a node holding a
   * textarea that autosizes, or a section that expands, kept its wires attached
   * where the box used to end. Created lazily inside the callback because
   * `ResizeObserver` does not exist while rendering on the server.
   */
  const observer = useRef<ResizeObserver | null>(null)

  const measure = useCallback((id: string, element: HTMLElement | null) => {
    if (!element) return undefined

    observer.current ??= new ResizeObserver((entries) => {
      setSizes((current) => {
        let next = current
        for (const entry of entries) {
          const target = entry.target as HTMLElement
          const key = target.dataset.nodeId
          if (!key) continue
          // Border-box size, not `getBoundingClientRect`: the layer is scaled,
          // and a rect would report painted pixels where graph units are wanted.
          const box = entry.borderBoxSize?.[0]
          const width = box ? box.inlineSize : target.offsetWidth
          const height = box ? box.blockSize : target.offsetHeight
          const previous = next[key]
          if (previous && previous.width === width && previous.height === height) continue
          if (next === current) next = { ...current }
          next[key] = { width, height }
        }
        return next
      })
    })

    const active = observer.current
    active.observe(element)

    // Ref cleanup, so a removed node takes its measurement with it rather than
    // leaving the record to grow across a long editing session. This only runs
    // when the node actually goes: the callback is memoised per node id, so a
    // re-render does not detach and re-attach it.
    return () => {
      active.unobserve(element)
      setSizes((current) => {
        if (!(id in current)) return current
        const next = { ...current }
        delete next[id]
        return next
      })
    }
  }, [])

  useEffect(() => {
    const active = observer
    return () => {
      active.current?.disconnect()
      active.current = null
    }
  }, [])

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

  const widthOf = useCallback(
    (node: CanvasNode) => {
      if (node.width === 'auto') return sizes[node.id]?.width ?? nodeWidth
      return node.width ?? nodeWidth
    },
    [nodeWidth, sizes],
  )
  // 56 is the height of a one-line node, used until the real one is measured.
  const heightOf = useCallback((node: CanvasNode) => sizes[node.id]?.height ?? 56, [sizes])

  const snap = useCallback(
    (value: number) => (snapToGrid && grid > 0 ? Math.round(value / grid) * grid : value),
    [grid, snapToGrid],
  )

  /** Every position the canvas hands out obeys the grid it draws. */
  const snapPoint = useCallback((point: Point) => ({ x: snap(point.x), y: snap(point.y) }), [snap])

  const moveNode = useCallback(
    (id: string, next: Point) => {
      onNodesChange?.(
        nodes.map((node) =>
          node.id === id ? { ...node, x: snap(next.x), y: snap(next.y) } : node,
        ),
      )
    },
    [nodes, onNodesChange, snap],
  )

  const patchNode = useCallback(
    (id: string, patch: Partial<CanvasNode>) => {
      onNodesChange?.(nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)))
    },
    [nodes, onNodesChange],
  )

  /** Refuse the connections that are never meant, before asking the caller. */
  const requestConnect = useCallback(
    (from: string, to: string) => {
      if (!onConnect || from === to) return
      const target = nodes.find((node) => node.id === to)
      if (!target || target.connectable === false) return
      if (edges.some((edge) => edge.from === from && edge.to === to)) return
      if (isValidConnection && !isValidConnection(from, to)) return
      onConnect(from, to)
    },
    [edges, isValidConnection, nodes, onConnect],
  )

  /* ------------------------------------------------------------- gestures */

  function onPointerDownBackground(event: ReactPointerEvent<HTMLDivElement>) {
    // Primary or middle button pans; middle is the convention every canvas
    // shares, and it works while a node is under the cursor too.
    if (event.button !== 0 && event.button !== 1) return
    // A second finger, or a second button, must not take over the gesture
    // already in flight — the first one still owns it until it lifts.
    if (drag.current) return
    drag.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      pointer: { x: event.clientX, y: event.clientY },
      origin: { ...pan },
      started: false,
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (wire) {
      setWire({ from: wire.from, to: toGraph(event) })
      return
    }

    const gesture = drag.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    // A gesture whose pointerup was eaten — by a native menu, an alt-tab, a
    // right-click mid-drag — would otherwise leave the node stuck to the cursor.
    if (event.buttons === 0) {
      endGesture(event)
      return
    }

    const travel = Math.hypot(
      event.clientX - gesture.pointer.x,
      event.clientY - gesture.pointer.y,
    )
    if (!gesture.started) {
      if (travel < dragThreshold) return
      gesture.started = true
      // Captured only now. Taking it on contact is what used to retarget every
      // click to the node, killing buttons and switches inside it — and it stole
      // the capture that a slider or a colour picker takes for its own drag.
      event.currentTarget.setPointerCapture(event.pointerId)
      // Text selection is suppressed here rather than by preventing the
      // pointerdown's default, which would have been simpler and also silently
      // cancels the compatibility mouse events — taking click and dblclick with
      // it, so double-clicking the canvas to add a node would stop working. Any
      // sliver selected before the threshold is cleared with it.
      document.getSelection()?.removeAllRanges()
      event.currentTarget.style.userSelect = 'none'
      if (gesture.kind === 'node') setDraggingId(gesture.id)
    }

    if (gesture.kind === 'pan') {
      setPan({
        x: gesture.origin.x + (event.clientX - gesture.pointer.x),
        y: gesture.origin.y + (event.clientY - gesture.pointer.y),
      })
      return
    }

    // Divided by zoom: at 0.5x, a 100px pointer move is 200 graph units. The
    // delta is measured from the position at press, never accumulated frame to
    // frame, so snapping cannot make the node drift away from the cursor.
    moveNode(gesture.id, {
      x: gesture.origin.x + (event.clientX - gesture.pointer.x) / zoom,
      y: gesture.origin.y + (event.clientY - gesture.pointer.y) / zoom,
    })
  }

  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    event.currentTarget.style.userSelect = ''

    // A drag that ends over something clickable still produces a click. Eat
    // exactly one, in the capture phase, so releasing a node on top of a button
    // does not press it — and drop the listener on the next turn if no click
    // arrives, rather than leaving it armed for the user's next real one.
    if (drag.current?.started) {
      const viewport = event.currentTarget
      const suppress = (click: MouseEvent) => {
        click.preventDefault()
        click.stopPropagation()
      }
      viewport.addEventListener('click', suppress, { capture: true, once: true })
      window.setTimeout(() => viewport.removeEventListener('click', suppress, true), 0)
    }

    if (wire) {
      // Pointer capture means the event target is the viewport, not whatever is
      // under the cursor — so ask the document what is actually there. Dropping
      // anywhere on a node counts, not just on its 12px port.
      const under = document.elementFromPoint(event.clientX, event.clientY)
      const dropped = under?.closest<HTMLElement>('[data-node-id]')
      const target = dropped?.dataset.nodeId
      if (target) requestConnect(wire.from, target)
      setWire(null)
    }

    const gesture = drag.current
    // A press on the background that never became a drag is a click, and a
    // click on nothing clears the selection. Panning must not.
    if (gesture?.kind === 'pan' && !gesture.started) onSelect?.(null)

    drag.current = null
    setDraggingId(null)
  }

  /**
   * A gesture the window loses — alt-tab mid-drag, a native menu, a dialog
   * stealing focus — never gets its pointerup, and the node would stay stuck to
   * the cursor on the next hover.
   */
  useEffect(() => {
    function release() {
      drag.current = null
      if (viewportRef.current) viewportRef.current.style.userSelect = ''
      setDraggingId(null)
      setWire(null)
    }
    window.addEventListener('blur', release)
    return () => window.removeEventListener('blur', release)
  }, [])

  /** Zoom toward the pointer, so the point under the cursor stays put. */
  // Read inside the native listener below, so it can stay attached across
  // zooms instead of being torn down and rebuilt on every wheel tick. Written
  // from an effect rather than during render, which is not a safe place to
  // mutate a ref.
  const view = useRef({ pan, zoom })
  const report = useRef(onViewportChange)
  useEffect(() => {
    view.current = { pan, zoom }
    report.current = onViewportChange
  })

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
      // A scrollable region inside a node keeps its own wheel. Checked before
      // anything else, including preventDefault, or the region is frozen.
      const target = event.target
      if (target instanceof Element && ownsWheel(target, node!)) return

      // A trackpad pinch arrives as ctrl+wheel; both mean zoom here, and both
      // must be stopped from reaching the page.
      event.preventDefault()

      const box = node!.getBoundingClientRect()
      const { pan: currentPan, zoom: currentZoom } = view.current

      // Scaled by how far the wheel actually turned. A fixed step per event
      // sends a trackpad — which emits dozens of small inertial events — straight
      // to the clamp, while a notched mouse crawls. Line and page deltas are
      // converted to something pixel-like first.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? box.height : 1
      const delta = event.deltaY * unit
      const next = Math.min(
        maxZoom,
        Math.max(minZoom, currentZoom * Math.exp(-delta * 0.002)),
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

  // Reported from an effect rather than from the gesture handlers, so a caller
  // hears about every change, and hears about it once.
  useEffect(() => {
    report.current?.({ pan, zoom })
  }, [pan, zoom])

  /** Edges leave the right edge of the source and enter the left of the target. */
  const anchors = useCallback(
    (edge: CanvasEdge) => {
      const from = nodes.find((node) => node.id === edge.from)
      const to = nodes.find((node) => node.id === edge.to)
      if (!from || !to) return null
      return {
        start: { x: from.x + widthOf(from), y: from.y + heightOf(from) / 2 },
        end: { x: to.x, y: to.y + heightOf(to) / 2 },
      }
    },
    [heightOf, nodes, widthOf],
  )

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`

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
          // A double-click inside a node is a word being selected, or a control
          // being used. Only empty canvas asks for a new node.
          if (event.target instanceof Element && event.target.closest('[data-node-id]')) return
          onAddNode(snapPoint(toGraph(event)))
        }}
        // Both handlers are required: without `onDragOver` calling
        // preventDefault, the browser refuses the drop and `onDrop` never runs.
        // Only our own payload is claimed, so a file or a text selection dropped
        // into a field inside a node still reaches it.
        onDragOver={(event) => {
          if (onDropNode && event.dataTransfer.types.includes(NODE_DRAG_TYPE)) {
            event.preventDefault()
          }
        }}
        onDrop={(event) => {
          if (!onDropNode) return
          const payload = event.dataTransfer.getData(NODE_DRAG_TYPE)
          if (!payload) return
          event.preventDefault()
          onDropNode(payload, snapPoint(toGraph(event)))
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
            matters: paths routinely run outside the SVG's own box. The layer
            takes no pointer events; each path opts back in, so the canvas
            behind them still pans. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <g style={{ transform }}>
            {edges.map((edge) => {
              const points = anchors(edge)
              if (!points) return null
              const active = activeEdge === edge.id
              return (
                <g key={edge.id}>
                  {/* A 16-unit transparent stroke under the visible one: a
                      1.5px curve is a target nobody can hit. */}
                  {onRemoveEdge && (
                    <path
                      d={edgePath(points.start, points.end)}
                      fill="none"
                      strokeWidth={16}
                      stroke="transparent"
                      className="pointer-events-stroke cursor-pointer"
                      onPointerEnter={() => setActiveEdge(edge.id)}
                      onPointerLeave={() =>
                        setActiveEdge((current) => (current === edge.id ? null : current))
                      }
                    />
                  )}
                  <path
                    d={edgePath(points.start, points.end)}
                    fill="none"
                    strokeWidth={active ? 2 : 1.5}
                    strokeDasharray={edge.dashed ? '4 4' : undefined}
                    className={cn(
                      'pointer-events-none transition-[stroke] duration-150 ease-out',
                      'motion-reduce:transition-none',
                      active ? 'stroke-primary' : 'stroke-border',
                    )}
                  />
                </g>
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

        <div className="absolute top-0 left-0 origin-top-left" style={{ transform }}>
          {nodes.map((node) => (
            <CanvasNodeView
              key={node.id}
              node={node}
              nodeTypes={nodeTypes}
              renderNode={renderNode}
              selected={node.id === selectedId}
              dragging={draggingId === node.id}
              editable={Boolean(onNodesChange)}
              width={widthOf(node)}
              nudge={nudge}
              nodeLabel={nodeLabel}
              addConnectedLabel={addConnectedLabel}
              snapPoint={snapPoint}
              measure={measure}
              onSelect={onSelect}
              onRemoveNode={onRemoveNode}
              onAddConnected={onAddConnected}
              connectable={Boolean(onConnect) && node.connectable !== false}
              wiring={Boolean(wire) && wire?.from !== node.id}
              patchNode={patchNode}
              moveNode={moveNode}
              requestConnect={requestConnect}
              onStartWire={(event) => {
                viewportRef.current?.setPointerCapture(event.pointerId)
                setWire({ from: node.id, to: toGraph(event) })
              }}
              onStartDrag={(event, element) => {
                // A second finger, or a second button, must not take over the
                // gesture already in flight.
                if (drag.current) return
                drag.current = {
                  kind: 'node',
                  pointerId: event.pointerId,
                  id: node.id,
                  pointer: { x: event.clientX, y: event.clientY },
                  origin: { x: node.x, y: node.y },
                  started: false,
                }
                element.focus()
              }}
            />
          ))}

          {/* Detach buttons ride above the nodes, in graph space so they travel
              and scale with the edge they belong to. Real buttons, so a
              connection can be removed without a pointer at all. */}
          {onRemoveEdge &&
            edges.map((edge) => {
              const points = anchors(edge)
              if (!points || edge.deletable === false) return null
              const middle = edgeMidpoint(points.start, points.end)
              return (
                <button
                  key={edge.id}
                  type="button"
                  aria-label={removeEdgeLabel}
                  data-edge-id={edge.id}
                  style={{ position: 'absolute', left: middle.x, top: middle.y }}
                  className={cn(
                    'bg-card border-border text-muted-foreground flex size-5 -translate-x-1/2 -translate-y-1/2',
                    'items-center justify-center rounded-full border text-xs leading-none',
                    'hover:border-primary hover:text-foreground',
                    'transition-opacity duration-150 ease-out motion-reduce:transition-none',
                    activeEdge === edge.id ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100',
                    focusRing,
                  )}
                  onPointerEnter={() => setActiveEdge(edge.id)}
                  onPointerLeave={() =>
                    setActiveEdge((current) => (current === edge.id ? null : current))
                  }
                  onFocus={() => setActiveEdge(edge.id)}
                  onBlur={() =>
                    setActiveEdge((current) => (current === edge.id ? null : current))
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key !== 'Backspace' && event.key !== 'Delete') return
                    event.preventDefault()
                    onRemoveEdge(edge.id)
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemoveEdge(edge.id)
                  }}
                >
                  ×
                </button>
              )
            })}
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- node */

type CanvasNodeViewProps = {
  node: CanvasNode
  nodeTypes: NodeTypes | undefined
  renderNode: NodeCanvasProps['renderNode']
  selected: boolean
  dragging: boolean
  editable: boolean
  width: number
  nudge: number
  nodeLabel: ((node: CanvasNode) => string) | undefined
  addConnectedLabel: string
  snapPoint: (point: Point) => Point
  connectable: boolean
  wiring: boolean
  measure: (id: string, element: HTMLElement | null) => (() => void) | undefined
  onSelect: ((id: string | null) => void) | undefined
  onRemoveNode: ((id: string) => void) | undefined
  onAddConnected: ((fromId: string, position: Point) => void) | undefined
  patchNode: (id: string, patch: Partial<CanvasNode>) => void
  moveNode: (id: string, next: Point) => void
  requestConnect: (from: string, to: string) => void
  onStartWire: (event: ReactPointerEvent<HTMLElement>) => void
  onStartDrag: (event: ReactPointerEvent<HTMLElement>, element: HTMLElement) => void
}

/**
 * One node.
 *
 * At module scope, not nested inside `NodeCanvas`: a component declared during
 * render is a new component type on every render, so React would unmount and
 * remount every node's contents each time the canvas pans — losing focus
 * mid-keystroke and resetting anything uncontrolled inside.
 */
function CanvasNodeView({
  node,
  nodeTypes,
  renderNode,
  selected,
  dragging,
  editable,
  width,
  nudge,
  nodeLabel,
  addConnectedLabel,
  snapPoint,
  connectable,
  wiring,
  measure,
  onSelect,
  onRemoveNode,
  onAddConnected,
  patchNode,
  moveNode,
  requestConnect,
  onStartWire,
  onStartDrag,
}: CanvasNodeViewProps) {
  const Registered = node.type ? nodeTypes?.[node.type] : undefined
  const draggable = editable && node.draggable !== false

  // Memoised, so React does not tear the observer down and set it up again on
  // every render — which, with a cleanup attached, would also drop and re-take
  // the measurement each time.
  const attach = useCallback(
    (element: HTMLDivElement | null) => measure(node.id, element),
    [measure, node.id],
  )

  const context = useMemo<CanvasContextValue>(
    () => ({
      node,
      selected,
      dragging,
      update: (patch) => patchNode(node.id, patch),
      remove: () => onRemoveNode?.(node.id),
      connect: (toId) => requestConnect(node.id, toId),
    }),
    [dragging, node, onRemoveNode, patchNode, requestConnect, selected],
  )

  return (
    <div
      ref={attach}
      // Not `role="button"`. A button's contents are presentational to a screen
      // reader, so every field inside a node vanished from the accessibility
      // tree — and a node whose body is a form is not a button in any case.
      role="group"
      tabIndex={0}
      aria-label={nodeLabel?.(node) ?? (typeof node.label === 'string' ? node.label : undefined)}
      aria-current={selected || undefined}
      data-selected={selected}
      data-dragging={dragging || undefined}
      data-node-id={node.id}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width === 'auto' ? undefined : width,
        // A dragged or selected node rises, so it is never slid underneath a
        // neighbour it happens to be declared before.
        zIndex: dragging ? 2 : selected ? 1 : node.z,
      }}
      className={cn(
        'group bg-card border-border border p-3 text-start text-sm',
        radius.control,
        focusRing,
        // Only where a press would actually move it — a grab cursor over a text
        // field lies about what the region does, and a node with a handle
        // advertises the grip on the handle instead.
        draggable &&
          'has-[[data-drag-handle]]:cursor-default [&_[data-drag-handle]]:cursor-grab cursor-grab active:cursor-grabbing',
        selected ? 'border-primary ring-ring/40 ring-2' : 'hover:border-foreground/25',
        dragging && 'shadow-lg',
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const element = event.currentTarget
        const target = event.target
        if (!(target instanceof Element)) return

        // The press belongs to this node either way — selecting it is what
        // pairs the canvas with an inspector beside it.
        event.stopPropagation()
        onSelect?.(node.id)

        if (!draggable || !canDragFrom(target, element)) return

        onStartDrag(event, element)
      }}
      onKeyDown={(event) => {
        // Keys from a field inside the node are that field's. Without this a
        // space never reaches an input, Backspace deletes the node instead of a
        // character, and the arrows move the node instead of the caret.
        if (event.target !== event.currentTarget) return

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
        if (!editable) return

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
      <CanvasNodeContext value={context}>
        {Registered ? (
          <Registered node={node} selected={selected} dragging={dragging} />
        ) : renderNode ? (
          renderNode(node, { selected })
        ) : (
          node.label
        )}
      </CanvasNodeContext>

      {connectable && (
        <>
          {/* Target. A plain div, not a button: it is a drop area for a pointer
              gesture, and the keyboard path to connecting belongs in the panel
              beside the canvas, not here. */}
          <span
            aria-hidden="true"
            className={cn(
              'bg-card border-border absolute top-1/2 -start-1.5 size-3 -translate-y-1/2 rounded-full border',
              wiring && 'border-primary bg-primary/20',
            )}
          />
          <span
            aria-hidden="true"
            title="Drag to connect"
            data-nodrag
            className={cn(
              'bg-card border-border absolute top-1/2 -end-1.5 size-3 -translate-y-1/2 cursor-crosshair rounded-full border',
              'hover:border-primary hover:bg-primary/20',
            )}
            onPointerDown={(event) => {
              event.stopPropagation()
              event.preventDefault()
              onStartWire(event)
            }}
          />

          {onAddConnected && (
            // A real button, so building a chain has a keyboard path even
            // though dragging a wire does not. Shown on hover, focus, or while
            // selected — a persistent one on every node turns a busy graph into
            // a field of plus signs.
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
              onClick={(event) => {
                event.stopPropagation()
                onAddConnected(node.id, snapPoint({ x: node.x + width + 80, y: node.y }))
              }}
            >
              +
            </button>
          )}
        </>
      )}
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
