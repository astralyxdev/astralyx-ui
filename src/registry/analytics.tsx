import { CohortTable, type Cohort } from '@/components/ui/cohort-table'
import { DateRangeCompare, type ComparisonBasis } from '@/components/ui/date-range-compare'
import type { ComponentEntry, ComposerState } from './types'

/* ------------------------------------------------------------ cohort table */

const COHORTS: Cohort[] = [
  { label: 'Mar 2026', size: 1_284, values: [1_284, 741, 588, 502, 461, 438, 421] },
  { label: 'Apr 2026', size: 1_609, values: [1_609, 998, 792, 690, 631, 604] },
  { label: 'May 2026', size: 1_412, values: [1_412, 833, 651, 559, 508] },
  { label: 'Jun 2026', size: 2_058, values: [2_058, 1_388, 1_121, 981] },
  { label: 'Jul 2026', size: 2_240, values: [2_240, 1_501, 1_190] },
  { label: 'Aug 2026', size: 1_977, values: [1_977, 1_260] },
  { label: 'Sep 2026', size: 604, values: [604] },
]

export const cohortTableEntry: ComponentEntry = {
  id: 'cohort-table',
  label: 'Cohort Table',
  description:
    'Retention by signup period, as a triangle. Cells are shaded by rate rather than by count, so a small cohort that retains well is not washed out by a large one that does not.',
  usage: `import { CohortTable } from '@/components/ui/cohort-table'

<CohortTable cohorts={cohorts} periods={7} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'periods', label: 'periods', default: 7, min: 3, max: 7, step: 1 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full">
        <CohortTable cohorts={COHORTS} periods={Number(state.periods)} />
      </div>
    ),
    code: (state: ComposerState) => `<CohortTable cohorts={cohorts} periods={${state.periods}} />`,
  },
  api: [
    { name: 'cohorts', type: 'Cohort[]', description: '`{ label, size, values }` where `values[0]` is the cohort period. Later periods may be missing — a cohort three months old has no month-six figure yet.' },
    { name: 'missing vs zero', type: 'null', description: 'A `null` renders as an empty cell, never as 0%. Drawing "not yet measured" as total churn is the classic cohort-chart lie.' },
    { name: 'periods', type: 'number', description: 'Columns rendered. Rows shorter than this end where their data does.' },
    { name: 'periodLabel', type: '(index) => ReactNode', default: "'M0', 'M1'…", description: 'For weeks, days, or whatever the cohort period actually is.' },
    { name: 'shading', type: 'by rate', description: 'Each cell is a share of its own cohort size, so rows are comparable across wildly different cohort sizes.' },
  ],
}

/* ------------------------------------------------------ date range compare */

const TRAFFIC = [4_100, 4_390, 4_205, 4_880, 5_120, 4_960, 5_402, 5_610, 5_388, 6_040, 6_212, 6_580]

export const dateRangeCompareEntry: ComponentEntry = {
  id: 'date-range-compare',
  label: 'Date Range Compare',
  description:
    'A metric against the same metric last period, with the basis named. "+18%" is meaningless until you know against what — and against a partial period it is meaningless full stop.',
  usage: `import { DateRangeCompare } from '@/components/ui/date-range-compare'

<DateRangeCompare label="Revenue" value={82_400} previous={71_900} basis="previous" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'basis', label: 'basis', options: ['previous', 'year', 'custom'], default: 'previous' },
      { type: 'select', prop: 'format', label: 'format', options: ['number', 'currency', 'percent', 'duration'], default: 'currency' },
      { type: 'select', prop: 'goodDirection', label: 'goodDirection', options: ['up', 'down', 'none'], default: 'up' },
      { type: 'boolean', prop: 'partial', label: 'partial period', default: false },
      { type: 'boolean', prop: 'history', label: 'sparkline', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xs">
        <DateRangeCompare
          label="Revenue"
          value={82_400}
          previous={71_900}
          basis={state.basis as ComparisonBasis}
          format={state.format as 'number' | 'currency' | 'percent' | 'duration'}
          goodDirection={state.goodDirection as 'up' | 'down' | 'none'}
          partial={Boolean(state.partial)}
          history={state.history ? TRAFFIC : undefined}
          rangeLabel="1–30 August"
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<DateRangeCompare\n  label="Revenue"\n  value={82400}\n  previous={71900}\n  basis="${state.basis}"\n  format="${state.format}"\n/>`,
  },
  api: [
    { name: 'value / previous', type: 'number', description: 'The two figures. The delta and its percentage are computed here, so they cannot disagree with the numbers shown.' },
    { name: 'basis', type: 'ComparisonBasis', default: "'previous'", description: "'previous' | 'year' | 'custom' — spelled out in words beside the delta, never left implicit." },
    { name: 'partial', type: 'boolean', description: 'Marks a range still in progress and mutes the delta. Nine days of a month against a full month is the most common dashboard falsehood there is.' },
    { name: 'goodDirection', type: "'up' | 'down' | 'none'", default: "'up'", description: 'Which way is good. Churn falling is green; use `none` for a metric with no better direction.' },
    { name: 'history', type: 'number[]', description: 'Optional sparkline. Shape often explains a delta that the single number cannot.' },
  ],
}
