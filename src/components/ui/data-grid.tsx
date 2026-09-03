import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A sortable, selectable table driven by a column definition.
 *
 * `Table` stays the presentational layer; this adds the behaviour that every
 * table grows eventually and that everyone re-implements slightly differently.
 *
 * Sorting is stable and non-destructive: rows are indexed, compared, and the
 * original order breaks ties, so re-sorting on an equal column never shuffles
 * rows that looked settled. Sorting also never mutates the caller's array.
 */
export type Column<Row> = {
  key: string
  header: ReactNode
  /** Cell contents. Defaults to `row[key]`. */
  render?: (row: Row) => ReactNode
  /** Sort key. Supply for anything that is not directly comparable. */
  sortValue?: (row: Row) => string | number
  sortable?: boolean
  align?: 'start' | 'end' | 'center'
  /** Hide below the `sm` breakpoint, for columns that are nice-to-have. */
  hideOnMobile?: boolean
  width?: string
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null

const ALIGN = {
  start: 'text-start',
  end: 'text-end',
  center: 'text-center',
} as const

function DataGrid<Row extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  defaultSort = null,
  selectable = false,
  selected,
  onSelectedChange,
  onRowClick,
  empty,
  emptyLabel = 'No rows',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  defaultSort?: SortState
  selectable?: boolean
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  onRowClick?: (row: Row) => void
  empty?: ReactNode
  /** Tooltip on the empty state. */
  emptyLabel?: string
}) {
  const [sort, setSort] = useState<SortState>(defaultSort)
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const selection = selected ?? internalSelected

  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column) return rows

    const value = (row: Row) =>
      column.sortValue?.(row) ?? (row[column.key] as string | number)

    // Index-carrying copy: the original position is the tiebreak, which is what
    // makes the sort stable across repeated clicks.
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const left = value(a.row)
        const right = value(b.row)
        if (left === right) return a.index - b.index
        const order = left < right ? -1 : 1
        return sort.direction === 'asc' ? order : -order
      })
      .map((entry) => entry.row)
  }, [rows, columns, sort])

  const allKeys = sorted.map(rowKey)
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selection.includes(k))
  const someSelected = selection.length > 0 && !allSelected

  function setSelection(next: string[]) {
    if (selected === undefined) setInternalSelected(next)
    onSelectedChange?.(next)
  }

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key !== key
        ? { key, direction: 'asc' }
        : current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null,
    )
  }

  // `Table` already draws its own bordered, rounded container. Wrapping it in
  // another one gave a double border with two different radii — so the empty
  // state supplies its own box, and the populated grid just styles Table's.
  if (sorted.length === 0) {
    return (
      <div
        data-slot="data-grid"
        className={cn(surface, radius.panel, 'w-full', className)}
        {...props}
      >
        {empty ?? (
          <Empty title={emptyLabel} description="Nothing matches the current filters." />
        )}
      </div>
    )
  }

  return (
    <div data-slot="data-grid" className={cn('w-full', className)} {...props}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  aria-label={allSelected ? 'Clear selection' : 'Select all rows'}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => setSelection(allSelected ? [] : allKeys)}
                />
              </TableHead>
            )}
            {columns.map((column) => {
              const active = sort?.key === column.key
              const Icon = !active
                ? ChevronsUpDown
                : sort.direction === 'asc'
                  ? ArrowUp
                  : ArrowDown

              return (
                <TableHead
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    active
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : column.sortable
                        ? 'none'
                        : undefined
                  }
                  className={cn(
                    ALIGN[column.align ?? 'start'],
                    column.hideOnMobile && 'hidden sm:table-cell',
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        'hover:text-foreground -mx-1 inline-flex items-center gap-1 px-1 py-0.5',
                        radius.xs,
                        interactive,
                        focusRing,
                        active && 'text-foreground',
                      )}
                    >
                      {column.header}
                      <Icon className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((row) => {
            const key = rowKey(row)
            const isSelected = selection.includes(key)

            return (
              <TableRow
                key={key}
                data-selected={isSelected || undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  isSelected && 'bg-accent/50',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {selectable && (
                  <TableCell className="w-10">
                    <Checkbox
                      aria-label={`Select row ${key}`}
                      checked={isSelected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() =>
                        setSelection(
                          isSelected
                            ? selection.filter((id) => id !== key)
                            : [...selection, key],
                        )
                      }
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      ALIGN[column.align ?? 'start'],
                      column.hideOnMobile && 'hidden sm:table-cell',
                    )}
                  >
                    {column.render?.(row) ?? String(row[column.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataGrid }
export type { Column as DataGridColumn }
