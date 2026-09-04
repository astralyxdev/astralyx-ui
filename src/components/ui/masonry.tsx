import { Children, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A column layout for items of unequal height.
 *
 * For galleries, note walls, log cards — anything where forcing a uniform row
 * height would crop the content or leave ragged gaps under it.
 *
 * **CSS columns, not a JS layout pass.** The usual masonry implementation
 * measures every child and assigns it to the shortest column on each render,
 * which costs a layout read per item, has to be redone on resize, and reflows
 * visibly after paint. `column-count` does the same packing in the layout
 * engine, before paint, and reflows on resize for free.
 *
 * The trade is real and worth stating: CSS columns order items **top to bottom
 * within each column**, not left to right across them. For a gallery that is
 * fine. For anything where reading order carries meaning — a ranked list, a
 * feed — it is wrong, and `Kanban` or a plain grid is the honest choice.
 *
 * `break-inside: avoid` on each item is what stops a card being sliced in half
 * across a column boundary, which is the default and never what anyone wants.
 */
type MasonryProps = ComponentProps<'div'> & {
  /** Columns per breakpoint. Fewer keys is fine — each applies upward. */
  columns?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number }
  /** Gap between items, on the Tailwind spacing scale. */
  gap?: 2 | 3 | 4 | 6 | 8
  children?: ReactNode
}

// Written out rather than interpolated: Tailwind scans source text for class
// names, and `columns-${n}` produces nothing at build time.
const COLUMNS = {
  base: { 1: 'columns-1', 2: 'columns-2', 3: 'columns-3', 4: 'columns-4', 5: 'columns-5', 6: 'columns-6' },
  sm: { 1: 'sm:columns-1', 2: 'sm:columns-2', 3: 'sm:columns-3', 4: 'sm:columns-4', 5: 'sm:columns-5', 6: 'sm:columns-6' },
  md: { 1: 'md:columns-1', 2: 'md:columns-2', 3: 'md:columns-3', 4: 'md:columns-4', 5: 'md:columns-5', 6: 'md:columns-6' },
  lg: { 1: 'lg:columns-1', 2: 'lg:columns-2', 3: 'lg:columns-3', 4: 'lg:columns-4', 5: 'lg:columns-5', 6: 'lg:columns-6' },
  xl: { 1: 'xl:columns-1', 2: 'xl:columns-2', 3: 'xl:columns-3', 4: 'xl:columns-4', 5: 'xl:columns-5', 6: 'xl:columns-6' },
} as const

const GAP = {
  2: 'gap-2 [&>*]:mb-2',
  3: 'gap-3 [&>*]:mb-3',
  4: 'gap-4 [&>*]:mb-4',
  6: 'gap-6 [&>*]:mb-6',
  8: 'gap-8 [&>*]:mb-8',
} as const

function Masonry({
  columns = { base: 1, sm: 2, lg: 3 },
  gap = 4,
  className,
  children,
  ...props
}: MasonryProps) {
  const classes = (Object.entries(columns) as [keyof typeof COLUMNS, number][])
    .map(([breakpoint, count]) => {
      const scale = COLUMNS[breakpoint] as Record<number, string>
      return scale?.[count]
    })
    .filter(Boolean)

  return (
    <div
      data-slot="masonry"
      className={cn(classes, GAP[gap], className)}
      {...props}
    >
      {Children.map(children, (child, index) => (
        // The wrapper carries `break-inside-avoid` so callers do not have to
        // remember it, and a sliced card is the default without it.
        <div key={index} className="break-inside-avoid">
          {child}
        </div>
      ))}
    </div>
  )
}

export { Masonry }
export type { MasonryProps }
