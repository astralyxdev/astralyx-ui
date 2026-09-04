import { useState } from 'react'
import { AbTestResults } from '@/components/ui/ab-test-results'
import { Attribution, type Journey } from '@/components/ui/attribution'
import { EventStream, type StreamEvent } from '@/components/ui/event-stream'
import { RetentionCurve } from '@/components/ui/retention-curve'
import { SegmentBuilder, type ConditionGroup, type FieldSpec } from '@/components/ui/segment-builder'
import type { ComponentEntry } from './types'

/* ------------------------------------------------------------- A/B test */

const EXPERIMENT = [
  { id: 'control', name: 'Control — current copy', visitors: 18_420, conversions: 1_105, control: true },
  { id: 'b', name: 'B — shorter headline', visitors: 18_390, conversions: 1_241 },
  { id: 'c', name: 'C — pricing above fold', visitors: 18_505, conversions: 1_138 },
]

export const abTestResultsEntry: ComponentEntry = {
  id: 'ab-test-results',
  label: 'A/B Test Results',
  isNew: true,
  description:
    'Variants with lift, a confidence interval and a two-proportion z-test — plus the peeking warning, because stopping at the first significant reading is the failure that actually happens.',
  usage: `import { AbTestResults } from '@/components/ui/ab-test-results'

<AbTestResults variants={variants} targetSample={20000} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'alpha', label: 'alpha', default: '0.05', options: ['0.1', '0.05', '0.01'] },
      { type: 'number', prop: 'targetSample', label: 'targetSample', default: 20000, min: 0, max: 40000, step: 5000 },
    ],
    render: (state) => (
      <AbTestResults
        className="w-full"
        variants={EXPERIMENT}
        title="Landing page headline"
        alpha={Number(state.alpha) || 0.05}
        targetSample={Number(state.targetSample) || undefined}
      />
    ),
    code: (state) =>
      `<AbTestResults\n  variants={variants}\n  alpha={${state.alpha}}\n  targetSample={${Number(state.targetSample) || 0}}\n/>`,
  },
  api: [
    { name: 'variants', type: 'Variant[]', description: '{ id, name, visitors, conversions, control? }. Exactly one should be the baseline.' },
    { name: 'the interval', type: 'shown, not hidden', description: '"+12% lift" is not a result. "+12%, 95% CI [−3%, +27%]" is, and it says the opposite. Printing the point estimate alone manufactures certainty people ship on.' },
    { name: 'the maths', type: 'two-proportion z', description: 'Pooled standard error for the p-value, unpooled for the interval — the standard pair, and why the interval can straddle zero while p sits just under 0.05.' },
    { name: 'the CI scale', type: 'relative, like the lift', description: 'The z-test gives an interval for the absolute difference in rates. Printed beside a relative lift it gets read as bounding that lift, which it does not — so it is divided by the control rate (the first-order delta-method interval), and the two columns are in the same units.' },
    { name: 'thin data', type: 'no verdict', description: 'The normal approximation needs roughly ten conversions and ten non-conversions per arm. Below that it says "too few" rather than computing on data too thin to carry it.' },
    { name: 'targetSample', type: 'number', description: 'Enables the peeking warning. A fixed-horizon test read continuously is wrong far more often than its nominal alpha.' },
    { name: 'what it cannot tell you', type: 'stated', description: 'Whether the metric is the one that matters, whether assignment was random, and whether the effect is worth the change.' },
  ],
  demos: [
    {
      title: 'Three variants, one significant',
      stack: true,
      code: `<AbTestResults variants={variants} title="Landing page headline" targetSample={20000} />`,
      render: () => (
        <AbTestResults className="w-full" variants={EXPERIMENT} title="Landing page headline" targetSample={20_000} />
      ),
    },
  ],
}

/* ------------------------------------------------------------ retention */

const COHORTS = [
  { name: 'Jan', size: 4_210, values: [1, 0.52, 0.41, 0.36, 0.33, 0.32, 0.31, 0.31] },
  { name: 'Feb', size: 5_040, values: [1, 0.55, 0.44, 0.39, 0.36, 0.35, 0.34] },
  { name: 'Mar', size: 6_180, values: [1, 0.58, 0.47, 0.42, 0.4, 0.39] },
  { name: 'Apr', size: 7_320, values: [1, 0.61, 0.5, 0.46, 0.44] },
  { name: 'May', size: 8_050, values: [1, 0.63, 0.53, 0.49] },
]

export const retentionCurveEntry: ComponentEntry = {
  id: 'retention-curve',
  label: 'Retention Curve',
  isNew: true,
  description:
    'What fraction of each cohort is still here, period by period — normalised so growth cannot hide churn. Later cohorts are drawn shorter, not padded with zeroes.',
  usage: `import { RetentionCurve } from '@/components/ui/retention-curve'

<RetentionCurve cohorts={cohorts} periodLabel={(n) => \`Week \${n}\`} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'showFlatten', label: 'showFlatten', default: true },
      { type: 'boolean', prop: 'legend', label: 'legend', default: true },
    ],
    render: (state) => (
      <RetentionCurve
        className="w-full"
        cohorts={COHORTS}
        showFlatten={Boolean(state.showFlatten)}
        legend={Boolean(state.legend)}
        periodLabel={(index) => `M${index}`}
      />
    ),
    code: (state) =>
      `<RetentionCurve\n  cohorts={cohorts}\n  showFlatten={${Boolean(state.showFlatten)}}\n  periodLabel={(n) => \`M\${n}\`}\n/>`,
  },
  api: [
    { name: 'cohorts', type: 'Cohort[]', description: '{ name, size?, values }. Values are fractions of the cohort’s own starting size, so period 0 is always 1.' },
    { name: 'why not active users', type: 'growth hides churn', description: 'Total actives rises while retention collapses, as long as acquisition outruns churn — which is what a business looks like just before it stops working.' },
    { name: 'flattening', type: 'the real signal', description: 'A curve decaying to a horizontal asymptote means a stable core formed; one still falling at the right edge means there is no floor yet. That shape, not the day-1 number.' },
    { name: 'short cohorts', type: 'drawn short', description: 'Padding unobserved periods with zeroes reads as catastrophic churn. It is the most common way this chart lies.' },
    { name: 'flattenThreshold', type: 'number', default: '0.02', description: 'Period-over-period drop below which the curve counts as flat.' },
  ],
  demos: [
    {
      title: 'Five monthly cohorts',
      stack: true,
      code: `<RetentionCurve cohorts={cohorts} periodLabel={(n) => \`M\${n}\`} />`,
      render: () => (
        <RetentionCurve className="w-full" cohorts={COHORTS} periodLabel={(index) => `M${index}`} />
      ),
    },
  ],
}

/* --------------------------------------------------------- event stream */

const BASE = new Date('2026-04-06T14:32:11')
const tick = (ms: number) => new Date(BASE.getTime() + ms)

const EVENTS: StreamEvent[] = [
  { id: 'e1', name: 'checkout.completed', at: tick(9_400), kind: 'conversion', user: 'u_8812', properties: { plan: 'team', amount: 4900, currency: 'USD', coupon: null } },
  { id: 'e2', name: 'checkout.started', at: tick(8_100), kind: 'default', user: 'u_8812', properties: { plan: 'team', seats: 6 } },
  { id: 'e3', name: 'pricing.viewed', at: tick(7_050), kind: 'page', user: 'u_8812', properties: { referrer: '/docs/installation' } },
  { id: 'e4', name: 'api.error', at: tick(6_400), kind: 'error', user: 'u_4410', properties: { status: 429, route: '/v1/generate', retryAfter: 12 } },
  { id: 'e5', name: 'docs.searched', at: tick(5_900), kind: 'default', user: 'u_4410', properties: { query: 'qr code', results: 3 } },
  { id: 'e6', name: 'signup.completed', at: tick(4_200), kind: 'conversion', user: 'u_9903', properties: { source: 'organic', plan: 'free' } },
  { id: 'e7', name: 'page.viewed', at: tick(3_100), kind: 'page', user: 'u_9903', properties: { path: '/components/qr-code' } },
  { id: 'e8', name: 'cli.add', at: tick(1_800), kind: 'default', user: 'u_2277', properties: { component: 'sankey', version: '0.3.1' } },
  { id: 'e9', name: 'page.viewed', at: tick(600), kind: 'page', user: 'u_2277', properties: { path: '/' } },
]

export const eventStreamEntry: ComponentEntry = {
  id: 'event-stream',
  label: 'Event Stream',
  isNew: true,
  description:
    'A live tail of analytics events with their payloads — the tool for debugging the tracking itself. Autoscroll pauses when you scroll away and the list is capped rather than unbounded.',
  usage: `import { EventStream } from '@/components/ui/event-stream'

<EventStream events={events} limit={500} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'filterable', label: 'filterable', default: true },
      { type: 'number', prop: 'height', label: 'height', default: 280, min: 160, max: 480, step: 40 },
    ],
    render: (state) => (
      <EventStream
        className="w-full"
        events={EVENTS}
        filterable={Boolean(state.filterable)}
        height={Number(state.height) || 280}
      />
    ),
    code: (state) =>
      `<EventStream\n  events={events}\n  filterable={${Boolean(state.filterable)}}\n  height={${Number(state.height) || 280}}\n/>`,
  },
  api: [
    { name: 'events', type: 'StreamEvent[]', description: '{ id, name, at, properties?, kind?, user? }. Newest first.' },
    { name: 'what it is for', type: 'the tracking', description: 'Funnels show what was recorded; this shows what is arriving, with its payload — the only way to answer "did that click fire the event, and was it right" without a network panel.' },
    { name: 'autoscroll', type: 'scroll is the intent', description: 'A stream that yanks you to the newest row makes reading any event impossible. It follows only while you are already at the top.' },
    { name: 'limit', type: 'number', default: '500', description: 'An unbounded live list is a memory leak with a UI. Dropped rows are counted, not silently forgotten.' },
    { name: 'aria-live', type: 'off, deliberately', description: 'Announcing every arriving event makes a screen reader unusable. The count is announced politely instead.' },
  ],
  demos: [
    { title: 'A tail, with payloads', stack: true, code: `<EventStream events={events} />`, render: () => <EventStream className="w-full" events={EVENTS} height={280} /> },
  ],
}

/* ------------------------------------------------------ segment builder */

const FIELDS: FieldSpec[] = [
  { key: 'plan', label: 'Plan', type: 'enum', options: [
    { value: 'free', label: 'Free' },
    { value: 'team', label: 'Team' },
    { value: 'enterprise', label: 'Enterprise' },
  ] },
  { key: 'country', label: 'Country', type: 'string' },
  { key: 'seats', label: 'Seats', type: 'number' },
  { key: 'signed_up', label: 'Signed up', type: 'date' },
  { key: 'trial', label: 'In trial', type: 'boolean' },
]

const SEGMENT: ConditionGroup = {
  id: 'root',
  join: 'and',
  conditions: [
    { id: 'c1', field: 'plan', operator: 'eq', value: 'team' },
    { id: 'c2', field: 'seats', operator: 'gte', value: '5' },
    {
      id: 'g1',
      join: 'or',
      conditions: [
        { id: 'c3', field: 'country', operator: 'eq', value: 'DE' },
        { id: 'c4', field: 'country', operator: 'eq', value: 'FR' },
      ],
    },
  ],
}

function SegmentDemo() {
  const [group, setGroup] = useState<ConditionGroup>(SEGMENT)
  const count = JSON.stringify(group).length * 7
  return (
    <SegmentBuilder
      className="w-full"
      fields={FIELDS}
      value={group}
      onChange={setGroup}
      estimate={`≈ ${count.toLocaleString()} people`}
    />
  )
}

export const segmentBuilderEntry: ComponentEntry = {
  id: 'segment-builder',
  label: 'Segment Builder',
  isNew: true,
  description:
    'Build an audience from conditions, with precedence shown as nesting rather than implied by a word — and the output a structure, not a concatenated string.',
  usage: `import { SegmentBuilder } from '@/components/ui/segment-builder'

<SegmentBuilder fields={fields} value={segment} onChange={setSegment} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'maxDepth', label: 'maxDepth', default: 2, min: 1, max: 3, step: 1 },
    ],
    render: () => <SegmentDemo />,
    code: (state) =>
      `<SegmentBuilder\n  fields={fields}\n  value={segment}\n  onChange={setSegment}\n  maxDepth={${Number(state.maxDepth) || 2}}\n/>`,
  },
  api: [
    { name: 'value', type: 'ConditionGroup', description: 'Nested groups of conditions, each with one join. Not a string — so it compiles to SQL or an API filter with values still separated from operators, which is what keeps it parameterisable rather than concatenated.' },
    { name: 'precedence', type: 'one join per group', description: '"A or B and C" means two different audiences depending on how it binds. The join is set once at the head of a group and echoed read-only between its rows, so the box you see is the parse tree — a dropdown on every line is what makes a flat builder ambiguous.' },
    { name: 'nesting', type: 'tinted, not just indented', description: 'The boundary of a group carries the precedence, so it is drawn as a filled box that deepens with depth rather than a margin you have to measure by eye.' },
    { name: 'incomplete rows', type: 'marked, not dropped', description: 'A condition with no value is a half-written thought. Treating it as absent means the segment quietly matches more people than the author believes — expensive for a marketing send.' },
    { name: 'fields', type: 'FieldSpec[]', description: '{ key, label, type?, options? }. The type picks the operator list and the value control.' },
    { name: 'estimate', type: 'ReactNode', description: 'Supplied by the caller — only your backend knows how many people match.' },
  ],
  demos: [
    { title: 'Team plans in DE or FR', stack: true, code: `<SegmentBuilder fields={fields} value={segment} onChange={setSegment} />`, render: () => <SegmentDemo /> },
  ],
}

/* ---------------------------------------------------------- attribution */

const JOURNEYS: Journey[] = Array.from({ length: 40 }, (_, index) => {
  const paths = [
    ['Organic search', 'Email', 'Direct'],
    ['Paid search', 'Direct'],
    ['Social', 'Organic search', 'Email', 'Direct'],
    ['Referral', 'Paid search', 'Direct'],
    ['Email', 'Direct'],
    ['Organic search', 'Direct'],
  ]
  const path = paths[index % paths.length]
  const base = new Date('2026-03-01T09:00:00').getTime()
  return {
    id: `j${index}`,
    value: 100 + (index % 7) * 45,
    touchpoints: path.map((channel, step) => ({
      channel,
      at: new Date(base + index * 86_400_000 + step * 36_000_000),
    })),
  }
})

export const attributionEntry: ComponentEntry = {
  id: 'attribution',
  label: 'Attribution',
  isNew: true,
  description:
    'Credit for a conversion split across touchpoints, with the model as a control rather than a buried setting — because the disagreement between models is the whole finding.',
  usage: `import { Attribution } from '@/components/ui/attribution'

<Attribution journeys={journeys} defaultModel="last" />`,
  composer: {
    tall: true,
    controls: [
      {
        type: 'select',
        prop: 'model',
        label: 'model',
        default: 'last',
        options: ['first', 'last', 'linear', 'decay', 'position'],
      },
      { type: 'number', prop: 'halfLife', label: 'halfLife (days)', default: 7, min: 1, max: 30, step: 1 },
    ],
    render: (state) => (
      <Attribution
        className="w-full"
        journeys={JOURNEYS}
        model={state.model as 'first' | 'last' | 'linear' | 'decay' | 'position'}
        halfLife={Number(state.halfLife) || 7}
        valueFormat={(value) => `$${value.toFixed(0)}`}
      />
    ),
    code: (state) =>
      `<Attribution\n  journeys={journeys}\n  model="${state.model}"\n  halfLife={${Number(state.halfLife) || 7}}\n/>`,
  },
  api: [
    { name: 'journeys', type: 'Journey[]', description: '{ id, touchpoints: [{ channel, at }], value? }. Raw paths — the models are computed here.' },
    { name: 'the model is a control', type: 'not a setting', description: 'Last-touch says paid search won; first-touch says the blog did; linear says everyone helped. Same journeys — the disagreement is entirely in the rule, and a number without its model is a claim dressed as a measurement.' },
    { name: 'five models', type: 'first, last, linear, decay, position', description: 'Time decay uses a configurable half-life; position based is 40/20/40 across first, middle and last.' },
    { name: 'not causal', type: 'stated plainly', description: 'Every model divides credit among touchpoints that were present. None establishes cause, and none can see the channels that never got a click — that is incrementality testing.' },
    { name: 'what it does show', type: 'sensitivity', description: 'A channel whose share collapses when you change the rule was never really driving conversions.' },
  ],
  demos: [
    {
      title: 'Switch the model, watch the winner change',
      stack: true,
      code: `<Attribution journeys={journeys} defaultModel="last" />`,
      render: () => (
        <Attribution className="w-full" journeys={JOURNEYS} valueFormat={(value) => `$${value.toFixed(0)}`} />
      ),
    },
  ],
}
