import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An EXPLAIN plan as a tree, with cost and row estimates.
 *
 * Self cost is what drives the bar, not total. Every plan's root has 100% of
 * the total cost by definition, so a bar drawn from total makes the root look
 * like the problem in every query ever profiled.
 *
 * The estimate-versus-actual ratio is computed and flagged past a threshold.
 * That mismatch is the single most useful number in a plan — it means the
 * statistics are stale, and it is why the planner picked a nested loop over a
 * hash join and turned 40ms into 40 seconds.
 *
 * Sequential scans on large row counts are marked. Not because a seq scan is
 * wrong — on a small table it is optimal — but because a seq scan over two
 * million rows is usually a missing index.
 */
export type PlanNode = {
  id: string
  /** "Seq Scan", "Hash Join", "Index Scan using …". */
  operation: string
  relation?: string
  /** Planner's estimate. */
  estimatedRows?: number
  actualRows?: number
  /** Total cost including children. */
  cost?: number
  actualMs?: number
  children?: PlanNode[]
}

type Row = { node: PlanNode; depth: number; self: number }

function flatten(node: PlanNode, depth = 0, out: Row[] = []): Row[] {
  const childCost = (node.children ?? []).reduce((sum, c) => sum + (c.cost ?? 0), 0)
  out.push({ node, depth, self: Math.max(0, (node.cost ?? 0) - childCost) })
  for (const child of node.children ?? []) flatten(child, depth + 1, out)
  return out
}

function QueryPlan({
  plan,
  misestimateFactor = 10,
  seqScanRows = 100_000,
  locale = 'en-GB',
  rowsLabel = 'rows',
  estimateLabel = 'est',
  misestimateLabel = 'estimate off',
  seqScanLabel = 'seq scan',
  misestimateNote = 'Estimates are far from actuals — usually stale statistics, and the reason the planner chose this shape.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  plan: PlanNode
  /** Ratio past which estimate-vs-actual is flagged. */
  misestimateFactor?: number
  /** Row count above which a sequential scan is called out. */
  seqScanRows?: number
  locale?: string
  rowsLabel?: ReactNode
  estimateLabel?: ReactNode
  misestimateLabel?: ReactNode
  seqScanLabel?: ReactNode
  misestimateNote?: ReactNode
}) {
  const [collapsed, setCollapsed] = useState<string[]>([])

  const rows = useMemo(() => flatten(plan), [plan])
  // Self cost, not total: every root is 100% of total by construction.
  const peakSelf = rows.reduce((max, row) => Math.max(max, row.self), 0)

  const hidden = useMemo(() => {
    const out = new Set<string>()
    const hide = (node: PlanNode) => {
      for (const child of node.children ?? []) {
        out.add(child.id)
        hide(child)
      }
    }
    for (const row of rows) if (collapsed.includes(row.node.id)) hide(row.node)
    return out
  }, [rows, collapsed])

  const anyMisestimate = rows.some(({ node }) => {
    if (node.estimatedRows === undefined || node.actualRows === undefined) return false
    const ratio = Math.max(node.estimatedRows, 1) / Math.max(node.actualRows, 1)
    return ratio > misestimateFactor || 1 / ratio > misestimateFactor
  })

  return (
    <div
      data-slot="query-plan"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <ul className="divide-border/60 list-none divide-y">
        {rows
          .filter(({ node }) => !hidden.has(node.id))
          .map(({ node, depth, self }) => {
            const hasChildren = Boolean(node.children?.length)
            const isCollapsed = collapsed.includes(node.id)
            const ratio =
              node.estimatedRows !== undefined && node.actualRows !== undefined
                ? Math.max(node.estimatedRows, 1) / Math.max(node.actualRows, 1)
                : undefined
            const misestimated =
              ratio !== undefined && (ratio > misestimateFactor || 1 / ratio > misestimateFactor)
            const bigSeqScan =
              /seq scan/i.test(node.operation) && (node.actualRows ?? 0) > seqScanRows

            return (
              <li key={node.id} className="flex items-start gap-2 p-3">
                <span style={{ width: depth * 14 }} aria-hidden="true" className="shrink-0" />

                {hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${node.operation}`}
                    className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                    onClick={() =>
                      setCollapsed((current) =>
                        isCollapsed ? current.filter((id) => id !== node.id) : [...current, node.id],
                      )
                    }
                  >
                    {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>
                ) : (
                  <span className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium">{node.operation}</span>
                    {node.relation && (
                      <span className="text-muted-foreground font-mono text-xs">on {node.relation}</span>
                    )}
                    {misestimated && (
                      <Badge size="sm" color="destructive">
                        {misestimateLabel} {ratio! > 1 ? `${Math.round(ratio!)}×` : `${Math.round(1 / ratio!)}×`}
                      </Badge>
                    )}
                    {bigSeqScan && (
                      <Badge size="sm" color="amber">
                        {seqScanLabel}
                      </Badge>
                    )}
                  </p>

                  <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs tabular-nums">
                    {node.actualRows !== undefined && (
                      <span>
                        <Fmt type="number" value={node.actualRows} locale={locale} /> {rowsLabel}
                      </span>
                    )}
                    {node.estimatedRows !== undefined && (
                      <span className="opacity-70">
                        {estimateLabel} <Fmt type="number" value={node.estimatedRows} locale={locale} />
                      </span>
                    )}
                    {node.actualMs !== undefined && <span>{node.actualMs.toFixed(1)}ms</span>}
                  </p>
                </div>

                {/* Self cost — the bar that actually points at the problem. */}
                {peakSelf > 0 && (
                  <span className="mt-1 hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--secondary)] sm:block">
                    <span
                      className="block h-full"
                      style={{
                        width: `${(self / peakSelf) * 100}%`,
                        background: misestimated ? 'var(--destructive)' : 'var(--blue)',
                      }}
                    />
                  </span>
                )}
              </li>
            )
          })}
      </ul>

      {anyMisestimate && misestimateNote && (
        <p className="border-border text-[var(--amber-soft-foreground)] flex items-start gap-1.5 border-t p-3 text-xs">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {misestimateNote}
        </p>
      )}
    </div>
  )
}

export { QueryPlan, flatten as flattenPlan }
