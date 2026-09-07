'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft, CreditCard, Ellipsis, ExternalLink, GitBranch, Globe, LayoutDashboard, 
  Package, Plus, RefreshCw, Rocket, Settings, ShieldCheck, Trash2, TriangleAlert, Users
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BuildLog } from '@/components/ui/build-log'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import { CopyButton } from '@/components/ui/copy-button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { DeployList } from '@/components/ui/deploy-list'
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DiffStat } from '@/components/ui/diff-stat'
import { Drawer, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty } from '@/components/ui/empty'
import { Fmt } from '@/components/ui/fmt'
import { Input } from '@/components/ui/input'
import { InvoiceList } from '@/components/ui/invoice-list'
import { PaymentMethodList } from '@/components/ui/payment-method'
import { PermissionMatrix } from '@/components/ui/permission-matrix'
import { PricingTable } from '@/components/ui/pricing-table'
import { ResourceMeter } from '@/components/ui/resource-meter'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Sparkline } from '@/components/ui/sparkline'
import { Stat } from '@/components/ui/stat'
import { StatusChecks } from '@/components/ui/status-checks'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Timeline, TimelineItem } from '@/components/ui/timeline'
import { Tooltip } from '@/components/ui/tooltip'
import {
  ACTIVITY, BUILDS_BY_DAY, BUILD_STEPS, CHECKS, DEPLOYS, DOMAINS, ENV_VARS, FAILED_STEPS, INVOICES, MEMBERS, NOW, PAYMENT_METHODS, PERMISSIONS, PROJECTS, ROLES, TRAFFIC, USAGE, type Member, type Project,
} from './console-data'
import {
  Page, PageHead, Section, SelectField, Shell, TextField, useNotify, useRoute, type Crumb, type Nav,
} from './shell'
import { type ExampleEntry } from './types'

/**
 * Console — a deployment platform.
 *
 * The example exists to answer a question a grid of component cards cannot:
 * does this kit hold up across a *product*, where the same table appears under
 * three filters, a dialog writes something a different section has to show, and
 * a detail page has to be reachable and escapable.
 *
 * So every list here opens a record, every record has tabs, and every dialog
 * commits: invite someone and they appear in the table as invited; roll back
 * and the deployment list says so. Nothing is wired to a server, but nothing is
 * inert either.
 */

const STATUS_TONE = {
  ready: 'green',
  building: 'blue',
  failed: 'destructive',
  canceled: 'neutral',
} as const

/* ------------------------------------------------------------------ overview */

function Overview() {
  const { go, open } = useRoute()
  const failing = PROJECTS.filter((project) => project.status === 'failed')

  return (
    <Page>
      <PageHead
        title="Overview"
        description="Every project, the last seven days of traffic, and what the team has been doing."
        actions={
          <Button size="sm" onClick={() => go({ section: 'deployments' })}>
            <Rocket /> All deployments
          </Button>
        }
      />

      {failing.length > 0 && (
        <Alert
          color="destructive"
          icon={<TriangleAlert />}
          title={`${failing[0].name} failed to build`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Typecheck failed on <code className="font-mono">src/feed/uptime.ts</code>. The last
              good build is still serving production.
            </span>
            <Button size="xs" variant="secondary" onClick={() => open('deployments', '1479')}>
              Open build
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Deployments"
          value={1482}
          delta={12.4}
          hint="All time"
          chart={<Sparkline values={[31, 38, 34, 46, 52, 49, 61]} variant="area" />}
        />
        <Stat
          label="Success rate"
          value={<Fmt type="percent" value={0.982} decimals={1} animate />}
          deltaSuffix="pp"
          delta={0.6}
          hint="Last 7 days"
        />
        <Stat label="Median build" value="3m 12s" delta={8.1} goodDirection="down" animate={false} />
        <Stat label="Open incidents" value={3} delta={2} deltaSuffix="" goodDirection="down" hint="Both on checkout" />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            action={
              <Badge size="sm" color="blue">
                7 days
              </Badge>
            }
          >
            <CardTitle>Traffic</CardTitle>
          </CardHeader>
          <CardBody>
            <Chart
              variant="area"
              height={200}
              series={TRAFFIC.series}
              labels={TRAFFIC.labels}
              valueFormat={(value) => `${Math.round(value / 1000)}k`}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage this month</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {USAGE.slice(0, 3).map((row) => (
              <ResourceMeter
                key={row.id}
                label={row.label}
                used={row.used}
                cap={row.cap}
                unit="number"
                size="sm"
              />
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2 flex min-w-0 flex-col">
          <Section
          title="Recent deployments"
          action={<Button size="xs" variant="ghost" onClick={() => go({ section: 'deployments' })}>
                View all
              </Button>}
        >
            <DeployList deploys={DEPLOYS.slice(0, 5)} />
          </Section>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardBody>
            <Timeline>
              {ACTIVITY.map((item) => (
                <TimelineItem key={item.id} title={item.title} tone={item.tone} time={item.at}>
                  <span className="text-muted-foreground text-xs">{item.who}</span>
                </TimelineItem>
              ))}
            </Timeline>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ projects */

function Projects({ onNew }: { onNew: () => void }) {
  const { open } = useRoute()
  const [query, setQuery] = useState('')

  const rows = PROJECTS.filter((project) =>
    `${project.name} ${project.repo} ${project.framework}`.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <Page>
      <PageHead
        title="Projects"
        description="Four repositories, each with its own domain and its own way of falling over."
        actions={
          <Button size="sm" onClick={onNew}>
            <Plus /> New project
          </Button>
        }
      >
        <Input
          size="sm"
          value={query}
          clearable
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
          placeholder="Filter projects…"
          aria-label="Filter projects"
          containerClassName="max-w-xs"
        />
      </PageHead>

      {rows.length === 0 ? (
        <Empty
          icon={<Package />}
          title="No projects match"
          description={`Nothing here is called "${query}". Clear the filter to see all four.`}
          action={
            <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
              Clear filter
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((project) => (
            <Card key={project.id} className="hover:border-foreground/25 transition-colors duration-150 ease-out motion-reduce:transition-none">
              <CardHeader
                action={
                  <Badge size="sm" color={STATUS_TONE[project.status]}>
                    {project.status}
                  </Badge>
                }
              >
                <CardTitle>{project.name}</CardTitle>
                <span className="text-muted-foreground truncate font-mono text-xs">
                  {project.repo}
                </span>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <Sparkline values={project.trend} variant="area" className="h-10" />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Visits
                    <span className="text-foreground ms-1.5 font-medium tabular-nums">
                      <Fmt type="number" value={project.visits7d} />
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Errors
                    <span className="text-foreground ms-1.5 font-medium tabular-nums">
                      {project.errorRate}%
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate text-xs">{project.domain}</span>
                  <Button size="xs" variant="secondary" onClick={() => open('projects', project.id)}>
                    Open
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

function ProjectDetail({ project }: { project: Project }) {
  const { back, route, go } = useRoute()
  const notify = useNotify()
  const [tab, setTab] = useState(route.tab ?? 'deployments')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [vars, setVars] = useState(ENV_VARS)

  const deploys = DEPLOYS.filter((deploy) => deploy.project === project.id)

  return (
    <Page>
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to projects" onClick={back}>
              <ArrowLeft />
            </Button>
            {project.name}
            <Badge size="sm" color={STATUS_TONE[project.status]}>
              {project.status}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{project.repo}</span>
            <span className="flex items-center gap-1">
              <Globe className="size-3.5" /> {project.domain}
            </span>
          </span>
        }
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => notify('Redeploying', `${project.name} is building from main.`)}>
              <RefreshCw /> Redeploy
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Project actions">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => go({ section: 'deployments' })}>
                  All deployments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => notify('Transferred', 'Ownership moved to Grace Hopper.')}>
                  Transfer project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setConfirmDelete(true)}>
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="pt-4">
          <Section>
            {deploys.length > 0 ? (
              <DeployList
                deploys={deploys}
                onRedeploy={(id) => notify('Redeploying', `Deployment ${id} is building again.`)}
              />
            ) : (
              <Empty
                bordered={false}
                icon={<Rocket />}
                title="No deployments yet"
                description="Push to main and the first build starts on its own."
              />
            )}
          </Section>
        </TabsContent>

        <TabsContent value="analytics" className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Visits (7d)" value={project.visits7d} />
              <Stat
                label="Error rate"
                value={<Fmt type="percent" value={project.errorRate / 100} decimals={2} animate />}
                goodDirection="down"
                hint="Last 24 hours"
              />
              <Stat label="Median TTFB" value={118} hint="Milliseconds, p50" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Builds this week</CardTitle>
              </CardHeader>
              <CardBody>
                <Chart variant="stacked-bar" height={200} series={BUILDS_BY_DAY.series} labels={BUILDS_BY_DAY.labels} />
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variables" className="pt-4">
          <Section
            title="Environment variables"
            action={<Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    setVars((current) => [
                      ...current,
                      { id: `e${current.length + 1}`, key: 'NEW_VARIABLE', value: '', scope: 'Preview', secret: false },
                    ])
                    notify('Variable added', 'NEW_VARIABLE is set on preview builds only.', 'green')
                  }}
                >
                  <Plus /> Add variable
                </Button>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vars.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs font-medium">{row.key}</TableCell>
                    <TableCell className="text-muted-foreground truncate font-mono text-xs">
                      {row.value || <span className="text-muted-foreground/50">empty</span>}
                    </TableCell>
                    <TableCell>
                      <Badge size="sm" color={row.scope === 'Production' ? 'amber' : 'neutral'}>
                        {row.scope}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Remove ${row.key}`}
                        onClick={() => {
                          setVars((current) => current.filter((item) => item.id !== row.id))
                          notify('Variable removed', `${row.key} will not be set on the next build.`)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>

        <TabsContent value="domains" className="pt-4">
          <Section title="Domains">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DOMAINS.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {domain.name}
                        {domain.verified ? (
                          <ExternalLink className="text-muted-foreground/50 size-3.5" />
                        ) : (
                          <Tooltip content="DNS has not propagated yet">
                            <TriangleAlert className="size-3.5 text-[var(--amber-soft-foreground)]" />
                          </Tooltip>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{domain.kind}</TableCell>
                    <TableCell>
                      <Badge size="sm" color={domain.ssl === 'Active' ? 'green' : 'amber'}>
                        {domain.ssl}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every deployment, domain and environment variable. The repository is
              untouched, and there is no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              onClick={() => {
                setConfirmDelete(false)
                back()
                notify('Project deleted', `${project.name} and its 3 domains are gone.`, 'destructive')
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

/* --------------------------------------------------------------- deployments */

type DeployRow = (typeof DEPLOYS)[number]

function Deployments() {
  const { open } = useRoute()
  const notify = useNotify()
  const [environment, setEnvironment] = useState('all')
  const [project, setProject] = useState('all')
  const [selected, setSelected] = useState<string[]>([])

  const rows = useMemo(
    () =>
      DEPLOYS.filter(
        (deploy) =>
          (environment === 'all' || deploy.environment === environment) &&
          (project === 'all' || deploy.project === project),
      ),
    [environment, project],
  )

  const columns: Column<DeployRow>[] = [
    {
      key: 'id',
      header: 'Deployment',
      width: '28%',
      render: (row) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.message}</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            #{row.id} · {row.commit}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge size="sm" color={STATUS_TONE[row.status]}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'environment',
      header: 'Environment',
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground text-xs">{row.environment}</span>,
    },
    {
      key: 'branch',
      header: 'Branch',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
          <GitBranch className="size-3.5" />
          {row.branch}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Diff',
      align: 'end',
      hideOnMobile: true,
      render: (row) => <DiffStat additions={row.additions} deletions={row.deletions} />,
    },
    {
      key: 'when',
      header: 'When',
      align: 'end',
      sortValue: (row) => row.when,
      render: (row) => <span className="text-muted-foreground text-xs">{row.when}</span>,
    },
  ]

  return (
    <Page>
      <PageHead
        title="Deployments"
        description="Every build across the four projects. Pick some and act on them together."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="sm"
            triggerLabel="Project"
            value={project}
            onValueChange={setProject}
            className="w-auto"
            triggerClassName="w-44"
            options={[
              { value: 'all', label: 'All projects' },
              ...PROJECTS.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            size="sm"
            triggerLabel="Environment"
            value={environment}
            onValueChange={setEnvironment}
            className="w-auto"
            triggerClassName="w-40"
            options={[
              { value: 'all', label: 'All environments' },
              { value: 'production', label: 'Production' },
              { value: 'preview', label: 'Preview' },
            ]}
          />
          {selected.length > 0 && (
            <span className="ms-auto flex items-center gap-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                {selected.length} selected
              </span>
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  notify('Redeploying', `${selected.length} builds queued.`, 'green')
                  setSelected([])
                }}
              >
                <RefreshCw /> Redeploy
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </span>
          )}
        </div>
      </PageHead>

      <DataGrid
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(row) => open('deployments', row.id)}
        empty={
          <Empty
            bordered={false}
            icon={<Rocket />}
            title="Nothing matches those filters"
            description="No deployment in this project has run in that environment yet."
          />
        }
      />
    </Page>
  )
}

function DeploymentDetail({ deploy }: { deploy: DeployRow }) {
  const { back } = useRoute()
  const notify = useNotify()
  const [logs, setLogs] = useState(false)
  const [rollback, setRollback] = useState(false)
  const failed = deploy.status === 'failed'

  return (
    <Page>
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to deployments" onClick={back}>
              <ArrowLeft />
            </Button>
            <span className="truncate">{deploy.message}</span>
            <Badge size="sm" color={STATUS_TONE[deploy.status]}>
              {deploy.status}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
            <span>#{deploy.id}</span>
            <span className="flex items-center gap-1">
              <GitBranch className="size-3.5" /> {deploy.branch}
            </span>
            <span className="flex items-center gap-1">
              {deploy.commit}
              <CopyButton value={deploy.commit} label="Copy commit SHA" />
            </span>
          </span>
        }
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setLogs(true)}>
              View logs
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRollback(true)}>
              Roll back
            </Button>
            {deploy.url && (
              <Button size="sm" variant="outline" asChild>
                <a href={`https://${deploy.url}`} target="_blank" rel="noreferrer">
                  Visit <ExternalLink />
                </a>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Duration" value={deploy.duration ? `${Math.floor(deploy.duration / 60)}m ${deploy.duration % 60}s` : '—'} animate={false} />
        <Stat label="Added" value={deploy.additions} />
        <Stat label="Removed" value={deploy.deletions} />
        <Stat label="Author" value={deploy.author} animate={false} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2 flex min-w-0 flex-col">
          <Section title="Build">
            <BuildLog steps={failed ? FAILED_STEPS : BUILD_STEPS} />
          </Section>
        </div>

        <Section title="Checks">
          <StatusChecks checks={CHECKS} defaultExpanded={['size']} />
        </Section>
      </div>

      <Drawer open={logs} onOpenChange={setLogs}>
        <DrawerHeader>
          <DrawerTitle>Raw build output — #{deploy.id}</DrawerTitle>
        </DrawerHeader>
        {/* Only vertical padding: the drawer already insets its own body. */}
        <div className="max-h-[50vh] overflow-auto pb-2">
          <pre className="text-muted-foreground font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {(failed ? FAILED_STEPS : BUILD_STEPS)
              .map((step) => `▸ ${String(step.name)}\n${step.output ?? '(no output)'}`)
              .join('\n\n')}
          </pre>
        </div>
      </Drawer>

      <AlertDialog open={rollback} onOpenChange={setRollback}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back to #{deploy.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Production starts serving this build immediately. Nothing is rebuilt — the existing
              artifact is promoted, so it takes about four seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRollback(false)
                notify('Rolled back', `Production is serving #${deploy.id}.`, 'green')
              }}
            >
              Promote build
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

/* ---------------------------------------------------------------------- team */

const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
} as const

function Team({ members, onInvite, onRole }: {
  members: Member[]
  onInvite: () => void
  onRole: (id: string, role: Member['role']) => void
}) {
  const notify = useNotify()
  const [roles, setRoles] = useState(ROLES)

  return (
    <Page>
      <PageHead
        title="Team"
        description="Six people, four roles, and a matrix that says what each of them can actually do."
        actions={
          <Button size="sm" onClick={onInvite}>
            <Plus /> Invite member
          </Button>
        }
      />

      <Section
        title="Members"
        action={<AvatarGroup max={4}>
              {members.map((member) => (
                <Avatar key={member.id} size="sm" name={member.name} />
              ))}
            </AvatarGroup>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="hidden sm:table-cell">Role</TableHead>
              <TableHead className="hidden md:table-cell">Projects</TableHead>
              <TableHead className="hidden md:table-cell">Last active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <Avatar size="sm" name={member.name} />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2 truncate font-medium">
                        {member.name}
                        {member.status === 'invited' && (
                          <Badge size="sm" color="amber">
                            invited
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {member.email}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Select
                    size="sm"
                    triggerLabel={`Role for ${member.name}`}
                    value={member.role}
                    disabled={member.role === 'owner'}
                    onValueChange={(next) => onRole(member.id, next as Member['role'])}
                    className="w-auto"
                    triggerClassName="w-32"
                    options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground hidden tabular-nums md:table-cell">
                  {member.projects}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                  {member.lastActive}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-xs" variant="ghost" aria-label={`Actions for ${member.name}`}>
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => notify('Invite resent', `A new link is on its way to ${member.email}.`)}>
                        Resend invite
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={member.role === 'owner'}
                        onClick={() => notify('Removed', `${member.name} no longer has access.`, 'destructive')}
                      >
                        Remove from team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="What each role can do">
        <PermissionMatrix
          permissions={PERMISSIONS}
          roles={roles}
          onToggle={(roleId, permissionId, granted) =>
            setRoles((current) =>
              current.map((role) =>
                role.id === roleId
                  ? {
                      ...role,
                      granted: granted
                        ? [...role.granted, permissionId]
                        : role.granted.filter((id) => id !== permissionId),
                    }
                  : role,
              ),
            )
          }
        />
      </Section>
    </Page>
  )
}

/* ------------------------------------------------------------------- billing */

const PLANS = [
  {
    id: 'hobby',
    name: 'Hobby',
    price: 0,
    period: 'mo',
    currency: 'USD',
    description: 'For trying things out.',
    features: [
      { label: 'Projects', value: '3' },
      { label: 'Build minutes', value: '500' },
      { label: 'Priority support', value: false },
      { label: 'SSO', value: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: 24,
    period: 'seat',
    currency: 'USD',
    description: 'For teams shipping weekly.',
    highlighted: true,
    features: [
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Build minutes', value: '10,000' },
      { label: 'Priority support', value: true },
      { label: 'SSO', value: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    period: 'seat',
    currency: 'USD',
    description: 'For everything else.',
    features: [
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Build minutes', value: 'Unlimited' },
      { label: 'Priority support', value: true },
      { label: 'SSO', value: true },
    ],
  },
]

function Billing() {
  const notify = useNotify()
  const [plan, setPlan] = useState('team')
  const [method, setMethod] = useState('pm_visa')

  return (
    <Page>
      <PageHead
        title="Billing"
        description="Twelve seats on Team, renewing on the first. Usage is metered against the plan, not the card."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {USAGE.map((row) => (
          <Card key={row.id}>
            <CardBody>
              <ResourceMeter label={row.label} used={row.used} cap={row.cap} size="sm" />
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardBody>
          <PricingTable
            plans={PLANS.map((entry) => ({
              ...entry,
              badge: entry.id === plan ? 'Current' : undefined,
              cta: entry.id === plan ? 'Current plan' : `Switch to ${entry.name}`,
              onSelect: () => {
                setPlan(entry.id)
                notify('Plan changed', `You are on ${entry.name}. The next invoice is prorated.`, 'green')
              },
            }))}
          />
        </CardBody>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardBody>
            <PaymentMethodList
              methods={PAYMENT_METHODS}
              selected={method}
              onSelect={setMethod}
              now={NOW}
              onSetDefault={(id) => notify('Default updated', `Charges now go to ${id === 'pm_visa' ? 'Visa 4242' : 'Amex 0005'}.`)}
              onRemove={() => notify('Card removed', 'One payment method left on the account.')}
            />
          </CardBody>
        </Card>

        <Section title="Invoices">
          <InvoiceList
            invoices={INVOICES}
            onDownload={(invoice) => notify('Downloading', `${invoice.number}.pdf`)}
          />
        </Section>
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ settings */

function ConsoleSettings() {
  const notify = useNotify()
  const [name, setName] = useState('Astralyx')
  const [slug, setSlug] = useState('astralyx')
  const [autoDeploy, setAutoDeploy] = useState(true)
  const [protection, setProtection] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [typed, setTyped] = useState('')

  const slugError = /[^a-z0-9-]/.test(slug)
    ? 'Lowercase letters, digits and hyphens only — it becomes part of every preview URL.'
    : undefined

  return (
    <Page className="max-w-3xl">
      <PageHead title="Settings" description="Organisation-wide. Project settings live on each project." />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <TextField
            label="Organisation name"
            description="Shown on invoices and in the switcher."
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <TextField
            label="Slug"
            error={slugError}
            description={slugError ? undefined : `Previews resolve at ${slug}.astralyx.dev`}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Switch
            checked={autoDeploy}
            onChange={(event) => setAutoDeploy(event.target.checked)}
            labelPosition="start"
            containerClassName="w-full justify-between"
            label="Deploy on push to main"
            description="Every merge to the default branch builds and promotes automatically."
          />
          <Separator />
          <Switch
            checked={protection}
            onChange={(event) => setProtection(event.target.checked)}
            labelPosition="start"
            containerClassName="w-full justify-between"
            label="Protect production"
            description="A failing required check blocks promotion, whoever triggered it."
          />
        </CardBody>
      </Card>

      <Card className="border-[var(--destructive)]/40">
        <CardHeader>
          <CardTitle className="text-[var(--destructive-soft-foreground)]">Danger zone</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted-foreground max-w-md text-sm">
            Deleting the organisation removes four projects, eight domains and every build artifact.
          </span>
          <Button color="destructive" size="sm" onClick={() => setConfirm(true)}>
            <Trash2 /> Delete organisation
          </Button>
        </CardBody>
      </Card>

      <Dialog open={confirm} onOpenChange={(next) => { setConfirm(next); if (!next) setTyped('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              Type <code className="font-mono font-medium">{slug}</code> to confirm. Everything goes,
              including the invoices.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Input
              value={typed}
              autoFocus
              placeholder={slug}
              aria-label="Confirm by typing the slug"
              onChange={(event) => setTyped(event.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              color="destructive"
              disabled={typed !== slug}
              onClick={() => {
                setConfirm(false)
                setTyped('')
                notify('Nothing was deleted', 'This is an example — the button stops here.', 'destructive')
              }}
            >
              I understand, delete it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

/* --------------------------------------------------------------------- root */

const NAV_GROUPS = [
  {
    items: [
      { id: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
      { id: 'projects', label: 'Projects', icon: <Package />, count: PROJECTS.length },
      { id: 'deployments', label: 'Deployments', icon: <Rocket />, count: DEPLOYS.length },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { id: 'team', label: 'Team', icon: <Users />, count: MEMBERS.length },
      { id: 'billing', label: 'Billing', icon: <CreditCard /> },
      { id: 'settings', label: 'Settings', icon: <Settings /> },
    ],
  },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'status failed to build', body: 'Typecheck error in src/feed/uptime.ts', at: '1h', unread: true },
  { id: 'n2', title: 'Bundle size over budget', body: 'astralyx-ui main chunk grew 4.2 kB', at: '2h', unread: true },
  { id: 'n3', title: 'Invite accepted', body: 'Margaret Hamilton joined as viewer', at: '2d' },
]

const SECTION_LABEL: Record<string, string> = {
  overview: 'Overview',
  projects: 'Projects',
  deployments: 'Deployments',
  team: 'Team',
  billing: 'Billing',
  settings: 'Settings',
}

/**
 * The content router.
 *
 * Split from the shell so the shell stays a frame: it knows there is a route,
 * and nothing about what any of these sections are.
 */
function ConsoleContent({
  members,
  onInvite,
  onRole,
  onNewProject,
}: {
  members: Member[]
  onInvite: () => void
  onRole: (id: string, role: Member['role']) => void
  onNewProject: () => void
}) {
  const { route } = useRoute()

  if (route.section === 'projects' && route.record) {
    const project = PROJECTS.find((item) => item.id === route.record)
    return project ? <ProjectDetail project={project} /> : <Projects onNew={onNewProject} />
  }

  if (route.section === 'deployments' && route.record) {
    const deploy = DEPLOYS.find((item) => item.id === route.record)
    return deploy ? <DeploymentDetail deploy={deploy} /> : <Deployments />
  }

  switch (route.section) {
    case 'projects':
      return <Projects onNew={onNewProject} />
    case 'deployments':
      return <Deployments />
    case 'team':
      return <Team members={members} onInvite={onInvite} onRole={onRole} />
    case 'billing':
      return <Billing />
    case 'settings':
      return <ConsoleSettings />
    default:
      return <Overview />
  }
}

/**
 * The crumbs, derived from the route rather than pushed alongside it.
 *
 * Two sources of truth for "where am I" is how a trail ends up saying one thing
 * while the content says another.
 */
/**
 * The palette. Built from navigation rather than from the body's state, so it
 * can be handed to the shell without threading a callback back out of it.
 */
function commandsFor({ go, open }: Nav) {
  return [
    { id: 'go-overview', label: 'Go to Overview', group: 'Navigate', icon: <LayoutDashboard />, onSelect: () => go({ section: 'overview' }) },
    { id: 'go-projects', label: 'Go to Projects', group: 'Navigate', icon: <Package />, onSelect: () => go({ section: 'projects' }) },
    { id: 'go-deployments', label: 'Go to Deployments', group: 'Navigate', icon: <Rocket />, onSelect: () => go({ section: 'deployments' }) },
    { id: 'go-team', label: 'Go to Team', group: 'Navigate', icon: <Users />, onSelect: () => go({ section: 'team' }) },
    { id: 'go-billing', label: 'Go to Billing', group: 'Navigate', icon: <CreditCard />, onSelect: () => go({ section: 'billing' }) },
    { id: 'go-settings', label: 'Go to Settings', group: 'Navigate', icon: <Settings />, onSelect: () => go({ section: 'settings' }) },
    ...PROJECTS.map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      group: 'Projects',
      keywords: project.repo,
      icon: <Package />,
      onSelect: () => open('projects', project.id),
    })),
    ...DEPLOYS.slice(0, 4).map((deploy) => ({
      id: `deploy-${deploy.id}`,
      label: deploy.message,
      group: 'Deployments',
      keywords: `${deploy.id} ${deploy.branch} ${deploy.commit}`,
      icon: <Rocket />,
      onSelect: () => open('deployments', deploy.id),
    })),
  ]
}

function crumbsFor({ route, go }: Nav): Crumb[] {
  const section = SECTION_LABEL[route.section] ?? 'Console'

  if (!route.record) return [{ label: section }]

  const record =
    route.section === 'projects'
      ? PROJECTS.find((item) => item.id === route.record)?.name
      : DEPLOYS.find((item) => item.id === route.record)?.message

  return [
    { label: section, onClick: () => go({ section: route.section }) },
    { label: record ?? route.record },
  ]
}

function ConsoleBody() {
  const { go } = useRoute()
  const notify = useNotify()

  const [members, setMembers] = useState(MEMBERS)
  const [invite, setInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Member['role']>('member')
  const [newProject, setNewProject] = useState(false)
  const [repo, setRepo] = useState('')

  const emailError =
    inviteEmail.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)
      ? 'That does not look like an email address.'
      : undefined

  return (
    <>
      <ConsoleContent
        members={members}
        onInvite={() => setInvite(true)}
        onNewProject={() => setNewProject(true)}
        onRole={(id, role) => {
          setMembers((current) =>
            current.map((member) => (member.id === id ? { ...member, role } : member)),
          )
          const member = members.find((item) => item.id === id)
          notify('Role updated', `${member?.name} is now ${ROLE_LABEL[role].toLowerCase()}.`)
        }}
      />

      {/* Invite: a sheet rather than a dialog. It is a form with three fields
          and a permissions note, which is a side panel's job — a dialog that
          tall starts scrolling its own body on a laptop. */}
      <Sheet open={invite} onOpenChange={setInvite}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite a member</SheetTitle>
            <SheetDescription>
              They get an email with a link that expires in seven days.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <TextField
              label="Email"
              required
              type="email"
              autoFocus
              value={inviteEmail}
              error={emailError}
              placeholder="name@company.com"
              onChange={(event) => setInviteEmail(event.target.value)}
            />

            <SelectField
              label="Role"
              description="Roles can be changed later from the members table."
              value={inviteRole}
              onValueChange={(next) => setInviteRole(next as Member['role'])}
              options={[
                { value: 'admin', label: 'Admin — everything except billing' },
                { value: 'member', label: 'Member — deploy and read variables' },
                { value: 'viewer', label: 'Viewer — read only' },
              ]}
            />

            <Alert color="blue" icon={<ShieldCheck />} size="sm" title="Production is protected">
              Whatever role you pick, a failing required check blocks promotion.
            </Alert>
          </SheetBody>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setInvite(false)}>
              Cancel
            </Button>
            <Button
              disabled={!inviteEmail || Boolean(emailError)}
              onClick={() => {
                setMembers((current) => [
                  ...current,
                  {
                    id: inviteEmail,
                    name: inviteEmail,
                    email: inviteEmail,
                    role: inviteRole,
                    status: 'invited',
                    lastActive: '—',
                    projects: 0,
                  },
                ])
                setInvite(false)
                setInviteEmail('')
                go({ section: 'team' })
                notify('Invite sent', `${inviteEmail} was added as ${ROLE_LABEL[inviteRole].toLowerCase()}.`, 'green')
              }}
            >
              Send invite
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={newProject} onOpenChange={setNewProject}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Import a repository. The framework is detected from the lockfile and the build command
              is filled in for you.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <TextField
              label="Repository"
              required
              description="Only repositories the Astralyx app can see are listed."
              autoFocus
              value={repo}
              placeholder="astralyxdev/…"
              onChange={(event) => setRepo(event.target.value)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Framework"
                defaultValue="vite"
                options={[
                  { value: 'vite', label: 'Vite' },
                  { value: 'next', label: 'Next.js' },
                  { value: 'astro', label: 'Astro' },
                  { value: 'workers', label: 'Workers' },
                ]}
              />
              <SelectField
                label="Production branch"
                defaultValue="main"
                options={[
                  { value: 'main', label: 'main' },
                  { value: 'next', label: 'next' },
                ]}
              />
            </div>

            <TextField
              label="Build command"
              description="Runs in the repository root."
              defaultValue="npm run build"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNewProject(false)}>
              Cancel
            </Button>
            <Button
              disabled={!repo}
              onClick={() => {
                setNewProject(false)
                setRepo('')
                notify('Import started', `${repo} is building for the first time.`, 'green')
                go({ section: 'deployments' })
              }}
            >
              Import and deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Console() {
  return (
    <Shell
      home="overview"
      product="Console"
      groups={NAV_GROUPS}
      notifications={NOTIFICATIONS}
      user={{ name: 'Ada Lovelace', email: 'ada@astralyx.dev', plan: 'Team · 12 seats' }}
      commands={commandsFor}
      crumbs={crumbsFor}
    >
      <ConsoleBody />
    </Shell>
  )
}

export const consoleExample: ExampleEntry = {
  id: 'console',
  label: 'Console',
  description:
    'A deployment platform: projects that open, builds that open under them, a permissions matrix, a plan you can switch, and dialogs that commit — invite someone and the members table says so.',
  uses: [
    'Sidebar', 'Command', 'Data Grid', 'Deploy List', 'Build Log', 'Status Checks',
    'Permission Matrix', 'Pricing Table', 'Invoice List', 'Payment Method', 'Sheet', 'Dialog',
    'Alert Dialog', 'Drawer', 'Toast', 'Chart', 'Stat', 'Resource Meter', 'Timeline',
  ],
  render: () => <Console />,
}
