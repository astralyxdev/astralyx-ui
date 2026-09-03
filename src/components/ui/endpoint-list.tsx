import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Lock, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { HttpStatus } from '@/components/ui/http-status'
import { Input } from '@/components/ui/input'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * API routes, grouped and filterable.
 *
 * The method badge is fixed-width and colour-coded. A route table is scanned
 * down the method column, and a ragged left edge where GET and DELETE differ in
 * width makes that scan impossible.
 *
 * Deprecated routes are struck through but kept. Removing them from the list is
 * how a client keeps calling one for another year — the point of marking it is
 * that someone sees it.
 *
 * Paths are matched on a plain substring including the method, so "post /users"
 * filters the way people actually type.
 */
export type Endpoint = {
  id: string
  method: string
  path: string
  summary?: ReactNode
  group?: string
  /** Requires credentials. */
  auth?: boolean
  deprecated?: boolean
  /** Last observed status, if you have one. */
  status?: number
}

type BadgeColor = 'blue' | 'green' | 'amber' | 'destructive' | 'neutral'

const METHOD_COLOR: Record<string, BadgeColor> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'amber',
  PATCH: 'amber',
  DELETE: 'destructive',
  HEAD: 'neutral',
  OPTIONS: 'neutral',
}

function EndpointList({
  endpoints,
  searchable = true,
  onSelect,
  selected,
  searchPlaceholder = 'Filter routes',
  searchLabel = 'Filter routes',
  emptyMessage = 'No routes match.',
  authLabel = 'requires auth',
  deprecatedLabel = 'deprecated',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  endpoints: Endpoint[]
  searchable?: boolean
  onSelect?: (id: string) => void
  selected?: string
  searchPlaceholder?: string
  searchLabel?: string
  emptyMessage?: ReactNode
  /** Accessible name for the lock icon. */
  authLabel?: string
  deprecatedLabel?: ReactNode
}) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    // Method included in the haystack, so "post /users" filters as typed.
    const rows = needle
      ? endpoints.filter((e) =>
          `${e.method} ${e.path} ${e.group ?? ''}`.toLowerCase().includes(needle),
        )
      : endpoints

    const map = new Map<string, Endpoint[]>()
    for (const endpoint of rows) {
      const key = endpoint.group ?? ''
      map.set(key, [...(map.get(key) ?? []), endpoint])
    }
    return [...map.entries()]
  }, [endpoints, query])

  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0)

  return (
    <div
      data-slot="endpoint-list"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {searchable && (
        <div className="border-border border-b p-3">
          <Input
            size="sm"
            value={query}
            icon={<Search />}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      {total === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyMessage}</p>
      ) : (
        <div className="divide-border divide-y">
          {groups.map(([group, rows]) => (
            <section key={group || '_'}>
              {group && (
                <h3 className="bg-muted/40 text-muted-foreground p-3 text-xs font-medium">
                  {group}
                </h3>
              )}
              <ul className="divide-border/60 list-none divide-y">
                {rows.map((endpoint) => {
                  const body = (
                    <>
                      {/* Fixed width: the method column is what gets scanned. */}
                      <Badge
                        size="sm"
                        color={METHOD_COLOR[endpoint.method.toUpperCase()] ?? 'neutral'}
                        className="w-16 shrink-0 justify-center font-mono"
                      >
                        {endpoint.method.toUpperCase()}
                      </Badge>

                      <span className="min-w-0 flex-1 text-start">
                        <span
                          className={cn(
                            'block truncate font-mono text-xs',
                            endpoint.deprecated && 'text-muted-foreground line-through',
                          )}
                        >
                          {endpoint.path}
                        </span>
                        {endpoint.summary && (
                          <span className="text-muted-foreground block truncate text-xs">
                            {endpoint.summary}
                          </span>
                        )}
                      </span>

                      {endpoint.deprecated && (
                        <Badge size="sm" color="amber" className="shrink-0">
                          {deprecatedLabel}
                        </Badge>
                      )}
                      {endpoint.auth && (
                        <Lock
                          className="text-muted-foreground/60 size-3.5 shrink-0"
                          aria-label={authLabel}
                        />
                      )}
                      {endpoint.status !== undefined && (
                        <HttpStatus status={endpoint.status} showPhrase={false} className="shrink-0" />
                      )}
                    </>
                  )

                  const classes = cn(
                    'flex w-full items-center gap-3 p-3',
                    selected === endpoint.id && 'bg-accent/50',
                  )

                  return (
                    <li key={endpoint.id}>
                      {onSelect ? (
                        <button
                          type="button"
                          className={cn(classes, 'text-start', interactive, focusRing)}
                          onClick={() => onSelect(endpoint.id)}
                        >
                          {body}
                        </button>
                      ) : (
                        <div className={classes}>{body}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export { EndpointList }
