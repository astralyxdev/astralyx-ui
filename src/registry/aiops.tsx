import { AlertTriage, type Alert } from '@/components/ui/alert-triage'
import { AnomalyChart, type AnomalyPoint } from '@/components/ui/anomaly-chart'
import { RootCauseTree, type CauseNode } from '@/components/ui/root-cause-tree'
import { RunbookSteps, type RunbookStep } from '@/components/ui/runbook-steps'
import { SloBudget } from '@/components/ui/slo-budget'
import { Terminal } from '@/components/ui/terminal'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

/* ----------------------------------------------------------- anomaly chart */

const LATENCY = [120, 128, 118, 132, 140, 410, 168, 142, 138, 129, 380, 134]
const POINTS: AnomalyPoint[] = LATENCY.map((value, index) => ({
  value,
  expected: [100 + (index % 3) * 4, 190 + (index % 4) * 6],
}))
const HOURS = ['00', '04', '08', '12', '16', '20']

export const anomalyChartEntry: ComponentEntry = {
  id: 'anomaly-chart',
  label: 'Anomaly Chart',
  description:
    'A metric against its expected range, with outliers marked. The band is the point — 400ms at 03:00 may be an incident while 400ms at peak is Tuesday.',
  usage: `import { AnomalyChart } from '@/components/ui/anomaly-chart'

<AnomalyChart points={points} labels={hours} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'band', label: 'expected band', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <AnomalyChart
          points={state.band ? POINTS : POINTS.map(({ value }) => ({ value }))}
          labels={HOURS}
        />
      </div>
    ),
    code: () => `<AnomalyChart points={points} labels={hours} />`,
  },
  api: [
    { name: 'points', type: 'AnomalyPoint[]', description: '`{ value, expected?, label? }` where expected is a `[low, high]` pair for that moment.' },
    { name: 'detection', type: 'caller-owned', description: 'The component marks what falls outside the range you give it. It never invents a threshold of its own.' },
    { name: 'color / bandColor / anomalyColor', type: 'string', description: 'Any CSS colour.' },
    { name: 'rendering', type: 'two layers', description: 'The plot is stretched to fit its container; anomaly dots are drawn in a second, unstretched layer, since a circle inside that stretch would render as an ellipse.' },
  ],
  demos: [
    { title: 'Latency with band', stack: true, code: `<AnomalyChart points={points} labels={hours} />`, render: () => <div className="w-full max-w-xl"><AnomalyChart points={POINTS} labels={HOURS} /></div> },
  ],
}

/* ------------------------------------------------------------ alert triage */

const ALERTS: Alert[] = [
  {
    id: 'a1',
    fingerprint: 'checkout-5xx',
    title: 'checkout service returning 5xx',
    severity: 'critical',
    source: 'prometheus',
    count: 214,
    firstSeen: ago(96),
    lastSeen: ago(1),
    detail: <Terminal copyable={false} content={'rate(http_requests_total{status=~"5..",job="checkout"}[5m]) > 0.05'} />,
  },
  { id: 'a2', fingerprint: 'db-conn', title: 'database connection pool saturated', severity: 'critical', source: 'prometheus', count: 12, lastSeen: ago(6) },
  { id: 'a3', fingerprint: 'disk', title: 'disk usage above 85% on runner-04', severity: 'warning', source: 'node-exporter', lastSeen: ago(34), acknowledged: true },
  { id: 'a4', fingerprint: 'cert', title: 'TLS certificate expires in 14 days', severity: 'info', source: 'blackbox', lastSeen: ago(180) },
]

export const alertTriageEntry: ComponentEntry = {
  id: 'alert-triage',
  label: 'Alert Triage',
  description:
    'An alert queue grouped by fingerprint. A flapping check fires two hundred times, and an ungrouped list buries every other alert underneath it — which is how real pages get missed.',
  usage: `import { AlertTriage } from '@/components/ui/alert-triage'

<AlertTriage alerts={alerts} onAcknowledge={ack} onSilence={silence} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'acknowledge', label: 'acknowledge action', default: true },
      { type: 'boolean', prop: 'silence', label: 'silence action', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <AlertTriage
          alerts={ALERTS}
          now={NOW}
          onAcknowledge={state.acknowledge ? () => {} : undefined}
          onSilence={state.silence ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<AlertTriage alerts={alerts} onAcknowledge={ack} onSilence={silence} />`,
  },
  api: [
    { name: 'alerts', type: 'Alert[]', description: '`{ id, title, severity, fingerprint?, count?, source?, firstSeen?, lastSeen?, acknowledged?, detail? }`.' },
    { name: 'fingerprint', type: 'string', description: 'Alerts sharing one collapse into a single row with an occurrence count. Falls back to the id.' },
    { name: 'onAcknowledge / onSilence', type: '(ids: string[]) => void', description: 'Report the ids of every member of the selected groups. Nothing is hidden optimistically — that would show two responders different pictures of one incident.' },
    { name: 'ordering', type: 'severity', description: 'Critical first. Order within a group is the caller’s; only the roll-up is computed.' },
  ],
  demos: [
    { title: 'Queue', stack: true, code: `<AlertTriage alerts={alerts} onAcknowledge={ack} onSilence={silence} />`, render: () => <div className="w-full"><AlertTriage alerts={ALERTS} now={NOW} onAcknowledge={() => {}} onSilence={() => {}} /></div> },
  ],
}

/* --------------------------------------------------------- root cause tree */

const CAUSES: CauseNode[] = [
  {
    id: 'symptom',
    label: 'Checkout error rate 4.2%',
    confidence: 1,
    children: [
      {
        id: 'payments',
        label: 'Payment provider timeouts',
        confidence: 0.86,
        children: [
          { id: 'upstream', label: 'Provider status page reports degradation', confidence: 0.92 },
          { id: 'retry', label: 'Retry budget exhausted after 3 attempts', confidence: 0.64 },
        ],
      },
      {
        id: 'db',
        label: 'Connection pool saturation',
        confidence: 0.41,
        children: [{ id: 'slow', label: 'Slow query on orders.list', confidence: 0.38 }],
      },
      { id: 'deploy', label: 'Recent deploy 4f2a1c9', confidence: 0.12 },
    ],
  },
]

export const rootCauseTreeEntry: ComponentEntry = {
  id: 'root-cause-tree',
  label: 'Root Cause Tree',
  description:
    'A causal chain from symptom to candidate causes, each with a confidence band. Built on Tree, so it inherits the keyboard model rather than growing a second one.',
  usage: `import { RootCauseTree } from '@/components/ui/root-cause-tree'

<RootCauseTree causes={causes} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'expanded', label: 'start expanded', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <RootCauseTree
          causes={CAUSES}
          defaultExpanded={state.expanded ? ['symptom', 'payments'] : []}
        />
      </div>
    ),
    code: () => `<RootCauseTree causes={causes} />`,
  },
  api: [
    { name: 'causes', type: 'CauseNode[]', description: '`{ id, label, confidence?, detail?, children? }`, recursive.' },
    { name: 'confidence', type: 'number', description: '0 to 1, rendered as a band rather than a percentage — these come out of a correlation engine and are not calibrated probabilities.' },
    { name: 'defaultExpanded', type: 'string[]', description: 'Defaults to the top level.' },
    { name: 'keyboard', type: 'inherited from Tree', description: 'Arrow keys over visible rows, one tab stop for the whole tree.' },
  ],
  demos: [
    { title: 'Analysis', stack: true, code: `<RootCauseTree causes={causes} />`, render: () => <div className="w-full max-w-lg"><RootCauseTree causes={CAUSES} defaultExpanded={['symptom', 'payments']} /></div> },
  ],
}

/* ---------------------------------------------------------- runbook steps */

const RUNBOOK: RunbookStep[] = [
  { id: '1', title: 'Confirm the alert', description: 'Check the provider status page and current error rate.', status: 'done' },
  { id: '2', title: 'Scale checkout replicas to 12', description: 'Absorb the retry load while the provider recovers.', status: 'done', output: <Terminal copyable={false} content={'deployment.apps/checkout scaled'} /> },
  { id: '3', title: 'Drain and restart the connection pool', description: 'Clears sockets stuck in CLOSE_WAIT.', status: 'pending', confirm: true },
  { id: '4', title: 'Re-enable the payment retry budget', status: 'pending' },
]

export const runbookStepsEntry: ComponentEntry = {
  id: 'runbook-steps',
  label: 'Runbook Steps',
  description:
    'Remediation steps, run one at a time and only in order. Offering "run" on step four while step two is untried invites exactly the mistake the runbook exists to prevent.',
  usage: `import { RunbookSteps } from '@/components/ui/runbook-steps'

<RunbookSteps steps={steps} onRun={run} onSkip={skip} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'run', label: 'run action', default: true },
      { type: 'boolean', prop: 'skip', label: 'skip action', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <RunbookSteps
          steps={RUNBOOK}
          onRun={state.run ? () => {} : undefined}
          onSkip={state.skip ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<RunbookSteps steps={steps} onRun={run} onSkip={skip} />`,
  },
  api: [
    { name: 'steps', type: 'RunbookStep[]', description: '`{ id, title, description?, status, confirm?, output? }`.' },
    { name: 'onRun / onSkip', type: '(id: string) => void', description: 'Only the next unresolved step offers them, and nothing offers them while another step is running.' },
    { name: 'confirm', type: 'boolean', description: 'Per-step, because the step that restarts a database sits right beside the one that reads a log. Swaps the actions for an inline confirmation.' },
    { name: 'output', type: 'ReactNode', description: 'Result of a run — a Terminal, usually.' },
  ],
  demos: [
    { title: 'Runbook', stack: true, code: `<RunbookSteps steps={steps} onRun={run} onSkip={skip} />`, render: () => <div className="w-full max-w-xl"><RunbookSteps steps={RUNBOOK} title="Checkout 5xx remediation" onRun={() => {}} onSkip={() => {}} /></div> },
  ],
}

/* ---------------------------------------------------------------- slo budget */

export const sloBudgetEntry: ComponentEntry = {
  id: 'slo-budget',
  label: 'SLO Budget',
  description:
    'An error budget and how fast it is burning. Shows the budget remaining rather than availability achieved — 99.4% against a 99.9% target sounds like a near miss and is a six-times overspend.',
  usage: `import { SloBudget } from '@/components/ui/slo-budget'

<SloBudget target={0.999} actual={0.9994} burnRate={0.6} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'actual', label: 'actual', options: ['0.9999', '0.9994', '0.9986', '0.994'], default: '0.9994' },
      { type: 'text', prop: 'burnRate', label: 'burnRate', default: '0.6' },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <SloBudget
          target={0.999}
          actual={Number(state.actual)}
          burnRate={Number(state.burnRate)}
          label="Checkout availability"
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<SloBudget\n  target={0.999}\n  actual={${s.actual}}\n  burnRate={${s.burnRate}}\n/>`,
  },
  api: [
    { name: 'target / actual', type: 'number', description: 'Ratios, not percentages — 0.999 and 0.9994.' },
    { name: 'burnRate', type: 'number', description: 'Multiple of the sustainable pace. "2.4×" answers "will we make it"; a raw percentage does not.' },
    { name: 'window', type: 'string', default: "'30 days'", description: 'The period the budget covers, for the caption.' },
    { name: 'thresholds', type: 'automatic', description: 'Green, amber past three quarters spent, red once exhausted.' },
  ],
  demos: [
    {
      title: 'Healthy and exhausted',
      stack: true,
      code: `<SloBudget target={0.999} actual={0.9994} burnRate={0.6} />
<SloBudget target={0.999} actual={0.994} burnRate={6.2} />`,
      render: () => (
        <div className="flex w-full max-w-md flex-col gap-6">
          <SloBudget target={0.999} actual={0.9994} burnRate={0.6} label="Checkout availability" />
          <SloBudget target={0.999} actual={0.994} burnRate={6.2} label="Payments availability" />
        </div>
      ),
    },
  ],
}
