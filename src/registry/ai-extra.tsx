import { AgentSteps, type AgentStep } from '@/components/ui/agent-steps'
import { CitationMark, Citations, type Citation } from '@/components/ui/citations'
import { ConfidenceMeter } from '@/components/ui/confidence-meter'
import { DiffProposal } from '@/components/ui/diff-proposal'
import { Feedback } from '@/components/ui/feedback'
import { ModelComparison, type ModelOutput } from '@/components/ui/model-comparison'
import { ReasoningBlock } from '@/components/ui/reasoning-block'
import { StreamingText } from '@/components/ui/streaming-text'
import { Terminal } from '@/components/ui/terminal'
import { parseUnifiedDiff, type DiffFile } from '@/components/ui/diff-view'
import type { ComponentEntry, ComposerState } from './types'

const ANSWER =
  'Tailwind v4 moves configuration into CSS. Define your tokens in an @theme block and the utilities are generated from them, so a design token and the class that uses it stay in one file.'

/* ---------------------------------------------------------- streaming text */

export const streamingTextEntry: ComponentEntry = {
  id: 'streaming-text',
  label: 'Streaming Text',
  description:
    'Text revealed as it arrives, with a caret while it is still coming. Driven by elapsed time rather than a per-character interval, so it never drifts or dumps a backlog after a background tab.',
  usage: `import { StreamingText } from '@/components/ui/streaming-text'

<StreamingText text={answer} speed={240} onDone={scrollToBottom} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'speed', label: 'speed (chars/s)', options: ['60', '120', '240', '600'], default: '240' },
      { type: 'boolean', prop: 'streaming', label: 'streaming', default: true },
      { type: 'boolean', prop: 'caret', label: 'caret', default: true },
    ],
    render: (state) => (
      <p className="max-w-lg text-sm">
        <StreamingText
          key={`${state.speed}-${state.streaming}`}
          text={ANSWER}
          speed={Number(state.speed)}
          streaming={Boolean(state.streaming)}
          caret={Boolean(state.caret)}
        />
      </p>
    ),
    code: (s: ComposerState) =>
      `<StreamingText\n  text={answer}\n  speed={${s.speed}}\n  streaming={${Boolean(s.streaming)}}\n  caret={${Boolean(s.caret)}}\n/>`,
  },
  api: [
    { name: 'text', type: 'string', description: 'The full string. Restarting the reveal is a matter of changing the `key`.' },
    { name: 'speed', type: 'number', default: '240', description: 'Characters per second, measured against the clock rather than accumulated per frame.' },
    { name: 'streaming', type: 'boolean', default: 'true', description: 'False renders the whole string at once — for replaying a finished message.' },
    { name: 'onDone', type: '() => void', description: 'Fires once when the reveal completes. Deliberately not a dependency of the animation, so an inline arrow cannot restart it.' },
    { name: 'reduced motion', type: 'automatic', description: 'Appears complete immediately under prefers-reduced-motion — the animation carries no information the text does not.' },
    { name: 'accessibility', type: 'aria-live', description: 'A polite live region with aria-busy, so a screen reader hears the answer arrive instead of sitting in silence.' },
  ],
  demos: [
    {
      title: 'Streaming and complete',
      stack: true,
      code: `<StreamingText text={answer} />
<StreamingText text={answer} streaming={false} />`,
      render: () => (
        <div className="flex max-w-lg flex-col gap-4 text-sm">
          <StreamingText text={ANSWER} />
          <StreamingText text={ANSWER} streaming={false} />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------- reasoning block */

export const reasoningBlockEntry: ComponentEntry = {
  id: 'reasoning-block',
  label: 'Reasoning Block',
  description:
    "A model's intermediate reasoning, folded away by default — it is supporting evidence, not the answer, and a panel that opens itself pushes the answer below the fold.",
  usage: `import { ReasoningBlock } from '@/components/ui/reasoning-block'

<ReasoningBlock duration={4.2}>
  The question asks about v4 specifically…
</ReasoningBlock>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'streaming', label: 'streaming', default: false },
      { type: 'boolean', prop: 'defaultOpen', label: 'defaultOpen', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-lg">
        <ReasoningBlock
          key={String(state.streaming)}
          streaming={Boolean(state.streaming)}
          defaultOpen={Boolean(state.defaultOpen)}
          duration={4.2}
        >
          The question is about v4 specifically, so the v3 JavaScript config is
          not relevant. The change that matters is @theme, which replaces
          tailwind.config.js for token definitions.
        </ReasoningBlock>
      </div>
    ),
    code: (s: ComposerState) =>
      `<ReasoningBlock streaming={${Boolean(s.streaming)}} duration={4.2}>\n  …\n</ReasoningBlock>`,
  },
  api: [
    { name: 'streaming', type: 'boolean', default: 'false', description: 'Opens itself and shows a spinner while thinking is the only thing happening. A prop rather than something inferred from children, since that transition is the whole interaction.' },
    { name: 'duration', type: 'number', description: 'Seconds spent thinking, shown once finished.' },
    { name: 'defaultOpen', type: 'boolean', description: 'Defaults to whatever `streaming` is.' },
    { name: 'label', type: 'ReactNode', default: "'Reasoning'", description: 'Header text once finished.' },
  ],
  demos: [
    {
      title: 'Finished and thinking',
      stack: true,
      code: `<ReasoningBlock duration={4.2}>…</ReasoningBlock>
<ReasoningBlock streaming>…</ReasoningBlock>`,
      render: () => (
        <div className="flex w-full max-w-lg flex-col gap-3">
          <ReasoningBlock duration={4.2}>
            The question is about v4 specifically, so the v3 config is not relevant.
          </ReasoningBlock>
          <ReasoningBlock streaming>
            Checking whether @theme replaces the JavaScript config entirely…
          </ReasoningBlock>
        </div>
      ),
    },
  ],
}

/* ---------------------------------------------------------------- citations */

const CITATIONS: Citation[] = [
  { id: 'tw', title: 'Tailwind CSS v4 release notes', source: 'tailwindcss.com', url: '#', snippet: 'Configuration now lives in CSS via the @theme directive.' },
  { id: 'mdn', title: 'CSS custom properties', source: 'MDN', url: '#', snippet: 'Custom properties are scoped to the element they are declared on and inherit.' },
  { id: 'spec', title: 'CSS Cascade Layers', source: 'W3C', url: '#' },
]

export const citationsEntry: ComponentEntry = {
  id: 'citations',
  label: 'Citations',
  description:
    'Numbered sources for a generated answer. A marker is a real anchor with an accessible name, because a bare superscript "3" is meaningless read aloud — exactly when checking a claim matters most.',
  usage: `import { Citations, CitationMark } from '@/components/ui/citations'

<p>Configuration moved into CSS<CitationMark citation={sources[0]} index={1} />.</p>
<Citations citations={sources} />`,
  composer: {
    tall: true,
    controls: [{ type: 'text', prop: 'label', label: 'label', default: 'Sources' }],
    render: (state) => (
      <div className="flex w-full max-w-lg flex-col gap-4">
        <p className="text-sm">
          Tailwind v4 moves configuration into CSS
          <CitationMark citation={CITATIONS[0]} index={1} scope="composer" />,
          using custom properties that inherit through the tree
          <CitationMark citation={CITATIONS[1]} index={2} scope="composer" />.
        </p>
        <Citations citations={CITATIONS} label={String(state.label)} scope="composer" />
      </div>
    ),
    code: () => `<p>\n  Configuration moved into CSS<CitationMark citation={sources[0]} index={1} />.\n</p>\n<Citations citations={sources} />`,
  },
  api: [
    { name: 'citations', type: 'Citation[]', description: '`{ id, title, url?, snippet?, source? }`.' },
    { name: 'CitationMark', type: 'component', description: 'The inline marker. `index` is 1-based to match the list, and the accessible name is "Source 3: <title>".' },
    { name: 'snippet', type: 'ReactNode', description: 'Shown in a hover preview. Everything it contains also appears in the list, since hover is not available to every reader.' },
    { name: 'anchoring', type: 'automatic', description: 'A citation without a URL links to its list entry by id, so the marker always goes somewhere.' },
    { name: 'scope', type: 'string', default: "'citation'", description: 'Namespaces the anchor ids. Two answers on one page each need their own, or both mint the same ids and the markers jump to the wrong list.' },
  ],
  demos: [
    {
      title: 'Answer with sources',
      stack: true,
      code: `<Citations citations={sources} />`,
      render: () => (
        <div className="flex w-full max-w-lg flex-col gap-4">
          <p className="text-sm">
            Tailwind v4 moves configuration into CSS
            <CitationMark citation={CITATIONS[0]} index={1} scope="demo" />.
          </p>
          <Citations citations={CITATIONS} scope="demo" />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------- agent steps */

const AGENT_STEPS: AgentStep[] = [
  { id: '1', label: 'Read the failing test', status: 'done', duration: 2 },
  { id: '2', label: 'Locate controlSize in styles.ts', status: 'done', duration: 4 },
  {
    id: '3',
    label: 'Apply the radius fix',
    status: 'running',
    detail: <Terminal copyable={false} content={'$ sed -i s/rounded-lg/rounded-[var(--radius-control-md)]/ src/lib/styles.ts'} />,
  },
  { id: '4', label: 'Re-run the suite', status: 'pending' },
  { id: '5', label: 'Update the changelog', status: 'pending' },
]

export const agentStepsEntry: ComponentEntry = {
  id: 'agent-steps',
  label: 'Agent Steps',
  description:
    "An agent's plan with each step's state. The whole plan is shown from the start, including steps not yet reached — revealing them one at a time hides how much is left, which is what someone watching most wants to know.",
  usage: `import { AgentSteps } from '@/components/ui/agent-steps'

<AgentSteps steps={steps} title="Fixing the failing test" />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'expanded', label: 'expand running step', default: false }],
    render: (state) => (
      <div className="w-full max-w-lg">
        <AgentSteps
          steps={AGENT_STEPS}
          title="Fixing the failing test"
          defaultExpanded={state.expanded ? ['3'] : []}
        />
      </div>
    ),
    code: () => `<AgentSteps steps={steps} title="Fixing the failing test" />`,
  },
  api: [
    { name: 'steps', type: 'AgentStep[]', description: '`{ id, label, status, duration?, detail? }`.' },
    { name: 'status', type: "'pending' | 'running' | 'done' | 'failed' | 'skipped'", description: 'Running shows a spinner; skipped strikes the label through.' },
    { name: 'detail', type: 'ReactNode', description: 'Expandable body — tool calls, output, an error.' },
    { name: 'relationship to ToolCall', type: 'one level up', description: 'ToolCall shows a single invocation with its arguments and result; this shows the sequence those calls belong to.' },
    { name: 'progress', type: 'aria-live', description: 'The done-of-total counter is a polite live region, so completion is announced without stealing focus.' },
  ],
  demos: [
    { title: 'Plan', stack: true, code: `<AgentSteps steps={steps} />`, render: () => <div className="w-full max-w-lg"><AgentSteps steps={AGENT_STEPS} title="Fixing the failing test" /></div> },
  ],
}

/* ---------------------------------------------------------- diff proposal */

const PROPOSAL: DiffFile = {
  path: 'src/lib/styles.ts',
  hunks: parseUnifiedDiff(`@@ -74,7 +74,7 @@ export const controlSize = {
   sm: 'h-8 gap-1.5 px-3.5 text-sm',
-  md: 'h-9 gap-2 px-4.5 text-sm rounded-lg',
+  md: 'h-9 gap-2 px-4.5 text-sm rounded-[var(--radius-control-md)]',
   lg: 'h-10 gap-2 px-6 text-sm',`),
}

export const diffProposalEntry: ComponentEntry = {
  id: 'diff-proposal',
  label: 'Diff Proposal',
  description:
    'A model-proposed edit with accept and reject. The decision is reported, never applied — and once made, the actions are replaced by the outcome so a stale card cannot be clicked twice.',
  usage: `import { DiffProposal } from '@/components/ui/diff-proposal'

<DiffProposal
  file={file}
  rationale="The md size hard-codes a radius the token already defines."
  onDecide={(decision) => apply(decision)}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'view', label: 'view', options: ['unified', 'split'], default: 'unified' },
    ],
    render: (state) => (
      <div className="w-full">
        <DiffProposal
          file={PROPOSAL}
          title="Use the control radius token"
          rationale="The md size hard-codes rounded-lg, but --radius-control-md already defines this step. Hard-coding it means the size stops following the token."
          view={String(state.view) as 'unified' | 'split'}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<DiffProposal\n  file={file}\n  rationale="…"\n  view="${s.view}"\n  onDecide={apply}\n/>`,
  },
  api: [
    { name: 'file', type: 'DiffFile', description: 'Same shape DiffView takes — use parseUnifiedDiff when you only have patch text.' },
    { name: 'rationale', type: 'ReactNode', description: 'Rendered above the diff. The reason for a change is what you read before deciding; after forty lines of diff nobody reads it.' },
    { name: 'decision / onDecide', type: "'accepted' | 'rejected'", description: 'Controlled or uncontrolled. The component never applies anything — it has no idea what your editor buffer is.' },
    { name: 'view', type: "'unified' | 'split'", default: "'unified'", description: 'Passed through to DiffView.' },
  ],
  demos: [
    {
      title: 'Proposal',
      stack: true,
      code: `<DiffProposal file={file} rationale="…" onDecide={apply} />`,
      render: () => (
        <div className="w-full">
          <DiffProposal file={PROPOSAL} title="Use the control radius token" rationale="The md size hard-codes rounded-lg, but --radius-control-md already defines this step." />
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------------ feedback */

export const feedbackEntry: ComponentEntry = {
  id: 'feedback',
  label: 'Feedback',
  description:
    'Thumbs up or down, with an optional reason. The rating sends on click and the comment is a separate follow-up — holding the rating hostage to a comment box is how feedback widgets collect nothing.',
  usage: `import { Feedback } from '@/components/ui/feedback'

<Feedback
  onRate={send}
  onComment={sendComment}
  reasons={['Incorrect', 'Too vague', 'Ignored context']}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'reasons', label: 'quick reasons', default: true },
      { type: 'boolean', prop: 'comment', label: 'comment box', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <Feedback
          reasons={state.reasons ? ['Incorrect', 'Too vague', 'Ignored context'] : undefined}
          onComment={state.comment ? () => {} : undefined}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<Feedback\n  onRate={send}${s.comment ? '\n  onComment={sendComment}' : ''}${s.reasons ? "\n  reasons={['Incorrect', 'Too vague', 'Ignored context']}" : ''}\n/>`,
  },
  api: [
    { name: 'rating / onRate', type: "'up' | 'down' | null", description: 'Controlled or uncontrolled. Clicking the active thumb clears it, since the most common correction is having hit the wrong one.' },
    { name: 'onComment', type: '(comment, rating) => void', description: 'Adds the comment box. Omit for rating only.' },
    { name: 'reasons', type: 'string[]', description: 'Quick-pick reasons offered after a thumbs down — one tap instead of a paragraph.' },
    { name: 'prompt', type: 'ReactNode', default: "'Was this helpful?'", description: 'Leading text.' },
  ],
  demos: [
    { title: 'Rating', stack: true, code: `<Feedback onRate={send} onComment={sendComment} reasons={reasons} />`, render: () => <div className="w-full max-w-md"><Feedback reasons={['Incorrect', 'Too vague', 'Ignored context']} onComment={() => {}} /></div> },
  ],
}

/* --------------------------------------------------------- confidence meter */

export const confidenceMeterEntry: ComponentEntry = {
  id: 'confidence-meter',
  label: 'Confidence Meter',
  description:
    'How sure a model is, in five steps. Segmented on purpose — a smooth bar invites reading 0.834 as different from 0.851, which is not what a calibration score supports.',
  usage: `import { ConfidenceMeter } from '@/components/ui/confidence-meter'

<ConfidenceMeter value={0.82} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'value', label: 'value', options: ['0.1', '0.35', '0.55', '0.75', '0.95'], default: '0.75' },
      { type: 'boolean', prop: 'showLabel', label: 'showLabel', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <ConfidenceMeter value={Number(state.value)} showLabel={Boolean(state.showLabel)} />
      </div>
    ),
    code: (s: ComposerState) =>
      `<ConfidenceMeter value={${s.value}} showLabel={${Boolean(s.showLabel)}} />`,
  },
  api: [
    { name: 'value', type: 'number', description: '0 to 1. Mapped to one of five bands.' },
    { name: 'label / showLabel', type: 'ReactNode / boolean', description: 'The band name is the accessible value too — a screen reader hears "high", not a percentage implying more precision than exists.' },
    { name: 'size', type: "'sm' | 'default'", default: "'default'", description: 'Segment height.' },
    { name: 'role', type: 'meter', description: 'With aria-valuetext set to the band, since this is a measurement within a range rather than task progress.' },
  ],
  demos: [
    {
      title: 'Bands',
      stack: true,
      code: `<ConfidenceMeter value={0.15} />
<ConfidenceMeter value={0.55} />
<ConfidenceMeter value={0.95} />`,
      render: () => (
        <div className="flex w-full max-w-xs flex-col gap-4">
          <ConfidenceMeter value={0.15} />
          <ConfidenceMeter value={0.55} />
          <ConfidenceMeter value={0.95} />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------- model comparison */

const OUTPUTS: ModelOutput[] = [
  {
    id: 'a',
    model: 'astralyx-large',
    output: 'Define tokens in an @theme block; utilities are generated from them, so the token and the class that uses it live in one file.',
    latency: 2.4,
    tokens: 148,
    cost: 0.0021,
  },
  {
    id: 'b',
    model: 'astralyx-small',
    output: 'Tailwind v4 uses CSS for config. Put your theme in @theme.',
    latency: 0.6,
    tokens: 41,
    cost: 0.0003,
  },
]

export const modelComparisonEntry: ComponentEntry = {
  id: 'model-comparison',
  label: 'Model Comparison',
  description:
    'Two or more outputs side by side with a pick. Columns are equal width and height regardless of content, because a taller box reads as the better answer before a word of it is read.',
  usage: `import { ModelComparison } from '@/components/ui/model-comparison'

<ModelComparison outputs={outputs} onSelect={choose} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'responsive', label: 'responsive', options: ['sm', 'md', 'lg'], default: 'md' },
    ],
    render: (state) => (
      <div className="w-full">
        <ModelComparison
          outputs={OUTPUTS}
          responsive={String(state.responsive) as 'sm' | 'md' | 'lg'}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<ModelComparison\n  outputs={outputs}\n  responsive="${s.responsive}"\n  onSelect={choose}\n/>`,
  },
  api: [
    { name: 'outputs', type: 'ModelOutput[]', description: '`{ id, model, output, latency?, tokens?, cost?, badge? }`.' },
    { name: 'selected / onSelect', type: 'string / (id) => void', description: 'Controlled or uncontrolled pick.' },
    { name: 'responsive', type: "'sm' | 'md' | 'lg' | false", default: "'md'", description: 'Breakpoint the columns appear at. Below it they stack, where two columns would be too narrow to read.' },
    { name: 'metadata', type: 'footer', description: 'Latency, tokens and cost sit below the answers — compared after them, not before.' },
  ],
  demos: [
    { title: 'Side by side', stack: true, code: `<ModelComparison outputs={outputs} onSelect={choose} />`, render: () => <div className="w-full"><ModelComparison outputs={OUTPUTS} /></div> },
  ],
}
