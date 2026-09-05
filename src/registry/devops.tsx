import { Chart } from '@/components/ui/chart'
import { EnvVars, type EnvVar } from '@/components/ui/env-vars'
import { Gauge } from '@/components/ui/gauge'
import { IncidentCard } from '@/components/ui/incident-card'
import { Pipeline, type PipelineStage } from '@/components/ui/pipeline'
import { ResourceMeter } from '@/components/ui/resource-meter'
import { ServiceStatus, type Service } from '@/components/ui/service-status'
import { UptimeStrip, type UptimeBucket } from '@/components/ui/uptime-strip'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

/* -------------------------------------------------------------------- chart */

const CHART_VARIANTS = ['line', 'area', 'bar'] as const
const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
const SERIES = [
  { name: 'Deploys', values: [42, 55, 48, 71, 66, 84] },
  { name: 'Rollbacks', values: [6, 4, 7, 3, 5, 2] },
]

export const chartEntry: ComponentEntry = {
  id: 'chart',
  label: 'Chart',
  description:
    'A small line, area or bar plot in plain SVG. Not a charting library — everything here is a scale and a path, which is the right trade for six numbers on a dashboard card.',
  usage: `import { Chart } from '@/components/ui/chart'

<Chart series={series} labels={months} variant="area" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: CHART_VARIANTS, default: 'line' },
      { type: 'boolean', prop: 'grid', label: 'grid', default: true },
      { type: 'boolean', prop: 'axis', label: 'axis', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <Chart
          series={SERIES}
          labels={MONTHS}
          variant={String(state.variant) as (typeof CHART_VARIANTS)[number]}
          grid={Boolean(state.grid)}
          axis={Boolean(state.axis)}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<Chart\n  series={series}\n  labels={months}\n  variant="${s.variant}"\n  grid={${Boolean(s.grid)}}\n  axis={${Boolean(s.axis)}}\n/>`,
  },
  api: [
    { name: 'series', type: 'ChartSeries[]', description: '`{ name, values, color? }`. Colours fall back to a palette by index.' },
    { name: 'variant', type: "'line' | 'area' | 'bar'", default: "'line'", description: 'Bars group per index across series.' },
    { name: 'labels', type: 'string[]', description: 'X labels, rendered below the plot rather than inside the stretched SVG.' },
    { name: 'min / max', type: 'number', description: 'Pin the scale. Defaults span zero to the highest value, so bar heights stay honest.' },
    { name: 'grid / axis / legend', type: 'boolean', description: 'Legend defaults on for more than one series.' },
    { name: 'scaling', type: '100×60 viewBox', description: 'Stretched by preserveAspectRatio:none so it fills its container without measuring; strokes use non-scaling-stroke to stay even under that stretch.' },
  ],
  demos: [
    {
      title: 'Variants',
      stack: true,
      code: `<Chart series={series} labels={months} />
<Chart series={series} labels={months} variant="bar" />`,
      render: () => (
        <div className="flex w-full max-w-xl flex-col gap-6">
          <Chart series={SERIES} labels={MONTHS} variant="area" />
          <Chart series={SERIES} labels={MONTHS} variant="bar" />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------------------- gauge */

export const gaugeEntry: ComponentEntry = {
  id: 'gauge',
  label: 'Gauge',
  description:
    'A radial meter — the circular counterpart to Progress. Drawn with stroke-dasharray rather than an arc path, so the sweep is one number and there is no arc-flag maths to get wrong.',
  usage: `import { Gauge } from '@/components/ui/gauge'

<Gauge value={72} label="CPU" />`,
  composer: {
    controls: [
      { type: 'text', prop: 'value', label: 'value', default: '72' },
      { type: 'text', prop: 'label', label: 'label', default: 'CPU' },
      { type: 'boolean', prop: 'showValue', label: 'showValue', default: true },
    ],
    render: (state) => (
      <Gauge
        value={Number(state.value) || 0}
        label={String(state.label)}
        showValue={Boolean(state.showValue)}
      />
    ),
    code: (s: ComposerState) =>
      `<Gauge value={${s.value}} label="${s.label}" showValue={${Boolean(s.showValue)}} />`,
  },
  api: [
    { name: 'value / max', type: 'number', default: 'max: 100', description: 'Reported as a real progressbar with aria-valuenow — a ring of SVG is otherwise invisible to a screen reader.' },
    { name: 'size / thickness', type: 'number', default: '96 / 8', description: 'Rendered size in pixels; geometry is a fixed 100-unit viewBox so it stays independent of that.' },
    { name: 'tone', type: 'string', description: 'Any CSS colour. Defaults to a threshold ramp — green, amber above 75%, red above 90%.' },
    { name: 'label / hint / showValue', type: 'ReactNode / ReactNode / boolean', description: 'Caption under the ring, small text inside it, and whether the percentage is drawn.' },
  ],
  demos: [
    {
      title: 'Thresholds',
      stack: true,
      code: `<Gauge value={38} label="Memory" />
<Gauge value={82} label="Disk" />
<Gauge value={96} label="Quota" />`,
      render: () => (
        <div className="flex flex-wrap gap-6">
          <Gauge value={38} label="Memory" />
          <Gauge value={82} label="Disk" />
          <Gauge value={96} label="Quota" />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------- uptime strip */

const DAYS: UptimeBucket[] = Array.from({ length: 60 }, (_, index) => {
  const day = 60 - index
  const status = day === 12 ? 'down' : day === 13 || day === 34 ? 'degraded' : 'up'
  return {
    label: `${day} days ago`,
    status,
    detail: status === 'up' ? 'No incidents' : status === 'down' ? '42m outage' : 'Elevated latency',
  }
})

export const uptimeStripEntry: ComponentEntry = {
  id: 'uptime-strip',
  label: 'Uptime Strip',
  description:
    'A run of per-period bars: uptime history or a contribution heatmap. One primitive for both, since they are the same picture — buckets coloured by state or by intensity.',
  usage: `import { UptimeStrip } from '@/components/ui/uptime-strip'

<UptimeStrip buckets={days} label="API" summary="99.94%" />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'rounded', label: 'rounded', default: true },
      { type: 'boolean', prop: 'heatmap', label: 'intensity mode', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <UptimeStrip
          label="API"
          summary="99.94% uptime"
          rounded={Boolean(state.rounded)}
          buckets={
            state.heatmap
              ? DAYS.map((day, index) => ({
                  label: day.label,
                  value: ((index * 37) % 100) / 100,
                }))
              : DAYS
          }
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<UptimeStrip\n  buckets={days}\n  label="API"\n  summary="99.94% uptime"\n  rounded={${Boolean(s.rounded)}}\n/>`,
  },
  api: [
    { name: 'buckets', type: 'UptimeBucket[]', description: '`{ label, status?, value?, detail? }`. Give `status` for a state strip or `value` (0–1) for a heatmap.' },
    { name: 'status', type: "'up' | 'degraded' | 'down' | 'none'", description: 'A missing bucket renders as an explicit gap rather than being dropped, which keeps the axis honest.' },
    { name: 'label / summary', type: 'string', description: 'Caption row above the bars.' },
    { name: 'layout', type: 'flex', description: 'Bars flex rather than taking a fixed width, so ninety days compress on a phone instead of scrolling.' },
  ],
  demos: [
    {
      title: 'Uptime and intensity',
      stack: true,
      code: `<UptimeStrip buckets={days} label="API" summary="99.94%" />
<UptimeStrip buckets={contributions} label="Commits" />`,
      render: () => (
        <div className="flex w-full max-w-xl flex-col gap-5">
          <UptimeStrip buckets={DAYS} label="API" summary="99.94% uptime" />
          <UptimeStrip
            label="Commits"
            summary="last 60 days"
            buckets={DAYS.map((day, index) => ({
              label: day.label,
              value: ((index * 37) % 100) / 100,
            }))}
          />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------- resource meter */

export const resourceMeterEntry: ComponentEntry = {
  id: 'resource-meter',
  label: 'Resource Meter',
  description:
    'Used against a cap: build minutes, storage, seats, rate limits. Unlike Progress it can exceed 100%, because a quota can be 130% used and hiding that is how a bill becomes a surprise.',
  usage: `import { ResourceMeter } from '@/components/ui/resource-meter'

<ResourceMeter label="Build minutes" used={8420} cap={10000} />`,
  composer: {
    controls: [
      { type: 'text', prop: 'used', label: 'used', default: '8420' },
      { type: 'text', prop: 'cap', label: 'cap', default: '10000' },
      { type: 'select', prop: 'unit', label: 'unit', options: ['number', 'bytes', 'duration'], default: 'number' },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <ResourceMeter
          label="Build minutes"
          used={Number(state.used) || 0}
          cap={Number(state.cap) || 1}
          unit={String(state.unit) as 'number' | 'bytes' | 'duration'}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<ResourceMeter\n  label="Build minutes"\n  used={${s.used}}\n  cap={${s.cap}}\n  unit="${s.unit}"\n/>`,
  },
  api: [
    { name: 'used / cap', type: 'number', description: 'The bar clamps at full; the printed percentage does not, so an overage is stated rather than hidden.' },
    { name: 'unit', type: "'number' | 'bytes' | 'duration'", default: "'number'", description: 'How both numbers are written — routed through Fmt.' },
    { name: 'tone', type: 'string', description: 'Any CSS colour. Defaults to a ramp: blue, amber above 80%, red above 95% or over cap.' },
    { name: 'size', type: "'sm' | 'default'", default: "'default'", description: 'Bar and label scale.' },
  ],
  demos: [
    {
      title: 'Quotas',
      stack: true,
      code: `<ResourceMeter label="Build minutes" used={8420} cap={10000} />
<ResourceMeter label="Storage" used={49_500_000_000} cap={50_000_000_000} unit="bytes" />
<ResourceMeter label="Bandwidth" used={640} cap={500} />`,
      render: () => (
        <div className="flex w-full max-w-md flex-col gap-4">
          <ResourceMeter label="Build minutes" used={8420} cap={10000} />
          <ResourceMeter label="Storage" used={49_500_000_000} cap={50_000_000_000} unit="bytes" />
          <ResourceMeter label="Bandwidth" used={640} cap={500} />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------------- pipeline */

const STAGES: PipelineStage[] = [
  {
    id: 'build',
    name: 'Build',
    jobs: [
      { id: 'compile', name: 'compile', status: 'success', duration: 72 },
      { id: 'bundle', name: 'bundle', status: 'success', duration: 41 },
    ],
  },
  {
    id: 'test',
    name: 'Test',
    jobs: [
      { id: 'unit', name: 'unit', status: 'success', duration: 124 },
      { id: 'e2e', name: 'e2e', status: 'failure', duration: 302 },
      { id: 'visual', name: 'visual', status: 'skipped' },
    ],
  },
  {
    id: 'deploy',
    name: 'Deploy',
    jobs: [
      { id: 'staging', name: 'staging', status: 'running' },
      { id: 'production', name: 'production', status: 'pending' },
    ],
  },
]

export const pipelineEntry: ComponentEntry = {
  id: 'pipeline',
  label: 'Pipeline',
  description:
    'CI stages left to right with parallel jobs stacked inside each. A stage is as bad as its worst job, so its state is derived rather than being another field to keep in sync.',
  usage: `import { Pipeline } from '@/components/ui/pipeline'

<Pipeline stages={stages} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'stages', label: 'stages', default: 4, min: 1, max: 4, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <Pipeline stages={STAGES.slice(0, Number(state.stages))} />
      </div>
    ),
    code: () => `<Pipeline stages={stages} />`,
  },
  api: [
    { name: 'stages', type: 'PipelineStage[]', description: '`{ id, name, jobs }` where a job is `{ id, name, status, duration?, onSelect? }`.' },
    { name: 'stageStatus', type: '(stage) => JobStatus', description: 'Exported roll-up: failure beats running beats pending. Use it for a summary elsewhere so both agree.' },
    { name: 'onSelect', type: '() => void', description: 'Makes a job a button. Jobs without one render as plain rows rather than dead buttons.' },
    { name: 'layout', type: 'responsive', description: 'Scrolls horizontally instead of wrapping — a pipeline read out of order is meaningless — and stacks to one column below md.' },
  ],
  demos: [
    { title: 'Stages', stack: true, code: `<Pipeline stages={stages} />`, render: () => <div className="w-full"><Pipeline stages={STAGES} /></div> },
  ],
}

/* ----------------------------------------------------------- service status */

const SERVICES: Service[] = [
  { id: 'api', name: 'API', state: 'operational', history: DAYS, uptime: '99.98%' },
  { id: 'web', name: 'Dashboard', state: 'degraded', description: 'Elevated latency in eu-west-1', history: DAYS, uptime: '99.71%' },
  { id: 'builds', name: 'Build runners', state: 'operational', history: DAYS, uptime: '99.95%' },
  { id: 'registry', name: 'Package registry', state: 'maintenance', description: 'Scheduled maintenance until 10:00 UTC', history: DAYS, uptime: '99.99%' },
]

export const serviceStatusEntry: ComponentEntry = {
  id: 'service-status',
  label: 'Service Status',
  description:
    'The rows of a status page. The headline banner is derived from the services — a status page whose headline can disagree with its own rows is worse than none.',
  usage: `import { ServiceStatus } from '@/components/ui/service-status'

<ServiceStatus services={services} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'showBanner', label: 'showBanner', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <ServiceStatus services={SERVICES} showBanner={Boolean(state.showBanner)} />
      </div>
    ),
    code: (s: ComposerState) =>
      `<ServiceStatus services={services} showBanner={${Boolean(s.showBanner)}} />`,
  },
  api: [
    { name: 'services', type: 'Service[]', description: '`{ id, name, state, description?, history?, uptime? }`.' },
    { name: 'state', type: "'operational' | 'degraded' | 'outage' | 'maintenance'", description: 'Each row carries a dot and a labelled badge, never colour alone.' },
    { name: 'overallState', type: '(services) => ServiceState', description: 'Exported. Worst state wins, so one outage cannot be reported as all-operational.' },
    { name: 'history', type: 'UptimeBucket[]', description: 'Rendered with UptimeStrip inside each row.' },
  ],
  demos: [
    { title: 'Status page', stack: true, code: `<ServiceStatus services={services} />`, render: () => <div className="w-full max-w-xl"><ServiceStatus services={SERVICES} /></div> },
  ],
}

/* ----------------------------------------------------------------- env vars */

const ENV: EnvVar[] = [
  { key: 'NODE_ENV', value: 'production', scopes: ['prod'] },
  { key: 'DATABASE_URL', value: 'postgres://user:hunter2@db.internal:5432/app', secret: true, scopes: ['prod', 'preview'] },
  { key: 'STRIPE_SECRET_KEY', value: 'ax_live_4f2a1c9d8e7b6a5', secret: true, scopes: ['prod'] },
  { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.astralyx.dev', scopes: ['prod', 'preview', 'dev'] },
]

export const envVarsEntry: ComponentEntry = {
  id: 'env-vars',
  label: 'Env Vars',
  description:
    'Environment variables with secrets masked until asked for. Reveal is per-row and never sticky — nothing survives a remount, so a shared screen cannot leak what someone expanded an hour ago.',
  usage: `import { EnvVars } from '@/components/ui/env-vars'

<EnvVars vars={vars} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'secrets', label: 'include secrets', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <EnvVars vars={state.secrets ? ENV : ENV.filter((v) => !v.secret)} />
      </div>
    ),
    code: () => `<EnvVars vars={vars} />`,
  },
  api: [
    { name: 'vars', type: 'EnvVar[]', description: '`{ key, value, secret?, scopes?, updated? }`.' },
    { name: 'secret', type: 'boolean', description: 'Masks the value and adds a reveal toggle. The mask is a fixed width, since the length of a secret is itself a hint about what it is.' },
    { name: 'scopes', type: 'string[]', description: 'Environments the variable applies to, shown as badges.' },
    { name: 'copy', type: 'always available', description: 'Copies the real value even while masked — the common reason to open one of these is to paste it somewhere.' },
  ],
  demos: [
    { title: 'Variables', stack: true, code: `<EnvVars vars={vars} />`, render: () => <div className="w-full max-w-2xl"><EnvVars vars={ENV} /></div> },
  ],
}

/* ------------------------------------------------------------ incident card */

const SEVERITIES = ['sev1', 'sev2', 'sev3', 'sev4'] as const
const STATES = ['investigating', 'identified', 'monitoring', 'resolved'] as const

export const incidentCardEntry: ComponentEntry = {
  id: 'incident-card',
  label: 'Incident Card',
  description:
    'An incident: severity, state, owner, age. Severity is a left edge rather than a tinted surface, because a list of ten red cards is unreadable and the stripe scales to a queue.',
  usage: `import { IncidentCard } from '@/components/ui/incident-card'

<IncidentCard
  title="Elevated error rate on checkout"
  severity="sev2"
  startedAt={startedAt}
  assignee="Ada Lovelace"
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'severity', label: 'severity', options: SEVERITIES, default: 'sev2' },
      { type: 'select', prop: 'state', label: 'state', options: STATES, default: 'investigating' },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <IncidentCard
          title="Elevated error rate on checkout"
          summary="Upstream payment provider returning 503 for roughly 4% of requests."
          severity={String(state.severity) as (typeof SEVERITIES)[number]}
          state={String(state.state) as (typeof STATES)[number]}
          startedAt={ago(74)}
          now={NOW}
          assignee="Ada Lovelace"
          services={['checkout', 'payments']}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<IncidentCard\n  title="Elevated error rate on checkout"\n  severity="${s.severity}"\n  state="${s.state}"\n  startedAt={startedAt}\n  assignee="Ada Lovelace"\n/>`,
  },
  api: [
    { name: 'severity', type: "'sev1' | 'sev2' | 'sev3' | 'sev4'", default: "'sev3'", description: 'Drives the edge colour and the badge.' },
    { name: 'state', type: "'investigating' | 'identified' | 'monitoring' | 'resolved'", default: "'investigating'", description: 'Resolved dims the card.' },
    { name: 'startedAt / resolvedAt', type: 'Date', description: 'Duration is computed from these, so an open incident ages on its own rather than showing a stale string.' },
    { name: 'now', type: 'Date', description: 'Reference point for the age. Pass it to keep a render deterministic.' },
    { name: 'assignee / services', type: 'string / string[]', description: 'Owner avatar and the affected components.' },
  ],
  demos: [
    {
      title: 'Queue',
      stack: true,
      code: `<IncidentCard title="…" severity="sev1" startedAt={t1} />
<IncidentCard title="…" severity="sev3" state="resolved" startedAt={t2} resolvedAt={t3} />`,
      render: () => (
        <div className="flex w-full max-w-xl flex-col gap-3">
          <IncidentCard title="Checkout unavailable in eu-west-1" severity="sev1" state="identified" startedAt={ago(22)} now={NOW} assignee="Grace Hopper" services={['checkout']} />
          <IncidentCard title="Elevated build queue times" severity="sev3" state="resolved" startedAt={ago(320)} resolvedAt={ago(180)} now={NOW} assignee="Alan Turing" services={['runners']} />
        </div>
      ),
    },
  ],
}
