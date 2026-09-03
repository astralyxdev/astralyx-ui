import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Test coverage per file, with the uncovered lines named.
 *
 * Sorted by uncovered lines rather than by percentage. A 400-line file at 92%
 * has 32 untested lines; a 12-line file at 60% has 5. Percentage ranks the
 * small file first and that is exactly backwards for someone deciding what to
 * test next.
 *
 * Four metrics are kept apart. Statement coverage flatters: a file can hit
 * every statement and miss half its branches, which is where the bugs are.
 * Branch coverage is the one shown in the bar.
 *
 * The threshold is drawn as a line on each bar, so "below target" is visible
 * per row without reading numbers.
 */
export type CoverageFile = {
  path: string
  statements: number
  branches: number
  functions: number
  lines: number
  /** Line numbers with no coverage. */
  uncovered?: number[]
}

function tone(value: number, threshold: number) {
  if (value >= threshold) return 'var(--green)'
  if (value >= threshold - 0.15) return 'var(--amber)'
  return 'var(--destructive)'
}

function CoverageReport({
  files,
  threshold = 0.8,
  metric = 'branches',
  thresholdLabel = 'target',
  uncoveredLabel = 'uncovered lines',
  totalLabel = 'Total',
  metricLabels = {
    statements: 'Stmts',
    branches: 'Branch',
    functions: 'Funcs',
    lines: 'Lines',
  },
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  files: CoverageFile[]
  /** Ratio 0–1. Drawn as a line on every bar. */
  threshold?: number
  /** Which metric the bar shows. Branches by default — statements flatter. */
  metric?: 'statements' | 'branches' | 'functions' | 'lines'
  thresholdLabel?: ReactNode
  uncoveredLabel?: ReactNode
  totalLabel?: ReactNode
  metricLabels?: Record<'statements' | 'branches' | 'functions' | 'lines', ReactNode>
}) {
  const [open, setOpen] = useState<string | null>(null)

  // Ranked by untested lines, not by percentage — that is the actionable order.
  const rows = useMemo(
    () =>
      [...files].sort(
        (a, b) => (b.uncovered?.length ?? 0) - (a.uncovered?.length ?? 0) || a[metric] - b[metric],
      ),
    [files, metric],
  )

  const totals = useMemo(() => {
    if (files.length === 0) return null
    const sum = (key: keyof Omit<CoverageFile, 'path' | 'uncovered'>) =>
      files.reduce((total, file) => total + file[key], 0) / files.length
    return {
      statements: sum('statements'),
      branches: sum('branches'),
      functions: sum('functions'),
      lines: sum('lines'),
    }
  }, [files])

  const pct = (value: number) => `${Math.round(value * 100)}%`

  return (
    <div
      data-slot="coverage-report"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {totals && (
        <div className="border-border flex flex-wrap items-center gap-x-4 gap-y-1 border-b p-3">
          <span className="text-sm font-medium">{totalLabel}</span>
          {(['statements', 'branches', 'functions', 'lines'] as const).map((key) => (
            <span key={key} className="text-xs tabular-nums">
              <span className="text-muted-foreground">{metricLabels[key]} </span>
              <span style={{ color: tone(totals[key], threshold) }}>{pct(totals[key])}</span>
            </span>
          ))}
          <span className="text-muted-foreground ms-auto text-xs">
            {thresholdLabel} {pct(threshold)}
          </span>
        </div>
      )}

      <ul className="divide-border/60 list-none divide-y">
        {rows.map((file) => {
          const value = file[metric]
          const expanded = open === file.path
          const missing = file.uncovered ?? []

          return (
            <li key={file.path}>
              <button
                type="button"
                aria-expanded={expanded}
                disabled={missing.length === 0}
                onClick={() => setOpen(expanded ? null : file.path)}
                className={cn(
                  'flex w-full items-center gap-3 p-3 text-start',
                  missing.length > 0 && interactive,
                  focusRing,
                )}
              >
                {missing.length > 0 ? (
                  expanded ? (
                    <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                  )
                ) : (
                  <span className="size-3.5 shrink-0" aria-hidden="true" />
                )}

                <span className="min-w-0 flex-1 truncate font-mono text-xs">{file.path}</span>

                {missing.length > 0 && (
                  <Badge size="sm" color={value >= threshold ? 'neutral' : 'amber'}>
                    {missing.length}
                  </Badge>
                )}

                <span className="relative hidden h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-[var(--secondary)] sm:block">
                  <span
                    className="absolute inset-y-0 start-0"
                    style={{ width: `${value * 100}%`, background: tone(value, threshold) }}
                  />
                  {/* The target, drawn per row so "below" needs no reading. */}
                  <span
                    aria-hidden="true"
                    className="bg-foreground/40 absolute inset-y-0 w-px"
                    style={{ insetInlineStart: `${threshold * 100}%` }}
                  />
                </span>

                <span
                  className="w-10 shrink-0 text-end text-xs font-medium tabular-nums"
                  style={{ color: tone(value, threshold) }}
                >
                  {pct(value)}
                </span>
              </button>

              {expanded && missing.length > 0 && (
                <div className="bg-muted/30 border-border/60 border-t p-3">
                  <p className="text-muted-foreground mb-1.5 text-xs">{uncoveredLabel}</p>
                  <p className="font-mono text-xs break-words">{missing.join(', ')}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { CoverageReport }
