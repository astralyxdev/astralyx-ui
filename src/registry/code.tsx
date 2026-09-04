import { CodeSearch, type CodeSearchFile } from '@/components/ui/code-search'
import { DiffView, parseUnifiedDiff, type DiffFile } from '@/components/ui/diff-view'
import { InputFile } from '@/components/ui/input-file'
import type { FileUpload, UploadControl } from '@/lib/use-uploads'
import { JsonViewer } from '@/components/ui/json-viewer'
import { LogViewer, type LogEntry } from '@/components/ui/log-viewer'
import { ShortcutSheet, type ShortcutGroup } from '@/components/ui/shortcut-sheet'
import { Terminal } from '@/components/ui/terminal'
import type { ComponentEntry, ComposerState } from './types'

/* ---------------------------------------------------------------- diff view */

const PATCH = `@@ -12,7 +12,9 @@ export const controlSize = {
   sm: 'h-8 gap-1.5 px-3.5 text-sm',
   md: 'h-9 gap-2 px-4.5 text-sm',
-  lg: 'h-10 gap-2 px-6 text-sm',
+  lg: 'h-10 gap-2 px-6 text-sm rounded-[var(--radius-control-lg)]',
+  xl: 'h-12 gap-2.5 px-8 text-base',
 } as const
 
 export const buttonText = {`

const DIFF_FILE: DiffFile = {
  path: 'src/lib/styles.ts',
  status: 'modified',
  hunks: parseUnifiedDiff(PATCH),
}

const DIFF_VIEWS = ['unified', 'split'] as const

export const diffViewEntry: ComponentEntry = {
  id: 'diff-view',
  label: 'Diff View',
  description:
    'A unified or side-by-side diff. Takes parsed hunks rather than a patch string, with parseUnifiedDiff exported alongside for when you only have the text.',
  usage: `import { DiffView, parseUnifiedDiff } from '@/components/ui/diff-view'

<DiffView
  file={{ path: 'src/lib/styles.ts', hunks: parseUnifiedDiff(patch) }}
  view="split"
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'view', label: 'view', options: DIFF_VIEWS, default: 'unified' },
      { type: 'boolean', prop: 'collapsible', label: 'collapsible', default: true },
    ],
    render: (state) => (
      <div className="w-full">
        <DiffView
          file={DIFF_FILE}
          view={String(state.view) as (typeof DIFF_VIEWS)[number]}
          collapsible={Boolean(state.collapsible)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<DiffView\n  file={{ path: 'src/lib/styles.ts', hunks: parseUnifiedDiff(patch) }}\n  view="${state.view}"\n  collapsible={${Boolean(state.collapsible)}}\n/>`,
  },
  api: [
    { name: 'file', type: 'DiffFile', description: '`{ path, previousPath?, status?, hunks }`. Additions and deletions are counted from the hunks rather than passed in, so the header can never disagree with the body.' },
    { name: 'view', type: "'unified' | 'split'", default: "'unified'", description: 'Split pairs removals with additions positionally inside each hunk — what a side-by-side view actually shows, without a word-level diff algorithm.' },
    { name: 'collapsible / defaultOpen', type: 'boolean', default: 'true / true', description: 'Fold the file behind its header, for a review with many files.' },
    { name: 'parseUnifiedDiff', type: '(patch: string) => DiffHunk[]', description: 'Parses standard unified-diff text, tracking old and new line numbers across hunks.' },
    { name: 'DiffViewList', type: 'component', description: 'Several files in one review, sharing a view mode.' },
  ],
  demos: [
    {
      title: 'Unified and split',
      stack: true,
      code: `<DiffView file={file} />
<DiffView file={file} view="split" />`,
      render: () => (
        <div className="flex w-full flex-col gap-4">
          <DiffView file={DIFF_FILE} />
          <DiffView file={DIFF_FILE} view="split" collapsible={false} />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------------- terminal */

// Escapes are built rather than written literally: a raw control character in
// source survives copy/paste badly and is invisible in review.
const E = String.fromCharCode(27)
const LOG = [
  `${E}[90m$${E}[0m npm run build`,
  '',
  `${E}[36mvite${E}[0m v8.0.1 ${E}[90mbuilding for production...${E}[0m`,
  `${E}[32m✓${E}[0m 214 modules transformed`,
  `dist/assets/index-${E}[1m4f2a1c9${E}[0m.css   ${E}[33m 92.4 kB${E}[0m`,
  `dist/assets/index-${E}[1m4f2a1c9${E}[0m.js    ${E}[33m748.1 kB${E}[0m`,
  `${E}[32m✓${E}[0m built in 1.86s`,
  `${E}[31merror${E}[0m chunk size limit exceeded`,
].join('\n')

export const terminalEntry: ComponentEntry = {
  id: 'terminal',
  label: 'Terminal',
  description:
    'Console output with ANSI colour. Follow-tail sticks to the bottom only while the reader is already there, so scrolling up to read something is never undone by the next line.',
  usage: `import { Terminal } from '@/components/ui/terminal'

<Terminal title="npm run build" content={output} follow showLineNumbers />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'showLineNumbers', label: 'showLineNumbers', default: false },
      { type: 'boolean', prop: 'copyable', label: 'copyable', default: true },
      { type: 'text', prop: 'title', label: 'title', default: 'npm run build' },
    ],
    render: (state) => (
      <div className="w-full">
        <Terminal
          content={LOG}
          title={String(state.title)}
          showLineNumbers={Boolean(state.showLineNumbers)}
          copyable={Boolean(state.copyable)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Terminal\n  title="${state.title}"\n  content={output}\n  showLineNumbers={${Boolean(state.showLineNumbers)}}\n  copyable={${Boolean(state.copyable)}}\n/>`,
  },
  api: [
    { name: 'content / lines', type: 'string / string[]', description: 'Raw output split on newlines, or the lines directly when you already have them.' },
    { name: 'follow', type: 'boolean', default: 'false', description: 'Stick to the bottom as output grows — but only while the reader is within a couple of dozen pixels of it.' },
    { name: 'showLineNumbers', type: 'boolean', default: 'false', description: 'Gutter numbering.' },
    { name: 'copyable / title', type: 'boolean / string', description: 'Header row with a copy button that reports back for a moment after copying.' },
    { name: 'ANSI support', type: 'SGR only', description: 'Colour, bold, dim and reset. Cursor movement and screen clearing are dropped rather than half-implemented — honouring them needs a screen buffer, and this is an append-only transcript.' },
  ],
  demos: [
    {
      title: 'Build output',
      stack: true,
      code: `<Terminal title="npm run build" content={output} showLineNumbers />`,
      render: () => (
        <div className="w-full">
          <Terminal title="npm run build" content={LOG} showLineNumbers />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------- log viewer */

const NOW = new Date('2026-09-02T08:14:00')
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000)

const LOG_ENTRIES: LogEntry[] = [
  { id: '1', level: 'info', message: 'Server listening on :3000', time: at(0), source: 'api' },
  { id: '2', level: 'debug', message: 'Cache warm: 412 keys', time: at(2), source: 'cache' },
  { id: '3', level: 'info', message: 'GET /v1/components 200 12ms', time: at(4), source: 'api' },
  { id: '4', level: 'warn', message: 'Slow query: components.list took 842ms', time: at(9), source: 'db' },
  { id: '5', level: 'error', message: 'Upstream timeout contacting registry', time: at(14), source: 'api' },
  { id: '6', level: 'info', message: 'Retrying in 2s (attempt 1 of 3)', time: at(15), source: 'api' },
  { id: '7', level: 'debug', message: 'Connection pool: 4 idle, 2 active', time: at(18), source: 'db' },
]

export const logViewerEntry: ComponentEntry = {
  id: 'log-viewer',
  label: 'Log Viewer',
  description:
    'Structured logs with level filters, search and counts. Matches are highlighted in place rather than filtering the list down, so a search shows where the hits are in context.',
  usage: `import { LogViewer } from '@/components/ui/log-viewer'

<LogViewer entries={entries} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'searchable', label: 'searchable', default: true },
      { type: 'boolean', prop: 'filterable', label: 'filterable', default: true },
    ],
    render: (state) => (
      <div className="w-full">
        <LogViewer
          entries={LOG_ENTRIES}
          searchable={Boolean(state.searchable)}
          filterable={Boolean(state.filterable)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<LogViewer\n  entries={entries}\n  searchable={${Boolean(state.searchable)}}\n  filterable={${Boolean(state.filterable)}}\n/>`,
  },
  api: [
    { name: 'entries', type: 'LogEntry[]', description: '`{ id, level, message, time?, source? }` with level one of debug, info, warn, error.' },
    { name: 'searchable', type: 'boolean', default: 'true', description: 'Filter box. The hit is marked inside the message.' },
    { name: 'filterable', type: 'boolean', default: 'true', description: 'Per-level toggles, each showing that level total so you can see what you are hiding.' },
    { name: 'locale', type: 'string', default: "'en-GB'", description: 'Formats timestamps through Intl.' },
  ],
  demos: [
    {
      title: 'Service logs',
      stack: true,
      code: `<LogViewer entries={entries} />`,
      render: () => (
        <div className="w-full">
          <LogViewer entries={LOG_ENTRIES} />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------------- json viewer */

const JSON_VALUE = {
  name: 'astralyx-ui-kit',
  version: '1.4.2',
  private: true,
  engines: { node: '>=22' },
  scripts: { dev: 'vite', build: 'tsc -b && vite build', lint: 'oxlint' },
  keywords: ['react', 'tailwind', 'components'],
  build: {
    target: 'es2023',
    sourcemap: false,
    chunks: [
      { name: 'index', size: 748_100 },
      { name: 'vendor', size: 142_300 },
    ],
  },
}

export const jsonViewerEntry: ComponentEntry = {
  id: 'json-viewer',
  label: 'JSON Viewer',
  description:
    'A collapsible view of a parsed value. Collapsed nodes show their size, because "three entries or three thousand" is the question you have before expanding one.',
  usage: `import { JsonViewer } from '@/components/ui/json-viewer'

<JsonViewer value={response} defaultExpandedDepth={2} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'depth', label: 'defaultExpandedDepth', options: ['0', '1', '2', '3'], default: '1' },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <JsonViewer value={JSON_VALUE} defaultExpandedDepth={Number(state.depth)} />
      </div>
    ),
    code: (state: ComposerState) =>
      `<JsonViewer value={response} defaultExpandedDepth={${state.depth}} />`,
  },
  api: [
    { name: 'value', type: 'Json', description: 'A parsed value, not a string — re-serialising to re-parse loses everything that only exists in memory.' },
    { name: 'defaultExpandedDepth', type: 'number', default: '1', description: 'How many levels start open.' },
  ],
  demos: [
    {
      title: 'Package manifest',
      stack: true,
      code: `<JsonViewer value={manifest} defaultExpandedDepth={2} />`,
      render: () => (
        <div className="w-full max-w-lg">
          <JsonViewer value={JSON_VALUE} defaultExpandedDepth={2} />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------------- code search */

const SEARCH_FILES: CodeSearchFile[] = [
  {
    path: 'src/lib/styles.ts',
    language: 'ts',
    matches: [
      { line: 68, text: 'export const controlSize = {', range: [13, 24] },
      { line: 238, text: 'export const fieldSize = {', range: [13, 22] },
    ],
  },
  {
    path: 'src/components/ui/button.tsx',
    language: 'tsx',
    matches: [
      { line: 59, text: "        xs: `${controlSize.xs} ${buttonText.xs}`,", range: [17, 28] },
      { line: 61, text: "        default: `${controlSize.md} ${buttonText.md}`,", range: [22, 33] },
    ],
  },
]

export const codeSearchEntry: ComponentEntry = {
  id: 'code-search',
  label: 'Code Search',
  description:
    'Search hits grouped by file, with the match marked inside its line. Ranges are clamped on render, because a wrong highlight is worse than none — it looks right.',
  usage: `import { CodeSearch } from '@/components/ui/code-search'

<CodeSearch files={files} query="controlSize" onOpen={openInEditor} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'defaultCollapsed', label: 'defaultCollapsed', default: false },
    ],
    render: (state) => (
      <div className="w-full">
        <CodeSearch
          files={SEARCH_FILES}
          query="controlSize"
          defaultCollapsed={Boolean(state.defaultCollapsed)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<CodeSearch\n  files={files}\n  query="controlSize"\n  defaultCollapsed={${Boolean(state.defaultCollapsed)}}\n/>`,
  },
  api: [
    { name: 'files', type: 'CodeSearchFile[]', description: '`{ path, language?, matches }` where a match is `{ line, text, range? }`.' },
    { name: 'range', type: '[number, number]', description: '0-based, end-exclusive, within the match text. Clamped on render so an off-by-one from a 1-based backend cannot silently mark the wrong span.' },
    { name: 'query', type: 'string', description: 'Fallback locator when a match carries no range.' },
    { name: 'onOpen', type: '(path, line) => void', description: 'Makes each hit a button — jump to the file in an editor.' },
  ],
  demos: [
    {
      title: 'Results',
      stack: true,
      code: `<CodeSearch files={files} query="controlSize" />`,
      render: () => (
        <div className="w-full">
          <CodeSearch files={SEARCH_FILES} query="controlSize" />
        </div>
      ),
    },
  ],
}

/* ----------------------------------------------------------- shortcut sheet */

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'General',
    shortcuts: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['⌘', 'B'], label: 'Toggle sidebar' },
      { keys: ['⌘', '/'], label: 'Keyboard shortcuts' },
      { keys: ['Esc'], label: 'Dismiss' },
    ],
  },
  {
    label: 'Editor',
    shortcuts: [
      { keys: ['⌘', 'S'], label: 'Save file' },
      { keys: ['⌘', 'P'], label: 'Go to file' },
      { keys: ['⌘', '⇧', 'F'], label: 'Search in project' },
      { keys: ['⌥', '↑'], label: 'Move line up' },
    ],
  },
]

export const shortcutSheetEntry: ComponentEntry = {
  id: 'shortcut-sheet',
  label: 'Shortcut Sheet',
  description:
    'A keyboard reference grouped by area. Presentational by design — it never binds the keys, because the component that shows a cheat sheet is not the one that owns the handlers.',
  usage: `import { ShortcutSheet } from '@/components/ui/shortcut-sheet'

<ShortcutSheet groups={groups} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'columns', label: 'columns', default: true }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <ShortcutSheet groups={SHORTCUT_GROUPS} columns={Boolean(state.columns)} />
      </div>
    ),
    code: (state: ComposerState) =>
      `<ShortcutSheet groups={groups} columns={${Boolean(state.columns)}} />`,
  },
  api: [
    { name: 'groups', type: 'ShortcutGroup[]', description: '`{ label, shortcuts }` where a shortcut is `{ keys: string[], label }`.' },
    { name: 'keys', type: 'string[]', description: 'The modifier chain stays data, so the same array can drive a matcher elsewhere rather than being re-parsed from a string.' },
    { name: 'columns', type: 'boolean', default: 'true', description: 'Two columns from `sm` up.' },
  ],
  demos: [
    {
      title: 'Reference',
      stack: true,
      code: `<ShortcutSheet groups={groups} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <ShortcutSheet groups={SHORTCUT_GROUPS} />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------- input file */

const FILE_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const FILE_VARIANTS = ['default', 'secondary', 'ghost'] as const

/**
 * A stand-in for a real endpoint, so the docs demo the actual state machine.
 *
 * Ticks progress on a timer and honours the abort signal, which is the part
 * worth showing: removing a row mid-flight has to stop the request, not just
 * hide it.
 */
function fakeUpload(shouldFail: boolean) {
  return (upload: FileUpload, { signal, onProgress }: UploadControl) =>
    new Promise((resolve, reject) => {
      let sent = 0

      const tick = setInterval(() => {
        sent += 0.12
        if (sent >= 1) {
          clearInterval(tick)
          if (shouldFail) reject(new Error('Storage rejected the file (507)'))
          else resolve({ url: `https://cdn.example.com/${upload.name}` })
          return
        }
        onProgress(sent)
      }, 220)

      signal.addEventListener('abort', () => {
        clearInterval(tick)
        reject(new Error('Aborted'))
      })
    })
}

export const inputFileEntry: ComponentEntry = {
  id: 'input-file',
  label: 'Input File',
  isNew: true,
  description:
    'A file picker shaped like an Input that also runs the upload. Hand it onUpload and it moves each file through queued, uploading, done or error, reports progress, and keeps failures on screen with a retry.',
  usage: `import { InputFile, type FileUpload } from '@/components/ui/input-file'

<InputFile
  multiple
  accept="image/*"
  maxSize={5_000_000}
  onUpload={async (upload, { signal, onProgress }) => {
    const body = new FormData()
    body.append('file', upload.file)

    const response = await fetch('/api/upload', { method: 'POST', body, signal })
    if (!response.ok) throw new Error(await response.text())

    onProgress(1)
    return response.json()
  }}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: FILE_SIZES, default: 'md' },
      { type: 'select', prop: 'variant', label: 'variant', options: FILE_VARIANTS, default: 'default' },
      { type: 'boolean', prop: 'multiple', label: 'multiple', default: true },
      { type: 'boolean', prop: 'showList', label: 'showList', default: true },
      { type: 'boolean', prop: 'fails', label: 'upload fails', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <InputFile
          size={String(state.size) as (typeof FILE_SIZES)[number]}
          variant={String(state.variant) as (typeof FILE_VARIANTS)[number]}
          multiple={Boolean(state.multiple)}
          showList={Boolean(state.showList)}
          onUpload={fakeUpload(Boolean(state.fails))}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<InputFile\n  size="${state.size}"\n  variant="${state.variant}"\n  multiple={${Boolean(state.multiple)}}\n  showList={${Boolean(state.showList)}}\n  onUpload={async (upload, { signal, onProgress }) => {\n    // upload.file, upload.name, upload.size, upload.type\n    await putToApi(upload.file, { signal, onProgress })\n  }}\n/>`,
  },
  api: [
    { name: 'onUpload', type: '(upload: FileUpload, control: UploadControl) => Promise<unknown>', description: 'Runs the upload. Resolve to succeed — the value lands on upload.result; throw to fail, and the thrown message shows on the row with a retry.' },
    { name: 'FileUpload', type: '{ id, file, name, size, type, lastModified, status, progress, result?, error? }', description: 'The structured payload handed to onUpload. `file` is the browser File — put it straight in a FormData.' },
    { name: 'UploadControl', type: '{ signal: AbortSignal; onProgress: (fraction: number) => void }', description: 'Pass the signal to fetch so removing a file aborts its request; call onProgress with 0–1 to drive the bar.' },
    { name: 'onSelect / onUploadsChange', type: '(uploads: FileUpload[]) => void', description: 'Selection before any upload starts, and every transition after — for a form that needs the ids.' },
    { name: 'maxSize / maxSizeLabel', type: 'number / (limit: string) => string', description: 'Rejected before the request is made, so an oversized file never leaves the browser.' },
    { name: 'size / variant', type: "'xs'…'xl' / 'default' | 'secondary' | 'ghost'", description: 'The same field scales as Input, so the two line up in a form. The trigger is capped at sm, since the xs control is a true pill and reads wrong inside a field.' },
    { name: 'showList', type: 'boolean', default: 'true', description: 'Renders UploadList underneath, with per-file progress, retry and remove.' },
    { name: 'accessibility', type: 'aria-labelledby', description: 'The hidden native input stays the focusable control and is named by the visible summary; the ring is drawn on the wrapper with focus-within.' },
  ],
  demos: [
    {
      title: 'Uploading, with progress and a failure',
      stack: true,
      code: `<InputFile multiple onUpload={upload} />`,
      render: () => (
        <div className="flex w-full max-w-md flex-col gap-3">
          <InputFile multiple onUpload={fakeUpload(false)} />
        </div>
      ),
    },
    {
      title: 'Sizes',
      stack: true,
      code: `<InputFile size="sm" />
<InputFile multiple buttonLabel="Choose files" />
<InputFile variant="secondary" size="lg" />`,
      render: () => (
        <div className="flex w-full max-w-md flex-col gap-3">
          <InputFile size="sm" showList={false} />
          <InputFile multiple buttonLabel="Choose files" showList={false} />
          <InputFile variant="secondary" size="lg" showList={false} />
        </div>
      ),
    },
  ],
}
