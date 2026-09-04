import { BoxPlot } from '@/components/ui/box-plot'
import { RadarChart } from '@/components/ui/radar-chart'
import { Sankey } from '@/components/ui/sankey'
import { ScatterPlot, type ScatterPoint } from '@/components/ui/scatter-plot'
import { Treemap } from '@/components/ui/treemap'
import type { ComponentEntry } from './types'

/* -------------------------------------------------------------- scatter */

const SPEND: ScatterPoint[] = [
  { x: 1200, y: 3.1, size: 42, group: 'Search', label: 'Brand search' },
  { x: 2400, y: 4.4, size: 88, group: 'Search', label: 'Generic search' },
  { x: 3100, y: 5.2, size: 120, group: 'Search', label: 'Competitor' },
  { x: 800, y: 2.2, size: 24, group: 'Social', label: 'Reels' },
  { x: 1900, y: 2.9, size: 51, group: 'Social', label: 'Stories' },
  { x: 3600, y: 3.4, size: 74, group: 'Social', label: 'Feed' },
  { x: 600, y: 4.9, size: 31, group: 'Email', label: 'Lifecycle' },
  { x: 950, y: 6.1, size: 45, group: 'Email', label: 'Winback' },
  { x: 1500, y: 6.8, size: 63, group: 'Email', label: 'Newsletter' },
  { x: 4200, y: 4.1, size: 96, group: 'Display', label: 'Programmatic' },
  { x: 5100, y: 3.8, size: 110, group: 'Display', label: 'Retargeting' },
  { x: 2700, y: 5.6, size: 70, group: 'Search', label: 'Shopping' },
]

export const scatterPlotEntry: ComponentEntry = {
  id: 'scatter-plot',
  label: 'Scatter Plot',
  isNew: true,
  description:
    'Two measured variables plotted against each other, with an optional least-squares trend line and Pearson’s r. Points can carry a third dimension as area and a fourth as colour.',
  usage: `import { ScatterPlot } from '@/components/ui/scatter-plot'

<ScatterPlot points={points} trend xLabel="Spend" yLabel="Conversion %" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'trend', label: 'trend', default: true },
      { type: 'boolean', prop: 'grid', label: 'grid', default: true },
      { type: 'boolean', prop: 'legend', label: 'legend', default: true },
    ],
    render: (state) => (
      <ScatterPlot
        className="w-full"
        points={SPEND}
        trend={Boolean(state.trend)}
        grid={Boolean(state.grid)}
        legend={Boolean(state.legend)}
        xLabel="Spend per campaign"
        yLabel="Conversion rate"
        valueFormat={(value) => (value > 100 ? `$${(value / 1000).toFixed(1)}k` : `${value}%`)}
      />
    ),
    code: (state) =>
      `<ScatterPlot\n  points={points}\n  trend={${Boolean(state.trend)}}\n  grid={${Boolean(state.grid)}}\n  xLabel="Spend per campaign"\n  yLabel="Conversion rate"\n/>`,
  },
  api: [
    { name: 'points', type: 'ScatterPoint[]', description: '{ x, y, size?, group?, label? }. Both axes are measured values with their own scale.' },
    { name: 'vs Chart scatter', type: 'measured x', description: '`Chart`’s scatter variant spaces `number[]` evenly along an index. Here x is a value, which is what makes the relationship visible at all.' },
    { name: 'trend', type: 'boolean', default: 'false', description: 'Ordinary least squares, with Pearson’s r. r measures linear association only — a parabola scores near zero, and one outlier moves it a long way.' },
    { name: 'size', type: 'area, not radius', description: 'Scaling the radius makes a doubled value look four times bigger. Area is proportional, so it reads honestly.' },
    { name: 'points as elements', type: 'not circles', description: 'The plot is stretched to fill its box, which turns an SVG circle into an ellipse. Positioned elements stay round at any aspect ratio.' },
    { name: 'xDomain / yDomain', type: '[number, number]', description: 'Fixed bounds. Defaults to the data range with 5% padding so nothing sits on the axis.' },
  ],
  demos: [
    {
      title: 'Spend against conversion, with a fit',
      stack: true,
      code: `<ScatterPlot points={campaigns} trend xLabel="Spend" yLabel="Conversion rate" />`,
      render: () => (
        <ScatterPlot className="w-full" points={SPEND} trend xLabel="Spend" yLabel="Conversion rate" />
      ),
    },
  ],
}

/* ---------------------------------------------------------------- radar */

const RADAR_AXES = [
  { key: 'latency', label: 'Latency' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'cost', label: 'Cost' },
  { key: 'context', label: 'Context' },
  { key: 'tools', label: 'Tool use' },
  { key: 'safety', label: 'Safety' },
]

const RADAR_SERIES = [
  {
    name: 'Opus 5',
    values: { latency: 62, accuracy: 94, cost: 48, context: 96, tools: 92, safety: 90 },
  },
  {
    name: 'Haiku 4.5',
    values: { latency: 95, accuracy: 78, cost: 92, context: 70, tools: 74, safety: 86 },
  },
]

export const radarChartEntry: ComponentEntry = {
  id: 'radar-chart',
  label: 'Radar Chart',
  isNew: true,
  description:
    'Several measures for one subject on axes radiating from a centre. Good for recognising a profile’s shape; documented plainly as the wrong chart when the reader needs to compare values.',
  usage: `import { RadarChart } from '@/components/ui/radar-chart'

<RadarChart axes={axes} series={series} max={100} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'rings', label: 'rings', default: 4, min: 2, max: 8, step: 1 },
      { type: 'boolean', prop: 'legend', label: 'legend', default: true },
    ],
    render: (state) => (
      <RadarChart
        axes={RADAR_AXES}
        series={RADAR_SERIES}
        rings={Number(state.rings) || 4}
        legend={Boolean(state.legend)}
      />
    ),
    code: (state) =>
      `<RadarChart\n  axes={axes}\n  series={series}\n  rings={${Number(state.rings) || 4}}\n  max={100}\n/>`,
  },
  api: [
    { name: 'axes / series', type: 'RadarAxis[] / RadarSeries[]', description: '{ key, label, max? } and { name, values: Record<key, number> }.' },
    { name: 'when not to use it', type: 'read the docs', description: 'Area grows with the square of the value, so a 20% better profile looks 44% bigger. Axis order is arbitrary but changes the shape. For comparing values, a grouped bar chart is measurably better.' },
    { name: 'max', type: 'number', default: '100', description: 'Shared ceiling. Axes on different scales produce a shape that means nothing; per-axis `max` exists for when the units genuinely differ.' },
    { name: 'uniform scaling', type: 'square viewBox', description: 'No `preserveAspectRatio: none` — a sheared radar is unreadable.' },
    { name: 'fillOpacity', type: 'number', default: '0.18', description: 'Lower it when shapes overlap heavily.' },
  ],
  demos: [
    {
      title: 'Two models on six axes',
      stack: true,
      code: `<RadarChart axes={axes} series={[opus, haiku]} />`,
      render: () => <RadarChart axes={RADAR_AXES} series={RADAR_SERIES} />,
    },
  ],
}

/* --------------------------------------------------------------- sankey */

const SANKEY_NODES = [
  { id: 'organic', label: 'Organic' },
  { id: 'paid', label: 'Paid' },
  { id: 'referral', label: 'Referral' },
  { id: 'landing', label: 'Landing' },
  { id: 'docs', label: 'Docs' },
  { id: 'signup', label: 'Sign-up' },
  { id: 'activated', label: 'Activated' },
  { id: 'bounced', label: 'Bounced' },
]

const SANKEY_LINKS = [
  { source: 'organic', target: 'landing', value: 4200 },
  { source: 'organic', target: 'docs', value: 2600 },
  { source: 'paid', target: 'landing', value: 3100 },
  { source: 'referral', target: 'docs', value: 900 },
  { source: 'referral', target: 'landing', value: 600 },
  { source: 'landing', target: 'signup', value: 2400 },
  { source: 'landing', target: 'bounced', value: 5500 },
  { source: 'docs', target: 'signup', value: 1400 },
  { source: 'docs', target: 'bounced', value: 2100 },
  { source: 'signup', target: 'activated', value: 2600 },
  { source: 'signup', target: 'bounced', value: 1200 },
]

export const sankeyEntry: ComponentEntry = {
  id: 'sankey',
  label: 'Sankey',
  isNew: true,
  description:
    'Flow between stages, where band width is the quantity moving. Nodes are layered by longest path so every link runs forward, and a cycle is reported rather than drawn as something plausible.',
  usage: `import { Sankey } from '@/components/ui/sankey'

<Sankey nodes={nodes} links={links} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'nodeWidth', label: 'nodeWidth', default: 3, min: 1, max: 8, step: 1 },
      { type: 'boolean', prop: 'showValues', label: 'showValues', default: true },
    ],
    render: (state) => (
      <Sankey
        className="w-full"
        nodes={SANKEY_NODES}
        links={SANKEY_LINKS}
        nodeWidth={Number(state.nodeWidth) || 3}
        showValues={Boolean(state.showValues)}
      />
    ),
    code: (state) =>
      `<Sankey\n  nodes={nodes}\n  links={links}\n  nodeWidth={${Number(state.nodeWidth) || 3}}\n/>`,
  },
  api: [
    { name: 'nodes / links', type: 'SankeyNode[] / SankeyLink[]', description: '{ id, label, color? } and { source, target, value }.' },
    { name: 'vs Funnel', type: 'where it went', description: 'A funnel shows the same drop-off as shrinking bars. A Sankey shows where the loss went, which is usually the actual question.' },
    { name: 'layering', type: 'longest path', description: 'Derived, not taken from input order — laying nodes out in the order they were listed produces backward links and a tangle.' },
    { name: 'cycles', type: 'reported', description: 'Depth is undefined inside a loop, so a cycle raises `onError` instead of being drawn wrongly.' },
    { name: 'ribbons', type: 'filled, not stroked', description: 'The plot is stretched to fill its box and a stroke under a non-uniform transform scales unevenly — the band width would change with the container’s aspect ratio, which is a lie about the quantity.' },
  ],
  demos: [
    {
      title: 'Acquisition to activation',
      stack: true,
      code: `<Sankey nodes={nodes} links={links} />`,
      render: () => <Sankey className="w-full" nodes={SANKEY_NODES} links={SANKEY_LINKS} />,
    },
  ],
}

/* -------------------------------------------------------------- treemap */

const BUNDLE = [
  {
    id: 'vendor',
    label: 'vendor',
    children: [
      { id: 'react', label: 'react-dom', value: 132_000 },
      { id: 'lucide', label: 'lucide-react', value: 41_000 },
      { id: 'shiki', label: 'shiki', value: 96_000 },
      { id: 'tailwind', label: 'tailwind runtime', value: 18_000 },
    ],
  },
  {
    id: 'app',
    label: 'app',
    children: [
      { id: 'registry', label: 'registry', value: 74_000 },
      { id: 'pages', label: 'pages', value: 38_000 },
      { id: 'ui', label: 'components/ui', value: 112_000 },
      { id: 'lib', label: 'lib', value: 16_000 },
    ],
  },
  { id: 'assets', label: 'assets', value: 44_000 },
]

export const treemapEntry: ComponentEntry = {
  id: 'treemap',
  label: 'Treemap',
  isNew: true,
  description:
    'Part-to-whole as nested rectangles sized by area, laid out with the squarify algorithm so tiles stay close to square instead of degenerating into slivers.',
  usage: `import { Treemap } from '@/components/ui/treemap'

<Treemap nodes={nodes} depth={2} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'depth', label: 'depth', default: 2, min: 1, max: 2, step: 1 },
      { type: 'number', prop: 'gap', label: 'gap', default: 2, min: 0, max: 8, step: 1 },
    ],
    render: (state) => (
      <Treemap
        className="w-full"
        nodes={BUNDLE}
        depth={Number(state.depth) || 2}
        gap={Number(state.gap) ?? 2}
        valueFormat={(value) => `${(value / 1000).toFixed(0)} kB`}
      />
    ),
    code: (state) => `<Treemap\n  nodes={nodes}\n  depth={${Number(state.depth) || 2}}\n/>`,
  },
  api: [
    { name: 'nodes', type: 'TreemapNode[]', description: '{ id, label, value?, children?, color? }. Parents sum their children.' },
    { name: 'squarified', type: 'not sliced', description: 'The strip layout produces rectangles hundreds of times longer than they are wide — unlabellable, incomparable, hard to hit. Squarify keeps the worst aspect ratio in each row as low as it can.' },
    { name: 'area', type: 'read poorly', description: 'People judge area far less accurately than length. Right for "what is big, roughly, and what is inside what"; wrong for "is A bigger than B" when they are close.' },
    { name: 'labels', type: 'dropped, not truncated', description: 'A label that does not fit is removed rather than ellipsised into nothing. The value stays reachable through the tooltip.' },
    { name: 'depth', type: 'number', default: '2', description: '1 flattens the hierarchy to its top level.' },
  ],
  demos: [
    {
      title: 'A bundle, by module',
      stack: true,
      code: `<Treemap nodes={bundle} valueFormat={(b) => \`\${(b / 1000).toFixed(0)} kB\`} />`,
      render: () => (
        <Treemap
          className="w-full"
          nodes={BUNDLE}
          valueFormat={(value) => `${(value / 1000).toFixed(0)} kB`}
        />
      ),
    },
  ],
}

/* ------------------------------------------------------------- box plot */

/** Deterministic pseudo-samples, so the docs render identically every time. */
function samples(seed: number, count: number, centre: number, spread: number, tail = 0) {
  const out: number[] = []
  let state = seed
  for (let i = 0; i < count; i++) {
    state = (state * 1664525 + 1013904223) % 4294967296
    const unit = state / 4294967296
    const value = centre + (unit - 0.5) * spread
    out.push(Math.max(1, Math.round(value)))
  }
  for (let i = 0; i < tail; i++) out.push(Math.round(centre + spread * (2.5 + i * 0.8)))
  return out
}

const LATENCY = [
  { name: 'us-east', values: samples(7, 60, 120, 90, 3) },
  { name: 'eu-west', values: samples(11, 60, 180, 120, 2) },
  { name: 'ap-south', values: samples(23, 60, 340, 260, 4) },
]

export const boxPlotEntry: ComponentEntry = {
  id: 'box-plot',
  label: 'Box Plot',
  isNew: true,
  description:
    'Quartiles, Tukey whiskers and outliers — the distribution an average hides. Quartiles use linear interpolation, so they agree with what your analytics stack reports.',
  usage: `import { BoxPlot } from '@/components/ui/box-plot'

<BoxPlot series={[{ name: 'us-east', values: latencies }]} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'horizontal', label: 'horizontal', default: false },
      { type: 'boolean', prop: 'showOutliers', label: 'showOutliers', default: true },
    ],
    render: (state) => (
      <BoxPlot
        className="w-full"
        series={LATENCY}
        horizontal={Boolean(state.horizontal)}
        showOutliers={Boolean(state.showOutliers)}
        valueFormat={(value) => `${Math.round(value)}ms`}
      />
    ),
    code: (state) =>
      `<BoxPlot\n  series={series}\n  horizontal={${Boolean(state.horizontal)}}\n  valueFormat={(ms) => \`\${ms}ms\`}\n/>`,
  },
  api: [
    { name: 'series', type: 'BoxSeries[]', description: '{ name, values? } for raw samples, or { name, summary } when only the five numbers came back from the warehouse.' },
    { name: 'whiskers', type: '1.5 × IQR', description: 'Tukey, not min/max. Whiskers to the extremes let one bad sample stretch the chart and fold outliers into the range, making them invisible.' },
    { name: 'quantiles', type: 'interpolated', description: 'R type-7 / numpy default, so the numbers match your analytics stack rather than disagreeing by a few milliseconds.' },
    { name: 'horizontal', type: 'boolean', default: 'false', description: 'Rows instead of columns. Better when the series names are long.' },
    { name: 'built from elements', type: 'not SVG', description: 'Every part is an axis-aligned rectangle or line, and median thickness, cap widths and outlier dots stay exact in CSS pixels at any size.' },
  ],
  demos: [
    {
      title: 'Latency by region',
      stack: true,
      code: `<BoxPlot series={byRegion} valueFormat={(ms) => \`\${ms}ms\`} />`,
      render: () => (
        <BoxPlot className="w-full" series={LATENCY} valueFormat={(value) => `${Math.round(value)}ms`} />
      ),
    },
  ],
}
