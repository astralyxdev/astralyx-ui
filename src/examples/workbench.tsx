'use client'

import { useState } from 'react'
import {
  FileDiff, GitCommitHorizontal, ListChecks, MessagesSquare, Plus, X,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { CommitList } from '@/components/ui/commit-list'
import { CoverageReport } from '@/components/ui/coverage-report'
import { Button } from '@/components/ui/button'
import { DiffView, parseUnifiedDiff } from '@/components/ui/diff-view'
import { Empty } from '@/components/ui/empty'
import { FileTree } from '@/components/ui/file-tree'
import { PullRequestCard } from '@/components/ui/pull-request-card'
import { ReviewThread } from '@/components/ui/review-thread'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TestResults } from '@/components/ui/test-results'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Page, PageHead, Section, Shell, useNotify, useRoute, type Crumb, type Nav,
} from './shell'
import {
  COMMITS, COVERAGE, FILES, NOW, PATH_BY_NODE, PR, statOf, SUITES, THREADS, TOTALS, TREE,
  type OpenFile,
} from './workbench-data'
import type { ExampleEntry } from './types'

/**
 * Workbench — a review, laid out the way you actually read one.
 *
 * The point of this example is the middle: a rail on the left picks what to
 * look at, and whatever you pick opens as a tab across the top of the content,
 * the way a browser does it. Several files stay open at once and the strip is
 * the record of where you have been, which a single scrolling diff cannot be.
 */

/* -------------------------------------------------------------------- files */

/**
 * The changed files, as a tree.
 *
 * Picking one opens it as its own tab in the header rather than replacing what
 * is on screen — which is the whole shape of this example: the rail chooses
 * what to open, and the strip holds everything you have opened.
 */
function Review() {
  const { go } = useRoute()

  return (
    <Page>
      <PageHead
        title="Files changed"
        description={`Three files, +${TOTALS.additions} −${TOTALS.deletions}. Open one and it stays open.`}
      />

      <div className="max-w-md">
        <FileTree
          nodes={TREE}
          onSelect={(path) => {
            const file = PATH_BY_NODE[path]
            if (file) go({ section: `${FILE_PREFIX}${file}` })
          }}
          label="Files changed"
        />
      </div>
    </Page>
  )
}

/** One file's diff, as a whole page. */
function FileView({ file }: { file: OpenFile }) {
  const { additions, deletions } = statOf(file)

  return (
    <Page>
      <PageHead
        title={file.name}
        description={file.path}
        actions={
          <span className="flex items-center gap-2 text-xs">
            <span className="text-[var(--green-soft-foreground)]">+{additions}</span>
            <span className="text-[var(--destructive-soft-foreground)]">−{deletions}</span>
          </span>
        }
      />

      <DiffView
        file={{ path: file.path, status: 'modified', hunks: parseUnifiedDiff(file.patch) }}
        collapsible={false}
      />
    </Page>
  )
}

/* ------------------------------------------------------------------- checks */

function Checks() {
  return (
    <Page>
      <PageHead
        title="Checks"
        description="One failing test, and the branch coverage it took with it."
      />

      <Alert color="destructive" title="Unit · address failed">
        <code className="font-mono text-xs">stops at the documented batch limit</code> expected 50
        and received 200 — the same number the review is arguing about.
      </Alert>

      <Section title="Tests">
        <TestResults suites={SUITES} />
      </Section>

      <Section
        title="Coverage"
        description="Branches, against an 80% target. The new error path is the gap."
      >
        <CoverageReport files={COVERAGE} metric="branches" threshold={0.8} />
      </Section>
    </Page>
  )
}

/* --------------------------------------------------------------- discussion */

function Discussion() {
  const notify = useNotify()
  const [resolved, setResolved] = useState<string[]>(
    THREADS.filter((thread) => thread.resolved).map((thread) => thread.id),
  )

  return (
    <Page>
      <PageHead
        title="Discussion"
        description="Two threads, one still open on the number that broke it."
      />

      <div className="flex flex-col gap-4">
        {THREADS.map((thread) => (
          <ReviewThread
            key={thread.id}
            path={thread.path}
            line={thread.line}
            snippet={thread.snippet}
            comments={thread.comments}
            resolved={resolved.includes(thread.id)}
            onResolve={() => {
              setResolved((current) =>
                current.includes(thread.id)
                  ? current.filter((id) => id !== thread.id)
                  : [...current, thread.id],
              )
            }}
            onReply={(body) => notify('Reply posted', body.slice(0, 60), 'green')}
          />
        ))}
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ history */

function History() {
  const notify = useNotify()

  return (
    <Page>
      <PageHead title="History" description="Three commits, and the one that turned the checks red." />

      <Card>
        <CardHeader>
          <CardTitle>The request</CardTitle>
        </CardHeader>
        <CardBody>
          <PullRequestCard
            number={PR.number}
            title={PR.title}
            state="open"
            author={PR.author}
            branch={PR.branch}
            baseBranch={PR.baseBranch}
            updated={NOW}
            comments={PR.comments}
            additions={TOTALS.additions}
            deletions={TOTALS.deletions}
            reviewers={PR.reviewers}
            labels={<Badge size="sm" color="amber">needs changes</Badge>}
          />
        </CardBody>
      </Card>

      <Section title="Commits">
        <CommitList
          commits={COMMITS}
          onSelect={(sha) => notify('Commit', `${sha} — opening the diff for that commit alone.`)}
        />
      </Section>
    </Page>
  )
}

/* --------------------------------------------------------------------- root */

const NAV_GROUPS = [
  {
    items: [
      { id: 'review', label: 'Files changed', icon: <FileDiff />, count: FILES.length },
      { id: 'checks', label: 'Checks', icon: <ListChecks />, count: SUITES.length },
    ],
  },
  {
    label: 'Request',
    items: [
      { id: 'discussion', label: 'Discussion', icon: <MessagesSquare />, count: THREADS.length },
      { id: 'history', label: 'History', icon: <GitCommitHorizontal />, count: COMMITS.length },
    ],
  },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'Checks failed on a3f19c2', body: 'Unit · address — stops at the documented batch limit', at: '2h', unread: true },
  { id: 'n2', title: 'Ada Lovelace commented', body: 'The service documents a limit of 50', at: '18m', unread: true },
  { id: 'n3', title: 'Grace Hopper approved with comments', body: 'Worth a retry with backoff', at: '1h' },
]

const SECTION_LABEL: Record<string, string> = {
  review: 'Files changed',
  checks: 'Checks',
  discussion: 'Discussion',
  history: 'History',
}

function commandsFor({ go }: Nav) {
  return [
    { id: 'go-review', label: 'Go to Files changed', group: 'Navigate', icon: <FileDiff />, onSelect: () => go({ section: 'review' }) },
    { id: 'go-checks', label: 'Go to Checks', group: 'Navigate', icon: <ListChecks />, onSelect: () => go({ section: 'checks' }) },
    { id: 'go-discussion', label: 'Go to Discussion', group: 'Navigate', icon: <MessagesSquare />, onSelect: () => go({ section: 'discussion' }) },
    { id: 'go-history', label: 'Go to History', group: 'Navigate', icon: <GitCommitHorizontal />, onSelect: () => go({ section: 'history' }) },
    ...FILES.map((file) => ({
      id: `file-${file.path}`,
      label: file.name,
      group: 'Files',
      keywords: file.path,
      icon: <FileDiff />,
      onSelect: () => go({ section: `${FILE_PREFIX}${file.path}` }),
    })),
  ]
}

function crumbsFor({ route }: Nav): Crumb[] {
  return [{ label: `#${PR.number}` }, { label: SECTION_LABEL[route.section] ?? 'Workbench' }]
}

/**
 * A tab's identity.
 *
 * Rail sections keep their own id; a file gets a prefix so the two can share
 * one route without a second piece of state deciding which kind it is.
 */
const FILE_PREFIX = 'file:'

/**
 * The section that is not a tab.
 *
 * Every tab can be closed, including the last one, so there has to be somewhere
 * to be when none are open. Keeping it out of the strip is the whole point: a
 * blank page that appears as a tab you cannot close is just the old guard
 * wearing a different hat.
 */
const BLANK = 'blank'

const TAB_LABEL: Record<string, string> = SECTION_LABEL

function labelFor(id: string) {
  if (id.startsWith(FILE_PREFIX)) {
    const path = id.slice(FILE_PREFIX.length)
    return FILES.find((file) => file.path === path)?.name ?? path
  }
  return TAB_LABEL[id] ?? id
}

/**
 * The strip, in the header.
 *
 * `open` is adjusted during render rather than in an effect: the rail navigates
 * first and the tab has to exist in the same paint, or the strip flashes a
 * frame without the tab you just opened. Assigning state during a component's
 * own render is the case React documents for exactly this.
 */
function WorkbenchTabs({ route, go }: Nav) {
  const [open, setOpen] = useState<string[]>(['review'])
  const active = route.section

  if (active !== BLANK && !open.includes(active)) setOpen([...open, active])

  function close(id: string) {
    const index = open.indexOf(id)
    const next = open.filter((entry) => entry !== id)

    setOpen(next)
    if (active !== id) return
    go({ section: next.length ? next[Math.max(0, index - 1)] : BLANK })
  }

  return (
    <Tabs
      variant="browser"
      value={open.includes(active) ? active : ''}
      onValueChange={(value) => go({ section: value })}
      className="h-full min-w-0 flex-1"
    >
      {/* The header is already the strip's ground, so the list contributes
          nothing but layout — and the 6px above the tabs, which is what stops
          them running into the top edge of the bar. */}
      <TabsList className="h-full items-stretch overflow-x-auto rounded-none bg-transparent px-0 pt-1.5">
        {open.map((id) => (
          // The close control is a sibling of the tab, never a child. A
          // `TabsTrigger` is a real button, and a button inside a button is
          // invalid markup that browsers fix by dropping one of them.
          <span key={id} className="relative flex shrink-0 items-stretch">
            <TabsTrigger
              value={id}
              // The bottom padding answers the list's top padding. Without it
              // the label sits 3px below the collapse control and the search,
              // because the inset moved the tab's middle without moving theirs.
              className="h-full max-w-44 pr-8 pb-1.5"
            >
              <span className="truncate">{labelFor(id)}</span>
            </TabsTrigger>
            <Tooltip content={`Close ${labelFor(id)}`}>
                <button
                  type="button"
                  aria-label={`Close ${labelFor(id)}`}
                  onClick={() => close(id)}
                  // Centred on the same region the label is: `top-0 bottom-1.5` excludes
                  // the padding that answers the strip's inset, so `my-auto` lands on
                  // the header's line rather than 3px under it.
                  className="text-muted-foreground hover:bg-accent hover:text-foreground absolute end-2 top-0 bottom-1.5 my-auto flex size-4 items-center justify-center rounded"
                >
                  <X className="size-3" />
              </button>
            </Tooltip>
          </span>
        ))}

        <Tooltip content="Open the next changed file">
          <button
            type="button"
            aria-label="Open the next changed file"
            onClick={() => {
              const next = FILES.find((file) => !open.includes(`${FILE_PREFIX}${file.path}`))
              if (next) go({ section: `${FILE_PREFIX}${next.path}` })
            }}
            className="text-muted-foreground hover:bg-accent hover:text-foreground mb-1.5 ms-1 flex size-7 shrink-0 items-center justify-center self-center rounded-md"
          >
            <Plus className="size-3.5" />
          </button>
        </Tooltip>
      </TabsList>
    </Tabs>
  )
}

/**
 * Nothing open.
 *
 * A browser with every tab closed shows you somewhere to start rather than an
 * empty window, and the rail alone is not that: it is off to the side and easy
 * to miss when the thing you were reading has just gone. So the page offers the
 * same doors, in the middle, where the content used to be.
 */
function NewTab() {
  const { go } = useRoute()

  return (
    <Page>
      <Empty
        icon={<FileDiff />}
        title="No tabs open"
        description={`Pull request #${PR.number} — ${PR.title}. Open a file, or one of the request's own pages.`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {FILES.map((file) => (
              <Button
                key={file.path}
                size="sm"
                variant="secondary"
                onClick={() => go({ section: `${FILE_PREFIX}${file.path}` })}
              >
                {file.name}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => go({ section: 'review' })}>
              Files changed
            </Button>
            <Button size="sm" variant="ghost" onClick={() => go({ section: 'checks' })}>
              Checks
            </Button>
          </div>
        }
      />
    </Page>
  )
}

function WorkbenchContent() {
  const { route } = useRoute()

  if (route.section.startsWith(FILE_PREFIX)) {
    const path = route.section.slice(FILE_PREFIX.length)
    const file = FILES.find((entry) => entry.path === path)
    if (file) return <FileView file={file} />
  }

  if (route.section === BLANK) return <NewTab />

  switch (route.section) {
    case 'checks':
      return <Checks />
    case 'discussion':
      return <Discussion />
    case 'history':
      return <History />
    default:
      return <Review />
  }
}

function Workbench() {
  return (
    <Shell
      home="review"
      product="Workbench"
      groups={NAV_GROUPS}
      notifications={NOTIFICATIONS}
      user={{ name: 'Ada Lovelace', email: 'ada@astralyx.dev', plan: 'Reviewer' }}
      commands={commandsFor}
      crumbs={crumbsFor}
      tabs={(nav) => <WorkbenchTabs {...nav} />}
    >
      <WorkbenchContent />
    </Shell>
  )
}

export const workbenchExample: ExampleEntry = {
  id: 'workbench',
  label: 'Workbench',
  description:
    'Reviewing a pull request, with the files you open kept as browser tabs across the top — a rail picks what to read, and the strip is the record of where you have been.',
  uses: [
    'Tabs', 'File Tree', 'Diff View', 'Review Thread', 'Test Results', 'Coverage Report',
    'Commit List', 'Pull Request Card', 'Sidebar', 'Command', 'Alert', 'Empty', 'Tooltip',
    'Toast', 'Badge', 'Card',
  ],
  render: () => <Workbench />,
}
