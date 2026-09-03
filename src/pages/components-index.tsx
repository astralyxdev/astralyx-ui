import { ArrowRight } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { CATEGORIES, ENTRIES, componentPath, isReady } from '@/registry'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

/**
 * The catalogue: every component, grouped the way the rail groups them.
 *
 * A card rather than a bare list, because the description is the useful part
 * — the name alone rarely says whether this is the thing you want. The rail
 * beside it stays the fast path once you already know the name.
 */
function ComponentsIndex() {
  useSeo({
    title: 'Components',
    description:
      'Every component in the kit, grouped by category. Each has a live composer, worked examples and a full props table.',
    path: '/components',
  })

  const ready = ENTRIES.filter(isReady).length

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <PageHeader
        title="Components"
        description="Every primitive in the kit, written from scratch — no headless dependency, one token set for both themes, and keyboard and screen-reader behaviour wired in rather than bolted on."
        meta={
          <>
            <Badge size="sm">{ready} components</Badge>
            <Badge size="sm">{CATEGORIES.length} categories</Badge>
          </>
        }
      />

      <div className="space-y-10">
        {CATEGORIES.map((category) => (
          <section key={category.label} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                {category.label}
              </h2>
              <span className="text-muted-foreground/70 text-xs tabular-nums">
                {category.items.length}
              </span>
            </div>

            <ul className="grid list-none gap-3 sm:grid-cols-2">
              {category.items.map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={componentPath(entry.id)}
                    className={cn(
                      'group bg-card hover:border-foreground/25 block h-full border p-4',
                      'border-border transition-colors duration-150 ease-out motion-reduce:transition-none',
                      radius.surface,
                      focusRing,
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {entry.label}
                      </span>
                      {isReady(entry) ? (
                        <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors duration-150 ease-out motion-reduce:transition-none" />
                      ) : (
                        <Badge size="sm">Soon</Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground mt-1.5 line-clamp-2 block text-xs leading-relaxed">
                      {entry.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export { ComponentsIndex }
