import type { ComponentProps, ReactNode } from 'react'
import { Bot, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The tree of subagents a run spawned, and what each is costing.
 *
 * `HandoffTrail` is a chain — one agent hands to the next. This is the other
 * shape: a parent that fans out to several children at once, each of which may
 * fan out again. Drawing that as a list loses the only thing that matters,
 * which is who spawned whom.
 *
 * **Cost is aggregated up the tree, not just reported per node.** A parent that
 * spent 400 tokens itself and spawned six children that spent 90,000 between
 * them is cheap by its own line and ruinous in total, and the per-node number
 * is the one that gets read.
 *
 * Depth is drawn with indentation and a rule rather than connector elbows: the
 * tree is usually two or three levels and the elbows cost more in visual noise
 * than they return in clarity.
 */
export type Subagent = {
  id: string
  name: string
  /** What it was asked to do. */
  task?: ReactNode
  status?: 'running' | 'done' | 'failed'
  /** Tokens this agent used, excluding its children. */
  tokens?: number
  /** Already formatted. */
  duration?: ReactNode
  children?: Subagent[]
}

/** This node's tokens plus every descendant's. */
export function subtreeTokens(agent: Subagent): number {
  return (
    (agent.tokens ?? 0) +
    (agent.children ?? []).reduce((total, child) => total + subtreeTokens(child), 0)
  )
}

type SubagentTreeProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  agents: Subagent[]
  onSelect?: (agent: Subagent) => void
  selectedId?: string
  formatTokens?: (tokens: number) => string
  /** Show the aggregated subtree total beside a parent's own usage. */
  showSubtreeTotals?: boolean
  emptyLabel?: string
  label?: string
}

function defaultTokens(tokens: number) {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)
}

function Node({
  agent,
  depth,
  onSelect,
  selectedId,
  formatTokens,
  showSubtreeTotals,
}: {
  agent: Subagent
  depth: number
  onSelect?: (agent: Subagent) => void
  selectedId?: string
  formatTokens: (tokens: number) => string
  showSubtreeTotals: boolean
}) {
  const total = subtreeTokens(agent)
  const own = agent.tokens ?? 0
  const hasChildren = Boolean(agent.children?.length)
  const Row = onSelect ? 'button' : 'div'

  return (
    <li>
      <Row
        {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(agent) } : {})}
        style={{ paddingInlineStart: 12 + depth * 18 }}
        className={cn(
          'flex w-full items-center gap-2.5 py-2 pe-3 text-start',
          onSelect && cn('hover:bg-accent/40', focusRing),
          agent.id === selectedId && 'bg-accent/60',
        )}
      >
        {agent.status === 'running' ? (
          <Spinner size="sm" label="Running" className="shrink-0" />
        ) : agent.status === 'failed' ? (
          <TriangleAlert
            className="size-3.5 shrink-0 text-[var(--destructive-soft-foreground)]"
            aria-label="Failed"
          />
        ) : (
          <Bot className="text-muted-foreground/60 size-3.5 shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{agent.name}</p>
          {agent.task && (
            <p className="text-muted-foreground truncate text-[11px]">{agent.task}</p>
          )}
        </div>

        {agent.duration !== undefined && (
          <span className="text-muted-foreground/60 shrink-0 font-mono text-[11px] tabular-nums">
            {agent.duration}
          </span>
        )}

        {agent.tokens !== undefined && (
          <span className="shrink-0 font-mono text-[11px] tabular-nums">
            {formatTokens(own)}
            {/* The number that actually matters on a parent. */}
            {showSubtreeTotals && hasChildren && total !== own && (
              <span className="text-muted-foreground/60"> · {formatTokens(total)} total</span>
            )}
          </span>
        )}
      </Row>

      {hasChildren && (
        <ul className="list-none">
          {agent.children!.map((child) => (
            <Node
              key={child.id}
              agent={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              formatTokens={formatTokens}
              showSubtreeTotals={showSubtreeTotals}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function SubagentTree({
  agents,
  onSelect,
  selectedId,
  formatTokens = defaultTokens,
  showSubtreeTotals = true,
  emptyLabel = 'No subagents were spawned.',
  label = 'Subagents',
  className,
  ...props
}: SubagentTreeProps) {
  const grand = agents.reduce((total, agent) => total + subtreeTokens(agent), 0)

  return (
    <div
      data-slot="subagent-tree"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex items-center justify-between gap-2 border-b px-4 py-2">
        <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
          {label}
        </p>
        {grand > 0 && (
          <Badge size="sm" variant="outline">
            {formatTokens(grand)} tokens
          </Badge>
        )}
      </div>

      {agents.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{emptyLabel}</p>
      ) : (
        <ul className="divide-border/40 list-none divide-y">
          {agents.map((agent) => (
            <Node
              key={agent.id}
              agent={agent}
              depth={0}
              onSelect={onSelect}
              selectedId={selectedId}
              formatTokens={formatTokens}
              showSubtreeTotals={showSubtreeTotals}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export { SubagentTree }
export type { SubagentTreeProps }
