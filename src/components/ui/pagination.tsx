'use client'

import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { enterFade } from '@/lib/motion'
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
      className={cn(enterFade, 'flex items-center gap-1', className)}
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

/* ------------------------------------------------- range pagination */

/**
 * "21–40 of 57" with Previous and Next — for a list that is paged by offset or
 * by cursor rather than browsed by page number.
 *
 * Numbered pages need to know how many pages there are and to be able to jump
 * to any of them. An API that pages by cursor can do neither, and one that
 * counts up to a cap ("10,000+") cannot honestly offer page 500. What both can
 * always say is which rows are showing and whether there are more, which is
 * exactly what this shows.
 */
type RangeParts = { from: string; to: string; total: string }

type RangePaginationProps = Omit<ComponentProps<'nav'>, 'onChange'> & {
  /** Rows per page. */
  pageSize: number
  size?: ButtonProps['size']
  /** Accessible name for the nav landmark. */
  label?: string
  previousLabel?: ReactNode
  nextLabel?: ReactNode
  /** The range line, from numbers already formatted for `locale`. */
  rangeLabel?: (range: RangeParts) => ReactNode
  /** Shown in place of the range while the total is still loading. */
  unknownLabel?: ReactNode
  /** Formats the numbers in the range line. */
  locale?: string
}

/** Hoisted for the React Compiler — see `DEFAULT_PAGE_LABEL`. */
const DEFAULT_RANGE_LABEL = ({ from, to, total }: RangeParts) => `${from}–${to} of ${total}`

function RangeNav({
  range,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  size = 'sm',
  label = 'Pagination',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  unknownLabel = '…',
  rangeLabel = DEFAULT_RANGE_LABEL,
  className,
  ...props
}: Omit<RangePaginationProps, 'pageSize' | 'locale'> & {
  range: RangeParts | undefined
  canPrevious: boolean
  canNext: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <nav
      aria-label={label}
      data-slot="range-pagination"
      className={cn(
        enterFade,
        'text-muted-foreground flex items-center justify-between gap-2 text-sm',
        className,
      )}
      {...props}
    >
      {/* Polite, so a screen reader hears where Next landed without moving focus. */}
      <span className="tabular-nums" aria-live="polite">
        {range ? rangeLabel(range) : unknownLabel}
      </span>
      <span className="flex gap-2">
        <Button type="button" size={size} variant="secondary" disabled={!canPrevious} onClick={onPrevious}>
          <ChevronLeft /> {previousLabel}
        </Button>
        <Button type="button" size={size} variant="secondary" disabled={!canNext} onClick={onNext}>
          {nextLabel} <ChevronRight />
        </Button>
      </span>
    </nav>
  )
}

/** The offset of the last page that holds anything — 0 when there is nothing. */
function lastPageOffset(total: number, pageSize: number) {
  return total <= 0 ? 0 : Math.floor((total - 1) / pageSize) * pageSize
}

type OffsetPaginationProps = RangePaginationProps & {
  offset: number
  /** Undefined while it loads. */
  total: number | undefined
  onOffsetChange: (offset: number) => void
  /**
   * The deepest offset the API accepts. No Next past it, and an offset beyond
   * it — a stale link — is moved back to the last page it allows.
   */
  maxOffset?: number
}

/**
 * Offset paging. Renders nothing while everything fits on one page.
 *
 * It also corrects itself. When the total shrinks under the current page —
 * rows deleted, a filter narrowed, a link kept from last week — it calls
 * `onOffsetChange` with the last page that still holds rows, rather than
 * leaving "61–80 of 57" over an empty table.
 */
function OffsetPagination({
  offset,
  pageSize,
  total,
  onOffsetChange,
  maxOffset,
  locale,
  ...props
}: OffsetPaginationProps) {
  const beyond = total !== undefined && offset > 0 && offset >= total
  const tooFar = maxOffset !== undefined && offset > maxOffset

  useEffect(() => {
    if (tooFar) onOffsetChange(Math.floor(maxOffset / pageSize) * pageSize)
    else if (beyond && total !== undefined) onOffsetChange(lastPageOffset(total, pageSize))
  }, [beyond, tooFar, total, pageSize, maxOffset, onOffsetChange])

  if (total !== undefined && total <= pageSize && offset === 0) return null

  const number = new Intl.NumberFormat(locale)
  return (
    <RangeNav
      range={
        total === undefined
          ? undefined
          : {
              from: total === 0 ? '0' : number.format(offset + 1),
              to: number.format(Math.min(offset + pageSize, total)),
              total: number.format(total),
            }
      }
      canPrevious={offset > 0}
      canNext={
        total !== undefined &&
        offset + pageSize < total &&
        (maxOffset === undefined || offset + pageSize <= maxOffset)
      }
      onPrevious={() => onOffsetChange(Math.max(0, offset - pageSize))}
      onNext={() => onOffsetChange(offset + pageSize)}
      {...props}
    />
  )
}

type CursorPaginationProps = RangePaginationProps & {
  /** Zero-based page index, from `useCursorPagination`. */
  page: number
  /** Rows on the page shown. Undefined while it loads. */
  rows: number | undefined
  total: number | undefined
  /** The total was counted only up to a cap — shown as "10,000+". */
  totalCapped?: boolean
  /** The cursor of the page after this one. None means this is the last. */
  nextCursor: string | null | undefined
  onNext: (cursor: string) => void
  onPrevious: () => void
}

/**
 * Cursor (keyset) paging. A cursor only knows the way forward, so the range
 * is worked out from the page index and the rows on it, and the total — when
 * the API counts at all — is taken as given, capped or not.
 */
function CursorPagination({
  page,
  pageSize,
  rows,
  total,
  totalCapped = false,
  nextCursor,
  onNext,
  onPrevious,
  locale,
  ...props
}: CursorPaginationProps) {
  if (page === 0 && !nextCursor && total !== undefined && total <= pageSize) return null

  const number = new Intl.NumberFormat(locale)
  const from = page * pageSize
  return (
    <RangeNav
      range={
        total === undefined || rows === undefined
          ? undefined
          : {
              from: rows === 0 ? number.format(from) : number.format(from + 1),
              to: number.format(from + rows),
              total: `${number.format(total)}${totalCapped ? '+' : ''}`,
            }
      }
      canPrevious={page > 0}
      canNext={Boolean(nextCursor)}
      onPrevious={onPrevious}
      onNext={() => nextCursor && onNext(nextCursor)}
      {...props}
    />
  )
}

/**
 * The trail of cursors behind a cursor-paged list.
 *
 * Next pushes the page's `nextCursor`, Previous pops one — a cursor API has no
 * way back, so the way back is remembered here. A new `resetKey` (the filters
 * changed, so every cursor in the trail now points into a different list)
 * starts again from the first page.
 */
function useCursorPagination(resetKey: string) {
  const [state, setState] = useState<{ key: string; stack: string[] }>({
    key: resetKey,
    stack: [],
  })
  let stack = state.stack
  // Reset during render rather than in an effect, so the stale cursor never
  // reaches a request.
  if (state.key !== resetKey) {
    setState({ key: resetKey, stack: [] })
    stack = []
  }

  return {
    /** The cursor of the page shown — undefined on the first page. */
    cursor: stack.at(-1),
    /** Zero-based page index. */
    page: stack.length,
    next: (cursor: string) =>
      setState((current) => ({ ...current, stack: [...current.stack, cursor] })),
    previous: () => setState((current) => ({ ...current, stack: current.stack.slice(0, -1) })),
    first: () => setState((current) => ({ ...current, stack: [] })),
  }
}

export {
  CursorPagination,
  OffsetPagination,
  Pagination,
  lastPageOffset,
  pageItems,
  useCursorPagination,
}
export type {
  CursorPaginationProps,
  OffsetPaginationProps,
  PageItem,
  PaginationProps,
  RangePaginationProps,
}
