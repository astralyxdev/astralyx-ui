'use client'

import { useState } from 'react'
import { DateRangeFilter } from '@/components/ui/date-range-filter'
import {
  FilterField,
  FilterToolbar,
  filterChecks,
  useFilterParams,
  type FilterChip,
} from '@/components/ui/filter-toolbar'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { formatRange, type DateRange } from '@/lib/date'
import type { ComponentEntry } from './types'

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

const REGIONS = [
  { value: '', label: 'Any region' },
  { value: 'eu', label: 'Europe' },
  { value: 'us', label: 'United States' },
  { value: 'apac', label: 'Asia Pacific' },
]

/**
 * The toolbar over plain component state — the shape most lists start with,
 * before anyone asks for the filters to survive a reload.
 */
function ToolbarDemo() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [region, setRegion] = useState('')
  const [dates, setDates] = useState<DateRange | undefined>(undefined)

  const chips: FilterChip[] = [
    q && { key: 'q', label: `Search: ${q}`, onRemove: () => setQ('') },
    status !== 'all' && {
      key: 'status',
      label: `Status: ${STATUSES.find((s) => s.value === status)?.label}`,
      onRemove: () => setStatus('all'),
    },
    region && {
      key: 'region',
      label: `Region: ${REGIONS.find((r) => r.value === region)?.label}`,
      onRemove: () => setRegion(''),
    },
    dates?.from && {
      key: 'dates',
      label: `Date: ${formatRange(dates, 'en-GB')}`,
      onRemove: () => setDates(undefined),
    },
  ].filter((chip): chip is FilterChip => Boolean(chip))

  return (
    <div className="w-full max-w-2xl">
      <FilterToolbar
        search={{ value: q, onChange: setQ, placeholder: 'Search tickets' }}
        quick={
          <SegmentedControl
            label="Status"
            size="sm"
            options={STATUSES}
            value={status}
            onValueChange={setStatus}
          />
        }
        panel={
          <>
            <FilterField label="Region">
              <Select
                size="sm"
                triggerLabel="Region"
                options={REGIONS.map((r) => ({ ...r, value: r.value || 'any' }))}
                value={region || 'any'}
                onValueChange={(value) => setRegion(value === 'any' ? '' : value)}
              />
            </FilterField>
            <FilterField label="Created" htmlFor="created">
              <DateRangeFilter id="created" value={dates} onChange={setDates} />
            </FilterField>
          </>
        }
        panelCount={Number(Boolean(region)) + Number(Boolean(dates?.from))}
        chips={chips}
        onReset={() => {
          setQ('')
          setStatus('all')
          setRegion('')
          setDates(undefined)
        }}
      />
    </div>
  )
}

/**
 * The URL case, with the query string held in state so the demo has no
 * router to lean on. In an app, `params` and `onParamsChange` come from it.
 */
function UrlDemo() {
  const [params, setParams] = useState(() => new URLSearchParams('status=open&offset=40&evil=1'))
  const filters = useFilterParams(['status', 'q'], {
    params,
    onParamsChange: setParams,
    checks: { status: filterChecks.oneOf(['open', 'closed']), q: filterChecks.maxLength(100) },
  })

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <FilterToolbar
        search={{
          value: filters.values.q,
          onChange: (value) => filters.set('q', value),
          placeholder: 'Search',
        }}
        quick={
          <SegmentedControl
            label="Status"
            size="sm"
            options={STATUSES}
            value={filters.values.status || 'all'}
            onValueChange={(value) => filters.set('status', value === 'all' ? '' : value)}
          />
        }
        chips={
          filters.values.status
            ? [{ key: 'status', label: `Status: ${filters.values.status}`, onRemove: () => filters.set('status', '') }]
            : []
        }
        onReset={filters.clear}
      />
      <code className="text-muted-foreground font-mono text-xs">?{params.toString()}</code>
    </div>
  )
}

export const filterToolbarEntry: ComponentEntry = {
  id: 'filter-toolbar',
  label: 'Filter Toolbar',
  isNew: true,
  description:
    'The filter row of a list page: a search box, the most used filter inline, the rest behind "Filters" — a popover on a wide screen, a bottom sheet on a phone — and what applies as removable chips. Values in, changes out, so it works over state, a store or the URL.',
  usage: `import { FilterField, FilterToolbar } from '@/components/ui/filter-toolbar'

<FilterToolbar
  search={{ value: q, onChange: setQ, placeholder: 'Search tickets' }}
  quick={<SegmentedControl label="Status" options={statuses} value={status} onValueChange={setStatus} />}
  panel={
    <FilterField label="Region">
      <Select options={regions} value={region} onValueChange={setRegion} />
    </FilterField>
  }
  panelCount={region ? 1 : 0}
  chips={chips}
  onReset={reset}
/>`,
  api: [
    { name: 'search', type: '{ value, onChange, placeholder?, label?, mono?, maxLength? }', description: 'The search box. It takes the free width of the row and wraps above the rest on a narrow screen.' },
    { name: 'quick', type: 'ReactNode', description: 'The one filter used most, inline. Scrolls sideways rather than wrapping when the row is tight.' },
    { name: 'panel', type: 'ReactNode', description: 'The rest, behind the Filters button, as FilterField each. A popover from `sm` up and a bottom sheet below — on a phone a popover is a screen-wide box whose Done button sits under the keyboard.' },
    { name: 'panelCount', type: 'number', default: '0', description: 'How many of the panel\'s filters apply. Shown on the button, so a filter hidden in the panel is never forgotten.' },
    { name: 'chips', type: 'FilterChip[]', description: '`{ key, label, onRemove }` for each filter that applies, wherever it lives. Removing one keeps focus in the row — on the next chip, then Clear all, then the search box.' },
    { name: 'onReset', type: '() => void', description: 'Clears every filter. Behind Reset in the panel and Clear all under the chips.' },
    { name: 'FilterField', type: 'component', description: 'A caption over one control in the panel. `htmlFor` makes it a real label; `wide` spans both columns.' },
    { name: 'FilterPanel / FilterChips', type: 'component', description: 'The two halves on their own, for a layout the toolbar does not fit.' },
    { name: 'useFilterParams', type: '(keys, { params, onParamsChange, checks? }) => { values, offset, set, setMany, clear, active }', description: 'Filters in the query string, against a plain URLSearchParams so any router can supply one. Changing a filter drops `offset`; `clear` removes only its own keys.' },
    { name: 'checks', type: 'Partial<Record<key, FilterCheck>>', description: 'A link is input from anyone. A value that fails its check reads as unset and is removed from the URL. `filterChecks` has oneOf, matches, maxLength, uuid, isoDateTime and flag.' },
    { name: 'filtersLabel / resetLabel / doneLabel / clearAllLabel / searchLabel', type: 'string', description: 'Visible and accessible text, in English by default.' },
    { name: 'removeLabel / activeCountLabel', type: '(…) => string', description: 'Accessible names that carry a value: "Remove Status: open", "2 active".' },
  ],
  demos: [
    { title: 'Over component state', stack: true, code: `<FilterToolbar search={…} quick={…} panel={…} chips={chips} onReset={reset} />`, render: () => <ToolbarDemo /> },
    {
      title: 'In the URL',
      stack: true,
      code: `const [params, setParams] = useSearchParams()
const filters = useFilterParams(['status', 'q'], {
  params,
  onParamsChange: (next) => setParams(next, { replace: true }),
  checks: { status: filterChecks.oneOf(['open', 'closed']) },
})

filters.values.status   // '' when unset or invalid
filters.set('status', 'open')   // and back to the first page`,
      render: () => <UrlDemo />,
    },
  ],
}

function DateRangeDemo() {
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <DateRangeFilter value={range} onChange={setRange} />
      <code className="text-muted-foreground font-mono text-xs break-all">
        {range?.from && range.to ? `${range.from.toISOString()} → ${range.to.toISOString()}` : 'no range'}
      </code>
    </div>
  )
}

export const dateRangeFilterEntry: ComponentEntry = {
  id: 'date-range-filter',
  label: 'Date Range Filter',
  isNew: true,
  description:
    'A date range as a list filter. It reports a range only once both ends are picked — the first click is half a range, and a filter that hears it fetches "everything since Tuesday" first — and the range runs to the last millisecond of the end day.',
  usage: `import { DateRangeFilter } from '@/components/ui/date-range-filter'

<DateRangeFilter value={range} onChange={setRange} />`,
  api: [
    { name: 'value', type: 'DateRange | undefined', description: 'The applied range. A new value from outside — a chip removed, Reset — drops a half-picked draft.' },
    { name: 'onChange', type: '(range: { from, to } | undefined) => void', description: 'Once per complete range, from the start of the first day to 23:59:59.999 on the last, so "to the 5th" includes the 5th. Undefined when cleared.' },
    { name: 'presets', type: 'CalendarPreset[]', description: 'Quick picks. Defaults to Today, Last 7 days and Last 30 days, counted from when the picker mounted.' },
    { name: 'endOfDay', type: '(date: Date) => Date', description: 'The last millisecond of a date\'s day, exported for the other end of a range built by hand.' },
  ],
  demos: [{ title: 'Whole days only', code: `<DateRangeFilter value={range} onChange={setRange} />`, render: () => <DateRangeDemo /> }],
}
