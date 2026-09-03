import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The masthead every page in the catalogue opens with.
 *
 * Extracted because four pages had each grown their own copy of the same
 * markup, and they had already drifted — different bottom padding, different
 * measure on the lead paragraph. One header keeps the rhythm identical as you
 * move between a doc, a component and an index.
 *
 * `eyebrow` is the line above the title: a breadcrumb on a component page, the
 * source path, a section label. `meta` sits under the lead for counts, badges
 * or links.
 */
function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  className,
}: {
  eyebrow?: ReactNode
  title: string
  description?: ReactNode
  meta?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('border-border mb-10 border-b pb-6', className)}>
      {eyebrow && <div className="mb-2">{eyebrow}</div>}
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm text-pretty">
          {description}
        </p>
      )}
      {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
    </header>
  )
}

export { PageHeader }
