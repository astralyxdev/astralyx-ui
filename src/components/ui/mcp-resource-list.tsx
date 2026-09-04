import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { File, FileJson, FileText, Image as ImageIcon, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The resources an MCP server exposes, addressed by URI.
 *
 * Resources are the half of MCP that is easy to under-render. A tool has a name
 * and an obvious shape; a resource is a URI, and a list that shows only the
 * human title hides which server it came from and what scheme it speaks —
 * exactly the two things that decide whether it should be in the context.
 *
 * So the URI is always shown, in full, in mono, and it is what search matches
 * first. `file:///Users/me/.ssh/id_rsa` and "SSH key" are the same resource;
 * only one of them makes anyone look twice.
 *
 * Selection is optional and controlled. Attaching resources to a prompt is the
 * common case, and the caller owns that set because it is usually part of a
 * larger composer.
 */
export type McpResource = {
  uri: string
  /** Human title. The URI is shown regardless. */
  name?: string
  description?: ReactNode
  mimeType?: string
  /** Which server offered it — matters when several are connected. */
  server?: string
  /** Bytes, when the server reports it. */
  size?: number
}

function iconFor(mimeType: string | undefined) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.includes('json')) return FileJson
  if (mimeType.startsWith('text/')) return FileText
  return File
}

type McpResourceListProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  resources: McpResource[]
  /** Selected URIs. Omit both to render a read-only catalogue. */
  value?: string[]
  onValueChange?: (next: string[]) => void
  searchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  emptyLabel?: string
  emptyHint?: string
  /** Show the offering server on each row. */
  showServer?: boolean
  formatSize?: (bytes: number) => string
}

function defaultSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

function McpResourceList({
  resources,
  value,
  onValueChange,
  searchable = true,
  searchPlaceholder = 'Filter by URI or name…',
  searchLabel = 'Filter resources',
  emptyLabel = 'No resources match',
  emptyHint = 'Try a different word, or clear the filter.',
  showServer = true,
  formatSize = defaultSize,
  className,
  ...props
}: McpResourceListProps) {
  const [query, setQuery] = useState('')
  const selectable = value !== undefined && onValueChange !== undefined
  const selected = new Set(value ?? [])

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return resources
    return resources.filter((resource) =>
      // URI first: it is the identity, and the part worth searching.
      `${resource.uri} ${resource.name ?? ''} ${resource.mimeType ?? ''}`
        .toLowerCase()
        .includes(needle),
    )
  }, [query, resources])

  function toggle(uri: string) {
    if (!selectable) return
    onValueChange!(
      selected.has(uri) ? (value ?? []).filter((item) => item !== uri) : [...(value ?? []), uri],
    )
  }

  return (
    <div data-slot="mcp-resource-list" className={cn('flex flex-col gap-3', className)} {...props}>
      {searchable && (
        <Input
          size="sm"
          value={query}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          icon={<Search />}
          clearable
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      {matched.length === 0 ? (
        <Empty title={emptyLabel} description={emptyHint} />
      ) : (
        <ul className={cn(surface, radius.surface, 'divide-border list-none divide-y overflow-hidden')}>
          {matched.map((resource) => {
            const Icon = iconFor(resource.mimeType)
            const on = selected.has(resource.uri)
            const Row = selectable ? 'button' : 'div'

            return (
              <li key={resource.uri}>
                <Row
                  {...(selectable
                    ? {
                        type: 'button' as const,
                        onClick: () => toggle(resource.uri),
                        'aria-pressed': on,
                      }
                    : {})}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-start',
                    selectable && 'hover:bg-accent/50 cursor-pointer',
                    selectable && focusRing,
                    on && 'bg-accent/60',
                  )}
                >
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />

                  <div className="min-w-0 flex-1">
                    {resource.name && <p className="truncate text-sm font-medium">{resource.name}</p>}
                    <p
                      className="text-muted-foreground truncate font-mono text-xs"
                      title={resource.uri}
                    >
                      {resource.uri}
                    </p>
                    {resource.description && (
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {resource.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {resource.mimeType && (
                      <span className="text-muted-foreground/70 font-mono text-[11px]">
                        {resource.mimeType}
                      </span>
                    )}
                    {resource.size !== undefined && (
                      <span className="text-muted-foreground/60 text-[11px] tabular-nums">
                        {formatSize(resource.size)}
                      </span>
                    )}
                    {showServer && resource.server && (
                      <Badge size="sm" variant="outline">
                        {resource.server}
                      </Badge>
                    )}
                  </div>
                </Row>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { McpResourceList }
export type { McpResourceListProps }
