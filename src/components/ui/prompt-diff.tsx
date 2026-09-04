import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Two versions of a prompt, with what changed between them.
 *
 * Prompts are the source code of an agent and are almost never treated that
 * way: they get edited in a textarea, and the reason a run regressed is a
 * sentence somebody rewrote three days ago. This is `git diff` for that.
 *
 * **Diffed by line, and the algorithm is deliberately simple.** A prefix/suffix
 * trim plus a longest-common-subsequence walk over the middle is enough for
 * prompts, which are short and edited in place. Bringing in a real diff library
 * for a component whose input is forty lines would be the wrong trade for a kit
 * that ships its source into other people's repositories.
 *
 * Unchanged runs longer than `context` collapse to a marker, because the point
 * of the view is the change and a wall of identical grey lines buries it.
 */
export type DiffLine = {
  type: 'add' | 'remove' | 'same'
  text: string
}

/** Line-level LCS. Fine for prompts; not a general-purpose diff. */
function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')

  // Trim the identical head and tail first — most prompt edits touch the middle,
  // and this keeps the quadratic table small.
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++
  }

  const midA = a.slice(head, a.length - tail)
  const midB = b.slice(head, b.length - tail)

  const table: number[][] = Array.from({ length: midA.length + 1 }, () =>
    new Array(midB.length + 1).fill(0),
  )
  for (let i = midA.length - 1; i >= 0; i--) {
    for (let j = midB.length - 1; j >= 0; j--) {
      table[i][j] =
        midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const middle: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < midA.length && j < midB.length) {
    if (midA[i] === midB[j]) {
      middle.push({ type: 'same', text: midA[i] })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      middle.push({ type: 'remove', text: midA[i] })
      i++
    } else {
      middle.push({ type: 'add', text: midB[j] })
      j++
    }
  }
  while (i < midA.length) middle.push({ type: 'remove', text: midA[i++] })
  while (j < midB.length) middle.push({ type: 'add', text: midB[j++] })

  return [
    ...a.slice(0, head).map((text) => ({ type: 'same' as const, text })),
    ...middle,
    ...a.slice(a.length - tail).map((text) => ({ type: 'same' as const, text })),
  ]
}

type PromptDiffProps = Omit<ComponentProps<'div'>, 'children'> & {
  before: string
  after: string
  beforeLabel?: ReactNode
  afterLabel?: ReactNode
  /** Unchanged lines kept around each change. */
  context?: number
  collapsedLabel?: (hidden: number) => string
  identicalLabel?: string
  /** Caption. Receives the counts. */
  summary?: (added: number, removed: number) => ReactNode
}

function PromptDiff({
  before,
  after,
  beforeLabel = 'Previous',
  afterLabel = 'Current',
  context = 2,
  collapsedLabel = (hidden) => `${hidden} unchanged line${hidden === 1 ? '' : 's'}`,
  identicalLabel = 'These two versions are identical.',
  summary,
  className,
  ...props
}: PromptDiffProps) {
  const lines = useMemo(() => diffLines(before, after), [before, after])

  const added = lines.filter((line) => line.type === 'add').length
  const removed = lines.filter((line) => line.type === 'remove').length

  // Which unchanged lines are close enough to a change to keep.
  const keep = useMemo(() => {
    const near = new Set<number>()
    lines.forEach((line, index) => {
      if (line.type === 'same') return
      for (let offset = -context; offset <= context; offset++) near.add(index + offset)
    })
    return near
  }, [lines, context])

  return (
    <div
      data-slot="prompt-diff"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <span className="text-muted-foreground text-xs">{beforeLabel}</span>
        <span className="text-muted-foreground/40" aria-hidden="true">
          →
        </span>
        <span className="text-xs font-medium">{afterLabel}</span>
        <span className="ms-auto flex items-center gap-1.5">
          <Badge size="sm" color="green" variant="ghost">
            +{added}
          </Badge>
          <Badge size="sm" color="destructive" variant="ghost">
            −{removed}
          </Badge>
        </span>
      </div>

      {added === 0 && removed === 0 ? (
        <p className="text-muted-foreground p-4 text-xs">{identicalLabel}</p>
      ) : (
        <div className="overflow-x-auto py-1">
          {lines.map((line, index) => {
            if (line.type === 'same' && !keep.has(index)) {
              // Only render the marker once per collapsed run.
              const runStart = index === 0 || keep.has(index - 1)
              if (!runStart) return null
              let hidden = 0
              for (let i = index; i < lines.length && lines[i].type === 'same' && !keep.has(i); i++) {
                hidden++
              }
              return (
                <p
                  key={index}
                  className="text-muted-foreground/50 bg-muted/30 px-4 py-1 font-mono text-[11px]"
                >
                  ⋯ {collapsedLabel(hidden)}
                </p>
              )
            }

            return (
              <pre
                key={index}
                className={cn(
                  'px-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap',
                  line.type === 'add' &&
                    'bg-[var(--green-soft)] text-[var(--green-soft-foreground)]',
                  line.type === 'remove' &&
                    'bg-[var(--destructive-soft)] text-[var(--destructive-soft-foreground)]',
                  line.type === 'same' && 'text-muted-foreground',
                )}
              >
                <span className="select-none opacity-60">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}{' '}
                </span>
                {line.text || ' '}
              </pre>
            )
          })}
        </div>
      )}

      {summary && (
        <p className="border-border text-muted-foreground border-t px-4 py-2.5 text-xs">
          {summary(added, removed)}
        </p>
      )}
    </div>
  )
}

export { PromptDiff, diffLines as promptDiffLines }
export type { PromptDiffProps }
