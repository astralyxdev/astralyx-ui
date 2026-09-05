import { useMemo, useState } from 'react'
import {
  Boxes, Container as ContainerIcon, FlaskConical, GitBranch, Play, RefreshCw,
  Rocket, ToggleLeft, TriangleAlert, Zap,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BenchmarkTable, type BenchmarkResult } from '@/components/ui/benchmark-table'
import { BuildLog, type BuildStep } from '@/components/ui/build-log'
import { BundleTreemap, type BundleModule } from '@/components/ui/bundle-treemap'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ContainerList, type Container } from '@/components/ui/container-list'
import { CoverageReport, type CoverageFile } from '@/components/ui/coverage-report'
import { DeployList, type Deploy } from '@/components/ui/deploy-list'
import { Empty } from '@/components/ui/empty'
import { EnvVars, type EnvVar } from '@/components/ui/env-vars'
import { FeatureFlag } from '@/components/ui/feature-flag'
import { FlameGraph, type FlameFrame } from '@/components/ui/flame-graph'
import { LighthouseScore, type LighthouseCategory } from '@/components/ui/lighthouse-score'
import { Pipeline, type PipelineStage } from '@/components/ui/pipeline'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { StatusChecks, type StatusCheck } from '@/components/ui/status-checks'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Terminal } from '@/components/ui/terminal'
import { TestResults, type TestSuite } from '@/components/ui/test-results'
import { TrafficSplit } from '@/components/ui/traffic-split'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * One frozen clock for the page.
 *
 * The examples are prerendered, so any `new Date()` evaluated at module scope
 * differs between the server pass and the browser pass and React discards the
 * tree over the mismatch. Everything that formats an age takes this `now`.
 */
const NOW = new Date('2026-09-05T14:20:00')
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000)

/** ANSI escapes in the log output, written without a literal control byte. */
const ESC = String.fromCharCode(27)

const NAV: NavItem[] = [
  { id: 'runs', label: 'Runs', icon: <GitBranch />, count: 3 },
  { id: 'deploys', label: 'Deployments', icon: <Rocket /> },
  { id: 'tests', label: 'Test reports', icon: <FlaskConical /> },
  { id: 'environments', label: 'Environments', icon: <Boxes /> },
  { id: 'flags', label: 'Feature flags', icon: <ToggleLeft />, count: 4 },
  { id: 'containers', label: 'Containers', icon: <ContainerIcon /> },
]

/* -------------------------------------------------------------------- runs */

type Run = {
  id: string
  branch: string
  commit: string
  message: string
  author: string
  when: string
  status: 'success' | 'failure' | 'running'
  summary: string
  stages: PipelineStage[]
  checks: StatusCheck[]
  suites: TestSuite[]
  /** The job whose log opens when this run is selected. */
  defaultJob: string
}

/**
 * Logs are keyed `run:job` and deliberately incomplete.
 *
 * A real runner keeps output only for jobs that actually executed, so a skipped
 * or pending job has nothing to show — the panel says so rather than inventing
 * a plausible log, which is the difference between a console and a mockup.
 */
const LOGS: Record<string, BuildStep[]> = {
  '4128:install': [
    { id: 'i1', name: 'Resolve lockfile', status: 'success', duration: 3_400, output: 'Lockfile is up to date, resolution step is skipped' },
    { id: 'i2', name: 'Fetch packages', status: 'success', duration: 18_600, output: 'Packages: +1284\nProgress: resolved 1284, reused 1201, downloaded 83, added 1284' },
    { id: 'i3', name: 'Link dependencies', status: 'success', duration: 21_800 },
    { id: 'i4', name: 'Patch @types/react', status: 'success', duration: 400, output: 'patch-package: applied @types/react+19.0.4.patch' },
  ],
  '4128:typecheck': [
    { id: 't1', name: 'tsc --noEmit -p tsconfig.app.json', status: 'success', duration: 26_400 },
    { id: 't2', name: 'tsc --noEmit -p tsconfig.cli.json', status: 'success', duration: 11_900 },
  ],
  '4128:test': [
    { id: 'v1', name: 'Restore vitest cache', status: 'success', duration: 2_100, output: 'Cache restored from key vitest-node22-a41f9c22' },
    {
      id: 'v2',
      name: 'vitest run --coverage',
      status: 'failed',
      duration: 124_800,
      defaultOpen: true,
      output: `${ESC}[31m✗${ESC}[0m src/components/ui/slot.test.tsx > forwards refs through asChild\n\n  ${ESC}[31mTypeError${ESC}[0m: Cannot read properties of null (reading 'focus')\n    at slot.test.tsx:62:18\n\n${ESC}[31m✗${ESC}[0m src/lib/styles.test.ts > keeps radius under half the control height\n\n  ${ESC}[31mAssertionError${ESC}[0m: expected 20 to be less than 18\n    at styles.test.ts:41:22\n\n${ESC}[31m2 failed${ESC}[0m, ${ESC}[32m1174 passed${ESC}[0m, ${ESC}[33m6 skipped${ESC}[0m  (1182)`,
    },
    { id: 'v3', name: 'Upload coverage to codecov', status: 'skipped' },
    { id: 'v4', name: 'Annotate failures on the pull request', status: 'success', duration: 900 },
  ],
  '4128:lint': [
    { id: 'l1', name: 'eslint . --max-warnings 0', status: 'success', duration: 24_600, output: '412 files linted, 0 problems' },
    { id: 'l2', name: 'prettier --check', status: 'success', duration: 3_800 },
  ],
  '4127:lint': [
    { id: 'k1', name: 'eslint . --max-warnings 0', status: 'running' },
  ],
  '4127:typecheck': [
    { id: 'k2', name: 'tsc --noEmit -p tsconfig.app.json', status: 'success', duration: 25_100 },
    { id: 'k3', name: 'tsc --noEmit -p tsconfig.cli.json', status: 'success', duration: 12_400 },
  ],
  '4126:build': [
    { id: 'b1', name: 'vite build', status: 'success', duration: 48_200, output: 'vite v7.1.2 building for production...\n✓ 1642 modules transformed.\ndist/assets/index-C1a9f2.js   412.80 kB │ gzip: 118.40 kB\n✓ built in 46.12s' },
    { id: 'b2', name: 'Prerender routes', status: 'success', duration: 19_400, output: 'prerendered 128 routes\n  /examples/dashboard  268ms\n  /examples/repo       241ms' },
    { id: 'b3', name: 'Upload artifact', status: 'success', duration: 8_600 },
  ],
  '4126:test': [
    { id: 'p1', name: 'Restore vitest cache', status: 'success', duration: 1_900 },
    { id: 'p2', name: 'vitest run --coverage', status: 'success', duration: 118_200, output: `${ESC}[32m1180 passed${ESC}[0m, ${ESC}[33m6 skipped${ESC}[0m  (1186)` },
    { id: 'p3', name: 'Upload coverage to codecov', status: 'success', duration: 5_400 },
  ],
}

const RUNS: Run[] = [
  {
    id: '4128',
    branch: 'main',
    commit: '8f21c4a',
    message: 'Drop Radix, add own Slot primitive',
    author: 'Ada Lovelace',
    when: '6 minutes ago',
    status: 'failure',
    summary: '2 of 1,182 tests failing — the Slot ref forward and a radius invariant.',
    defaultJob: 'test',
    stages: [
      {
        id: 'prepare',
        name: 'Prepare',
        jobs: [
          { id: 'checkout', name: 'checkout', status: 'success', duration: 9 },
          { id: 'install', name: 'install', status: 'success', duration: 44 },
        ],
      },
      {
        id: 'verify',
        name: 'Verify',
        jobs: [
          { id: 'typecheck', name: 'typecheck', status: 'success', duration: 38 },
          { id: 'lint', name: 'lint', status: 'success', duration: 28 },
          { id: 'test', name: 'test', status: 'failure', duration: 127 },
        ],
      },
      {
        id: 'package',
        name: 'Package',
        jobs: [
          { id: 'build', name: 'build', status: 'skipped' },
          { id: 'size', name: 'bundle-size', status: 'skipped' },
        ],
      },
      {
        id: 'ship',
        name: 'Ship',
        jobs: [
          { id: 'preview', name: 'preview', status: 'pending' },
          { id: 'production', name: 'production', status: 'pending' },
        ],
      },
    ],
    checks: [
      { id: 'c1', name: 'typecheck', status: 'success', duration: '38s' },
      { id: 'c2', name: 'lint', status: 'success', duration: '28s' },
      {
        id: 'c3', name: 'test', status: 'failure', duration: '2m 07s', description: '2 of 1,182 failing',
        detail: <Terminal copyable={false} content={'FAIL src/components/ui/slot.test.tsx\n  ✕ forwards refs through asChild'} />,
      },
      { id: 'c4', name: 'bundle-size', status: 'skipped', required: false, description: 'blocked by test' },
      { id: 'c5', name: 'visual-diff', status: 'skipped', required: false },
    ],
    suites: [
      {
        id: 's1',
        name: 'src/components/ui/slot.test.tsx',
        tests: [
          { id: 'x1', name: 'forwards refs through asChild', status: 'failed', duration: 0.6, error: <Terminal copyable={false} content={"TypeError: Cannot read properties of null (reading 'focus')\n  at slot.test.tsx:62:18"} /> },
          { id: 'x2', name: 'merges className on the child', status: 'passed', duration: 0.2 },
          { id: 'x3', name: 'keeps the child event handlers', status: 'passed', duration: 0.1 },
        ],
      },
      {
        id: 's2',
        name: 'src/lib/styles.test.ts',
        tests: [
          { id: 'x4', name: 'keeps radius under half the control height', status: 'failed', duration: 0.3, error: <Terminal copyable={false} content={'AssertionError: expected 20 to be less than 18\n  at styles.test.ts:41:22'} /> },
          { id: 'x5', name: 'every colour set defines six variables', status: 'passed', duration: 0.1 },
        ],
      },
      {
        id: 's3',
        name: 'src/components/ui/table.test.tsx',
        tests: [
          { id: 'x6', name: 'sticky header keeps the scroll container', status: 'passed', duration: 0.4 },
          { id: 'x7', name: 'row selection is announced', status: 'passed', duration: 0.2 },
          { id: 'x8', name: 'virtualised rows keep tab order', status: 'skipped' },
        ],
      },
    ],
  },
  {
    id: '4127',
    branch: 'feat/traffic-split',
    commit: 'd4e5f6a',
    message: 'Traffic split follows the flag rollout',
    author: 'Grace Hopper',
    when: '21 minutes ago',
    status: 'running',
    summary: 'Lint is still running; nothing has been packaged yet.',
    defaultJob: 'lint',
    stages: [
      {
        id: 'prepare',
        name: 'Prepare',
        jobs: [
          { id: 'checkout', name: 'checkout', status: 'success', duration: 8 },
          { id: 'install', name: 'install', status: 'success', duration: 41 },
        ],
      },
      {
        id: 'verify',
        name: 'Verify',
        jobs: [
          { id: 'typecheck', name: 'typecheck', status: 'success', duration: 37 },
          { id: 'lint', name: 'lint', status: 'running' },
          { id: 'test', name: 'test', status: 'pending' },
        ],
      },
      {
        id: 'package',
        name: 'Package',
        jobs: [
          { id: 'build', name: 'build', status: 'pending' },
          { id: 'size', name: 'bundle-size', status: 'pending' },
        ],
      },
      {
        id: 'ship',
        name: 'Ship',
        jobs: [{ id: 'preview', name: 'preview', status: 'pending' }],
      },
    ],
    checks: [
      { id: 'c1', name: 'typecheck', status: 'success', duration: '37s' },
      { id: 'c2', name: 'lint', status: 'running' },
      { id: 'c3', name: 'test', status: 'pending' },
      { id: 'c4', name: 'bundle-size', status: 'pending', required: false },
      { id: 'c5', name: 'visual-diff', status: 'pending', required: false },
    ],
    suites: [
      {
        id: 's1',
        name: 'src/components/ui/traffic-split.test.tsx',
        tests: [{ id: 'y1', name: 'normalises weights that do not total 100', status: 'running' }],
      },
    ],
  },
  {
    id: '4126',
    branch: 'main',
    commit: 'c3d4e5f',
    message: 'Field padding derives from control height',
    author: 'Katherine Johnson',
    when: '3 hours ago',
    status: 'success',
    summary: 'Green, packaged and shipped to production at 11:34 UTC.',
    defaultJob: 'build',
    stages: [
      {
        id: 'prepare',
        name: 'Prepare',
        jobs: [
          { id: 'checkout', name: 'checkout', status: 'success', duration: 8 },
          { id: 'install', name: 'install', status: 'success', duration: 39 },
        ],
      },
      {
        id: 'verify',
        name: 'Verify',
        jobs: [
          { id: 'typecheck', name: 'typecheck', status: 'success', duration: 36 },
          { id: 'lint', name: 'lint', status: 'success', duration: 27 },
          { id: 'test', name: 'test', status: 'success', duration: 121 },
        ],
      },
      {
        id: 'package',
        name: 'Package',
        jobs: [
          { id: 'build', name: 'build', status: 'success', duration: 76 },
          { id: 'size', name: 'bundle-size', status: 'success', duration: 14 },
        ],
      },
      {
        id: 'ship',
        name: 'Ship',
        jobs: [
          { id: 'preview', name: 'preview', status: 'success', duration: 22 },
          { id: 'production', name: 'production', status: 'success', duration: 31 },
        ],
      },
    ],
    checks: [
      { id: 'c1', name: 'typecheck', status: 'success', duration: '36s' },
      { id: 'c2', name: 'lint', status: 'success', duration: '27s' },
      { id: 'c3', name: 'test', status: 'success', duration: '2m 01s', description: '1,180 passed' },
      { id: 'c4', name: 'bundle-size', status: 'success', duration: '14s', required: false, description: '118.4 kB gzipped, 3.2 kB under budget' },
      { id: 'c5', name: 'visual-diff', status: 'success', duration: '1m 08s', required: false, description: 'no visual changes' },
    ],
    suites: [
      {
        id: 's1',
        name: 'src/components/ui/input.test.tsx',
        tests: [
          { id: 'z1', name: 'padding tracks the control height', status: 'passed', duration: 0.3 },
          { id: 'z2', name: 'icon slot reserves its own space', status: 'passed', duration: 0.2 },
        ],
      },
      {
        id: 's2',
        name: 'src/lib/styles.test.ts',
        tests: [
          { id: 'z3', name: 'keeps radius under half the control height', status: 'passed', duration: 0.1 },
          { id: 'z4', name: 'every colour set defines six variables', status: 'passed', duration: 0.1 },
        ],
      },
    ],
  },
]

/* --------------------------------------------------------- quality reports */

const COVERAGE: CoverageFile[] = [
  { path: 'src/components/ui/slot.tsx', statements: 0.71, branches: 0.48, functions: 0.66, lines: 0.7, uncovered: [24, 25, 26, 61, 62, 63, 64, 88, 112] },
  { path: 'src/lib/styles.ts', statements: 0.99, branches: 0.94, functions: 1, lines: 0.99, uncovered: [412] },
  { path: 'src/components/ui/data-grid.tsx', statements: 0.84, branches: 0.62, functions: 0.79, lines: 0.83, uncovered: [140, 141, 142, 208, 209, 264] },
  { path: 'src/components/ui/table.tsx', statements: 1, branches: 1, functions: 1, lines: 1 },
  { path: 'src/lib/dates.ts', statements: 0.63, branches: 0.41, functions: 0.58, lines: 0.62, uncovered: [12, 13, 14, 15, 16, 40, 41] },
  { path: 'src/lib/utils.ts', statements: 0.97, branches: 0.9, functions: 1, lines: 0.97, uncovered: [31, 32] },
]

const BENCHMARKS: BenchmarkResult[] = [
  { name: 'cn() — compiled', value: 1_842_000, error: 41_000, samples: 96 },
  { name: 'cn() — twMerge + clsx', value: 61_400, error: 2_100, samples: 96 },
  { name: 'Slot — own implementation', value: 1_811_000, error: 52_000, samples: 96 },
  { name: 'Slot — Radix (removed)', value: 1_204_000, error: 96_000, samples: 96 },
  { name: 'renderToString(Dashboard)', value: 3_740, error: 88, samples: 48 },
]

const PROFILE: FlameFrame = {
  name: 'prerender',
  value: 268,
  children: [
    {
      name: 'renderToString',
      value: 241,
      children: [
        {
          name: 'ExamplePage',
          value: 232,
          children: [
            { name: 'AppFrame', value: 41, children: [{ name: 'SidebarProvider', value: 22 }] },
            {
              name: 'Dashboard',
              value: 168,
              children: [
                { name: 'Table', value: 96, children: [{ name: 'TableRow ×48', value: 74 }] },
                { name: 'Sparkbars', value: 38 },
                { name: 'Tabs', value: 21 },
              ],
            },
            { name: 'Tooltip portals', value: 18 },
          ],
        },
      ],
    },
    { name: 'collectStyles', value: 19, children: [{ name: 'tailwind scan', value: 14 }] },
    { name: 'writeHtml', value: 8 },
  ],
}

const LIGHTHOUSE: LighthouseCategory[] = [
  {
    id: 'perf',
    label: 'Performance',
    score: 74,
    metrics: [
      { label: 'LCP', value: '2.8s', poor: true },
      { label: 'CLS', value: '0.01' },
      { label: 'TBT', value: '210ms', poor: true },
      { label: 'FCP', value: '0.9s' },
    ],
  },
  { id: 'a11y', label: 'Accessibility', score: 98, metrics: [{ label: 'Contrast', value: 'pass' }, { label: 'Names & labels', value: 'pass' }] },
  { id: 'bp', label: 'Best practices', score: 92, metrics: [{ label: 'Console errors', value: '0' }] },
  { id: 'seo', label: 'SEO', score: 100 },
]

const MODULES: BundleModule[] = [
  { name: 'react-dom', size: 142_800, gzip: 45_200 },
  { name: 'shiki/langs', size: 412_000, gzip: 96_400 },
  { name: 'src/registry', size: 214_600, gzip: 41_800 },
  { name: 'src/components/ui', size: 186_400, gzip: 36_200 },
  { name: 'lucide-react', size: 88_200, gzip: 21_100 },
  { name: 'zod', size: 61_200, gzip: 14_900 },
  { name: 'react-hook-form', size: 42_800, gzip: 11_200 },
  { name: 'react', size: 24_100, gzip: 8_400 },
  { name: 'src/lib', size: 18_400, gzip: 5_900 },
  { name: 'locales/en-GB', size: 402_000, gzip: 12_100 },
]

/* ------------------------------------------------------------- release side */

const INITIAL_DEPLOYS: Deploy[] = [
  { id: 'd1', environment: 'production', status: 'ready', branch: 'main', commit: 'c3d4e5f', message: 'Field padding derives from control height', author: 'Katherine Johnson', duration: 192, when: '3 hours ago', url: '#' },
  { id: 'd2', environment: 'preview', status: 'building', branch: 'feat/traffic-split', commit: 'd4e5f6a', message: 'Traffic split follows the flag rollout', author: 'Grace Hopper', when: '21 minutes ago' },
  { id: 'd3', environment: 'preview', status: 'failed', branch: 'main', commit: '8f21c4a', message: 'Drop Radix, add own Slot primitive', author: 'Ada Lovelace', duration: 44, when: '6 minutes ago' },
  { id: 'd4', environment: 'staging', status: 'ready', branch: 'next', commit: 'a7b8c9d', message: 'Bump Tailwind to 4.3', author: 'Margaret Hamilton', duration: 168, when: 'yesterday', url: '#' },
  { id: 'd5', environment: 'production', status: 'canceled', branch: 'main', commit: 'f6a7b8c', message: 'Toast queue and provider', author: 'Alan Turing', when: '2 days ago' },
]

const ENV_VARS: EnvVar[] = [
  { key: 'NODE_ENV', value: 'production', scopes: ['prod'], updated: '3 months ago' },
  { key: 'DATABASE_URL', value: 'postgres://ci:hunter2@db.internal:5432/kit', secret: true, scopes: ['prod', 'preview'], updated: '11 days ago' },
  { key: 'REGISTRY_TOKEN', value: 'npm_9f4c2a71b8e3d05a6c1f', secret: true, scopes: ['prod', 'preview', 'ci'], updated: '2 days ago' },
  { key: 'VITE_API_URL', value: 'https://api.astralyx.dev', scopes: ['prod'], updated: '3 months ago' },
  { key: 'VITE_API_URL', value: 'https://api.staging.astralyx.dev', scopes: ['preview', 'dev'], updated: '3 weeks ago' },
  { key: 'TURBO_TEAM', value: 'astralyx', scopes: ['ci'], updated: '5 months ago' },
]

const INITIAL_CONTAINERS: Container[] = [
  { id: 'k1', name: 'runner-eu-1', image: 'ghcr.io/astralyx/runner', tag: 'v2.4.1', state: 'running', startedAt: hoursAgo(76), cpu: 62.4, memory: 3_100_000_000, ports: ['0.0.0.0:8080→8080'] },
  { id: 'k2', name: 'runner-eu-2', image: 'ghcr.io/astralyx/runner', tag: 'v2.4.1', state: 'running', startedAt: hoursAgo(76), cpu: 88.1, memory: 3_640_000_000 },
  { id: 'k3', name: 'runner-us-1', image: 'ghcr.io/astralyx/runner', tag: 'v2.3.9', state: 'restarting', restarts: 14, cpu: 4.2, memory: 210_000_000 },
  { id: 'k4', name: 'cache-proxy', image: 'ghcr.io/astralyx/turbo-cache', tag: 'v1.2.0', state: 'running', startedAt: hoursAgo(412), cpu: 3.8, memory: 512_000_000, ports: ['127.0.0.1:9080→9080'] },
  { id: 'k5', name: 'chromium-shard', image: 'mcr.microsoft.com/playwright', tag: 'v1.52.0', state: 'exited', restarts: 1 },
]

const COVERAGE_METRICS = [
  { value: 'branches', label: 'Branches' },
  { value: 'statements', label: 'Statements' },
  { value: 'functions', label: 'Functions' },
  { value: 'lines', label: 'Lines' },
]

type CoverageMetric = 'statements' | 'branches' | 'functions' | 'lines'

const RUN_TONE = { success: 'green', failure: 'destructive', running: 'blue' } as const

function CiPipeline() {
  const [section, setSection] = useState('runs')
  const [runId, setRunId] = useState(RUNS[0].id)
  const [jobId, setJobId] = useState(RUNS[0].defaultJob)
  const [metric, setMetric] = useState<CoverageMetric>('branches')
  const [gzip, setGzip] = useState(true)
  const [deploys, setDeploys] = useState(INITIAL_DEPLOYS)
  const [containers, setContainers] = useState(INITIAL_CONTAINERS)
  const [flagOn, setFlagOn] = useState(true)
  const [rollout, setRollout] = useState(10)
  const [requeued, setRequeued] = useState<string[]>([])

  const run = RUNS.find((entry) => entry.id === runId) ?? RUNS[0]
  const job = run.stages.flatMap((stage) => stage.jobs).find((entry) => entry.id === jobId)

  /**
   * A re-run is a view over the same run rather than a second copy of it.
   *
   * Re-running only replays what failed and everything it blocked, so the
   * transform is the same three rules everywhere: failures go back to running,
   * the jobs they skipped go back to pending, and the recorded durations stop
   * being true the moment either happens.
   */
  const rerunning = requeued.includes(run.id)
  const status = rerunning ? 'running' : run.status

  const log = useMemo<BuildStep[] | undefined>(() => {
    const steps = LOGS[`${run.id}:${jobId}`]
    if (!steps || !rerunning) return steps
    return steps.map((step) =>
      step.status === 'failed'
        ? { ...step, status: 'running' as const, duration: undefined, output: undefined }
        : step.status === 'skipped'
          ? { ...step, status: 'pending' as const }
          : step,
    )
  }, [run.id, jobId, rerunning])

  const checks = useMemo<StatusCheck[]>(
    () =>
      rerunning
        ? run.checks.map((check) =>
            check.status === 'failure'
              ? { ...check, status: 'running' as const, duration: undefined, detail: undefined }
              : check.status === 'skipped'
                ? { ...check, status: 'pending' as const, description: 'queued behind the re-run' }
                : check,
          )
        : run.checks,
    [run, rerunning],
  )

  // Selecting a run resets the log to that run's interesting job — carrying
  // "test" across to a run that has not reached testing shows an empty panel
  // for no reason.
  const selectRun = (id: string) => {
    setRunId(id)
    setJobId(RUNS.find((entry) => entry.id === id)?.defaultJob ?? 'checkout')
  }

  /**
   * The pipeline's own data carries no handlers, so they are attached here.
   * A job without `onSelect` renders as a plain row rather than a dead button,
   * which is exactly what we want for jobs that have no log to open.
   */
  const stages = useMemo<PipelineStage[]>(
    () =>
      run.stages.map((stage) => ({
        ...stage,
        jobs: stage.jobs.map((entry) => {
          const replayed = !rerunning
            ? entry
            : entry.status === 'failure'
              ? { ...entry, status: 'running' as const, duration: undefined }
              : entry.status === 'skipped'
                ? { ...entry, status: 'pending' as const }
                : entry
          return LOGS[`${run.id}:${entry.id}`]
            ? { ...replayed, onSelect: () => setJobId(entry.id) }
            : replayed
        }),
      })),
    [run, rerunning],
  )

  const redeploy = (id: string) => {
    const source = deploys.find((deploy) => deploy.id === id)
    if (!source) return
    // A redeploy is a new row, not a mutated old one: the failed attempt is the
    // evidence somebody will want when the retry also fails.
    setDeploys((current) => [
      { ...source, id: `${source.id}-retry-${current.length}`, status: 'building', duration: undefined, when: 'just now', url: undefined },
      ...current,
    ])
  }

  const setContainerState = (id: string, state: Container['state'], bumpRestart = false) =>
    setContainers((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              state,
              startedAt: state === 'running' ? NOW : entry.startedAt,
              restarts: bumpRestart ? (entry.restarts ?? 0) + 1 : entry.restarts,
            }
          : entry,
      ),
    )

  // The canary weight is derived from the flag rather than stored twice. Two
  // copies of a rollout percentage is how a "10% canary" ends up taking 100%.
  const canaryWeight = flagOn ? rollout : 0

  return (
    <AppFrame
      inset
      product="Forge"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title={
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold">
            Run #{run.id} · {run.message}
          </h1>
          <Badge size="sm" color={RUN_TONE[status]}>
            {status}
          </Badge>
        </div>
      }
      user={{ name: 'Ada Lovelace', plan: 'Owner' }}
      actions={
        <div className="flex items-center gap-2">
          <Select
            variant="secondary"
            size="sm"
            value={runId}
            onValueChange={selectRun}
            className="hidden w-64 lg:block"
            options={RUNS.map((entry) => ({
              value: entry.id,
              label: `#${entry.id} · ${entry.branch} · ${entry.message}`,
            }))}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={run.status !== 'failure' || rerunning}
            onClick={() => setRequeued((current) => [...current, run.id])}
          >
            <RefreshCw /> Re-run failed
          </Button>
          <Button size="sm">
            <Rocket /> Deploy
          </Button>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Merge checks</CardTitle>
              <CardDescription>Required checks decide the merge button.</CardDescription>
            </CardHeader>
            <CardBody>
              <StatusChecks checks={checks} defaultExpanded={['c3']} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle as="h2">Commit</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={run.author} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{run.author}</p>
                  <p className="text-muted-foreground truncate text-xs">{run.when}</p>
                </div>
              </div>
              <Separator label="ref" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge size="sm" shape="rounded" icon={<GitBranch />}>
                  {run.branch}
                </Badge>
                <code className="text-muted-foreground font-mono text-xs">{run.commit}</code>
              </div>
              <p className="text-muted-foreground text-xs">{run.summary}</p>
            </CardBody>
          </Card>

          <FeatureFlag
            name="checkout.slot_primitive"
            description="Serve the new Slot-based controls to a slice of production traffic."
            environment="production"
            enabled={flagOn}
            onEnabledChange={setFlagOn}
            rollout={rollout}
            onRolloutChange={setRollout}
            rules={[
              { id: 'r1', label: 'Always on', condition: 'org = astralyx' },
              { id: 'r2', label: 'Excluded', condition: 'plan = enterprise', enabled: false },
            ]}
          />
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        {rerunning ? (
          <Alert color="blue" icon={<RefreshCw />} title={`Run #${run.id} re-queued`}>
            Only the failed job and everything it blocked are replaying. The successful jobs keep
            their original results and their cached artifacts.
          </Alert>
        ) : run.status === 'failure' ? (
          <Alert color="destructive" icon={<TriangleAlert />} title={`Run #${run.id} failed in Verify`}>
            {run.summary} Packaging and both deploy jobs were skipped, so nothing from this commit
            has shipped.
          </Alert>
        ) : run.status === 'running' ? (
          <Alert color="blue" icon={<Play />} title={`Run #${run.id} is still going`}>
            {run.summary}
          </Alert>
        ) : (
          <Alert color="green" icon={<Zap />} title={`Run #${run.id} is green`}>
            {run.summary}
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle as="h2">Pipeline</CardTitle>
            <CardDescription>
              Jobs that produced output are buttons — pick one to load its log below.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Pipeline stages={stages} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            action={
              <Badge size="sm" color="neutral">
                #{run.id}
              </Badge>
            }
          >
            <CardTitle as="h2">{job ? `${job.name} — log` : 'Job log'}</CardTitle>
            <CardDescription>
              Failed steps open by default; nobody reads the steps that worked.
            </CardDescription>
          </CardHeader>
          <CardBody>
            {log ? (
              <BuildLog steps={log} />
            ) : (
              <Empty
                icon={<FlaskConical />}
                title="No log for this job"
                description={`${job?.name ?? 'This job'} was ${job?.status ?? 'not run'} in run #${run.id}, so the runner kept no output.`}
              />
            )}
          </CardBody>
        </Card>

        <Tabs defaultValue="tests" className="gap-0">
          <div className="border-border border-b pb-2">
            <TabsList variant="underline">
              <TabsTrigger value="tests" variant="underline">Tests</TabsTrigger>
              <TabsTrigger value="performance" variant="underline">Performance</TabsTrigger>
              <TabsTrigger value="release" variant="underline">Release</TabsTrigger>
              <TabsTrigger value="runners" variant="underline">Runners</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tests" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Test run</CardTitle>
                <CardDescription>
                  {rerunning
                    ? 'Last recorded results — the re-run has not reported yet.'
                    : `Suites from run #${run.id}.`}
                </CardDescription>
              </CardHeader>
              <CardBody>
                <TestResults suites={run.suites} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                action={
                  <Select
                                    variant="secondary"
                                    size="sm"
                                    value={metric}
                                    onValueChange={(value) => setMetric(value as CoverageMetric)}
                                    className="w-36"
                                    options={COVERAGE_METRICS}
                                  />
                }
              >
<CardTitle as="h2">Coverage</CardTitle>
                                <CardDescription>Ranked by untested lines, not by percentage.</CardDescription>
              </CardHeader>
              <CardBody>
                <CoverageReport files={COVERAGE} metric={metric} threshold={0.8} />
              </CardBody>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Lighthouse — /examples/dashboard</CardTitle>
                <CardDescription>Mobile, throttled, median of five runs.</CardDescription>
              </CardHeader>
              <CardBody>
                <LighthouseScore categories={LIGHTHOUSE} />
              </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Benchmarks</CardTitle>
                  <CardDescription>Differences inside the error bars read as noise.</CardDescription>
                </CardHeader>
                <CardBody>
                  <BenchmarkTable results={BENCHMARKS} unit="ops/s" />
                </CardBody>
              </Card>

              <Card>
                {/* Laying out by raw bytes makes the locale file look like the
                    problem; by gzip it all but disappears. Both views are
                    useful, so the toggle stays. */}
                <CardHeader
                  action={
                    <Switch
                      size="sm"
                      label="gzip"
                      checked={gzip}
                      onChange={(event) => setGzip(event.currentTarget.checked)}
                    />
                  }
                >
                  <CardTitle as="h2">Bundle</CardTitle>
                  <CardDescription>412.8 kB raw, 118.4 kB on the wire.</CardDescription>
                </CardHeader>
                <CardBody>
                  <BundleTreemap modules={MODULES} useGzip={gzip} height={240} />
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle as="h2">Prerender profile</CardTitle>
                <CardDescription>Click a frame to zoom; width is time, depth is stack.</CardDescription>
              </CardHeader>
              <CardBody>
                <FlameGraph root={PROFILE} unit="ms" />
              </CardBody>
            </Card>
          </TabsContent>

          <TabsContent value="release" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Deployments</CardTitle>
                <CardDescription>Redeploying adds a row rather than replacing one.</CardDescription>
              </CardHeader>
              <CardBody>
                <DeployList deploys={deploys} onRedeploy={redeploy} />
              </CardBody>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle as="h2">Traffic</CardTitle>
                  <CardDescription>
                    The canary weight follows the flag in the sidebar.
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  <TrafficSplit
                    label="checkout-api"
                    targets={[
                      { id: 'stable', label: 'Stable', version: 'v2.4.1', weight: 100 - canaryWeight },
                      { id: 'canary', label: 'Canary', version: 'v2.5.0-rc.1', weight: canaryWeight, canary: true },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle as="h2">Environment</CardTitle>
                  <CardDescription>Secrets stay masked; copy takes the real value.</CardDescription>
                </CardHeader>
                <CardBody>
                  <EnvVars vars={ENV_VARS} />
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="runners" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Build runners</CardTitle>
                <CardDescription>
                  runner-us-1 is "running" with 14 restarts — that is a crash loop, not health.
                </CardDescription>
              </CardHeader>
              <CardBody>
                <ContainerList
                  containers={containers}
                  now={NOW}
                  onStart={(id) => setContainerState(id, 'running')}
                  onStop={(id) => setContainerState(id, 'exited')}
                  onRestart={(id) => setContainerState(id, 'running', true)}
                />
              </CardBody>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppFrame>
  )
}

export const ciPipelineExample: ExampleEntry = {
  id: 'ci-pipeline',
  label: 'CI Pipeline',
  description:
    'A build and release console: pick a run, pick a job to load its log, then read the tests, coverage, profile and bundle behind it — with deploys, a flag whose rollout drives the traffic split, and the runners underneath.',
  uses: [
    'Pipeline', 'Build Log', 'Deploy List', 'Test Results', 'Coverage Report',
    'Benchmark Table', 'Flame Graph', 'Lighthouse Score', 'Bundle Treemap',
    'Status Checks', 'Env Vars', 'Feature Flag', 'Traffic Split', 'Container List',
  ],
  render: () => <CiPipeline />,
}
