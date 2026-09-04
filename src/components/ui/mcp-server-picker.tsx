import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Download, Search, ShieldCheck, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A catalogue of MCP servers you could install.
 *
 * Installing an MCP server is running someone else's code with your
 * credentials, and the catalogue is where that decision gets made — so the card
 * leads with provenance rather than with the description. Publisher, whether it
 * is a verified listing, and the exact install target are the three facts that
 * matter; the blurb is written by the same person asking you to trust them.
 *
 * **Already-installed servers stay in the list, marked.** Filtering them out
 * makes the catalogue lie about what exists, and the most common question here
 * after "what is there" is "which of these do I already have".
 *
 * There is no one-click install. `onInstall` is a callback the host decides what
 * to do with — usually showing the command rather than running it, because a
 * catalogue that installs on click is a supply-chain problem with a nice UI.
 */
export type CatalogueServer = {
  id: string
  name: string
  publisher: string
  description?: ReactNode
  /** The command or URL that would be added to the config. */
  target?: string
  /** Listed by a registry that checks publishers. */
  verified?: boolean
  /** Popularity, when the registry reports it. */
  installs?: number
  tags?: string[]
  installed?: boolean
}

type McpServerPickerProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  servers: CatalogueServer[]
  onInstall?: (server: CatalogueServer) => void
  searchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  installLabel?: string
  installedLabel?: string
  verifiedLabel?: string
  emptyLabel?: string
  emptyHint?: string
  formatInstalls?: (installs: number) => string
}

function McpServerPicker({
  servers,
  onInstall,
  searchable = true,
  searchPlaceholder = 'Search servers…',
  searchLabel = 'Search servers',
  installLabel = 'Add',
  installedLabel = 'Installed',
  verifiedLabel = 'Verified publisher',
  emptyLabel = 'No servers match',
  emptyHint = 'Try a different word, or clear the search.',
  formatInstalls = (installs) =>
    installs >= 1000 ? `${(installs / 1000).toFixed(1)}k` : String(installs),
  className,
  ...props
}: McpServerPickerProps) {
  const [query, setQuery] = useState('')

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return servers
    return servers.filter((server) =>
      `${server.name} ${server.publisher} ${(server.tags ?? []).join(' ')} ${
        typeof server.description === 'string' ? server.description : ''
      }`
        .toLowerCase()
        .includes(needle),
    )
  }, [query, servers])

  return (
    <div data-slot="mcp-server-picker" className={cn('flex flex-col gap-3', className)} {...props}>
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
        <ul className="grid list-none gap-3 sm:grid-cols-2">
          {matched.map((server) => (
            <li
              key={server.id}
              className={cn(surface, radius.surface, 'flex h-full flex-col gap-3 p-4')}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{server.name}</p>
                    {server.verified && (
                      <ShieldCheck
                        className="size-3.5 shrink-0 text-[var(--green-soft-foreground)]"
                        aria-label={verifiedLabel}
                      />
                    )}
                  </div>
                  {/* Provenance above the blurb: the blurb is written by the
                      person asking to be trusted. */}
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {server.publisher}
                  </p>
                </div>

                {server.installs !== undefined && (
                  <span className="text-muted-foreground/60 flex shrink-0 items-center gap-1 text-[11px] tabular-nums">
                    <Star className="size-3" aria-hidden="true" />
                    {formatInstalls(server.installs)}
                  </span>
                )}
              </div>

              {server.description && (
                <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                  {server.description}
                </p>
              )}

              {server.target && (
                <code className="bg-muted/60 text-foreground/85 rounded-lg px-2 py-1.5 font-mono text-[10px] leading-relaxed break-all">
                  {server.target}
                </code>
              )}

              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="flex min-w-0 flex-wrap gap-1">
                  {(server.tags ?? []).slice(0, 2).map((tag) => (
                    <Badge key={tag} size="sm" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {server.installed ? (
                  <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                    <Check className="size-3.5" aria-hidden="true" />
                    {installedLabel}
                  </span>
                ) : (
                  onInstall && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      onClick={() => onInstall(server)}
                    >
                      <Download />
                      {installLabel}
                    </Button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { McpServerPicker }
export type { McpServerPickerProps }
