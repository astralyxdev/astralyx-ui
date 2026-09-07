import type { Alert } from '@/components/ui/alert-triage'
import type { AnomalyPoint } from '@/components/ui/anomaly-chart'
import type { CauseNode } from '@/components/ui/root-cause-tree'
import type { HealthCheck } from '@/components/ui/health-checks'
import type { PlanNode } from '@/components/ui/query-plan'
import type { RunbookStep } from '@/components/ui/runbook-steps'
import type { Service } from '@/components/ui/service-status'
import type { Shift } from '@/components/ui/on-call-schedule'
import type { SlowQuery } from '@/components/ui/slow-query-log'
import type { UptimeBucket } from '@/components/ui/uptime-strip'

/**
 * The fixture for Operations.
 *
 * One incident runs through the whole product: the alert that fired, the
 * incident it became, the runbook someone is working through, the root cause
 * they landed on, and the slow query underneath all of it. Every screen is
 * looking at the same Tuesday morning from a different angle, which is the only
 * way an operations tool is ever used.
 */
export const NOW = new Date('2026-09-07T09:00:00Z')

const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const ahead = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

export const ALERTS: Alert[] = [
  {
    id: 'a1',
    title: 'checkout-service p95 above 400ms',
    severity: 'critical',
    fingerprint: 'checkout:latency:p95',
    count: 214,
    source: 'Prometheus',
    firstSeen: ago(418),
    lastSeen: ago(2),
    detail: 'p95 has been over the 400ms objective continuously since 02:00 UTC. The 250ms warning threshold was crossed eleven minutes earlier.',
  },
  {
    id: 'a2',
    title: 'address-service returning 429',
    severity: 'critical',
    fingerprint: 'address:ratelimit',
    count: 8_912,
    source: 'Envoy',
    firstSeen: ago(420),
    lastSeen: ago(1),
    detail: 'Rate of 429 responses went from 0.4% to 11.2% at 02:00 UTC. No Retry-After header is being sent, so clients are not backing off.',
  },
  {
    id: 'a3',
    title: 'Replica lag above 10s',
    severity: 'warning',
    fingerprint: 'db:replica:lag',
    count: 42,
    source: 'Postgres exporter',
    firstSeen: ago(96),
    lastSeen: ago(4),
    acknowledged: true,
    detail: 'eu-west-2 replica is 14 seconds behind. Reads routed to it will be stale.',
  },
  {
    id: 'a4',
    title: 'Disk usage above 85% on cache-01',
    severity: 'warning',
    fingerprint: 'cache01:disk',
    count: 6,
    source: 'Node exporter',
    firstSeen: ago(1_440),
    lastSeen: ago(30),
    detail: '87% of 500 GB. Growth is 1.2 GB per day, so roughly seven days of headroom.',
  },
  {
    id: 'a5',
    title: 'Certificate expires in 12 days',
    severity: 'info',
    fingerprint: 'cert:api',
    count: 1,
    source: 'Cert manager',
    firstSeen: ago(2_880),
    lastSeen: ago(60),
    acknowledged: true,
  },
]

export type Incident = {
  id: string
  title: string
  severity: 'sev1' | 'sev2' | 'sev3' | 'sev4'
  state: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  startedAt: Date
  resolvedAt?: Date
  assignee: string
  services: string[]
  summary: string
}

export const INCIDENTS: Incident[] = [
  {
    id: 'INC-241',
    title: 'Checkout latency doubled',
    severity: 'sev2',
    state: 'identified',
    startedAt: ago(418),
    assignee: 'Grace Hopper',
    services: ['checkout-service', 'address-service'],
    summary:
      'p95 moved from 210ms to 480ms at 02:00 UTC. A batched address lookup deployed at 01:54 is driving the address service into rate limiting.',
  },
  {
    id: 'INC-240',
    title: 'Replica lag in eu-west-2',
    severity: 'sev3',
    state: 'monitoring',
    startedAt: ago(96),
    assignee: 'Alan Turing',
    services: ['postgres'],
    summary: 'A long vacuum on the primary put the replica 14 seconds behind. Lag is falling.',
  },
  {
    id: 'INC-239',
    title: 'Search returned empty results for 9 minutes',
    severity: 'sev2',
    state: 'resolved',
    startedAt: ago(2_760),
    resolvedAt: ago(2_751),
    assignee: 'Ada Lovelace',
    services: ['docs-search'],
    summary: 'An index rebuild swapped in an empty alias. Rolled back; the alias swap is now atomic.',
  },
]

export const RUNBOOK: RunbookStep[] = [
  { id: 'r1', title: 'Confirm the symptom', description: 'Check p95 on the checkout dashboard over the last hour.', status: 'done', output: 'p95 481ms, sustained.' },
  { id: 'r2', title: 'Check the deploy log', description: 'Anything shipped inside the window?', status: 'done', output: 'PR #4182 merged at 01:54 UTC.' },
  { id: 'r3', title: 'Check the address service error rate', description: 'A 429 rate above 5% means it is shedding.', status: 'done', output: '11.2%, up from 0.4%.' },
  { id: 'r4', title: 'Reduce the batch size to 50', description: 'The documented limit. Ships as a config change, no deploy.', status: 'running' },
  { id: 'r5', title: 'Roll back PR #4182', description: 'Only if the config change does not hold.', status: 'pending', confirm: true },
  { id: 'r6', title: 'Write the postmortem', status: 'pending' },
]

export const CAUSES: CauseNode[] = [
  {
    id: 'c1',
    label: 'Checkout p95 doubled',
    confidence: 1,
    children: [
      {
        id: 'c2',
        label: 'Address lookups are timing out',
        confidence: 0.92,
        detail: 'Each checkout makes one address call. Its p99 went from 40ms to 2.1s.',
        children: [
          {
            id: 'c3',
            label: 'address-service is rate limiting the caller',
            confidence: 0.88,
            detail: '429 rate 0.4% → 11.2% at 02:00 UTC, matching the latency step exactly.',
            children: [
              { id: 'c4', label: 'PR #4182 batches 200 lookups per request', confidence: 0.86, detail: 'The service documents a limit of 50 and returns 429 above it.' },
              { id: 'c5', label: 'No Retry-After, so the client never backs off', confidence: 0.61, detail: 'Every rejected batch costs a full client timeout rather than a fast retry.' },
            ],
          },
        ],
      },
      { id: 'c6', label: 'Database contention', confidence: 0.12, detail: 'Ruled out: checkout query times are flat across the window.' },
      { id: 'c7', label: 'Traffic increase', confidence: 0.04, detail: 'Ruled out: request rate is 3% below the same hour last week.' },
    ],
  },
]

const bucket = (status: UptimeBucket['status'], hour: number): UptimeBucket => ({
  label: `${String(hour).padStart(2, '0')}:00`,
  status,
})

export const UPTIME: UptimeBucket[] = [
  ...Array.from({ length: 26 }, (_, index) => bucket('up', index % 24)),
  ...Array.from({ length: 7 }, (_, index) => bucket('down', (index + 2) % 24)),
  ...Array.from({ length: 5 }, (_, index) => bucket('degraded', (index + 9) % 24)),
  ...Array.from({ length: 10 }, (_, index) => bucket('up', (index + 14) % 24)),
]

export const SERVICES: Service[] = [
  { id: 's1', name: 'checkout-service', state: 'degraded', description: 'p95 above objective since 02:00 UTC.', uptime: '99.21%', history: UPTIME },
  { id: 's2', name: 'address-service', state: 'degraded', description: 'Shedding load above 50 lookups per request.', uptime: '99.40%', history: UPTIME.slice(10) },
  { id: 's3', name: 'api-gateway', state: 'operational', uptime: '99.99%', history: UPTIME.map((entry) => ({ ...entry, status: 'up' as const })) },
  { id: 's4', name: 'docs-search', state: 'operational', uptime: '99.94%', history: UPTIME.map((entry, index) => ({ ...entry, status: index === 12 ? ('degraded' as const) : ('up' as const) })) },
  { id: 's5', name: 'postgres', state: 'maintenance', description: 'Vacuum running on the primary until 10:00 UTC.', uptime: '99.98%' },
]

export const HEALTH: HealthCheck[] = [
  { id: 'h1', name: 'api.astralyx.dev', url: 'https://api.astralyx.dev/health', status: 'healthy', latency: 84, latencyThreshold: 300, code: 200, region: 'eu-west-1', history: [78, 82, 80, 88, 84, 81, 84] },
  { id: 'h2', name: 'checkout', url: 'https://api.astralyx.dev/checkout/health', status: 'degraded', latency: 481, latencyThreshold: 300, code: 200, region: 'eu-west-1', history: [210, 214, 208, 402, 470, 486, 481] },
  { id: 'h3', name: 'address', url: 'https://address.internal/health', status: 'degraded', latency: 2_140, latencyThreshold: 500, code: 429, region: 'eu-west-1', history: [40, 44, 41, 980, 1_800, 2_200, 2_140] },
  { id: 'h4', name: 'search', url: 'https://search.astralyx.dev/health', status: 'healthy', latency: 62, latencyThreshold: 300, code: 200, region: 'eu-west-2', history: [58, 62, 60, 61, 64, 59, 62] },
]

export const ANOMALY: AnomalyPoint[] = [
  { value: 208, expected: [180, 260] },
  { value: 214, expected: [180, 260] },
  { value: 199, expected: [180, 260] },
  { value: 221, expected: [180, 260] },
  { value: 210, expected: [180, 260] },
  { value: 402, expected: [180, 260] },
  { value: 468, expected: [180, 265] },
  { value: 481, expected: [180, 265] },
  { value: 476, expected: [180, 265] },
  { value: 480, expected: [180, 270] },
  { value: 479, expected: [180, 270] },
  { value: 481, expected: [180, 270] },
]

export const ANOMALY_LABELS = ['20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00']

export const SHIFTS: Shift[] = [
  { id: 'sh1', person: 'Grace Hopper', layer: 'Primary', start: ago(480), end: ahead(240) },
  { id: 'sh2', person: 'Alan Turing', layer: 'Primary', start: ahead(240), end: ahead(960) },
  { id: 'sh3', person: 'Ada Lovelace', layer: 'Secondary', start: ago(480), end: ahead(960) },
]

export const SLOW_QUERIES: SlowQuery[] = [
  { id: 'q1', statement: 'SELECT * FROM addresses WHERE customer_id = ANY($1)', calls: 41_820, meanMs: 148, p95Ms: 2_140, rows: 200, seqScan: true, meta: 'address-service' },
  { id: 'q2', statement: 'SELECT id, total FROM orders WHERE created_at > $1 ORDER BY created_at DESC LIMIT 50', calls: 12_400, meanMs: 18, p95Ms: 42, rows: 50 },
  { id: 'q3', statement: 'UPDATE carts SET updated_at = now() WHERE id = $1', calls: 88_100, meanMs: 4, p95Ms: 11, rows: 1 },
  { id: 'q4', statement: 'SELECT count(*) FROM events WHERE occurred_at BETWEEN $1 AND $2', calls: 640, meanMs: 910, p95Ms: 2_800, rows: 1, seqScan: true, meta: 'analytics' },
]

export const PLAN: PlanNode = {
  id: 'p0',
  operation: 'Nested Loop',
  estimatedRows: 200,
  actualRows: 200,
  cost: 2_140,
  actualMs: 2_141,
  children: [
    {
      id: 'p1',
      operation: 'Seq Scan',
      relation: 'addresses',
      estimatedRows: 1_200,
      actualRows: 1_840_000,
      cost: 2_090,
      actualMs: 2_088,
    },
    {
      id: 'p2',
      operation: 'Index Scan',
      relation: 'customers_pkey',
      estimatedRows: 1,
      actualRows: 1,
      cost: 8,
      actualMs: 0.4,
    },
  ],
}

export const DEFAULT_SQL = `-- The query the address service runs once per checkout.
EXPLAIN ANALYZE
SELECT *
FROM addresses
WHERE customer_id = ANY($1);`

export const REPLICAS = [
  { id: 'r1', name: 'eu-west-1b', region: 'eu-west-1', lagSeconds: 0.4, lagBytes: 1_204_000, state: 'streaming' as const },
  { id: 'r2', name: 'eu-west-2a', region: 'eu-west-2', lagSeconds: 14.2, lagBytes: 41_900_000, state: 'streaming' as const },
  { id: 'r3', name: 'us-east-1a', region: 'us-east-1', lagSeconds: 1.1, lagBytes: 3_100_000, state: 'streaming' as const },
]

export const TIMELINE = [
  { id: 't1', at: '01:54', title: 'PR #4182 merged and deployed', tone: 'default' as const, who: 'CI' },
  { id: 't2', at: '02:00', title: 'address-service 429 rate crosses 5%', tone: 'warning' as const, who: 'Envoy' },
  { id: 't3', at: '02:11', title: 'checkout p95 crosses the 250ms warning', tone: 'warning' as const, who: 'Prometheus' },
  { id: 't4', at: '02:20', title: 'Paged: checkout p95 above 400ms', tone: 'danger' as const, who: 'PagerDuty' },
  { id: 't5', at: '02:24', title: 'Grace Hopper acknowledged', tone: 'info' as const, who: 'PagerDuty' },
  { id: 't6', at: '08:41', title: 'Cause identified — batch size exceeds the documented limit', tone: 'success' as const, who: 'Grace Hopper' },
  { id: 't7', at: '08:52', title: 'Reducing the batch size to 50', tone: 'info' as const, who: 'Grace Hopper' },
]
