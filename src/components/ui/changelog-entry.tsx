import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * One release's notes, grouped by change type.
 *
 * Breaking changes are hoisted to the top regardless of the order they were
 * supplied in, and they carry their own tone. Everything else in a changelog is
 * optional reading; a breaking change is the one thing that has to be seen, and
 * burying it under "Features" is how a minor bump takes a service down.
 *
 * The version is a heading and the date is secondary. People navigate a
 * changelog by version, and a date-led entry forces a translation step every
 * time.
 *
 * Groups render in a fixed order — breaking, added, changed, fixed, removed,
 * deprecated, security — rather than in object key order, so two releases are
 * visually comparable.
 */
export type ChangeGroup =
  | 'breaking' | 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security'

const ORDER: ChangeGroup[] = [
  'breaking', 'security', 'added', 'changed', 'fixed', 'deprecated', 'removed',
]

const GROUP = {
  breaking: { label: 'Breaking', color: 'destructive' },
  security: { label: 'Security', color: 'destructive' },
  added: { label: 'Added', color: 'green' },
  changed: { label: 'Changed', color: 'blue' },
  fixed: { label: 'Fixed', color: 'violet' },
  deprecated: { label: 'Deprecated', color: 'amber' },
  removed: { label: 'Removed', color: 'neutral' },
} as const

function ChangelogEntry({
  version,
  date,
  changes,
  summary,
  prerelease = false,
  yanked = false,
  locale = 'en-GB',
  groupLabels,
  prereleaseLabel = 'pre-release',
  yankedLabel = 'yanked',
  yankedNote = 'This release was withdrawn. Do not upgrade to it.',
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'children'> & {
  version: ReactNode
  date?: Date
  /** Bullet lists keyed by change type. */
  changes: Partial<Record<ChangeGroup, ReactNode[]>>
  summary?: ReactNode
  prerelease?: boolean
  yanked?: boolean
  locale?: string
  groupLabels?: Partial<Record<ChangeGroup, ReactNode>>
  prereleaseLabel?: ReactNode
  yankedLabel?: ReactNode
  yankedNote?: ReactNode
}) {
  return (
    <article
      data-slot="changelog-entry"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', yanked && 'opacity-70', className)}
      {...props}
    >
      <header className="flex flex-wrap items-baseline gap-2">
        {/* Version leads: that is how a changelog is navigated. */}
        <h3 className="font-mono text-base font-semibold">{version}</h3>
        {date && (
          <time className="text-muted-foreground text-xs">
            <Fmt type="date" value={date} format="D MMMM YYYY" locale={locale} />
          </time>
        )}
        {prerelease && (
          <Badge size="sm" color="amber">
            {prereleaseLabel}
          </Badge>
        )}
        {yanked && (
          <Badge size="sm" color="destructive">
            {yankedLabel}
          </Badge>
        )}
      </header>

      {yanked && yankedNote && (
        <p className="text-xs text-[var(--destructive-soft-foreground)]">{yankedNote}</p>
      )}

      {summary && <p className="text-muted-foreground text-sm">{summary}</p>}

      {/* Fixed order, so two releases can be compared at a glance. */}
      {ORDER.filter((group) => changes[group]?.length).map((group) => {
        const meta = GROUP[group]
        return (
          <section key={group} className="flex flex-col gap-1.5">
            <Badge size="sm" color={meta.color} className="self-start">
              {groupLabels?.[group] ?? meta.label}
            </Badge>
            <ul className="ms-1 flex list-none flex-col gap-1">
              {changes[group]!.map((change, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-1.5 size-1 shrink-0 rounded-full',
                      group === 'breaking' || group === 'security'
                        ? 'bg-[var(--destructive)]'
                        : 'bg-muted-foreground/40',
                    )}
                  />
                  <span className="min-w-0 flex-1">{change}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </article>
  )
}

export { ChangelogEntry, ORDER as changelogGroupOrder }
