import type { ComponentProps } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Move between pages of results.
 *
 * `pageItems` is exported because the windowing rule — how many neighbours to
 * show, and where gaps fall — is the part worth testing and reusing, not the
 * markup around it.
 */
type PageItem = number | 'gap'

/**
 * Pages to render for `page` of `count`, with `siblings` neighbours either side
 * and the first and last always present. Gaps collapse to a single ellipsis,
 * and the window is only ever elided when it saves at least one slot — so the
 * row never shows "… 4 …" where the number itself would have been shorter.
 */
function pageItems(page: number, count: number, siblings = 1): PageItem[] {
  // first + last + current + 2 gaps + siblings on both sides
  const slots = siblings * 2 + 5

  if (count <= slots) {
    return Array.from({ length: count }, (_, index) => index + 1)
  }

  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, count)

  const showLeftGap = left > 2
  const showRightGap = right < count - 1

  if (!showLeftGap && showRightGap) {
    const size = siblings * 2 + 3
    return [
      ...Array.from({ length: size }, (_, index) => index + 1),
      'gap',
      count,
    ]
  }

  if (showLeftGap && !showRightGap) {
    const size = siblings * 2 + 3
    return [
      1,
      'gap',
      ...Array.from({ length: size }, (_, index) => count - size + 1 + index),
    ]
  }

  return [
    1,
    'gap',
    ...Array.from({ length: right - left + 1 }, (_, index) => left + index),
    'gap',
    count,
  ]
}

type PaginationProps = Omit<ComponentProps<'nav'>, 'onChange'> & {
  page: number
  count: number
  onPageChange?: (page: number) => void
  /** Neighbours shown either side of the current page. */
  siblings?: number
  size?: ButtonProps['size']
  /** Hide the numbers and show only Previous / Next. */
  compact?: boolean
  /** Accessible name for the nav landmark. */
  label?: string
  previousLabel?: string
  nextLabel?: string
  /** Accessible name for a page button. */
  pageLabel?: (page: number) => string
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_PAGE_LABEL: (page: number) => string = (page) => `Page ${page}`

function Pagination({
  className,
  page,
  count,
  onPageChange,
  siblings = 1,
  size = 'icon-sm',
  compact = false,
  label = 'Pagination',
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  pageLabel = DEFAULT_PAGE_LABEL,
  ...props
}: PaginationProps) {
  const items = compact ? [] : pageItems(page, count, siblings)
  const go = (next: number) => {
    if (next >= 1 && next <= count && next !== page) onPageChange?.(next)
  }

  return (
    <nav
      aria-label={label}
      data-slot="pagination"
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      <Button
        variant="ghost"
        size={size}
        aria-label={previousLabel}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        <ChevronLeft />
      </Button>

      {items.map((item, index) =>
        item === 'gap' ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="text-muted-foreground flex size-8 items-center justify-center"
          >
            <MoreHorizontal className="size-3.5" />
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? 'default' : 'ghost'}
            size={size}
            // Icon sizes carry no text size, so a number in one inherited the
            // ambient page size — 16px here — and changed with wherever the
            // component was dropped. Pinned, and two pixels down from that.
            className="text-sm tabular-nums"
            aria-label={pageLabel(item)}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => go(item)}
          >
            {item}
          </Button>
        ),
      )}

      {compact && (
        <span className="text-muted-foreground px-2 text-sm tabular-nums">
          {page} / {count}
        </span>
      )}

      <Button
        variant="ghost"
        size={size}
        aria-label={nextLabel}
        disabled={page >= count}
        onClick={() => go(page + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}

export { Pagination, pageItems }
export type { PaginationProps, PageItem }
