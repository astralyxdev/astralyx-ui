import { ChangelogEntry } from '@/components/ui/changelog-entry'
import { JwtInspector } from '@/components/ui/jwt-inspector'
import { MergeConflict, type ConflictHunk } from '@/components/ui/merge-conflict'
import { RegexTester } from '@/components/ui/regex-tester'
import { SymbolOutline, type CodeSymbol } from '@/components/ui/symbol-outline'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')

/* --------------------------------------------------------------- regex tester */

export const regexTesterEntry: ComponentEntry = {
  id: 'regex-tester',
  label: 'Regex Tester',
  description:
    'A pattern against a test string, with matches highlighted and capture groups listed. Zero-length matches are guarded — `/a*/g` matches empty at every position and hangs a naive exec loop.',
  usage: `import { RegexTester } from '@/components/ui/regex-tester'

<RegexTester pattern={pattern} onPatternChange={setPattern} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'pattern', label: 'pattern', default: '(?<user>\\w+)@(\\w+)\\.com' },
      { type: 'text', prop: 'flags', label: 'flags', default: 'g' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <RegexTester
          pattern={String(state.pattern)}
          flags={String(state.flags)}
          input={'ada@example.com, marc@northwind.com\nnot-an-email\ndevon@example.com'}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<RegexTester pattern={'${state.pattern}'} flags="${state.flags}" />`,
  },
  api: [
    { name: 'pattern / flags / input', type: 'string', description: 'All three are controlled or uncontrolled independently, so you can pin the pattern and let the test string be edited.' },
    { name: 'errors', type: 'shown, not thrown', description: 'An unfinished pattern is the normal state while typing, so a syntax error is a hint — the previous match set is not discarded.' },
    { name: 'groups', type: 'listed per match', description: 'Numbered and named. A pattern that matches but captures the wrong thing is the failure people actually hit, and a highlight cannot show it.' },
    { name: 'zero-length', type: 'guarded', description: 'lastIndex is advanced manually — the bug in most hand-rolled regex testers.' },
  ],
}

/* -------------------------------------------------------------- jwt inspector */

const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ1c3JfODgxMiIsIm5hbWUiOiJBZGEgT2thZm9yIiwicm9sZXMiOlsiYWRtaW4iXSwiaWF0IjoxNzg3MjkzNjAwLCJleHAiOjE3ODczODAwMDB9' +
  '.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk'

const NONE_TOKEN =
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0' +
  '.eyJzdWIiOiJ1c3JfMSIsInJvbGVzIjpbImFkbWluIl0sImV4cCI6MTc4NzM4MDAwMH0' +
  '.'

export const jwtInspectorEntry: ComponentEntry = {
  id: 'jwt-inspector',
  label: 'JWT Inspector',
  description:
    'Decodes a token into header, payload and signature. Decoding is not verification and the component says so — a green tick without the signing key would be actively dangerous.',
  usage: `import { JwtInspector } from '@/components/ui/jwt-inspector'

<JwtInspector token={token} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'sample', label: 'token', options: ['valid', 'alg: none', 'malformed'], default: 'valid' },
      { type: 'boolean', prop: 'reveal', label: 'reveal signature', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <JwtInspector
          now={NOW}
          revealSignature={Boolean(state.reveal)}
          token={
            state.sample === 'alg: none' ? NONE_TOKEN : state.sample === 'malformed' ? 'abc.def' : TOKEN
          }
        />
      </div>
    ),
    code: () => `<JwtInspector token={token} />`,
  },
  api: [
    { name: 'token', type: 'string', description: 'Three base64url segments. A malformed token is reported, not half-rendered.' },
    { name: 'exp / nbf / iat', type: 'resolved', description: 'Shown as real times. A bare epoch integer is the most misread field in a token — off-by-1000 between seconds and milliseconds costs an afternoon.' },
    { name: 'alg: none', type: 'flagged loudly', description: 'The classic JWT vulnerability, and it looks like an ordinary field in a JSON dump.' },
    { name: 'signature', type: 'masked by default', description: 'This gets screenshotted into tickets, and a token with its signature is a live credential.' },
  ],
}

/* ------------------------------------------------------------- merge conflict */

const HUNKS: ConflictHunk[] = [
  {
    id: 'h1',
    context: "import { cn } from '@/lib/utils'",
    ours: "import { Badge } from '@/components/ui/badge'",
    theirs: "import { Button } from '@/components/ui/button'",
    base: '',
  },
  {
    id: 'h2',
    ours: "  const label = status === 'active' ? 'Live' : 'Paused'",
    theirs: "  const label = STATUS[status].label",
    base: "  const label = status",
  },
]

export const mergeConflictEntry: ComponentEntry = {
  id: 'merge-conflict',
  label: 'Merge Conflict',
  description:
    'Both sides of a conflict with a resolution per hunk. "Keep both" is offered because it is frequently right — two people adding a different import conflict textually and agree semantically.',
  usage: `import { MergeConflict } from '@/components/ui/merge-conflict'

<MergeConflict path={path} hunks={hunks} onResolve={resolve} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'base', label: 'show base (diff3)', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <MergeConflict
          path="src/components/ui/status-badge.tsx"
          hunks={state.base ? HUNKS : HUNKS.map(({ base: _base, ...rest }) => rest)}
        />
      </div>
    ),
    code: () => `<MergeConflict path={path} hunks={hunks} onResolve={resolve} />`,
  },
  api: [
    { name: 'hunks', type: 'ConflictHunk[]', description: '`{ id, ours, theirs, base?, context? }`.' },
    { name: 'layout', type: 'stacked', description: 'Not side by side. Conflict hunks are rarely the same height, so columns desynchronise and you compare line 4 against line 9.' },
    { name: 'resolutions', type: "'ours' | 'theirs' | 'both'", description: 'Controlled or uncontrolled. Nothing resolves itself — a conflict UI that quietly defaults to one side is how code disappears in a merge.' },
    { name: 'unresolved count', type: 'in the header', description: 'It does not go down until a choice is made.' },
  ],
}

/* ------------------------------------------------------------- symbol outline */

const SYMBOLS: CodeSymbol[] = [
  { id: 's1', name: 'CoverageFile', kind: 'type', line: 26, exported: true },
  { id: 's2', name: 'tone', kind: 'function', line: 34 },
  {
    id: 's3', name: 'CoverageReport', kind: 'function', line: 41, exported: true,
    children: [
      { id: 's4', name: 'open', kind: 'variable', line: 62 },
      { id: 's5', name: 'rows', kind: 'constant', line: 66 },
      { id: 's6', name: 'totals', kind: 'constant', line: 74 },
      { id: 's7', name: 'pct', kind: 'function', line: 86 },
    ],
  },
  {
    id: 's8', name: 'ReportRow', kind: 'interface', line: 120, exported: true,
    children: [
      { id: 's9', name: 'path', kind: 'property', line: 121 },
      { id: 's10', name: 'value', kind: 'property', line: 122 },
    ],
  },
]

export const symbolOutlineEntry: ComponentEntry = {
  id: 'symbol-outline',
  label: 'Symbol Outline',
  description:
    "A file's symbols as a tree, in file order rather than alphabetical. An outline is a map of the document you are reading; re-sorting it makes the outline and the editor disagree about where things are.",
  usage: `import { SymbolOutline } from '@/components/ui/symbol-outline'

<SymbolOutline symbols={symbols} onSelect={goTo} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'searchable', label: 'searchable', default: true },
      { type: 'boolean', prop: 'selectable', label: 'selectable', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <SymbolOutline
          symbols={SYMBOLS}
          searchable={Boolean(state.searchable)}
          selected={state.selectable ? 's3' : undefined}
          onSelect={state.selectable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<SymbolOutline symbols={symbols} onSelect={goTo} />`,
  },
  api: [
    { name: 'symbols', type: 'CodeSymbol[]', description: '`{ id, name, kind, line?, exported?, children? }`.' },
    { name: 'filtering', type: 'keeps ancestors', description: 'Flattening to matched leaves loses the class a method belongs to, and `render` alone is useless when six components define one.' },
    { name: 'exported', type: 'boolean', description: 'Draws a dot. "Is this part of the public surface" is what an outline gets used for, and the name cannot answer it.' },
    { name: 'order', type: 'file order', description: 'Never alphabetical.' },
  ],
}

/* ------------------------------------------------------------ changelog entry */

export const changelogEntryEntry: ComponentEntry = {
  id: 'changelog-entry',
  label: 'Changelog Entry',
  description:
    'A release grouped by change type, with breaking changes hoisted to the top whatever order they came in. Everything else in a changelog is optional reading; a breaking change is not.',
  usage: `import { ChangelogEntry } from '@/components/ui/changelog-entry'

<ChangelogEntry version="2.4.0" date={date} changes={changes} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'version', label: 'version', default: 'v2.4.0' },
      { type: 'boolean', prop: 'breaking', label: 'breaking changes', default: true },
      { type: 'boolean', prop: 'prerelease', label: 'pre-release', default: false },
      { type: 'boolean', prop: 'yanked', label: 'yanked', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <ChangelogEntry
          version={String(state.version)}
          date={NOW}
          prerelease={Boolean(state.prerelease)}
          yanked={Boolean(state.yanked)}
          summary="Class merging moves to the compiled engine."
          changes={{
            ...(state.breaking
              ? { breaking: ['`cn` no longer re-exports `clsx`. Import it from the package directly.'] }
              : {}),
            security: ['Webhook signatures are now checked before the handler runs.'],
            added: ['`RequestBuilder`, `ResponseViewer` and `EndpointList`.', '30 developer-tooling components.'],
            changed: ['Header and footer bands use uniform padding.'],
            fixed: ['`Leaderboard` no longer remounts every row on each render.'],
            deprecated: ['`twMerge` re-export — use `cn`.'],
          }}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<ChangelogEntry version="${state.version}" date={date} changes={changes} />`,
  },
  api: [
    { name: 'changes', type: 'Partial<Record<ChangeGroup, ReactNode[]>>', description: "Groups: breaking, security, added, changed, fixed, deprecated, removed." },
    { name: 'group order', type: 'fixed', description: 'Rendered in a fixed sequence rather than object key order, so two releases are visually comparable.' },
    { name: 'version', type: 'the heading', description: 'People navigate a changelog by version; a date-led entry forces a translation step every time.' },
    { name: 'yanked', type: 'boolean', description: 'Dims the entry and states plainly that it was withdrawn.' },
  ],
}
