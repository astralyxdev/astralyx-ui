import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { dataFills, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A flame graph of a profile.
 *
 * Width is time, depth is stack. That is the whole grammar, and it is why the
 * frames are not sorted by cost: their order is the call order, and reordering
 * them would destroy the shape people read a flame graph for.
 *
 * Clicking a frame zooms to it and the ancestors stay as a breadcrumb. A deep
 * profile is unreadable at full width, and losing your place while zooming is
 * what makes most flame graph implementations frustrating.
 *
 * Self time is separated from total. A frame 400ms wide that spends 3ms of it
 * in itself is not the problem; its child is. Total time alone cannot tell you
 * which.
 *
 * Frames narrower than a pixel are dropped rather than drawn as slivers —
 * thousands of sub-pixel rectangles cost real render time and show nothing.
 */
export type FlameFrame = {
  name: string
  /** Total time in this frame, including children. */
  value: number
  children?: FlameFrame[]
}

type Laid = { frame: FlameFrame; depth: number; start: number; width: number; self: number }

/** Flattens the tree into positioned rows within [0,1] of the zoom root. */
function layout(root: FlameFrame, zoomPath: FlameFrame[]): Laid[] {
  const target = zoomPath[zoomPath.length - 1] ?? root
  const out: Laid[] = []

  const walk = (frame: FlameFrame, depth: number, start: number, span: number) => {
    const childTotal = (frame.children ?? []).reduce((sum, c) => sum + c.value, 0)
    out.push({ frame, depth, start, width: span, self: Math.max(0, frame.value - childTotal) })

    let cursor = start
    for (const child of frame.children ?? []) {
      const width = frame.value > 0 ? (child.value / frame.value) * span : 0
      // Sub-pixel frames cost render time and show nothing.
      if (width > 0.0015) walk(child, depth + 1, cursor, width)
      cursor += width
    }
  }

  walk(target, 0, 0, 1)
  return out
}

function FlameGraph({
  root,
  rowHeight = 20,
  unit = 'ms',
  selfLabel = 'self',
  totalLabel = 'total',
  resetLabel = 'Reset zoom',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  root: FlameFrame
  rowHeight?: number
  unit?: string
  selfLabel?: ReactNode
  totalLabel?: ReactNode
  resetLabel?: ReactNode
}) {
  const [zoom, setZoom] = useState<FlameFrame[]>([])
  const [hover, setHover] = useState<Laid | null>(null)

  const rows = useMemo(() => layout(root, zoom), [root, zoom])
  const depth = rows.reduce((max, row) => Math.max(max, row.depth), 0) + 1

  return (
    <div data-slot="flame-graph" className={cn('flex flex-col gap-2', className)} {...props}>
      {/* Ancestors stay visible: losing your place is what makes most flame
          graph implementations frustrating. */}
      {zoom.length > 0 && (
        <nav className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
          <button type="button" className="hover:text-foreground underline-offset-4 hover:underline" onClick={() => setZoom([])}>
            {resetLabel}
          </button>
          {zoom.map((frame, index) => (
            <span key={index} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <button
                type="button"
                className="hover:text-foreground font-mono underline-offset-4 hover:underline"
                onClick={() => setZoom(zoom.slice(0, index + 1))}
              >
                {frame.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div
        className={cn(surface, radius.surface, 'relative w-full overflow-hidden')}
        style={{ height: depth * rowHeight + 2 }}
        onMouseLeave={() => setHover(null)}
      >
        {rows.map((row, index) => (
          <button
            key={`${row.depth}-${row.start}-${index}`}
            type="button"
            title={`${row.frame.name} — ${row.frame.value}${unit}`}
            onClick={() => setZoom([...zoom, row.frame])}
            onMouseEnter={() => setHover(row)}
            className="absolute overflow-hidden border-e border-[var(--card)] text-start text-[10px] leading-none whitespace-nowrap"
            style={{
              insetInlineStart: `${row.start * 100}%`,
              width: `${row.width * 100}%`,
              top: row.depth * rowHeight + 1,
              height: rowHeight - 1,
              background: dataFills[(row.depth + row.frame.name.length) % dataFills.length],
              opacity: hover && hover.frame !== row.frame ? 0.75 : 1,
              paddingInline: 4,
              color: 'var(--background)',
            }}
          >
            {row.width > 0.04 ? row.frame.name : ''}
          </button>
        ))}
      </div>

      {/* Self vs total: a 400ms frame with 3ms of self time is not the problem. */}
      <p className="text-muted-foreground min-h-4 font-mono text-xs">
        {hover ? (
          <>
            {hover.frame.name}
            {'  '}
            <span className="opacity-70">{totalLabel}</span> {hover.frame.value}
            {unit}
            {'  '}
            <span className="opacity-70">{selfLabel}</span> {hover.self.toFixed(1)}
            {unit}
          </>
        ) : null}
      </p>
    </div>
  )
}

export { FlameGraph, layout as layoutFlame }
