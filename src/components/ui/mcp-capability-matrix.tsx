import type { ComponentProps, ReactNode } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Which server provides which capability, and where two of them collide.
 *
 * The problem this exists for: MCP capability names are not namespaced by the
 * protocol. Connect two servers that both expose `search`, and which one the
 * model reaches is decided by your client's merge order — silently. A per-server
 * list can never show that, because the collision only exists *between* lists.
 *
 * So the grid is capabilities down, servers across, and any row with more than
 * one provider is flagged. That flag is the entire reason to render a matrix
 * rather than a set of cards.
 *
 * Grid, not a table element: the header column is sticky while the server
 * columns scroll, which `<table>` will not do without fighting it.
 */
export type CapabilityRow = {
  name: string
  kind?: 'tool' | 'resource' | 'prompt'
  /** Server ids that provide it. More than one is a collision. */
  providers: string[]
  description?: ReactNode
}

type McpCapabilityMatrixProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Column order. Ids must match those in `providers`. */
  servers: { id: string; name: string }[]
  capabilities: CapabilityRow[]
  /** Which provider wins a collision. Usually your client's merge order. */
  resolve?: (row: CapabilityRow) => string
  conflictLabel?: string
  emptyLabel?: string
  label?: string
}

function McpCapabilityMatrix({
  servers,
  capabilities,
  resolve,
  conflictLabel = 'Shadowed',
  emptyLabel = 'Nothing exposed yet.',
  label = 'Capability matrix',
  className,
  ...props
}: McpCapabilityMatrixProps) {
  if (capabilities.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  const conflicts = capabilities.filter((row) => row.providers.length > 1).length

  return (
    <div
      data-slot="mcp-capability-matrix"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {conflicts > 0 && (
        <p className="border-border bg-[var(--amber-soft)] text-[var(--amber-soft-foreground)] flex items-center gap-2 border-b px-4 py-2.5 text-xs">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {conflicts} capability name{conflicts === 1 ? '' : 's'} provided by more than one server.
        </p>
      )}

      <div className="overflow-x-auto">
        <div
          role="table"
          aria-label={label}
          className="min-w-max"
          style={{ display: 'grid', gridTemplateColumns: `minmax(180px, 1fr) repeat(${servers.length}, 7rem)` }}
        >
          <div role="row" className="contents">
            <span
              role="columnheader"
              className="bg-muted/40 border-border text-muted-foreground/70 sticky start-0 z-10 border-b px-4 py-2 text-[11px] tracking-wide uppercase"
            >
              Capability
            </span>
            {servers.map((server) => (
              <span
                key={server.id}
                role="columnheader"
                className="bg-muted/40 border-border text-muted-foreground/70 truncate border-b px-3 py-2 text-center text-[11px] tracking-wide uppercase"
                title={server.name}
              >
                {server.name}
              </span>
            ))}
          </div>

          {capabilities.map((row) => {
            const clash = row.providers.length > 1
            const winner = clash && resolve ? resolve(row) : row.providers[0]

            return (
              <div role="row" key={`${row.kind}-${row.name}`} className="contents">
                <span
                  role="rowheader"
                  className="bg-card border-border/60 sticky start-0 z-10 flex min-w-0 items-center gap-2 border-b px-4 py-2"
                >
                  <code className="truncate font-mono text-xs">{row.name}</code>
                  {row.kind && (
                    <Badge size="sm" variant="outline" className="shrink-0">
                      {row.kind}
                    </Badge>
                  )}
                </span>

                {servers.map((server) => {
                  const provides = row.providers.includes(server.id)
                  const shadowed = provides && clash && server.id !== winner

                  return (
                    <span
                      key={server.id}
                      role="cell"
                      className="border-border/60 flex items-center justify-center border-b px-3 py-2"
                    >
                      {provides ? (
                        shadowed ? (
                          <Badge size="sm" color="amber" variant="ghost" title={conflictLabel}>
                            {conflictLabel}
                          </Badge>
                        ) : (
                          <Check
                            className="size-4 text-[var(--green-soft-foreground)]"
                            aria-label="Provided"
                          />
                        )
                      ) : (
                        <span className="text-muted-foreground/25" aria-hidden="true">
                          —
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { McpCapabilityMatrix }
export type { McpCapabilityMatrixProps }
