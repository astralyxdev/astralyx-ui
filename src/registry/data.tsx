import { useState } from 'react'
import { ConnectionPool } from '@/components/ui/connection-pool'
import { CsvPreview, type CsvColumn } from '@/components/ui/csv-preview'
import { DataQuality, type ColumnProfile } from '@/components/ui/data-quality'
import { IndexList, type DatabaseIndex } from '@/components/ui/index-list'
import { ReplicationStatus, type Replica } from '@/components/ui/replication-status'
import { SlowQueryLog, type SlowQuery } from '@/components/ui/slow-query-log'
import { Story } from '@/components/ui/story'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Image } from '@/components/ui/image'
import type { ComponentEntry } from './types'

const PHOTO = 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6'

/* ------------------------------------------------------- slow query log */

const QUERIES: SlowQuery[] = [
  { id: 'q1', statement: 'SELECT * FROM customers WHERE email = $1', calls: 412_800, meanMs: 38, p95Ms: 91, rows: 1, seqScan: true },
  { id: 'q2', statement: 'SELECT ledger.*, c.name FROM ledger JOIN customers c ON c.id = ledger.customer_id WHERE ledger.created_at > $1 ORDER BY ledger.created_at DESC', calls: 1_204, meanMs: 940, p95Ms: 2_180, rows: 4_200 },
  { id: 'q3', statement: 'SELECT count(*) FROM events WHERE created_at BETWEEN $1 AND $2', calls: 96, meanMs: 9_120, p95Ms: 14_400, rows: 1, seqScan: true },
  { id: 'q4', statement: 'UPDATE sessions SET last_seen = now() WHERE id = $1', calls: 1_840_000, meanMs: 2.1, p95Ms: 6, rows: 1 },
]

export const slowQueryLogEntry: ComponentEntry = {
  id: 'slow-query-log',
  label: 'Slow Query Log',
  isNew: true,
  description:
    'The queries costing you the most, ranked by total time rather than mean. The 9-second report running twice a day is easy to find; the 40ms lookup running four thousand times a minute is the one saturating the database.',
  usage: `import { SlowQueryLog } from '@/components/ui/slow-query-log'

<SlowQueryLog queries={queries} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'rankByTotal', label: 'rank by total time', default: true }],
    render: (state) => (<div className="w-full"><SlowQueryLog queries={QUERIES} rankByTotal={Boolean(state.rankByTotal)} /></div>),
    code: (state) => `<SlowQueryLog queries={queries} rankByTotal={${Boolean(state.rankByTotal)}} />`,
  },
  api: [
    { name: 'queries', type: 'SlowQuery[]', description: '{ id, statement, calls, meanMs, p95Ms?, rows?, seqScan?, meta? }. Statements should be normalised by the caller so the same query aggregates into one row.' },
    { name: 'rankByTotal', type: 'boolean', default: 'true', description: 'mean × calls. Turn it off to rank by mean, which is the ordering most tools use and the one that hides the real problem.' },
    { name: 'seqScan', type: 'boolean', description: 'No index was used — the most actionable finding here, and invisible in the timings alone.' },
  ],
  demos: [
    { title: 'Ranked by total database time', stack: true, code: `<SlowQueryLog queries={queries} />`,
      render: () => (<div className="w-full"><SlowQueryLog queries={QUERIES} /></div>) },
  ],
}

/* ------------------------------------------------------------ index list */

const INDEXES: DatabaseIndex[] = [
  { name: 'customers_pkey', columns: ['id'], primary: true, unique: true, size: 42_000_000, scans: 0 },
  { name: 'customers_email_key', columns: ['email'], unique: true, size: 38_000_000, scans: 1_204_918 },
  { name: 'customers_created_at_idx', columns: ['created_at'], size: 31_000_000, scans: 0 },
  { name: 'customers_plan_idx', columns: ['plan'], size: 12_000_000, scans: 88_412 },
  { name: 'customers_plan_dup_idx', columns: ['plan'], size: 12_000_000, scans: 4 },
]

export const indexListEntry: ComponentEntry = {
  id: 'index-list',
  label: 'Index List',
  isNew: true,
  description:
    'The indexes on a table and which are dead weight. An unused index is written on every insert and makes the planner’s job harder — but a primary key with no scans is not flagged, because suggesting you drop one is advice that loses data.',
  usage: `import { IndexList, duplicateIndexes } from '@/components/ui/index-list'

<IndexList indexes={indexes} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => (<div className="w-full max-w-2xl"><IndexList indexes={INDEXES} /></div>),
    code: () => `<IndexList indexes={indexes} />`,
  },
  api: [
    { name: 'indexes', type: 'DatabaseIndex[]', description: '{ name, columns, unique?, primary?, size?, scans?, meta? }. Column order matters for a composite index and is preserved.' },
    { name: 'scans === 0', type: 'flagged', description: 'Dead weight — unless it is the primary key, which earns its keep enforcing uniqueness whether or not anything reads through it.' },
    { name: 'duplicateIndexes', type: '(indexes) => Set<string>', description: 'Same columns in the same order. Exported so a migration check can fail on it.' },
  ],
  demos: [
    { title: 'An unused index and a duplicate', stack: true, code: `<IndexList indexes={indexes} />`,
      render: () => (<div className="w-full max-w-2xl"><IndexList indexes={INDEXES} /></div>) },
  ],
}

/* ------------------------------------------------------------ replication */

const REPLICAS: Replica[] = [
  { id: 'r1', name: 'replica-eu-1', region: 'eu-west-2', state: 'streaming', lagSeconds: 0.2, lagBytes: 1_400_000, readable: true },
  { id: 'r2', name: 'replica-eu-2', region: 'eu-west-1', state: 'streaming', lagSeconds: 14.8, lagBytes: 214_000_000, readable: true },
  { id: 'r3', name: 'replica-us-1', region: 'us-east-1', state: 'disconnected', lagSeconds: 0, lagBytes: 0 },
]

export const replicationStatusEntry: ComponentEntry = {
  id: 'replication-status',
  label: 'Replication Status',
  isNew: true,
  description:
    'A primary and its replicas with how far behind each one is, in seconds and bytes. Seconds say how stale a read is; bytes say whether it is catching up or falling further behind — a replica idling on 200MB of unsent log shows 0s until traffic arrives.',
  usage: `import { ReplicationStatus } from '@/components/ui/replication-status'

<ReplicationStatus primary={primary} replicas={replicas} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'warn', label: 'warnSeconds', default: 10, min: 1, max: 60, step: 1 }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <ReplicationStatus
          primary={{ name: 'astralyx-prod', region: 'eu-west-2', writes: '1.2k tx/s' }}
          replicas={REPLICAS}
          warnSeconds={Number(state.warn)}
        />
      </div>
    ),
    code: (state) => `<ReplicationStatus\n  primary={primary}\n  replicas={replicas}\n  warnSeconds={${Number(state.warn)}}\n/>`,
  },
  api: [
    { name: 'primary / replicas', type: '{ name, region?, writes? } / Replica[]', description: 'Replica is { id, name, lagSeconds?, lagBytes?, state?, readable?, region?, meta? }.' },
    { name: 'state', type: "'streaming' | 'catchup' | 'disconnected'", description: 'A disconnected replica is drawn as a failure, not as very high lag — one needs patience, the other needs someone.' },
    { name: 'no replicas', type: 'flagged', description: 'Rendered as “no read redundancy”, rather than as an empty list.' },
  ],
  demos: [
    { title: 'One lagging, one disconnected', stack: true, code: `<ReplicationStatus primary={primary} replicas={replicas} />`,
      render: () => (<div className="w-full max-w-2xl"><ReplicationStatus primary={{ name: 'astralyx-prod', region: 'eu-west-2', writes: '1.2k tx/s' }} replicas={REPLICAS} /></div>) },
  ],
}

/* -------------------------------------------------------- connection pool */

export const connectionPoolEntry: ComponentEntry = {
  id: 'connection-pool',
  label: 'Connection Pool',
  isNew: true,
  description:
    'What is checked out, idle and waiting. A pool at 100% with nothing queued is exactly the right size; the same pool with twelve waiting is an outage forming — so waiters are drawn beyond the bar rather than folded into it.',
  usage: `import { ConnectionPool } from '@/components/ui/connection-pool'

<ConnectionPool active={18} idle={4} max={25} waiting={0} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'active', label: 'active', default: 18, min: 0, max: 25, step: 1 },
      { type: 'number', prop: 'waiting', label: 'waiting', default: 0, min: 0, max: 20, step: 1 },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <ConnectionPool
          active={Number(state.active)}
          idle={Math.max(0, 25 - Number(state.active) - 3)}
          max={25}
          waiting={Number(state.waiting)}
          waitMs={Number(state.waiting) > 0 ? 240 : 2}
        />
      </div>
    ),
    code: (state) => `<ConnectionPool\n  active={${Number(state.active)}}\n  idle={4}\n  max={25}\n  waiting={${Number(state.waiting)}}\n/>`,
  },
  api: [
    { name: 'active / idle / max', type: 'number', description: 'Checked out, open but unused, and the ceiling. Idle is shown rather than hidden: two active and thirty idle is paying to hold thirty sockets against a connection limit.' },
    { name: 'waiting', type: 'number', description: 'Requests queued for a connection — the number that signals trouble. Drawn past the end of the bar, because it is demand the pool cannot meet.' },
    { name: 'waitMs', type: 'number', description: 'Mean time before a connection is handed over.' },
  ],
  demos: [
    { title: 'Healthy, and saturated', stack: true, code: `<ConnectionPool active={18} idle={4} max={25} />
<ConnectionPool active={25} idle={0} max={25} waiting={12} />`,
      render: () => (<div className="flex w-full max-w-xl flex-col gap-3"><ConnectionPool active={18} idle={4} max={25} waitMs={2} /><ConnectionPool active={25} idle={0} max={25} waiting={12} waitMs={480} /></div>) },
  ],
}

/* ------------------------------------------------------------ csv preview */

const CSV_COLUMNS: CsvColumn[] = [
  { name: 'id', type: 'string', confidence: 1 },
  { name: 'email', type: 'string', confidence: 1, nulls: 1 },
  { name: 'seats', type: 'integer', confidence: 0.94, nulls: 0 },
  { name: 'created_at', type: 'mixed', confidence: 0.62 },
]

const CSV_ROWS = [
  ['cus_8812', 'ada@example.com', '12', '2026-03-14'],
  ['cus_8813', 'marc@example.com', '3', '02/04/2026'],
  ['cus_8814', '', '8', '2026-05-19'],
  ['cus_8815', 'devon@example.com', 'many', 'May 2026'],
  ['cus_8816', 'priya@example.com', '4'],
]

export const csvPreviewEntry: ComponentEntry = {
  id: 'csv-preview',
  label: 'CSV Preview',
  isNew: true,
  description:
    'A parsed CSV before you import it, showing the rows that will break the import. A preview that renders the first ten rows of a clean file has shown you nothing — mismatched column counts are what abort an import halfway.',
  usage: `import { CsvPreview } from '@/components/ui/csv-preview'

<CsvPreview columns={columns} rows={rows} malformed={[4]} totalRows={18_402} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'malformed', label: 'show bad rows', default: true }],
    render: (state) => (
      <div className="w-full">
        <CsvPreview
          columns={CSV_COLUMNS}
          rows={CSV_ROWS}
          totalRows={18_402}
          malformed={state.malformed ? [4] : []}
        />
      </div>
    ),
    code: (state) => `<CsvPreview\n  columns={columns}\n  rows={rows}\n  totalRows={18_402}\n${state.malformed ? '  malformed={[4]}\n' : ''}/>`,
  },
  api: [
    { name: 'columns / rows', type: 'CsvColumn[] / string[][]', description: 'Already parsed. This renders; it does not parse — quoted fields with commas and newlines are a real parser’s job, and a naive split mangles exactly the files that need previewing.' },
    { name: 'malformed', type: 'number[]', description: 'Row indices whose column count did not match the header. Surfaced above the table, since it is the reason to open a preview.' },
    { name: 'confidence', type: 'number', description: 'Inference reported rather than asserted: 998 integers and 2 blanks is an integer column with nulls; 500 integers and 500 dates is a mess someone has to look at.' },
  ],
  demos: [
    { title: 'A file with a bad row', stack: true, code: `<CsvPreview columns={columns} rows={rows} malformed={[4]} />`,
      render: () => (<div className="w-full"><CsvPreview columns={CSV_COLUMNS} rows={CSV_ROWS} totalRows={18_402} malformed={[4]} /></div>) },
  ],
}

/* ----------------------------------------------------------- data quality */

const PROFILE: ColumnProfile[] = [
  { name: 'id', type: 'text', nullFraction: 0, distinct: 18_402, total: 18_402, samples: ['cus_8812', 'cus_8813'] },
  { name: 'email', type: 'text', nullFraction: 0.02, distinct: 18_020, total: 18_402, samples: ['ada@example.com', 'marc@example.com'] },
  { name: 'plan', type: 'text', nullFraction: 0, distinct: 3, total: 18_402, samples: ['team', 'pro', 'free'] },
  { name: 'region', type: 'text', nullFraction: 0.68, distinct: 12, total: 18_402, samples: ['eu-west-2', 'us-east-1'] },
  { name: 'schema_version', type: 'integer', nullFraction: 0, distinct: 1, total: 18_402, min: 3, max: 3, samples: ['3'] },
  { name: 'signup_date', type: 'text', nullFraction: 0.01, distinct: 402, total: 18_402, samples: ['2026-03-14', '02/04/2026', 'May 2026'] },
]

export const dataQualityEntry: ComponentEntry = {
  id: 'data-quality',
  label: 'Data Quality',
  isNew: true,
  description:
    'A column profile: how complete, how varied, and what the values look like. Sample values are the fastest way to spot that a “date” column holds three different formats — no summary statistic catches that.',
  usage: `import { DataQuality } from '@/components/ui/data-quality'

<DataQuality columns={profile} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'warn', label: 'nullWarnAt', default: 0.3, min: 0.1, max: 0.9, step: 0.1 }],
    render: (state) => (<div className="w-full max-w-2xl"><DataQuality columns={PROFILE} nullWarnAt={Number(state.warn)} /></div>),
    code: (state) => `<DataQuality columns={profile} nullWarnAt={${Number(state.warn)}} />`,
  },
  api: [
    { name: 'columns', type: 'ColumnProfile[]', description: '{ name, type?, nullFraction?, distinct?, total?, min?, max?, samples? }.' },
    { name: 'distinct', type: 'number', description: 'One distinct value is a constant masquerading as data; one per row is an id, not a dimension. Both are flagged, because both break what a chart expects.' },
    { name: 'samples', type: 'string[]', description: 'Real values. The fastest way to see mixed formats hiding behind a clean-looking type.' },
  ],
  demos: [
    { title: 'A constant, an id and a mostly-empty column', stack: true, code: `<DataQuality columns={profile} />`,
      render: () => (<div className="w-full max-w-2xl"><DataQuality columns={PROFILE} /></div>) },
  ],
}

/* ----------------------------------------------------------------- story */

function StoryDemo({ autoPlay = true, duration = 4000 }: { autoPlay?: boolean; duration?: number }) {
  const [open, setOpen] = useState(false)

  const panels = [
    {
      id: 'p1',
      content: (
        <div className="flex h-full flex-col justify-end gap-3 p-6">
          <Image
            src={`${PHOTO}?auto=format&fit=crop&w=800&q=70`}
            alt="A workstation at dusk"
            mask="skeleton"
            // No `ratio` here: the box is already sized by `inset-0`, and an
            // aspect ratio on top of that fights it and leaves dead space.
            className="absolute inset-0 rounded-none border-0"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent"
          />
          <div className="relative">
            <Badge size="sm" color="violet">Release</Badge>
            <p className="mt-2 text-xl font-semibold">v0.3 is out</p>
            <p className="text-sm text-white/70">Fourteen new components for data and storage.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'p2',
      content: (
        <div className="flex h-full flex-col justify-center gap-4 p-8">
          <p className="text-2xl font-semibold leading-tight">Panels are just nodes.</p>
          <p className="text-sm text-white/70">
            A chart, a form, a changelog entry — anything you can render goes in here, which is
            what makes this different from an image carousel.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">Read the notes</Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
              Later
            </Button>
          </div>
          <p className="text-xs text-white/50">
            Focus a button above and the timer stops — a panel you can tab through must not advance
            underneath you.
          </p>
        </div>
      ),
      duration: 8000,
    },
    {
      id: 'p3',
      content: (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <Avatar name="Ada Lovelace" size="lg" />
          <p className="text-lg font-medium">Hold to pause</p>
          <p className="text-sm text-white/70">Tap the left third to go back, the right to skip.</p>
        </div>
      ),
    },
  ]

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <Button onClick={() => setOpen(true)}>Open the story</Button>
      <p className="text-muted-foreground text-xs">
        Escape closes it, arrows move between panels, and holding pauses.
      </p>
      <Story
        open={open}
        onOpenChange={setOpen}
        panels={panels}
        autoPlay={autoPlay}
        duration={duration}
        header={
          <div className="flex items-center gap-2">
            <Avatar name="Astralyx" size="sm" />
            <span className="text-sm font-medium">astralyx</span>
            <span className="text-xs text-white/50">now</span>
          </div>
        }
      />
    </div>
  )
}

export const storyEntry: ComponentEntry = {
  id: 'story',
  label: 'Story',
  isNew: true,
  description:
    'A full-screen sequence of panels over a darkened page. A dialog underneath — same overlay, focus trap, Escape and scroll lock — but it advances on its own, and everything else follows from that.',
  usage: `import { Story } from '@/components/ui/story'

<Story
  open={open}
  onOpenChange={setOpen}
  panels={[{ id: '1', content: <Announcement /> }]}
  header={<Avatar name="Astralyx" size="sm" />}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'autoPlay', label: 'autoPlay', default: true },
      { type: 'number', prop: 'duration', label: 'duration (ms)', default: 4000, min: 1500, max: 10_000, step: 500 },
    ],
    render: (state) => <StoryDemo autoPlay={Boolean(state.autoPlay)} duration={Number(state.duration)} />,
    code: (state) => `<Story\n  open={open}\n  onOpenChange={setOpen}\n  panels={panels}\n  autoPlay={${Boolean(state.autoPlay)}}\n  duration={${Number(state.duration)}}\n/>`,
  },
  api: [
    { name: 'panels', type: 'StoryPanel[]', description: '{ id, content, duration? }. Content is a ReactNode, so a panel is not limited to an image — a chart, a form or a changelog entry all work.' },
    { name: 'timing', type: 'wall clock', description: 'Progress is recomputed from the animation frame rather than counted down on an interval. A story left in a background tab would otherwise race through every panel and be finished when you came back.' },
    { name: 'pausing', type: 'press, focus, reduced motion', description: 'Holding pauses — the gesture from the apps this comes from. Focus inside a panel pauses too, or a panel with a link is unusable while tabbing. prefers-reduced-motion starts it stopped.' },
    { name: 'index / onIndexChange', type: 'number / (index) => void', description: 'Controlled position. Uncontrolled by default, resetting to the first panel each time it opens.' },
    { name: 'onFinish', type: '() => void', description: 'After the last panel. Defaults to closing.' },
    { name: 'keyboard', type: 'Escape / arrows', description: 'The tap zones are real buttons, so the sequence is navigable without a pointer.' },
  ],
  demos: [
    { title: 'A three-panel story', stack: true, code: `<Story open={open} onOpenChange={setOpen} panels={panels} />`,
      render: () => <StoryDemo /> },
    { title: 'Manual advance', stack: true, code: `<Story open={open} onOpenChange={setOpen} panels={panels} autoPlay={false} />`,
      render: () => <StoryDemo autoPlay={false} /> },
  ],
}
