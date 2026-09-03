import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BranchSelect } from '@/components/ui/branch-select'
import { CommitList } from '@/components/ui/commit-list'
import { DeployList } from '@/components/ui/deploy-list'
import { DiffStat } from '@/components/ui/diff-stat'
import { FileTree, type FileNode } from '@/components/ui/file-tree'
import type { ComponentEntry, ComposerState } from './types'

/* ------------------------------------------------------------- file tree */

const TREE: FileNode[] = [
  {
    name: 'src',
    defaultOpen: true,
    children: [
      {
        name: 'components',
        defaultOpen: true,
        children: [
          { name: 'ui', children: [
            { name: 'button.tsx', meta: '4h ago' },
            { name: 'input.tsx', meta: '2d ago' },
            { name: 'file-tree.tsx', meta: 'just now', badge: <Badge size="sm" color="green">new</Badge> },
          ]},
          { name: 'primitives', children: [
            { name: 'slot.tsx', meta: '1w ago' },
            { name: 'popper.tsx', meta: '3d ago' },
          ]},
        ],
      },
      { name: 'lib', children: [
        { name: 'styles.ts', meta: '4h ago' },
        { name: 'utils.ts', meta: '3w ago' },
      ]},
      { name: 'index.css', meta: '4h ago' },
    ],
  },
  { name: 'package.json', meta: '1w ago' },
  { name: 'README.md', meta: '4h ago' },
]

export const fileTreeEntry: ComponentEntry = {
  id: 'file-tree',
  label: 'File Tree',
  description:
    'Files and directories as a tree. Uses the ARIA tree pattern with roving focus — arrow keys move between rows, so a repository with 200 files does not cost 200 tab stops.',
  usage: `import { FileTree } from '@/components/ui/file-tree'

<FileTree
  nodes={[
    { name: 'src', defaultOpen: true, children: [{ name: 'index.ts' }] },
    { name: 'README.md', meta: '4h ago' },
  ]}
  onSelect={setPath}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'showMeta', label: 'showMeta', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <FileTree nodes={TREE} showMeta={Boolean(state.showMeta)} value="src" />
      </div>
    ),
    code: (state) =>
      `<FileTree\n  nodes={tree}\n${state.showMeta ? '' : '  showMeta={false}\n'}  onSelect={setPath}\n/>`,
  },
  api: [
    { name: 'nodes', type: 'FileNode[]', description: '{ name, children?, meta?, badge?, defaultOpen? }. Children make a node a directory.' },
    { name: 'value / onSelect', type: 'string / (path) => void', description: 'Selected path, joined with "/". Controlled or uncontrolled.' },
    { name: 'showMeta', type: 'boolean', default: 'true', description: 'Right-hand column — a commit message, a size, a timestamp.' },
    { name: 'keyboard', type: 'arrows', description: 'Up and down move between rows, left and right collapse and expand, Home and End jump.' },
    { name: 'icons', type: 'automatic', description: 'Chosen from the file extension, so callers pass names rather than icons.' },
  ],
  demos: [
    {
      title: 'Repository tree',
      stack: true,
      code: `<FileTree nodes={tree} onSelect={setPath} />`,
      render: () => (
        <div className="w-full max-w-md">
          <FileTree nodes={TREE} value="src" />
        </div>
      ),
    },
    {
      title: 'Names only',
      stack: true,
      code: `<FileTree nodes={tree} showMeta={false} />`,
      render: () => (
        <div className="w-full max-w-xs">
          <FileTree nodes={TREE} showMeta={false} />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ commit list */

const day = (offset: number, hour: number) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  d.setHours(hour, 12, 0, 0)
  return d
}

const COMMITS = [
  { sha: 'a1b2c3d4e5f6', message: 'Drop Radix, add own Slot primitive', author: 'Ada Lovelace', date: day(0, 14), status: 'passed' as const, verified: true, additions: 248, deletions: 96 },
  { sha: 'b2c3d4e5f6a7', message: 'Field padding derives from control height', author: 'Katherine Johnson', date: day(0, 11), status: 'passed' as const, additions: 64, deletions: 41 },
  { sha: 'c3d4e5f6a7b8', message: 'Fix switch thumb contrast in dark mode', author: 'Alan Turing', date: day(1, 17), status: 'failed' as const, additions: 12, deletions: 8 },
  { sha: 'd4e5f6a7b8c9', message: 'Toast queue and provider', author: 'Grace Hopper', date: day(1, 9), status: 'passed' as const, verified: true, additions: 310, deletions: 4 },
  { sha: 'e5f6a7b8c9d0', message: 'Squircle corners on every control', author: 'Margaret Hamilton', date: day(2, 16), status: 'running' as const, additions: 88, deletions: 88 },
]

export const commitListEntry: ComponentEntry = {
  id: 'commit-list',
  label: 'Commit List',
  description:
    'A history, grouped by day. The grouping is the point — a flat list of forty commits is unreadable, and "when" is the axis people actually scan along.',
  usage: `import { CommitList } from '@/components/ui/commit-list'

<CommitList commits={commits} onSelect={openCommit} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'locale', label: 'locale', options: ['en-GB', 'en-US', 'de-DE'], default: 'en-GB' },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <CommitList commits={COMMITS} locale={String(state.locale)} />
      </div>
    ),
    code: (state) => `<CommitList commits={commits} locale="${state.locale}" />`,
  },
  api: [
    { name: 'commits', type: 'Commit[]', description: '{ sha, message, author, date, status?, verified?, additions?, deletions?, body? }' },
    { name: 'grouping', type: 'by local day', description: 'Order within a day is preserved exactly as given — the component groups, it never re-sorts.' },
    { name: 'locale', type: 'string', default: "'en-GB'", description: 'Drives the date headings and times through Intl.' },
    { name: 'onSelect', type: '(sha: string) => void', description: 'Fires from both the message and the short-sha button.' },
  ],
  demos: [
    {
      title: 'Grouped history',
      stack: true,
      code: `<CommitList commits={commits} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <CommitList commits={COMMITS} />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ deploy list */

const DEPLOYS = [
  { id: '1', environment: 'production' as const, status: 'ready' as const, branch: 'main', commit: 'a1b2c3d4', message: 'Drop Radix, add own Slot primitive', author: 'Ada Lovelace', duration: 192, when: '4h ago', url: '#' },
  { id: '2', environment: 'preview' as const, status: 'building' as const, branch: 'feat/ai', commit: 'b2c3d4e5', message: 'Prompt input and context picker', author: 'Grace Hopper', when: 'just now' },
  { id: '3', environment: 'preview' as const, status: 'failed' as const, branch: 'fix/switch', commit: 'c3d4e5f6', message: 'Fix switch thumb contrast', author: 'Alan Turing', duration: 41, when: 'yesterday' },
  { id: '4', environment: 'staging' as const, status: 'canceled' as const, branch: 'next', commit: 'd4e5f6a7', message: 'Bump Tailwind', author: 'Katherine Johnson', duration: 12, when: '2d ago' },
]

export const deployListEntry: ComponentEntry = {
  id: 'deploy-list',
  label: 'Deploy List',
  description:
    'Deployments, newest first. A running deploy shows an indeterminate bar rather than a fabricated percentage — a number nobody can compute is worse than admitting you cannot.',
  usage: `import { DeployList } from '@/components/ui/deploy-list'

<DeployList deploys={deploys} onRedeploy={redeploy} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'redeploy', label: 'onRedeploy', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <DeployList
          deploys={DEPLOYS}
          onRedeploy={state.redeploy ? () => {} : undefined}
        />
      </div>
    ),
    code: (state) =>
      `<DeployList\n  deploys={deploys}\n${state.redeploy ? '  onRedeploy={redeploy}\n' : ''}/>`,
  },
  api: [
    { name: 'deploys', type: 'Deploy[]', description: '{ id, environment, status, branch, commit, message, author, duration?, when, url? }' },
    { name: 'status', type: "'ready' | 'building' | 'failed' | 'canceled'", description: 'Drives the badge colour, and whether the progress bar appears.' },
    { name: 'environment', type: "'production' | 'preview' | 'staging'", description: 'Each gets its own colour, so the target is readable at a glance.' },
    { name: 'onRedeploy', type: '(id: string) => void', description: 'Adds a redeploy action to every row when provided.' },
  ],
  demos: [
    {
      title: 'Mixed states',
      stack: true,
      code: `<DeployList deploys={deploys} onRedeploy={redeploy} />`,
      render: () => (
        <div className="w-full max-w-lg">
          <DeployList deploys={DEPLOYS} onRedeploy={() => {}} />
        </div>
      ),
    },
  ],
}

/* ---------------------------------------------------------- branch select */

const BRANCHES = [
  { name: 'main', isDefault: true, protected: true },
  { name: 'next', protected: true },
  { name: 'feat/ai-components' },
  { name: 'fix/switch-contrast' },
  { name: 'chore/bump-tailwind' },
  { name: 'v2.1.0', kind: 'tag' as const },
  { name: 'v2.0.0', kind: 'tag' as const },
]

export const branchSelectEntry: ComponentEntry = {
  id: 'branch-select',
  label: 'Branch Select',
  description:
    'A branch and tag picker. A Combobox underneath — repositories routinely have hundreds of branches, so search is not optional — with the default branch pinned first and tags labelled.',
  usage: `import { BranchSelect } from '@/components/ui/branch-select'

<BranchSelect
  branches={[{ name: 'main', isDefault: true, protected: true }]}
  defaultValue="main"
  onValueChange={checkout}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['xs', 'sm', 'md', 'lg'], default: 'sm' },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <BranchSelect
          branches={BRANCHES}
          defaultValue="main"
          size={state.size as 'xs' | 'sm' | 'md' | 'lg'}
        />
      </div>
    ),
    code: (state) => `<BranchSelect\n  branches={branches}\n  defaultValue="main"\n  size="${state.size}"\n/>`,
  },
  api: [
    { name: 'branches', type: 'BranchOption[]', description: '{ name, kind?, isDefault?, protected? }' },
    { name: 'ordering', type: 'automatic', description: 'Default branch first, then branches, then tags — the order people scan in.' },
    { name: 'value / onValueChange', type: 'string', description: 'Controlled and uncontrolled, same as Combobox.' },
  ],
  demos: [
    {
      title: 'With tags and protected branches',
      stack: true,
      code: `<BranchSelect branches={branches} defaultValue="main" />`,
      render: () => (
        <div className="flex w-full max-w-md items-center gap-2">
          <GitBranch className="text-muted-foreground size-4 shrink-0" />
          <BranchSelect branches={BRANCHES} defaultValue="main" />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------- diffstat */

function DiffPlayground({ additions, deletions }: { additions: number; deletions: number }) {
  const [a] = useState(additions)
  const [d] = useState(deletions)
  return <DiffStat additions={a} deletions={d} />
}

export const diffStatEntry: ComponentEntry = {
  id: 'diff-stat',
  label: 'Diff Stat',
  description:
    'Added and removed line counts with the five-square bar. The squares are proportional but never empty — one line changed in a thousand still lights one square.',
  usage: `import { DiffStat } from '@/components/ui/diff-stat'

<DiffStat additions={248} deletions={96} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'additions', label: 'additions', options: ['0', '1', '48', '248', '2400'], default: '248' },
      { type: 'select', prop: 'deletions', label: 'deletions', options: ['0', '1', '96', '900'], default: '96' },
      { type: 'boolean', prop: 'showCounts', label: 'showCounts', default: true },
    ],
    render: (state) => (
      <DiffStat
        additions={Number(state.additions)}
        deletions={Number(state.deletions)}
        showCounts={Boolean(state.showCounts)}
      />
    ),
    code: (state) =>
      `<DiffStat additions={${state.additions}} deletions={${state.deletions}}${state.showCounts ? '' : ' showCounts={false}'} />`,
  },
  api: [
    { name: 'additions / deletions', type: 'number', description: 'Line counts. The bar is proportional to their ratio.' },
    { name: 'showCounts', type: 'boolean', default: 'true', description: 'Numbers beside the squares.' },
    { name: 'squares', type: 'number', default: '5', description: 'How many squares the bar has.' },
  ],
  demos: [
    {
      title: 'Ratios',
      stack: true,
      code: `<DiffStat additions={248} deletions={96} />`,
      render: () => (
        <div className="space-y-2">
          <DiffPlayground additions={248} deletions={96} />
          <DiffPlayground additions={1} deletions={900} />
          <DiffPlayground additions={2400} deletions={0} />
          <DiffPlayground additions={0} deletions={0} />
        </div>
      ),
    },
  ],
}
