import { BenchmarkTable, type BenchmarkResult } from '@/components/ui/benchmark-table'
import { BuildLog, type BuildStep } from '@/components/ui/build-log'
import { BundleTreemap, type BundleModule } from '@/components/ui/bundle-treemap'
import { CoverageReport, type CoverageFile } from '@/components/ui/coverage-report'
import { FlameGraph, type FlameFrame } from '@/components/ui/flame-graph'
import { LighthouseScore, type LighthouseCategory } from '@/components/ui/lighthouse-score'
import type { ComponentEntry, ComposerState } from './types'

const ESC = String.fromCharCode(27)

/* ----------------------------------------------------------------- build log */

const STEPS: BuildStep[] = [
  { id: 's1', name: 'Checkout', status: 'success', duration: 1_240 },
  { id: 's2', name: 'Restore cache', status: 'success', duration: 4_800, output: 'Cache restored from key deps-a41f9c22\n214 packages linked' },
  { id: 's3', name: 'Install dependencies', status: 'success', duration: 41_200, output: 'added 1284 packages in 39s\n\n214 packages are looking for funding' },
  { id: 's4', name: 'Typecheck', status: 'success', duration: 12_400 },
  {
    id: 's5', name: 'Test', status: 'failed', duration: 28_900,
    output: `${ESC}[31m✗${ESC}[0m src/lib/money.test.ts > rounds half to even\n\n  ${ESC}[31mAssertionError${ESC}[0m: expected 2.5 to be 2\n    at money.test.ts:41:7\n\n${ESC}[31m1 failed${ESC}[0m, ${ESC}[32m418 passed${ESC}[0m`,
  },
  { id: 's6', name: 'Build', status: 'skipped' },
  { id: 's7', name: 'Deploy', status: 'pending' },
]

export const buildLogEntry: ComponentEntry = {
  id: 'build-log',
  label: 'Build Log',
  description:
    'Steps with their own output and timing bars. Failed steps open by default and successful ones stay closed — nobody opens a build log to read the steps that worked.',
  usage: `import { BuildLog } from '@/components/ui/build-log'

<BuildLog steps={steps} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'running', label: 'in progress', default: false }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <BuildLog
          steps={
            state.running
              ? STEPS.map((s) => (s.id === 's5' ? { ...s, status: 'running' as const, duration: undefined } : s))
              : STEPS
          }
        />
      </div>
    ),
    code: () => `<BuildLog steps={steps} />`,
  },
  api: [
    { name: 'steps', type: 'BuildStep[]', description: '`{ id, name, status, duration?, output?, defaultOpen? }`.' },
    { name: 'default open', type: 'failures only', description: 'Expanding everything means scrolling past 4,000 lines of dependency installation to find the error.' },
    { name: 'duration bars', type: 'relative to slowest', description: 'The step making the build slow is visible without reading every number — the second reason anyone opens a build log.' },
    { name: 'running', type: 'spinner, no duration', description: 'A number that ticks while you read it is harder to compare than one that is absent until final.' },
  ],
  demos: [
    { title: 'A build in progress', stack: true, code: `<BuildLog steps={steps} />`,
      render: () => (<div className="w-full"><BuildLog steps={STEPS} /></div>) },
  ],
}

/* ------------------------------------------------------------ bundle treemap */

const MODULES: BundleModule[] = [
  { name: 'react-dom', size: 142_800, gzip: 45_200 },
  { name: 'shiki', size: 412_000, gzip: 96_400 },
  { name: 'lucide-react', size: 88_200, gzip: 21_100 },
  { name: 'app/registry', size: 214_600, gzip: 41_800 },
  { name: 'app/components', size: 186_400, gzip: 36_200 },
  { name: 'react', size: 24_100, gzip: 8_400 },
  { name: 'zod', size: 61_200, gzip: 14_900 },
  { name: 'react-hook-form', size: 42_800, gzip: 11_200 },
  { name: 'cn', size: 9_600, gzip: 3_400 },
  { name: 'locales/en-GB', size: 402_000, gzip: 12_100 },
]

export const bundleTreemapEntry: ComponentEntry = {
  id: 'bundle-treemap',
  label: 'Bundle Treemap',
  description:
    'Bundle size by module, laid out by compressed size. Raw bytes overstate text-heavy modules dramatically — a 400KB locale file that gzips to 12KB dominates a raw treemap and barely matters on the wire.',
  usage: `import { BundleTreemap } from '@/components/ui/bundle-treemap'

<BundleTreemap modules={modules} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'gzip', label: 'lay out by gzip', default: true },
      { type: 'number', prop: 'height', label: 'height', default: 240, min: 140, max: 420, step: 20 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <BundleTreemap
          modules={MODULES}
          useGzip={Boolean(state.gzip)}
          height={Number(state.height)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<BundleTreemap modules={modules} useGzip={${state.gzip}} />`,
  },
  api: [
    { name: 'modules', type: 'BundleModule[]', description: '`{ name, size, gzip? }`. Sizes in bytes.' },
    { name: 'useGzip', type: 'boolean', default: 'true', description: 'Lay out by compressed size when available. Toggle it in the composer to see the locale file take over.' },
    { name: 'layout', type: 'squarified', description: 'Not slice-and-dice: long thin slivers cannot be compared by eye or clicked, which defeats the shape.' },
    { name: 'why a treemap', type: 'composition', description: 'A sorted bar chart answers "what is largest". A treemap answers "what is this bundle made of", which is the question when a build doubles.' },
  ],
  demos: [
    { title: 'Where the bytes went', stack: true, code: `<BundleTreemap modules={modules} />`,
      render: () => (<div className="w-full"><BundleTreemap modules={MODULES} /></div>) },
  ],
}

/* ----------------------------------------------------------- coverage report */

const FILES: CoverageFile[] = [
  { path: 'src/lib/money.ts', statements: 0.94, branches: 0.62, functions: 0.9, lines: 0.94, uncovered: [41, 42, 43, 88, 89, 120, 121, 122, 155, 156] },
  { path: 'src/lib/highlighter.ts', statements: 0.88, branches: 0.71, functions: 0.83, lines: 0.87, uncovered: [22, 23, 61, 94] },
  { path: 'src/components/ui/table.tsx', statements: 1, branches: 1, functions: 1, lines: 1 },
  { path: 'src/lib/styles.ts', statements: 0.99, branches: 0.96, functions: 1, lines: 0.99, uncovered: [412] },
  { path: 'src/lib/dates.ts', statements: 0.61, branches: 0.44, functions: 0.55, lines: 0.6, uncovered: [12, 13, 14, 15, 16, 40, 41] },
]

export const coverageReportEntry: ComponentEntry = {
  id: 'coverage-report',
  label: 'Coverage Report',
  description:
    'Coverage per file, ranked by uncovered lines rather than by percentage. A 400-line file at 92% has 32 untested lines; a 12-line file at 60% has 5 — and percentage ranks the small one first.',
  usage: `import { CoverageReport } from '@/components/ui/coverage-report'

<CoverageReport files={files} threshold={0.8} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'metric', label: 'metric', options: ['branches', 'statements', 'functions', 'lines'], default: 'branches' },
      { type: 'number', prop: 'threshold', label: 'threshold', default: 0.8, min: 0.1, max: 1, step: 0.05 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <CoverageReport
          files={FILES}
          metric={state.metric as 'branches' | 'statements' | 'functions' | 'lines'}
          threshold={Number(state.threshold)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<CoverageReport files={files} metric="${state.metric}" threshold={${state.threshold}} />`,
  },
  api: [
    { name: 'files', type: 'CoverageFile[]', description: '`{ path, statements, branches, functions, lines, uncovered? }` — ratios 0–1.' },
    { name: 'metric', type: 'branches by default', description: 'Statement coverage flatters: a file can hit every statement and miss half its branches, which is where the bugs are.' },
    { name: 'threshold', type: 'number', default: '0.8', description: 'Drawn as a line on every bar, so "below target" is visible per row without reading numbers.' },
    { name: 'uncovered', type: 'number[]', description: 'Expands to the actual line numbers — the thing you need to act.' },
  ],
  demos: [
    { title: 'Per-file coverage', stack: true, code: `<CoverageReport files={files} />`,
      render: () => (<div className="w-full"><CoverageReport files={FILES} /></div>) },
  ],
}

/* ----------------------------------------------------------------- flame graph */

const PROFILE: FlameFrame = {
  name: 'request',
  value: 412,
  children: [
    {
      name: 'renderToString', value: 268,
      children: [
        { name: 'Router', value: 254, children: [
          { name: 'ComponentPage', value: 240, children: [
            { name: 'Composer', value: 158, children: [{ name: 'highlight', value: 121 }] },
            { name: 'ApiTable', value: 62 },
          ] },
        ] },
      ],
    },
    { name: 'loadRegistry', value: 96, children: [{ name: 'parseFrontmatter', value: 71 }] },
    { name: 'serialize', value: 38 },
  ],
}

export const flameGraphEntry: ComponentEntry = {
  id: 'flame-graph',
  label: 'Flame Graph',
  description:
    'Width is time, depth is stack. Frames stay in call order rather than being sorted by cost — reordering them destroys the shape a flame graph exists to show.',
  usage: `import { FlameGraph } from '@/components/ui/flame-graph'

<FlameGraph root={profile} unit="ms" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'rowHeight', label: 'row height', default: 20, min: 14, max: 34, step: 2 },
      { type: 'text', prop: 'unit', label: 'unit', default: 'ms' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <FlameGraph
          root={PROFILE}
          rowHeight={Number(state.rowHeight)}
          unit={String(state.unit)}
        />
      </div>
    ),
    code: () => `<FlameGraph root={profile} unit="ms" />`,
  },
  api: [
    { name: 'root', type: 'FlameFrame', description: '`{ name, value, children? }` where value is total time including children.' },
    { name: 'zoom', type: 'click a frame', description: 'Ancestors stay as a breadcrumb. Losing your place while zooming is what makes most flame graph implementations frustrating.' },
    { name: 'self time', type: 'shown on hover', description: 'A frame 400ms wide spending 3ms in itself is not the problem — its child is. Total alone cannot tell you which.' },
    { name: 'sub-pixel frames', type: 'dropped', description: 'Thousands of sliver rectangles cost real render time and show nothing.' },
  ],
  demos: [
    { title: 'A CPU profile', stack: true, code: `<FlameGraph root={profile} />`,
      render: () => (<div className="w-full"><FlameGraph root={PROFILE} /></div>) },
  ],
}

/* ------------------------------------------------------------ benchmark table */

const RESULTS: BenchmarkResult[] = [
  { name: 'cn (compiled)', value: 1_842_000, error: 41_000, samples: 96 },
  { name: 'twMerge + clsx', value: 61_400, error: 2_100, samples: 96 },
  { name: 'twJoin', value: 1_811_000, error: 52_000, samples: 96 },
  { name: 'naive concat', value: 4_120_000, error: 88_000, samples: 96 },
]

export const benchmarkTableEntry: ComponentEntry = {
  id: 'benchmark-table',
  label: 'Benchmark Table',
  description:
    'Ranked results with variance. A difference inside the combined error bars is reported as "within noise" rather than as a win — printing "1.03× faster" from two noisy runs is how performance myths start.',
  usage: `import { BenchmarkTable } from '@/components/ui/benchmark-table'

<BenchmarkTable results={results} unit="ops/s" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'higher', label: 'higher is better', default: true },
      { type: 'text', prop: 'unit', label: 'unit', default: 'ops/s' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <BenchmarkTable
          results={RESULTS}
          unit={String(state.unit)}
          higherIsBetter={Boolean(state.higher)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<BenchmarkTable results={results} unit="${state.unit}" higherIsBetter={${state.higher}} />`,
  },
  api: [
    { name: 'results', type: 'BenchmarkResult[]', description: '`{ name, value, error?, samples? }`. `error` is a standard deviation or margin, in the same unit as `value`.' },
    { name: 'inconclusive', type: 'derived', description: 'Overlapping error bars against the leader. Refusing to call that a win is the point of the component.' },
    { name: 'higherIsBetter', type: 'boolean', default: 'true', description: 'ops/sec: true. Nanoseconds per op: false. "2.4×" is ambiguous without it, and both directions are normal.' },
    { name: 'scale', type: 'log past 100×', description: 'Linear bars turn a 1000× spread into one full bar and nine invisible ones.' },
  ],
  demos: [
    { title: 'A run against a baseline', stack: true, code: `<BenchmarkTable results={results} />`,
      render: () => (<div className="w-full"><BenchmarkTable results={RESULTS} /></div>) },
  ],
}

/* ---------------------------------------------------------- lighthouse score */

const CATEGORIES: LighthouseCategory[] = [
  {
    id: 'perf', label: 'Performance', score: 62,
    metrics: [
      { label: 'LCP', value: '4.1s', poor: true },
      { label: 'CLS', value: '0.04' },
      { label: 'TBT', value: '410ms', poor: true },
      { label: 'FCP', value: '1.2s' },
    ],
  },
  { id: 'a11y', label: 'Accessibility', score: 96, metrics: [{ label: 'Contrast', value: 'pass' }, { label: 'Names', value: 'pass' }] },
  { id: 'bp', label: 'Best practices', score: 92 },
  { id: 'seo', label: 'SEO', score: 100 },
]

export const lighthouseScoreEntry: ComponentEntry = {
  id: 'lighthouse-score',
  label: 'Lighthouse Score',
  description:
    'Category rings with the metrics behind them. A performance score of 62 is not actionable; "LCP 4.1s" is — so the metrics are shown, not hidden behind the summary.',
  usage: `import { LighthouseScore } from '@/components/ui/lighthouse-score'

<LighthouseScore categories={categories} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'perf', label: 'performance', default: 62, min: 0, max: 100, step: 1 },
      { type: 'number', prop: 'ring', label: 'ring size', default: 56, min: 40, max: 96, step: 4 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-lg">
        <LighthouseScore
          ringSize={Number(state.ring)}
          categories={CATEGORIES.map((c) =>
            c.id === 'perf' ? { ...c, score: Number(state.perf) } : c,
          )}
        />
      </div>
    ),
    code: () => `<LighthouseScore categories={categories} />`,
  },
  api: [
    { name: 'categories', type: 'LighthouseCategory[]', description: '`{ id, label, score, metrics? }` with score 0–100.' },
    { name: 'bands', type: '50 / 90', description: 'Matching the reference tool. Inventing our own would make a green here mean something different from a green in the report the number came from.' },
    { name: 'metrics', type: 'shown, not hidden', description: 'The score summarises them; only the metrics can be acted on. `poor: true` tints one.' },
    { name: 'ring', type: 'SVG stroke-dasharray', description: 'Not a conic gradient — it prints, scales, and takes the theme\'s own colours.' },
  ],
  demos: [
    { title: 'A passing audit', stack: true, code: `<LighthouseScore categories={categories} />`,
      render: () => (<div className="w-full max-w-xl"><LighthouseScore categories={CATEGORIES} /></div>) },
    { title: 'A failing one', stack: true, code: `<LighthouseScore categories={categories} ringSize={64} />`,
      render: () => (<div className="w-full max-w-xl"><LighthouseScore ringSize={64} categories={CATEGORIES.map((category) => ({ ...category, score: Math.max(12, category.score - 45) }))} /></div>) },
  ],
}
