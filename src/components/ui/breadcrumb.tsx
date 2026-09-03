import type { ComponentProps, ReactNode } from 'react'
import { Slot } from '@/components/primitives/slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The trail back up the hierarchy.
 *
 * An ordered list inside a labelled `<nav>`, because the order carries meaning.
 * The current page is a `<span aria-current="page">`, not a link — linking to
 * where you already are is noise for a screen reader.
 */
function Breadcrumb({
  className,
  label = 'Breadcrumb',
  ...props
}: ComponentProps<'nav'> & {
  children: ReactNode
  /** Accessible name for the nav landmark. */
  label?: string
}) {
  return (
    <nav
      aria-label={label}
      data-slot="breadcrumb"
      className={cn('w-full', className)}
      {...props}
    />
  )
}

function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm',
        className,
      )}
      {...props}
    />
  )
}

function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  )
}

/**
 * `asChild` renders the caller's own element — a router link, almost always.
 * A breadcrumb whose crumbs are plain `<a>` tags triggers a full page load in
 * a client-routed app, which is the one thing a breadcrumb must not do.
 */
function BreadcrumbLink({
  className,
  asChild = false,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        'hover:text-foreground px-0.5 transition-colors duration-150 ease-out motion-reduce:transition-none',
        radius.xs,
        focusRing,
        className,
      )}
      {...props}
    />
  )
}

function BreadcrumbPage({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('text-foreground font-medium', className)}
      {...props}
    />
  )
}

function BreadcrumbSeparator({
  className,
  children,
  ...props
}: ComponentProps<'li'>) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      // Sizes an icon child; a text child (a slash, a chevron glyph) inherits
      // the list's own size and colour, which is what you want for punctuation.
      className={cn('select-none [&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  )
}

function BreadcrumbEllipsis({
  className,
  label = 'More',
  ...props
}: ComponentProps<'span'> & {
  /** Screen-reader text for the collapsed items. */
  label?: ReactNode
}) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-ellipsis"
      className={cn('flex size-5 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="size-3.5" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
}
