import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ArrowUpRight, Package, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Package dependencies with their update and vulnerability state.
 *
 * Severity outranks staleness in the sort. A list ordered by how out of date
 * things are buries a critical advisory behind forty cosmetic patch bumps,
 * which is precisely backwards from how anyone triages this.
 *
 * The update badge distinguishes major from minor, because "12 outdated" is not
 * actionable while "1 major, 11 patch" is — one is an afternoon and the other
 * is a sprint.
 */
export type Dependency = {
  name: string
  current: string
  latest?: string
  /** Derived from the version pair when omitted. */
  update?: 'major' | 'minor' | 'patch' | null
  dev?: boolean
  vulnerability?: { severity: 'critical' | 'high' | 'moderate' | 'low'; id?: string }
  size?: number
  homepage?: string
}

const SEVERITY_RANK = { critical: 0, high: 1, moderate: 2, low: 3 } as const
const UPDATE_RANK = { major: 0, minor: 1, patch: 2 } as const

const SEVERITY_COLOR = {
  critical: 'destructive',
  high: 'destructive',
  moderate: 'amber',
  low: 'neutral',
} as const

const UPDATE_COLOR = { major: 'destructive', minor: 'amber', patch: 'blue' } as const

/** Compare two semver-ish strings; anything unparseable means no update shown. */
function updateKind(current: string, latest?: string) {
  if (!latest) return null
  const parse = (value: string) =>
    value.replace(/^[^\d]*/, '').split('.').map((part) => Number.parseInt(part, 10))
  const [a = 0, b = 0, c = 0] = parse(current)
  const [x = 0, y = 0, z = 0] = parse(latest)
  if ([a, b, c, x, y, z].some(Number.isNaN)) return null
  if (x > a) return 'major' as const
  if (x === a && y > b) return 'minor' as const
  if (x === a && y === b && z > c) return 'patch' as const
  return null
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_HOMEPAGE_LABEL: (name: string) => string = (name) => `${name} homepage`

function DependencyList({
  dependencies,
  searchable = true,
  devLabel = 'dev',
  currentLabel = 'current',
  filterPlaceholder = 'Filter packages',
  filterLabel = 'Filter packages',
  emptyMessage = 'No packages match.',
  homepageLabel = DEFAULT_HOMEPAGE_LABEL,
  className,
  ...props
}: ComponentProps<'div'> & {
  dependencies: Dependency[]
  searchable?: boolean
  /** Badge on a dev-only dependency. */
  devLabel?: ReactNode
  /** Marks a package already on its latest version. */
  currentLabel?: ReactNode
  filterPlaceholder?: string
  /** Accessible name for the filter field. */
  filterLabel?: string
  emptyMessage?: ReactNode
  /** Accessible name for a package's homepage link. */
  homepageLabel?: (name: string) => string
}) {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const resolved = dependencies.map((dep) => ({
      ...dep,
      update: dep.update !== undefined ? dep.update : updateKind(dep.current, dep.latest),
    }))

    // Vulnerabilities first, then the size of the version jump, then name.
    return resolved
      .filter((dep) => dep.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const severity =
          (a.vulnerability ? SEVERITY_RANK[a.vulnerability.severity] : 9) -
          (b.vulnerability ? SEVERITY_RANK[b.vulnerability.severity] : 9)
        if (severity !== 0) return severity

        const update =
          (a.update ? UPDATE_RANK[a.update] : 9) - (b.update ? UPDATE_RANK[b.update] : 9)
        if (update !== 0) return update

        return a.name.localeCompare(b.name)
      })
  }, [dependencies, query])

  const vulnerable = rows.filter((dep) => dep.vulnerability).length
  const outdated = rows.filter((dep) => dep.update).length

  return (
    <div
      data-slot="dependency-list"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-col gap-2 border-b p-2 sm:flex-row sm:items-center">
        {/* `shrink-0` on the summary, not just `whitespace-nowrap`: the filter
            beside it is `w-full`, so without this the group is squeezed until
            the count wraps onto a second line. */}
        <div className="flex shrink-0 items-center gap-2 px-1">
          <Package className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium whitespace-nowrap">
            {rows.length} packages
          </span>
          {vulnerable > 0 && (
            <Badge size="sm" color="destructive">
              <ShieldAlert />
              {vulnerable}
            </Badge>
          )}
          {outdated > 0 && <Badge size="sm">{outdated} outdated</Badge>}
        </div>

        {searchable && (
          <Input
            size="sm"
            variant="secondary"
            placeholder={filterPlaceholder}
            aria-label={filterLabel}
            value={query}
            clearable
            onChange={(event) => setQuery(event.target.value)}
            containerClassName="sm:ms-auto sm:w-44"
          />
        )}
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {rows.map((dep) => (
          <li key={dep.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <code className="truncate font-mono text-sm font-medium">{dep.name}</code>
                {dep.dev && <Badge size="sm">{devLabel}</Badge>}
                {dep.homepage && (
                  <a
                    href={dep.homepage}
                    aria-label={homepageLabel(dep.name)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </a>
                )}
              </p>

              {dep.vulnerability && (
                <p className="mt-1 text-xs text-[var(--destructive-soft-foreground)]">
                  {dep.vulnerability.severity} severity
                  {dep.vulnerability.id && ` · ${dep.vulnerability.id}`}
                </p>
              )}
            </div>

            <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
              {dep.current}
              {dep.update && dep.latest && (
                <>
                  <span className="mx-1.5" aria-hidden="true">→</span>
                  <span className="text-foreground">{dep.latest}</span>
                </>
              )}
            </span>

            {dep.update ? (
              <Badge size="sm" color={UPDATE_COLOR[dep.update]}>
                {dep.update}
              </Badge>
            ) : (
              <Badge size="sm" color="green">
                {currentLabel}
              </Badge>
            )}

            {dep.vulnerability && (
              <Badge size="sm" color={SEVERITY_COLOR[dep.vulnerability.severity]}>
                <ShieldAlert />
                {dep.vulnerability.severity}
              </Badge>
            )}
          </li>
        ))}

        {rows.length === 0 && (
          <li className="text-muted-foreground p-8 text-center text-sm">
            {emptyMessage}
          </li>
        )}
      </ul>
    </div>
  )
}

export { DependencyList, updateKind }
