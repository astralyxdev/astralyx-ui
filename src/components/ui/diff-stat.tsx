import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Added and removed line counts, with the five-square bar every forge uses.
 *
 * The squares are proportional but never empty: a change of one line in a
 * thousand still shows one lit square, because rounding it to zero would read
 * as "nothing changed".
 */
function DiffStat({
  className,
  additions,
  deletions,
  showCounts = true,
  squares = 5,
  ...props
}: ComponentProps<'span'> & {
  additions: number
  deletions: number
  showCounts?: boolean
  squares?: number
}) {
  const total = additions + deletions
  const added = total === 0 ? 0 : Math.max(1, Math.round((additions / total) * squares))
  const removed = total === 0 ? 0 : Math.max(1, Math.min(squares - added, Math.round((deletions / total) * squares)))

  return (
    <span
      data-slot="diff-stat"
      className={cn('inline-flex items-center gap-2 font-mono text-xs', className)}
      {...props}
    >
      {showCounts && (
        <>
          <span className="text-[var(--green-soft-foreground)]">+{additions.toLocaleString()}</span>
          <span className="text-[var(--destructive-soft-foreground)]">
            &minus;{deletions.toLocaleString()}
          </span>
        </>
      )}
      <span
        className="flex gap-0.5"
        role="img"
        aria-label={`${additions} additions, ${deletions} deletions`}
      >
        {Array.from({ length: squares }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-2 rounded-[var(--radius-check-xs)]',
              index < added
                ? 'bg-[var(--green)]'
                : index < added + removed
                  ? 'bg-[var(--destructive)]'
                  : 'bg-border',
            )}
          />
        ))}
      </span>
    </span>
  )
}

export { DiffStat }
