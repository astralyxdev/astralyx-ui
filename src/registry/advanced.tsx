import { useState } from 'react'
import {
  Copy, FileText, Folder, Pencil, Plus, Search, Settings, Trash2, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardBody } from '@/components/ui/card'
import { Carousel } from '@/components/ui/carousel'
import { Combobox } from '@/components/ui/combobox'
import { CommandDialog, CommandList } from '@/components/ui/command'
import { ContextMenu } from '@/components/ui/context-menu'
import { DatePicker } from '@/components/ui/date-picker'
import { Empty } from '@/components/ui/empty'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Resizable } from '@/components/ui/resizable'
import { defaultPresets } from '@/lib/date'
import type { ComponentEntry } from './types'

/* ------------------------------------------------------------------ field */

/** The control reads its wiring from context rather than being cloned. */
function WiredInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...useFieldControl()} {...props} />
}

export const fieldEntry: ComponentEntry = {
  id: 'field',
  label: 'Field',
  description:
    'Wires a label, a control, help text and an error message together — id, aria-describedby and aria-invalid, all of which are easy to get one short of by hand.',
  usage: `import { Field, FieldLabel } from '@/components/ui/field'

function EmailField({ error }) {
  return (
    <Field error={error} description="We only use this for receipts.">
      <FieldLabel required>Email</FieldLabel>
      <Input {...useFieldControl()} type="email" />
    </Field>
  )
}`,
  composer: {
    controls: [
      { type: 'text', prop: 'label', label: 'label', default: 'Email' },
      { type: 'text', prop: 'description', label: 'description', default: 'We only use this for receipts.' },
      { type: 'text', prop: 'error', label: 'error', default: '' },
      { type: 'boolean', prop: 'required', label: 'required', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Field
          description={state.description ? String(state.description) : undefined}
          error={state.error ? String(state.error) : undefined}
        >
          <FieldLabel required={Boolean(state.required)}>{String(state.label)}</FieldLabel>
          <WiredInput type="email" placeholder="you@example.com" />
        </Field>
      </div>
    ),
    code: (state) =>
      `<Field\n  description="${state.description}"\n${state.error ? `  error="${state.error}"\n` : ''}>\n  <FieldLabel${state.required ? ' required' : ''}>${state.label}</FieldLabel>\n  <Input {...useFieldControl()} type="email" />\n</Field>`,
  },
  api: [
    { name: 'error', type: 'ReactNode', description: 'Message under the control. Its presence is what marks the field invalid — there is no separate flag to keep in sync.' },
    { name: 'description', type: 'ReactNode', description: 'Help text. Hidden while an error is showing, so the two never stack.' },
    { name: 'useFieldControl()', type: '() => props', description: 'Spread onto any control: returns id, aria-describedby and aria-invalid. Works with controls this kit does not own.' },
    { name: 'FieldLabel', type: 'Label', description: 'A Label with htmlFor already pointed at the control.' },
  ],
  demos: [
    {
      title: 'Valid and invalid',
      stack: true,
      code: `<Field description="We only use this for receipts.">…</Field>
<Field error="Enter a valid email address.">…</Field>`,
      render: () => (
        <div className="w-full max-w-sm space-y-6">
          <Field description="We only use this for receipts.">
            <FieldLabel required>Email</FieldLabel>
            <WiredInput type="email" placeholder="you@example.com" />
          </Field>
          <Field error="Enter a valid email address.">
            <FieldLabel required>Email</FieldLabel>
            <WiredInput type="email" defaultValue="not-an-email" error />
          </Field>
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------------ empty */

export const emptyEntry: ComponentEntry = {
  id: 'empty',
  label: 'Empty',
  description:
    'The state a list is in before it has anything in it. An icon, a reason and a next action are what make the empty case useful rather than merely honest.',
  usage: `import { Empty } from '@/components/ui/empty'

<Empty
  icon={<Folder />}
  title="No projects yet"
  description="Create your first project to get started."
  action={<Button size="sm">New project</Button>}
/>`,
  composer: {
    controls: [
      { type: 'text', prop: 'title', label: 'title', default: 'No projects yet' },
      { type: 'text', prop: 'description', label: 'description', default: 'Create your first project to get started.' },
      { type: 'boolean', prop: 'icon', label: 'icon', default: true },
      { type: 'boolean', prop: 'action', label: 'action', default: true },
      { type: 'boolean', prop: 'bordered', label: 'bordered', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <Empty
          icon={state.icon ? <Folder /> : undefined}
          title={String(state.title)}
          description={String(state.description)}
          bordered={Boolean(state.bordered)}
          action={state.action ? <Button size="sm"><Plus /> New project</Button> : undefined}
        />
      </div>
    ),
    code: (state) =>
      `<Empty\n${state.icon ? '  icon={<Folder />}\n' : ''}  title="${state.title}"\n  description="${state.description}"\n${state.action ? '  action={<Button size="sm">New project</Button>}\n' : ''}/>`,
  },
  api: [
    { name: 'icon / title / description', type: 'ReactNode', description: 'The three parts of a useful empty state.' },
    { name: 'action', type: 'ReactNode', description: 'The next step — usually the button that creates the missing thing.' },
    { name: 'bordered', type: 'boolean', default: 'true', description: 'Dashed outline. Turn it off inside a card that already has one.' },
  ],
  demos: [
    {
      title: 'With an action',
      stack: true,
      code: `<Empty icon={<Folder />} title="No projects yet" action={<Button>New</Button>} />`,
      render: () => (
        <Empty
          icon={<Folder />}
          title="No projects yet"
          description="Create your first project to get started."
          action={<Button size="sm"><Plus /> New project</Button>}
        />
      ),
    },
    {
      title: 'Search with no results',
      stack: true,
      code: `<Empty icon={<Search />} title="No matches" description="Try a different term." />`,
      render: () => (
        <Empty icon={<Search />} title="No matches for “astro”" description="Try a different term or clear the filters." />
      ),
    },
  ],
}

/* --------------------------------------------------------------- calendar */

export const calendarEntry: ComponentEntry = {
  id: 'calendar',
  label: 'Calendar',
  description:
    'A date grid in single or range mode, with presets, times, dropdown captions and multiple months. No date library — the grid, weekday names and times all come from Intl.',
  usage: `import { Calendar } from '@/components/ui/calendar'

// single
<Calendar selected={date} onSelect={setDate} />

// range, with quick presets and two months
<Calendar
  mode="range"
  numberOfMonths={2}
  presets={defaultPresets()}
  selected={range}
  onSelect={setRange}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'mode', label: 'mode', options: ['single', 'range'], default: 'single' },
      { type: 'select', prop: 'numberOfMonths', label: 'numberOfMonths', options: ['1', '2'], default: '1' },
      { type: 'select', prop: 'captionLayout', label: 'captionLayout', options: ['label', 'dropdown'], default: 'label' },
      { type: 'select', prop: 'weekStartsOn', label: 'weekStartsOn', options: ['1', '0', '6'], default: '1' },
      { type: 'select', prop: 'locale', label: 'locale', options: ['en-GB', 'en-US', 'de-DE', 'fr-FR', 'ru-RU'], default: 'en-GB' },
      { type: 'boolean', prop: 'showTime', label: 'showTime', default: false },
      { type: 'boolean', prop: 'presets', label: 'presets', default: false },
      { type: 'boolean', prop: 'showOutsideDays', label: 'showOutsideDays', default: true },
      { type: 'boolean', prop: 'noPast', label: 'fromDate = today', default: false },
    ],
    render: (state) => {
      const shared = {
        numberOfMonths: Number(state.numberOfMonths),
        captionLayout: state.captionLayout as 'label' | 'dropdown',
        weekStartsOn: Number(state.weekStartsOn) as 0 | 1 | 6,
        locale: String(state.locale),
        showTime: Boolean(state.showTime),
        showOutsideDays: Boolean(state.showOutsideDays),
        fromDate: state.noPast ? new Date() : undefined,
      }

      return state.mode === 'range' ? (
        <Calendar
          key="range"
          mode="range"
          presets={state.presets ? defaultPresets() : undefined}
          {...shared}
        />
      ) : (
        <Calendar key="single" {...shared} />
      )
    },
    code: (state) =>
      `<Calendar\n${state.mode === 'range' ? '  mode="range"\n' : ''}${state.presets && state.mode === 'range' ? '  presets={defaultPresets()}\n' : ''}  numberOfMonths={${state.numberOfMonths}}\n  captionLayout="${state.captionLayout}"\n  weekStartsOn={${state.weekStartsOn}}\n  locale="${state.locale}"\n${state.showTime ? '  showTime\n' : ''}${state.noPast ? '  fromDate={new Date()}\n' : ''}  onSelect={setValue}\n/>`,
  },
  api: [
    { name: 'mode', type: "'single' | 'range'", default: "'single'", description: 'Range mode drafts the selection: the first click anchors, the pointer paints a preview, the second click or the end of a drag commits.' },
    { name: 'selected / defaultSelected', type: 'Date | DateRange', description: 'Controlled and uncontrolled. Clicking the selected day in single mode clears it.' },
    { name: 'onSelect', type: '(value) => void', description: 'A Date in single mode, a DateRange in range mode. Can be called with undefined when cleared.' },
    { name: 'presets', type: 'CalendarPreset[]', description: 'Quick ranges beside the grid. Range mode only. `defaultPresets()` gives today, last 7, last 30, this and last month.' },
    { name: 'numberOfMonths', type: 'number', default: '1', description: 'Months side by side, each with its own caption.' },
    { name: 'month / defaultMonth / onMonthChange', type: 'Date', description: 'The visible month, controlled or not.' },
    { name: 'captionLayout', type: "'label' | 'dropdown'", default: "'label'", description: 'A static heading, or month and year selects for jumping years at a time.' },
    { name: 'showTime / timeStep', type: 'boolean / number', default: 'false / 5', description: 'Adds hour and minute selects. Picking a new day keeps the time already chosen.' },
    { name: 'fromDate / toDate', type: 'Date', description: 'Bounds. Days outside them are disabled, and the arrows stop at the edge.' },
    { name: 'disabled', type: '(date: Date) => boolean', description: 'Arbitrary per-day rule — weekends, holidays, booked dates.' },
    { name: 'weekStartsOn', type: '0–6', default: '1', description: 'Any weekday, not just Sunday or Monday.' },
    { name: 'renderDay / footer', type: 'ReactNode', description: 'Custom day content (cells grow to fit) and an arbitrary footer.' },
  ],
  demos: [
    { title: 'Single', stack: true, code: `<Calendar selected={date} onSelect={setDate} />`, render: () => <Calendar /> },
    {
      title: 'Range with presets and two months',
      stack: true,
      code: `<Calendar mode="range" numberOfMonths={2} presets={defaultPresets()} />`,
      render: () => <Calendar mode="range" numberOfMonths={2} presets={defaultPresets()} />,
    },
    {
      title: 'Dropdown caption and a time',
      stack: true,
      code: `<Calendar captionLayout="dropdown" showTime />`,
      render: () => <Calendar captionLayout="dropdown" showTime defaultSelected={new Date()} />,
    },
    {
      title: 'Bounded, no weekends',
      stack: true,
      code: `<Calendar fromDate={new Date()} disabled={(d) => [0, 6].includes(d.getDay())} />`,
      render: () => (
        <Calendar fromDate={new Date()} disabled={(d) => [0, 6].includes(d.getDay())} />
      ),
    },
  ],
}

/* ------------------------------------------------------------ date picker */

export const datePickerEntry: ComponentEntry = {
  id: 'date-picker',
  label: 'Date Picker',
  description:
    'Calendar in a Popover with a trigger that reads like an Input. Every Calendar capability passes through — range, presets, times, multiple months — so there is one date implementation, not two.',
  usage: `import { DatePicker } from '@/components/ui/date-picker'

<DatePicker value={date} onValueChange={setDate} />

<DatePicker
  mode="range"
  presets={defaultPresets()}
  onValueChange={setRange}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'mode', label: 'mode', options: ['single', 'range'], default: 'single' },
      { type: 'select', prop: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
      { type: 'select', prop: 'locale', label: 'locale', options: ['en-GB', 'en-US', 'de-DE'], default: 'en-GB' },
      { type: 'boolean', prop: 'showTime', label: 'showTime', default: false },
      { type: 'boolean', prop: 'presets', label: 'presets', default: true },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => {
      const shared = {
        size: state.size as 'xs' | 'sm' | 'md' | 'lg' | 'xl',
        locale: String(state.locale),
        showTime: Boolean(state.showTime),
        error: Boolean(state.error),
        disabled: Boolean(state.disabled),
      }
      return (
        <div className="w-full max-w-sm">
          {state.mode === 'range' ? (
            <DatePicker
              key="range"
              mode="range"
              presets={state.presets ? defaultPresets() : undefined}
              {...shared}
            />
          ) : (
            <DatePicker key="single" {...shared} />
          )}
        </div>
      )
    },
    code: (state) =>
      `<DatePicker\n${state.mode === 'range' ? '  mode="range"\n' : ''}${state.presets && state.mode === 'range' ? '  presets={defaultPresets()}\n' : ''}  size="${state.size}"\n  locale="${state.locale}"\n${state.showTime ? '  showTime\n' : ''}  onValueChange={setValue}\n/>`,
  },
  api: [
    { name: 'mode', type: "'single' | 'range'", default: "'single'", description: 'Range mode defaults to two months and formats the trigger as "from – to".' },
    { name: 'value / defaultValue', type: 'Date | DateRange', description: 'Controlled and uncontrolled.' },
    { name: 'onValueChange', type: '(value) => void', description: 'Fires on every pick, including the first half of a range.' },
    { name: 'closeOnSelect', type: 'boolean', default: '!showTime', description: 'A range waits for both ends. With showTime the popover stays open, since closing on the day would give no chance to set the hour.' },
    { name: 'presets / showTime / numberOfMonths / captionLayout', type: 'passthrough', description: 'Forwarded to the Calendar inside.' },
    { name: 'fromDate / toDate / disabledDate', type: 'bounds', description: 'Bounds and an arbitrary per-day rule. Named disabledDate here so it does not collide with the trigger\'s own disabled.' },
    { name: 'size', type: 'field size', default: "'md'", description: 'Same steps as Input, so the two align in a form row.' },
  ],
  demos: [
    {
      title: 'Single and range',
      stack: true,
      code: `<DatePicker />\n<DatePicker mode="range" presets={defaultPresets()} />`,
      render: () => (
        <div className="w-full max-w-sm space-y-3">
          <DatePicker defaultValue={new Date()} />
          <DatePicker mode="range" presets={defaultPresets()} />
        </div>
      ),
    },
    {
      title: 'With a time',
      stack: true,
      code: `<DatePicker showTime defaultValue={new Date()} />`,
      render: () => (
        <div className="w-full max-w-sm">
          <DatePicker showTime defaultValue={new Date()} />
        </div>
      ),
    },
  ],
}

/* ---------------------------------------------------------------- combobox */

const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'Solid' },
  { value: 'angular', label: 'Angular' },
  { value: 'qwik', label: 'Qwik', disabled: true },
  { value: 'preact', label: 'Preact' },
  { value: 'lit', label: 'Lit' },
]

export const comboboxEntry: ComponentEntry = {
  id: 'combobox',
  label: 'Combobox',
  description:
    'A Select you can type into. The search box lives inside the panel rather than replacing the trigger, so the chosen value stays visible while you filter.',
  usage: `import { Combobox } from '@/components/ui/combobox'

<Combobox options={frameworks} onValueChange={setFramework} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
      { type: 'text', prop: 'placeholder', label: 'placeholder', default: 'Select framework…' },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <Combobox
          options={FRAMEWORKS}
          size={state.size as 'xs' | 'sm' | 'md' | 'lg' | 'xl'}
          placeholder={String(state.placeholder)}
          error={Boolean(state.error)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: (state) =>
      `<Combobox\n  options={frameworks}\n  size="${state.size}"\n  placeholder="${state.placeholder}"\n  onValueChange={setValue}\n/>`,
  },
  api: [
    { name: 'options', type: '{ value, label, disabled? }[]', description: 'The choices. Filtering matches on label, case-insensitively.' },
    { name: 'value / defaultValue', type: 'string', description: 'Controlled and uncontrolled selection.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Fires with the chosen value.' },
    { name: 'searchPlaceholder / emptyMessage', type: 'string', description: 'Text inside the panel.' },
    { name: 'size', type: 'field size', default: "'md'", description: 'Same steps as Input and Select.' },
  ],
  demos: [
    {
      title: 'Searchable select',
      stack: true,
      code: `<Combobox options={frameworks} />`,
      render: () => (
        <div className="w-full max-w-xs">
          <Combobox options={FRAMEWORKS} defaultValue="react" />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------------- command */

const COMMANDS = [
  { id: 'new', label: 'New project', group: 'Actions', icon: <Plus />, shortcut: '⌘+N' },
  { id: 'search', label: 'Search files', group: 'Actions', icon: <Search />, shortcut: '⌘+P', keywords: 'find open' },
  { id: 'copy', label: 'Copy link', group: 'Actions', icon: <Copy /> },
  { id: 'docs', label: 'Documentation', group: 'Go to', icon: <FileText /> },
  { id: 'settings', label: 'Settings', group: 'Go to', icon: <Settings />, shortcut: '⌘+,' },
  { id: 'profile', label: 'Profile', group: 'Go to', icon: <User /> },
  { id: 'delete', label: 'Delete project', group: 'Danger', icon: <Trash2 />, disabled: true },
]

function CommandPreview() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Search /> Open palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} items={COMMANDS} />
    </>
  )
}

export const commandEntry: ComponentEntry = {
  id: 'command',
  label: 'Command',
  description:
    'A command palette: type to filter, arrows to move, Enter to run. Items are data rather than children, because filtering has to reorder and hide them.',
  usage: `import { CommandDialog } from '@/components/ui/command'

<CommandDialog open={open} onOpenChange={setOpen} items={commands} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'inline', label: 'inline (not modal)', default: true }],
    render: (state) =>
      state.inline ? (
        <Card className="w-full max-w-lg overflow-hidden">
          <CommandList items={COMMANDS} autoFocus={false} />
        </Card>
      ) : (
        <CommandPreview />
      ),
    code: (state) =>
      state.inline
        ? `<CommandList items={commands} />`
        : `<CommandDialog open={open} onOpenChange={setOpen} items={commands} />`,
  },
  api: [
    { name: 'items', type: 'CommandItem[]', description: '{ id, label, group?, icon?, shortcut?, keywords?, disabled?, onSelect? }' },
    { name: 'item.keywords', type: 'string', description: 'Extra search terms that are not shown — "find open" makes "Search files" match "open".' },
    { name: 'item.group', type: 'string', description: 'Section heading. Groups collapse when every item in them is filtered out.' },
    { name: 'ranking', type: 'prefix first', description: 'A prefix match on the label ranks above a match anywhere else in the item.' },
    { name: 'CommandDialog', type: 'modal wrapper', description: 'The palette in a native <dialog>, which is how it is normally used.' },
  ],
  demos: [
    { title: 'Inline', stack: true, code: `<CommandList items={commands} />`, render: () => (
      <Card className="w-full max-w-lg overflow-hidden"><CommandList items={COMMANDS} autoFocus={false} /></Card>
    ) },
    { title: 'As a modal', code: `<CommandDialog open={open} onOpenChange={setOpen} items={commands} />`, render: () => <CommandPreview /> },
  ],
}

/* ------------------------------------------------------------ context menu */

export const contextMenuEntry: ComponentEntry = {
  id: 'context-menu',
  label: 'Context Menu',
  description:
    'A menu opened by right-click, positioned at the pointer. It has no element to anchor to — the anchor is a point — so it clamps against the viewport rather than flipping.',
  usage: `import { ContextMenu } from '@/components/ui/context-menu'

<ContextMenu items={items}>
  <div>Right-click me</div>
</ContextMenu>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'destructive', label: 'destructive item', default: true }],
    render: (state) => (
      <ContextMenu
        className="w-full max-w-sm"
        items={[
          { id: 'edit', label: 'Rename', icon: <Pencil />, shortcut: '⌘E' },
          { id: 'copy', label: 'Copy link', icon: <Copy /> },
          ...(state.destructive
            ? [{ id: 'del', label: 'Delete', icon: <Trash2 />, destructive: true, separatorBefore: true }]
            : []),
        ]}
      >
        <Card>
          <CardBody className="text-muted-foreground grid h-28 place-items-center text-sm">
            Right-click anywhere here
          </CardBody>
        </Card>
      </ContextMenu>
    ),
    code: () =>
      `<ContextMenu\n  items={[\n    { id: 'edit', label: 'Rename', icon: <Pencil />, shortcut: '⌘E' },\n    { id: 'del', label: 'Delete', destructive: true, separatorBefore: true },\n  ]}\n>\n  <Card>…</Card>\n</ContextMenu>`,
  },
  api: [
    { name: 'items', type: 'ContextMenuItem[]', description: '{ id, label, icon?, shortcut?, disabled?, destructive?, separatorBefore?, onSelect? }' },
    { name: 'children', type: 'ReactNode', description: 'The region that responds to right-click.' },
    { name: 'positioning', type: 'clamped', description: 'Opens down-and-right from the cursor, pulled back inside the viewport when it would overflow.' },
  ],
  demos: [
    {
      title: 'On a card',
      stack: true,
      code: `<ContextMenu items={items}><Card>…</Card></ContextMenu>`,
      render: () => (
        <ContextMenu
          className="w-full max-w-sm"
          items={[
            { id: 'edit', label: 'Rename', icon: <Pencil />, shortcut: '⌘E' },
            { id: 'copy', label: 'Copy link', icon: <Copy /> },
            { id: 'del', label: 'Delete', icon: <Trash2 />, destructive: true, separatorBefore: true },
          ]}
        >
          <Card>
            <CardBody className="text-muted-foreground grid h-28 place-items-center text-sm">
              Right-click anywhere here
            </CardBody>
          </Card>
        </ContextMenu>
      ),
    },
  ],
}

/* -------------------------------------------------------------- resizable */

export const resizableEntry: ComponentEntry = {
  id: 'resizable',
  label: 'Resizable',
  description:
    'Two panels with a draggable divider. Sizes are percentages, so the split survives a container resize — and the handle is a real slider, so arrow keys resize it too.',
  usage: `import { Resizable } from '@/components/ui/resizable'

<Resizable defaultSize={40} minSize={20} maxSize={80}>
  <aside>…</aside>
  <main>…</main>
</Resizable>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'orientation', label: 'orientation', options: ['horizontal', 'vertical'], default: 'horizontal' },
      { type: 'select', prop: 'defaultSize', label: 'defaultSize', options: ['25', '50', '75'], default: '50' },
    ],
    render: (state) => (
      <Resizable
        key={`${state.orientation}-${state.defaultSize}`}
        orientation={state.orientation as 'horizontal' | 'vertical'}
        defaultSize={Number(state.defaultSize)}
        className="border-border h-56 w-full max-w-lg rounded-2xl border"
      >
        <div className="text-muted-foreground grid h-full place-items-center p-4 text-sm">One</div>
        <div className="text-muted-foreground grid h-full place-items-center p-4 text-sm">Two</div>
      </Resizable>
    ),
    code: (state) =>
      `<Resizable orientation="${state.orientation}" defaultSize={${state.defaultSize}}>\n  <div>One</div>\n  <div>Two</div>\n</Resizable>`,
  },
  api: [
    {
      name: 'responsive',
      type: "'sm' | 'md' | 'lg' | false",
      default: "'md'",
      description:
        'Breakpoint below which the panels stack, since two columns on a phone leave each about 180px. Unlike the other responsive components this is a real orientation change rather than a CSS one — the pointer maths, the arrow keys and the ARIA orientation all depend on which axis is being dragged.',
    },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Which way the panels split.' },
    { name: 'defaultSize', type: 'number', default: '50', description: 'Percentage taken by the first panel.' },
    { name: 'minSize / maxSize', type: 'number', default: '15 / 85', description: 'Clamps, so a panel can never be dragged to nothing.' },
    { name: 'onResize', type: '(size: number) => void', description: 'Fires with the new percentage.' },
    { name: 'keyboard', type: 'arrows', description: 'Arrows move by 2%, Shift+arrows by 10%, Home and End jump to the limits.' },
  ],
  demos: [
    {
      title: 'Horizontal',
      stack: true,
      code: `<Resizable defaultSize={35}>…</Resizable>`,
      render: () => (
        <Resizable defaultSize={35} className="border-border h-48 w-full max-w-lg rounded-2xl border">
          <div className="text-muted-foreground grid h-full place-items-center text-sm">Sidebar</div>
          <div className="text-muted-foreground grid h-full place-items-center text-sm">Content</div>
        </Resizable>
      ),
    },
  ],
}

/* --------------------------------------------------------------- carousel */

export const carouselEntry: ComponentEntry = {
  id: 'carousel',
  label: 'Carousel',
  description:
    'A horizontally scrolling row of slides, built on CSS scroll-snap rather than a transform track — so touch swiping, momentum and keyboard scrolling all keep working.',
  usage: `import { Carousel } from '@/components/ui/carousel'

<Carousel slidesToShow={2}>
  {slides.map((s) => <Slide key={s.id} {...s} />)}
</Carousel>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'slidesToShow', label: 'slidesToShow', options: ['1', '2', '3'], default: '2' },
      { type: 'boolean', prop: 'showDots', label: 'showDots', default: true },
      { type: 'boolean', prop: 'showControls', label: 'showControls', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <Carousel
          slidesToShow={Number(state.slidesToShow)}
          showDots={Boolean(state.showDots)}
          showControls={Boolean(state.showControls)}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i}>
              <CardBody className="text-muted-foreground grid h-28 place-items-center text-sm">
                Slide {i + 1}
              </CardBody>
            </Card>
          ))}
        </Carousel>
      </div>
    ),
    code: (state) =>
      `<Carousel slidesToShow={${state.slidesToShow}}${state.showDots ? '' : ' showDots={false}'}>\n  {slides}\n</Carousel>`,
  },
  api: [
    { name: 'children', type: 'ReactNode[]', description: 'One node per slide. The count drives the dots and the snap maths.' },
    { name: 'slidesToShow', type: 'number', default: '1', description: 'How many slides fit at once. Widths are computed from this and the gap.' },
    { name: 'gap', type: 'number', default: '12', description: 'Space between slides, in px.' },
    { name: 'showControls / showDots', type: 'boolean', default: 'true', description: 'Arrows and position dots below the track.' },
  ],
  demos: [
    {
      title: 'Two at a time',
      stack: true,
      code: `<Carousel slidesToShow={2}>…</Carousel>`,
      render: () => (
        <div className="w-full max-w-lg">
          <Carousel slidesToShow={2}>
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i}>
                <CardBody className="text-muted-foreground grid h-28 place-items-center text-sm">
                  Slide {i + 1}
                </CardBody>
              </Card>
            ))}
          </Carousel>
        </div>
      ),
    },
  ],
}
