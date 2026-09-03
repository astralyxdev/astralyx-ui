import { useState } from 'react'
import { BlameView, type BlameLine } from '@/components/ui/blame-view'
import { CronSchedule, type CronJob } from '@/components/ui/cron-schedule'
import { DependencyList, type Dependency } from '@/components/ui/dependency-list'
import { FeatureFlag } from '@/components/ui/feature-flag'
import { HealthChecks, type HealthCheck } from '@/components/ui/health-checks'
import { StackTrace, type StackFrame } from '@/components/ui/stack-trace'
import { TestResults, type TestSuite } from '@/components/ui/test-results'
import { TrafficSplit, type TrafficTarget } from '@/components/ui/traffic-split'
import { Terminal } from '@/components/ui/terminal'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const ahead = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

/* --------------------------------------------------------------- blame view */

const BLAME: BlameLine[] = [
  { line: 68, content: 'export const controlSize = {', sha: '9b1e77a2', author: 'Grace Hopper', date: ago(60 * 24 * 40), summary: 'Add squircle corners' },
  { line: 69, content: "  xs: 'h-7 gap-1.5 px-3.5 text-xs',", sha: '9b1e77a2', author: 'Grace Hopper', date: ago(60 * 24 * 40), summary: 'Add squircle corners' },
  { line: 70, content: "  sm: 'h-8 gap-1.5 px-3.5 text-sm',", sha: '9b1e77a2', author: 'Grace Hopper', date: ago(60 * 24 * 40), summary: 'Add squircle corners' },
  { line: 71, content: "  md: 'h-9 gap-2 px-4.5 text-sm',", sha: '2c8d4e10', author: 'Ada Lovelace', date: ago(95), summary: 'Derive padding from height' },
  { line: 72, content: "  lg: 'h-10 gap-2 px-6 text-sm',", sha: '2c8d4e10', author: 'Ada Lovelace', date: ago(95), summary: 'Derive padding from height' },
  { line: 73, content: '} as const', sha: '1d5b9e04', author: 'Alan Turing', date: ago(60 * 24 * 180), summary: 'Initial scaffold' },
]

export const blameViewEntry: ComponentEntry = {
  id: 'blame-view',
  label: 'Blame View',
  description:
    'Every line attributed to the commit that last touched it. Consecutive lines from one commit collapse into a single gutter entry — a blame view that repeats itself hides where one commit ends and the next begins.',
  usage: `import { BlameView } from '@/components/ui/blame-view'

<BlameView lines={lines} onSelectCommit={openCommit} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'selectable', label: 'commit links', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <BlameView
          lines={BLAME}
          now={NOW}
          onSelectCommit={state.selectable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<BlameView lines={lines} onSelectCommit={openCommit} />`,
  },
  api: [
    { name: 'lines', type: 'BlameLine[]', description: '`{ line, content, sha, author, date, summary? }`, in file order.' },
    { name: 'grouping', type: 'automatic', description: 'Runs of one commit share a gutter entry; the rest of the run is blank.' },
    { name: 'age ramp', type: 'gutter edge', description: 'Newer commits are hotter, so "old and stable versus new and suspect" is answerable without reading a date.' },
    { name: 'onSelectCommit', type: '(sha) => void', description: 'Each gutter entry is a button.' },
  ],
  demos: [
    { title: 'Attribution', stack: true, code: `<BlameView lines={lines} />`, render: () => <div className="w-full"><BlameView lines={BLAME} now={NOW} /></div> },
  ],
}

/* ------------------------------------------------------------- test results */

const SUITES: TestSuite[] = [
  {
    id: 's1',
    name: 'src/lib/styles.test.ts',
    tests: [
      { id: 't1', name: 'keeps radius under half the control height', status: 'failed', duration: 0.4, error: <Terminal copyable={false} content={'expected 20 to be less than 18\n  at styles.test.ts:41:22'} /> },
      { id: 't2', name: 'every colour set defines six variables', status: 'passed', duration: 0.1 },
    ],
  },
  {
    id: 's2',
    name: 'src/components/ui/button.test.tsx',
    tests: [
      { id: 't3', name: 'renders as a child element with asChild', status: 'passed', duration: 0.2 },
      { id: 't4', name: 'applies the colour set variables', status: 'passed', duration: 0.1 },
      { id: 't5', name: 'squircle opt-out at xs', status: 'skipped' },
    ],
  },
  {
    id: 's3',
    name: 'src/components/ui/tree.test.tsx',
    tests: [{ id: 't6', name: 'arrow keys move over visible rows', status: 'running' }],
  },
]

export const testResultsEntry: ComponentEntry = {
  id: 'test-results',
  label: 'Test Results',
  description:
    'A test run with suites, tests and failure output. Failures expand by default and passes stay collapsed — nobody opens a report to read what passed.',
  usage: `import { TestResults } from '@/components/ui/test-results'

<TestResults suites={suites} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'failedOnly', label: 'failures only', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <TestResults
          suites={
            state.failedOnly
              ? SUITES.filter((s) => s.tests.some((t) => t.status === 'failed'))
              : SUITES
          }
        />
      </div>
    ),
    code: () => `<TestResults suites={suites} />`,
  },
  api: [
    { name: 'suites', type: 'TestSuite[]', description: '`{ id, name, tests }` where a test is `{ id, name, status, duration?, error? }`.' },
    { name: 'suiteStatus', type: '(suite) => TestStatus', description: 'Exported roll-up. Derived, so a suite cannot claim to pass while containing a failure.' },
    { name: 'error', type: 'ReactNode', description: 'Rendered under the test on a tinted ground — a Terminal, usually.' },
  ],
  demos: [
    { title: 'Run', stack: true, code: `<TestResults suites={suites} />`, render: () => <div className="w-full"><TestResults suites={SUITES} /></div> },
  ],
}

/* ---------------------------------------------------------- dependency list */

const DEPS: Dependency[] = [
  { name: 'react', current: '19.2.8', latest: '19.2.8' },
  { name: 'tailwindcss', current: '4.1.0', latest: '4.3.3' },
  { name: 'vite', current: '7.4.1', latest: '8.0.1', dev: true },
  { name: 'shiki', current: '1.22.0', latest: '1.22.4' },
  { name: 'semver', current: '7.5.1', latest: '7.6.3', vulnerability: { severity: 'high', id: 'GHSA-c2qf-rxjj-qqgw' } },
  { name: 'oxlint', current: '0.9.2', latest: '0.9.2', dev: true },
]

export const dependencyListEntry: ComponentEntry = {
  id: 'dependency-list',
  label: 'Dependency List',
  description:
    'Packages with their update and vulnerability state. Severity outranks staleness in the sort, because ordering by how out of date things are buries a critical advisory behind forty patch bumps.',
  usage: `import { DependencyList } from '@/components/ui/dependency-list'

<DependencyList dependencies={deps} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'searchable', label: 'searchable', default: true }],
    render: (state) => (
      <div className="w-full">
        <DependencyList dependencies={DEPS} searchable={Boolean(state.searchable)} />
      </div>
    ),
    code: (s: ComposerState) =>
      `<DependencyList dependencies={deps} searchable={${Boolean(s.searchable)}} />`,
  },
  api: [
    { name: 'dependencies', type: 'Dependency[]', description: '`{ name, current, latest?, update?, dev?, vulnerability?, homepage? }`.' },
    { name: 'update', type: "'major' | 'minor' | 'patch' | null", description: 'Derived from the version pair when omitted. Major versus patch is the difference between a sprint and an afternoon, so "12 outdated" is not the useful number.' },
    { name: 'updateKind', type: '(current, latest) => kind', description: 'Exported. Returns null for anything unparseable rather than guessing.' },
    { name: 'sort', type: 'severity, then update size, then name', description: 'Fixed — this is a triage order, not a preference.' },
  ],
  demos: [
    { title: 'Packages', stack: true, code: `<DependencyList dependencies={deps} />`, render: () => <div className="w-full"><DependencyList dependencies={DEPS} /></div> },
  ],
}

/* -------------------------------------------------------------- stack trace */

const FRAMES: StackFrame[] = [
  {
    fn: 'renderRows',
    file: 'src/components/ui/data-grid.tsx',
    line: 214,
    column: 18,
    app: true,
    source: [
      { line: 212, content: '  const sorted = useMemo(() => {' },
      { line: 213, content: '    if (!sort) return rows' },
      { line: 214, content: '    return rows.map((row) => row.cells.map(render))' },
      { line: 215, content: '  }, [rows, sort])' },
    ],
  },
  { fn: 'renderWithHooks', file: 'node_modules/react-dom/cjs/react-dom.development.js', line: 5062 },
  { fn: 'updateFunctionComponent', file: 'node_modules/react-dom/cjs/react-dom.development.js', line: 8341 },
  { fn: 'handleSort', file: 'src/pages/builds.tsx', line: 48, column: 7, app: true },
  { fn: 'invokeGuardedCallback', file: 'node_modules/react-dom/cjs/react-dom.development.js', line: 4213 },
]

export const stackTraceEntry: ComponentEntry = {
  id: 'stack-trace',
  label: 'Stack Trace',
  description:
    'A parsed exception with its frames. Library frames collapse behind a count — a stack is typically three frames of your code buried in forty of the framework’s.',
  usage: `import { StackTrace } from '@/components/ui/stack-trace'

<StackTrace name="TypeError" message={error.message} frames={frames} raw={error.stack} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'vendor', label: 'vendor frames', default: true },
      { type: 'text', prop: 'name', label: 'error name', default: 'TypeError' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <StackTrace
          name={String(state.name)}
          message="Cannot read properties of undefined (reading 'map')"
          frames={state.vendor ? FRAMES : FRAMES.filter((frame) => frame.app)}
        />
      </div>
    ),
    code: () => `<StackTrace name="TypeError" message={error.message} frames={frames} />`,
  },
  api: [
    { name: 'frames', type: 'StackFrame[]', description: '`{ fn, file, line?, column?, app?, source? }`. `app: false` marks a library frame.' },
    { name: 'source', type: '{ line, content }[]', description: 'Excerpt shown when a frame is expanded, with the failing line marked. The first app frame opens by default.' },
    { name: 'raw', type: 'string', description: 'The original text, for the copy button.' },
  ],
  demos: [
    {
      title: 'Exception',
      stack: true,
      code: `<StackTrace name="TypeError" message={message} frames={frames} />`,
      render: () => (
        <div className="w-full">
          <StackTrace
            name="TypeError"
            message="Cannot read properties of undefined (reading 'map')"
            frames={FRAMES}
          />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------- feature flag */

function FeatureFlagDemo({
  environment = 'production',
  rules = true,
}: { environment?: string; rules?: boolean } = {}) {
  const [enabled, setEnabled] = useState(true)
  const [rollout, setRollout] = useState(25)

  return (
    <div className="w-full max-w-lg">
      <FeatureFlag
        name="checkout.new_payment_flow"
        description="Routes checkout through the new payment provider."
        environment={environment}
        enabled={enabled}
        onEnabledChange={setEnabled}
        rollout={rollout}
        onRolloutChange={setRollout}
        rules={
          rules
            ? [
                { id: '1', condition: 'plan = enterprise', label: 'Always on' },
                { id: '2', condition: 'region = eu-west-1', label: 'Excluded', enabled: false },
              ]
            : undefined
        }
      />
    </div>
  )
}

export const featureFlagEntry: ComponentEntry = {
  id: 'feature-flag',
  label: 'Feature Flag',
  description:
    'A flag with its rollout percentage and targeting rules. The kill switch is a separate control from the rollout — during an incident, turning it off must be one action, not a slider drag.',
  usage: `import { FeatureFlag } from '@/components/ui/feature-flag'

<FeatureFlag
  name="checkout.new_payment_flow"
  enabled={enabled}
  onEnabledChange={setEnabled}
  rollout={rollout}
  onRolloutChange={setRollout}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'environment', label: 'environment', options: ['production', 'staging', 'development'], default: 'production' },
      { type: 'boolean', prop: 'rules', label: 'targeting rules', default: true },
    ],
    render: (state: ComposerState) => (
      <FeatureFlagDemo environment={String(state.environment)} rules={Boolean(state.rules)} />
    ),
    code: () => `<FeatureFlag\n  name="checkout.new_payment_flow"\n  enabled={enabled}\n  onEnabledChange={setEnabled}\n  rollout={rollout}\n/>`,
  },
  api: [
    { name: 'enabled / onEnabledChange', type: 'boolean', description: 'The kill switch, deliberately independent of the rollout.' },
    { name: 'rollout / onRolloutChange', type: 'number', description: '0–100. Disabled while the flag is off; the bar is drawn even at 100% so "fully rolled out" and "off" are distinct states.' },
    { name: 'rules', type: 'FlagRule[]', description: '`{ id, condition, label, enabled? }` — targeting shown as data, not editable here.' },
    { name: 'environment', type: 'string', description: 'Badge on the header, since the same flag exists per environment.' },
  ],
  demos: [
    { title: 'Rollout', stack: true, code: `<FeatureFlag name="…" enabled={enabled} rollout={25} />`, render: () => <FeatureFlagDemo /> },
  ],
}

/* ------------------------------------------------------------ cron schedule */

const JOBS: CronJob[] = [
  { id: '1', name: 'Nightly backup', expression: '0 3 * * *', description: 'Snapshot primary to cold storage', nextRun: ahead(60 * 19), lastRun: ago(60 * 5), lastStatus: 'success', lastDuration: 412 },
  { id: '2', name: 'Refresh search index', expression: '*/15 * * * *', nextRun: ahead(9), lastRun: ago(6), lastStatus: 'running' },
  { id: '3', name: 'Expire stale sessions', expression: '0 * * * *', nextRun: ago(24), lastRun: ago(84), lastStatus: 'failed', lastDuration: 3 },
  { id: '4', name: 'Weekly usage email', expression: '0 9 * * 1', lastRun: ago(60 * 24 * 3), lastStatus: 'success', paused: true },
]

export const cronScheduleEntry: ComponentEntry = {
  id: 'cron-schedule',
  label: 'Cron Schedule',
  description:
    'Scheduled jobs: when each next runs and how the last went. An overdue job — next run in the past with nothing running — is called out, since that is the failure a schedule list exists to catch.',
  usage: `import { CronSchedule } from '@/components/ui/cron-schedule'

<CronSchedule jobs={jobs} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'paused', label: 'include paused', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <CronSchedule
          jobs={state.paused ? JOBS : JOBS.filter((job) => !job.paused)}
          now={NOW}
        />
      </div>
    ),
    code: () => `<CronSchedule jobs={jobs} />`,
  },
  api: [
    { name: 'jobs', type: 'CronJob[]', description: '`{ id, name, expression, description?, nextRun?, lastRun?, lastStatus?, lastDuration?, paused? }`.' },
    { name: 'overdue', type: 'derived', description: 'Next run in the past, not paused, nothing running. Invisible if you only render the timestamp.' },
    { name: 'times', type: 'relative', description: '"in 4 hours" and "2 hours ago" are the actual questions; the absolute time is in the title attribute.' },
  ],
  demos: [
    { title: 'Jobs', stack: true, code: `<CronSchedule jobs={jobs} />`, render: () => <div className="w-full max-w-2xl"><CronSchedule jobs={JOBS} now={NOW} /></div> },
  ],
}

/* ------------------------------------------------------------ health checks */

const CHECKS: HealthCheck[] = [
  { id: '1', name: 'API', url: 'https://api.astralyx.dev/health', status: 'healthy', latency: 42, code: 200, history: [38, 41, 39, 44, 42, 40, 42] },
  { id: '2', name: 'Checkout', url: 'https://api.astralyx.dev/checkout/health', status: 'healthy', latency: 1840, latencyThreshold: 800, code: 200, history: [220, 310, 480, 900, 1400, 1700, 1840] },
  { id: '3', name: 'Registry', url: 'https://registry.astralyx.dev/health', status: 'down', code: 503, history: [64, 62, 88, 400, 0, 0, 0] },
  { id: '4', name: 'Docs', url: 'https://astralyx.dev', status: 'healthy', latency: 88, code: 200, history: [92, 84, 88, 90, 86, 88, 88] },
]

export const healthChecksEntry: ComponentEntry = {
  id: 'health-checks',
  label: 'Health Checks',
  description:
    'Endpoint probes with status, latency and history. A 200 that takes four seconds reads as degraded — a probe list that only reports the status code is why slow outages get noticed by customers first.',
  usage: `import { HealthChecks } from '@/components/ui/health-checks'

<HealthChecks checks={checks} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'failing', label: 'include failing', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <HealthChecks
          checks={state.failing ? CHECKS : CHECKS.filter((c) => c.status === 'healthy')}
        />
      </div>
    ),
    code: () => `<HealthChecks checks={checks} />`,
  },
  api: [
    { name: 'checks', type: 'HealthCheck[]', description: '`{ id, name, url?, status, latency?, latencyThreshold?, code?, history?, region? }`.' },
    { name: 'latencyThreshold', type: 'number', description: 'Above it a healthy response is reported as degraded.' },
    { name: 'effectiveStatus', type: '(check) => status', description: 'Exported, so a summary elsewhere agrees with the row.' },
    { name: 'history', type: 'number[]', description: 'Recent latencies as a sparkline — a single number cannot say whether 400ms is normal or the start of something.' },
  ],
  demos: [
    { title: 'Probes', stack: true, code: `<HealthChecks checks={checks} />`, render: () => <div className="w-full"><HealthChecks checks={CHECKS} /></div> },
  ],
}

/* ------------------------------------------------------------ traffic split */

const TARGETS: TrafficTarget[] = [
  { id: 'stable', label: 'Stable', version: 'v1.4.1', weight: 90 },
  { id: 'canary', label: 'Canary', version: 'v1.4.2', weight: 10, canary: true },
]

export const trafficSplitEntry: ComponentEntry = {
  id: 'traffic-split',
  label: 'Traffic Split',
  description:
    'Traffic weights across versions — canary or blue/green. Weights that do not total 100 are called out rather than silently rescaled, because a config adding to 97 is a real state during an edit.',
  usage: `import { TrafficSplit } from '@/components/ui/traffic-split'

<TrafficSplit targets={targets} label="checkout" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'canary', label: 'canary weight', options: ['5', '10', '25', '50'], default: '10' },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <TrafficSplit
          label="checkout"
          targets={[
            { id: 'stable', label: 'Stable', version: 'v1.4.1', weight: 100 - Number(state.canary) },
            { id: 'canary', label: 'Canary', version: 'v1.4.2', weight: Number(state.canary), canary: true },
          ]}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<TrafficSplit\n  label="checkout"\n  targets={[\n    { id: 'stable', label: 'Stable', weight: ${100 - Number(s.canary)} },\n    { id: 'canary', label: 'Canary', weight: ${s.canary}, canary: true },\n  ]}\n/>`,
  },
  api: [
    { name: 'targets', type: 'TrafficTarget[]', description: '`{ id, label, weight, version?, color?, canary? }`.' },
    { name: 'shortfall', type: 'reported', description: 'A total other than 100 is stated above the bar; the segments still render proportionally so the picture stays readable.' },
    { name: 'labels', type: 'inside and legend', description: 'Inside only above 12% width — a 3% canary has no room for text but is exactly the segment you are watching.' },
  ],
  demos: [
    { title: 'Canary', stack: true, code: `<TrafficSplit targets={targets} label="checkout" />`, render: () => <div className="w-full max-w-lg"><TrafficSplit label="checkout" targets={TARGETS} /></div> },
  ],
}
