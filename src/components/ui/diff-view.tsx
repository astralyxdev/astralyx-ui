import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DiffStat } from '@/components/ui/diff-stat'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A unified or split diff.
 *
 * Takes parsed hunks rather than a raw patch string: parsing unified-diff text
 * is a separate concern with its own edge cases (renames, binary files, "\ No
 * newline at end of file"), and baking a half-parser into a view component
 * means every caller inherits its bugs. `parseUnifiedDiff` is exported
 * alongside for the common case.
 *
 * Split mode pairs deletions with insertions positionally within a hunk, which
 * is what a side-by-side view actually shows — not a semantic word-level match,
 * which needs a real diff algorithm and a lot more code than this earns.
 */
export type DiffLine = {
  type: 'add' | 'remove' | 'context' | 'meta'
  content: string
  /** 1-based line number in the old file. */
  oldLine?: number
  /** 1-based line number in the new file. */
  newLine?: number
}

export type DiffHunk = {
  header: string
  lines: DiffLine[]
}

export type DiffFile = {
  path: string
  /** Set when the file was moved. */
  previousPath?: string
  status?: 'modified' | 'added' | 'removed' | 'renamed'
  hunks: DiffHunk[]
}

const LINE_TONE = {
  add: 'bg-[color-mix(in_oklab,var(--green),transparent_88%)]',
  remove: 'bg-[color-mix(in_oklab,var(--destructive),transparent_88%)]',
  context: '',
  meta: 'bg-muted/50 text-muted-foreground',
} as const

const SIGN = { add: '+', remove: '-', context: ' ', meta: '' } as const

/** Parse a standard unified diff body for one file. */
function parseUnifiedDiff(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let current: DiffHunk | undefined
  let oldLine = 0
  let newLine = 0

  for (const raw of patch.split('\n')) {
    const header = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw)
    if (header) {
      oldLine = Number(header[1])
      newLine = Number(header[2])
      current = { header: raw, lines: [] }
      hunks.push(current)
      continue
    }
    if (!current) continue

    if (raw.startsWith('+')) {
      current.lines.push({ type: 'add', content: raw.slice(1), newLine: newLine++ })
    } else if (raw.startsWith('-')) {
      current.lines.push({ type: 'remove', content: raw.slice(1), oldLine: oldLine++ })
    } else if (raw.startsWith('\\')) {
      current.lines.push({ type: 'meta', content: raw.slice(1).trim() })
    } else {
      current.lines.push({
        type: 'context',
        content: raw.startsWith(' ') ? raw.slice(1) : raw,
        oldLine: oldLine++,
        newLine: newLine++,
      })
    }
  }
  return hunks
}

/** Pair removals with additions positionally, for the side-by-side view. */
function pairRows(lines: DiffLine[]) {
  const rows: { left?: DiffLine; right?: DiffLine }[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.type === 'context' || line.type === 'meta') {
      rows.push({ left: line, right: line })
      index++
      continue
    }
    const removals: DiffLine[] = []
    const additions: DiffLine[] = []
    while (lines[index]?.type === 'remove') removals.push(lines[index++])
    while (lines[index]?.type === 'add') additions.push(lines[index++])
    const height = Math.max(removals.length, additions.length)
    for (let i = 0; i < height; i++) {
      rows.push({ left: removals[i], right: additions[i] })
    }
  }
  return rows
}

function Gutter({ value }: { value?: number }) {
  return (
    <span
      aria-hidden="true"
      className="text-muted-foreground/50 w-10 shrink-0 select-none px-2 text-end tabular-nums"
    >
      {value ?? ''}
    </span>
  )
}

function DiffView({
  file,
  view = 'unified',
  collapsible = true,
  defaultOpen = true,
  className,
  ...props
}: ComponentProps<'div'> & {
  file: DiffFile
  view?: 'unified' | 'split'
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const counts = useMemo(() => {
    let additions = 0
    let deletions = 0
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') additions++
        if (line.type === 'remove') deletions++
      }
    }
    return { additions, deletions }
  }, [file])

  const Chevron = open ? ChevronDown : ChevronRight

  const header = (
    <>
      {collapsible && <Chevron className="text-muted-foreground size-4 shrink-0" />}
      <FileText className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-start font-mono text-xs">
        {file.previousPath && (
          <span className="text-muted-foreground/70">{file.previousPath} → </span>
        )}
        {file.path}
      </span>
      {file.status && file.status !== 'modified' && (
        <Badge size="sm">{file.status}</Badge>
      )}
      <DiffStat additions={counts.additions} deletions={counts.deletions} />
    </>
  )

  return (
    <div
      data-slot="diff-view"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'bg-muted/40 hover:bg-muted flex w-full items-center gap-2 p-3',
            interactive,
            focusRing,
          )}
        >
          {header}
        </button>
      ) : (
        <div className="bg-muted/40 flex items-center gap-2 p-3">{header}</div>
      )}

      {open && (
        <div className="overflow-x-auto font-mono text-xs leading-relaxed">
          {file.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className="border-border not-first:border-t">
              <div className="bg-muted/50 text-muted-foreground px-3 py-1 whitespace-nowrap">
                {hunk.header}
              </div>

              {view === 'unified'
                ? hunk.lines.map((line, index) => (
                    <div
                      key={index}
                      data-type={line.type}
                      className={cn('flex min-w-max', LINE_TONE[line.type])}
                    >
                      <Gutter value={line.oldLine} />
                      <Gutter value={line.newLine} />
                      <span className="text-muted-foreground/50 w-4 shrink-0 select-none text-center">
                        {SIGN[line.type]}
                      </span>
                      <span className="flex-1 pe-3 whitespace-pre">{line.content}</span>
                    </div>
                  ))
                : pairRows(hunk.lines).map((row, index) => (
                    <div key={index} className="flex min-w-max">
                      <div
                        className={cn(
                          'flex w-1/2 min-w-0 flex-1',
                          row.left && LINE_TONE[row.left.type],
                          !row.left && 'bg-muted/20',
                        )}
                      >
                        <Gutter value={row.left?.oldLine} />
                        <span className="flex-1 pe-3 whitespace-pre">
                          {row.left?.content ?? ''}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'border-border flex w-1/2 min-w-0 flex-1 border-s',
                          row.right && LINE_TONE[row.right.type],
                          !row.right && 'bg-muted/20',
                        )}
                      >
                        <Gutter value={row.right?.newLine} />
                        <span className="flex-1 pe-3 whitespace-pre">
                          {row.right?.content ?? ''}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Several files in one review. */
function DiffViewList({
  files,
  view,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  files: DiffFile[]
  view?: 'unified' | 'split'
  children?: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {files.map((file) => (
        <DiffView key={file.path} file={file} view={view} />
      ))}
    </div>
  )
}

export { DiffView, DiffViewList, parseUnifiedDiff }
