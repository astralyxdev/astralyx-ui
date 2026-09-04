import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A parsed CSV before you import it, with the rows that will break the import.
 *
 * The point of a preview is not to show the data — it is to show the **bad
 * rows**, and a preview that renders the first ten rows of a clean file has
 * shown you nothing. Rows whose column count does not match the header are
 * flagged and counted, because that is the failure that aborts an import
 * halfway and leaves a table half-populated.
 *
 * Type inference is per column and reported with a confidence, not asserted. A
 * column that is 998 integers and 2 empty strings is an integer column with
 * nulls; one that is 500 integers and 500 dates is a mess someone has to look
 * at. Both would render as "mixed" if inference were a single guess.
 *
 * It does not parse. Quoted fields containing commas and newlines are a real
 * parser's job, and a component that ships a naive `split(',')` will silently
 * mangle exactly the files that most need previewing.
 */
export type CsvColumn = {
  name: string
  /** What the caller's parser inferred. */
  type?: 'string' | 'integer' | 'number' | 'boolean' | 'date' | 'mixed'
  /** 0–1. Below 1 means some cells did not match. */
  confidence?: number
  /** Cells that were empty. */
  nulls?: number
}

type CsvPreviewProps = Omit<ComponentProps<'div'>, 'children'> & {
  columns: CsvColumn[]
  /** Already parsed. This component renders; it does not parse. */
  rows: string[][]
  /** Total rows in the file, when more than are shown here. */
  totalRows?: number
  /** Indices into `rows` whose column count did not match the header. */
  malformed?: number[]
  emptyLabel?: string
  malformedLabel?: (count: number) => ReactNode
  showingLabel?: (shown: number, total: number) => ReactNode
  nullsLabel?: string
}

const TYPE_TONE: Record<string, string> = {
  integer: 'text-[var(--blue-soft-foreground)]',
  number: 'text-[var(--blue-soft-foreground)]',
  date: 'text-[var(--violet-soft-foreground)]',
  boolean: 'text-[var(--cyan-soft-foreground)]',
  mixed: 'text-[var(--amber-soft-foreground)]',
  string: 'text-muted-foreground',
}

function CsvPreview({
  columns,
  rows,
  totalRows,
  malformed = [],
  emptyLabel = 'This file has no rows.',
  malformedLabel = (count) =>
    `${count} row${count === 1 ? '' : 's'} do not match the header and will fail the import.`,
  showingLabel = (shown, total) => `Showing ${shown} of ${total.toLocaleString()} rows`,
  nullsLabel = 'empty',
  className,
  ...props
}: CsvPreviewProps) {
  const bad = useMemo(() => new Set(malformed), [malformed])

  return (
    <div
      data-slot="csv-preview"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {/* Before the table: the reason to open a preview at all. */}
      {malformed.length > 0 && (
        <p className="border-border flex items-center gap-2 border-b bg-[var(--destructive-soft)] px-4 py-2.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {malformedLabel(malformed.length)}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground/40 w-10 px-3 py-2 text-[11px] font-normal tabular-nums">
                  #
                </th>
                {columns.map((column) => (
                  <th key={column.name} className="px-3 py-2 align-bottom">
                    <span className="block font-mono text-xs font-medium">{column.name}</span>
                    <span className="text-muted-foreground/60 mt-0.5 flex flex-wrap items-baseline gap-1.5 text-[10px]">
                      <span className={cn('font-mono', TYPE_TONE[column.type ?? 'string'])}>
                        {column.type ?? 'string'}
                      </span>
                      {/* Reported, not asserted: 998 ints and 2 blanks is an
                          int column with nulls, not a mixed one. */}
                      {column.confidence !== undefined && column.confidence < 1 && (
                        <span className="tabular-nums">{Math.round(column.confidence * 100)}%</span>
                      )}
                      {column.nulls ? (
                        <span className="tabular-nums">
                          {column.nulls} {nullsLabel}
                        </span>
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    'border-border/60 border-b last:border-b-0',
                    bad.has(index) && 'bg-[var(--destructive-soft)]',
                  )}
                >
                  <td className="text-muted-foreground/40 px-3 py-1.5 font-mono text-[11px] tabular-nums">
                    {index + 1}
                  </td>
                  {columns.map((column, cell) => (
                    <td
                      key={column.name}
                      className={cn(
                        'px-3 py-1.5 font-mono text-[11px]',
                        row[cell] === undefined || row[cell] === ''
                          ? 'text-muted-foreground/30'
                          : 'text-foreground/85',
                      )}
                    >
                      {row[cell] === undefined || row[cell] === '' ? '∅' : row[cell]}
                    </td>
                  ))}
                  {bad.has(index) && (
                    <td className="px-3 py-1.5">
                      <Badge size="sm" color="destructive">
                        {row.length} cols
                      </Badge>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalRows !== undefined && totalRows > rows.length && (
        <p className="border-border text-muted-foreground/60 border-t px-4 py-2 text-[11px] tabular-nums">
          {showingLabel(rows.length, totalRows)}
        </p>
      )}
    </div>
  )
}

export { CsvPreview }
export type { CsvPreviewProps }
