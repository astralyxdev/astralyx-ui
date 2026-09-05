import { useState } from 'react'
import {
  Activity, BarChart3, Bell, Download,
  LayoutDashboard, MoreHorizontal, Package, Plus, Search, Settings,
  TriangleAlert, Users,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Sparkline } from '@/components/ui/sparkline'
import { Stat } from '@/components/ui/stat'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 /> },
  { id: 'builds', label: 'Builds', icon: <Package />, count: 12 },
  { id: 'activity', label: 'Activity', icon: <Activity /> },
  { id: 'team', label: 'Team', icon: <Users /> },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
]

const STATS = [
  { label: 'Deployments', value: '1,482', delta: 12.4, goodDirection: 'up' as const, trend: [31, 38, 34, 46, 52, 49, 61] },
  { label: 'Success rate', value: '98.2%', delta: 0.6, goodDirection: 'up' as const, trend: [96, 97, 95, 98, 97, 98, 98] },
  { label: 'Avg. duration', value: '3m 12s', delta: 8.1, goodDirection: 'down' as const, trend: [188, 194, 201, 210, 205, 198, 192] },
  { label: 'Open incidents', value: '3', delta: 2, goodDirection: 'down' as const, trend: [1, 0, 2, 1, 3, 4, 3] },
]

const BUILDS = [
  ['1482', 'main', 'Add squircle corners to controls', 'passed', 'Ada Lovelace', '2m ago'],
  ['1481', 'feat/toast', 'Toast queue and provider', 'passed', 'Grace Hopper', '18m ago'],
  ['1480', 'main', 'Fix switch thumb contrast', 'failed', 'Alan Turing', '1h ago'],
  ['1479', 'fix/input', 'Field padding derives from height', 'passed', 'Ada Lovelace', '3h ago'],
  ['1478', 'main', 'Drop Radix, add own Slot', 'running', 'Katherine Johnson', '4h ago'],
  ['1477', 'next', 'Bump Tailwind to 4.3', 'passed', 'Margaret Hamilton', '6h ago'],
]

const TONE = { passed: 'green', failed: 'destructive', running: 'blue' } as const

const USAGE = [
  { label: 'Build minutes', used: 8420, cap: 10000, color: 'blue' as const },
  { label: 'Bandwidth', used: 214, cap: 500, color: 'violet' as const },
  { label: 'Storage', used: 47, cap: 50, color: 'amber' as const },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const BUILD_SERIES = [
  { name: 'Passed', values: [38, 52, 27, 68, 61, 11, 7] },
  { name: 'Failed', values: [4, 6, 4, 6, 5, 1, 1] },
]

function Dashboard() {
  const [section, setSection] = useState('overview')
  const [range, setRange] = useState('30d')
  const [page, setPage] = useState(1)

  return (
    <AppFrame
      inset
      product="Console"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title="Overview"
      user={{ name: 'Ada Lovelace', plan: 'Team plan' }}
      actions={
        <div className="flex items-center gap-2">
          <Input variant="secondary"
            size="sm"
            icon={<Search />}
            placeholder="Search builds"
            clearable
            containerClassName="hidden w-56 lg:flex"
          />
          <Select variant="secondary"
            size="sm"
            value={range}
            onValueChange={setRange}
            className="hidden w-32 sm:block"
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last quarter' },
            ]}
          />
          <Tooltip content="Notifications">
            <Button size="icon-sm" variant="ghost" aria-label="Notifications">
              <Bell />
            </Button>
          </Tooltip>
          <Button size="sm">
            <Plus /> New project
          </Button>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Usage this month</CardTitle>
              <CardDescription>Resets on the 1st.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              {USAGE.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-muted-foreground font-mono text-xs tabular-nums">
                      {item.used.toLocaleString()} / {item.cap.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={(item.used / item.cap) * 100} color={item.color} size="sm" />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">On call</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name="Grace Hopper" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Grace Hopper</p>
                  <p className="text-muted-foreground truncate text-xs">Until 18:00 UTC</p>
                </div>
                <Badge size="sm" color="green">online</Badge>
              </div>
              <Separator label="team" />
              <AvatarGroup size="sm" max={5}>
                {['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Margaret Hamilton', 'Barbara Liskov'].map((name) => (
                  <Avatar key={name} name={name} />
                ))}
              </AvatarGroup>
            </CardBody>
          </Card>
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        <Alert color="amber" icon={<TriangleAlert />} title="Storage is nearly full">
          You are using 47 GB of 50 GB. Older build artifacts are removed after 30 days.
        </Alert>

        {/* Stat owns the label, the number and the direction of the delta —
            including which direction is the good one, which is why the open
            incidents card reads a rise as bad without a special case here. */}
        {/* A grid, not a Group: `even` means one row of equal shares, so four
            cards stay on one row down to 68px each with every label cut to
            three characters. auto-fit keeps them equal and wraps instead. */}
        <div className="bg-secondary/40 grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3 rounded-[var(--radius-group-sm)] p-3">
          {STATS.map((stat) => (
            <Stat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              delta={stat.delta}
              goodDirection={stat.goodDirection}
              chart={<Sparkline values={stat.trend} variant="area" className="h-8" />}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Builds this week</CardTitle>
            <CardDescription>Hover a bar for the exact count.</CardDescription>
          </CardHeader>
          <CardBody>
            {/* Stacked, because the interesting number is passed against
                failed on the same day rather than either on its own. */}
            <Chart
              variant="stacked-bar"
              series={BUILD_SERIES}
              labels={DAYS}
              height={180}
              legend
              valueFormat={(value) => `${value} builds`}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            action={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Build actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Builds</DropdownMenuLabel>
                  <DropdownMenuItem>Re-run failed</DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download /> Download logs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Cancel all running</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          >
            <CardTitle as="h2">Recent builds</CardTitle>
            <CardDescription>Across every branch.</CardDescription>
          </CardHeader>

          <Tabs defaultValue="all" className="gap-0">
            <div className="border-border border-b px-4.5 py-2">
              <TabsList variant="underline">
                <TabsTrigger value="all" variant="underline">All</TabsTrigger>
                <TabsTrigger value="failed" variant="underline">Failed</TabsTrigger>
                <TabsTrigger value="running" variant="underline">Running</TabsTrigger>
              </TabsList>
            </div>

            {(['all', 'failed', 'running'] as const).map((tab) => {
              const rows = tab === 'all' ? BUILDS : BUILDS.filter((r) => r[3] === tab)
              return (
                <TabsContent key={tab} value={tab}>
                  <Table containerClassName="rounded-none border-0">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Build</TableHead>
                        <TableHead>Commit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead className="text-end">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(([id, branch, message, status, author, when]) => (
                        <TableRow key={id}>
                          <TableCell className="font-mono text-xs">#{id}</TableCell>
                          <TableCell className="max-w-72">
                            <div className="flex flex-col gap-1">
                              <span className="truncate">{message}</span>
                              <Badge size="sm" shape="rounded" className="w-fit">
                                {branch}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge size="sm" color={TONE[status as keyof typeof TONE]}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar size="xs" name={author} />
                              <span className="truncate text-xs">{author}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-end text-xs whitespace-nowrap">
                            {when}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {rows.length > 0 && (
                    <div className="flex justify-end p-3">
                      <Pagination page={page} count={9} onPageChange={setPage} />
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </Card>
      </div>
    </AppFrame>
  )
}

export const dashboardExample: ExampleEntry = {
  id: 'dashboard',
  label: 'Dashboard',
  description:
    'A full console: product sidebar, stat tiles, a hoverable bar chart, and a tabbed, paginated build table with a row-level menu.',
  uses: [
    'Group', 'Card', 'Table', 'Tabs', 'Pagination', 'Progress', 'Badge',
    'Avatar', 'Dropdown Menu', 'Alert', 'Select', 'Input', 'Tooltip',
  ],
  render: () => <Dashboard />,
}
