import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight, CircleSlash, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fmt } from '@/components/ui/fmt'
import { Spinner } from '@/components/ui/spinner'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A test run: suites, their tests, and the output of anything that failed.
 *
 * Failures are expanded by default and passes are collapsed. Nobody opens a
 * test report to read what passed — the useful default is the one that puts the
 * failure output on screen without a click.
 *
 * Suite state is derived from its tests rather than passed in, so a suite
 * cannot claim to pass while containing a failure.
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'running'

export type TestCase = {
  id: string
  name: string
  status: TestStatus
  /** Seconds. */
  duration?: number
  error?: ReactNode
}

export type TestSuite = {
  id: string
  name: string
  tests: TestCase[]
}

const ICON = {
  passed: { Icon: Check, tone: 'text-[var(--green-soft-foreground)]' },
  failed: { Icon: X, tone: 'text-[var(--destructive-soft-foreground)]' },
  skipped: { Icon: CircleSlash, tone: 'text-muted-foreground/60' },
  running: { Icon: null, tone: 'text-[var(--blue-soft-foreground)]' },
} as const

function suiteStatus(suite: TestSuite): TestStatus {
  if (suite.tests.some((test) => test.status === 'failed')) return 'failed'
  if (suite.tests.some((test) => test.status === 'running')) return 'running'
  if (suite.tests.every((test) => test.status === 'skipped')) return 'skipped'
  return 'passed'
}

function TestResults({
  suites,
  className,
  ...props
}: ComponentProps<'div'> & { suites: TestSuite[] }) {
  // Failing suites open, passing ones closed — the useful default.
  const [expanded, setExpanded] = useState<string[]>(() =>
    suites.filter((suite) => suiteStatus(suite) === 'failed').map((suite) => suite.id),
  )

  const all = suites.flatMap((suite) => suite.tests)
  const tally = {
    passed: all.filter((test) => test.status === 'passed').length,
    failed: all.filter((test) => test.status === 'failed').length,
    skipped: all.filter((test) => test.status === 'skipped').length,
  }
  const total = all.reduce((sum, test) => sum + (test.duration ?? 0), 0)

  return (
    <div
      data-slot="test-results"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b p-3">
        <span
          className={cn(
            'text-sm font-medium',
            tally.failed > 0 ? 'text-[var(--destructive-soft-foreground)]' : 'text-[var(--green-soft-foreground)]',
          )}
        >
          {tally.failed > 0
            ? `${tally.failed} failing`
            : `${tally.passed} passing`}
        </span>
        <span className="text-muted-foreground text-xs">
          {all.length} tests in {suites.length} suites
        </span>
        {tally.skipped > 0 && <Badge size="sm">{tally.skipped} skipped</Badge>}
        <span className="text-muted-foreground ms-auto text-xs tabular-nums">
          <Fmt type="duration" value={total} />
        </span>
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {suites.map((suite) => {
          const status = suiteStatus(suite)
          const { Icon, tone } = ICON[status]
          const open = expanded.includes(suite.id)

          return (
            <li key={suite.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setExpanded((current) =>
                    open
                      ? current.filter((id) => id !== suite.id)
                      : [...current, suite.id],
                  )
                }
                className={cn(
                  'hover:bg-accent/40 flex w-full items-center gap-2 px-3 py-2 text-start',
                  interactive,
                  focusRing,
                )}
              >
                {open ? (
                  <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                )}
                {Icon ? (
                  <Icon className={cn('size-4 shrink-0', tone)} aria-hidden="true" />
                ) : (
                  <Spinner size="xs" className={cn('shrink-0', tone)} label="Running" />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {suite.name}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {suite.tests.length}
                </span>
              </button>

              {open && (
                <ul className="list-none">
                  {suite.tests.map((test) => {
                    const testIcon = ICON[test.status]
                    return (
                      <li key={test.id} className="border-border/40 border-t">
                        <div className="flex items-center gap-2 py-1.5 pe-3 ps-9">
                          {testIcon.Icon ? (
                            <testIcon.Icon
                              className={cn('size-3.5 shrink-0', testIcon.tone)}
                              aria-hidden="true"
                            />
                          ) : (
                            <Spinner size="xs" className="shrink-0" label="Running" />
                          )}
                          <span
                            className={cn(
                              'min-w-0 flex-1 text-sm',
                              test.status === 'skipped' &&
                                'text-muted-foreground/60 line-through',
                            )}
                          >
                            {test.name}
                          </span>
                          {test.duration !== undefined && (
                            <span className="text-muted-foreground/70 shrink-0 text-xs tabular-nums">
                              <Fmt type="duration" value={test.duration} />
                            </span>
                          )}
                        </div>

                        {test.error && (
                          <div className="bg-[color-mix(in_oklab,var(--destructive),transparent_94%)] px-3 py-2 ps-9">
                            {test.error}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { TestResults, suiteStatus }
