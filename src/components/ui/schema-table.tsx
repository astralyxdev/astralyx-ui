import type { ComponentProps, ReactNode } from 'react'
import { KeyRound, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A table's columns, keys and indexes.
 *
 * Nullability is stated as "not null" rather than left implied. A blank in a
 * nullable column reads as missing information; the constraint is the fact, and
 * it is the thing that decides whether your code needs a null check.
 *
 * Foreign keys name their target inline. A column called `owner_id` tells you
 * nothing about whether it points at `users` or `accounts`, and that is
 * precisely what someone reading a schema is trying to find out.
 *
 * Indexes are listed separately from columns, with their columns in order.
 * Index column order is not cosmetic — an index on `(a, b)` cannot serve a
 * query filtering only on `b`, and a set-like display hides that completely.
 */
export type SchemaColumn = {
  name: string
  type: string
  nullable?: boolean
  primaryKey?: boolean
  /** e.g. "users.id" */
  references?: string
  default?: string
  comment?: ReactNode
}

export type SchemaIndex = {
  name: string
  /** In order — order determines which queries it can serve. */
  columns: string[]
  unique?: boolean
  method?: string
}

function SchemaTable({
  name,
  columns,
  indexes = [],
  rowCount,
  columnsLabel = 'Columns',
  indexesLabel = 'Indexes',
  notNullLabel = 'not null',
  primaryKeyLabel = 'primary key',
  uniqueLabel = 'unique',
  referencesLabel = 'references',
  defaultLabel = 'default',
  rowsLabel = 'rows',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  name: ReactNode
  columns: SchemaColumn[]
  indexes?: SchemaIndex[]
  rowCount?: number
  columnsLabel?: ReactNode
  indexesLabel?: ReactNode
  notNullLabel?: ReactNode
  /** Accessible name for the key icon. */
  primaryKeyLabel?: string
  uniqueLabel?: ReactNode
  /** Accessible name for the foreign-key icon. */
  referencesLabel?: string
  defaultLabel?: ReactNode
  rowsLabel?: ReactNode
}) {
  return (
    <div
      data-slot="schema-table"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-baseline gap-2 border-b p-3">
        <code className="font-mono text-sm font-medium">{name}</code>
        {rowCount !== undefined && (
          <span className="text-muted-foreground ms-auto text-xs tabular-nums">
            {rowCount.toLocaleString()} {rowsLabel}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-muted-foreground mb-2 text-xs font-medium">{columnsLabel}</p>
        <ul className="flex list-none flex-col gap-1.5">
          {columns.map((column) => (
            <li key={column.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
              {column.primaryKey && (
                <KeyRound
                  className="size-3 shrink-0 self-center text-[var(--amber-soft-foreground)]"
                  aria-label={primaryKeyLabel}
                />
              )}
              {column.references && (
                <Link2
                  className="text-muted-foreground/60 size-3 shrink-0 self-center"
                  aria-label={referencesLabel}
                />
              )}

              <code className="font-mono font-medium">{column.name}</code>
              <code className="text-muted-foreground font-mono">{column.type}</code>

              {/* The constraint is the fact; a blank reads as missing data. */}
              {column.nullable === false && (
                <span className="text-muted-foreground/70">{notNullLabel}</span>
              )}

              {/* Names the target: `owner_id` alone answers nothing. */}
              {column.references && (
                <code className="text-muted-foreground/70 font-mono">→ {column.references}</code>
              )}

              {column.default !== undefined && (
                <span className="text-muted-foreground/70">
                  {defaultLabel} <code className="font-mono">{column.default}</code>
                </span>
              )}

              {column.comment && (
                <span className="text-muted-foreground/60 w-full">{column.comment}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {indexes.length > 0 && (
        <div className="border-border border-t p-3">
          <p className="text-muted-foreground mb-2 text-xs font-medium">{indexesLabel}</p>
          <ul className="flex list-none flex-col gap-1.5">
            {indexes.map((index) => (
              <li key={index.name} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                <code className="font-mono">{index.name}</code>
                {/* Order matters: (a, b) cannot serve a query on b alone. */}
                <code className="text-muted-foreground font-mono">
                  ({index.columns.join(', ')})
                </code>
                {index.unique && (
                  <Badge size="sm" color="neutral">
                    {uniqueLabel}
                  </Badge>
                )}
                {index.method && (
                  <span className="text-muted-foreground/60 font-mono">{index.method}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { SchemaTable }
