import type { ReactNode } from 'react'

/** A titled block on a component page. */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    // `last:mb-0` matters: the final section's margin used to stack on top of
    // the page's own bottom padding, leaving a screenful of nothing to scroll
    // past at the end of every component page.
    <section className="mb-12 scroll-mt-8 last:mb-0" id={title.toLowerCase()}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export { Section }
