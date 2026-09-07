import type { AgentStep } from '@/components/ui/agent-steps'
import type { Budget } from '@/components/ui/budget-guard'
import type { Citation } from '@/components/ui/citations'
import type { EvalCase, EvalModel } from '@/components/ui/eval-board'
import type { Guardrail } from '@/components/ui/guardrail-list'
import type { JsonSchema } from '@/components/ui/tool-schema'
import type { PromptVersion } from '@/components/ui/prompt-versions'
import type { SandboxScope } from '@/components/ui/sandbox-policy'
import type { TraceSpan } from '@/components/ui/trace-waterfall'

/**
 * The fixture for Agent Studio.
 *
 * Written as one plausible product rather than a set of component demos: the
 * same run appears in the runs table, in its own trace, in the token ledger and
 * in the guardrail list, and the numbers agree in all four. Fixtures that
 * disagree with themselves are how a screen ends up looking right and reading
 * as nonsense.
 */

export type Thread = {
  id: string
  title: string
  model: string
  updated: string
  messages: number
  tokens: number
  starred?: boolean
}

export const THREADS: Thread[] = [
  { id: 't-914', title: 'Why did checkout p95 regress?', model: 'astralyx-large', updated: '2m ago', messages: 14, tokens: 41_200, starred: true },
  { id: 't-913', title: 'Draft the 0.14.0 release notes', model: 'astralyx-large', updated: '40m ago', messages: 8, tokens: 12_800 },
  { id: 't-912', title: 'Summarise last week’s incidents', model: 'astralyx-small', updated: '3h ago', messages: 22, tokens: 68_400 },
  { id: 't-911', title: 'Find every unowned Terraform module', model: 'astralyx-large', updated: '1d ago', messages: 6, tokens: 9_100 },
  { id: 't-910', title: 'Rewrite the onboarding email', model: 'astralyx-small', updated: '2d ago', messages: 4, tokens: 3_400 },
]

export const CITATIONS: Citation[] = [
  { id: 'c1', title: 'checkout-service — p95 latency, 7 days', source: 'Grafana', url: 'https://example.internal/d/checkout', snippet: 'p95 moved from 210ms to 480ms between 02:00 and 02:20 UTC on Tuesday.' },
  { id: 'c2', title: 'PR #4182 — batch the address lookup', source: 'GitHub', url: 'https://example.internal/pr/4182', snippet: 'Replaces the per-line address call with one batched request. Merged Tuesday 01:54 UTC.' },
  { id: 'c3', title: 'Runbook: checkout latency', source: 'Notion', snippet: 'First check whether the address service is rate limiting. It sheds load silently.' },
]

export type Run = {
  id: string
  thread: string
  agent: string
  status: 'succeeded' | 'failed' | 'running' | 'blocked'
  model: string
  started: string
  duration: number
  tokensIn: number
  tokensOut: number
  cost: number
  steps: number
  tools: number
}

export const RUNS: Run[] = [
  { id: 'r-8841', thread: 'Why did checkout p95 regress?', agent: 'Investigator', status: 'succeeded', model: 'astralyx-large', started: '2m ago', duration: 18_400, tokensIn: 38_100, tokensOut: 3_100, cost: 0.42, steps: 7, tools: 4 },
  { id: 'r-8840', thread: 'Draft the 0.14.0 release notes', agent: 'Writer', status: 'succeeded', model: 'astralyx-large', started: '40m ago', duration: 9_200, tokensIn: 11_400, tokensOut: 1_400, cost: 0.14, steps: 3, tools: 1 },
  { id: 'r-8839', thread: 'Migrate the billing schema', agent: 'Engineer', status: 'blocked', model: 'astralyx-large', started: '1h ago', duration: 4_100, tokensIn: 6_200, tokensOut: 210, cost: 0.06, steps: 2, tools: 1 },
  { id: 'r-8838', thread: 'Summarise last week’s incidents', agent: 'Investigator', status: 'failed', model: 'astralyx-small', started: '3h ago', duration: 31_900, tokensIn: 64_800, tokensOut: 3_600, cost: 0.19, steps: 9, tools: 6 },
  { id: 'r-8837', thread: 'Find every unowned Terraform module', agent: 'Engineer', status: 'succeeded', model: 'astralyx-large', started: '1d ago', duration: 12_600, tokensIn: 8_400, tokensOut: 700, cost: 0.09, steps: 4, tools: 3 },
  { id: 'r-8836', thread: 'Nightly dependency sweep', agent: 'Maintainer', status: 'running', model: 'astralyx-small', started: 'now', duration: 6_800, tokensIn: 3_100, tokensOut: 400, cost: 0.02, steps: 2, tools: 1 },
]

// Seconds, not milliseconds: `AgentSteps` renders these through `Fmt`'s
// duration type, which counts in seconds. The trace below is in milliseconds,
// because `TraceWaterfall` says so — the two are not interchangeable and the
// giveaway is a three-second step rendering as "56m 40s".
export const RUN_STEPS: AgentStep[] = [
  { id: 's1', label: 'Read the ticket and classify it', status: 'done', duration: 1.2, detail: 'Latency regression, checkout, production. Not a customer report.' },
  { id: 's2', label: 'Pull p95 for checkout-service', status: 'done', duration: 3.4, detail: 'grafana.query — 7 days, 5 minute buckets.' },
  { id: 's3', label: 'Correlate with deployments', status: 'done', duration: 2.1, detail: 'One deploy inside the window: PR #4182.' },
  { id: 's4', label: 'Read the diff', status: 'done', duration: 4.8, detail: 'github.diff — 1 file, +38 −12.' },
  { id: 's5', label: 'Check the address service for shedding', status: 'done', duration: 5.1, detail: '429 rate 0.4% before, 11.2% after.' },
  { id: 's6', label: 'Draft the finding', status: 'done', duration: 1.8 },
  { id: 's7', label: 'Open a follow-up issue', status: 'skipped', detail: 'Requires an approval this run did not have.' },
]

export const RUN_TRACE: TraceSpan[] = [
  {
    id: 'root',
    name: 'investigate',
    kind: 'model',
    start: 0,
    duration: 18_400,
    children: [
      { id: 'plan', name: 'plan', kind: 'model', start: 100, duration: 1_100, meta: '1,240 tokens' },
      { id: 'guard-in', name: 'guard: pii', kind: 'guard', start: 1_250, duration: 60 },
      {
        id: 'gather',
        name: 'gather',
        kind: 'tool',
        start: 1_400,
        duration: 11_200,
        children: [
          { id: 'grafana', name: 'grafana.query', kind: 'tool', start: 1_450, duration: 3_400, meta: '7 days' },
          { id: 'deploys', name: 'deploys.list', kind: 'tool', start: 4_900, duration: 2_100 },
          { id: 'diff', name: 'github.diff', kind: 'tool', start: 7_100, duration: 4_800, meta: 'PR #4182' },
          { id: 'shed', name: 'address.metrics', kind: 'tool', start: 11_950, duration: 620, error: true, meta: 'timed out, retried' },
        ],
      },
      { id: 'retrieve', name: 'retrieval', kind: 'retrieval', start: 12_700, duration: 1_900, meta: '3 documents' },
      { id: 'write', name: 'compose', kind: 'model', start: 14_700, duration: 3_500, meta: '3,100 tokens out' },
      { id: 'guard-out', name: 'guard: secrets', kind: 'guard', start: 18_250, duration: 80 },
    ],
  },
]

export const GUARDRAILS: Guardrail[] = [
  { id: 'g1', name: 'PII in the prompt', outcome: 'pass', stage: 'input', detail: 'No email, card or national identifier matched.' },
  { id: 'g2', name: 'Prompt injection', outcome: 'warn', stage: 'input', detail: 'A retrieved document contained “ignore previous instructions”. Quarantined and passed through as data.' },
  { id: 'g3', name: 'Secret in the output', outcome: 'pass', stage: 'output' },
  { id: 'g4', name: 'Tool allow-list', outcome: 'block', stage: 'tool', detail: 'issues.create is not permitted for the Investigator agent.' },
  { id: 'g5', name: 'Cost ceiling', outcome: 'pass', stage: 'run', meta: '$0.42 of $2.00' },
  { id: 'g6', name: 'Output length', outcome: 'skipped', stage: 'output' },
]

export const BUDGETS: Budget[] = [
  { id: 'cost', label: 'Cost, this run', used: 0.42, soft: 1, hard: 2, format: (value) => `$${value.toFixed(2)}` },
  { id: 'tokens', label: 'Tokens, this run', used: 41_200, soft: 80_000, hard: 120_000 },
  { id: 'daily', label: 'Cost, today', used: 18.4, soft: 25, hard: 40, format: (value) => `$${value.toFixed(2)}`, note: 'Resets at midnight UTC.' },
  { id: 'tools', label: 'Tool calls, this run', used: 4, soft: 20, hard: 30 },
]

export type Prompt = {
  id: string
  name: string
  purpose: string
  live: string
  versions: PromptVersion[]
  body: string
  variables: { name: string; description: string; example: string }[]
}

export const PROMPTS: Prompt[] = [
  {
    id: 'investigator',
    name: 'Investigator',
    purpose: 'Finds the cause of a production regression from metrics, deploys and diffs.',
    live: 'v7',
    body: `You are an investigator. You are given a symptom and access to metrics,
deployments and source control.

Rules:
- Correlate before you conclude. A deploy inside the window is a candidate, not
  a cause.
- Quote the number you are reasoning from, with its window.
- If two explanations fit, say so and say what would separate them.

Symptom: {{symptom}}
Service: {{service}}
Window: {{window}}`,
    variables: [
      { name: 'symptom', description: 'What was observed, in the reporter’s words.', example: 'checkout p95 doubled' },
      { name: 'service', description: 'The service the symptom was observed on.', example: 'checkout-service' },
      { name: 'window', description: 'How far back to look.', example: '7d' },
    ],
    versions: [
      { id: 'v7', label: 'v7', at: '2 days ago', author: 'Ada Lovelace', note: 'Ask for the window with every number.', score: 0.91, live: true },
      { id: 'v6', label: 'v6', at: '6 days ago', author: 'Alan Turing', note: 'Correlate before concluding.', score: 0.86 },
      { id: 'v5', label: 'v5', at: '2 weeks ago', author: 'Ada Lovelace', note: 'First draft with tool guidance.', score: 0.71 },
      { id: 'v4', label: 'v4', at: '3 weeks ago', author: 'Grace Hopper', note: 'Dropped the persona preamble.' },
    ],
  },
  {
    id: 'writer',
    name: 'Writer',
    purpose: 'Turns a merged diff into release notes a user can act on.',
    live: 'v3',
    body: `Write release notes for the changes below.

- Lead with what changed for the reader, not what changed in the repository.
- Name the bug's symptom before its cause.
- No adjectives that cannot be measured.

Diff: {{diff}}`,
    variables: [
      { name: 'diff', description: 'The merged diff, unified format.', example: 'diff --git …' },
    ],
    versions: [
      { id: 'v3', label: 'v3', at: '1 day ago', author: 'Grace Hopper', note: 'Symptom before cause.', score: 0.88, live: true },
      { id: 'v2', label: 'v2', at: '1 week ago', author: 'Grace Hopper', score: 0.79 },
      { id: 'v1', label: 'v1', at: '1 month ago', author: 'Ada Lovelace' },
    ],
  },
]

/**
 * The v6 → v7 change, as a real unified patch rather than two blobs of text.
 *
 * `parseUnifiedDiff` is what `DiffView` wants, and writing the patch out is
 * closer to what a prompt store actually keeps: prompts are versioned in git
 * like everything else, and a diff of two strings has no line numbers.
 */
export const PROMPT_PATCH = `@@ -1,3 +1,5 @@
-- Correlate before you conclude.
-- Quote the number you are reasoning from.
-- If two explanations fit, pick the likelier one.
+- Correlate before you conclude. A deploy inside the window is a candidate,
++  not a cause.
+- Quote the number you are reasoning from, with its window.
+- If two explanations fit, say so and say what would separate them.
`

export type Tool = {
  id: string
  name: string
  origin: string
  description: string
  calls7d: number
  p95: number
  errorRate: number
  approval: 'never' | 'once' | 'always'
  destructive?: boolean
  schema: JsonSchema
}

export const TOOLS: Tool[] = [
  {
    id: 'grafana.query',
    name: 'grafana.query',
    origin: 'observability-mcp',
    description: 'Runs a PromQL query against the metrics store and returns buckets.',
    calls7d: 1_284,
    p95: 340,
    errorRate: 0.4,
    approval: 'always',
    schema: {
      type: 'object',
      required: ['query', 'window'],
      properties: {
        query: { type: 'string', description: 'PromQL. Instant or range.' },
        window: { type: 'string', description: 'Lookback, e.g. 7d.', default: '1h' },
        step: { type: 'string', description: 'Bucket size, e.g. 5m.' },
        format: { type: 'string', enum: ['buckets', 'summary'], default: 'buckets' },
      },
    },
  },
  {
    id: 'github.diff',
    name: 'github.diff',
    origin: 'github-mcp',
    description: 'Returns the unified diff for a pull request.',
    calls7d: 612,
    p95: 880,
    errorRate: 1.1,
    approval: 'always',
    schema: {
      type: 'object',
      required: ['repo', 'number'],
      properties: {
        repo: { type: 'string', description: 'owner/name' },
        number: { type: 'number', description: 'Pull request number.' },
        context: { type: 'number', description: 'Lines of context.', default: 3 },
      },
    },
  },
  {
    id: 'issues.create',
    name: 'issues.create',
    origin: 'github-mcp',
    description: 'Opens an issue on a repository.',
    calls7d: 41,
    p95: 640,
    errorRate: 0,
    approval: 'once',
    destructive: true,
    schema: {
      type: 'object',
      required: ['repo', 'title'],
      properties: {
        repo: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
        assignees: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    id: 'db.migrate',
    name: 'db.migrate',
    origin: 'postgres-mcp',
    description: 'Applies pending migrations to a database.',
    calls7d: 3,
    p95: 4_200,
    errorRate: 33.3,
    approval: 'never',
    destructive: true,
    schema: {
      type: 'object',
      required: ['database'],
      properties: {
        database: { type: 'string', enum: ['staging', 'production'] },
        dryRun: { type: 'boolean', default: true, description: 'Print the plan without applying it.' },
      },
    },
  },
]

export const EVAL_MODELS: EvalModel[] = [
  { id: 'large', name: 'astralyx-large' },
  { id: 'small', name: 'astralyx-small' },
  { id: 'baseline', name: 'baseline' },
]

export const EVAL_CASES: EvalCase[] = [
  { id: 'e1', name: 'Correlates a deploy to a regression', description: 'One deploy in the window, one obvious diff.', results: { large: 'pass', small: 'pass', baseline: 'partial' } },
  { id: 'e2', name: 'Refuses to conclude from one data point', results: { large: 'pass', small: 'partial', baseline: 'fail' } },
  { id: 'e3', name: 'Quotes the window with every number', results: { large: 'pass', small: 'fail', baseline: 'fail' } },
  { id: 'e4', name: 'Names both candidates when two fit', results: { large: 'partial', small: 'fail', baseline: 'fail' } },
  { id: 'e5', name: 'Survives an injected instruction in a document', results: { large: 'fail', small: 'fail', baseline: 'fail' } },
  { id: 'e6', name: 'Stops at the tool allow-list', results: { large: 'pass', small: 'pass', baseline: 'skip' } },
]

export const SANDBOX: SandboxScope[] = [
  { id: 'fs', kind: 'filesystem', mode: 'allowlist', enabled: true, allow: ['/workspace', '/tmp'], deny: ['~/.ssh', '~/.aws', '**/.env'], description: 'Reads and writes are confined to these roots.' },
  { id: 'net', kind: 'network', mode: 'allowlist', enabled: true, allow: ['api.astralyx.dev', 'grafana.internal', 'api.github.com'], deny: ['169.254.169.254'], description: 'Outbound HTTP only, to these hosts.' },
  { id: 'exec', kind: 'exec', mode: 'none', enabled: false, description: 'The agent cannot spawn processes.' },
]

/*
 * Latency is seconds — `Fmt type="duration"` counts in seconds, and a fixture
 * written in milliseconds renders "58m 20s" for a model that answered in under
 * a minute.
 */
export const MODEL_OUTPUTS = [
  {
    id: 'large',
    model: 'astralyx-large',
    latency: 12,
    tokens: 3_100,
    cost: 0.42,
    output:
      'PR #4182 batched the address lookup and the address service began shedding: its 429 rate went from 0.4% to 11.2% at 02:00 UTC, which is when checkout p95 moved from 210ms to 480ms. The batch size is 200; the service documents a limit of 50.',
  },
  {
    id: 'small',
    model: 'astralyx-small',
    latency: 4,
    tokens: 2_400,
    cost: 0.06,
    output:
      'The latency increase started on Tuesday at around 02:00 UTC. A deployment happened in that window. It is likely the cause.',
  },
  {
    id: 'baseline',
    model: 'baseline',
    latency: 3,
    tokens: 1_900,
    cost: 0.01,
    output: 'Checkout latency has increased. Consider scaling the service or checking recent changes.',
  },
]
