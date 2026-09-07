import type { CronJob } from '@/components/ui/cron-schedule'
import type { CanvasEdge, CanvasNode } from '@/components/ui/node-canvas'
import type { PipelineStage } from '@/components/ui/pipeline'
import type { StreamEvent } from '@/components/ui/event-stream'

/**
 * Circuit — the fixtures for a workflow builder.
 *
 * One flow is drawn in full, because the canvas is the point: the graph below
 * is what the editor loads, what the copilot edits, and what the run detail is
 * a recording of. Everything else exists to give that flow somewhere to live.
 */

export const NOW = new Date('2026-09-07T09:00:00Z')

const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const ahead = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

/* -------------------------------------------------------------------- flows */

export type Flow = {
  id: string
  name: string
  description: string
  trigger: 'webhook' | 'schedule' | 'event' | 'manual'
  status: 'live' | 'paused' | 'draft'
  version: number
  runs7d: number
  failures7d: number
  /** Median wall clock, in seconds. */
  p50: number
  lastRun: string
}

export const FLOWS: Flow[] = [
  {
    id: 'order-paid',
    name: 'Order paid → fulfilment',
    description: 'Scores the order, writes a fulfilment row, and emails the customer.',
    trigger: 'webhook',
    status: 'live',
    version: 7,
    runs7d: 4_128,
    failures7d: 6,
    p50: 1.8,
    lastRun: '2m ago',
  },
  {
    id: 'refund-review',
    name: 'Refund requested → review',
    description: 'Anything over £200 waits for a human; the rest refunds itself.',
    trigger: 'event',
    status: 'live',
    version: 3,
    runs7d: 214,
    failures7d: 0,
    p50: 3.2,
    lastRun: '18m ago',
  },
  {
    id: 'revenue-digest',
    name: 'Weekly revenue digest',
    description: 'Queries the warehouse on Monday and posts the numbers to #leadership.',
    trigger: 'schedule',
    status: 'live',
    version: 12,
    runs7d: 1,
    failures7d: 0,
    p50: 42,
    lastRun: '2d ago',
  },
  {
    id: 'dunning',
    name: 'Failed payment dunning',
    description: 'Three emails over ten days, then the subscription is cancelled.',
    trigger: 'schedule',
    status: 'paused',
    version: 5,
    runs7d: 0,
    failures7d: 0,
    p50: 5.4,
    lastRun: '6d ago',
  },
  {
    id: 'onboarding',
    name: 'New customer onboarding',
    description: 'Nothing is wired up yet — it has never left the editor.',
    trigger: 'manual',
    status: 'draft',
    version: 1,
    runs7d: 0,
    failures7d: 0,
    p50: 0,
    lastRun: '—',
  },
]

export const SCHEDULES: CronJob[] = [
  {
    id: 'revenue-digest',
    name: 'Weekly revenue digest',
    expression: '0 8 * * 1',
    description: 'Monday, 08:00 UTC',
    lastRun: ago(2 * 24 * 60),
    nextRun: ahead(5 * 24 * 60 + 23 * 60),
    lastStatus: 'success',
    lastDuration: 42,
  },
  {
    id: 'dunning',
    name: 'Failed payment dunning',
    expression: '0 */6 * * *',
    description: 'Every six hours',
    lastRun: ago(6 * 24 * 60),
    lastStatus: 'success',
    lastDuration: 5,
    paused: true,
  },
]

/* --------------------------------------------------------------- the canvas */

/** What a node carries beyond its label: the kind decides how it draws. */
export type StepData = { kind: string; meta?: string }

export const FLOW_NODES: CanvasNode[] = [
  { id: 'in', x: 0, y: 140, type: 'step', label: 'Order paid', data: { kind: 'trigger', meta: 'stripe · charge.succeeded' }, deletable: false },
  { id: 'guard', x: 215, y: 140, type: 'step', label: 'Over £500?', data: { kind: 'branch', meta: 'order.total > 50000' } },
  { id: 'score', x: 430, y: 20, type: 'step', label: 'Score for fraud', data: { kind: 'http', meta: 'POST /fraud/score' } },
  { id: 'review', x: 430, y: 270, type: 'step', label: 'Queue for review', data: { kind: 'queue', meta: 'ops · manual' } },
  { id: 'write', x: 660, y: 140, type: 'step', label: 'Create fulfilment', data: { kind: 'db', meta: 'insert · fulfilment' } },
  { id: 'email', x: 890, y: 140, type: 'step', label: 'Send confirmation', data: { kind: 'email', meta: 'template · order-paid' } },
  { id: 'note', x: 700, y: 290, type: 'note', width: 250, data: 'Six orders were flagged into that queue last week. Nobody is watching it, and nothing tells them.' },
]

export const FLOW_EDGES: CanvasEdge[] = [
  { id: 'e1', from: 'in', to: 'guard' },
  { id: 'e2', from: 'guard', to: 'score', label: 'over' },
  { id: 'e3', from: 'guard', to: 'write', label: 'under' },
  { id: 'e4', from: 'score', to: 'write', label: 'clear' },
  { id: 'e5', from: 'score', to: 'review', label: 'flagged', dashed: true },
  { id: 'e6', from: 'write', to: 'email' },
]

export const PALETTE = [
  { id: 'http', label: 'HTTP request', hint: 'Call an API' },
  { id: 'branch', label: 'Branch', hint: 'Split on a condition' },
  { id: 'delay', label: 'Delay', hint: 'Wait, then continue' },
  { id: 'db', label: 'Database write', hint: 'Insert or update' },
  { id: 'slack', label: 'Slack message', hint: 'Post to a channel' },
  { id: 'note', label: 'Note', hint: 'Explain a decision' },
]

/* --------------------------------------------------------------------- runs */

export type Run = {
  id: string
  flowId: string
  flow: string
  status: 'succeeded' | 'failed' | 'running'
  trigger: string
  started: string
  /** Wall clock, in seconds. */
  duration: number
  steps: number
}

export const RUNS: Run[] = [
  { id: 'r-88214', flowId: 'order-paid', flow: 'Order paid → fulfilment', status: 'failed', trigger: 'AX-2291', started: '2m ago', duration: 31.4, steps: 3 },
  { id: 'r-88213', flowId: 'order-paid', flow: 'Order paid → fulfilment', status: 'succeeded', trigger: 'AX-2290', started: '6m ago', duration: 1.9, steps: 5 },
  { id: 'r-88212', flowId: 'refund-review', flow: 'Refund requested → review', status: 'running', trigger: 'AX-2289', started: '8m ago', duration: 12.0, steps: 2 },
  { id: 'r-88211', flowId: 'order-paid', flow: 'Order paid → fulfilment', status: 'succeeded', trigger: 'AX-2288', started: '14m ago', duration: 1.7, steps: 5 },
  { id: 'r-88210', flowId: 'order-paid', flow: 'Order paid → fulfilment', status: 'succeeded', trigger: 'AX-2287', started: '22m ago', duration: 2.4, steps: 5 },
  { id: 'r-88209', flowId: 'revenue-digest', flow: 'Weekly revenue digest', status: 'succeeded', trigger: 'schedule', started: '2d ago', duration: 41.8, steps: 4 },
]

/** The failed run, stage by stage. Durations are seconds. */
export const RUN_STAGES: PipelineStage[] = [
  {
    id: 'trigger',
    name: 'Trigger',
    jobs: [{ id: 'receive', name: 'Receive webhook', status: 'success', duration: 0.1 }],
  },
  {
    id: 'decide',
    name: 'Decide',
    jobs: [{ id: 'guard', name: 'Over £500? — yes', status: 'success', duration: 0.1 }],
  },
  {
    id: 'enrich',
    name: 'Enrich',
    jobs: [{ id: 'score', name: 'Score for fraud', status: 'failure', duration: 30.0 }],
  },
  {
    id: 'persist',
    name: 'Persist',
    jobs: [{ id: 'write', name: 'Create fulfilment', status: 'skipped' }],
  },
  {
    id: 'notify',
    name: 'Notify',
    jobs: [{ id: 'email', name: 'Send confirmation', status: 'skipped' }],
  },
]

export const RUN_EVENTS: StreamEvent[] = [
  { id: 'v1', name: 'run.started', kind: 'run', at: ago(2), properties: { run: 'r-88214', flow: 'order-paid', version: 7 } },
  { id: 'v2', name: 'step.finished', kind: 'step', at: ago(2), properties: { step: 'in', ms: 96 } },
  { id: 'v3', name: 'step.finished', kind: 'step', at: ago(2), properties: { step: 'guard', branch: 'under', ms: 61 } },
  { id: 'v4', name: 'http.request', kind: 'http', at: ago(2), properties: { method: 'POST', url: '/fraud/score', attempt: 1 } },
  { id: 'v5', name: 'http.timeout', kind: 'error', at: ago(1), properties: { url: '/fraud/score', after: '30s' } },
  { id: 'v6', name: 'step.failed', kind: 'error', at: ago(1), properties: { step: 'score', error: 'ETIMEDOUT' } },
  { id: 'v7', name: 'run.failed', kind: 'run', at: ago(1), properties: { run: 'r-88214', at: 'score', retried: false } },
]

export const RUN_ERROR = `POST https://fraud.internal/score
  order: AX-2291
  attempt: 1 of 1

Error: ETIMEDOUT
    at Socket.onTimeout (net.js:511:12)
    at Object.step (flows/order-paid.yaml:18)

The step has no retry policy, so the run stopped here.
Nothing downstream ran, and nothing was sent.`

/* -------------------------------------------------------------- connections */

export type Connection = {
  id: string
  name: string
  provider: string
  status: 'connected' | 'expiring' | 'error'
  account: string
  scopes: string[]
  lastUsed: string
  flows: number
}

export const CONNECTIONS: Connection[] = [
  { id: 'stripe', name: 'Stripe', provider: 'Payments', status: 'connected', account: 'acct_1Kx…9f2', scopes: ['charges:read', 'refunds:write'], lastUsed: '2m ago', flows: 3 },
  { id: 'postgres', name: 'Production database', provider: 'PostgreSQL 17', status: 'connected', account: 'db-primary · eu-west-1', scopes: ['read', 'write'], lastUsed: '6m ago', flows: 4 },
  { id: 'slack', name: 'Slack', provider: 'Messaging', status: 'connected', account: 'astralyx.slack.com', scopes: ['chat:write', 'channels:read'], lastUsed: '1h ago', flows: 2 },
  { id: 'sendgrid', name: 'SendGrid', provider: 'Email', status: 'expiring', account: 'no-reply@astralyx.dev', scopes: ['mail.send'], lastUsed: '6m ago', flows: 2 },
  { id: 'fraud', name: 'Fraud scoring', provider: 'Internal HTTP', status: 'error', account: 'https://fraud.internal', scopes: ['score:write'], lastUsed: '2m ago', flows: 1 },
]

/* ---------------------------------------------------------------- templates */

export type Template = {
  id: string
  name: string
  description: string
  trigger: Flow['trigger']
  steps: number
  uses: string[]
}

export const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank flow', description: 'A trigger and nothing else. Build it yourself.', trigger: 'manual', steps: 1, uses: [] },
  { id: 'webhook-db', name: 'Webhook → database', description: 'Take a payload, validate it, write a row, acknowledge.', trigger: 'webhook', steps: 4, uses: ['PostgreSQL'] },
  { id: 'digest', name: 'Scheduled digest', description: 'Query on a cron, format the result, post it to a channel.', trigger: 'schedule', steps: 3, uses: ['PostgreSQL', 'Slack'] },
  { id: 'escalate', name: 'Escalation ladder', description: 'Try, wait, try again, then page a human who can fix it.', trigger: 'event', steps: 6, uses: ['Slack'] },
]

/* ------------------------------------------------------------------ copilot */

/**
 * The change the copilot proposes, as a patch against the flow's source.
 *
 * A diff rather than a sentence describing one: the flow has a file behind it,
 * and an agent that edits the graph is editing that file whether or not it says
 * so. Accepting applies both new steps to the canvas.
 */
export const PROPOSED_PATCH = `@@ -16,6 +16,18 @@ steps:
   - id: score
     type: http
     method: POST
     url: /fraud/score
     timeout: 30s
+    on_error: retry_score
+
+  - id: retry_score
+    type: retry
+    attempts: 3
+    backoff: exponential
+    base: 500ms
+
+  - id: alert_ops
+    type: slack
+    channel: "#ops-alerts"
+    text: "Fraud scoring is down — run {{ run.id }}"
`

export const SUGGESTIONS = [
  'Why did r-88214 fail?',
  'Make the fraud call survive a timeout',
  'Alert #ops when a run fails',
  'What does this flow cost to run?',
]
