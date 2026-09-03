import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Fmt } from '@/components/ui/fmt'
import { dataFills, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Bundle size by module, as a treemap.
 *
 * Area is size, so the thing taking the space is the thing that looks big. A
 * sorted bar chart answers "what is largest"; a treemap answers "what is this
 * bundle *made of*", which is the question you have when a build doubles.
 *
 * Gzipped size drives the layout when it is supplied. Raw bytes overstate
 * text-heavy modules dramatically — a 400KB locale file that gzips to 12KB
 * dominates a raw-size treemap and is nearly irrelevant on the wire.
 *
 * Squarified layout, not a naive slice-and-dice: long thin slivers cannot be
 * compared by eye or clicked, which defeats the point of the shape.
 */
export type BundleModule = {
  name: string
  /** Raw bytes. */
  size: number
  /** Compressed bytes. Drives the layout when present. */
  gzip?: number
}

type Tile = { module: BundleModule; x: number; y: number; w: number; h: number }

/**
 * Squarified treemap over a 0–1 box. Rows are grown while the worst aspect
 * ratio in the row keeps improving, which is what avoids slivers.
 */
function squarify(values: number[], width: number, height: number): [number, number, number, number][] {
  const total = values.reduce((sum, v) => sum + v, 0)
  if (total <= 0) return values.map(() => [0, 0, 0, 0])

  const out: [number, number, number, number][] = []
  let x = 0, y = 0, w = width, h = height
  let index = 0

  while (index < values.length) {
    const vertical = w >= h
    const side = vertical ? h : w
    const remaining = values.slice(index).reduce((sum, v) => sum + v, 0)
    const scale = (w * h) / remaining

    const row: number[] = []
    let best = Infinity

    while (index + row.length < values.length) {
      const next = [...row, values[index + row.length]]
      const area = next.reduce((sum, v) => sum + v, 0) * scale
      const thickness = area / side
      const worst = Math.max(
        ...next.map((v) => {
          const length = (v * scale) / thickness
          return Math.max(thickness / length, length / thickness)
        }),
      )
      if (worst > best) break
      best = worst
      row.push(values[index + row.length])
    }

    const area = row.reduce((sum, v) => sum + v, 0) * scale
    const thickness = area / side
    let offset = 0
    for (const value of row) {
      const length = (value * scale) / thickness
      out.push(
        vertical
          ? [x, y + offset, thickness, length]
          : [x + offset, y, length, thickness],
      )
      offset += length
    }

    if (vertical) { x += thickness; w -= thickness } else { y += thickness; h -= thickness }
    index += row.length
  }
  return out
}

/** Compressed size when asked for and available, raw bytes otherwise. */
function weigh(module: BundleModule, useGzip: boolean) {
  return useGzip && module.gzip !== undefined ? module.gzip : module.size
}

function BundleTreemap({
  modules,
  height = 260,
  useGzip = true,
  totalLabel = 'Total',
  gzipLabel = 'gzipped',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'height'> & {
  modules: BundleModule[]
  height?: number
  /** Lay out by compressed size when available — raw bytes mislead. */
  useGzip?: boolean
  totalLabel?: ReactNode
  gzipLabel?: ReactNode
}) {
  const [hover, setHover] = useState<BundleModule | null>(null)

  const tiles = useMemo<Tile[]>(() => {
    const by = (m: BundleModule) => weigh(m, useGzip)
    const sorted = [...modules].sort((a, b) => by(b) - by(a))
    const boxes = squarify(sorted.map(by), 1, 1)
    return sorted.map((module, i) => ({
      module,
      x: boxes[i][0],
      y: boxes[i][1],
      w: boxes[i][2],
      h: boxes[i][3],
    }))
  }, [modules, useGzip])

  const total = modules.reduce((sum, m) => sum + m.size, 0)
  const totalGzip = modules.reduce((sum, m) => sum + (m.gzip ?? 0), 0)

  return (
    <div data-slot="bundle-treemap" className={cn('flex flex-col gap-2', className)} {...props}>
      <div
        className={cn(surface, radius.surface, 'relative w-full overflow-hidden')}
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {tiles.map((tile, index) => (
          <button
            key={tile.module.name}
            type="button"
            title={`${tile.module.name} — ${tile.module.size} bytes`}
            onMouseEnter={() => setHover(tile.module)}
            className="absolute overflow-hidden border border-[var(--card)] p-1 text-start text-[10px] leading-tight"
            style={{
              insetInlineStart: `${tile.x * 100}%`,
              top: `${tile.y * 100}%`,
              width: `${tile.w * 100}%`,
              height: `${tile.h * 100}%`,
              background: dataFills[index % dataFills.length],
              opacity: hover && hover !== tile.module ? 0.7 : 1,
              color: 'var(--background)',
            }}
          >
            {tile.w > 0.09 && tile.h > 0.07 ? tile.module.name : ''}
          </button>
        ))}
      </div>

      <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs tabular-nums">
        <span>
          {totalLabel} <Fmt type="bytes" value={total} />
        </span>
        {totalGzip > 0 && (
          <span>
            <Fmt type="bytes" value={totalGzip} /> {gzipLabel}
          </span>
        )}
        {hover && (
          <span className="ms-auto font-mono">
            {hover.name} — <Fmt type="bytes" value={hover.size} />
            {hover.gzip !== undefined && (
              <>
                {' ('}
                <Fmt type="bytes" value={hover.gzip} /> {gzipLabel})
              </>
            )}
          </span>
        )}
      </p>
    </div>
  )
}

export { BundleTreemap, squarify }
