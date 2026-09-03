import { useState } from 'react'
import { FileCode, Globe, Image as ImageIcon, Terminal } from 'lucide-react'
import { ContextPicker, type ContextSource } from '@/components/ui/context-picker'
import { Message, MessagePending } from '@/components/ui/message'
import { ModelSelect } from '@/components/ui/model-select'
import { PromptAttachButton, PromptInput } from '@/components/ui/prompt-input'
import { Suggestions } from '@/components/ui/suggestions'
import { TokenUsage } from '@/components/ui/token-usage'
import { ToolCall } from '@/components/ui/tool-call'
import type { ComponentEntry } from './types'

const MODELS = [
  { id: 'opus', name: 'Opus', note: 'most capable' },
  { id: 'sonnet', name: 'Sonnet', note: 'balanced' },
  { id: 'haiku', name: 'Haiku', note: 'fastest' },
]

const SOURCES: ContextSource[] = [
  { id: 'button', label: 'button.tsx', group: 'Open files', detail: '1–86', icon: <FileCode /> },
  { id: 'styles', label: 'styles.ts', group: 'Open files', detail: '1–210', icon: <FileCode /> },
  { id: 'index', label: 'index.css', group: 'Open files', icon: <FileCode /> },
  { id: 'docs', label: 'Tailwind v4 docs', group: 'External', icon: <Globe /> },
  { id: 'shell', label: 'Terminal output', group: 'External', icon: <Terminal /> },
  { id: 'screenshot', label: 'screenshot.png', group: 'External', icon: <ImageIcon />, disabled: true },
]

function PromptPlayground({
  busy = false,
  withContext = true,
  maxLength,
}: {
  busy?: boolean
  withContext?: boolean
  maxLength?: number
}) {
  const [attached, setAttached] = useState<string[]>(
    withContext ? ['button', 'styles'] : [],
  )
  const [model, setModel] = useState('opus')

  const context = attached
    .map((id) => SOURCES.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s!.id, label: s!.label, icon: s!.icon, detail: s!.detail }))

  return (
    <div className="w-full max-w-2xl space-y-3">
      <PromptInput
        placeholder="Ask about this codebase…"
        busy={busy}
        maxLength={maxLength}
        context={context}
        onRemoveContext={(id) => setAttached((a) => a.filter((x) => x !== id))}
        toolbar={
          <>
            <ContextPicker
              sources={SOURCES}
              selected={attached}
              onSelect={(id) => setAttached((a) => [...a, id])}
              onDeselect={(id) => setAttached((a) => a.filter((x) => x !== id))}
            />
            <PromptAttachButton />
            <ModelSelect
              models={MODELS}
              value={model}
              onValueChange={setModel}
              className="w-44"
            />
          </>
        }
      />
      <TokenUsage used={18400} limit={200000} />
    </div>
  )
}

export const promptInputEntry: ComponentEntry = {
  id: 'prompt-input',
  label: 'Prompt Input',
  description:
    'The composer for a chat: a growing textarea, attached context as removable chips, and a toolbar. Enter sends, Shift+Enter adds a newline, and IME composition is checked first.',
  usage: `import { PromptInput } from '@/components/ui/prompt-input'

<PromptInput
  context={attached}
  onRemoveContext={remove}
  toolbar={<ContextPicker sources={sources} … />}
  onSubmit={send}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'busy', label: 'busy', default: false },
      { type: 'boolean', prop: 'context', label: 'context chips', default: true },
      { type: 'boolean', prop: 'limit', label: 'maxLength', default: false },
    ],
    render: (state) => (
      <PromptPlayground
        busy={Boolean(state.busy)}
        withContext={Boolean(state.context)}
        maxLength={state.limit ? 200 : undefined}
      />
    ),
    code: (state) =>
      `<PromptInput\n  onSubmit={send}\n${state.busy ? '  busy\n  onStop={stop}\n' : ''}${state.context ? '  context={attached}\n  onRemoveContext={remove}\n' : ''}${state.limit ? '  maxLength={200}\n' : ''}  toolbar={<ContextPicker sources={sources} />}\n/>`,
  },
  api: [
    { name: 'value / onValueChange', type: 'string', description: 'Controlled and uncontrolled text.' },
    { name: 'onSubmit', type: '(value: string) => void', description: 'Fires on Enter or the send button. Never fires while empty or busy.' },
    { name: 'busy / onStop', type: 'boolean / () => void', description: 'Swaps send for stop and blocks submission while a reply is streaming.' },
    { name: 'context', type: 'ContextItem[]', description: '{ id, label, icon?, detail? }, rendered as removable chips above the field.' },
    { name: 'toolbar', type: 'ReactNode', description: 'Leading toolbar slot — a context picker, a model select, an attach button.' },
    { name: 'maxLength', type: 'number', description: 'Budget. The counter only appears past 80%, and turns destructive at the limit.' },
    { name: 'keyboard', type: 'Enter / Shift+Enter', description: 'Send and newline. Composition events are checked first, so an IME confirming a candidate does not send.' },
  ],
  demos: [
    { title: 'With context and a model picker', stack: true, code: `<PromptInput toolbar={…} context={attached} />`, render: () => <PromptPlayground /> },
    { title: 'Streaming', stack: true, code: `<PromptInput busy onStop={stop} />`, render: () => <PromptPlayground busy /> },
    { title: 'With a budget', stack: true, code: `<PromptInput maxLength={200} />`, render: () => <PromptPlayground maxLength={200} withContext={false} /> },
  ],
}

export const messageEntry: ComponentEntry = {
  id: 'message',
  label: 'Message',
  description:
    'One turn in a conversation. The two roles are shaped differently on purpose — a user message is a bubble, an assistant message is full-width prose, because a long answer in a bubble is unreadable.',
  usage: `import { Message, MessagePending } from '@/components/ui/message'

<Message role="user" name="Ada">How do the colour sets work?</Message>
<Message role="assistant" onRetry={retry} onVote={vote} copyText={text}>
  Every variant reads the same --ui-* set…
</Message>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'role', label: 'role', options: ['assistant', 'user'], default: 'assistant' },
      { type: 'boolean', prop: 'actions', label: 'actions', default: true },
      { type: 'boolean', prop: 'pending', label: 'pending', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl space-y-4">
        {state.pending ? (
          <MessagePending />
        ) : (
          <Message
            role={state.role as 'user' | 'assistant'}
            name={state.role === 'user' ? 'Ada' : 'Assistant'}
            actions={Boolean(state.actions)}
            copyText="Every variant reads the same --ui-* colour set."
            onRetry={() => {}}
            onVote={() => {}}
          >
            Every variant reads the same <code className="font-mono text-xs">--ui-*</code>{' '}
            colour set, so one prop restyles solid, secondary, outline and ghost
            together.
          </Message>
        )}
      </div>
    ),
    code: (state) =>
      state.pending
        ? '<MessagePending />'
        : `<Message\n  role="${state.role}"\n${state.actions ? '  onRetry={retry}\n  onVote={vote}\n' : '  actions={false}\n'}>\n  …\n</Message>`,
  },
  api: [
    { name: 'role', type: "'user' | 'assistant'", description: 'Decides the shape: a trailing bubble, or full-width prose with an avatar.' },
    { name: 'actions', type: 'boolean', default: 'role === assistant', description: 'Copy, retry and vote row under the message.' },
    { name: 'copyText', type: 'string', description: 'What the copy button writes to the clipboard.' },
    { name: 'onRetry / onVote', type: 'callbacks', description: 'Each adds its button only when provided.' },
    { name: 'MessagePending', type: 'component', description: 'The three-dot pulse, with role="status" and a screen-reader label — a purely visual animation says nothing about why the interface went quiet.' },
  ],
  demos: [
    {
      title: 'A short exchange',
      stack: true,
      code: `<Message role="user">…</Message>\n<Message role="assistant">…</Message>`,
      render: () => (
        <div className="w-full max-w-2xl space-y-5">
          <Message role="user" name="Ada">
            Why is there no shadow anywhere in this kit?
          </Message>
          <Message
            role="assistant"
            copyText="Interaction feedback is colour only."
            onRetry={() => {}}
            onVote={() => {}}
          >
            Interaction feedback is colour only — nothing moves, resizes or gains
            elevation on hover. It keeps layout stable and makes the system read
            as one surface rather than a stack of floating cards.
          </Message>
          <MessagePending />
        </div>
      ),
    },
  ],
}

export const contextPickerEntry: ComponentEntry = {
  id: 'context-picker',
  label: 'Context Picker',
  description:
    'Picks what an assistant can see. A dropdown rather than a dialog, because attaching context happens mid-thought and a modal takes focus off the prompt you were writing.',
  usage: `import { ContextPicker } from '@/components/ui/context-picker'

<ContextPicker
  sources={sources}
  selected={attached}
  onSelect={attach}
  onDeselect={detach}
/>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'preselected', label: 'preselected', default: true }],
    render: (state) => <ContextPlayground preselected={Boolean(state.preselected)} />,
    code: () =>
      `<ContextPicker\n  sources={sources}\n  selected={attached}\n  onSelect={attach}\n  onDeselect={detach}\n/>`,
  },
  api: [
    { name: 'sources', type: 'ContextSource[]', description: '{ id, label, group?, detail?, icon?, disabled? }' },
    { name: 'selected', type: 'string[]', description: 'Attached ids. Selected sources stay in the list with a tick rather than disappearing, so the menu does not reshuffle under the pointer.' },
    { name: 'onSelect / onDeselect', type: '(id: string) => void', description: 'Attach and detach.' },
    { name: 'trigger', type: 'ReactNode', description: 'Replaces the default "Context" button.' },
  ],
  demos: [
    { title: 'Attaching files and docs', stack: true, code: `<ContextPicker sources={sources} selected={attached} />`, render: () => <ContextPlayground preselected /> },
  ],
}

function ContextPlayground({ preselected }: { preselected: boolean }) {
  const [attached, setAttached] = useState<string[]>(preselected ? ['button'] : [])
  return (
    <ContextPicker
      sources={SOURCES}
      selected={attached}
      onSelect={(id) => setAttached((a) => [...a, id])}
      onDeselect={(id) => setAttached((a) => a.filter((x) => x !== id))}
    />
  )
}

export const toolCallEntry: ComponentEntry = {
  id: 'tool-call',
  label: 'Tool Call',
  description:
    'One tool invocation inside an assistant turn. Collapsed by default — the arguments are long and the interesting part is that it ran — except a failure, which opens itself.',
  usage: `import { ToolCall } from '@/components/ui/tool-call'

<ToolCall
  name="read_file"
  summary="src/lib/styles.ts"
  status="done"
  input={JSON.stringify(args, null, 2)}
  output={result}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'status', label: 'status', options: ['done', 'running', 'error'], default: 'done' },
      { type: 'boolean', prop: 'output', label: 'output', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <ToolCall
          name="read_file"
          summary="src/lib/styles.ts"
          status={state.status as 'done' | 'running' | 'error'}
          input={`{\n  "path": "src/lib/styles.ts",\n  "range": [1, 40]\n}`}
          output={
            state.output
              ? `{\n  "lines": 218,\n  "language": "typescript"\n}`
              : undefined
          }
        />
      </div>
    ),
    code: (state) =>
      `<ToolCall\n  name="read_file"\n  summary="src/lib/styles.ts"\n  status="${state.status}"\n  input={args}\n${state.output ? '  output={result}\n' : ''}/>`,
  },
  api: [
    { name: 'name', type: 'string', description: 'The tool identifier, in monospace.' },
    { name: 'status', type: "'running' | 'done' | 'error'", default: "'done'", description: 'A failure defaults to open, because that is the case you always want to read.' },
    { name: 'summary', type: 'ReactNode', description: 'Short line beside the name — the target, the query, the file.' },
    { name: 'input / output', type: 'string', description: 'Rendered in CodeBlocks, collapsed past 8 and 12 lines.' },
  ],
  demos: [
    {
      title: 'Every status',
      stack: true,
      code: `<ToolCall name="read_file" status="done" … />`,
      render: () => (
        <div className="w-full max-w-2xl space-y-2">
          <ToolCall name="read_file" summary="src/lib/styles.ts" status="done" input={`{ "path": "src/lib/styles.ts" }`} output={`{ "lines": 218 }`} />
          <ToolCall name="run_tests" summary="47 components" status="running" input={`{ "filter": "ui/**" }`} />
          <ToolCall name="write_file" summary="permission denied" status="error" input={`{ "path": "/etc/hosts" }`} output={`{ "error": "EACCES" }`} />
        </div>
      ),
    },
  ],
}

export const tokenUsageEntry: ComponentEntry = {
  id: 'token-usage',
  label: 'Token Usage',
  description:
    'How much of a context window is spoken for. The colour crosses to amber at 75% and destructive at 90%, because the number only matters once it is close.',
  usage: `import { TokenUsage } from '@/components/ui/token-usage'

<TokenUsage used={18400} limit={200000} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'used', label: 'used', options: ['4200', '18400', '150000', '184000', '199000'], default: '18400' },
      { type: 'select', prop: 'limit', label: 'limit', options: ['32000', '200000', '1000000'], default: '200000' },
      { type: 'boolean', prop: 'showNumbers', label: 'showNumbers', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <TokenUsage
          used={Number(state.used)}
          limit={Number(state.limit)}
          showNumbers={Boolean(state.showNumbers)}
        />
      </div>
    ),
    code: (state) => `<TokenUsage used={${state.used}} limit={${state.limit}} />`,
  },
  api: [
    { name: 'used / limit', type: 'number', description: 'Token counts. The share is clamped at 100%.' },
    { name: 'label', type: 'string', default: "'Context used'", description: 'Text on the left.' },
    { name: 'showNumbers', type: 'boolean', default: 'true', description: 'The compact "18.4k / 200k" readout.' },
    { name: 'thresholds', type: '75% / 90%', description: 'Where the bar turns amber, then destructive.' },
  ],
  demos: [
    {
      title: 'Across the thresholds',
      stack: true,
      code: `<TokenUsage used={18400} limit={200000} />`,
      render: () => (
        <div className="w-full max-w-sm space-y-4">
          <TokenUsage used={18400} limit={200000} label="Comfortable" />
          <TokenUsage used={156000} limit={200000} label="Getting full" />
          <TokenUsage used={192000} limit={200000} label="Nearly out" />
        </div>
      ),
    },
  ],
}

export const modelSelectEntry: ComponentEntry = {
  id: 'model-select',
  label: 'Model Select',
  description:
    'Picks which model answers. A Select with the naming convention folded in, so "Opus · most capable" is scannable where a bare model id is not.',
  usage: `import { ModelSelect } from '@/components/ui/model-select'

<ModelSelect models={models} value={model} onValueChange={setModel} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['xs', 'sm', 'default', 'lg'], default: 'sm' },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <ModelSelect
          models={MODELS}
          defaultValue="opus"
          size={state.size as 'xs' | 'sm' | 'default' | 'lg'}
        />
      </div>
    ),
    code: (state) => `<ModelSelect\n  models={models}\n  size="${state.size}"\n  onValueChange={setModel}\n/>`,
  },
  api: [
    { name: 'models', type: 'Model[]', description: '{ id, name, note?, disabled? }' },
    { name: 'note', type: 'string', description: 'Capability or cost hint, joined to the name with a middot.' },
    { name: 'rest', type: 'Select props', description: 'Everything else forwards to Select — value, onValueChange, size, variant, error.' },
  ],
  demos: [
    { title: 'Model picker', stack: true, code: `<ModelSelect models={models} defaultValue="opus" />`, render: () => (
      <div className="w-full max-w-xs"><ModelSelect models={MODELS} defaultValue="opus" /></div>
    ) },
  ],
}

export const suggestionsEntry: ComponentEntry = {
  id: 'suggestions',
  label: 'Suggestions',
  description:
    'Starter prompts, offered before the first message. Buttons rather than a list, because each one performs an action.',
  usage: `import { Suggestions } from '@/components/ui/suggestions'

<Suggestions items={prompts} onSelect={send} />`,
  composer: {
    controls: [{ type: 'boolean', prop: 'long', label: 'long prompts', default: false }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <Suggestions
          items={
            state.long
              ? [
                  'Explain how the colour sets flow from tokens to components',
                  'Why does the kit avoid shadows and hover motion entirely?',
                  'Walk me through the field padding rule',
                ]
              : ['Explain the colour sets', 'Add a component', 'Review this diff']
          }
        />
      </div>
    ),
    code: () => `<Suggestions\n  items={['Explain the colour sets', 'Add a component']}\n  onSelect={send}\n/>`,
  },
  api: [
    { name: 'items', type: 'string[]', description: 'The prompts.' },
    { name: 'onSelect', type: '(prompt: string) => void', description: 'Fires with the chosen prompt.' },
  ],
  demos: [
    { title: 'Starter prompts', stack: true, code: `<Suggestions items={prompts} onSelect={send} />`, render: () => (
      <Suggestions items={['Explain the colour sets', 'Add a component', 'Review this diff', 'Find unused tokens']} />
    ) },
  ],
}
