import { CostBreakdown, type CostRow } from '@/components/ui/cost-breakdown'
import { EvalResults, type EvalBenchmark } from '@/components/ui/eval-results'
import { OnCallSchedule, type Shift } from '@/components/ui/on-call-schedule'
import { PromptTemplate } from '@/components/ui/prompt-template'
import { RetrievalResults, type RetrievedChunk } from '@/components/ui/retrieval-results'
import { TopologyMap, type TopologyNode } from '@/components/ui/topology-map'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')

/* ------------------------------------------------------- retrieval results */

const CHUNKS: RetrievedChunk[] = [
  { id: '1', score: 0.94, source: 'tailwind-v4-release.md', page: 2, content: 'Configuration now lives in CSS. The @theme directive replaces tailwind.config.js for token definitions, and utilities are generated from the tokens you declare.', metadata: { section: 'Configuration', updated: '2026-03-14' } },
  { id: '2', score: 0.81, source: 'migrating-from-v3.md', page: 5, content: 'Move your theme keys into an @theme block. Anything that was under theme.extend becomes a custom property.', metadata: { section: 'Migration' } },
  { id: '3', score: 0.62, source: 'css-custom-properties.md', content: 'Custom properties are scoped to the element they are declared on and inherit through the tree.' },
  { id: '4', score: 0.31, source: 'postcss-plugins.md', content: 'PostCSS plugins run before Tailwind processes the file.' },
]

export const retrievalResultsEntry: ComponentEntry = {
  id: 'retrieval-results',
  label: 'Retrieval Results',
  description:
    'The chunks a retrieval step pulled, with relevance. Near-misses are dimmed rather than dropped — when an answer is wrong, "what did it nearly retrieve" is the useful question.',
  usage: `import { RetrievalResults } from '@/components/ui/retrieval-results'

<RetrievalResults chunks={chunks} query={question} threshold={0.5} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'threshold', label: 'threshold', options: ['0.3', '0.5', '0.7', '0.9'], default: '0.5' },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <RetrievalResults
          chunks={CHUNKS}
          query="how does tailwind v4 handle config"
          threshold={Number(state.threshold)}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<RetrievalResults\n  chunks={chunks}\n  query={question}\n  threshold={${s.threshold}}\n/>`,
  },
  api: [
    { name: 'chunks', type: 'RetrievedChunk[]', description: '`{ id, score, content, source, page?, metadata? }` with score 0–1.' },
    { name: 'threshold', type: 'number', default: '0.5', description: 'Below it a chunk is dimmed, never hidden.' },
    { name: 'scores', type: 'banded', description: 'Rendered through ConfidenceMeter rather than as a number — a cosine similarity of 0.82 is not a calibrated probability.' },
  ],
  demos: [
    { title: 'Chunks', stack: true, code: `<RetrievalResults chunks={chunks} query={question} />`, render: () => <div className="w-full max-w-xl"><RetrievalResults chunks={CHUNKS} query="how does tailwind v4 handle config" /></div> },
  ],
}

/* -------------------------------------------------------- prompt template */

const TEMPLATE = `You are reviewing a pull request for {{repo}}.

Focus on {{focus}}. Keep the review under {{limit}} comments, and
skip anything that a linter would already catch.

Diff:
{{diff}}`

export const promptTemplateEntry: ComponentEntry = {
  id: 'prompt-template',
  label: 'Prompt Template',
  description:
    'A prompt with {{variable}} placeholders and a form to fill them. Variables are parsed out of the template rather than declared separately, so the two cannot drift.',
  usage: `import { PromptTemplate } from '@/components/ui/prompt-template'

<PromptTemplate template={template} values={values} onValuesChange={setValues} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'showPreview', label: 'showPreview', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <PromptTemplate
          template={TEMPLATE}
          title="PR review"
          showPreview={Boolean(state.showPreview)}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<PromptTemplate\n  template={template}\n  values={values}\n  onValuesChange={setValues}\n  showPreview={${Boolean(s.showPreview)}}\n/>`,
  },
  api: [
    { name: 'template', type: 'string', description: 'Placeholders are `{{name}}`. Repeats of one name share a single input.' },
    { name: 'values / onValuesChange', type: 'Record<string, string>', description: 'Controlled or uncontrolled.' },
    { name: 'extractVariables', type: '(template) => string[]', description: 'Exported, for validating a template before it is saved.' },
    { name: 'preview', type: 'literal gaps', description: 'Unfilled placeholders stay visible and highlighted — a prompt that quietly sends "Summarise  in  words" is worse than one that shows what is missing.' },
  ],
  demos: [
    { title: 'Fill the blanks', stack: true, code: `<PromptTemplate template={template} title="PR review" />`, render: () => <div className="w-full max-w-xl"><PromptTemplate template={TEMPLATE} title="PR review" /></div> },
  ],
}

/* ------------------------------------------------------------ eval results */

const MODELS = ['astralyx-large', 'astralyx-small', 'baseline']

const BENCHMARKS: EvalBenchmark[] = [
  { id: 'reason', label: 'Reasoning', scores: { 'astralyx-large': { value: 0.91, delta: 3 }, 'astralyx-small': { value: 0.74, delta: 6 }, baseline: { value: 0.68 } } },
  { id: 'code', label: 'Code generation', scores: { 'astralyx-large': { value: 0.88, delta: -1 }, 'astralyx-small': { value: 0.79, delta: 4 }, baseline: { value: 0.71 } } },
  { id: 'retrieval', label: 'Retrieval accuracy', scores: { 'astralyx-large': { value: 0.83 }, 'astralyx-small': { value: 0.85, delta: 2 }, baseline: {} } },
  { id: 'latency', label: 'Latency', lowerIsBetter: true, scores: { 'astralyx-large': { value: 0.42, delta: 5 }, 'astralyx-small': { value: 0.12, delta: -3 }, baseline: { value: 0.28 } } },
]

export const evalResultsEntry: ComponentEntry = {
  id: 'eval-results',
  label: 'Eval Results',
  description:
    'A model-versus-benchmark score matrix. The best result is marked per benchmark rather than overall — a model can lead on reasoning and trail on latency, and one winner badge hides that.',
  usage: `import { EvalResults } from '@/components/ui/eval-results'

<EvalResults models={models} benchmarks={benchmarks} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'models', label: 'models', default: 3, min: 1, max: 4, step: 1 },
      { type: 'number', prop: 'benchmarks', label: 'benchmarks', default: 5, min: 1, max: 6, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <EvalResults
          models={MODELS.slice(0, Number(state.models))}
          benchmarks={BENCHMARKS.slice(0, Number(state.benchmarks))}
        />
      </div>
    ),
    code: () => `<EvalResults models={models} benchmarks={benchmarks} />`,
  },
  api: [
    { name: 'models', type: 'string[]', description: 'Column order.' },
    { name: 'benchmarks', type: 'EvalBenchmark[]', description: '`{ id, label, lowerIsBetter?, scores }` where scores maps a model to `{ value?, delta? }`.' },
    { name: 'lowerIsBetter', type: 'boolean', description: 'Flips which end wins and which direction of delta is good — latency and cost need it.' },
    { name: 'missing scores', type: 'explicit dash', description: 'A blank cell reads as zero, which is a different claim from "not run".' },
  ],
  demos: [
    { title: 'Matrix', stack: true, code: `<EvalResults models={models} benchmarks={benchmarks} />`, render: () => <div className="w-full"><EvalResults models={MODELS} benchmarks={BENCHMARKS} /></div> },
  ],
}

/* --------------------------------------------------------- cost breakdown */

const COSTS: CostRow[] = [
  { id: 'large', label: 'astralyx-large', cost: 184.2, inputTokens: 12_400_000, outputTokens: 2_100_000, calls: 18_400 },
  { id: 'small', label: 'astralyx-small', cost: 21.6, inputTokens: 88_200_000, outputTokens: 9_600_000, calls: 214_000 },
  { id: 'embed', label: 'astralyx-embed', cost: 4.1, inputTokens: 41_000_000, calls: 96_200 },
]

export const costBreakdownEntry: ComponentEntry = {
  id: 'cost-breakdown',
  label: 'Cost Breakdown',
  description:
    'Spend by model, with token volume beside it. The two routinely disagree — the cheap model handling 90% of calls is often 10% of the bill — and either number alone leads to the wrong optimisation.',
  usage: `import { CostBreakdown } from '@/components/ui/cost-breakdown'

<CostBreakdown rows={rows} period="August" budget={250} />`,
  composer: {
    tall: true,
    controls: [{ type: 'text', prop: 'budget', label: 'budget', default: '250' }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <CostBreakdown rows={COSTS} period="August 2026" budget={Number(state.budget) || undefined} />
      </div>
    ),
    code: (s: ComposerState) =>
      `<CostBreakdown rows={rows} period="August 2026" budget={${s.budget}} />`,
  },
  api: [
    { name: 'rows', type: 'CostRow[]', description: '`{ id, label, cost, inputTokens?, outputTokens?, calls?, color? }`. Input and output are kept apart because they are priced differently.' },
    { name: 'budget', type: 'number', description: 'Adds a budget line and flags an overage.' },
    { name: 'precision', type: 'by magnitude', description: 'Under a unit gets four decimals, larger amounts two. A per-call cost rounded to cents is all zeroes; an aggregate carried to four is noise, and the widest string the column has to hold.' },
    { name: 'column width', type: 'min-w, not w', description: 'The currency prefix is locale-dependent — en-GB renders USD as "US$", three characters wider than en-US — so the amount column grows rather than clipping.' },
  ],
  demos: [
    { title: 'Spend', stack: true, code: `<CostBreakdown rows={rows} period="August 2026" budget={250} />`, render: () => <div className="w-full max-w-xl"><CostBreakdown rows={COSTS} period="August 2026" budget={250} /></div> },
  ],
}

/* ------------------------------------------------------------ topology map */

const TOPOLOGY: TopologyNode[] = [
  { id: 'cdn', label: 'CDN', status: 'healthy' },
  { id: 'gateway', label: 'Gateway', status: 'healthy', dependsOn: ['cdn'] },
  { id: 'checkout', label: 'Checkout', status: 'degraded', dependsOn: ['gateway'], meta: 'p99 latency 1.8s' },
  { id: 'catalog', label: 'Catalog', status: 'healthy', dependsOn: ['gateway'] },
  { id: 'payments', label: 'Payments', status: 'down', dependsOn: ['checkout'], meta: 'Upstream provider 503' },
  { id: 'db', label: 'Postgres', status: 'healthy', dependsOn: ['checkout', 'catalog'] },
]

export const topologyMapEntry: ComponentEntry = {
  id: 'topology-map',
  label: 'Topology Map',
  description:
    'A service dependency graph with health. Laid out in dependency layers, not by a force simulation — during an incident nobody wants to re-find the database because the layout moved.',
  usage: `import { TopologyMap } from '@/components/ui/topology-map'

<TopologyMap nodes={nodes} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'healthyLabel', label: 'healthyLabel', default: 'All services healthy' },
      { type: 'number', prop: 'nodes', label: 'nodes', default: 7, min: 2, max: 9, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <TopologyMap
          nodes={TOPOLOGY.slice(0, Number(state.nodes))}
          healthyLabel={String(state.healthyLabel)}
        />
      </div>
    ),
    code: () => `<TopologyMap nodes={nodes} />`,
  },
  api: [
    { name: 'nodes', type: 'TopologyNode[]', description: '`{ id, label, status, dependsOn?, meta? }`.' },
    { name: 'layout', type: 'dependency depth', description: 'Deterministic: the same architecture renders in the same place every time, so the picture is worth learning.' },
    { name: 'cycles', type: 'handled', description: 'Depth is computed with a visited set — service graphs have cycles, and a naive recursion over one hangs the tab.' },
    { name: 'edges', type: 'downstream health', description: 'An edge takes the colour of the node it points at, so you follow the red to the cause.' },
  ],
  demos: [
    { title: 'Services', stack: true, code: `<TopologyMap nodes={nodes} />`, render: () => <div className="w-full"><TopologyMap nodes={TOPOLOGY} /></div> },
  ],
}

/* -------------------------------------------------------- on-call schedule */

const WINDOW_START = new Date('2026-08-31T09:00:00')
const WINDOW_END = new Date('2026-09-07T09:00:00')

const SHIFTS: Shift[] = [
  { id: '1', person: 'Ada Lovelace', layer: 'Primary', start: new Date('2026-08-31T09:00:00'), end: new Date('2026-09-03T09:00:00') },
  { id: '2', person: 'Grace Hopper', layer: 'Primary', start: new Date('2026-09-03T09:00:00'), end: new Date('2026-09-07T09:00:00') },
  { id: '3', person: 'Alan Turing', layer: 'Secondary', start: new Date('2026-08-31T09:00:00'), end: new Date('2026-09-04T09:00:00') },
  { id: '4', person: 'Katherine Johnson', layer: 'Secondary', start: new Date('2026-09-04T09:00:00'), end: new Date('2026-09-07T09:00:00') },
]

export const onCallScheduleEntry: ComponentEntry = {
  id: 'on-call-schedule',
  label: 'On-call Schedule',
  description:
    'A rotation across a window of days. Shifts are positioned proportionally rather than snapped to a day grid — rotations hand over at 09:00, and rounding shows the wrong person on call for most of two days.',
  usage: `import { OnCallSchedule } from '@/components/ui/on-call-schedule'

<OnCallSchedule shifts={shifts} start={weekStart} end={weekEnd} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'title', label: 'title', default: 'On call now' },
      { type: 'text', prop: 'nobodyLabel', label: 'nobodyLabel', default: 'Nobody' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <OnCallSchedule
          shifts={SHIFTS}
          start={WINDOW_START}
          end={WINDOW_END}
          now={NOW}
          title={String(state.title)}
          nobodyLabel={String(state.nobodyLabel)}
        />
      </div>
    ),
    code: () => `<OnCallSchedule shifts={shifts} start={weekStart} end={weekEnd} />`,
  },
  api: [
    { name: 'shifts', type: 'Shift[]', description: '`{ id, person, start, end, layer?, color? }`. Layers become rows.' },
    { name: 'start / end', type: 'Date', description: 'The window. Shifts are clipped to it rather than overflowing.' },
    { name: 'now', type: 'Date', description: 'Draws the current-time marker and drives the "on call now" line.' },
    { name: 'on call now', type: 'stated in words', description: 'The only question this is ever opened to answer — reading it off a bar chart during an incident is a poor trade.' },
  ],
  demos: [
    { title: 'Rotation', stack: true, code: `<OnCallSchedule shifts={shifts} start={weekStart} end={weekEnd} />`, render: () => <div className="w-full"><OnCallSchedule shifts={SHIFTS} start={WINDOW_START} end={WINDOW_END} now={NOW} /></div> },
  ],
}
