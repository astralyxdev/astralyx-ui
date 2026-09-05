import { useMemo, useState } from 'react'
import {
  Beaker, Filter, GitBranch, LayoutDashboard, Radio, Search, Share2,
  Sparkles, Users,
} from 'lucide-react'
import { AbTestResults } from '@/components/ui/ab-test-results'
import { Attribution, type AttributionModel, type Journey } from '@/components/ui/attribution'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart, type ChartSeries } from '@/components/ui/chart'
import { CohortTable } from '@/components/ui/cohort-table'
import { DateRangeCompare } from '@/components/ui/date-range-compare'
import { EventStream, type StreamEvent } from '@/components/ui/event-stream'
import { Funnel } from '@/components/ui/funnel'
import { HeatmapGrid } from '@/components/ui/heatmap-grid'
import { Input } from '@/components/ui/input'
import { RetentionCurve } from '@/components/ui/retention-curve'
import { Sankey } from '@/components/ui/sankey'
import { ScatterPlot } from '@/components/ui/scatter-plot'
import { SegmentBuilder, type Condition, type ConditionGroup, type FieldSpec } from '@/components/ui/segment-builder'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Separator } from '@/components/ui/separator'
import { Sparkline } from '@/components/ui/sparkline'
import { Stat } from '@/components/ui/stat'
import { Treemap } from '@/components/ui/treemap'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { dataFills } from '@/lib/styles'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
  { id: 'funnels', label: 'Funnels', icon: <Filter /> },
  { id: 'cohorts', label: 'Cohorts', icon: <Users /> },
  { id: 'experiments', label: 'Experiments', icon: <Beaker />, count: 4 },
  { id: 'segments', label: 'Segments', icon: <Sparkles /> },
  { id: 'attribution', label: 'Attribution', icon: <Share2 /> },
  { id: 'live', label: 'Live events', icon: <Radio /> },
]

type RangeKey = '7d' | '30d' | '90d'
type MetricKey = 'signups' | 'activation' | 'arr'

type RangeData = {
  label: string
  labels: string[]
  series: ChartSeries[]
  metrics: { key: MetricKey; label: string; value: number; previous: number; history: number[] }[]
}

/**
 * Every window carries its own labels, series and comparison numbers rather
 * than one dataset being resampled on the fly: switching the range should read
 * as a different question, not the same chart with fewer points.
 */
const RANGES: Record<RangeKey, RangeData> = {
  '7d': {
    label: 'Last 7 days',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [
      { name: 'Signups', values: [412, 486, 501, 559, 604, 318, 262], color: dataFills[0] },
      { name: 'Activated', values: [198, 231, 242, 281, 312, 152, 121], color: dataFills[1] },
      { name: 'Paid', values: [34, 41, 39, 52, 58, 21, 17], color: dataFills[2] },
    ],
    metrics: [
      { key: 'signups', label: 'Signups', value: 3142, previous: 2874, history: [412, 486, 501, 559, 604, 318, 262] },
      { key: 'activation', label: 'Activation rate', value: 0.494, previous: 0.471, history: [0.48, 0.475, 0.483, 0.503, 0.517, 0.478, 0.462] },
      { key: 'arr', label: 'New ARR', value: 84200, previous: 71800, history: [9400, 11200, 10600, 14300, 16100, 5900, 4700] },
    ],
  },
  '30d': {
    label: 'Last 30 days',
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    series: [
      { name: 'Signups', values: [2410, 2688, 2951, 3142], color: dataFills[0] },
      { name: 'Activated', values: [1104, 1281, 1420, 1537], color: dataFills[1] },
      { name: 'Paid', values: [188, 214, 238, 262], color: dataFills[2] },
    ],
    metrics: [
      { key: 'signups', label: 'Signups', value: 11191, previous: 9840, history: [2410, 2688, 2951, 3142] },
      { key: 'activation', label: 'Activation rate', value: 0.478, previous: 0.462, history: [0.458, 0.477, 0.481, 0.489] },
      { key: 'arr', label: 'New ARR', value: 302400, previous: 268100, history: [64800, 72100, 78900, 86600] },
    ],
  },
  '90d': {
    label: 'Last quarter',
    labels: ['Jan', 'Feb', 'Mar'],
    series: [
      { name: 'Signups', values: [8940, 10120, 11191], color: dataFills[0] },
      { name: 'Activated', values: [3921, 4602, 5342], color: dataFills[1] },
      { name: 'Paid', values: [604, 741, 902], color: dataFills[2] },
    ],
    metrics: [
      { key: 'signups', label: 'Signups', value: 30251, previous: 26410, history: [8940, 10120, 11191] },
      { key: 'activation', label: 'Activation rate', value: 0.471, previous: 0.449, history: [0.438, 0.455, 0.478] },
      { key: 'arr', label: 'New ARR', value: 812600, previous: 690300, history: [214000, 261700, 336900] },
    ],
  },
}

/** Every metric needs its own formatter and its own idea of which way is good. */
const METRIC_FORMAT: Record<MetricKey, { format: 'number' | 'currency' | 'percent'; goodDirection: 'up' | 'down' }> = {
  signups: { format: 'number', goodDirection: 'up' },
  activation: { format: 'percent', goodDirection: 'up' },
  arr: { format: 'currency', goodDirection: 'up' },
}

const SEGMENT_FIELDS: FieldSpec[] = [
  {
    key: 'plan',
    label: 'Plan',
    type: 'enum',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
      { value: 'team', label: 'Team' },
      { value: 'enterprise', label: 'Enterprise' },
    ],
  },
  {
    key: 'source',
    label: 'Acquisition source',
    type: 'enum',
    options: [
      { value: 'organic', label: 'Organic search' },
      { value: 'docs', label: 'Docs referral' },
      { value: 'npm', label: 'npm listing' },
      { value: 'sponsorship', label: 'Newsletter sponsorship' },
      { value: 'conference', label: 'Conference booth' },
    ],
  },
  { key: 'country', label: 'Country', type: 'string' },
  { key: 'sessions_30d', label: 'Sessions (30d)', type: 'number' },
  { key: 'components_used', label: 'Components imported', type: 'number' },
  { key: 'first_seen', label: 'First seen', type: 'date' },
  { key: 'has_ci_token', label: 'Has CI token', type: 'boolean' },
]

const INITIAL_SEGMENT: ConditionGroup = {
  // Fixed ids, not generated ones: this tree is rendered on the server and the
  // keys have to survive the trip to the client unchanged.
  id: 'root',
  join: 'and',
  conditions: [
    { id: 'c-plan', field: 'plan', operator: 'in', value: '', values: ['pro', 'team'] },
    { id: 'c-sessions', field: 'sessions_30d', operator: 'gte', value: '8' },
    {
      id: 'g-source',
      join: 'or',
      conditions: [
        { id: 'c-docs', field: 'source', operator: 'eq', value: 'docs' },
        { id: 'c-npm', field: 'source', operator: 'eq', value: 'npm' },
      ],
    },
  ],
}

/** The whole addressable base the segment narrows down from. */
const AUDIENCE_BASE = 128_540

/**
 * How much of the base each field typically keeps. A real product asks the
 * warehouse; this is a stand-in that at least behaves like one — narrowing a
 * segment always shrinks the count, and an `or` branch always widens it.
 */
const SELECTIVITY: Record<string, number> = {
  plan: 0.31,
  source: 0.22,
  country: 0.14,
  sessions_30d: 0.46,
  components_used: 0.52,
  first_seen: 0.63,
  has_ci_token: 0.27,
}

const isGroup = (node: Condition | ConditionGroup): node is ConditionGroup => 'conditions' in node

/**
 * `and` multiplies the branches, `or` unions them under an independence
 * assumption. A condition with no value yet keeps everyone: the builder marks
 * it incomplete rather than dropping it, so the estimate should agree.
 */
function fractionOf(node: Condition | ConditionGroup): number {
  if (isGroup(node)) {
    const parts = node.conditions.map(fractionOf)
    if (parts.length === 0) return 1
    return node.join === 'and'
      ? parts.reduce((a, b) => a * b, 1)
      : 1 - parts.reduce((a, b) => a * (1 - b), 1)
  }

  const filled = node.value.trim().length > 0 || (node.values?.length ?? 0) > 0
  const unary = node.operator === 'set' || node.operator === 'unset'
    || node.operator === 'true' || node.operator === 'false'
  if (!filled && !unary) return 1

  const base = SELECTIVITY[node.field] ?? 0.5
  // "is one of" with three values is wider than "is" with one.
  return Math.min(1, base * Math.max(1, node.values?.length ?? 1) * (unary ? 1.4 : 1))
}

/** Stage-to-stage counts for the whole base; the segment scales them down. */
const FUNNEL_BASE = [
  { label: 'Visited astralyx.dev', value: 128540, hint: 'page_view' },
  { label: 'Opened a component page', value: 71204, hint: 'component_viewed' },
  { label: 'Copied an install command', value: 34918, hint: 'install_copied' },
  { label: 'Ran the CLI', value: 18442, hint: 'cli_init' },
  { label: 'Imported 3+ components', value: 9106, hint: 'activated' },
  { label: 'Upgraded to a paid plan', value: 1842, hint: 'subscription_created' },
]

const COHORTS = [
  { label: 'Jan wk 1', size: 2140, values: [1, 0.62, 0.48, 0.41, 0.37, 0.35, 0.34, 0.33] },
  { label: 'Jan wk 2', size: 2318, values: [1, 0.64, 0.51, 0.44, 0.4, 0.38, 0.36, null] },
  { label: 'Jan wk 3', size: 2402, values: [1, 0.66, 0.53, 0.46, 0.42, 0.4, null, null] },
  { label: 'Jan wk 4', size: 2611, values: [1, 0.69, 0.57, 0.5, 0.46, null, null, null] },
  { label: 'Feb wk 1', size: 2744, values: [1, 0.71, 0.59, 0.52, null, null, null, null] },
  { label: 'Feb wk 2', size: 2890, values: [1, 0.73, 0.61, null, null, null, null, null] },
  { label: 'Feb wk 3', size: 3012, values: [1, 0.74, null, null, null, null, null, null] },
  { label: 'Feb wk 4', size: 3142, values: [1, null, null, null, null, null, null, null] },
]

/** Retention split by how people arrived, which is the comparison that pays. */
const RETENTION_COHORTS = [
  { name: 'Docs referral', size: 4820, values: [1, 0.78, 0.69, 0.64, 0.61, 0.6, 0.59, 0.59], color: dataFills[0] },
  { name: 'npm listing', size: 6104, values: [1, 0.66, 0.54, 0.47, 0.43, 0.41, 0.4, 0.4], color: dataFills[1] },
  { name: 'Conference booth', size: 1240, values: [1, 0.59, 0.41, 0.32, 0.27, 0.25, 0.24, 0.23], color: dataFills[2] },
  { name: 'Newsletter sponsorship', size: 2980, values: [1, 0.51, 0.33, 0.24, 0.19, 0.16, 0.15, 0.14], color: dataFills[3] },
]

const EXPERIMENTS = {
  onboarding: {
    title: 'Onboarding: guided install vs. copy-paste',
    metricLabel: 'Reached 3 components',
    target: 12000,
    variants: [
      { id: 'control', name: 'Copy-paste snippet', visitors: 9412, conversions: 1694, control: true },
      { id: 'guided', name: 'Guided CLI walkthrough', visitors: 9388, conversions: 1972 },
      { id: 'video', name: 'Ninety-second video', visitors: 9401, conversions: 1731 },
    ],
  },
  pricing: {
    title: 'Pricing page: per-seat vs. flat team tier',
    metricLabel: 'Started checkout',
    target: 8000,
    variants: [
      { id: 'control', name: 'Per-seat pricing', visitors: 6210, conversions: 372, control: true },
      { id: 'flat', name: 'Flat team tier', visitors: 6188, conversions: 401 },
    ],
  },
} as const

type ExperimentKey = keyof typeof EXPERIMENTS

const SANKEY_NODES = [
  { id: 'organic', label: 'Organic search', color: dataFills[0] },
  { id: 'docs', label: 'Docs referral', color: dataFills[1] },
  { id: 'npm', label: 'npm listing', color: dataFills[2] },
  { id: 'sponsorship', label: 'Sponsorship', color: dataFills[3] },
  { id: 'signup', label: 'Signed up' },
  { id: 'bounced', label: 'Bounced' },
  { id: 'activated', label: 'Activated' },
  { id: 'dormant', label: 'Dormant' },
  { id: 'paid', label: 'Paid' },
  { id: 'free', label: 'Still on free' },
  { id: 'churned', label: 'Churned' },
]

const SANKEY_LINKS = [
  { source: 'organic', target: 'signup', value: 4820 },
  { source: 'organic', target: 'bounced', value: 3110 },
  { source: 'docs', target: 'signup', value: 3940 },
  { source: 'docs', target: 'bounced', value: 880 },
  { source: 'npm', target: 'signup', value: 2610 },
  { source: 'npm', target: 'bounced', value: 1740 },
  { source: 'sponsorship', target: 'signup', value: 1180 },
  { source: 'sponsorship', target: 'bounced', value: 1800 },
  { source: 'signup', target: 'activated', value: 6104 },
  { source: 'signup', target: 'dormant', value: 6446 },
  { source: 'activated', target: 'paid', value: 1842 },
  { source: 'activated', target: 'free', value: 3850 },
  { source: 'activated', target: 'churned', value: 412 },
]

const FEATURE_TREEMAP = [
  {
    id: 'forms',
    label: 'Forms',
    color: dataFills[0],
    children: [
      { id: 'input', label: 'Input', value: 41200 },
      { id: 'select', label: 'Select', value: 28400 },
      { id: 'combobox', label: 'Combobox', value: 12100 },
      { id: 'date-picker', label: 'Date picker', value: 9800 },
    ],
  },
  {
    id: 'overlays',
    label: 'Overlays',
    color: dataFills[1],
    children: [
      { id: 'dialog', label: 'Dialog', value: 26700 },
      { id: 'dropdown-menu', label: 'Dropdown menu', value: 22400 },
      { id: 'tooltip', label: 'Tooltip', value: 18900 },
      { id: 'sheet', label: 'Sheet', value: 7600 },
    ],
  },
  {
    id: 'data',
    label: 'Data display',
    color: dataFills[2],
    children: [
      { id: 'table', label: 'Table', value: 24100 },
      { id: 'chart', label: 'Chart', value: 11300 },
      { id: 'data-grid', label: 'Data grid', value: 8400 },
      { id: 'treemap', label: 'Treemap', value: 1900 },
    ],
  },
  {
    id: 'shell',
    label: 'App shell',
    color: dataFills[3],
    children: [
      { id: 'sidebar', label: 'Sidebar', value: 19800 },
      { id: 'tabs', label: 'Tabs', value: 16400 },
      { id: 'command', label: 'Command', value: 6200 },
    ],
  },
]

/** Weekly sessions against 8-week retention, one dot per account. */
const SCATTER_POINTS = [
  { x: 2, y: 0.12, size: 940, group: 'Free', label: 'Free · 2 sessions' },
  { x: 4, y: 0.21, size: 1420, group: 'Free', label: 'Free · 4 sessions' },
  { x: 6, y: 0.28, size: 1180, group: 'Free', label: 'Free · 6 sessions' },
  { x: 9, y: 0.34, size: 620, group: 'Free', label: 'Free · 9 sessions' },
  { x: 5, y: 0.38, size: 780, group: 'Pro', label: 'Pro · 5 sessions' },
  { x: 8, y: 0.47, size: 1060, group: 'Pro', label: 'Pro · 8 sessions' },
  { x: 12, y: 0.56, size: 890, group: 'Pro', label: 'Pro · 12 sessions' },
  { x: 16, y: 0.61, size: 540, group: 'Pro', label: 'Pro · 16 sessions' },
  { x: 11, y: 0.64, size: 410, group: 'Team', label: 'Team · 11 sessions' },
  { x: 15, y: 0.72, size: 660, group: 'Team', label: 'Team · 15 sessions' },
  { x: 19, y: 0.78, size: 480, group: 'Team', label: 'Team · 19 sessions' },
  { x: 24, y: 0.83, size: 290, group: 'Team', label: 'Team · 24 sessions' },
  { x: 21, y: 0.88, size: 120, group: 'Enterprise', label: 'Enterprise · 21 sessions' },
  { x: 27, y: 0.91, size: 180, group: 'Enterprise', label: 'Enterprise · 27 sessions' },
  { x: 31, y: 0.93, size: 90, group: 'Enterprise', label: 'Enterprise · 31 sessions' },
]

/**
 * Fixed anchor, every cell derived from its index — a heatmap seeded from
 * `Date.now()` would render one grid on the server and a different one in the
 * browser. Days are counted with the calendar constructor rather than by adding
 * 86.4M milliseconds, which slips an hour either way across a DST boundary and
 * can land a cell on the wrong date.
 */
const HEATMAP_CELLS = Array.from({ length: 126 }, (_, index) => {
  const date = new Date(2026, 0, 5 + index)
  const day = date.getDay()
  const weekend = day === 0 || day === 6 ? 0.3 : 1
  const seasonal = 0.5 + 0.5 * Math.sin(index / 9)
  const value = Math.round((70 + seasonal * 210) * weekend + ((index * 37) % 41))
  return { date, value, detail: `${value.toLocaleString('en-GB')} activation events` }
})

const JOURNEYS: Journey[] = [
  {
    id: 'j-1',
    value: 1490,
    touchpoints: [
      { channel: 'Organic search', at: '2026-02-02T09:14:00' },
      { channel: 'Docs referral', at: '2026-02-05T11:02:00' },
      { channel: 'Newsletter', at: '2026-02-14T08:30:00' },
      { channel: 'Direct', at: '2026-02-18T16:44:00' },
    ],
  },
  {
    id: 'j-2',
    value: 890,
    touchpoints: [
      { channel: 'npm listing', at: '2026-02-03T13:20:00' },
      { channel: 'Docs referral', at: '2026-02-09T10:11:00' },
      { channel: 'Direct', at: '2026-02-12T09:05:00' },
    ],
  },
  {
    id: 'j-3',
    value: 4200,
    touchpoints: [
      { channel: 'Conference booth', at: '2026-01-28T15:00:00' },
      { channel: 'Newsletter', at: '2026-02-06T07:45:00' },
      { channel: 'Organic search', at: '2026-02-11T19:22:00' },
      { channel: 'Docs referral', at: '2026-02-17T12:38:00' },
      { channel: 'Direct', at: '2026-02-20T14:03:00' },
    ],
  },
  {
    id: 'j-4',
    value: 620,
    touchpoints: [
      { channel: 'Organic search', at: '2026-02-15T06:12:00' },
      { channel: 'Direct', at: '2026-02-16T18:50:00' },
    ],
  },
  {
    id: 'j-5',
    value: 2380,
    touchpoints: [
      { channel: 'Sponsorship', at: '2026-01-30T10:00:00' },
      { channel: 'npm listing', at: '2026-02-04T21:15:00' },
      { channel: 'Docs referral', at: '2026-02-19T08:08:00' },
    ],
  },
]

/**
 * Timestamps carry no zone suffix on purpose. `EventStream` prints them in the
 * viewer's local time, so a `Z` would format as 14:31 on a UTC server and 15:31
 * in a browser an hour east — a hydration mismatch on every row.
 */
const EVENTS: StreamEvent[] = [
  { id: 'e-1', name: 'subscription_created', at: '2026-03-02T14:31:12', kind: 'revenue', user: 'rin@fjord.io', properties: { plan: 'team', seats: 12, mrr: 348 } },
  { id: 'e-2', name: 'cli_init', at: '2026-03-02T14:30:58', kind: 'activation', user: 'okonkwo@lattice.dev', properties: { version: '2.4.1', template: 'next-app' } },
  { id: 'e-3', name: 'component_viewed', at: '2026-03-02T14:30:41', kind: 'engagement', user: 'anon_9f21', properties: { component: 'segment-builder', referrer: 'npm' } },
  { id: 'e-4', name: 'install_copied', at: '2026-03-02T14:30:22', kind: 'activation', user: 'mira@northbeam.co', properties: { manager: 'pnpm', component: 'gantt' } },
  { id: 'e-5', name: 'checkout_abandoned', at: '2026-03-02T14:29:47', kind: 'churn', user: 'devs@quill.sh', properties: { step: 'billing_address', plan: 'pro' } },
  { id: 'e-6', name: 'component_viewed', at: '2026-03-02T14:29:30', kind: 'engagement', user: 'anon_4c08', properties: { component: 'kanban', referrer: 'organic' } },
  { id: 'e-7', name: 'docs_search', at: '2026-03-02T14:29:03', kind: 'engagement', user: 'ozan@velvet.app', properties: { query: 'dark mode tokens', results: 14 } },
  { id: 'e-8', name: 'activated', at: '2026-03-02T14:28:39', kind: 'activation', user: 'hana@substrate.io', properties: { components: 5, days_to_activate: 2 } },
  { id: 'e-9', name: 'trial_started', at: '2026-03-02T14:28:11', kind: 'revenue', user: 'build@heliograph.dev', properties: { plan: 'pro', source: 'docs' } },
  { id: 'e-10', name: 'seat_invited', at: '2026-03-02T14:27:52', kind: 'engagement', user: 'rin@fjord.io', properties: { invited: 'tomas@fjord.io' } },
  { id: 'e-11', name: 'subscription_cancelled', at: '2026-03-02T14:27:20', kind: 'churn', user: 'ops@paperlane.com', properties: { reason: 'moved_in_house', tenure_days: 214 } },
  { id: 'e-12', name: 'component_viewed', at: '2026-03-02T14:26:58', kind: 'engagement', user: 'anon_7b33', properties: { component: 'sankey', referrer: 'newsletter' } },
]

const EVENT_KIND_COLOR: Record<string, string> = {
  revenue: 'var(--green)',
  activation: 'var(--blue)',
  engagement: 'var(--violet)',
  churn: 'var(--rose)',
}

const NUMBER = new Intl.NumberFormat('en-GB')

function Growth() {
  const [section, setSection] = useState('overview')
  const [range, setRange] = useState<RangeKey>('30d')
  const [chartVariant, setChartVariant] = useState<'line' | 'area' | 'bar'>('area')
  const [basis, setBasis] = useState<'previous' | 'year' | 'custom'>('previous')
  const [segment, setSegment] = useState<ConditionGroup>(INITIAL_SEGMENT)
  const [experiment, setExperiment] = useState<ExperimentKey>('onboarding')
  const [model, setModel] = useState<AttributionModel>('linear')
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState<StreamEvent | null>(null)

  const active = RANGES[range]

  // The segment drives both the headline count and the funnel underneath it, so
  // editing a condition visibly moves the numbers rather than just the summary.
  const share = useMemo(() => fractionOf(segment), [segment])
  const audience = Math.round(AUDIENCE_BASE * share)
  const funnelStages = useMemo(
    () => FUNNEL_BASE.map((stage) => ({
      label: stage.label,
      value: Math.max(1, Math.round(stage.value * share)),
      hint: <code className="text-[10px]">{stage.hint}</code>,
    })),
    [share],
  )

  return (
    <AppFrame
      inset
      product="Growth"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title="Growth analytics"
      user={{ name: 'Ada Lovelace', plan: 'Growth team' }}
      actions={
        <div className="flex items-center gap-2">
          <Input
            variant="secondary"
            size="sm"
            icon={<Search />}
            placeholder="Search events"
            clearable
            containerClassName="hidden w-52 lg:flex"
          />
          <SegmentedControl
            size="sm"
            label="Date range"
            value={range}
            onValueChange={(value) => setRange(value as RangeKey)}
            options={[
              { value: '7d', label: '7d', srLabel: 'Last 7 days' },
              { value: '30d', label: '30d', srLabel: 'Last 30 days' },
              { value: '90d', label: '90d', srLabel: 'Last quarter' },
            ]}
            className="hidden sm:flex"
          />
          <Tooltip content="Share this view">
            <Button size="icon-sm" variant="ghost" aria-label="Share this view">
              <GitBranch />
            </Button>
          </Tooltip>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          {active.metrics.map((metric) => {
            const shape = METRIC_FORMAT[metric.key]
            return (
              <DateRangeCompare
                key={metric.key}
                label={metric.label}
                value={metric.value}
                previous={metric.previous}
                history={metric.history}
                format={shape.format}
                goodDirection={shape.goodDirection}
                basis={basis}
                onBasisChange={setBasis}
                rangeLabel={active.label}
                currency="USD"
              />
            )
          })}

          <Separator label="selection" />

          <Card size="sm">
            <CardHeader size="sm">
              <CardTitle as="h2">Event inspector</CardTitle>
              <CardDescription>
                {selected ? 'Picked from the live stream.' : 'Click an event in the stream.'}
              </CardDescription>
            </CardHeader>
            <CardBody size="sm">
              {selected ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" tint={EVENT_KIND_COLOR[selected.kind ?? ''] ?? 'var(--blue)'}>
                      {selected.kind}
                    </Badge>
                    <code className="text-xs">{selected.name}</code>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{selected.user}</p>
                  <dl className="space-y-1.5">
                    {Object.entries(selected.properties ?? {}).map(([key, value]) => (
                      <div key={key} className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted-foreground text-xs">{key}</dt>
                        <dd className="truncate font-mono text-xs tabular-nums">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Properties for the selected event show up here.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Weekly active teams"
            value="4,182"
            delta={6.2}
            icon={<Users />}
            chart={<Sparkline values={[3410, 3520, 3680, 3744, 3902, 4011, 4182]} variant="area" color="var(--blue)" className="h-8 w-full" />}
            hint="Teams with 2+ members active in the last 7 days."
          />
          <Stat
            label="Activation rate"
            value="47.8%"
            delta={3.4}
            chart={<Sparkline values={[0.44, 0.451, 0.458, 0.462, 0.471, 0.474, 0.478]} variant="line" color="var(--violet)" className="h-8 w-full" />}
            hint="Imported three or more components within 7 days."
          />
          <Stat
            label="Time to first import"
            value="18m 40s"
            delta={12.1}
            goodDirection="down"
            chart={<Sparkline values={[26, 25, 24, 22, 21, 19.5, 18.7]} variant="line" color="var(--green)" className="h-8 w-full" />}
            hint="Median, signup to first component import."
          />
          <Stat
            label="Net revenue retention"
            value="112%"
            delta={1.8}
            chart={<Sparkline values={[104, 106, 107, 109, 110, 111, 112]} variant="bar" color="var(--amber)" className="h-8 w-full" />}
            hint="Trailing twelve months, expansion minus churn."
          />
        </div>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle as="h2">Acquisition to revenue</CardTitle>
              <CardDescription>{active.label} — signups, activations and conversions.</CardDescription>
            </div>
            <SegmentedControl
              size="sm"
              label="Chart shape"
              value={chartVariant}
              onValueChange={(value) => setChartVariant(value as 'line' | 'area' | 'bar')}
              options={[
                { value: 'line', label: 'Line' },
                { value: 'area', label: 'Area' },
                { value: 'bar', label: 'Bars' },
              ]}
            />
          </CardHeader>
          <CardBody>
            <Chart
              // Keyed on the range so a shorter series never animates from the
              // stale one's point count.
              key={range}
              series={active.series}
              labels={active.labels}
              variant={chartVariant}
              height={240}
              legend
              valueFormat={(value: number) => NUMBER.format(value)}
            />
          </CardBody>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Audience</CardTitle>
              <CardDescription>
                Edit a condition and the estimate — and the funnel beside it — move with it.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <SegmentBuilder
                fields={SEGMENT_FIELDS}
                value={segment}
                onChange={setSegment}
                estimate={
                  <span className="tabular-nums">
                    <strong className="font-semibold">{NUMBER.format(audience)}</strong>{' '}
                    <span className="text-muted-foreground">
                      of {NUMBER.format(AUDIENCE_BASE)} accounts ({(share * 100).toFixed(1)}%)
                    </span>
                  </span>
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Onboarding funnel</CardTitle>
              <CardDescription>Scoped to the segment on the left.</CardDescription>
            </CardHeader>
            <CardBody>
              <Funnel
                stages={funnelStages}
                color="var(--violet)"
                format={(value) => NUMBER.format(value)}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Retention</CardTitle>
            <CardDescription>
              The table shows what happened; the curve shows where it settles.
            </CardDescription>
          </CardHeader>

          <Tabs defaultValue="table" className="gap-0">
            <div className="border-border border-b px-4.5 py-2">
              <TabsList variant="underline">
                <TabsTrigger value="table" variant="underline">Weekly cohorts</TabsTrigger>
                <TabsTrigger value="curve" variant="underline">By source</TabsTrigger>
                <TabsTrigger value="scatter" variant="underline">Usage vs. retention</TabsTrigger>
                <TabsTrigger value="heatmap" variant="underline">Daily volume</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="table" className="p-4.5">
              <CohortTable
                cohorts={COHORTS}
                periodLabel={(index) => (index === 0 ? 'Wk 0' : `Wk ${index}`)}
                cohortHeader="Signup week"
              />
            </TabsContent>

            <TabsContent value="curve" className="p-4.5">
              <RetentionCurve
                cohorts={RETENTION_COHORTS}
                periodLabel={(index) => `Wk ${index}`}
                height={280}
                footnote="Docs referrals flatten near 59% — they arrive already knowing what the kit is for."
              />
            </TabsContent>

            <TabsContent value="scatter" className="p-4.5">
              <ScatterPlot
                points={SCATTER_POINTS}
                xLabel="Sessions per week"
                yLabel="8-week retention"
                trend
                height={280}
                valueFormat={(value) => (value <= 1 ? `${(value * 100).toFixed(0)}%` : value.toFixed(0))}
              />
            </TabsContent>

            <TabsContent value="heatmap" className="p-4.5">
              <HeatmapGrid
                cells={HEATMAP_CELLS}
                color="var(--violet)"
                summaryLabel={(total, days) =>
                  `${NUMBER.format(total)} activation events across ${days} days`}
              />
            </TabsContent>
          </Tabs>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle as="h2">Running experiments</CardTitle>
              <CardDescription>Significance is computed from the counts, not asserted.</CardDescription>
            </div>
            <SegmentedControl
              size="sm"
              label="Experiment"
              value={experiment}
              onValueChange={(value) => setExperiment(value as ExperimentKey)}
              options={[
                { value: 'onboarding', label: 'Onboarding' },
                { value: 'pricing', label: 'Pricing' },
              ]}
            />
          </CardHeader>
          <CardBody>
            <AbTestResults
              variants={[...EXPERIMENTS[experiment].variants]}
              title={EXPERIMENTS[experiment].title}
              metricLabel={EXPERIMENTS[experiment].metricLabel}
              targetSample={EXPERIMENTS[experiment].target}
            />
          </CardBody>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Channel to outcome</CardTitle>
              <CardDescription>Where the quarter's traffic ended up.</CardDescription>
            </CardHeader>
            <CardBody>
              <Sankey
                nodes={SANKEY_NODES}
                links={SANKEY_LINKS}
                height={300}
                valueFormat={(value: number) => NUMBER.format(value)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Imports by component</CardTitle>
              <CardDescription>Area, then component. Ninety days.</CardDescription>
            </CardHeader>
            <CardBody>
              <Treemap
                nodes={FEATURE_TREEMAP}
                height={300}
                valueFormat={(value: number) => NUMBER.format(value)}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Credit for {NUMBER.format(JOURNEYS.length)} closed deals</CardTitle>
            <CardDescription>
              Switching the model reassigns the same revenue — currently {model}.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Attribution
              journeys={JOURNEYS}
              model={model}
              onModelChange={setModel}
              halfLife={7}
              valueFormat={(value) => `$${NUMBER.format(Math.round(value))}`}
              footnote="Conference touches only look weak under last-click; position-based splits the difference."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle as="h2">Live events</CardTitle>
              <CardDescription>
                {paused ? 'Paused — the feed is holding.' : 'Streaming from the ingest edge.'}
              </CardDescription>
            </div>
            {selected && (
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Clear selection
              </Button>
            )}
          </CardHeader>
          <CardBody>
            <EventStream
              events={EVENTS}
              height={340}
              paused={paused}
              onPausedChange={setPaused}
              onSelect={setSelected}
              colorFor={(kind) => EVENT_KIND_COLOR[kind ?? ''] ?? 'var(--muted-foreground)'}
              filterPlaceholder="Filter by event name"
            />
          </CardBody>
        </Card>
      </div>
    </AppFrame>
  )
}

export const growthExample: ExampleEntry = {
  id: 'growth',
  label: 'Growth Analytics',
  description:
    'A product analytics console: a segment builder whose conditions resize the audience and the funnel below it, switchable ranges and chart shapes, cohort retention four ways, an experiment readout, attribution you can re-model, and a pausable live event stream.',
  uses: [
    'Chart', 'Funnel', 'Cohort Table', 'Retention Curve', 'A/B Test Results',
    'Attribution', 'Segment Builder', 'Date Range Compare', 'Event Stream',
    'Scatter Plot', 'Heatmap Grid', 'Treemap', 'Sankey', 'Stat',
  ],
  render: () => <Growth />,
}
