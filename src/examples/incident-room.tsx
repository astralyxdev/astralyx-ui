import { useMemo, useState } from 'react'
import {
  Activity, BellOff, CalendarClock, ListChecks, Network, PhoneCall, Radio,
  ShieldAlert, Siren, TriangleAlert, Undo2, Waves,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { AlertTriage, type Alert as TriageAlert } from '@/components/ui/alert-triage'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HealthChecks, type HealthCheck } from '@/components/ui/health-checks'
import { IncidentCard } from '@/components/ui/incident-card'
import { OnCallSchedule, type Shift } from '@/components/ui/on-call-schedule'
import { QueueMonitor } from '@/components/ui/queue-monitor'
import { ResourceMeter } from '@/components/ui/resource-meter'
import { RootCauseTree, type CauseNode } from '@/components/ui/root-cause-tree'
import { RunbookSteps, type RunbookStep } from '@/components/ui/runbook-steps'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ServiceStatus, type Service } from '@/components/ui/service-status'
import { SloBudget } from '@/components/ui/slo-budget'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Terminal } from '@/components/ui/terminal'
import { TopologyMap, type TopologyNode } from '@/components/ui/topology-map'
import { UptimeStrip, type UptimeBucket } from '@/components/ui/uptime-strip'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * Every timestamp on this page hangs off one frozen constant.
 *
 * The examples are prerendered, so a `new Date()` at module scope produces one
 * "14 minutes ago" on the server and a different one in the browser — React
 * throws away the whole tree over that mismatch. A fixed `now`, passed to every
 * component that formats a relative time, renders identically in both places.
 */
const NOW = new Date('2026-09-05T14:20:00')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

const INCIDENT_START = new Date('2026-09-05T13:42:00')

const NAV: NavItem[] = [
  { id: 'incidents', label: 'Incidents', icon: <Siren />, count: 2 },
  { id: 'alerts', label: 'Alerts', icon: <Radio />, count: 14 },
  { id: 'services', label: 'Services', icon: <Network /> },
  { id: 'runbooks', label: 'Runbooks', icon: <ListChecks /> },
  { id: 'schedules', label: 'Schedules', icon: <CalendarClock /> },
  { id: 'postmortems', label: 'Postmortems', icon: <ShieldAlert /> },
]

/* ------------------------------------------------------------------ alerts */

const ALERTS: TriageAlert[] = [
  {
    id: 'a1',
    title: 'checkout-api 5xx ratio 4.2% (SLO burn 14×)',
    severity: 'critical',
    fingerprint: 'checkout-5xx',
    count: 214,
    source: 'prometheus / checkout',
    firstSeen: minutesAgo(38),
    lastSeen: minutesAgo(1),
    detail: (
      <Terminal
        copyable={false}
        content={'sum(rate(http_requests_total{job="checkout-api",code=~"5.."}[5m]))\n  / sum(rate(http_requests_total{job="checkout-api"}[5m]))\n= 0.0421  (threshold 0.01)'}
      />
    ),
  },
  {
    id: 'a2',
    title: 'payments-worker connection pool exhausted — 128 waiters',
    severity: 'critical',
    fingerprint: 'payments-pool',
    count: 96,
    source: 'prometheus / payments',
    firstSeen: minutesAgo(36),
    lastSeen: minutesAgo(2),
    detail: (
      <Terminal
        copyable={false}
        content={'HikariPool-1 - Connection is not available, request timed out after 30001ms\n  at com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:696)\n  at acme.payments.ChargeGateway.authorize(ChargeGateway.java:118)'}
      />
    ),
  },
  {
    id: 'a3',
    title: 'p99 latency 1.84s on POST /v2/checkout (target 400ms)',
    severity: 'warning',
    fingerprint: 'checkout-latency',
    count: 41,
    source: 'grafana / edge',
    firstSeen: minutesAgo(34),
    lastSeen: minutesAgo(1),
  },
  {
    id: 'a4',
    title: 'emails.outbound queue depth 1,920 and growing',
    severity: 'warning',
    fingerprint: 'queue-depth',
    count: 12,
    source: 'sqs / eu-west-1',
    firstSeen: minutesAgo(22),
    lastSeen: minutesAgo(3),
  },
  {
    id: 'a5',
    title: 'catalog-api pod restarted (OOMKilled, limit 512Mi)',
    severity: 'warning',
    fingerprint: 'catalog-oom',
    count: 3,
    source: 'kubernetes / eu-west-1',
    firstSeen: minutesAgo(140),
    lastSeen: minutesAgo(61),
    acknowledged: true,
  },
  {
    id: 'a6',
    title: 'TLS certificate for edge-eu-west-1 expires in 12 days',
    severity: 'info',
    fingerprint: 'cert-expiry',
    count: 1,
    source: 'cert-manager',
    firstSeen: minutesAgo(600),
    lastSeen: minutesAgo(600),
  },
]

/* ------------------------------------------------------- per-service detail */

/**
 * Ninety uptime buckets built from a deterministic pattern rather than random
 * values: a random strip re-rolls between the server render and the client one,
 * and the whole point of the strip is that yesterday looks the same today.
 */
const uptimeHistory = (badDays: number[], degradedDays: number[]): UptimeBucket[] =>
  Array.from({ length: 90 }, (_, index) => {
    const day = 89 - index
    const status = badDays.includes(day) ? 'down' : degradedDays.includes(day) ? 'degraded' : 'up'
    return {
      label: day === 0 ? 'today' : `${day} days ago`,
      status,
      detail:
        status === 'up'
          ? 'No incidents'
          : status === 'down'
            ? 'Outage — 41m'
            : 'Elevated latency',
    }
  })

const CHECKOUT_HISTORY = uptimeHistory([0, 47], [12, 46])
const PAYMENTS_HISTORY = uptimeHistory([0, 1, 47], [2, 33])
const GATEWAY_HISTORY = uptimeHistory([], [0, 47])

type Focus = {
  id: string
  label: string
  owner: string
  checks: HealthCheck[]
  history: UptimeBucket[]
  slo: { target: number; actual: number; burnRate: number; hint: string }
  queue: {
    name: string
    depth: number
    processing: number
    failed: number
    deadLettered: number
    arrivalRate: number
    completionRate: number
    oldestAt: Date
    history: number[]
  }
  meters: { label: string; used: number; cap: number; unit: 'number' | 'bytes' | 'duration'; hint: string }[]
}

const FOCUS: Focus[] = [
  {
    id: 'checkout-api',
    label: 'checkout-api',
    owner: 'Payments Platform',
    checks: [
      { id: 'c1', name: 'checkout /health', url: 'https://api.acme.dev/v2/checkout/health', status: 'degraded', latency: 1840, latencyThreshold: 400, code: 200, region: 'eu-west-1', history: [212, 264, 390, 880, 1420, 1710, 1840] },
      { id: 'c2', name: 'checkout /health', url: 'https://api.acme.dev/v2/checkout/health', status: 'healthy', latency: 118, latencyThreshold: 400, code: 200, region: 'us-east-1', history: [104, 112, 118, 121, 116, 114, 118] },
      { id: 'c3', name: 'cart /health', url: 'https://api.acme.dev/v2/cart/health', status: 'healthy', latency: 64, code: 200, region: 'eu-west-1', history: [58, 61, 66, 62, 64, 63, 64] },
    ],
    history: CHECKOUT_HISTORY,
    slo: { target: 0.999, actual: 0.9962, burnRate: 14.2, hint: 'At this burn rate the 30-day budget is gone by 18:10 UTC.' },
    queue: {
      name: 'checkout.orders',
      depth: 1_920,
      processing: 18,
      failed: 94,
      deadLettered: 12,
      arrivalRate: 62,
      completionRate: 41,
      oldestAt: minutesAgo(31),
      history: [180, 240, 320, 410, 520, 610, 780, 940, 1_120, 1_340, 1_610, 1_920],
    },
    meters: [
      { label: 'Pod CPU', used: 3.8, cap: 4, unit: 'number', hint: '4 vCPU limit across 12 replicas' },
      { label: 'Heap', used: 1_820_000_000, cap: 2_147_483_648, unit: 'bytes', hint: 'GC pauses above 1.6 GB' },
    ],
  },
  {
    id: 'payments-worker',
    label: 'payments-worker',
    owner: 'Payments Platform',
    checks: [
      { id: 'p1', name: 'worker /live', url: 'https://payments.internal/live', status: 'healthy', latency: 22, code: 200, region: 'eu-west-1', history: [21, 20, 24, 22, 23, 21, 22] },
      { id: 'p2', name: 'provider authorize', url: 'https://api.stripe-mock.dev/v1/charges', status: 'down', code: 503, region: 'eu-west-1', history: [180, 220, 410, 980, 0, 0, 0] },
      { id: 'p3', name: 'ledger write', url: 'https://ledger.internal/health', status: 'degraded', latency: 940, latencyThreshold: 250, code: 200, region: 'eu-west-1', history: [180, 210, 260, 420, 610, 810, 940] },
    ],
    history: PAYMENTS_HISTORY,
    slo: { target: 0.995, actual: 0.9814, burnRate: 31.6, hint: 'Budget already spent — every further failure is customer-visible.' },
    queue: {
      name: 'payments.authorizations',
      depth: 4_260,
      processing: 6,
      failed: 812,
      deadLettered: 147,
      arrivalRate: 88,
      completionRate: 11,
      oldestAt: minutesAgo(37),
      history: [40, 90, 220, 480, 910, 1_400, 1_980, 2_540, 3_100, 3_610, 3_980, 4_260],
    },
    meters: [
      { label: 'Connection pool', used: 128, cap: 100, unit: 'number', hint: '128 waiters against a 100-connection pool' },
      { label: 'Retry budget', used: 100, cap: 100, unit: 'number', hint: 'Exhausted at 13:51 UTC' },
    ],
  },
  {
    id: 'edge-gateway',
    label: 'edge-gateway',
    owner: 'Infrastructure',
    checks: [
      { id: 'g1', name: 'edge /ping', url: 'https://edge.acme.dev/ping', status: 'healthy', latency: 18, code: 200, region: 'eu-west-1', history: [17, 18, 19, 18, 18, 17, 18] },
      { id: 'g2', name: 'edge /ping', url: 'https://edge.acme.dev/ping', status: 'healthy', latency: 24, code: 200, region: 'ap-south-1', history: [23, 25, 24, 26, 24, 23, 24] },
      { id: 'g3', name: 'origin shield', url: 'https://shield.acme.dev/health', status: 'degraded', latency: 610, latencyThreshold: 300, code: 200, region: 'eu-west-1', history: [180, 220, 280, 340, 480, 560, 610] },
    ],
    history: GATEWAY_HISTORY,
    slo: { target: 0.9995, actual: 0.9997, burnRate: 0.4, hint: 'The gateway is passing traffic; it is the origin that is slow.' },
    queue: {
      name: 'edge.purge',
      depth: 84,
      processing: 12,
      failed: 0,
      deadLettered: 0,
      arrivalRate: 9,
      completionRate: 26,
      oldestAt: minutesAgo(2),
      history: [210, 190, 160, 148, 132, 120, 112, 104, 96, 92, 88, 84],
    },
    meters: [
      { label: 'Upstream connections', used: 6_400, cap: 12_000, unit: 'number', hint: 'Headroom for the retry storm' },
      { label: 'Cache hit ratio budget', used: 41, cap: 100, unit: 'number', hint: 'Misses are landing on a slow origin' },
    ],
  },
]

/* ------------------------------------------------------------- diagnostics */

const CAUSES: CauseNode[] = [
  {
    id: 'symptom',
    label: 'checkout-api 5xx ratio 4.2%',
    confidence: 1,
    detail: 'Started 13:42 UTC, eu-west-1 only.',
    children: [
      {
        id: 'provider',
        label: 'Payment provider returning 503 on /v1/charges',
        confidence: 0.91,
        children: [
          { id: 'status-page', label: 'Provider status page: "degraded — EU acquiring"', confidence: 0.95 },
          { id: 'retry', label: 'Retry budget exhausted after 3 attempts', confidence: 0.72, detail: 'Retries turned a provider blip into a self-inflicted load spike.' },
        ],
      },
      {
        id: 'pool',
        label: 'payments-worker pool saturation (128 waiters)',
        confidence: 0.68,
        children: [
          { id: 'blocked', label: 'Threads blocked 30s on authorize()', confidence: 0.74 },
          { id: 'ledger', label: 'Slow ledger write — orders.append p99 940ms', confidence: 0.44 },
        ],
      },
      { id: 'deploy', label: 'Deploy 8f21c4a to checkout-api at 13:36', confidence: 0.18, detail: 'Timing is close, but the same build is healthy in us-east-1.' },
    ],
  },
]

const TOPOLOGY: TopologyNode[] = [
  { id: 'cdn', label: 'CDN', status: 'healthy' },
  { id: 'gateway', label: 'edge-gateway', status: 'degraded', dependsOn: ['cdn'], meta: 'origin shield 610ms' },
  { id: 'checkout', label: 'checkout-api', status: 'down', dependsOn: ['gateway'], meta: '5xx 4.2%' },
  { id: 'catalog', label: 'catalog-api', status: 'healthy', dependsOn: ['gateway'] },
  { id: 'payments', label: 'payments-worker', status: 'down', dependsOn: ['checkout'], meta: 'provider 503' },
  { id: 'ledger', label: 'ledger-db', status: 'degraded', dependsOn: ['payments'], meta: 'write p99 940ms' },
  { id: 'catalogdb', label: 'catalog-db', status: 'healthy', dependsOn: ['catalog'] },
]

const RUNBOOK: RunbookStep[] = [
  {
    id: 'r1',
    title: 'Confirm the provider is the source',
    description: 'Check status.provider.com and the authorize() error rate in eu-west-1.',
    status: 'done',
    output: <Terminal copyable={false} content={'authorize_errors{region="eu-west-1"} 0.94\nauthorize_errors{region="us-east-1"} 0.00'} />,
  },
  {
    id: 'r2',
    title: 'Shed retries — cap the retry budget at 1 attempt',
    description: 'Stops the self-inflicted load while the provider recovers.',
    status: 'pending',
  },
  {
    id: 'r3',
    title: 'Scale checkout-api to 24 replicas',
    description: 'Absorbs the queued authorizations once retries are capped.',
    status: 'pending',
  },
  {
    id: 'r4',
    title: 'Drain and recycle the payments-worker pool',
    description: 'Clears the 128 sockets stuck in CLOSE_WAIT. Drops in-flight authorizations.',
    status: 'pending',
    confirm: true,
  },
  {
    id: 'r5',
    title: 'Re-open checkout in eu-west-1',
    description: 'Remove the maintenance response from the edge and watch the 5xx ratio for 10 minutes.',
    status: 'pending',
    confirm: true,
  },
]

/** Output the runbook reveals once a step has actually been run. */
const STEP_OUTPUT: Record<string, string> = {
  r2: 'kubectl -n prod set env deploy/payments-worker RETRY_MAX=1\ndeployment.apps/payments-worker env updated',
  r3: 'kubectl -n prod scale deploy/checkout-api --replicas=24\ndeployment.apps/checkout-api scaled',
  r4: 'payments-worker: draining HikariPool-1 (128 waiters)\npool recycled — 100 idle connections',
  r5: 'edge: removed maintenance route for /v2/checkout in eu-west-1\n5xx ratio 0.31% and falling',
}

/* ------------------------------------------------------------- on call etc */

const WINDOW_START = new Date('2026-09-01T09:00:00')
const WINDOW_END = new Date('2026-09-08T09:00:00')

const SHIFTS: Shift[] = [
  { id: 's1', person: 'Grace Hopper', layer: 'Primary', start: new Date('2026-09-01T09:00:00'), end: new Date('2026-09-05T09:00:00') },
  { id: 's2', person: 'Ada Lovelace', layer: 'Primary', start: new Date('2026-09-05T09:00:00'), end: new Date('2026-09-08T09:00:00') },
  { id: 's3', person: 'Alan Turing', layer: 'Secondary', start: new Date('2026-09-01T09:00:00'), end: new Date('2026-09-06T09:00:00') },
  { id: 's4', person: 'Katherine Johnson', layer: 'Secondary', start: new Date('2026-09-06T09:00:00'), end: new Date('2026-09-08T09:00:00') },
]

const RESPONDERS = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Margaret Hamilton', 'Barbara Liskov']

const INCIDENT_STATES = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified', label: 'Identified' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'resolved', label: 'Resolved' },
] as const

type IncidentState = (typeof INCIDENT_STATES)[number]['value']

function IncidentRoom() {
  const [section, setSection] = useState('incidents')
  const [alerts, setAlerts] = useState(ALERTS)
  const [silenced, setSilenced] = useState<TriageAlert[]>([])
  const [steps, setSteps] = useState(RUNBOOK)
  const [focusId, setFocusId] = useState(FOCUS[0].id)
  const [state, setState] = useState<IncidentState>('investigating')

  const focus = FOCUS.find((entry) => entry.id === focusId) ?? FOCUS[0]

  // The banner, the nav count and the triage meter all read from one derived
  // number, so acknowledging an alert cannot leave three of them disagreeing.
  const openCritical = alerts.filter(
    (alert) => alert.severity === 'critical' && !alert.acknowledged,
  ).length
  const acked = alerts.filter((alert) => alert.acknowledged).length

  const remaining = steps.filter((step) => step.status === 'pending').length
  const remediated = remaining === 0

  /**
   * Service state follows the work done on this page rather than sitting in a
   * constant. A status board that still says "outage" after the responder has
   * worked the runbook is the thing everyone stops trusting.
   */
  const services: Service[] = useMemo(
    () => [
      { id: 'checkout', name: 'Checkout', state: remediated ? 'degraded' : 'outage', description: remediated ? 'Recovering — 5xx ratio 0.31% and falling' : 'HTTP 5xx on POST /v2/checkout in eu-west-1', history: CHECKOUT_HISTORY, uptime: '99.62%' },
      { id: 'payments', name: 'Payments', state: remediated ? 'degraded' : 'outage', description: remediated ? 'Retries capped, provider still degraded' : 'Provider returning 503 for EU acquiring', history: PAYMENTS_HISTORY, uptime: '98.14%' },
      { id: 'catalog', name: 'Catalog', state: 'operational', history: GATEWAY_HISTORY, uptime: '99.98%' },
      { id: 'edge', name: 'Edge & CDN', state: 'degraded', description: 'Origin shield p99 610ms', history: GATEWAY_HISTORY, uptime: '99.97%' },
      { id: 'registry', name: 'Package registry', state: 'maintenance', description: 'Scheduled maintenance until 16:00 UTC', history: GATEWAY_HISTORY, uptime: '99.99%' },
    ],
    [remediated],
  )

  const acknowledge = (ids: string[]) =>
    setAlerts((current) =>
      current.map((alert) => (ids.includes(alert.id) ? { ...alert, acknowledged: true } : alert)),
    )

  // Silencing removes the row but keeps the alert, so the undo below can put it
  // back — a silence during an incident is very often a misclick.
  const silence = (ids: string[]) => {
    setSilenced((current) => [...current, ...alerts.filter((alert) => ids.includes(alert.id))])
    setAlerts((current) => current.filter((alert) => !ids.includes(alert.id)))
  }

  const restore = () => {
    setAlerts((current) =>
      [...current, ...silenced].sort(
        (a, b) => ALERTS.findIndex((x) => x.id === a.id) - ALERTS.findIndex((x) => x.id === b.id),
      ),
    )
    setSilenced([])
  }

  const runStep = (id: string) =>
    setSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              status: 'done' as const,
              output: STEP_OUTPUT[id] ? <Terminal copyable={false} content={STEP_OUTPUT[id]} /> : step.output,
            }
          : step,
      ),
    )

  const skipStep = (id: string) =>
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, status: 'skipped' as const } : step)),
    )

  return (
    <AppFrame
      inset
      product="Signal"
      nav={NAV.map((item) => (item.id === 'alerts' ? { ...item, count: alerts.length } : item))}
      active={section}
      onNavigate={setSection}
      title={
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold">INC-2291 · Checkout 5xx</h1>
          <Badge size="sm" color="destructive">
            sev1
          </Badge>
        </div>
      }
      user={{ name: 'Ada Lovelace', plan: 'Primary on call' }}
      actions={
        <div className="flex items-center gap-2">
          <Select
            variant="secondary"
            size="sm"
            value={state}
            onValueChange={(value) => setState(value as IncidentState)}
            className="hidden w-40 sm:block"
            options={INCIDENT_STATES.map((option) => ({ ...option }))}
          />
          <Button size="sm" variant="secondary">
            <PhoneCall /> Page secondary
          </Button>
          <Button size="sm" color="destructive" variant="colored">
            <Siren /> Escalate
          </Button>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <OnCallSchedule
            shifts={SHIFTS}
            start={WINDOW_START}
            end={WINDOW_END}
            now={NOW}
            title="Rotation"
          />

          <Card>
            <CardHeader>
              <CardTitle as="h2">Triage progress</CardTitle>
              <CardDescription>Acknowledged alerts in this incident.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <ResourceMeter
                label="Acknowledged"
                used={acked}
                // Silencing can empty the queue; a zero cap would divide the
                // meter's width by nothing and paint a NaN bar.
                cap={Math.max(alerts.length, 1)}
                size="sm"
                hint={openCritical > 0 ? `${openCritical} critical still unacked` : 'Every critical is owned'}
              />
              <ResourceMeter
                label="Runbook steps"
                used={steps.length - remaining}
                cap={steps.length}
                size="sm"
                hint={remaining > 0 ? `${remaining} left to run` : 'Runbook complete'}
              />
              <Separator label="responders" />
              <AvatarGroup size="sm" max={4}>
                {RESPONDERS.map((name) => (
                  <Avatar key={name} name={name} />
                ))}
              </AvatarGroup>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">{focus.label}</CardTitle>
              <CardDescription>Owned by {focus.owner}.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              {focus.meters.map((meter) => (
                <ResourceMeter
                  key={meter.label}
                  label={meter.label}
                  used={meter.used}
                  cap={meter.cap}
                  unit={meter.unit}
                  hint={meter.hint}
                  size="sm"
                />
              ))}
            </CardBody>
          </Card>
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        {openCritical > 0 ? (
          <Alert
            color="destructive"
            icon={<TriangleAlert />}
            title={`${openCritical} critical alert${openCritical === 1 ? '' : 's'} unacknowledged`}
          >
            Nobody has taken these yet. Acknowledging one stops the escalation timer and puts your
            name on it in the timeline.
          </Alert>
        ) : (
          <Alert color="green" icon={<ShieldAlert />} title="Every critical alert is owned">
            Escalation paused. The next page fires only if a new fingerprint appears.
          </Alert>
        )}

        <IncidentCard
          title="Checkout returning 5xx after payment provider timeouts"
          severity="sev1"
          state={state}
          startedAt={INCIDENT_START}
          resolvedAt={state === 'resolved' ? NOW : undefined}
          assignee="Ada Lovelace"
          services={['checkout-api', 'payments-worker', 'ledger-db']}
          now={NOW}
          summary="EU acquiring is returning 503 on authorize(). Retries exhausted the payments-worker pool, and checkout now fails ahead of the payment call. US traffic is unaffected."
        />

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle as="h2">Alert queue</CardTitle>
              <CardDescription>
                Grouped by fingerprint — the 5xx alert alone has fired 214 times.
              </CardDescription>
            </div>
            {silenced.length > 0 && (
              <Button size="sm" variant="secondary" onClick={restore}>
                <Undo2 /> Restore {silenced.length} silenced
              </Button>
            )}
          </CardHeader>
          <CardBody>
            <AlertTriage
              alerts={alerts}
              now={NOW}
              onAcknowledge={acknowledge}
              onSilence={silence}
            />
            {silenced.length > 0 && (
              <p className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                <BellOff className="size-3.5" />
                {silenced.map((alert) => alert.source).join(', ')} silenced for this incident.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle as="h2">Impact by service</CardTitle>
              <CardDescription>Probes, budget and backlog for the service you pick.</CardDescription>
            </div>
            <Badge size="sm" color="neutral" icon={<Activity />}>
              eu-west-1
            </Badge>
          </CardHeader>

          {/* One controlled Tabs rather than three independent panels: the aside
              meters read the same `focusId`, so picking a service moves the
              whole detail column at once. */}
          <Tabs value={focusId} onValueChange={setFocusId} className="gap-0">
            <div className="border-border border-b px-4.5 py-2">
              <TabsList variant="underline">
                {FOCUS.map((entry) => (
                  <TabsTrigger key={entry.id} value={entry.id} variant="underline">
                    {entry.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {FOCUS.map((entry) => (
              <TabsContent key={entry.id} value={entry.id} className="space-y-5 p-4.5">
                <HealthChecks checks={entry.checks} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <SloBudget
                    target={entry.slo.target}
                    actual={entry.slo.actual}
                    burnRate={entry.slo.burnRate}
                    window="30 days"
                    label={`${entry.label} availability`}
                    hint={entry.slo.hint}
                  />
                  <QueueMonitor
                    name={entry.queue.name}
                    depth={entry.queue.depth}
                    processing={entry.queue.processing}
                    failed={entry.queue.failed}
                    deadLettered={entry.queue.deadLettered}
                    arrivalRate={entry.queue.arrivalRate}
                    completionRate={entry.queue.completionRate}
                    oldestAt={entry.queue.oldestAt}
                    history={entry.queue.history}
                    now={NOW}
                  />
                </div>

                <UptimeStrip
                  buckets={entry.history}
                  label={`${entry.label} — 90 days`}
                  summary={`${(entry.slo.actual * 100).toFixed(2)}%`}
                />
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Root cause</CardTitle>
              <CardDescription>Correlation scores, not calibrated probabilities.</CardDescription>
            </CardHeader>
            <CardBody>
              <RootCauseTree causes={CAUSES} defaultExpanded={['symptom', 'provider']} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Blast radius</CardTitle>
              <CardDescription>Follow the red edges down to the cause.</CardDescription>
            </CardHeader>
            <CardBody>
              <TopologyMap nodes={TOPOLOGY} />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle as="h2">Remediation</CardTitle>
              <CardDescription>
                Steps run in order — the runbook exists to stop step four happening first.
              </CardDescription>
            </div>
            {remediated && (
              <Badge size="sm" color="green" icon={<Waves />}>
                ready to monitor
              </Badge>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            <RunbookSteps
              steps={steps}
              onRun={runStep}
              onSkip={skipStep}
              title="Payment provider degradation"
            />
            {remediated && state !== 'monitoring' && state !== 'resolved' && (
              <Alert color="blue" icon={<Radio />} title="Runbook complete">
                Move the incident to <strong>Monitoring</strong> and hold for ten minutes of clean
                error rate before you resolve it.
              </Alert>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Public status page</CardTitle>
            <CardDescription>What customers can see right now.</CardDescription>
          </CardHeader>
          <CardBody>
            <ServiceStatus services={services} />
          </CardBody>
        </Card>
      </div>
    </AppFrame>
  )
}

export const incidentRoomExample: ExampleEntry = {
  id: 'incident-room',
  label: 'Incident Room',
  description:
    'The on-call view during a live sev1: a grouped alert queue you can acknowledge and silence, a per-service detail column, root cause and topology, and a runbook that drives the public status board as you work it.',
  uses: [
    'Alert Triage', 'Incident Card', 'On-call Schedule', 'Runbook Steps',
    'Root Cause Tree', 'Service Status', 'Uptime Strip', 'Health Checks',
    'SLO Budget', 'Topology Map', 'Resource Meter', 'Queue Monitor',
  ],
  render: () => <IncidentRoom />,
}
