import { CommitGraph, type GraphCommit } from '@/components/ui/commit-graph'
import { Fmt } from '@/components/ui/fmt'
import { LabelChip, LabelPicker, type LabelOption } from '@/components/ui/label-picker'
import { PullRequestCard } from '@/components/ui/pull-request-card'
import { ReleaseList, type Release } from '@/components/ui/release-list'
import { ReviewThread } from '@/components/ui/review-thread'
import { StatusChecks, type StatusCheck } from '@/components/ui/status-checks'
import { Terminal } from '@/components/ui/terminal'
import { useState } from 'react'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

/* ------------------------------------------------------------ status checks */

const CHECKS: StatusCheck[] = [
  { id: '1', name: 'build', status: 'success', duration: '1m 12s', description: 'vite build' },
  { id: '2', name: 'typecheck', status: 'success', duration: '38s' },
  { id: '3', name: 'test', status: 'failure', duration: '2m 04s', description: '3 of 412 failing', detail: <Terminal copyable={false} content={'FAIL src/lib/styles.test.ts\n  ✕ controlSize keeps radius under half height'} /> },
  { id: '4', name: 'lint', status: 'running' },
  { id: '5', name: 'bundle-size', status: 'failure', required: false, description: 'over budget by 12 kB' },
  { id: '6', name: 'visual-diff', status: 'skipped', required: false },
]

export const statusChecksEntry: ComponentEntry = {
  id: 'status-checks',
  label: 'Status Checks',
  description:
    'The CI check list on a pull request. The summary states the blocking outcome rather than the raw tally, because "3 failing" says nothing about whether you can merge.',
  usage: `import { StatusChecks } from '@/components/ui/status-checks'

<StatusChecks checks={checks} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'expanded', label: 'expand failing', default: false }],
    render: (state) => (
      <div className="w-full">
        <StatusChecks checks={CHECKS} defaultExpanded={state.expanded ? ['3'] : []} />
      </div>
    ),
    code: () => `<StatusChecks checks={checks} />`,
  },
  api: [
    { name: 'checks', type: 'StatusCheck[]', description: '`{ id, name, status, description?, duration?, required?, detail? }`.' },
    { name: 'status', type: "'success' | 'failure' | 'pending' | 'running' | 'skipped'", description: 'Each carries its own icon and colour, so the outcome never depends on colour alone.' },
    { name: 'required', type: 'boolean', default: 'true', description: 'Only required failures make the rollup say the PR is blocked; optional ones are labelled and counted but do not.' },
    { name: 'detail', type: 'ReactNode', description: 'Expandable body — a log excerpt, usually. Checks without one show no disclosure control.' },
  ],
  demos: [
    { title: 'Checks', stack: true, code: `<StatusChecks checks={checks} />`, render: () => <div className="w-full"><StatusChecks checks={CHECKS} /></div> },
  ],
}

/* ------------------------------------------------------- pull request card */

const PR_STATES = ['open', 'draft', 'merged', 'closed'] as const

const LABELS: LabelOption[] = [
  { id: 'bug', name: 'bug', color: '#d73a4a', description: 'Something is broken' },
  { id: 'enhancement', name: 'enhancement', color: '#a2eeef', description: 'New feature or request' },
  { id: 'docs', name: 'documentation', color: '#0075ca' },
  { id: 'good-first', name: 'good first issue', color: '#7057ff' },
]

export const pullRequestCardEntry: ComponentEntry = {
  id: 'pull-request-card',
  label: 'Pull Request Card',
  description:
    'A pull request at a glance — state, branches, checks, reviewers. State is shown as an icon and a word, never colour alone.',
  usage: `import { PullRequestCard } from '@/components/ui/pull-request-card'

<PullRequestCard number={412} title="Add squircle corners" state="open" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'state', label: 'state', options: PR_STATES, default: 'open' },
      { type: 'boolean', prop: 'labels', label: 'labels', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <PullRequestCard
          number={412}
          title="Derive field padding from control height"
          state={String(state.state) as (typeof PR_STATES)[number]}
          author="Ada Lovelace"
          branch="fix/input-padding"
          updated={ago(42)}
          comments={6}
          additions={128}
          deletions={41}
          reviewers={['Grace Hopper', 'Alan Turing']}
          labels={
            state.labels ? (
              <>
                <LabelChip label={LABELS[0]} />
                <LabelChip label={LABELS[1]} />
              </>
            ) : undefined
          }
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<PullRequestCard\n  number={412}\n  title="Derive field padding from control height"\n  state="${s.state}"\n  branch="fix/input-padding"\n  additions={128}\n  deletions={41}\n  reviewers={['Grace Hopper', 'Alan Turing']}\n/>`,
  },
  api: [
    { name: 'number / title / state', type: 'number / ReactNode / PullRequestState', description: 'open, draft, merged or closed.' },
    { name: 'branch / baseBranch', type: 'string', default: "baseBranch: 'main'", description: 'Rendered as a source → target pair.' },
    { name: 'additions / deletions', type: 'number', description: 'Passed through to DiffStat.' },
    { name: 'reviewers', type: 'string[]', description: 'Names, rendered as a stacked AvatarGroup.' },
    { name: 'checks', type: 'ReactNode', description: 'Slot for a StatusChecks summary or any other node.' },
    { name: 'updated', type: 'Date', description: 'Shown as a relative time through Fmt.' },
  ],
  demos: [
    {
      title: 'States',
      stack: true,
      code: `<PullRequestCard number={412} title="…" state="open" />
<PullRequestCard number={408} title="…" state="merged" />`,
      render: () => (
        <div className="flex w-full max-w-xl flex-col gap-3">
          <PullRequestCard number={412} title="Derive field padding from control height" state="open" author="Ada Lovelace" branch="fix/input-padding" updated={ago(42)} comments={6} additions={128} deletions={41} reviewers={['Grace Hopper']} labels={<LabelChip label={LABELS[0]} />} />
          <PullRequestCard number={408} title="Drop Radix, add own Slot primitive" state="merged" author="Alan Turing" branch="refactor/slot" updated={ago(2880)} comments={12} additions={640} deletions={912} />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ label picker */

function LabelPickerDemo({
  triggerLabel = 'Labels',
  searchPlaceholder = 'Filter labels',
}: { triggerLabel?: string; searchPlaceholder?: string } = {}) {
  const [selected, setSelected] = useState<string[]>(['bug'])
  return (
    <LabelPicker
      labels={LABELS}
      selected={selected}
      onSelectedChange={setSelected}
      triggerLabel={triggerLabel}
      searchPlaceholder={searchPlaceholder}
    />
  )
}

export const labelPickerEntry: ComponentEntry = {
  id: 'label-picker',
  label: 'Label Picker',
  description:
    'Coloured repository labels, picked from a searchable list. Chip text is derived from the fill by luminance, since a label set imported from a forge only gives you a background colour.',
  usage: `import { LabelPicker, LabelChip } from '@/components/ui/label-picker'

<LabelPicker labels={labels} selected={selected} onSelectedChange={setSelected} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'triggerLabel', label: 'triggerLabel', default: 'Labels' },
      { type: 'text', prop: 'searchPlaceholder', label: 'searchPlaceholder', default: 'Filter labels' },
    ],
    render: (state: ComposerState) => (
      <LabelPickerDemo
        triggerLabel={String(state.triggerLabel)}
        searchPlaceholder={String(state.searchPlaceholder)}
      />
    ),
    code: () => `<LabelPicker\n  labels={labels}\n  selected={selected}\n  onSelectedChange={setSelected}\n/>`,
  },
  api: [
    { name: 'labels', type: 'LabelOption[]', description: '`{ id, name, color, description? }` where colour is any CSS colour.' },
    { name: 'selected / onSelectedChange', type: 'string[] / (ids) => void', description: 'Controlled selection by id.' },
    { name: 'readableInk', type: '(color: string) => string', description: 'Exported helper. Picks black or white from Rec. 709 luma — `color-mix` cannot answer "is this light or dark", and relative `oklch()` cannot branch.' },
    { name: 'LabelChip', type: 'component', description: 'The chip on its own, for rendering labels outside the picker.' },
  ],
  demos: [
    { title: 'Picker', stack: true, code: `<LabelPicker labels={labels} selected={selected} onSelectedChange={setSelected} />`, render: () => <LabelPickerDemo /> },
  ],
}

/* ----------------------------------------------------------- review thread */

export const reviewThreadEntry: ComponentEntry = {
  id: 'review-thread',
  label: 'Review Thread',
  description:
    'A review conversation anchored to a line of code, with the line shown as context. Resolving is always a callback — a resolved thread is server truth other reviewers see.',
  usage: `import { ReviewThread } from '@/components/ui/review-thread'

<ReviewThread
  path="src/lib/styles.ts"
  line={68}
  snippet="  xs: 'h-7 gap-1.5 px-3.5 text-xs',"
  comments={comments}
  onReply={reply}
  onResolve={resolve}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'resolved', label: 'resolved', default: false },
      { type: 'boolean', prop: 'reply', label: 'reply box', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <ReviewThread
          path="src/lib/styles.ts"
          line={68}
          snippet="  xs: 'h-7 gap-1.5 px-3.5 text-xs',"
          resolved={Boolean(state.resolved)}
          comments={[
            { id: '1', author: 'Grace Hopper', time: '2h ago', body: 'Should this opt out of the squircle so it reads as a true pill?' },
            { id: '2', author: 'Ada Lovelace', time: '1h ago', body: 'Yes — a squircle at 50% looks like a rounded rectangle at this size.', pending: true },
          ]}
          onReply={state.reply ? () => {} : undefined}
          onResolve={() => {}}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<ReviewThread\n  path="src/lib/styles.ts"\n  line={68}\n  comments={comments}\n  resolved={${Boolean(s.resolved)}}\n  onResolve={resolve}\n/>`,
  },
  api: [
    { name: 'path / line / snippet', type: 'string / number / string', description: 'The anchor. A thread detached from its line is unreadable, and re-finding that line is the main cost of reviewing in a browser.' },
    { name: 'comments', type: 'ReviewComment[]', description: '`{ id, author, body, time?, pending? }`.' },
    { name: 'resolved / onResolve', type: 'boolean / () => void', description: 'Resolution is never local state — it is shared truth, so the component only reports the intent.' },
    { name: 'onReply', type: '(body: string) => void', description: 'Adds the reply box. Omit it for a read-only thread.' },
  ],
  demos: [
    {
      title: 'Thread',
      stack: true,
      code: `<ReviewThread path="src/lib/styles.ts" line={68} comments={comments} onReply={reply} onResolve={resolve} />`,
      render: () => (
        <div className="w-full max-w-xl">
          <ReviewThread
            path="src/lib/styles.ts"
            line={68}
            snippet="  xs: 'h-7 gap-1.5 px-3.5 text-xs',"
            comments={[
              { id: '1', author: 'Grace Hopper', time: '2h ago', body: 'Should this opt out of the squircle?' },
              { id: '2', author: 'Ada Lovelace', time: '1h ago', body: 'Yes — fixed in 4f2a1c9.' },
            ]}
            onReply={() => {}}
            onResolve={() => {}}
          />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ release list */

const RELEASES: Release[] = [
  {
    version: 'v1.4.2',
    date: new Date('2026-08-28'),
    current: true,
    notes: 'Field metrics now derive from control height throughout.',
    sections: [
      { label: 'Added', items: ['Sidebar, Timeline, Stat and Sparkline', 'CodeBlock footer slot'] },
      { label: 'Fixed', items: ['Pagination numbers no longer inherit the ambient font size', 'ButtonGroup responsive seams'] },
    ],
  },
  {
    version: 'v1.4.1',
    date: new Date('2026-08-14'),
    sections: [{ label: 'Fixed', items: ['Switch thumb contrast in dark theme'] }],
  },
]

export const releaseListEntry: ComponentEntry = {
  id: 'release-list',
  label: 'Release List',
  description:
    'A changelog as a document — each version an article with a real heading, so it can be linked to and navigated by heading. Never sorts, since "newest first" cannot be derived from semver once pre-releases exist.',
  usage: `import { ReleaseList } from '@/components/ui/release-list'

<ReleaseList releases={releases} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'latestLabel', label: 'latestLabel', default: 'Latest' },
      { type: 'number', prop: 'count', label: 'releases', default: 4, min: 1, max: 6, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <ReleaseList
          releases={RELEASES.slice(0, Number(state.count))}
          latestLabel={String(state.latestLabel)}
        />
      </div>
    ),
    code: () => `<ReleaseList releases={releases} />`,
  },
  api: [
    { name: 'releases', type: 'Release[]', description: '`{ version, date?, current?, tag?, notes?, sections? }`.' },
    { name: 'sections', type: '{ label, items }[]', description: 'Grouped bullets — Added, Fixed, Changed.' },
    { name: 'locale', type: 'string', default: "'en-GB'", description: 'Date formatting through Intl.' },
  ],
  demos: [
    { title: 'Changelog', stack: true, code: `<ReleaseList releases={releases} />`, render: () => <div className="w-full max-w-xl"><ReleaseList releases={RELEASES} /></div> },
  ],
}

/* ------------------------------------------------------------ commit graph */

const GRAPH: GraphCommit[] = [
  { sha: '4f2a1c9d', message: 'Merge pull request #412 from fix/input-padding', parents: ['9b1e77a2', '2c8d4e10'], author: 'Ada Lovelace', date: ago(20) },
  { sha: '2c8d4e10', message: 'Derive field padding from control height', parents: ['9b1e77a2'], author: 'Ada Lovelace', date: ago(95) },
  { sha: '9b1e77a2', message: 'Add squircle corners to controls', parents: ['7a0c1f38'], author: 'Grace Hopper', date: ago(240) },
  { sha: '7a0c1f38', message: 'Drop Radix, add own Slot primitive', parents: ['1d5b9e04'], author: 'Alan Turing', date: ago(1440) },
  { sha: '1d5b9e04', message: 'Initial component scaffold', parents: [], author: 'Ada Lovelace', date: ago(4320) },
]

export const commitGraphEntry: ComponentEntry = {
  id: 'commit-graph',
  label: 'Commit Graph',
  description:
    'The branch graph beside a commit list. Lanes are held by the commit each one is waiting for, which is what keeps a branch on a single vertical line instead of drifting sideways at every merge.',
  usage: `import { CommitGraph } from '@/components/ui/commit-graph'

<CommitGraph commits={commits} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'count', label: 'commits', default: 8, min: 2, max: 12, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <CommitGraph commits={GRAPH.slice(0, Number(state.count))} />
      </div>
    ),
    code: () => `<CommitGraph commits={commits} />`,
  },
  api: [
    { name: 'commits', type: 'GraphCommit[]', description: '`{ sha, message, parents, author?, date?, refs? }`, newest first.' },
    { name: 'parents', type: 'string[]', description: 'The first parent inherits the lane; each additional one opens a lane and draws the merge curve. A commit with two parents renders as a hollow node.' },
    { name: 'layout', type: 'internal', description: 'One SVG per row rather than a single tall one, so rows keep ordinary DOM content beside the graph and stay selectable.' },
  ],
  demos: [
    { title: 'History', stack: true, code: `<CommitGraph commits={commits} />`, render: () => <div className="w-full max-w-xl"><CommitGraph commits={GRAPH} /></div> },
  ],
}

/* ---------------------------------------------------------------------- fmt */

const FMT_TYPES = ['date', 'number', 'currency', 'percent', 'bytes', 'duration', 'relative'] as const

export const fmtEntry: ComponentEntry = {
  id: 'fmt',
  label: 'Fmt',
  description:
    'One component for every formatted value — dates, numbers, currency, bytes, durations, relative times — so the locale is a single decision rather than three developers reaching for toLocaleString, toFixed and padStart on one screen.',
  usage: `import { Fmt } from '@/components/ui/fmt'

<Fmt type="date" value={date} format="DD.MM.YYYY HH:mm" />
<Fmt type="currency" value={1234.5} currency="EUR" />
<Fmt type="number" value={1234567.891} decimals={2} />
<Fmt type="bytes" value={748100} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'type', label: 'type', options: FMT_TYPES, default: 'date' },
      { type: 'text', prop: 'format', label: 'format', default: 'DD.MM.YYYY HH:mm:ss' },
      { type: 'text', prop: 'locale', label: 'locale', default: 'en-GB' },
    ],
    render: (state) => {
      const type = String(state.type) as (typeof FMT_TYPES)[number]
      const value =
        type === 'date' || type === 'relative'
          ? new Date('2026-09-02T14:07:05')
          : type === 'bytes'
            ? 748100
            : type === 'duration'
              ? 3792
              : type === 'percent'
                ? 0.982
                : 1234567.891
      return (
        <span className="font-mono text-lg">
          <Fmt
            type={type}
            value={value}
            format={String(state.format) || undefined}
            locale={String(state.locale) || 'en-GB'}
            currency="EUR"
            now={new Date('2026-09-02T16:07:05')}
          />
        </span>
      )
    },
    code: (s: ComposerState) =>
      `<Fmt\n  type="${s.type}"\n  value={value}\n  format="${s.format}"\n  locale="${s.locale}"\n/>`,
  },
  api: [
    { name: 'type', type: FMT_TYPES.map((t) => `'${t}'`).join(' | '), description: 'What the value is.' },
    { name: 'format (date)', type: 'token pattern | Intl style', description: "A pattern like 'DD.MM.YYYY HH:mm', or one of short/medium/long/full. Tokens follow moment/dayjs: MM is the month, mm is the minute — 'HH:MM:SS' prints the month where you wanted minutes." },
    { name: 'format (currency)', type: "'symbol' | 'code' | 'name'", default: "'symbol'", description: 'Maps to Intl currencyDisplay.' },
    { name: 'currency / decimals / grouping', type: 'string / number / boolean', description: 'ISO 4217 code, fraction digits, thousands separators.' },
    { name: 'now', type: 'Date', description: 'Reference point for relative times. Pass it to keep a render deterministic.' },
    { name: 'output element', type: '<time> or <span>', description: 'Dates and relative times render a <time> with an ISO dateTime, so the machine-readable value travels with the display one. Everything else is a span with tabular figures.' },
    { name: 'helpers', type: 'formatDate, formatBytes, formatDuration, formatRelative', description: 'Exported for use outside JSX.' },
  ],
  demos: [
    {
      title: 'Every type',
      stack: true,
      code: `<Fmt type="date" value={d} format="DD.MM.YYYY HH:mm:ss" />
<Fmt type="date" value={d} format="MMMM D, YYYY" />
<Fmt type="number" value={1234567.891} decimals={2} />
<Fmt type="currency" value={1234.5} currency="EUR" />
<Fmt type="percent" value={0.982} decimals={1} />
<Fmt type="bytes" value={748100} />
<Fmt type="duration" value={3792} />
<Fmt type="relative" value={twoHoursAgo} />`,
      render: () => {
        const d = new Date('2026-09-02T14:07:05')
        const rows: [string, React.ReactNode][] = [
          ['date · DD.MM.YYYY HH:mm:ss', <Fmt type="date" value={d} format="DD.MM.YYYY HH:mm:ss" />],
          ['date · MMMM D, YYYY', <Fmt type="date" value={d} format="MMMM D, YYYY" />],
          ['date · Intl long', <Fmt type="date" value={d} format="long" />],
          ['number · 2 decimals', <Fmt type="number" value={1234567.891} decimals={2} />],
          ['currency · EUR', <Fmt type="currency" value={1234.5} currency="EUR" />],
          ['percent', <Fmt type="percent" value={0.982} decimals={1} />],
          ['bytes', <Fmt type="bytes" value={748100} />],
          ['duration', <Fmt type="duration" value={3792} />],
          ['relative', <Fmt type="relative" value={new Date(d.getTime() - 7200e3)} now={d} />],
        ]
        return (
          <dl className="grid w-full max-w-lg grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
            {rows.map(([label, node], index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground font-mono text-xs">{label}</dt>
                <dd className="font-medium">{node}</dd>
              </div>
            ))}
          </dl>
        )
      },
    },
  ],
}
