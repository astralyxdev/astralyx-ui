import type { ComponentProps } from 'react'
import { FolderOpen, Plus, TriangleAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The roots a client has granted its MCP servers.
 *
 * Roots are how an MCP client says "you may look here and nowhere else", and
 * they are the closest thing the protocol has to a permission boundary. They
 * are also invisible in most clients, which means nobody notices when one is
 * a great deal wider than intended.
 *
 * So this leans on making a wide grant *look* wide. A root at `/`, `~` or a
 * home directory covers everything a person owns, and it is rendered as a
 * warning rather than as another grey row — the same reasoning as
 * `SandboxPolicy`, applied to the protocol's own mechanism.
 *
 * Per-server scoping is shown when present. A root granted to every server is a
 * different fact from one granted to a single trusted server, and a flat list
 * of paths cannot tell them apart.
 */
export type McpRoot = {
  /** A `file://` URI, as the protocol specifies. */
  uri: string
  name?: string
  /** Server ids this root is exposed to. Empty or absent means all of them. */
  servers?: string[]
  /** Read-only grant. */
  readOnly?: boolean
}

/** Paths that are "everything" in practice. */
const BROAD = [/^file:\/\/\/?$/, /^file:\/\/\/Users\/[^/]+\/?$/, /^file:\/\/\/home\/[^/]+\/?$/, /^~\/?$/]

export function isBroadRoot(uri: string) {
  return BROAD.some((pattern) => pattern.test(uri.trim()))
}

type McpRootsProps = Omit<ComponentProps<'div'>, 'children'> & {
  roots: McpRoot[]
  onAdd?: () => void
  onRemove?: (uri: string) => void
  addLabel?: string
  removeLabel?: string
  allServersLabel?: string
  readOnlyLabel?: string
  broadLabel?: string
  emptyLabel?: string
  label?: string
}

function McpRoots({
  roots,
  onAdd,
  onRemove,
  addLabel = 'Add a root',
  removeLabel = 'Remove',
  allServersLabel = 'all servers',
  readOnlyLabel = 'read-only',
  broadLabel = 'Covers everything you own',
  emptyLabel = 'No roots granted — servers can see nothing on this machine.',
  label = 'Roots',
  className,
  ...props
}: McpRootsProps) {
  return (
    <div
      data-slot="mcp-roots"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
          {label}
        </p>
        {onAdd && (
          <Button variant="ghost" size="sm" className="-me-2" onClick={onAdd}>
            <Plus />
            {addLabel}
          </Button>
        )}
      </div>

      {roots.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="divide-border list-none divide-y">
          {roots.map((root) => {
            const broad = isBroadRoot(root.uri)

            return (
              <li key={root.uri} className="flex items-start gap-3 px-4 py-3">
                <FolderOpen
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    broad ? 'text-[var(--destructive-soft-foreground)]' : 'text-muted-foreground',
                  )}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  {root.name && <p className="truncate text-sm font-medium">{root.name}</p>}
                  <p className="text-muted-foreground font-mono text-xs break-all">{root.uri}</p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge size="sm" variant="outline">
                      {root.servers?.length ? root.servers.join(', ') : allServersLabel}
                    </Badge>
                    {root.readOnly && (
                      <Badge size="sm" color="green">
                        {readOnlyLabel}
                      </Badge>
                    )}
                  </div>

                  {/* A wide grant has to look wide, or nobody notices it. */}
                  {broad && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
                      <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                      {broadLabel}
                    </p>
                  )}
                </div>

                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label={`${removeLabel}: ${root.uri}`}
                    onClick={() => onRemove(root.uri)}
                  >
                    <X />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { McpRoots }
export type { McpRootsProps }
