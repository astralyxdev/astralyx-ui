import { CacheStats } from '@/components/ui/cache-stats'
import { ContainerList, type Container } from '@/components/ui/container-list'
import { EnvDiff, type EnvEntry } from '@/components/ui/env-diff'
import { PortTable, type PortBinding } from '@/components/ui/port-table'
import { QueueMonitor } from '@/components/ui/queue-monitor'
import { RateLimitMeter } from '@/components/ui/rate-limit-meter'
import { WebSocketFrames, type WsFrame } from '@/components/ui/websocket-frames'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (s: number) => new Date(NOW.getTime() - s * 1000)
const ahead = (s: number) => new Date(NOW.getTime() + s * 1000)

/* ------------------------------------------------------------- container list */

const CONTAINERS: Container[] = [
  { id: 'c1', name: 'api', image: 'ghcr.io/acme/api', tag: 'sha-8f21c4a', state: 'running', startedAt: ago(96_400), cpu: 12.4, memory: 412_000_000, ports: ['0.0.0.0:8080→8080'] },
  { id: 'c2', name: 'worker', image: 'ghcr.io/acme/api', tag: 'sha-8f21c4a', state: 'running', startedAt: ago(96_400), restarts: 47, cpu: 88.1, memory: 1_240_000_000 },
  { id: 'c3', name: 'postgres', image: 'postgres', tag: '17.4', state: 'running', startedAt: ago(412_000), cpu: 4.2, memory: 2_100_000_000, ports: ['127.0.0.1:5432→5432'] },
  { id: 'c4', name: 'redis', image: 'redis', state: 'restarting', restarts: 3, cpu: 0.8, memory: 64_000_000 },
  { id: 'c5', name: 'migrate', image: 'ghcr.io/acme/api', tag: 'sha-8f21c4a', state: 'exited' },
]

export const containerListEntry: ComponentEntry = {
  id: 'container-list',
  label: 'Container List',
  description:
    'Running containers with state, image tag and resource use. Restart count is shown whenever it is non-zero — a container "running" with 47 restarts is crash-looping, and its state says everything is fine.',
  usage: `import { ContainerList } from '@/components/ui/container-list'

<ContainerList containers={containers} onRestart={restart} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'actions', label: 'lifecycle actions', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <ContainerList
          containers={CONTAINERS}
          now={NOW}
          onStart={state.actions ? () => {} : undefined}
          onStop={state.actions ? () => {} : undefined}
          onRestart={state.actions ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<ContainerList containers={containers} onRestart={restart} />`,
  },
  api: [
    { name: 'containers', type: 'Container[]', description: '`{ id, name, image, tag?, state, startedAt?, restarts?, ports?, cpu?, memory? }`.' },
    { name: 'restarts', type: 'always shown when non-zero', description: 'Not only when unhealthy. A crash loop hides behind a green "running".' },
    { name: 'tag', type: 'rendered separately', description: '`:latest` is the detail that explains why two hosts are running different code.' },
    { name: 'actions', type: 'per state', description: 'Start is absent on a running container rather than disabled — a greyed control on every row is noise.' },
  ],
  demos: [
    { title: 'A compose stack', stack: true, code: `<ContainerList containers={containers} now={now} />`,
      render: () => (<div className="w-full"><ContainerList containers={CONTAINERS} now={NOW} /></div>) },
  ],
}

/* ----------------------------------------------------------------- port table */

const PORTS: PortBinding[] = [
  { id: 'p1', port: 443, targetPort: 8080, address: '0.0.0.0', process: 'nginx', tls: true },
  { id: 'p2', port: 8080, address: '0.0.0.0', process: 'node api' },
  { id: 'p3', port: 5432, address: '127.0.0.1', process: 'postgres' },
  { id: 'p4', port: 6379, address: '0.0.0.0', process: 'redis-server' },
  { id: 'p5', port: 9090, address: '127.0.0.1', process: 'prometheus' },
  { id: 'p6', port: 53, protocol: 'udp', address: '127.0.0.53', process: 'systemd-resolved' },
]

export const portTableEntry: ComponentEntry = {
  id: 'port-table',
  label: 'Port Table',
  description:
    'Published ports with their bind address. `0.0.0.0:5432` and `127.0.0.1:5432` are the difference between a database on the internet and a database on the machine — printing only the number hides that.',
  usage: `import { PortTable } from '@/components/ui/port-table'

<PortTable ports={ports} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'note', label: 'exposure note', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <PortTable ports={PORTS} exposedNote={state.note ? undefined : null} />
      </div>
    ),
    code: () => `<PortTable ports={ports} />`,
  },
  api: [
    { name: 'ports', type: 'PortBinding[]', description: '`{ id, port, targetPort?, protocol?, address?, process?, tls?, service? }`.' },
    { name: 'address', type: 'the finding', description: 'Bound to every interface is highlighted; loopback is not.' },
    { name: 'exposure', type: 'public + no TLS', description: 'That combination is the actual finding. Either alone is often fine.' },
    { name: 'service names', type: 'well-known ports', description: '5432 means nothing to someone who does not already know it is Postgres.' },
  ],
  demos: [
    { title: 'What is listening', stack: true, code: `<PortTable ports={ports} />`,
      render: () => (<div className="w-full"><PortTable ports={PORTS} /></div>) },
  ],
}

/* -------------------------------------------------------------------- env diff */

const LEFT: EnvEntry[] = [
  { key: 'DATABASE_URL', value: 'postgres://app@db.staging:5432/app', secret: true },
  { key: 'LOG_LEVEL', value: 'debug' },
  { key: 'NODE_ENV', value: 'production' },
  { key: 'REDIS_URL', value: 'redis://cache.staging:6379' },
  { key: 'SESSION_SECRET', value: 'k3y-material-staging', secret: true },
  { key: 'FEATURE_NEW_CHECKOUT', value: 'true' },
]

const RIGHT: EnvEntry[] = [
  { key: 'DATABASE_URL', value: 'postgres://app@db.prod:5432/app', secret: true },
  { key: 'LOG_LEVEL', value: 'info' },
  { key: 'NODE_ENV', value: 'production' },
  { key: 'REDIS_URL', value: 'redis://cache.prod:6379' },
  { key: 'SESSION_SECRET', value: 'k3y-material-prod\n', secret: true },
  { key: 'SENTRY_DSN', value: 'https://abc@sentry.io/42' },
]

export const envDiffEntry: ComponentEntry = {
  id: 'env-diff',
  label: 'Env Diff',
  description:
    'Two environments side by side, values masked by default. A variable missing from one side is drawn differently from one whose value merely differs — "not set" and "set to something else" have different causes.',
  usage: `import { EnvDiff } from '@/components/ui/env-diff'

<EnvDiff left={staging} right={production} leftLabel="Staging" rightLabel="Production" />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'same', label: 'show identical', default: false }],
    render: (state: ComposerState) => (
      <div className="w-full">
        <EnvDiff
          left={LEFT}
          right={RIGHT}
          leftLabel="Staging"
          rightLabel="Production"
          showSame={Boolean(state.same)}
        />
      </div>
    ),
    code: () => `<EnvDiff left={staging} right={production} />`,
  },
  api: [
    { name: 'left / right', type: 'EnvEntry[]', description: '`{ key, value, secret? }`. A `value` of `undefined` means not set.' },
    { name: 'masking', type: 'per row', description: 'This is the screen someone opens when staging differs from production, and the screen that gets screenshotted into a shared channel with a password in it.' },
    { name: 'whitespace', type: 'called out', description: 'Values differing only in whitespace are flagged — a trailing newline in a secret is invisible and takes a service down.' },
    { name: 'ordering', type: 'differences first', description: 'Missing and differing rows above identical ones, which are collapsed behind a count.' },
  ],
  demos: [
    { title: 'Staging against production', stack: true, code: `<EnvDiff left={staging} right={production} />`,
      render: () => (<div className="w-full"><EnvDiff left={LEFT} right={RIGHT} /></div>) },
  ],
}

/* ------------------------------------------------------------- queue monitor */

const DEPTH = [180, 240, 320, 410, 520, 610, 780, 940, 1_120, 1_340, 1_610, 1_920]

export const queueMonitorEntry: ComponentEntry = {
  id: 'queue-monitor',
  label: 'Queue Monitor',
  description:
    'Depth, throughput and whether the queue is keeping up. Depth alone says nothing — 40,000 draining at 5,000/s is fine, 300 draining at 2/s is an incident.',
  usage: `import { QueueMonitor } from '@/components/ui/queue-monitor'

<QueueMonitor name="emails" depth={1920} arrivalRate={42} completionRate={61} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'depth', label: 'depth', default: 1920, min: 0, max: 100_000, step: 100 },
      { type: 'number', prop: 'arrival', label: 'arrivals /s', default: 42, min: 0, max: 500, step: 1 },
      { type: 'number', prop: 'completion', label: 'completions /s', default: 61, min: 0, max: 500, step: 1 },
      { type: 'number', prop: 'dead', label: 'dead letter', default: 12, min: 0, max: 500, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <QueueMonitor
          name="emails.outbound"
          depth={Number(state.depth)}
          processing={18}
          failed={94}
          deadLettered={Number(state.dead)}
          arrivalRate={Number(state.arrival)}
          completionRate={Number(state.completion)}
          oldestAt={ago(4_200)}
          history={DEPTH}
          now={NOW}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<QueueMonitor\n  name="emails"\n  depth={${state.depth}}\n  arrivalRate={${state.arrival}}\n  completionRate={${state.completion}}\n/>`,
  },
  api: [
    { name: 'arrivalRate / completionRate', type: 'per second', description: 'Together they give the drain estimate. Set completions below arrivals in the composer to watch it flip to "growing".' },
    { name: 'deadLettered', type: 'number', description: 'Never folded into `failed`. A retryable failure is noise; an exhausted job is lost work a human must decide about.' },
    { name: 'oldestAt', type: 'Date', description: 'Age of the oldest waiting job, not average wait — averages hide the one job stuck behind a poison message.' },
    { name: 'history', type: 'number[]', description: 'Optional depth sparkline.' },
  ],
  demos: [
    { title: 'A queue draining', stack: true, code: `<QueueMonitor name="emails.outbound" depth={1_920} arrivalRate={42} completionRate={61} />`,
      render: () => (<div className="w-full max-w-xl"><QueueMonitor name="emails.outbound" depth={1_920} processing={18} failed={94} deadLettered={12} arrivalRate={42} completionRate={61} history={DEPTH} now={NOW} /></div>) },
    { title: 'A queue backing up', stack: true, code: `<QueueMonitor name="webhooks.retry" depth={12_400} arrivalRate={310} completionRate={40} />`,
      render: () => (<div className="w-full max-w-xl"><QueueMonitor name="webhooks.retry" depth={12_400} processing={8} failed={1_902} deadLettered={340} arrivalRate={310} completionRate={40} history={[...DEPTH].reverse()} now={NOW} /></div>) },
  ],
}

/* ---------------------------------------------------------------- cache stats */

const HITS = [0.71, 0.74, 0.79, 0.82, 0.86, 0.88, 0.9, 0.91, 0.93, 0.94, 0.94, 0.95]

export const cacheStatsEntry: ComponentEntry = {
  id: 'cache-stats',
  label: 'Cache Stats',
  description:
    'Hit rate with the numbers behind it. 99% on 40 requests a day is noise and 80% on 4 million is a cost centre, so volume sits beside the percentage.',
  usage: `import { CacheStats } from '@/components/ui/cache-stats'

<CacheStats hits={3_812_400} misses={214_800} evictions={8_120} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'hits', label: 'hits', default: 3_812_400, min: 0, step: 10_000 },
      { type: 'number', prop: 'misses', label: 'misses', default: 214_800, min: 0, step: 1000 },
      { type: 'number', prop: 'evictions', label: 'evictions', default: 8_120, min: 0, step: 100 },
      { type: 'boolean', prop: 'history', label: 'sparkline', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <CacheStats
          hits={Number(state.hits)}
          misses={Number(state.misses)}
          evictions={Number(state.evictions)}
          keys={412_000}
          bytes={1_240_000_000}
          history={state.history ? HITS : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<CacheStats hits={${state.hits}} misses={${state.misses}} evictions={${state.evictions}} />`,
  },
  api: [
    { name: 'hits / misses', type: 'number', description: 'The rate is derived from them, so it cannot disagree with the counts printed underneath.' },
    { name: 'evictions', type: 'separate from misses', description: 'A miss means the key was never there; an eviction means the cache threw it away. Sizing problem, not warming problem — and a different fix.' },
    { name: 'history', type: 'number[]', description: 'Hit rate over time, 0–1 per sample.' },
    { name: 'bytes / keys', type: 'number', description: 'Optional footprint figures.' },
  ],
  demos: [
    { title: 'A warm cache', stack: true, code: `<CacheStats hits={182_400} misses={9_600} history={history} />`,
      render: () => (<div className="w-full max-w-xl"><CacheStats hits={182_400} misses={9_600} history={HITS} evictions={412} keys={48_200} /></div>) },
    { title: 'A cold one', stack: true, code: `<CacheStats hits={1_200} misses={18_400} />`,
      render: () => (<div className="w-full max-w-xl"><CacheStats hits={1_200} misses={18_400} history={[...HITS].map((h) => h * 0.3)} evictions={9_100} keys={2_400} /></div>) },
  ],
}

/* ------------------------------------------------------------ rate limit meter */

export const rateLimitMeterEntry: ComponentEntry = {
  id: 'rate-limit-meter',
  label: 'Rate Limit Meter',
  description:
    'A quota with its reset time given equal weight. "9,800 of 10,000" is alarming; "resets in 40 seconds" makes it fine — showing the first without the second sends people to build a cache they do not need.',
  usage: `import { RateLimitMeter } from '@/components/ui/rate-limit-meter'

<RateLimitMeter limit={10000} remaining={1840} resetAt={reset} windowSeconds={3600} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'limit', label: 'limit', default: 10_000, min: 1, step: 500 },
      { type: 'number', prop: 'remaining', label: 'remaining', default: 1840, min: 0, step: 100 },
      { type: 'number', prop: 'resetIn', label: 'resets in (s)', default: 620, min: 0, max: 3600, step: 20 },
      { type: 'number', prop: 'window', label: 'window (s)', default: 3600, min: 60, max: 86_400, step: 60 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <RateLimitMeter
          limit={Number(state.limit)}
          remaining={Number(state.remaining)}
          resetAt={ahead(Number(state.resetIn))}
          windowSeconds={Number(state.window)}
          now={NOW}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<RateLimitMeter\n  limit={${state.limit}}\n  remaining={${state.remaining}}\n  resetAt={reset}\n  windowSeconds={${state.window}}\n/>`,
  },
  api: [
    { name: 'remaining', type: 'the headline', description: 'Not used. Both are on screen, but remaining is what a caller acts on — inverting it costs a subtraction every glance.' },
    { name: 'windowSeconds', type: 'number', description: 'Enables the burn-rate projection: whether the quota runs out before the reset. Drop `remaining` low with a long window left to see it fire.' },
    { name: 'resetAt', type: 'Date', description: 'Given equal prominence to the count.' },
    { name: 'meter', type: 'role="meter"', description: 'With a window-elapsed marker for comparing spend against time.' },
  ],
  demos: [
    { title: 'Room to spare, and nearly out', stack: true, code: `<RateLimitMeter limit={5_000} remaining={4_120} resetAt={resetsAt} />
<RateLimitMeter limit={5_000} remaining={80} resetAt={resetsAt} />`,
      render: () => (<div className="flex w-full max-w-xl flex-col gap-3"><RateLimitMeter limit={5_000} remaining={4_120} resetAt={new Date(NOW.getTime() + 22 * 60_000)} now={NOW} /><RateLimitMeter limit={5_000} remaining={80} resetAt={new Date(NOW.getTime() + 4 * 60_000)} now={NOW} /></div>) },
  ],
}

/* --------------------------------------------------------- websocket frames */

const FRAMES: WsFrame[] = [
  { id: 'f1', direction: 'sent', opcode: 'text', data: '{"type":"subscribe","channel":"orders"}', at: ago(120) },
  { id: 'f2', direction: 'received', opcode: 'text', data: '{"type":"subscribed","channel":"orders"}', at: ago(119) },
  { id: 'f3', direction: 'received', opcode: 'ping', data: '', at: ago(104) },
  { id: 'f4', direction: 'sent', opcode: 'pong', data: '', at: ago(104) },
  { id: 'f5', direction: 'received', opcode: 'text', data: '{"type":"order","id":"ord_8812","total":4200}', at: ago(88) },
  { id: 'f6', direction: 'received', opcode: 'ping', data: '', at: ago(74) },
  { id: 'f7', direction: 'sent', opcode: 'pong', data: '', at: ago(74) },
  { id: 'f8', direction: 'received', opcode: 'text', data: '{"type":"order","id":"ord_8813","total":1890}', at: ago(31) },
  { id: 'f9', direction: 'received', opcode: 'close', data: '1006 abnormal closure', at: ago(1) },
]

export const webSocketFramesEntry: ComponentEntry = {
  id: 'websocket-frames',
  label: 'WebSocket Frames',
  description:
    'A frame log with the delta between frames. Protocol bugs are about the gap — a heartbeat that stopped arriving is obvious as a 30-second delta and invisible as a list of clock times.',
  usage: `import { WebSocketFrames } from '@/components/ui/websocket-frames'

<WebSocketFrames frames={frames} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'control', label: 'include ping/pong', default: false }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <WebSocketFrames frames={FRAMES} showControl={Boolean(state.control)} />
      </div>
    ),
    code: (state: ComposerState) =>
      `<WebSocketFrames frames={frames}${state.control ? ' showControl' : ''} />`,
  },
  api: [
    { name: 'frames', type: 'WsFrame[]', description: '`{ id, direction, opcode?, data, at, bytes? }`.' },
    { name: 'direction', type: 'arrow', description: 'Never colour alone — a frame log gets screenshotted into monochrome tickets, and "what did we send just before it broke" is the whole point. Rows stay flush so the payload column keeps a straight left edge.' },
    { name: 'showControl', type: 'boolean', default: 'false', description: 'Ping every 15 seconds buries the four frames that matter. Turn it on in the composer to see the difference.' },
    { name: 'delta', type: 'computed', description: 'Gap from the previous visible frame; over 30s is tinted.' },
  ],
}
