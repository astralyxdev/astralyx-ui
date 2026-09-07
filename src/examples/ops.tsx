import { useState } from 'react'
import {
  Activity, AlarmClock, ArrowLeft, BellRing, Database, HeartPulse, Server, Siren,
} from 'lucide-react'
import { AlertTriage } from '@/components/ui/alert-triage'
import { AnomalyChart } from '@/components/ui/anomaly-chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectionPool } from '@/components/ui/connection-pool'
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Drawer, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Fmt } from '@/components/ui/fmt'
import { HealthChecks } from '@/components/ui/health-checks'
import { IncidentCard } from '@/components/ui/incident-card'
import { OnCallSchedule } from '@/components/ui/on-call-schedule'
import { QueryEditor } from '@/components/ui/query-editor'
import { QueryPlan } from '@/components/ui/query-plan'
import { ReplicationStatus } from '@/components/ui/replication-status'
import { RootCauseTree } from '@/components/ui/root-cause-tree'
import { RunbookSteps } from '@/components/ui/runbook-steps'
import { ServiceStatus } from '@/components/ui/service-status'
import { SloBudget } from '@/components/ui/slo-budget'
import { SlowQueryLog } from '@/components/ui/slow-query-log'
import { Stat } from '@/components/ui/stat'
import { Timeline, TimelineItem } from '@/components/ui/timeline'
import { UptimeStrip } from '@/components/ui/uptime-strip'
import {
  ALERTS, ANOMALY, ANOMALY_LABELS, CAUSES, DEFAULT_SQL, HEALTH, INCIDENTS, NOW, PLAN, REPLICAS,
  RUNBOOK, SERVICES, SHIFTS, SLOW_QUERIES, TIMELINE, UPTIME, type Incident,
} from './ops-data'
import {
  Page, PageHead, Section, SelectField, Shell, TextareaField, useNotify, useRoute, type Crumb, type Nav,
} from './shell'
import { type ExampleEntry } from './types'

/**
 * Operations — one Tuesday morning, from five angles.
 *
 * The same incident runs through every section: the alert that fired, the
 * incident it became, the runbook someone is halfway through, the cause tree
 * they landed on, and the query underneath all of it. That continuity is the
 * point — an operations tool is never used one screen at a time, and a set of
 * screens whose numbers disagree is worse than useless during an outage.
 */

/* ------------------------------------------------------------------- alerts */

function Alerts() {
  const notify = useNotify()
  const [alerts, setAlerts] = useState(ALERTS)

  const firing = alerts.filter((alert) => !alert.acknowledged).length
  const critical = alerts.filter((alert) => alert.severity === 'critical').length

  return (
    <Page>
      <PageHead
        title="Alerts"
        description="Five firing, grouped by fingerprint so a flapping check counts once."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Firing" value={firing} goodDirection="down" />
        <Stat label="Critical" value={critical} goodDirection="down" />
        <Stat label="Acknowledged" value={alerts.length - firing} goodDirection="up" />
        <Stat label="Mean time to ack" value={4} hint="Minutes, last 30 days" />
      </div>

      <Section>
        <AlertTriage
          alerts={alerts}
          now={NOW}
          onAcknowledge={(ids) => {
            setAlerts((current) =>
              current.map((alert) => (ids.includes(alert.id) ? { ...alert, acknowledged: true } : alert)),
            )
            notify('Acknowledged', `${ids.length} alert${ids.length === 1 ? '' : 's'} — paging stops.`, 'green')
          }}
          onSilence={(ids) => {
            setAlerts((current) => current.filter((alert) => !ids.includes(alert.id)))
            notify('Silenced', `${ids.length} alert${ids.length === 1 ? '' : 's'} muted for 4 hours.`)
          }}
        />
      </Section>

      <Card>
        <CardHeader>
          <CardTitle>checkout-service p95, against its expected range</CardTitle>
        </CardHeader>
        <CardBody>
          <AnomalyChart
            points={ANOMALY}
            labels={ANOMALY_LABELS}
            height={200}
            observedLabel="p95, milliseconds"
          />
        </CardBody>
      </Card>
    </Page>
  )
}

/* ---------------------------------------------------------------- incidents */

const STATE_TONE = {
  investigating: 'destructive',
  identified: 'amber',
  monitoring: 'blue',
  resolved: 'green',
} as const

function Incidents() {
  const { open } = useRoute()
  const [state, setState] = useState('open')

  const rows = INCIDENTS.filter((incident) =>
    state === 'all' ? true : state === 'open' ? incident.state !== 'resolved' : incident.state === 'resolved',
  )

  return (
    <Page>
      <PageHead
        title="Incidents"
        description="Two open, one closed last week. Severity is what it costs, state is where it is."
      >
        <SelectField
          label=""
          className="w-auto"
          triggerClassName="w-40"
          value={state}
          onValueChange={setState}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
      </PageHead>

      <div className="grid gap-3 xl:grid-cols-2">
        {rows.map((incident) => (
          <button
            key={incident.id}
            type="button"
            onClick={() => open('incidents', incident.id)}
            className="text-start"
          >
            <IncidentCard
              title={incident.title}
              severity={incident.severity}
              state={incident.state}
              startedAt={incident.startedAt}
              resolvedAt={incident.resolvedAt}
              assignee={incident.assignee}
              services={incident.services}
              summary={incident.summary}
              now={NOW}
              className="hover:border-foreground/25 h-full transition-colors duration-150 ease-out motion-reduce:transition-none"
            />
          </button>
        ))}
      </div>
    </Page>
  )
}

function IncidentDetail({ incident }: { incident: Incident }) {
  const { back } = useRoute()
  const notify = useNotify()
  const [steps, setSteps] = useState(RUNBOOK)
  const [update, setUpdate] = useState(false)
  const [note, setNote] = useState('')

  return (
    <Page>
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to incidents" onClick={back}>
              <ArrowLeft />
            </Button>
            <span className="truncate">{incident.title}</span>
            <Badge size="sm" color={STATE_TONE[incident.state]}>
              {incident.state}
            </Badge>
            <Badge size="sm" variant="outline">
              {incident.severity.toUpperCase()}
            </Badge>
          </span>
        }
        description={`${incident.id} · ${incident.assignee} · ${incident.services.join(', ')}`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setUpdate(true)}>
              Post update
            </Button>
            <Button size="sm" onClick={() => notify('Resolved', `${incident.id} closed. The postmortem is due in 5 days.`, 'green')}>
              Resolve
            </Button>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="flex flex-col gap-3 xl:col-span-2">
          <Section title="Runbook">
            <RunbookSteps
              steps={steps}
              onRun={(id) => {
                setSteps((current) =>
                  current.map((step) => (step.id === id ? { ...step, status: 'done' } : step)),
                )
                notify('Step complete', steps.find((step) => step.id === id)?.title as string, 'green')
              }}
              onSkip={(id) => {
                setSteps((current) =>
                  current.map((step) => (step.id === id ? { ...step, status: 'skipped' } : step)),
                )
                notify('Step skipped', 'Recorded on the incident timeline.')
              }}
            />
          </Section>

          <Section title="Root cause">
            <RootCauseTree causes={CAUSES} defaultExpanded={['c1', 'c2', 'c3']} />
          </Section>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardBody>
            <Timeline>
              {TIMELINE.map((entry) => (
                <TimelineItem key={entry.id} title={entry.title} tone={entry.tone} time={entry.at}>
                  <span className="text-muted-foreground text-xs">{entry.who}</span>
                </TimelineItem>
              ))}
            </Timeline>
          </CardBody>
        </Card>
      </div>

      <Dialog open={update} onOpenChange={setUpdate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post an update</DialogTitle>
            <DialogDescription>
              Goes to the status page and the incident channel at the same time.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <SelectField
              label="State"
              defaultValue={incident.state}
              options={[
                { value: 'investigating', label: 'Investigating' },
                { value: 'identified', label: 'Identified' },
                { value: 'monitoring', label: 'Monitoring' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
            <TextareaField
              label="Update"
              rows={4}
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="We have reduced the batch size to 50 and are watching p95."
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setUpdate(false)}>
              Cancel
            </Button>
            <Button
              disabled={!note.trim()}
              onClick={() => {
                setUpdate(false)
                setNote('')
                notify('Update posted', 'Status page and #incident-241.', 'green')
              }}
            >
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

/* ----------------------------------------------------------------- services */

function Services() {
  const [detail, setDetail] = useState<string | null>(null)
  const service = SERVICES.find((entry) => entry.id === detail)

  return (
    <Page>
      <PageHead
        title="Services"
        description="Five services, their last 48 hours, and the error budget each one is spending."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setDetail('s1')}>
            checkout-service, hour by hour
          </Button>
        }
      />

      <ServiceStatus services={SERVICES} />

      <div className="grid gap-3 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>checkout-service</CardTitle>
          </CardHeader>
          <CardBody>
            <SloBudget target={0.995} actual={0.9921} window="30 days" burnRate={4.2} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>api-gateway</CardTitle>
          </CardHeader>
          <CardBody>
            <SloBudget target={0.999} actual={0.9999} window="30 days" burnRate={0.1} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>docs-search</CardTitle>
          </CardHeader>
          <CardBody>
            <SloBudget target={0.995} actual={0.9994} window="30 days" burnRate={0.6} />
          </CardBody>
        </Card>
      </div>

      <Section title="Health checks">
        <HealthChecks checks={HEALTH} />
      </Section>

      <Drawer open={Boolean(detail)} onOpenChange={(open) => setDetail(open ? detail : null)}>
        <DrawerHeader>
          <DrawerTitle>{service?.name ?? 'Service'} — 48 hours</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 pb-2">
          <UptimeStrip buckets={UPTIME} height={40} label="Hourly buckets" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Uptime"
              value={<Fmt type="percent" value={0.9921} decimals={2} animate />}
              hint="Last 48 hours"
            />
            <Stat label="Down" value={7} hint="Hours" />
            <Stat label="Degraded" value={5} hint="Hours" />
          </div>
        </div>
      </Drawer>
    </Page>
  )
}

/* ----------------------------------------------------------------- database */

function DatabaseSection() {
  const notify = useNotify()
  const [sql, setSql] = useState(DEFAULT_SQL)
  const [running, setRunning] = useState(false)

  return (
    <Page>
      <PageHead
        title="Database"
        description="The query under the incident, its plan, and everything else that is slow."
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2 flex min-w-0 flex-col">
          <Section title="Query">
            <QueryEditor
              value={sql}
              onValueChange={setSql}
              running={running}
              dialect="PostgreSQL 17"
              onRun={() => {
                setRunning(true)
                notify('Running', 'EXPLAIN ANALYZE against the primary.')
                window.setTimeout(() => setRunning(false), 900)
              }}
            />
          </Section>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardBody>
              <ConnectionPool active={38} idle={6} max={50} waiting={12} waitMs={840} />
            </CardBody>
          </Card>
          <Section>
            <ReplicationStatus
              primary={{ name: 'db-primary', region: 'eu-west-1', writes: '1.2k/s' }}
              replicas={REPLICAS}
            />
          </Section>
        </div>
      </div>

      <Section title="Plan — and why it is slow">
        <QueryPlan plan={PLAN} />
      </Section>

      <Section>
        <SlowQueryLog queries={SLOW_QUERIES} />
      </Section>
    </Page>
  )
}

/* ------------------------------------------------------------------ on call */

function OnCall() {
  const notify = useNotify()

  return (
    <Page>
      <PageHead
        title="On call"
        description="Who is holding the pager, and who it escalates to when they do not answer."
        actions={
          <Button size="sm" variant="secondary" onClick={() => notify('Override created', 'Ada Lovelace covers 12:00–16:00 UTC.')}>
            Add override
          </Button>
        }
      />

      {/* The schedule wants the whole width — it is twenty-four hours drawn to
          scale, and squeezing it is the one thing that makes it unreadable. */}
      <OnCallSchedule
        shifts={SHIFTS}
        start={new Date(NOW.getTime() - 8 * 3_600_000)}
        end={new Date(NOW.getTime() + 16 * 3_600_000)}
        now={NOW}
      />

      <Card>
        <CardHeader>
          <CardTitle>Escalation</CardTitle>
        </CardHeader>
        <CardBody>
          <Timeline>
            <TimelineItem title="Page the primary" time="immediately" tone="info">
              <span className="text-muted-foreground text-xs">Grace Hopper — push, then SMS.</span>
            </TimelineItem>
            <TimelineItem title="Page the secondary" time="after 5 minutes" tone="warning">
              <span className="text-muted-foreground text-xs">Ada Lovelace — push, SMS, then a phone call.</span>
            </TimelineItem>
            <TimelineItem title="Page the engineering manager" time="after 15 minutes" tone="danger">
              <span className="text-muted-foreground text-xs">Katherine Johnson — phone call.</span>
            </TimelineItem>
            <TimelineItem title="Open a bridge and notify the exec on call" time="after 30 minutes" tone="danger" pending>
              <span className="text-muted-foreground text-xs">Only for sev1 and sev2.</span>
            </TimelineItem>
          </Timeline>
        </CardBody>
      </Card>
    </Page>
  )
}

/* --------------------------------------------------------------------- root */

const NAV_GROUPS = [
  {
    items: [
      { id: 'alerts', label: 'Alerts', icon: <BellRing />, count: ALERTS.length },
      { id: 'incidents', label: 'Incidents', icon: <Siren />, count: 2 },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { id: 'services', label: 'Services', icon: <HeartPulse />, count: SERVICES.length },
      { id: 'database', label: 'Database', icon: <Database /> },
      { id: 'oncall', label: 'On call', icon: <AlarmClock /> },
    ],
  },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'checkout-service p95 above 400ms', body: 'Firing for 6h 58m', at: '2m', unread: true },
  { id: 'n2', title: 'address-service returning 429', body: '11.2% of requests', at: '1m', unread: true },
  { id: 'n3', title: 'Replica lag recovering', body: 'eu-west-2 down to 14s from 41s', at: '4m' },
]

const SECTION_LABEL: Record<string, string> = {
  alerts: 'Alerts',
  incidents: 'Incidents',
  services: 'Services',
  database: 'Database',
  oncall: 'On call',
}

function commandsFor({ go, open }: Nav) {
  return [
    { id: 'go-alerts', label: 'Go to Alerts', group: 'Navigate', icon: <BellRing />, onSelect: () => go({ section: 'alerts' }) },
    { id: 'go-incidents', label: 'Go to Incidents', group: 'Navigate', icon: <Siren />, onSelect: () => go({ section: 'incidents' }) },
    { id: 'go-services', label: 'Go to Services', group: 'Navigate', icon: <HeartPulse />, onSelect: () => go({ section: 'services' }) },
    { id: 'go-database', label: 'Go to Database', group: 'Navigate', icon: <Database />, onSelect: () => go({ section: 'database' }) },
    { id: 'go-oncall', label: 'Go to On call', group: 'Navigate', icon: <AlarmClock />, onSelect: () => go({ section: 'oncall' }) },
    ...INCIDENTS.map((incident) => ({
      id: `inc-${incident.id}`,
      label: incident.title,
      group: 'Incidents',
      keywords: `${incident.id} ${incident.services.join(' ')}`,
      icon: <Activity />,
      onSelect: () => open('incidents', incident.id),
    })),
    ...SERVICES.map((service) => ({
      id: `svc-${service.id}`,
      label: service.name,
      group: 'Services',
      icon: <Server />,
      onSelect: () => go({ section: 'services' }),
    })),
  ]
}

function crumbsFor({ route, go }: Nav): Crumb[] {
  const section = SECTION_LABEL[route.section] ?? 'Operations'
  if (!route.record) return [{ label: section }]

  const incident = INCIDENTS.find((entry) => entry.id === route.record)
  return [
    { label: section, onClick: () => go({ section: route.section }) },
    { label: incident?.title ?? route.record },
  ]
}

function OpsContent() {
  const { route } = useRoute()

  if (route.section === 'incidents' && route.record) {
    const incident = INCIDENTS.find((entry) => entry.id === route.record)
    if (incident) return <IncidentDetail incident={incident} />
  }

  switch (route.section) {
    case 'incidents':
      return <Incidents />
    case 'services':
      return <Services />
    case 'database':
      return <DatabaseSection />
    case 'oncall':
      return <OnCall />
    default:
      return <Alerts />
  }
}

function Ops() {
  return (
    <Shell
      home="alerts"
      product="Operations"
      groups={NAV_GROUPS}
      notifications={NOTIFICATIONS}
      user={{ name: 'Grace Hopper', email: 'grace@astralyx.dev', plan: 'On call · primary' }}
      commands={commandsFor}
      crumbs={crumbsFor}
    >
      <OpsContent />
    </Shell>
  )
}

export const opsExample: ExampleEntry = {
  id: 'operations',
  label: 'Operations',
  description:
    'One Tuesday morning from five angles: the alert that fired, the incident it became, the runbook someone is halfway through, the cause tree they landed on, and the query underneath all of it.',
  uses: [
    'Alert Triage', 'Anomaly Chart', 'Incident Card', 'Runbook Steps', 'Root Cause Tree',
    'Service Status', 'SLO Budget', 'Health Checks', 'Uptime Strip', 'On-call Schedule',
    'Query Editor', 'Query Plan', 'Slow Query Log', 'Connection Pool', 'Replication Status',
    'Timeline', 'Drawer', 'Dialog', 'Command',
  ],
  render: () => <Ops />,
}
