import { useState } from 'react'
import { KnowledgeGraph, type Entity, type Relation } from '@/components/ui/knowledge-graph'
import { Markdown } from '@/components/ui/markdown'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { NoteGraph, type Note } from '@/components/ui/note-graph'
import type { ForceLink } from '@/lib/use-force-graph'
import type { ComponentEntry } from './types'

/* ------------------------------------------------------------ note graph */

const NOTES: Note[] = [
  { id: 'moc', title: 'Agents MOC', group: 'Maps' },
  { id: 'mcp', title: 'MCP', group: 'Protocols' },
  { id: 'tools', title: 'Tool calling', group: 'Protocols' },
  { id: 'sampling', title: 'Sampling', group: 'Protocols' },
  { id: 'evals', title: 'Evals', group: 'Practice' },
  { id: 'prompts', title: 'Prompt design', group: 'Practice' },
  { id: 'fewshot', title: 'Few-shot', group: 'Practice' },
  { id: 'context', title: 'Context windows', group: 'Practice' },
  { id: 'rag', title: 'Retrieval', group: 'Practice' },
  { id: 'chunking', title: 'Chunking', group: 'Practice' },
  { id: 'guardrails', title: 'Guardrails', group: 'Safety' },
  { id: 'sandbox', title: 'Sandboxing', group: 'Safety' },
  { id: 'approval', title: 'Human approval', group: 'Safety' },
  { id: 'cost', title: 'Token cost', group: 'Ops' },
  { id: 'latency', title: 'Latency budget', group: 'Ops' },
  { id: 'inbox', title: 'Inbox — read later', group: 'Maps' },
  { id: 'weekend', title: 'Weekend scratch', group: 'Maps' },
]

const NOTE_LINKS: ForceLink[] = [
  { source: 'moc', target: 'mcp' }, { source: 'moc', target: 'evals' },
  { source: 'moc', target: 'guardrails' }, { source: 'moc', target: 'prompts' },
  { source: 'moc', target: 'cost' }, { source: 'mcp', target: 'tools' },
  { source: 'mcp', target: 'sampling' }, { source: 'mcp', target: 'approval' },
  { source: 'tools', target: 'approval' }, { source: 'tools', target: 'guardrails' },
  { source: 'prompts', target: 'fewshot' }, { source: 'prompts', target: 'context' },
  { source: 'prompts', target: 'evals' }, { source: 'rag', target: 'chunking' },
  { source: 'rag', target: 'context' }, { source: 'rag', target: 'prompts' },
  { source: 'guardrails', target: 'sandbox' }, { source: 'guardrails', target: 'approval' },
  { source: 'cost', target: 'context' }, { source: 'cost', target: 'latency' },
  { source: 'evals', target: 'fewshot' },
]

function NoteGraphDemo({ showAllLabels = false }: { showAllLabels?: boolean }) {
  const [picked, setPicked] = useState<string | undefined>('moc')
  return (
    <NoteGraph
      className="w-full"
      notes={NOTES}
      links={NOTE_LINKS}
      selectedId={picked}
      onSelect={(note) => setPicked(note.id)}
      showAllLabels={showAllLabels}
    />
  )
}

export const noteGraphEntry: ComponentEntry = {
  id: 'note-graph',
  label: 'Note Graph',
  isNew: true,
  description:
    'A vault of linked notes laid out by force — the Obsidian-shaped view. Nodes are sized by how many links touch them, hovering dims everything outside the neighbourhood, and orphans are drawn hollow rather than hidden.',
  usage: `import { NoteGraph } from '@/components/ui/note-graph'

<NoteGraph notes={notes} links={links} onSelect={(note) => open(note.id)} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'showAllLabels', label: 'showAllLabels', default: false }],
    render: (state) => <NoteGraphDemo showAllLabels={Boolean(state.showAllLabels)} />,
    code: (state) => `<NoteGraph\n  notes={notes}\n  links={links}\n  showAllLabels={${Boolean(state.showAllLabels)}}\n  onSelect={(note) => open(note.id)}\n/>`,
  },
  api: [
    { name: 'notes / links', type: 'Note[] / ForceLink[]', description: '{ id, title, group?, size? } and { source, target }.' },
    { name: 'size', type: 'degree', description: 'Derived from link count, damped by a square root. Sizing by word count or edit date draws your typing habits instead of your structure.' },
    { name: 'orphans', type: 'drawn hollow', description: 'A note nothing links to is the most actionable thing the view can surface — either miscategorised or forgotten — so hiding it to tidy the picture removes the point.' },
    { name: 'hover', type: 'dims the rest', description: 'At a few hundred nodes the hairball is unreadable at rest. Focus makes it legible for the cost of one class.' },
    { name: 'labelFrom / showAllLabels', type: 'number / boolean', description: 'Titles are drawn for hubs and for whatever you are hovering, unless you ask for all of them.' },
    { name: 'layout', type: 'settles and stops', description: 'From `useForceGraph`. Deterministic seeding, so a reload is the same picture and a server render matches its hydration. Dragging pins a note.' },
  ],
  demos: [
    { title: 'A vault, with two orphans', stack: true, code: `<NoteGraph notes={notes} links={links} />`, render: () => <NoteGraphDemo /> },
  ],
}

/* ------------------------------------------------------- knowledge graph */

const ENTITIES: Entity[] = [
  { id: 'ada', label: 'Ada Lovelace', type: 'person' },
  { id: 'astralyx', label: 'Astralyx', type: 'company' },
  { id: 'kit', label: 'astralyx-ui', type: 'product' },
  { id: 'react', label: 'React 19', type: 'technology' },
  { id: 'tailwind', label: 'Tailwind v4', type: 'technology' },
  { id: 'mcp', label: 'MCP', type: 'standard' },
  { id: 'marc', label: 'Marc Laurent', type: 'person' },
]

const RELATIONS: Relation[] = [
  { source: 'ada', target: 'astralyx', label: 'founded' },
  { source: 'marc', target: 'astralyx', label: 'works at' },
  { source: 'astralyx', target: 'kit', label: 'publishes' },
  { source: 'kit', target: 'react', label: 'built on' },
  { source: 'kit', target: 'tailwind', label: 'built on' },
  { source: 'kit', target: 'mcp', label: 'has components for' },
  { source: 'ada', target: 'kit', label: 'maintains' },
]

export const knowledgeGraphEntry: ComponentEntry = {
  id: 'knowledge-graph',
  label: 'Knowledge Graph',
  isNew: true,
  description:
    'Entities and the named relations between them. Where a note graph answers what is connected, this answers how — and the edge label carries as much meaning as the nodes, so relations are labelled and directed.',
  usage: `import { KnowledgeGraph } from '@/components/ui/knowledge-graph'

<KnowledgeGraph entities={entities} relations={relations} onSelect={open} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'labels', label: 'relation labels', default: true },
      { type: 'number', prop: 'height', label: 'height', default: 460, min: 320, max: 640, step: 20 },
    ],
    render: (state) => (
      <KnowledgeGraph
        className="w-full"
        entities={ENTITIES}
        relations={RELATIONS}
        showRelationLabels={Boolean(state.labels)}
        height={Number(state.height)}
        onSelect={() => {}}
      />
    ),
    code: (state) => `<KnowledgeGraph\n  entities={entities}\n  relations={relations}\n  showRelationLabels={${Boolean(state.labels)}}\n  height={${Number(state.height)}}\n/>`,
  },
  api: [
    { name: 'entities / relations', type: 'Entity[] / Relation[]', description: '{ id, label, type? } and { source, target, label? }. The relation label is the reason this exists.' },
    { name: 'direction', type: 'arrowheads', description: '`employs` and `employed by` are not the same fact. A knowledge graph that loses direction is a set of vague associations.' },
    { name: 'entities as pills', type: 'not circles', description: 'These graphs are read entity-first — you are looking for a name, not a hub — and a circle with a caption underneath makes you match shapes to text.' },
    { name: 'showRelationLabels', type: 'boolean', default: 'true', description: 'Off once the graph is dense enough that the labels collide.' },
    { name: 'type', type: 'string', description: 'Colours the pill and builds the legend. Any vocabulary you like.' },
  ],
  demos: [
    { title: 'People, products and standards', stack: true, code: `<KnowledgeGraph entities={entities} relations={relations} />`,
      render: () => <KnowledgeGraph className="w-full" entities={ENTITIES} relations={RELATIONS} /> },
  ],
}

/* ---------------------------------------------------------------- markdown */

const DOC = `# Release notes

Astralyx UI **0.4.0** adds thirty components — *charts*, *views* and *analytics*.

## What changed

- A \`QrCode\` that encodes in the page — no dependency, nothing sent anywhere
- Sankey, treemap, radar, scatter and box plots
- Gantt, scheduler and org chart

> A backup nobody has restored is a hypothesis.

| Area | Components |
| --- | --- |
| Charts | 5 |
| Analytics | 5 |
| Views | 3 |

\`\`\`tsx
<Markdown>{notes}</Markdown>
\`\`\`

---

Read the [full changelog](/docs/introduction), or ~~skip it~~ install with:
\`npm i -D astralyx-ui\`.
`

export const markdownEntry: ComponentEntry = {
  id: 'markdown',
  label: 'Markdown',
  isNew: true,
  description:
    'Rendered markdown with a switch to the source. It builds React nodes and never sets innerHTML, so a document you did not write cannot execute — and the RAW toggle is there because rendered output hides exactly what you look at when it renders wrongly.',
  usage: `import { Markdown } from '@/components/ui/markdown'
import { MarkdownEditor } from '@/components/ui/markdown-editor'

<Markdown>{notes}</Markdown>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'defaultRaw', label: 'start on RAW', default: false },
      { type: 'boolean', prop: 'toggle', label: 'show toggle', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <Markdown defaultRaw={Boolean(state.defaultRaw)} toggle={Boolean(state.toggle)}>
          {DOC}
        </Markdown>
      </div>
    ),
    code: (state) => `<Markdown defaultRaw={${Boolean(state.defaultRaw)}} toggle={${Boolean(state.toggle)}}>\n  {notes}\n</Markdown>`,
  },
  api: [
    { name: 'children', type: 'string', description: 'The markdown source.' },
    { name: 'no innerHTML', type: 'by construction', description: 'Every small renderer converts to an HTML string and injects it, which turns any document you did not write into script execution. Building elements means there is no string for a payload to survive in.' },
    { name: 'link safety', type: 'scheme allow-list', description: 'Only http(s), mailto and relative URLs become links; anything else — `javascript:` above all — renders as plain text.' },
    { name: 'toggle / defaultRaw', type: 'boolean', description: 'Rendered markdown hides hard versus soft breaks, `*` versus `_`, a real table versus an aligned one. Source is one click away and copyable.' },
    { name: 'supported', type: 'the practical subset', description: 'ATX headings, bold, italic, strikethrough, inline code, links, images, fenced code, lists, blockquotes, rules and tables. Setext headings, reference links and footnotes are not — a full CommonMark implementation is a library, not a component.' },
  ],
  demos: [
    { title: 'A release note', stack: true, code: `<Markdown>{notes}</Markdown>`,
      render: () => (<div className="w-full max-w-2xl"><Markdown>{DOC}</Markdown></div>) },
    { title: 'Opened on the source', stack: true, code: `<Markdown defaultRaw>{notes}</Markdown>`,
      render: () => (<div className="w-full max-w-2xl"><Markdown defaultRaw>{DOC}</Markdown></div>) },
  ],
}

/* --------------------------------------------------------- markdown editor */

function MarkdownEditorDemo({ defaultMode = 'split' }: { defaultMode?: 'write' | 'preview' | 'split' }) {
  const [text, setText] = useState(`## Pull request

Adds a **QR encoder** so \`TwoFactorSetup\` can fill its own \`qr\` slot.

- Byte mode, versions 1-10
- All eight masks scored, per the spec
- Verified against an independent decoder

> Nothing leaves the page.
`)
  return (
    <MarkdownEditor
      className="w-full"
      key={defaultMode}
      value={text}
      onChange={setText}
      defaultMode={defaultMode}
      rows={10}
    />
  )
}

export const markdownEditorEntry: ComponentEntry = {
  id: 'markdown-editor',
  label: 'Markdown Editor',
  isNew: true,
  description:
    'A real textarea, a toolbar that edits the selection through setRangeText — so the browser undo stack survives — and the Markdown component as its preview.',
  usage: `import { MarkdownEditor } from '@/components/ui/markdown-editor'

<MarkdownEditor value={text} onChange={setText} defaultMode="split" />`,
  composer: {
    tall: true,
    controls: [
      {
        type: 'select',
        prop: 'defaultMode',
        label: 'defaultMode',
        default: 'split',
        options: ['write', 'preview', 'split'],
      },
    ],
    render: (state) => (
      <MarkdownEditorDemo defaultMode={state.defaultMode as 'write' | 'preview' | 'split'} />
    ),
    code: (state) =>
      `<MarkdownEditor\n  value={text}\n  onChange={setText}\n  defaultMode="${state.defaultMode}"\n/>`,
  },
  api: [
    { name: 'value / onChange', type: 'string', description: 'The markdown source. Controlled or uncontrolled.' },
    { name: 'a plain textarea', type: 'not contenteditable', description: 'Rich editors reimplement undo, IME composition, spellcheck, autocorrect, mobile keyboards and every accessibility affordance a textarea gets free — and get the undo stack wrong first.' },
    { name: 'setRangeText', type: 'keeps undo', description: 'The toolbar edits through the element, so ctrl-Z after clicking Bold does what you expect. Rewriting `value` from React state does not.' },
    { name: 'preview', type: 'the same renderer', description: 'An editor whose preview differs from the reader’s view teaches a formatting model your readers will not see — including where [[markdown]] stops.' },
    { name: 'wrapping', type: 'selection-aware', description: 'With text selected the markers go around it; with nothing selected the caret lands between them; applying the same marker again unwraps it.' },
    { name: 'shortcuts', type: 'B / I / K', description: 'Tab is deliberately left alone — trapping it breaks keyboard navigation out of the field.' },
  ],
  demos: [
    {
      title: 'Write and preview together',
      stack: true,
      code: `<MarkdownEditor value={text} onChange={setText} defaultMode="split" />`,
      render: () => <MarkdownEditorDemo />,
    },
  ],
}
