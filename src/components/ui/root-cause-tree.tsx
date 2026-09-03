import type { ComponentProps, ReactNode } from 'react'
import { ConfidenceMeter } from '@/components/ui/confidence-meter'
import { Tree, type TreeNode } from '@/components/ui/tree'
import { cn } from '@/lib/utils'

/**
 * A causal chain: symptom at the root, candidate causes beneath it.
 *
 * Built on `Tree`, so it inherits the keyboard model rather than growing a
 * second one. What it adds is confidence — each branch carries a score, and the
 * label renders it inline.
 *
 * Confidence is shown as a band, never a bare percentage. These numbers come
 * out of a correlation engine and are not calibrated probabilities; printing
 * "87%" beside a guess lends it a precision it has not earned.
 */
export type CauseNode = {
  id: string
  label: ReactNode
  /** 0 to 1. */
  confidence?: number
  detail?: ReactNode
  children?: CauseNode[]
}

function toTreeNodes(causes: CauseNode[]): TreeNode[] {
  return causes.map((cause) => ({
    id: cause.id,
    label: (
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1 truncate">{cause.label}</span>
        {cause.confidence !== undefined && (
          <ConfidenceMeter
            value={cause.confidence}
            showLabel={false}
            size="sm"
            className="w-16 shrink-0"
            label="Confidence"
          />
        )}
      </span>
    ),
    meta: cause.detail,
    children: cause.children ? toTreeNodes(cause.children) : undefined,
  }))
}

function RootCauseTree({
  causes,
  defaultExpanded,
  label = 'Root cause analysis',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  causes: CauseNode[]
  defaultExpanded?: string[]
  /** Accessible name for the tree. */
  label?: string
}) {
  const nodes = toTreeNodes(causes)

  return (
    <div data-slot="root-cause-tree" className={cn('min-w-0', className)} {...props}>
      <Tree
        nodes={nodes}
        defaultExpanded={defaultExpanded ?? causes.map((cause) => cause.id)}
        aria-label={label}
      />
    </div>
  )
}

export { RootCauseTree }
