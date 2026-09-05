import { useState } from 'react'
import { FewShotEditor, type FewShotExample } from '@/components/ui/few-shot-editor'
import { PromptVariables } from '@/components/ui/prompt-variables'
import { PromptVersions, type PromptVersion } from '@/components/ui/prompt-versions'
import { TokenInspector, type InspectedToken } from '@/components/ui/token-inspector'
import type { ComponentEntry } from './types'

/* ---------------------------------------------------- prompt variables */

const TEMPLATE = `You are supporting {{product}}.

The customer is {{customer}}, on the {{plan}} plan.
Their question:

{{question}}

Answer from the retrieved docs. Refunds above £200 go to a human.`

function VariablesDemo() {
  const [values, setValues] = useState<Record<string, string>>({
    product: 'Astralyx',
    customer: 'Ada Lovelace',
    plan: 'Team',
  })
  return (
    <PromptVariables
      className="w-full"
      template={TEMPLATE}
      values={values}
      onChange={setValues}
      multiline={['question']}
      hints={{ plan: 'Drives which refund rules apply.' }}
    />
  )
}

export const promptVariablesEntry: ComponentEntry = {
  id: 'prompt-variables',
  label: 'Prompt Variables',
  description:
    'A prompt template with its slots filled in, beside the exact text the model receives. Variables are parsed out of the template rather than declared separately, so they cannot drift out of sync with it.',
  usage: `import { PromptVariables } from '@/components/ui/prompt-variables'

<PromptVariables template={template} values={values} onChange={setValues} />`,
  composer: { tall: true, controls: [], render: () => <VariablesDemo />, code: () => `<PromptVariables\n  template={template}\n  values={values}\n  onChange={setValues}\n  multiline={['question']}\n/>` },
  api: [
    { name: 'template', type: 'string', description: '`{{name}}` marks a slot. The variable list is derived from this — there is no second list to fall out of step with it.' },
    { name: 'values / onChange', type: 'Record<string, string>', description: 'Controlled. Unfilled slots are highlighted in the preview instead of being silently interpolated as empty strings.' },
    { name: 'preview', type: 'exact output', description: 'The literal text that will be sent. A view that renders slots as chips is prettier and answers a different question.' },
    { name: 'multiline / multilineAfter', type: 'string[] / number', description: 'Which slots get a textarea, and the length past which one is chosen automatically.' },
  ],
  demos: [{ title: 'Filling a support prompt', stack: true, code: `<PromptVariables template={template} values={values} onChange={setValues} />`, render: () => <VariablesDemo /> }],
}

/* ------------------------------------------------------ prompt versions */

const VERSIONS: PromptVersion[] = [
  { id: 'v7', label: 'v7', at: '3 Sep', author: 'ada', note: 'Added the £200 refund ceiling.', score: 0.86, live: true },
  { id: 'v6', label: 'v6', at: '1 Sep', author: 'marc', note: 'Told it to prefer the docs over its own memory.', score: 0.81 },
  { id: 'v5', label: 'v5', at: '28 Aug', author: 'ada', note: 'Shortened the system prompt to save tokens.', score: 0.62 },
  { id: 'v4', label: 'v4', at: '24 Aug', author: 'ada', note: 'First version with retrieved context.', score: 0.79 },
  { id: 'v3', label: 'v3', at: '20 Aug', author: 'iris', note: 'Initial draft.' },
]

export const promptVersionsEntry: ComponentEntry = {
  id: 'prompt-versions',
  label: 'Prompt Versions',
  description:
    'A prompt’s history with what each change did to the score. The pairing is the point: a history without outcomes says what happened, a score chart without edits says something changed, and neither answers which edit made it worse.',
  usage: `import { PromptVersions } from '@/components/ui/prompt-versions'

<PromptVersions versions={versions} onCompare={(a, b) => openDiff(a, b)} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'compare', label: 'with diff buttons', default: true }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <PromptVersions
          versions={VERSIONS}
          selectedId="v7"
          onSelect={() => {}}
          onCompare={state.compare ? () => {} : undefined}
        />
      </div>
    ),
    code: (state) => `<PromptVersions\n  versions={versions}\n  onSelect={select}\n${state.compare ? '  onCompare={(a, b) => openDiff(a, b)}\n' : ''}/>`,
  },
  api: [
    { name: 'versions', type: 'PromptVersion[]', description: '{ id, label, at?, author?, note?, score?, live? }. Newest first — order is preserved because position in the sequence is information.' },
    { name: 'deltas', type: 'vs the previous version', description: 'Not against the best. Regression hunting walks backwards one step at a time; a delta against a distant high-water mark makes everything after it look equally bad.' },
    { name: 'live', type: 'boolean', description: 'Marked in place rather than sorted to the top — moving it hides how many versions have shipped since.' },
    { name: 'onCompare', type: '(a, b) => void', description: 'Usually opens a PromptDiff between a version and the one before it.' },
  ],
  demos: [{ title: 'A regression in v5', stack: true, code: `<PromptVersions versions={versions} onCompare={openDiff} />`, render: () => (<div className="w-full max-w-2xl"><PromptVersions versions={VERSIONS} onCompare={() => {}} /></div>) }],
}

/* ------------------------------------------------------ few-shot editor */

function FewShotDemo() {
  const [examples, setExamples] = useState<FewShotExample[]>([
    { id: 'e1', input: 'Where is my refund?', output: 'Check the order id, then the ledger, then answer with the settlement date.' },
    { id: 'e2', input: 'Cancel my plan', output: 'Confirm which plan, then hand off to the billing agent.' },
    { id: 'e3', input: 'you are useless', output: 'Acknowledge, do not apologise twice, offer a human.', disabled: true },
  ])

  return (
    <FewShotEditor
      className="w-full"
      examples={examples}
      onChange={setExamples}
      estimateTokens={(example) => Math.ceil((example.input.length + example.output.length) / 4)}
    />
  )
}

export const fewShotEditorEntry: ComponentEntry = {
  id: 'few-shot-editor',
  label: 'Few-Shot Editor',
  description:
    'The worked examples in a prompt, as editable pairs rather than one long string. Structured pairs can be counted, reordered, costed and switched off one at a time — a textarea holding six examples supports none of that.',
  usage: `import { FewShotEditor } from '@/components/ui/few-shot-editor'

<FewShotEditor examples={examples} onChange={setExamples} estimateTokens={estimate} />`,
  composer: { tall: true, controls: [], render: () => <FewShotDemo />, code: () => `<FewShotEditor\n  examples={examples}\n  onChange={setExamples}\n  estimateTokens={(e) => Math.ceil((e.input.length + e.output.length) / 4)}\n/>` },
  api: [
    { name: 'examples / onChange', type: 'FewShotExample[]', description: '{ id, input, output, disabled? }. Controlled.' },
    { name: 'disabled', type: 'boolean', description: 'Kept in the list, excluded from the prompt. “Does this example help?” is answered by toggling, not by cutting the text out and pasting it back.' },
    { name: 'reordering', type: 'buttons, not drag', description: 'Order carries weight with a model — recency inside the prompt matters — and two buttons work on a keyboard, by touch and in a screen reader, which a drag handle does not.' },
    { name: 'estimateTokens', type: '(example) => number', description: 'Drives the budget readout. Counts only enabled examples.' },
  ],
  demos: [{ title: 'Three examples, one switched off', stack: true, code: `<FewShotEditor examples={examples} onChange={setExamples} />`, render: () => <FewShotDemo /> }],
}

/* ------------------------------------------------------ token inspector */

// A stand-in for a real tokeniser's output — this component renders, it does
// not tokenise, so the docs hand it a fixed sequence.
const TOKENS: InspectedToken[] = [
  { text: 'You', id: 2675 }, { text: ' are', id: 553 }, { text: ' support', id: 1044 },
  { text: 'ing', id: 278 }, { text: ' astral', id: 8241 }, { text: 'y', id: 88 },
  { text: 'x', id: 87 }, { text: '.', id: 13 }, { text: '\n\n', id: 271 },
  { text: 'Ref', id: 8113 }, { text: 'unds', id: 8395 }, { text: ' above', id: 3485 },
  { text: ' £', id: 7263 }, { text: '200', id: 1049 }, { text: ' go', id: 733 },
  { text: ' to', id: 311 }, { text: ' a', id: 264 }, { text: ' human', id: 3823 },
  { text: '.', id: 13 },
]

export const tokenInspectorEntry: ComponentEntry = {
  id: 'token-inspector',
  label: 'Token Inspector',
  description:
    'Text broken into tokens, so a prompt’s cost stops being a mystery number. Tokenisation is not words — `astralyx` is three tokens — and people shorten prose while a JSON blob below costs ten times more.',
  usage: `import { TokenInspector } from '@/components/ui/token-inspector'

<TokenInspector tokens={tokenise(prompt)} pricePerThousand={0.003} showIds />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'showIds', label: 'showIds', default: false },
      { type: 'number', prop: 'limit', label: 'limit', default: 19, min: 4, max: 19, step: 1 },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <TokenInspector
          tokens={TOKENS}
          showIds={Boolean(state.showIds)}
          limit={Number(state.limit)}
          pricePerThousand={0.003}
        />
      </div>
    ),
    code: (state) => `<TokenInspector\n  tokens={tokenise(prompt)}\n  showIds={${Boolean(state.showIds)}}\n  limit={${Number(state.limit)}}\n  pricePerThousand={0.003}\n/>`,
  },
  api: [
    { name: 'tokens', type: 'InspectedToken[]', description: 'Required. This component renders; it does not tokenise — real tokenisation needs the model’s vocabulary, a multi-megabyte table, and an approximation would produce numbers people quote in budgets.' },
    { name: 'limit', type: 'number', description: 'Tokens past this index are drawn as over the limit — for showing what a context ceiling would truncate.' },
    { name: 'pricePerThousand / formatCost', type: 'number / (cost) => ReactNode', description: 'Turns the count into money.' },
    { name: 'whitespace', type: 'made visible', description: 'Spaces render as · and newlines as ↵. Whitespace is a token too, and an invisible one reads as a gap in the sequence.' },
  ],
  demos: [{ title: 'A system prompt, tokenised', stack: true, code: `<TokenInspector tokens={tokens} pricePerThousand={0.003} showIds />`, render: () => (<div className="w-full max-w-xl"><TokenInspector tokens={TOKENS} pricePerThousand={0.003} showIds /></div>) }],
}
