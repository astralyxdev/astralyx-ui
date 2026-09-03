import type { ComponentProps, ReactNode } from 'react'
import { Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A changelog: versions newest first, each with its notes.
 *
 * The version is an `<h3>` inside an article rather than a styled div, because
 * a changelog is a document — someone lands on it from a link and navigates it
 * by heading. Order is the caller's; this never sorts, since "newest first"
 * cannot be derived from a semver string alone once pre-releases are involved.
 */
export type Release = {
  version: string
  date?: Date
  /** Highlighted as the current or newest release. */
  current?: boolean
  tag?: ReactNode
  notes?: ReactNode
  /** Grouped bullets — Added, Fixed, Changed. */
  sections?: { label: string; items: ReactNode[] }[]
}

function ReleaseList({
  releases,
  locale = 'en-GB',
  latestLabel = 'Latest',
  className,
  ...props
}: ComponentProps<'div'> & {
  releases: Release[]
  locale?: string
  /** Badge on the newest release. */
  latestLabel?: ReactNode
}) {
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      data-slot="release-list"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    >
      {releases.map((release) => (
        <article
          key={release.version}
          className={cn(surface, radius.surface, 'p-4')}
        >
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <Tag className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <h3 className="font-mono text-sm font-semibold">{release.version}</h3>
            {release.current && (
              <Badge size="sm" color="green">
                {latestLabel}
              </Badge>
            )}
            {release.tag}
            {release.date && (
              <time
                dateTime={release.date.toISOString()}
                className="text-muted-foreground ms-auto text-xs"
              >
                {date.format(release.date)}
              </time>
            )}
          </header>

          {release.notes && (
            <div className="text-muted-foreground mb-3 text-sm">{release.notes}</div>
          )}

          {release.sections?.map((section) => (
            <section key={section.label} className="mb-3 last:mb-0">
              <h4 className="mb-1 text-xs font-medium tracking-wide uppercase">
                {section.label}
              </h4>
              <ul className="text-muted-foreground ms-4 flex list-disc flex-col gap-0.5 text-sm">
                {section.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      ))}
    </div>
  )
}

export { ReleaseList }
