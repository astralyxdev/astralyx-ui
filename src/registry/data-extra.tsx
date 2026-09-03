import { useState } from 'react'
import { Donut } from '@/components/ui/donut'
import { Funnel } from '@/components/ui/funnel'
import { HeatmapGrid, type HeatmapCell } from '@/components/ui/heatmap-grid'
import { Kanban, type KanbanColumn } from '@/components/ui/kanban'
import { PricingTable, type PricingPlan } from '@/components/ui/pricing-table'
import { VirtualList } from '@/components/ui/virtual-list'
import { Badge } from '@/components/ui/badge'
import type { ComponentEntry, ComposerState } from './types'

export const donutEntry: ComponentEntry = {
  id: 'donut',
  label: 'Donut',
  description:
    'Parts against a whole. Arcs are stroke-dasharray on a circle rather than wedge paths — one number per slice, and no arc-flag branch at the halfway point.',
  usage: `import { Donut } from '@/components/ui/donut'

<Donut slices={slices} centerValue="748 kB" centerLabel="bundle" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'thickness', label: 'thickness', default: '18' },
      { type: 'boolean', prop: 'legend', label: 'legend', default: true },
    ],
    render: (state) => (
      <Donut
        slices={[
          { label: 'react', value: 142 },
          { label: 'shiki', value: 320 },
          { label: 'lucide', value: 96 },
          { label: 'app', value: 190 },
        ]}
        thickness={Number(state.thickness)}
        legend={Boolean(state.legend)}
        centerValue="748 kB"
        centerLabel="bundle"
      />
    ),
    code: (s: ComposerState) =>
      `<Donut\n  slices={slices}\n  thickness={${s.thickness}}\n  legend={${Boolean(s.legend)}}\n  centerValue="748 kB"\n/>`,
  },
  api: [
    { name: 'slices', type: 'DonutSlice[]', description: '`{ label, value, color? }`. Percentages are computed from the total.' },
    { name: 'thickness', type: 'number', default: '18', description: '0 renders a pie rather than a donut.' },
    { name: 'minSlice', type: 'number', default: '0.02', description: 'Anything smaller folds into "Other" — fourteen one-percent wedges communicate less than five and a remainder.' },
    { name: 'accessibility', type: '<title>', description: 'Lists every slice with its share. A ring with "62%" in the middle tells a screen reader nothing about the other 38.' },
  ],
  demos: [
    {
      title: 'Bundle composition',
      stack: true,
      code: `<Donut slices={slices} centerValue="748 kB" centerLabel="bundle" />`,
      render: () => (
        <Donut
          slices={[
            { label: 'react', value: 142 },
            { label: 'shiki', value: 320 },
            { label: 'lucide', value: 96 },
            { label: 'app', value: 190 },
          ]}
          centerValue="748 kB"
          centerLabel="bundle"
        />
      ),
    },
  ],
}

export const funnelEntry: ComponentEntry = {
  id: 'funnel',
  label: 'Funnel',
  description:
    'Conversion through ordered stages, with both the overall rate and the step rate. A funnel showing only the overall rate hides which single step is losing people.',
  usage: `import { Funnel } from '@/components/ui/funnel'

<Funnel stages={stages} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'showStepRate', label: 'showStepRate', default: true }],
    render: (state) => (
      <div className="w-full max-w-md">
        <Funnel
          showStepRate={Boolean(state.showStepRate)}
          stages={[
            { label: 'Visited pricing', value: 12480 },
            { label: 'Started trial', value: 3120 },
            { label: 'Invited a teammate', value: 1490 },
            { label: 'Converted', value: 620 },
          ]}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<Funnel stages={stages} showStepRate={${Boolean(s.showStepRate)}} />`,
  },
  api: [
    { name: 'stages', type: 'FunnelStage[]', description: '`{ label, value, hint? }`, in order.' },
    { name: 'showStepRate', type: 'boolean', default: 'true', description: 'Adds the rate against the previous stage and how many dropped.' },
    { name: 'bar width', type: 'volume', description: 'Proportional to the count, not the step rate — a stage keeping 90% of a tiny cohort should not look wider than one keeping 40% of everyone.' },
  ],
  demos: [
    {
      title: 'Signup funnel',
      stack: true,
      code: `<Funnel stages={stages} />`,
      render: () => (
        <div className="w-full max-w-md">
          <Funnel
            stages={[
              { label: 'Visited pricing', value: 12480 },
              { label: 'Started trial', value: 3120 },
              { label: 'Invited a teammate', value: 1490 },
              { label: 'Converted', value: 620 },
            ]}
          />
        </div>
      ),
    },
  ],
}

const HEAT_CELLS: HeatmapCell[] = Array.from({ length: 180 }, (_, index) => {
  const date = new Date('2026-09-02')
  date.setDate(date.getDate() - (179 - index))
  const weekday = date.getDay()
  const base = weekday === 0 || weekday === 6 ? 0 : (index * 7) % 11
  return { date, value: base }
})

export const heatmapGridEntry: ComponentEntry = {
  id: 'heatmap-grid',
  label: 'Heatmap Grid',
  description:
    'A calendar heatmap — weeks as columns, weekdays as rows. UptimeStrip is the one-dimensional case; this is the grid.',
  usage: `import { HeatmapGrid } from '@/components/ui/heatmap-grid'

<HeatmapGrid cells={cells} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'showMonths', label: 'showMonths', default: true },
      { type: 'boolean', prop: 'showWeekdays', label: 'showWeekdays', default: true },
    ],
    render: (state) => (
      <HeatmapGrid
        cells={HEAT_CELLS}
        showMonths={Boolean(state.showMonths)}
        showWeekdays={Boolean(state.showWeekdays)}
      />
    ),
    code: (s: ComposerState) =>
      `<HeatmapGrid\n  cells={cells}\n  showMonths={${Boolean(s.showMonths)}}\n  showWeekdays={${Boolean(s.showWeekdays)}}\n/>`,
  },
  api: [
    { name: 'cells', type: 'HeatmapCell[]', description: '`{ date, value, detail? }`. Gaps are filled with zero-value days so the grid stays continuous.' },
    { name: 'levels', type: 'number', default: '5', description: 'Intensity buckets. A smooth gradient makes neighbouring 11px squares look identical.' },
    { name: 'week alignment', type: 'Monday-first', description: 'Padded to a week boundary at both ends; without that the first column starts on the wrong weekday and every row is shifted a day.' },
  ],
  demos: [
    { title: 'Contributions', stack: true, code: `<HeatmapGrid cells={cells} />`, render: () => <HeatmapGrid cells={HEAT_CELLS} /> },
  ],
}

const ROWS = Array.from({ length: 5000 }, (_, index) => ({
  id: index,
  label: `Row ${index + 1}`,
  value: (index * 37) % 1000,
}))

export const virtualListEntry: ComponentEntry = {
  id: 'virtual-list',
  label: 'Virtual List',
  description:
    'Renders only the rows in view. DataGrid and LogViewer both render every row they are given, which is fine until a few thousand and then stalls the main thread.',
  usage: `import { VirtualList } from '@/components/ui/virtual-list'

<VirtualList
  items={rows}
  rowHeight={36}
  renderItem={(row) => <Row row={row} />}
  onEndReached={loadMore}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'rowHeight', label: 'rowHeight', options: ['28', '36', '48'], default: '36' },
    ],
    render: (state) => (
      <div className="border-border w-full max-w-md overflow-hidden rounded-2xl border">
        <VirtualList
          items={ROWS}
          rowHeight={Number(state.rowHeight)}
          height={280}
          renderItem={(row) => (
            <div className="border-border/50 flex items-center gap-3 border-b px-3 text-sm" style={{ height: Number(state.rowHeight) }}>
              <span className="text-muted-foreground w-16 shrink-0 tabular-nums">
                {row.id + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <Badge size="sm">{row.value}</Badge>
            </div>
          )}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<VirtualList\n  items={rows}\n  rowHeight={${s.rowHeight}}\n  height={280}\n  renderItem={(row) => <Row row={row} />}\n/>`,
  },
  api: [
    { name: 'items / rowHeight', type: 'Item[] / number', description: 'Fixed height by design: variable heights need measurement, a cache and a scroll correction pass, and wrong estimates make the scrollbar jump under the pointer.' },
    { name: 'renderItem', type: '(item, index) => ReactNode', description: 'The index is the real one in the full list, not the slice.' },
    { name: 'overscan', type: 'number', default: '4', description: 'Rows rendered beyond the viewport so a fast scroll does not expose blank space.' },
    { name: 'onEndReached', type: '() => void', description: 'Infinite scrolling. Guarded by item count, so it fires once per batch rather than on every scroll event near the bottom.' },
  ],
  demos: [
    {
      title: '5,000 rows',
      stack: true,
      code: `<VirtualList items={rows} rowHeight={36} height={280} renderItem={…} />`,
      render: () => (
        <div className="border-border w-full max-w-md overflow-hidden rounded-2xl border">
          <VirtualList
            items={ROWS}
            rowHeight={36}
            height={280}
            renderItem={(row) => (
              <div className="border-border/50 flex h-9 items-center gap-3 border-b px-3 text-sm">
                <span className="text-muted-foreground w-16 shrink-0 tabular-nums">
                  {row.id + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
              </div>
            )}
          />
        </div>
      ),
    },
  ],
}

const INITIAL_COLUMNS: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To do',
    cards: [
      { id: 'c1', title: 'Extract the copy button', meta: <Badge size="sm">chore</Badge>, accent: 'var(--blue)' },
      { id: 'c2', title: 'Range slider ARIA review', accent: 'var(--violet)' },
    ],
  },
  {
    id: 'doing',
    title: 'In progress',
    limit: 3,
    cards: [{ id: 'c3', title: 'Menubar roving focus', meta: <Badge size="sm">a11y</Badge>, accent: 'var(--amber)' }],
  },
  { id: 'done', title: 'Done', cards: [{ id: 'c4', title: 'Drawer drag dismissal', accent: 'var(--green)' }] },
]

function KanbanDemo({
  movable = true,
  emptyLabel = 'Nothing here',
}: { movable?: boolean; emptyLabel?: string } = {}) {
  const [columns, setColumns] = useState(INITIAL_COLUMNS)

  return (
    <Kanban
      columns={columns}
      emptyLabel={emptyLabel}
      onMove={!movable ? undefined : (cardId, from, to) => {
        setColumns((current) => {
          const card = current
            .find((column) => column.id === from)
            ?.cards.find((entry) => entry.id === cardId)
          if (!card) return current

          return current.map((column) =>
            column.id === from
              ? { ...column, cards: column.cards.filter((entry) => entry.id !== cardId) }
              : column.id === to
                ? { ...column, cards: [...column.cards, card] }
                : column,
          )
        })
      }}
    />
  )
}

export const kanbanEntry: ComponentEntry = {
  id: 'kanban',
  label: 'Kanban',
  description:
    'Columns of cards, movable between them. Drag-and-drop is pointer-only, so every card also moves with the arrow keys — a board you can only drag excludes keyboard users from its main action.',
  usage: `import { Kanban } from '@/components/ui/kanban'

<Kanban columns={columns} onMove={move} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'movable', label: 'draggable', default: true },
      { type: 'text', prop: 'emptyLabel', label: 'emptyLabel', default: 'Nothing here' },
    ],
    render: (state: ComposerState) => (
      <KanbanDemo movable={Boolean(state.movable)} emptyLabel={String(state.emptyLabel)} />
    ),
    code: () => `<Kanban columns={columns} onMove={move} />`,
  },
  api: [
    { name: 'columns', type: 'KanbanColumn[]', description: '`{ id, title, cards, limit? }` where a card is `{ id, title, meta?, accent? }`.' },
    { name: 'onMove', type: '(cardId, from, to) => void', description: 'The board never reorders anything itself — moving optimistically and having the server reject it is worse than a moment of latency.' },
    { name: 'keyboard', type: '← →', description: 'Moves a focused card between columns.' },
    { name: 'renderCard', type: '(card, column) => ReactNode', description: 'Replace the card body while keeping the drag behaviour.' },
  ],
  demos: [
    { title: 'Board', stack: true, code: `<Kanban columns={columns} onMove={move} />`, render: () => <KanbanDemo /> },
  ],
}

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/mo',
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
    period: '/seat',
    highlighted: true,
    description: 'For teams shipping weekly.',
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
    period: '/seat',
    description: 'For everything else.',
    features: [
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Build minutes', value: 'Unlimited' },
      { label: 'Priority support', value: true },
      { label: 'SSO', value: true },
    ],
  },
]

export const pricingTableEntry: ComponentEntry = {
  id: 'pricing-table',
  label: 'Pricing Table',
  description:
    'Plans side by side. Every plan lists every feature, including the ones it lacks — omitting them makes the columns uneven and quietly hides what you would give up.',
  usage: `import { PricingTable } from '@/components/ui/pricing-table'

<PricingTable plans={plans} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'responsive', label: 'responsive', options: ['sm', 'md', 'lg'], default: 'md' },
    ],
    render: (state) => (
      <div className="w-full">
        <PricingTable plans={PLANS} responsive={String(state.responsive) as 'sm' | 'md' | 'lg'} />
      </div>
    ),
    code: (s: ComposerState) => `<PricingTable plans={plans} responsive="${s.responsive}" />`,
  },
  api: [
    { name: 'plans', type: 'PricingPlan[]', description: '`{ id, name, price, period?, currency?, description?, features, highlighted?, badge?, cta?, onSelect? }`.' },
    { name: 'features', type: 'PricingFeature[]', description: '`value` of true/false gives a tick or a dash; a string states a limit. Either way the row is present in every column.' },
    { name: 'highlighted', type: 'boolean', description: 'A border and a badge, never a size change — scaling one column up makes the others hard to read.' },
    { name: 'responsive', type: "'sm' | 'md' | 'lg' | false", default: "'md'", description: 'Breakpoint the columns appear at.' },
  ],
  demos: [
    { title: 'Plans', stack: true, code: `<PricingTable plans={plans} />`, render: () => <div className="w-full"><PricingTable plans={PLANS} /></div> },
  ],
}
