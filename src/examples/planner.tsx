import { useMemo, useState } from 'react'
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList,
  GitMerge, KanbanSquare, MessageSquare, Rocket, Timer, Users, Zap,
} from 'lucide-react'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CronSchedule, type CronJob } from '@/components/ui/cron-schedule'
import {
  DescriptionDetails, DescriptionList, DescriptionPairs, DescriptionTerm,
} from '@/components/ui/description-list'
import { Gantt, type GanttTask } from '@/components/ui/gantt'
import { Kanban, type KanbanColumn } from '@/components/ui/kanban'
import { OrgChart, type OrgNode } from '@/components/ui/org-chart'
import { Scheduler, type SchedulerEvent } from '@/components/ui/scheduler'
import { Separator } from '@/components/ui/separator'
import { Stepper, type Step } from '@/components/ui/stepper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Timeline, TimelineContent, TimelineItem } from '@/components/ui/timeline'
import { Tooltip } from '@/components/ui/tooltip'
import { dataFills } from '@/lib/styles'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * Every date in this file comes from `at()`, never `new Date()`.
 *
 * The examples are prerendered on the server and hydrated in the browser, so a
 * clock reading would produce two different pages. The calendar constructor is
 * used rather than millisecond arithmetic because adding 86.4M ms across a DST
 * boundary lands an hour off and can slide a task onto the wrong day.
 */
const at = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute)

/** The moment the page pretends it is — passed to anything that would otherwise ask the clock. */
const NOW = at(3, 4, 11, 20)
/** Any date inside the week the scheduler shows. */
const WEEK = at(3, 2)

const NAV: NavItem[] = [
  { id: 'roadmap', label: 'Roadmap', icon: <ClipboardList /> },
  { id: 'week', label: 'This week', icon: <CalendarDays /> },
  { id: 'board', label: 'Board', icon: <KanbanSquare />, count: 14 },
  { id: 'team', label: 'Team', icon: <Users /> },
  { id: 'automation', label: 'Automation', icon: <Zap /> },
  { id: 'releases', label: 'Releases', icon: <Rocket /> },
]

const TEAM = {
  ada: { name: 'Ada Lovelace', title: 'Principal engineer' },
  grace: { name: 'Grace Hopper', title: 'Engineering manager' },
  alan: { name: 'Alan Turing', title: 'Staff engineer' },
  katherine: { name: 'Katherine Johnson', title: 'Design lead' },
  margaret: { name: 'Margaret Hamilton', title: 'Release engineer' },
  barbara: { name: 'Barbara Liskov', title: 'Staff engineer' },
  radia: { name: 'Radia Perlman', title: 'Infrastructure' },
  jean: { name: 'Jean Bartik', title: 'Product designer' },
  karen: { name: 'Karen Spärck Jones', title: 'Docs lead' },
} as const

type PersonKey = keyof typeof TEAM

const ORG_NODES: OrgNode[] = [
  { id: 'grace', name: TEAM.grace.name, title: TEAM.grace.title, managerId: null, avatar: <Avatar size="sm" name={TEAM.grace.name} />, meta: '9 reports · Design system 3.0' },
  { id: 'ada', name: TEAM.ada.name, title: TEAM.ada.title, managerId: 'grace', avatar: <Avatar size="sm" name={TEAM.ada.name} />, meta: 'Primitives' },
  { id: 'katherine', name: TEAM.katherine.name, title: TEAM.katherine.title, managerId: 'grace', avatar: <Avatar size="sm" name={TEAM.katherine.name} />, meta: 'Design' },
  { id: 'margaret', name: TEAM.margaret.name, title: TEAM.margaret.title, managerId: 'grace', avatar: <Avatar size="sm" name={TEAM.margaret.name} />, meta: 'Release train' },
  { id: 'karen', name: TEAM.karen.name, title: TEAM.karen.title, managerId: 'grace', avatar: <Avatar size="sm" name={TEAM.karen.name} />, meta: 'Docs' },
  { id: 'alan', name: TEAM.alan.name, title: TEAM.alan.title, managerId: 'ada', avatar: <Avatar size="sm" name={TEAM.alan.name} />, meta: 'Charts' },
  { id: 'barbara', name: TEAM.barbara.name, title: TEAM.barbara.title, managerId: 'ada', avatar: <Avatar size="sm" name={TEAM.barbara.name} />, meta: 'Codemods' },
  { id: 'radia', name: TEAM.radia.name, title: TEAM.radia.title, managerId: 'ada', avatar: <Avatar size="sm" name={TEAM.radia.name} />, meta: 'CI and registry' },
  { id: 'jean', name: TEAM.jean.name, title: TEAM.jean.title, managerId: 'katherine', avatar: <Avatar size="sm" name={TEAM.jean.name} />, meta: 'Docs site' },
]

/** Who is on the hook for each roadmap bar, kept beside the tasks so the Gantt payload stays the shape the component wants. */
const TASK_OWNER: Record<string, PersonKey> = {
  't-tokens': 'katherine',
  't-dark': 'jean',
  't-squircle': 'katherine',
  't-controls': 'ada',
  't-charts': 'alan',
  't-drag': 'barbara',
  't-docs': 'karen',
  't-codemod': 'barbara',
  't-rc': 'margaret',
  't-bake': 'margaret',
  't-ship': 'margaret',
}

const INITIAL_TASKS: GanttTask[] = [
  { id: 't-tokens', label: 'Token audit', group: 'Design', start: at(3, 2), end: at(3, 6), progress: 1 },
  { id: 't-dark', label: 'Dark-mode palette', group: 'Design', start: at(3, 6), end: at(3, 12), progress: 0.8, dependsOn: ['t-tokens'] },
  { id: 't-squircle', label: 'Squircle geometry spec', group: 'Design', start: at(3, 9), end: at(3, 13), progress: 0.55 },
  { id: 't-controls', label: 'Control sizing refactor', group: 'Engineering', start: at(3, 9), end: at(3, 18), progress: 0.4, dependsOn: ['t-tokens'] },
  { id: 't-charts', label: 'Chart primitives', group: 'Engineering', start: at(3, 12), end: at(3, 24), progress: 0.25, dependsOn: ['t-dark'] },
  { id: 't-drag', label: 'Gantt and scheduler drag', group: 'Engineering', start: at(3, 16), end: at(3, 27), progress: 0.1 },
  { id: 't-codemod', label: 'v2 → v3 codemod', group: 'Engineering', start: at(3, 23), end: at(3, 31), dependsOn: ['t-controls'] },
  { id: 't-docs', label: 'Docs rewrite', group: 'Docs', start: at(3, 18), end: at(3, 30), progress: 0.15, dependsOn: ['t-controls'] },
  { id: 't-rc', label: 'RC cut', group: 'Release', start: at(4, 1), end: at(4, 1), milestone: true, dependsOn: ['t-charts', 't-docs', 't-codemod'] },
  { id: 't-bake', label: 'Bake and a11y audit', group: 'Release', start: at(4, 1), end: at(4, 8), dependsOn: ['t-rc'] },
  // Locked: the launch date was promised externally, so it must not move with a drag.
  { id: 't-ship', label: '3.0 ships', group: 'Release', start: at(4, 9), end: at(4, 9), milestone: true, locked: true, dependsOn: ['t-bake'] },
]

const INITIAL_EVENTS: SchedulerEvent[] = [
  { id: 'e-standup-mon', title: 'Standup', start: at(3, 2, 9, 30), end: at(3, 2, 9, 45) },
  { id: 'e-tokens', title: 'Token audit walkthrough', start: at(3, 2, 10, 0), end: at(3, 2, 11, 30) },
  { id: 'e-1on1-ada', title: '1:1 Grace / Ada', start: at(3, 2, 14, 0), end: at(3, 2, 14, 30) },
  { id: 'e-standup-tue', title: 'Standup', start: at(3, 3, 9, 30), end: at(3, 3, 9, 45) },
  { id: 'e-design-crit', title: 'Design crit — dark mode', start: at(3, 3, 11, 0), end: at(3, 3, 12, 30) },
  { id: 'e-pairing', title: 'Pairing: control sizing', start: at(3, 3, 15, 0), end: at(3, 3, 17, 0) },
  { id: 'e-standup-wed', title: 'Standup', start: at(3, 4, 9, 30), end: at(3, 4, 9, 45) },
  { id: 'e-release-sync', title: 'Release train sync', start: at(3, 4, 13, 0), end: at(3, 4, 14, 0) },
  { id: 'e-a11y', title: 'Accessibility review', start: at(3, 4, 15, 30), end: at(3, 4, 17, 0) },
  { id: 'e-standup-thu', title: 'Standup', start: at(3, 5, 9, 30), end: at(3, 5, 9, 45) },
  { id: 'e-charts', title: 'Chart primitives deep dive', start: at(3, 5, 10, 0), end: at(3, 5, 12, 0) },
  { id: 'e-1on1-kat', title: '1:1 Grace / Katherine', start: at(3, 5, 16, 0), end: at(3, 5, 16, 30) },
  { id: 'e-standup-fri', title: 'Standup', start: at(3, 6, 9, 30), end: at(3, 6, 9, 45) },
  { id: 'e-demo', title: 'Friday demo', start: at(3, 6, 15, 0), end: at(3, 6, 16, 0) },
  // Locked because everyone in the room agreed to it — the drag handles skip it.
  { id: 'e-retro', title: 'Sprint retro', start: at(3, 6, 16, 30), end: at(3, 6, 17, 30), locked: true },
]

const ACCENT = {
  design: dataFills[1],
  engineering: dataFills[0],
  docs: dataFills[3],
  release: dataFills[2],
}

const INITIAL_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    cards: [
      { id: 'k-1', title: 'Virtualise the data grid body', meta: 'ASX-412 · Barbara Liskov', accent: ACCENT.engineering },
      { id: 'k-2', title: 'Motion tokens for overlays', meta: 'ASX-418 · Jean Bartik', accent: ACCENT.design },
      { id: 'k-3', title: 'Deprecate the legacy Popover API', meta: 'ASX-421 · Ada Lovelace', accent: ACCENT.engineering },
      { id: 'k-4', title: 'Recipes page for the app shell', meta: 'ASX-430 · Karen Spärck Jones', accent: ACCENT.docs },
    ],
  },
  {
    id: 'progress',
    title: 'In progress',
    // A WIP limit is the whole point of a board: the column turns when it is full.
    limit: 4,
    cards: [
      { id: 'k-5', title: 'Control sizing refactor', meta: 'ASX-388 · Ada Lovelace', accent: ACCENT.engineering },
      { id: 'k-6', title: 'Dark-mode palette pass 2', meta: 'ASX-391 · Jean Bartik', accent: ACCENT.design },
      { id: 'k-7', title: 'Chart axis ticks', meta: 'ASX-402 · Alan Turing', accent: ACCENT.engineering },
    ],
  },
  {
    id: 'review',
    title: 'In review',
    cards: [
      { id: 'k-8', title: 'Squircle radii on inputs', meta: 'ASX-377 · Katherine Johnson', accent: ACCENT.design },
      { id: 'k-9', title: 'Scheduler keyboard drag', meta: 'ASX-395 · Barbara Liskov', accent: ACCENT.engineering },
    ],
  },
  {
    id: 'done',
    title: 'Shipped',
    cards: [
      { id: 'k-10', title: 'Token audit', meta: 'ASX-361 · Katherine Johnson', accent: ACCENT.design },
      { id: 'k-11', title: 'Registry CDN cutover', meta: 'ASX-370 · Radia Perlman', accent: ACCENT.release },
      { id: 'k-12', title: 'Sidebar inset variant', meta: 'ASX-352 · Ada Lovelace', accent: ACCENT.engineering },
    ],
  },
]

const RELEASE_STEPS: Omit<Step, 'status'>[] = [
  { id: 'scope', label: 'Scope locked', description: '41 issues in the 3.0 milestone' },
  { id: 'code', label: 'Code freeze', description: 'main closed to features' },
  { id: 'rc', label: 'RC cut', description: 'v3.0.0-rc.1 to the registry' },
  { id: 'bake', label: 'Bake', description: 'Seven days on the canary channel' },
  { id: 'audit', label: 'A11y audit', description: 'External, WCAG 2.2 AA' },
  { id: 'ship', label: 'Ship', description: 'Tag, changelog, announcement' },
]

const CRON_JOBS: CronJob[] = [
  {
    id: 'cron-visual',
    name: 'Visual regression suite',
    expression: '0 2 * * *',
    description: '412 stories across light and dark',
    lastRun: at(3, 4, 2, 0),
    nextRun: at(3, 5, 2, 0),
    lastStatus: 'success',
    lastDuration: 742,
  },
  {
    id: 'cron-changelog',
    name: 'Draft the weekly changelog',
    expression: '0 9 * * 1',
    description: 'Opens a PR against docs/changelog.mdx',
    lastRun: at(3, 2, 9, 0),
    nextRun: at(3, 9, 9, 0),
    lastStatus: 'success',
    lastDuration: 31,
  },
  {
    id: 'cron-registry',
    name: 'Publish the component registry',
    expression: '*/30 * * * *',
    description: 'Rebuilds the shadcn-compatible manifest',
    lastRun: at(3, 4, 11, 0),
    nextRun: at(3, 4, 11, 30),
    lastStatus: 'running',
  },
  {
    id: 'cron-bundle',
    name: 'Bundle size budget',
    expression: '15 * * * *',
    description: 'Fails the build over 42 kB gzipped',
    lastRun: at(3, 4, 10, 15),
    nextRun: at(3, 4, 11, 15),
    lastStatus: 'failed',
    lastDuration: 88,
  },
  {
    id: 'cron-stale',
    name: 'Sweep stale branches',
    expression: '0 4 * * 6',
    description: 'Paused while the 3.0 branches are alive',
    lastRun: at(2, 28, 4, 0),
    nextRun: at(3, 7, 4, 0),
    lastStatus: 'success',
    lastDuration: 12,
    paused: true,
  },
]

const ACTIVITY = [
  { id: 'a-1', title: 'Grace Hopper moved the RC cut to 1 April', time: 'Today, 10:42', tone: 'info' as const, body: 'Two extra days for the codemod. The ship date did not move.' },
  { id: 'a-2', title: 'Alan Turing opened ASX-402', time: 'Today, 09:58', tone: 'default' as const, body: 'Chart axis ticks collide below 320px. Needs a tick-skipping rule.' },
  { id: 'a-3', title: 'Bundle size budget failed', time: 'Today, 10:15', tone: 'danger' as const, body: '43.1 kB gzipped, 1.1 kB over. The chart primitives pulled in a date helper.' },
  { id: 'a-4', title: 'Katherine Johnson closed the token audit', time: 'Yesterday, 17:20', tone: 'success' as const, body: '38 tokens renamed, 6 removed, the codemod covers all of them.' },
  { id: 'a-5', title: 'Radia Perlman cut over the registry CDN', time: 'Mon, 14:05', tone: 'success' as const, body: 'Median install dropped from 4.1s to 1.3s.' },
  { id: 'a-6', title: 'Sprint 24 planned', time: 'Mon, 11:00', tone: 'muted' as const, body: '14 cards, 4 in flight, WIP limit set to 4.' },
]

const DATE_LABEL = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const TIME_LABEL = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const dayCount = (start: Date, end: Date) =>
  Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)

function Planner() {
  const [section, setSection] = useState('roadmap')
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [events, setEvents] = useState(INITIAL_EVENTS)
  const [columns, setColumns] = useState(INITIAL_COLUMNS)
  const [selectedTaskId, setSelectedTaskId] = useState('t-controls')
  const [selectedPerson, setSelectedPerson] = useState<string>('ada')
  const [day, setDay] = useState<Date>(at(3, 4))
  const [month, setMonth] = useState<Date>(at(3, 1))
  const [stage, setStage] = useState(2)

  const selectedTask = tasks.find((task) => task.id === selectedTaskId)

  // Recomputed from `events`, so dragging a block in the scheduler immediately
  // rewrites the agenda in the sidebar rather than leaving two versions of the
  // week on screen.
  const agenda = useMemo(
    () =>
      events
        .filter((event) => sameDay(toDate(event.start), day))
        .sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime()),
    [events, day],
  )

  const steps: Step[] = RELEASE_STEPS.map((step, index) => ({
    ...step,
    status: index < stage ? 'complete' : index === stage ? 'active' : 'pending',
  }))

  /**
   * The board owns its cards. `Kanban` reports the intent and never reorders
   * anything itself, so a move that is not written back here would spring back
   * on the next render.
   */
  const moveCard = (cardId: string, from: string, to: string) => {
    if (from === to) return
    setColumns((current) => {
      const card = current.find((column) => column.id === from)?.cards.find((item) => item.id === cardId)
      if (!card) return current
      return current.map((column) => {
        if (column.id === from) return { ...column, cards: column.cards.filter((item) => item.id !== cardId) }
        if (column.id === to) return { ...column, cards: [...column.cards, card] }
        return column
      })
    })
  }

  const inFlight = columns.find((column) => column.id === 'progress')

  return (
    <AppFrame
      inset
      product="Planner"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title="Design system 3.0"
      user={{ name: 'Grace Hopper', plan: 'Engineering' }}
      actions={
        <div className="flex items-center gap-2">
          <AvatarGroup size="sm" max={5} className="hidden lg:flex">
            {Object.values(TEAM).map((person) => (
              <Avatar key={person.name} name={person.name} />
            ))}
          </AvatarGroup>
          <Tooltip content="Ship date is locked to 9 April">
            <Badge color="amber" icon={<Timer />}>36 days to ship</Badge>
          </Tooltip>
          <Button size="sm">
            <GitMerge /> New task
          </Button>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <Card size="sm">
            <CardBody size="sm" className="flex justify-center">
              <Calendar
                mode="single"
                selected={day}
                // Clicking the selected day clears it; the agenda beside this
                // always wants a day, so an undefined selection is ignored.
                onSelect={(value) => value && setDay(value)}
                month={month}
                onMonthChange={setMonth}
                locale="en-GB"
              />
            </CardBody>
          </Card>

          <Card size="sm">
            <CardHeader size="sm">
              <CardTitle as="h2">{DATE_LABEL.format(day)}</CardTitle>
              <CardDescription>
                {agenda.length === 0
                  ? 'Nothing scheduled.'
                  : `${agenda.length} block${agenda.length === 1 ? '' : 's'} — drag one in the week view and this follows.`}
              </CardDescription>
            </CardHeader>
            <CardBody size="sm">
              {agenda.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Pick a day in March to see the week's blocks.
                </p>
              ) : (
                <DescriptionList columns={false}>
                  {agenda.map((event) => (
                    <div key={event.id} className="contents">
                      <DescriptionTerm className="font-mono text-xs tabular-nums">
                        {TIME_LABEL.format(toDate(event.start))}–{TIME_LABEL.format(toDate(event.end))}
                      </DescriptionTerm>
                      <DescriptionDetails className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{event.title}</span>
                        {event.locked && <Badge size="sm" variant="outline">locked</Badge>}
                      </DescriptionDetails>
                    </div>
                  ))}
                </DescriptionList>
              )}
            </CardBody>
          </Card>

          <Separator label="selection" />

          <Card size="sm">
            <CardHeader size="sm">
              <CardTitle as="h2">
                {selectedTask ? selectedTask.label : 'No task selected'}
              </CardTitle>
              <CardDescription>
                {selectedTask ? 'Drag the bar and these values update.' : 'Click a bar in the roadmap.'}
              </CardDescription>
            </CardHeader>
            <CardBody size="sm">
              {selectedTask ? (
                <DescriptionPairs
                  columns={false}
                  divided
                  items={[
                    { term: 'Group', details: selectedTask.group ?? '—' },
                    {
                      term: 'Owner',
                      details: (
                        <span className="flex items-center gap-2">
                          <Avatar size="xs" name={TEAM[TASK_OWNER[selectedTask.id]].name} />
                          {TEAM[TASK_OWNER[selectedTask.id]].name}
                        </span>
                      ),
                    },
                    { term: 'Starts', details: DATE_LABEL.format(toDate(selectedTask.start)) },
                    { term: 'Ends', details: DATE_LABEL.format(toDate(selectedTask.end)) },
                    {
                      term: 'Span',
                      details: `${dayCount(toDate(selectedTask.start), toDate(selectedTask.end))} days`,
                    },
                    {
                      term: 'Progress',
                      details: selectedTask.progress === undefined
                        ? 'Not started'
                        : `${Math.round(selectedTask.progress * 100)}%`,
                    },
                    {
                      term: 'Depends on',
                      details: selectedTask.dependsOn?.length
                        ? selectedTask.dependsOn
                            .map((id) => tasks.find((task) => task.id === id)?.label ?? id)
                            .join(', ')
                        : 'Nothing',
                    },
                  ]}
                />
              ) : (
                <p className="text-muted-foreground text-xs">
                  Task dates, owner and dependencies show up here.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        <Card>
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={stage === 0}
                  onClick={() => setStage((value) => Math.max(0, value - 1))}
                >
                  <ChevronLeft /> Roll back
                </Button>
                <Button
                  size="sm"
                  disabled={stage >= RELEASE_STEPS.length - 1}
                  onClick={() => setStage((value) => Math.min(RELEASE_STEPS.length - 1, value + 1))}
                >
                  Advance <ChevronRight />
                </Button>
              </div>
            }
          >
            <CardTitle as="h2">Release train</CardTitle>
            <CardDescription>
              Currently at <strong className="font-medium">{steps[stage]?.label ?? 'shipped'}</strong>.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Stepper steps={steps} current={stage} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Roadmap</CardTitle>
            <CardDescription>
              Drag a bar or its edges to reschedule. The critical path redraws itself, and the
              9 April milestone is locked because the date was promised outside the team.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Gantt
              tasks={tasks}
              onChange={setTasks}
              onSelect={(task) => setSelectedTaskId(task.id)}
              selectedId={selectedTaskId}
              today={NOW}
              labelWidth={200}
              dateFormat={(date) => DATE_LABEL.format(date)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEvents(INITIAL_EVENTS)}
                disabled={events === INITIAL_EVENTS}
              >
                Reset week
              </Button>
            }
          >
            <CardTitle as="h2">Week of 2 March</CardTitle>
            <CardDescription>
              Drag a block to move it, or its bottom edge to make it longer.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Scheduler
              events={events}
              onChange={setEvents}
              onSelect={(event) => setDay(toDate(event.start))}
              week={WEEK}
              days={5}
              dayStart={9}
              dayEnd={18}
              hourHeight={52}
              locale="en-GB"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            action={
              <Badge
                color={inFlight && inFlight.limit !== undefined && inFlight.cards.length >= inFlight.limit ? 'rose' : 'neutral'}
              >
                {inFlight?.cards.length ?? 0} / {inFlight?.limit ?? 0} in flight
              </Badge>
            }
          >
            <CardTitle as="h2">Sprint 24</CardTitle>
            <CardDescription>
              Cards stay where you drop them — the board reports the move and this page owns the state.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Kanban columns={columns} onMove={moveCard} emptyLabel="Drop a card here" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Around the work</CardTitle>
            <CardDescription>Who owns what, what happened, and what runs on its own.</CardDescription>
          </CardHeader>

          <Tabs defaultValue="team" className="gap-0">
            <div className="border-border border-b px-4.5 py-2">
              <TabsList variant="underline">
                <TabsTrigger value="team" variant="underline">
                  <Users /> Team
                </TabsTrigger>
                <TabsTrigger value="activity" variant="underline">
                  <MessageSquare /> Activity
                </TabsTrigger>
                <TabsTrigger value="automation" variant="underline">
                  <Zap /> Automation
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="team" className="space-y-4 p-4.5">
              <OrgChart
                nodes={ORG_NODES}
                selectedId={selectedPerson}
                onSelect={(node) => setSelectedPerson(node.id)}
                defaultDepth={3}
              />
              {(() => {
                const person = TEAM[selectedPerson as PersonKey]
                const owned = tasks.filter((task) => TASK_OWNER[task.id] === selectedPerson)
                if (!person) return null
                return (
                  <div className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3">
                    <Avatar name={person.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{person.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{person.title}</p>
                    </div>
                    <Badge color={owned.length > 0 ? 'blue' : 'neutral'} icon={<ClipboardList />}>
                      {owned.length} roadmap {owned.length === 1 ? 'item' : 'items'}
                    </Badge>
                    {owned.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedTaskId(owned[0].id)}
                      >
                        Show first
                      </Button>
                    )}
                  </div>
                )
              })()}
            </TabsContent>

            <TabsContent value="activity" className="p-4.5">
              <Timeline>
                {ACTIVITY.map((entry) => (
                  <TimelineItem
                    key={entry.id}
                    title={entry.title}
                    time={entry.time}
                    tone={entry.tone}
                    icon={entry.tone === 'success' ? <CheckCircle2 /> : undefined}
                  >
                    {/* The panel, not bare children: these entries are quoted
                        detail rather than a caption on the headline. */}
                    <TimelineContent>{entry.body}</TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </TabsContent>

            <TabsContent value="automation" className="p-4.5">
              <CronSchedule jobs={CRON_JOBS} now={NOW} locale="en-GB" />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppFrame>
  )
}

export const plannerExample: ExampleEntry = {
  id: 'planner',
  label: 'Planner',
  description:
    'Scheduling a release across a team: a draggable Gantt whose bars write back to state, a week view that rewrites the day agenda beside it, a board with a WIP limit that remembers every move, plus the org chart, activity trail and cron jobs around the work.',
  uses: [
    'Gantt', 'Scheduler', 'Kanban', 'Calendar', 'Timeline', 'Org Chart',
    'Stepper', 'Cron Schedule', 'Description List', 'Avatar',
  ],
  render: () => <Planner />,
}
