'use client'

import { ArrowRight, Component } from 'lucide-react'
import { Link } from '@/lib/site-link'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { CATEGORIES, ENTRIES, TIERED, componentPath, isReady, tierCount } from '@/registry'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The catalogue: every component, grouped the way the rail groups them.
 *
 * A card rather than a bare list, because the description is the useful part
 * — the name alone rarely says whether this is the thing you want. The rail
 * beside it stays the fast path once you already know the name.
 *
 * Split into Basics and Blocks before it is split into categories. Thirty-six
 * headings in a row gave no answer to "where do I start" — the first thing
 * anyone needs is the difference between the components they will use in every
 * screen and the ones that exist for one screen each.
 */
function ComponentsIndex() {

  const ready = ENTRIES.filter(isReady).length

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <PageHeader
        title="Components"
        description="Every primitive in the kit, written from scratch — no headless dependency, one token set for both themes, and keyboard and screen-reader behaviour wired in rather than bolted on."
        meta={
          <>
            <Badge size="sm">{ready} components</Badge>
            <Badge size="sm">{tierCount('basic')} basics</Badge>
            <Badge size="sm">{tierCount('block')} blocks</Badge>
            <Badge size="sm">{CATEGORIES.length} categories</Badge>
          </>
        }
      />

      <div className="space-y-14">
        {TIERED.map((tier) => (
          <section key={tier.id} className="space-y-10">
            <div className="border-border border-b pb-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {tier.label}
                <span className="text-muted-foreground/60 ms-2 text-sm font-normal tabular-nums">
                  {tierCount(tier.id)}
                </span>
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
                {tier.blurb}
              </p>
            </div>

            {tier.categories.map((category) => (
              <section key={category.label} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight">
                    {category.label}
                  </h3>
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
                          <span className="flex min-w-0 items-center gap-2">
                            <Component
                              className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors duration-150 ease-out motion-reduce:transition-none"
                              aria-hidden="true"
                            />
                            <span className="truncate text-sm font-medium">
                              {entry.label}
                            </span>
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
          </section>
        ))}
      </div>
    </div>
  )
}

export { ComponentsIndex }
