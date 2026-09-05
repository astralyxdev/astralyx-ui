import {
  Boxes,
  Check,
  GitCommitHorizontal,
  Package,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { DataGrid, type DataGridColumn } from '@/components/ui/data-grid'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/ui/description-list'
import { Dropzone } from '@/components/ui/dropzone'
import type { FileUpload, UploadControl } from '@/lib/use-uploads'
import { Badge } from '@/components/ui/badge'
import { Sparkline } from '@/components/ui/sparkline'
import { Stat } from '@/components/ui/stat'
import { Stepper } from '@/components/ui/stepper'
import { Timeline, TimelineContent, TimelineItem } from '@/components/ui/timeline'
import { Tree, type TreeNode } from '@/components/ui/tree'
import type { ComponentEntry, ComposerState } from './types'

const SERIES = [12, 18, 14, 22, 19, 28, 24, 31, 27, 35, 33, 42]

/* ---------------------------------------------------------------- sparkline */

const SPARK_VARIANTS = ['line', 'area', 'bar'] as const

export const sparklineEntry: ComponentEntry = {
  id: 'sparkline',
  label: 'Sparkline',
  description:
    'A microchart with no axes, legend or dependency — plain SVG over a normalised range, sized by whatever box you put it in.',
  usage: `import { Sparkline } from '@/components/ui/sparkline'

<Sparkline values={[12, 18, 14, 22, 19, 28]} variant="area" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: SPARK_VARIANTS, default: 'line' },
      { type: 'color', prop: 'color', label: 'color', default: '#22c55e' },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Sparkline
          values={SERIES}
          variant={String(state.variant) as (typeof SPARK_VARIANTS)[number]}
          color={String(state.color)}
          className="h-12"
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Sparkline\n  values={[12, 18, 14, 22, 19, 28, 24, 31]}\n  variant="${state.variant}"\n  color="${state.color}"\n/>`,
  },
  api: [
    { name: 'values', type: 'number[]', description: 'The series. A single value renders one centred point; a flat series is centred rather than dividing by a zero range.' },
    { name: 'variant', type: "'line' | 'area' | 'bar'", default: "'line'", description: 'Stroke, filled stroke, or discrete columns.' },
    { name: 'color', type: 'string', default: "'currentColor'", description: 'Any CSS colour. Inherits the surrounding text colour by default, so it themes for free.' },
    { name: 'baseline', type: 'number', description: 'Floor for the fill and bars. Defaults to the lowest value in the series.' },
    { name: 'strokeWidth', type: 'number', default: '1.5', description: 'Kept even under the horizontal stretch by non-scaling-stroke.' },
  ],
  demos: [
    {
      title: 'Variants',
      stack: true,
      code: `<Sparkline values={series} />
<Sparkline values={series} variant="area" color="var(--blue)" />
<Sparkline values={series} variant="bar" color="var(--violet)" />`,
      render: () => (
        <div className="flex w-full flex-col gap-4">
          <Sparkline values={SERIES} />
          <Sparkline values={SERIES} variant="area" color="var(--blue)" />
          <Sparkline values={SERIES} variant="bar" color="var(--violet)" />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------------- stat */

const GOOD = ['up', 'down', 'none'] as const
const STAT_SIZES = ['sm', 'default', 'lg'] as const

export const statEntry: ComponentEntry = {
  id: 'stat',
  label: 'Stat',
  description:
    'One measurement: label, value and how it moved. Which direction counts as healthy is a prop, because a rise in incidents is not a rise in deployments.',
  usage: `import { Stat } from '@/components/ui/stat'

<Stat label="Deployments" value="1,482" delta={12.4} />
<Stat label="Open incidents" value="3" delta={2} goodDirection="down" />`,
  composer: {
    controls: [
      { type: 'text', prop: 'label', label: 'label', default: 'Deployments' },
      { type: 'text', prop: 'value', label: 'value', default: '1,482' },
      { type: 'text', prop: 'delta', label: 'delta', default: '12.4' },
      { type: 'select', prop: 'goodDirection', label: 'goodDirection', options: GOOD, default: 'up' },
      { type: 'select', prop: 'size', label: 'size', options: STAT_SIZES, default: 'default' },
      { type: 'boolean', prop: 'chart', label: 'chart', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <Stat
          label={String(state.label)}
          value={String(state.value)}
          delta={Number(state.delta)}
          goodDirection={String(state.goodDirection) as (typeof GOOD)[number]}
          size={String(state.size) as (typeof STAT_SIZES)[number]}
          chart={state.chart ? <Sparkline values={SERIES} variant="area" /> : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Stat\n  label="${state.label}"\n  value="${state.value}"\n  delta={${state.delta}}\n  goodDirection="${state.goodDirection}"\n  size="${state.size}"${state.chart ? '\n  chart={<Sparkline values={series} variant="area" />}' : ''}\n/>`,
  },
  api: [
    { name: 'label / value', type: 'ReactNode', description: 'What is measured, and the measurement.' },
    { name: 'delta', type: 'number', description: 'Signed change. The sign picks the arrow; the absolute value is printed, since the arrow already carries direction.' },
    { name: 'goodDirection', type: "'up' | 'down' | 'none'", default: "'up'", description: 'Which way is healthy. Colours the delta green or red accordingly; `none` keeps it neutral.' },
    { name: 'deltaSuffix', type: 'string', default: "'%'", description: 'Unit printed after the delta.' },
    { name: 'chart', type: 'ReactNode', description: 'Usually a Sparkline, rendered under the value.' },
    { name: 'size', type: "'sm' | 'default' | 'lg'", default: "'default'", description: 'Scales the value type and the card padding together.' },
    { name: 'bordered', type: 'boolean', default: 'true', description: 'Draw the card. Turn off inside a container that already provides one.' },
  ],
  demos: [
    {
      title: 'A row of measures',
      stack: true,
      code: `<Stat label="Deployments" value="1,482" delta={12.4} chart={<Sparkline values={series} variant="area" />} />
<Stat label="Success rate" value="98.2%" delta={0.6} />
<Stat label="Open incidents" value="3" delta={2} goodDirection="down" />`,
      render: () => (
        <div className="grid w-full gap-3 sm:grid-cols-3">
          <Stat label="Deployments" value="1,482" delta={12.4} chart={<Sparkline values={SERIES} variant="area" />} />
          <Stat label="Success rate" value="98.2%" delta={0.6} deltaSuffix="pp" />
          <Stat label="Open incidents" value="3" delta={2} deltaSuffix="" goodDirection="down" />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------------- timeline */

export const timelineEntry: ComponentEntry = {
  id: 'timeline',
  label: 'Timeline',
  description:
    'A vertical run of events sharing one rail — deploys, incidents, review activity, an agent run. The connector stops at the last item instead of dangling past it.',
  usage: `import { Timeline, TimelineItem } from '@/components/ui/timeline'

<Timeline>
  <TimelineItem title="Deployed to production" time="2m ago" tone="success" />
  <TimelineItem title="Checks passed" time="6m ago" tone="info" />
</Timeline>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'pending', label: 'last step pending', default: true },
      { type: 'boolean', prop: 'body', label: 'body content', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <Timeline>
          <TimelineItem title="Deployed to production" time="2m ago" tone="success" icon={<Rocket />}>
            {state.body ? <TimelineContent>astralyx-ui@1.4.2 · 42s</TimelineContent> : 'Release 1.4.2'}
          </TimelineItem>
          <TimelineItem title="Checks passed" time="6m ago" tone="info" icon={<ShieldCheck />} />
          <TimelineItem title="Commit pushed" time="8m ago" icon={<GitCommitHorizontal />} />
          <TimelineItem
            title="Awaiting review"
            time="—"
            tone="muted"
            pending={Boolean(state.pending)}
          />
        </Timeline>
      </div>
    ),
    code: (state: ComposerState) =>
      `<Timeline>\n  <TimelineItem title="Deployed to production" time="2m ago" tone="success" icon={<Rocket />} />\n  <TimelineItem title="Checks passed" time="6m ago" tone="info" />\n  <TimelineItem title="Awaiting review" tone="muted"${state.pending ? ' pending' : ''} />\n</Timeline>`,
  },
  api: [
    { name: 'TimelineItem title', type: 'ReactNode', description: 'The event. Required — an item with only a body has nothing to scan.' },
    { name: 'TimelineItem time', type: 'ReactNode', description: 'Right-aligned from `sm` up, and under the title on narrow screens.' },
    { name: 'TimelineItem tone', type: "'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'", default: "'default'", description: 'Marker colour.' },
    { name: 'TimelineItem pending', type: 'boolean', default: 'false', description: 'Draw the marker as an outline, for an event that has not happened yet.' },
    { name: 'TimelineItem icon', type: 'ReactNode', description: 'Replaces the default dot.' },
    { name: 'TimelineContent', type: 'component', description: 'A framed body under an event — a log excerpt, a diff, a message.' },
  ],
  demos: [
    {
      title: 'Deploy history',
      stack: true,
      code: `<Timeline>
  <TimelineItem title="Deployed to production" time="2m ago" tone="success" icon={<Rocket />}>
    <TimelineContent>astralyx-ui@1.4.2 · 42s</TimelineContent>
  </TimelineItem>
  <TimelineItem title="Build passed" time="4m ago" tone="info" icon={<Package />} />
  <TimelineItem title="Queued" time="5m ago" tone="muted" pending />
</Timeline>`,
      render: () => (
        <div className="w-full max-w-md">
          <Timeline>
            <TimelineItem title="Deployed to production" time="2m ago" tone="success" icon={<Rocket />}>
              <TimelineContent>astralyx-ui@1.4.2 · 42s</TimelineContent>
            </TimelineItem>
            <TimelineItem title="Build passed" time="4m ago" tone="info" icon={<Package />} />
            <TimelineItem title="Queued" time="5m ago" tone="muted" pending />
          </Timeline>
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------------- tree */

const TREE_NODES: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    icon: <Boxes />,
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'button', label: 'button.tsx', meta: '4.1 kB' },
          { id: 'tree', label: 'tree.tsx', meta: '6.8 kB' },
        ],
      },
      { id: 'lib', label: 'lib', children: [{ id: 'utils', label: 'utils.ts', meta: '0.3 kB' }] },
      { id: 'index', label: 'index.css', meta: '12 kB' },
    ],
  },
  { id: 'readme', label: 'README.md', meta: '2 kB' },
]

export const treeEntry: ComponentEntry = {
  id: 'tree',
  label: 'Tree',
  description:
    'A collapsible hierarchy with real keyboard navigation — arrow keys move by what is visible, one tab stop for the whole tree, and ARIA that says where each row sits in its branch.',
  usage: `import { Tree } from '@/components/ui/tree'

<Tree
  nodes={nodes}
  defaultExpanded={['src']}
  onSelect={(id) => open(id)}
/>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'guides', label: 'guides', default: true }],
    render: (state) => (
      <div className="w-full max-w-xs">
        <Tree nodes={TREE_NODES} defaultExpanded={['src', 'components']} guides={Boolean(state.guides)} />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Tree\n  nodes={nodes}\n  defaultExpanded={['src', 'components']}\n  guides={${Boolean(state.guides)}}\n/>`,
  },
  api: [
    { name: 'nodes', type: 'TreeNode[]', description: 'Recursive: `{ id, label, icon?, meta?, children?, disabled? }`.' },
    { name: 'expanded / defaultExpanded / onExpandedChange', type: 'string[]', description: 'Controlled or uncontrolled expansion, by node id.' },
    { name: 'selected / onSelect', type: 'string / (id) => void', description: 'Selection. Clicking a branch toggles it; clicking a leaf selects it.' },
    { name: 'keyboard', type: '↑ ↓ → ← Home End', description: 'Up and down move over visible rows. Right opens a branch then steps into it; Left closes it, then climbs to the parent.' },
    { name: 'guides', type: 'boolean', default: 'true', description: 'Indent guides.' },
  ],
  demos: [
    {
      title: 'File hierarchy',
      stack: true,
      code: `<Tree nodes={nodes} defaultExpanded={['src', 'components']} selected="tree" />`,
      render: () => (
        <div className="w-full max-w-xs">
          <Tree nodes={TREE_NODES} defaultExpanded={['src', 'components']} selected="tree" />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------- description list */

export const descriptionListEntry: ComponentEntry = {
  id: 'description-list',
  label: 'Description List',
  description:
    'Key/value metadata as a real <dl>, so a screen reader announces each term with its value. Columns on wide screens, stacked on narrow ones.',
  usage: `import {
  DescriptionList, DescriptionTerm, DescriptionDetails,
} from '@/components/ui/description-list'

<DescriptionList>
  <DescriptionTerm>Status</DescriptionTerm>
  <DescriptionDetails>Running</DescriptionDetails>
</DescriptionList>`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'columns', label: 'columns', default: true },
      { type: 'boolean', prop: 'divided', label: 'divided', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <DescriptionList columns={Boolean(state.columns)} divided={Boolean(state.divided)}>
          <DescriptionTerm>Environment</DescriptionTerm>
          <DescriptionDetails>Production</DescriptionDetails>
          <DescriptionTerm>Region</DescriptionTerm>
          <DescriptionDetails>eu-west-1</DescriptionDetails>
          <DescriptionTerm>Commit</DescriptionTerm>
          <DescriptionDetails>
            <code className="font-mono text-xs">4f2a1c9</code>
          </DescriptionDetails>
          <DescriptionTerm>Status</DescriptionTerm>
          <DescriptionDetails>
            <Badge size="sm" color="green">Healthy</Badge>
          </DescriptionDetails>
        </DescriptionList>
      </div>
    ),
    code: (state: ComposerState) =>
      `<DescriptionList columns={${Boolean(state.columns)}} divided={${Boolean(state.divided)}}>\n  <DescriptionTerm>Environment</DescriptionTerm>\n  <DescriptionDetails>Production</DescriptionDetails>\n</DescriptionList>`,
  },
  api: [
    { name: 'columns', type: 'boolean', default: 'true', description: 'Term beside value from `sm` up. At phone width a split leaves both halves too narrow, so it stacks below that regardless.' },
    { name: 'divided', type: 'boolean', default: 'false', description: 'Hairline between pairs.' },
    { name: 'DescriptionPairs', type: 'component', description: 'Convenience wrapper taking `items={[{ term, details }]}` for a flat list.' },
  ],
  demos: [
    {
      title: 'Deployment metadata',
      stack: true,
      code: `<DescriptionList divided>
  <DescriptionTerm>Environment</DescriptionTerm>
  <DescriptionDetails>Production</DescriptionDetails>
  <DescriptionTerm>Region</DescriptionTerm>
  <DescriptionDetails>eu-west-1</DescriptionDetails>
</DescriptionList>`,
      render: () => (
        <div className="w-full max-w-lg">
          <DescriptionList divided>
            <DescriptionTerm>Environment</DescriptionTerm>
            <DescriptionDetails>Production</DescriptionDetails>
            <DescriptionTerm>Region</DescriptionTerm>
            <DescriptionDetails>eu-west-1</DescriptionDetails>
            <DescriptionTerm>Deployed by</DescriptionTerm>
            <DescriptionDetails>Ada Lovelace</DescriptionDetails>
          </DescriptionList>
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------------ stepper */

const STEPS = [
  { id: 'install', label: 'Install', description: 'Restore dependencies' },
  { id: 'build', label: 'Build', description: 'Compile and bundle' },
  { id: 'test', label: 'Test', description: '412 specs' },
  { id: 'deploy', label: 'Deploy', description: 'Ship to production' },
]

export const stepperEntry: ComponentEntry = {
  id: 'stepper',
  label: 'Stepper',
  description:
    'Progress through a fixed sequence. One `current` index drives the common case; any step can override its own status for a failure or a skip in the middle.',
  usage: `import { Stepper } from '@/components/ui/stepper'

<Stepper steps={steps} current={2} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'orientation', label: 'orientation', options: ['horizontal', 'vertical'], default: 'horizontal' },
      { type: 'select', prop: 'current', label: 'current', options: ['0', '1', '2', '3'], default: '2' },
      { type: 'boolean', prop: 'failed', label: 'step 2 failed', default: false },
    ],
    render: (state) => (
      <div className="w-full">
        <Stepper
          steps={
            state.failed
              ? STEPS.map((s, i) => (i === 1 ? { ...s, status: 'failed' as const } : s))
              : STEPS
          }
          current={Number(state.current)}
          orientation={String(state.orientation) as 'horizontal' | 'vertical'}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Stepper\n  steps={steps}\n  current={${state.current}}\n  orientation="${state.orientation}"\n/>`,
  },
  api: [
    { name: 'steps', type: 'Step[]', description: '`{ id, label, description?, status?, icon? }`. A `status` overrides what `current` would imply.' },
    { name: 'current', type: 'number', default: '0', description: 'Index of the active step. Everything before it reads as complete.' },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Axis.' },
    { name: 'responsive', type: "'sm' | 'md' | 'lg' | false", default: "'sm'", description: 'Breakpoint a horizontal stepper becomes a row at. Below it the stages stack — four labelled stages across a phone gives each about seventy pixels.' },
    { name: 'status', type: "'pending' | 'active' | 'complete' | 'failed' | 'skipped'", description: 'Per-step override. Active shows a spinner, complete a tick, failed a cross, skipped a struck-through label.' },
  ],
  demos: [
    {
      title: 'Pipeline stages',
      stack: true,
      code: `<Stepper steps={steps} current={2} />
<Stepper steps={steps} current={2} orientation="vertical" />`,
      render: () => (
        <div className="flex w-full flex-col gap-8">
          <Stepper steps={STEPS} current={2} />
          <Stepper
            steps={STEPS.map((s, i) => (i === 1 ? { ...s, status: 'failed' as const } : s))}
            current={2}
            orientation="vertical"
          />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------------- dropzone */

/**
 * A stand-in for a real endpoint, so the docs demo the actual state machine
 * rather than a static picture of it. Honours the abort signal, which is the
 * part worth showing: removing a row mid-flight stops the request.
 */
function demoUpload(shouldFail: boolean) {
  return (upload: FileUpload, { signal, onProgress }: UploadControl) =>
    new Promise((resolve, reject) => {
      let sent = 0

      const tick = setInterval(() => {
        sent += 0.12
        if (sent >= 1) {
          clearInterval(tick)
          if (shouldFail) reject(new Error('Storage rejected the file (507)'))
          else resolve({ url: `https://cdn.example.com/${upload.name}` })
          return
        }
        onProgress(sent)
      }, 220)

      signal.addEventListener('abort', () => {
        clearInterval(tick)
        reject(new Error('Aborted'))
      })
    })
}

export const dropzoneEntry: ComponentEntry = {
  id: 'dropzone',
  label: 'Dropzone',
  description:
    'The upload card: click it or drag onto it, and it runs the upload. Hand it onUpload and it moves each file through queued, uploading, done or error, reports progress, and keeps failures on screen with a retry.',
  usage: `import { Dropzone } from '@/components/ui/dropzone'

<Dropzone
  multiple
  accept="image/*"
  maxSize={5_000_000}
  onUpload={async (upload, { signal, onProgress }) => {
    const body = new FormData()
    body.append('file', upload.file)

    const response = await fetch('/api/upload', { method: 'POST', body, signal })
    if (!response.ok) throw new Error(await response.text())

    onProgress(1)
    return response.json()
  }}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'multiple', label: 'multiple', default: true },
      { type: 'boolean', prop: 'showList', label: 'showList', default: true },
      { type: 'boolean', prop: 'fails', label: 'upload fails', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <Dropzone
          multiple={Boolean(state.multiple)}
          showList={Boolean(state.showList)}
          disabled={Boolean(state.disabled)}
          maxSize={5_000_000}
          accept="image/*"
          onUpload={demoUpload(Boolean(state.fails))}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Dropzone\n  multiple={${Boolean(state.multiple)}}\n  showList={${Boolean(state.showList)}}\n  accept="image/*"\n  maxSize={5_000_000}\n  onUpload={async (upload, { signal, onProgress }) => {\n    await putToApi(upload.file, { signal, onProgress })\n  }}\n/>`,
  },
  api: [
    { name: 'onUpload', type: '(upload: FileUpload, control: UploadControl) => Promise<unknown>', description: 'Runs the upload. Resolve to succeed — the value lands on upload.result; throw to fail, and the message shows on the row with a retry.' },
    { name: 'FileUpload', type: '{ id, file, name, size, type, lastModified, status, progress, result?, error? }', description: 'The structured payload handed to onUpload. `file` is the browser File — put it straight into a FormData.' },
    { name: 'UploadControl', type: '{ signal: AbortSignal; onProgress: (fraction: number) => void }', description: 'Pass the signal to fetch so removing a file aborts its request; call onProgress with 0–1 to drive the bar.' },
    { name: 'isUploading', type: 'boolean', description: 'Forces the busy state, for when the request is yours rather than onUpload’s. Shows the spinner and blocks further picking.' },
    { name: 'uploadingLabel / doneLabel', type: '(name: string) => ReactNode / (count: number) => ReactNode', description: 'The card names the file in flight and reports the total when it settles.' },
    { name: 'accept / multiple', type: 'string / boolean', description: 'Both are enforced on drop as well as on pick — a dropped file never went through the picker, so the browser never filtered it.' },
    { name: 'maxSize', type: 'number', description: 'Bytes. Rejected before the request is made, so an oversized file never leaves the browser.' },
    { name: 'accessibility', type: 'button + sr-only input', description: 'The card is a real button wrapping a hidden file input, so there is one tab stop and drag-and-drop is never the only way in.' },
  ],
  demos: [
    {
      title: 'Uploading, with progress and retry',
      stack: true,
      code: `<Dropzone multiple onUpload={upload} />`,
      render: () => (
        <div className="w-full max-w-md">
          <Dropzone multiple onUpload={demoUpload(false)} hint="Any file type" />
        </div>
      ),
    },
    {
      title: 'When the endpoint refuses it',
      stack: true,
      code: `<Dropzone onUpload={upload} accept="image/*" maxSize={2_000_000} />`,
      render: () => (
        <div className="w-full max-w-md">
          <Dropzone accept="image/*" maxSize={2_000_000} onUpload={demoUpload(true)} />
        </div>
      ),
    },
  ],
}

/* ---------------------------------------------------------------- data grid */

type BuildRow = Record<string, unknown> & {
  id: string
  branch: string
  status: string
  duration: number
  author: string
}

const BUILD_ROWS: BuildRow[] = [
  { id: '1482', branch: 'main', status: 'passed', duration: 192, author: 'Ada Lovelace' },
  { id: '1481', branch: 'feat/toast', status: 'passed', duration: 244, author: 'Grace Hopper' },
  { id: '1480', branch: 'main', status: 'failed', duration: 88, author: 'Alan Turing' },
  { id: '1479', branch: 'fix/input', status: 'passed', duration: 301, author: 'Ada Lovelace' },
]

const BUILD_COLUMNS: DataGridColumn<BuildRow>[] = [
  { key: 'id', header: '#', sortable: true, width: '5rem' },
  { key: 'branch', header: 'Branch', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (row) => (
      <Badge size="sm" color={row.status === 'passed' ? 'green' : 'destructive'}>
        {row.status === 'passed' ? <Check /> : null}
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'duration',
    header: 'Duration',
    align: 'end',
    sortable: true,
    hideOnMobile: true,
    render: (row) => `${Math.floor(row.duration / 60)}m ${row.duration % 60}s`,
  },
  { key: 'author', header: 'Author', hideOnMobile: true },
]

export const dataGridEntry: ComponentEntry = {
  id: 'data-grid',
  label: 'Data Grid',
  description:
    'Sorting and selection over Table, driven by a column definition. The sort is stable and never mutates your array, so re-sorting on an equal column leaves settled rows where they were.',
  usage: `import { DataGrid, type DataGridColumn } from '@/components/ui/data-grid'

const columns: DataGridColumn<Row>[] = [
  { key: 'id', header: '#', sortable: true },
  { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
]

<DataGrid columns={columns} rows={rows} rowKey={(row) => row.id} selectable />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'selectable', label: 'selectable', default: true },
      { type: 'boolean', prop: 'sorted', label: 'default sort', default: false },
    ],
    render: (state) => (
      <div className="w-full">
        <DataGrid
          columns={BUILD_COLUMNS}
          rows={BUILD_ROWS}
          rowKey={(row) => row.id}
          selectable={Boolean(state.selectable)}
          defaultSort={state.sorted ? { key: 'duration', direction: 'desc' } : null}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<DataGrid\n  columns={columns}\n  rows={rows}\n  rowKey={(row) => row.id}\n  selectable={${Boolean(state.selectable)}}${state.sorted ? "\n  defaultSort={{ key: 'duration', direction: 'desc' }}" : ''}\n/>`,
  },
  api: [
    { name: 'columns', type: 'DataGridColumn<Row>[]', description: '`{ key, header, render?, sortValue?, sortable?, align?, hideOnMobile?, width? }`.' },
    { name: 'rowKey', type: '(row) => string', description: 'Stable identity, used for React keys and for selection.' },
    { name: 'selectable / selected / onSelectedChange', type: 'boolean / string[] / (ids) => void', description: 'Header checkbox selects the page and goes indeterminate on a partial selection.' },
    { name: 'defaultSort', type: '{ key, direction } | null', description: 'Initial sort. Clicking a header cycles ascending, descending, off.' },
    { name: 'sortValue', type: '(row) => string | number', description: 'For anything not directly comparable — a formatted date, a status rank.' },
    { name: 'hideOnMobile', type: 'boolean', description: 'Drops the column below `sm` instead of letting the table scroll sideways for a nice-to-have field.' },
  ],
  demos: [
    {
      title: 'Builds',
      stack: true,
      code: `<DataGrid
  columns={columns}
  rows={rows}
  rowKey={(row) => row.id}
  selectable
  defaultSort={{ key: 'id', direction: 'desc' }}
/>`,
      render: () => (
        <div className="w-full">
          <DataGrid
            columns={BUILD_COLUMNS}
            rows={BUILD_ROWS}
            rowKey={(row) => row.id}
            selectable
            defaultSort={{ key: 'id', direction: 'desc' }}
          />
        </div>
      ),
    },
  ],
}
