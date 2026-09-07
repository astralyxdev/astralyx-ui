import type { ComponentProps } from 'react'
import { enterFade } from '@/lib/motion'
import { radius, surface, tablePadding } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Rows and columns of structured data.
 *
 * The wrapper scrolls rather than the page, so a wide table never forces
 * horizontal scroll on the whole document — the single most common table bug.
 */
function Table({
  className,
  containerClassName,
  ...props
}: ComponentProps<'table'> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        surface,
        radius.panel,
        'w-full overflow-x-auto',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn(enterFade, 'w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-border [&_tr]:border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        'border-border [&_tr]:border-b [&_tr:last-child]:border-0',
        className,
      )}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-border bg-muted/40 border-t font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-border hover:bg-muted/40 data-[state=selected]:bg-muted transition-colors duration-150 ease-out motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Padding on all four sides rather than a fixed height and horizontal
        // padding only: a `h-10 px-4` heading is 12px above and below its text
        // and 16px either side of it, which is a different inset depending on
        // which edge you measure. `tablePadding` is the same on all four.
        'text-muted-foreground text-start align-middle text-xs font-medium whitespace-nowrap',
        tablePadding,
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('align-middle', tablePadding, className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-3 px-4 pb-3 text-xs', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}
