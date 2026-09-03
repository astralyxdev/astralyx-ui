import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Key/value metadata — the panel that sits beside almost every detail view.
 *
 * A real `<dl>`, so the pairing is in the markup rather than implied by a
 * two-column grid. That matters for a screen reader, which announces a term
 * and its description together.
 *
 * `columns` lays terms beside values on wide screens and stacks them on narrow
 * ones. Stacking is not a fallback: at phone width a 40/60 split leaves both
 * halves too narrow to read, and a long value wraps into a column an inch wide.
 */
function DescriptionList({
  className,
  columns = true,
  divided = false,
  ...props
}: ComponentProps<'dl'> & {
  /** Term beside value from `sm` up. Off keeps them stacked at every width. */
  columns?: boolean
  divided?: boolean
}) {
  return (
    <dl
      data-slot="description-list"
      data-columns={columns}
      className={cn(
        'grid gap-x-6 gap-y-3 text-sm',
        columns && 'sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]',
        divided && '[&>dd]:border-border [&>dd]:not-last:border-b [&>dd]:not-last:pb-3',
        divided && columns && '[&>dt]:border-border [&>dt]:sm:not-last:border-b [&>dt]:sm:not-last:pb-3',
        className,
      )}
      {...props}
    />
  )
}

function DescriptionTerm({ className, ...props }: ComponentProps<'dt'>) {
  return (
    <dt
      data-slot="description-term"
      className={cn('text-muted-foreground min-w-0 font-medium', className)}
      {...props}
    />
  )
}

function DescriptionDetails({ className, ...props }: ComponentProps<'dd'>) {
  return (
    <dd
      data-slot="description-details"
      className={cn('ms-0 min-w-0 break-words', className)}
      {...props}
    />
  )
}

/** Convenience for the common case: a flat list of pairs. */
function DescriptionPairs({
  items,
  ...props
}: ComponentProps<typeof DescriptionList> & {
  items: { term: ReactNode; details: ReactNode }[]
}) {
  return (
    <DescriptionList {...props}>
      {items.map((item, index) => (
        <div key={index} className="contents">
          <DescriptionTerm>{item.term}</DescriptionTerm>
          <DescriptionDetails>{item.details}</DescriptionDetails>
        </div>
      ))}
    </DescriptionList>
  )
}

export {
  DescriptionDetails,
  DescriptionList,
  DescriptionPairs,
  DescriptionTerm,
}
