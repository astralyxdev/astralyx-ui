import { useState } from 'react'
import { Gantt, type GanttTask } from '@/components/ui/gantt'
import { OrgChart, type OrgNode } from '@/components/ui/org-chart'
import { Scheduler, type SchedulerEvent } from '@/components/ui/scheduler'
import type { ComponentEntry } from './types'

/** Fixed dates, so the docs render the same picture every time. */
const MONDAY = new Date('2026-04-06T00:00:00')
const day = (offset: number, hour = 0, minute = 0) => {
  const date = new Date(MONDAY)
  date.setDate(MONDAY.getDate() + offset)
  date.setHours(hour, minute, 0, 0)
  return date
}

/* ---------------------------------------------------------------- gantt */

const PLAN: GanttTask[] = [
  { id: 'spec', label: 'Spec', start: day(0), end: day(4), progress: 1 },
  { id: 'design', label: 'Design', start: day(3), end: day(10), progress: 0.8, dependsOn: ['spec'] },
  { id: 'api', label: 'API', start: day(5), end: day(16), progress: 0.55, dependsOn: ['spec'] },
  { id: 'ui', label: 'UI', start: day(11), end: day(22), progress: 0.3, dependsOn: ['design'] },
  { id: 'integrate', label: 'Integration', start: day(18), end: day(26), dependsOn: ['api', 'ui'] },
  { id: 'qa', label: 'QA', start: day(24), end: day(31), dependsOn: ['integrate'] },
  { id: 'docs', label: 'Docs', start: day(20), end: day(28), dependsOn: ['ui'] },
  { id: 'launch', label: 'Launch', start: day(32), end: day(32), dependsOn: ['qa'], milestone: true },
]

function GanttDemo({
  criticalPath = true,
  rowHeight = 30,
}: {
  criticalPath?: boolean
  rowHeight?: number
}) {
  const [tasks, setTasks] = useState<GanttTask[]>(PLAN)
  return (
    <div className="flex w-full flex-col gap-2">
      <Gantt
        className="w-full"
        tasks={tasks}
        onChange={setTasks}
        criticalPath={criticalPath}
        rowHeight={rowHeight}
        today={day(14)}
      />
      <p className="text-muted-foreground text-xs">
        Drag a bar to reschedule, its edges to change the start or end. Focus one and use the arrow
        keys — shift-arrow changes the end.
      </p>
    </div>
  )
}

export const ganttEntry: ComponentEntry = {
  id: 'gantt',
  label: 'Gantt',
  isNew: true,
  description:
    'Work on a timeline: drag a bar to reschedule and its edges to change the start or end, with a computed critical path and dependency conflicts surfaced as you create them.',
  usage: `import { Gantt } from '@/components/ui/gantt'

<Gantt tasks={tasks} onChange={setTasks} criticalPath today={new Date()} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'criticalPath', label: 'criticalPath', default: true },
      { type: 'number', prop: 'rowHeight', label: 'rowHeight', default: 30, min: 22, max: 48, step: 2 },
    ],
    render: (state) => (
      <GanttDemo
        criticalPath={Boolean(state.criticalPath)}
        rowHeight={Number(state.rowHeight) || 30}
      />
    ),
    code: (state) =>
      `<Gantt\n  tasks={tasks}\n  criticalPath={${Boolean(state.criticalPath)}}\n  today={new Date()}\n/>`,
  },
  api: [
    { name: 'tasks', type: 'GanttTask[]', description: '{ id, label, start, end, progress?, dependsOn?, milestone? }.' },
    { name: 'vs Kanban / Timeline / Stepper', type: 'the missing view', description: 'Kanban shows state and hides time. A timeline shows moments, not spans. A stepper shows order, not overlap. Only this shows how long, and at the same time as what.' },
    { name: 'criticalPath', type: 'computed', description: 'The longest dependency chain is derived from the data. Marking it by hand is how a Gantt goes stale — someone slips a task, nobody re-marks the path, and it points at the wrong risk.' },
    { name: 'onChange / onTaskChange', type: 'the whole list / one task', description: 'Supplying either makes the chart editable; omitting both makes it read-only. A read-only Gantt is a printout of a plan, and the reason to look at one is usually that something needs moving.' },
    { name: 'dragging', type: 'body and edges', description: 'The body moves the task and keeps its duration; the edges change the start and the end independently. Handles are 8px, which is the difference between resizing and moving by accident.' },
    { name: 'keyboard', type: 'arrows and shift-arrow', description: 'Arrows move by one snap, shift-arrow changes the end, and the dates are announced through `aria-valuetext`. A chart editable only by pointer is not editable at all for a good number of people.' },
    { name: 'snapMinutes', type: 'number', default: '1440', description: 'A day. Dragging to arbitrary millisecond boundaries produces a plan nobody can read back.' },
    { name: 'conflicts', type: 'live', description: 'Recomputed against the drag rather than the saved data, so an impossible schedule looks impossible while you are making it.' },
    { name: 'monochrome', type: 'shape, not hue', description: 'A plan is read for structure — what is long, what overlaps, what is late — and arbitrary per-task colour adds a legend without adding information. The critical path is ringed and a conflict is outlined in dashes, so neither state is carried by colour alone.' },
    { name: 'today', type: 'Date', description: 'A vertical marker. Omitted by default rather than assumed.' },
  ],
  demos: [
    {
      title: 'A release plan, critical path marked',
      stack: true,
      code: `<Gantt tasks={plan} onChange={setPlan} criticalPath today={new Date()} />`,
      render: () => <GanttDemo />,
    },
  ],
}

/* ------------------------------------------------------------ scheduler */

const WEEK: SchedulerEvent[] = [
  { id: 'standup-1', title: 'Standup', start: day(0, 9, 30), end: day(0, 9, 45) },
  { id: 'design', title: 'Design review', start: day(0, 11), end: day(0, 12) },
  { id: 'oncall', title: 'On-call handover', start: day(0, 11, 30), end: day(0, 12, 30) },
  { id: 'standup-2', title: 'Standup', start: day(1, 9, 30), end: day(1, 9, 45) },
  { id: 'pairing', title: 'Pairing — encoder', start: day(1, 13), end: day(1, 15) },
  { id: 'retro', title: 'Retro', start: day(2, 16), end: day(2, 17) },
  { id: 'standup-3', title: 'Standup', start: day(2, 9, 30), end: day(2, 9, 45) },
  { id: 'interview', title: 'Interview', start: day(3, 10), end: day(3, 11) },
  { id: 'planning', title: 'Planning', start: day(3, 14), end: day(3, 16) },
  { id: 'demo', title: 'Demo', start: day(4, 15), end: day(4, 16) },
  { id: 'offsite', title: 'Offsite', start: day(4), end: day(4), allDay: true },
]

let created = 0

function SchedulerDemo({
  days = 5,
  dayStart = 8,
  dayEnd = 18,
}: {
  days?: number
  dayStart?: number
  dayEnd?: number
}) {
  const [events, setEvents] = useState<SchedulerEvent[]>(WEEK)
  return (
    <div className="flex w-full flex-col gap-2">
      <Scheduler
        className="w-full"
        events={events}
        onChange={setEvents}
        onCreate={(start, end) => ({
          id: `new-${++created}`,
          title: 'New block',
          start,
          end,
        })}
        week={MONDAY}
        days={days}
        dayStart={dayStart}
        dayEnd={dayEnd}
      />
      <p className="text-muted-foreground text-xs">
        Drag an event to move it — across days too — its bottom edge to change the end, or drag on
        empty grid to block out time.
      </p>
    </div>
  )
}

export const schedulerEntry: ComponentEntry = {
  id: 'scheduler',
  label: 'Scheduler',
  isNew: true,
  description:
    'A week of days with events laid out against the hours and edited in place — drag to move across days, drag an edge to change the end, drag empty grid to create. Overlaps split into columns rather than stacking.',
  usage: `import { Scheduler } from '@/components/ui/scheduler'

<Scheduler events={events} onChange={setEvents} onCreate={make} dayStart={8} dayEnd={20} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'dayStart', label: 'dayStart', default: 8, min: 0, max: 12, step: 1 },
      { type: 'number', prop: 'dayEnd', label: 'dayEnd', default: 18, min: 13, max: 24, step: 1 },
      { type: 'number', prop: 'days', label: 'days', default: 5, min: 1, max: 7, step: 1 },
    ],
    render: (state) => (
      <SchedulerDemo
        days={Number(state.days) || 5}
        dayStart={Number(state.dayStart) || 8}
        dayEnd={Number(state.dayEnd) || 18}
      />
    ),
    code: (state) =>
      `<Scheduler\n  events={events}\n  week={monday}\n  days={${Number(state.days) || 5}}\n  dayStart={${Number(state.dayStart) || 8}}\n  dayEnd={${Number(state.dayEnd) || 18}}\n/>`,
  },
  api: [
    { name: 'events', type: 'SchedulerEvent[]', description: '{ id, title, start, end, color?, allDay? }.' },
    { name: 'vs Calendar', type: 'different jobs', description: '`Calendar` picks a date; this shows what is in it. Conflating them produces a date picker with a broken agenda glued on.' },
    { name: 'overlaps', type: 'columns, not stacks', description: 'Two meetings drawn on top of each other means one is invisible — and the hidden one is the one you miss. Clusters are split into as many columns as they need.' },
    { name: 'timezone', type: 'local day keys', description: 'Keying by UTC date puts a 23:00 event on the wrong day for anyone west of Greenwich — common, and hard to spot from the timezone it was written in.' },
    { name: 'onChange / onEventChange', type: 'the whole list / one event', description: 'Supplying either makes the grid editable. A calendar you cannot drag on is a printout.' },
    { name: 'dragging', type: 'move, resize, create', description: 'The body moves the event across hours *and* days; the bottom edge changes the end; a drag on empty grid draws a new one. The grab offset is kept, so the event does not jump its top to the cursor.' },
    { name: 'onCreate', type: '(start, end) => event | void', description: 'Return an event to add it, or nothing to decline — so a click-drag can open your own dialog instead.' },
    { name: 'snapMinutes', type: 'number', default: '15', description: 'The unit calendars are actually kept in. Without a grid a drag produces 10:07–11:04.' },
    { name: 'keyboard', type: 'arrows and shift-arrow', description: 'Up and down move by a snap, left and right move between days, shift-arrow changes the end.' },
    { name: 'monochrome', type: 'a hairline, not a hue', description: 'Adjacent columns are separated by a border in the page background rather than by colour, so a clash stays readable at any theme and in print.' },
    { name: 'dayStart / dayEnd', type: 'number', default: '8 / 20', description: 'Crops to working hours; eight of the twenty-four rows carry all the information in most calendars.' },
  ],
  demos: [
    {
      title: 'A working week, with a clash',
      stack: true,
      code: `<Scheduler events={events} onChange={setEvents} onCreate={make} week={monday} days={5} />`,
      render: () => <SchedulerDemo days={5} dayStart={9} dayEnd={17} />,
    },
  ],
}

/* ------------------------------------------------------------ org chart */

const PEOPLE: OrgNode[] = [
  { id: 'ada', name: 'Ada Okafor', title: 'CTO', managerId: null },
  { id: 'marc', name: 'Marc Laurent', title: 'VP Engineering', managerId: 'ada' },
  { id: 'rin', name: 'Rin Takahashi', title: 'VP Design', managerId: 'ada' },
  { id: 'sam', name: 'Sam Idris', title: 'Platform lead', managerId: 'marc' },
  { id: 'noor', name: 'Noor Haddad', title: 'Product lead', managerId: 'marc' },
  { id: 'kai', name: 'Kai Lindqvist', title: 'Engineer', managerId: 'sam' },
  { id: 'zoe', name: 'Zoe Marek', title: 'Engineer', managerId: 'sam' },
  { id: 'ivan', name: 'Ivan Petrov', title: 'Engineer', managerId: 'noor' },
  { id: 'lea', name: 'Léa Dubois', title: 'Designer', managerId: 'rin' },
  { id: 'tom', name: 'Tom Achebe', title: 'Researcher', managerId: 'rin' },
  // Deliberate: a contractor with no manager. Rendered as a root, not dropped.
  { id: 'contractor', name: 'Priya Raman', title: 'Contractor — security', managerId: 'nobody' },
]

function OrgDemo({ defaultDepth = 2 }: { defaultDepth?: number }) {
  const [picked, setPicked] = useState<string | undefined>('marc')
  return (
    <OrgChart
      className="w-full"
      nodes={PEOPLE}
      key={defaultDepth}
      defaultDepth={defaultDepth}
      selectedId={picked}
      onSelect={(node) => setPicked(node.id)}
    />
  )
}

export const orgChartEntry: ComponentEntry = {
  id: 'org-chart',
  label: 'Org Chart',
  isNew: true,
  description:
    'A reporting hierarchy drawn top-down with connectors, built from flat { id, managerId } rows. Orphans and multiple roots are rendered rather than dropped; cycles are reported.',
  usage: `import { OrgChart } from '@/components/ui/org-chart'

<OrgChart nodes={people} onSelect={(person) => open(person.id)} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'defaultDepth', label: 'defaultDepth', default: 2, min: 1, max: 4, step: 1 },
    ],
    render: (state) => <OrgDemo defaultDepth={Number(state.defaultDepth) || 2} />,
    code: (state) =>
      `<OrgChart\n  nodes={people}\n  defaultDepth={${Number(state.defaultDepth) || 2}}\n  onSelect={(person) => open(person.id)}\n/>`,
  },
  api: [
    { name: 'nodes', type: 'OrgNode[]', description: 'Flat `{ id, name, title?, managerId }` — how every HR system, directory and database actually stores it. Requiring pre-nested input pushes the same recursion into every caller.' },
    { name: 'vs Tree', type: 'spans, not depth', description: 'A tree is an indented list, right for a filesystem. An org chart is read for spans — how many report to this person, are these two peers — and siblings side by side answer both at a glance.' },
    { name: 'orphans', type: 'rendered as roots', description: 'A vacant manager slot, a contractor, a transfer pointing at a deleted record. Dropping those rows makes the chart quietly wrong.' },
    { name: 'cycles', type: 'reported', description: 'A reports to B reports to A is detected by reachability and surfaced through `onError` rather than recursed into.' },
    { name: 'stackAfter', type: 'number', default: '4', description: 'Past this many children a node lays them out in a column with a spine, rather than a very long horizontal rule.' },
  ],
  demos: [
    {
      title: 'A team, with an unmanaged contractor',
      stack: true,
      code: `<OrgChart nodes={people} onSelect={(person) => open(person.id)} />`,
      render: () => <OrgDemo />,
    },
  ],
}
