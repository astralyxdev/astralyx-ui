import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A force-directed layout, shared by the graph components.
 *
 * Three forces, which is all a readable graph needs: every pair of nodes pushes
 * apart, every link pulls together, and a weak pull toward the centre stops
 * disconnected components drifting off screen forever.
 *
 * **It stops.** `alpha` decays and the loop ends once motion falls below a
 * threshold, because a graph that jitters permanently is unreadable, burns
 * battery, and never lets you click anything. Dragging or changing the data
 * reheats it.
 *
 * **Repulsion is O(n²)** — no quadtree. At the sizes a graph stays legible at,
 * a few hundred nodes, that is a fraction of a millisecond per tick, and a
 * Barnes–Hut tree is a lot of code to maintain for a component that becomes
 * unreadable long before it becomes slow.
 *
 * **Initial positions are deterministic**, placed on a phyllotaxis spiral
 * rather than at random. Random seeding makes a server-rendered graph and its
 * hydrated counterpart disagree, and makes every reload a different picture of
 * the same data.
 */
export type ForceNode = {
  id: string
  /** Pins the node. Dragged nodes are pinned while held. */
  fixed?: boolean
}

export type ForceLink = { source: string; target: string }

export type Positioned = { id: string; x: number; y: number }

type Options = {
  /** Pixels. The layout is centred in this box. */
  width: number
  height: number
  /** Resting length of a link. Defaults to a value derived from the box. */
  linkDistance?: number
  /** How hard nodes push each other apart. Defaults to area per node. */
  charge?: number
  /** Pull toward the centre. Small, or everything collapses into a ball. */
  gravity?: number
  /** Below this average speed the simulation stops. */
  settleAt?: number
  /** Keep-out margin at the edges, in pixels. Room for radii and labels. */
  padding?: number
}

type Body = { id: string; x: number; y: number; vx: number; vy: number; fixed: boolean }

/** Deterministic, evenly spread starting positions — no RNG. */
function seedPositions(count: number, width: number, height: number): Body[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const radius = Math.min(width, height) * 0.35

  return Array.from({ length: count }, (_, index) => {
    const distance = radius * Math.sqrt((index + 0.5) / count)
    const angle = index * golden
    return {
      id: '',
      x: width / 2 + Math.cos(angle) * distance,
      y: height / 2 + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
      fixed: false,
    }
  })
}

export function useForceGraph(
  nodes: ForceNode[],
  links: ForceLink[],
  { width, height, linkDistance, charge, gravity = 0.006, settleAt = 0.06, padding = 30 }: Options,
) {
  /**
   * Both defaults are derived from the box, because a graph laid out with fixed
   * pixel constants is tuned for exactly one canvas size and wrong at every
   * other one — the same vault collapsed into the middle third of a small
   * preview and spilled off the edges of a large one.
   *
   * The **link distance** is what actually sets the size of the drawing. At the
   * separations these graphs settle at, the spring term is roughly fifty times
   * the repulsion term, so raising the charge to spread a cluster does almost
   * nothing; the resting length of a link is the lever. Dividing the shorter
   * side by √n is the usual area-per-node argument: n nodes at spacing d need
   * about n·d² of room.
   */
  const span = Math.min(width, height)
  const rest =
    linkDistance ?? Math.max(48, Math.min(170, (span / Math.sqrt(Math.max(2, nodes.length))) * 1.15))
  /** Repulsion, which matters at short range — it is what stops nodes piling up. */
  const push = charge ?? Math.max(600, ((width * height) / Math.max(1, nodes.length)) * 0.34)
  const [positions, setPositions] = useState<Positioned[]>([])
  const bodies = useRef<Map<string, Body>>(new Map())
  const alpha = useRef(1)
  const frame = useRef(0)

  // Identity of the graph, not of the arrays: a caller building `nodes` inline
  // would otherwise reseed the layout on every render.
  const shape = `${nodes.map((node) => node.id).join(',')}|${links
    .map((link) => `${link.source}>${link.target}`)
    .join(',')}`

  // Latest values, read inside the effects. `shape` is what actually decides
  // when the layout must restart; depending on the arrays themselves would
  // reseed on every render for any caller that builds them inline.
  const latest = useRef({ nodes, links })
  latest.current = { nodes, links }

  const reheat = useCallback(() => {
    alpha.current = 1
  }, [])

  useEffect(() => {
    const current = latest.current.nodes
    const seeds = seedPositions(current.length, width, height)
    const next = new Map<string, Body>()

    current.forEach((node, index) => {
      // Keep a node where it already was, so adding one does not scatter the
      // graph someone has just finished reading.
      const existing = bodies.current.get(node.id)
      next.set(node.id, existing ?? { ...seeds[index], id: node.id })
    })

    bodies.current = next
    alpha.current = 1
    setPositions([...next.values()].map(({ id, x, y }) => ({ id, x, y })))
  }, [shape, width, height])

  useEffect(() => {
    let running = true

    const tick = () => {
      if (!running) return

      const list = [...bodies.current.values()]
      if (list.length === 0) return

      // Repulsion, every pair once.
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]
          const b = list[j]
          let dx = b.x - a.x
          let dy = b.y - a.y
          let distanceSquared = dx * dx + dy * dy

          // Two nodes exactly on top of each other have no direction to
          // separate along, so nudge them apart deterministically.
          if (distanceSquared < 0.01) {
            dx = (i - j) * 0.5
            dy = 0.5
            distanceSquared = dx * dx + dy * dy
          }

          const force = push / distanceSquared
          const distance = Math.sqrt(distanceSquared)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          a.vx -= fx
          a.vy -= fy
          b.vx += fx
          b.vy += fy
        }
      }

      // Springs.
      for (const link of latest.current.links) {
        const a = bodies.current.get(link.source)
        const b = bodies.current.get(link.target)
        if (!a || !b) continue

        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 0.01
        const force = (distance - rest) * 0.05
        const fx = (dx / distance) * force
        const fy = (dy / distance) * force

        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      // Gravity, then integrate.
      let motion = 0
      for (const body of list) {
        if (body.fixed) {
          body.vx = 0
          body.vy = 0
          continue
        }

        body.vx += (width / 2 - body.x) * gravity
        body.vy += (height / 2 - body.y) * gravity

        body.vx *= 0.82
        body.vy *= 0.82

        // Clamped to the box. The container clips, so a node pushed past the
        // edge is not merely off-centre — it is invisible, and so is every link
        // that ends there. Sizing the layout to the box gets it close; this is
        // what guarantees it, and it leaves room for the radius and the label.
        body.x = Math.min(Math.max(padding, body.x + body.vx * alpha.current), width - padding)
        body.y = Math.min(Math.max(padding, body.y + body.vy * alpha.current), height - padding)
        motion += Math.abs(body.vx) + Math.abs(body.vy)
      }

      alpha.current *= 0.985
      setPositions(list.map(({ id, x, y }) => ({ id, x, y })))

      // Stop when it has settled. A graph that never stops moving cannot be
      // read and cannot be clicked.
      if (motion / list.length > settleAt && alpha.current > 0.005) {
        frame.current = requestAnimationFrame(tick)
      }
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(frame.current)
    }
  }, [shape, width, height, rest, push, gravity, settleAt, padding])

  /** Move a node under the pointer and hold it there. */
  const drag = useCallback(
    (id: string, x: number, y: number) => {
      const body = bodies.current.get(id)
      if (!body) return
      body.x = Math.min(Math.max(padding, x), width - padding)
      body.y = Math.min(Math.max(padding, y), height - padding)
      body.fixed = true
      alpha.current = Math.max(alpha.current, 0.4)
      setPositions([...bodies.current.values()].map((b) => ({ id: b.id, x: b.x, y: b.y })))
    },
    [width, height, padding],
  )

  const release = useCallback((id: string) => {
    const body = bodies.current.get(id)
    if (body) body.fixed = false
  }, [])

  return { positions, drag, release, reheat }
}
