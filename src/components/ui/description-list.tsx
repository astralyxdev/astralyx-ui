import type { ComponentProps, ReactNode } from 'react'
import { enterFade } from '@/lib/motion'
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
        enterFade,
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

/**
 * Label on the left, figure on the right, one row each — a quote, a fee
 * breakdown, an order total.
 *
 * The values align to the end with tabular digits, so a column of amounts
 * lines up on the decimal point the way a receipt does. It stays two columns
 * at every width: a figure is short, and stacking it under its label is what
 * makes a breakdown hard to add up. `strong` marks the total.
 */
function SummaryList({
  items,
  className,
  ...props
}: Omit<ComponentProps<'dl'>, 'children'> & {
  items: { term: ReactNode; details: ReactNode; strong?: boolean }[]
}) {
  return (
    <DescriptionList
      className={cn(
        'grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div key={index} className="contents">
          <DescriptionTerm className={cn(item.strong && 'text-foreground')}>{item.term}</DescriptionTerm>
          <DescriptionDetails className={cn('text-end tabular-nums', item.strong && 'font-semibold')}>
            {item.details}
          </DescriptionDetails>
        </div>
      ))}
    </DescriptionList>
  )
}

/**
 * A handful of short facts — a status, a count, a date — across the width of
 * a card, each a caption over its value.
 *
 * Five facts in a two-column DescriptionList fill the left third of a wide
 * card and leave the rest empty. Laid across, they read at a glance and the
 * card is as tall as one row. As many 10rem columns as fit, two on a phone.
 */
function FactGrid({
  items,
  className,
  ...props
}: Omit<ComponentProps<'dl'>, 'children'> & {
  items: { term: ReactNode; details: ReactNode }[]
}) {
  return (
    <dl
      data-slot="fact-grid"
      className={cn(
        enterFade,
        'grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 flex-col items-start gap-1">
          <dt className="text-muted-foreground text-xs font-medium">{item.term}</dt>
          <dd className="ms-0 max-w-full min-w-0 break-words">{item.details}</dd>
        </div>
      ))}
    </dl>
  )
}

export {
  DescriptionDetails,
  DescriptionList,
  DescriptionPairs,
  DescriptionTerm,
  FactGrid,
  SummaryList,
}
