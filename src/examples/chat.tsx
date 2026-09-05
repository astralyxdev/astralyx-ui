import { useState } from 'react'
import {
  FileCode, Globe, MessageSquare, Plus, Search, Settings, Sparkles,
  Terminal, Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ContextPicker, type ContextSource } from '@/components/ui/context-picker'
import { Empty } from '@/components/ui/empty'
import { Citations, type Citation } from '@/components/ui/citations'
import { Feedback, type Rating } from '@/components/ui/feedback'
import { Message, MessagePending } from '@/components/ui/message'
import { ReasoningBlock } from '@/components/ui/reasoning-block'
import { ModelSelect } from '@/components/ui/model-select'
import { PromptAttachButton, PromptInput } from '@/components/ui/prompt-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Suggestions } from '@/components/ui/suggestions'
import { TokenUsage } from '@/components/ui/token-usage'
import { ToolCall } from '@/components/ui/tool-call'
import { AppFrame, AppFrameUser, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

const THREADS: NavItem[] = [
  { id: 'kit', label: 'Component kit review', icon: <MessageSquare /> },
  { id: 'tokens', label: 'Token naming', icon: <MessageSquare /> },
  { id: 'a11y', label: 'Accessibility audit', icon: <MessageSquare /> },
  { id: 'perf', label: 'Bundle size', icon: <MessageSquare /> },
]

const SOURCES: ContextSource[] = [
  { id: 'styles', label: 'styles.ts', group: 'Open files', detail: '1–340', icon: <FileCode /> },
  { id: 'button', label: 'button.tsx', group: 'Open files', detail: '1–78', icon: <FileCode /> },
  { id: 'index', label: 'index.css', group: 'Open files', detail: '1–620', icon: <FileCode /> },
  { id: 'docs', label: 'Tailwind v4 docs', group: 'External', icon: <Globe /> },
  { id: 'shell', label: 'Terminal output', group: 'External', icon: <Terminal /> },
]

const MODELS = [
  { id: 'opus', name: 'Opus', note: 'most capable' },
  { id: 'sonnet', name: 'Sonnet', note: 'balanced' },
  { id: 'haiku', name: 'Haiku', note: 'fastest' },
]

const CITATIONS: Citation[] = [
  { id: 'c1', title: 'switch.tsx', source: 'src/components/ui', snippet: 'thumb: bg-background size-[var(--thumb)]' },
  { id: 'c2', title: 'index.css', source: 'src', snippet: '--background: oklch(0.99 0 0)' },
  { id: 'c3', title: 'Contrast and non-text UI', source: 'WCAG 2.2 · 1.4.11', url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast' },
]

type Turn =
  | { kind: 'user'; text: string }
  | {
      kind: 'assistant'
      text: string
      /** Shown above the answer, folded away — the working, not the result. */
      reasoning?: string
      /** What the answer was drawn from. */
      cites?: Citation[]
    }
  | { kind: 'tool'; name: string; summary: string; input: string; output?: string; status: 'running' | 'done' | 'error' }

const SEED: Turn[] = [
  { kind: 'user', text: 'Why does the switch thumb disappear in light mode?' },
  {
    kind: 'tool',
    name: 'read_file',
    summary: 'src/components/ui/switch.tsx',
    status: 'done',
    input: `{\n  "path": "src/components/ui/switch.tsx",\n  "range": [40, 70]\n}`,
    output: `{\n  "thumb": "bg-background size-[var(--thumb)]",\n  "track_off": "bg-secondary"\n}`,
  },
  {
    kind: 'assistant',
    text: 'The thumb is painted with `--background`, which is near-white in light mode — the same value as the off track it sits on, so it vanishes. In dark mode the same token is near-black, which is why it reads as a black dot there. It needs to pair with whatever the track is painted in: `--muted-foreground` on the subtle off track, `--primary-foreground` on the solid on track.',
    reasoning:
      'The thumb and the off track both resolve to --background. Checking index.css: in light mode that is oklch(0.99 0 0), and --secondary is oklch(0.97 0 0). Two per cent apart, so the shape is technically painted but has no edge to see. Dark mode inverts --background to near-black, which is why the same code reads as a visible dot there and the bug looked theme-specific. The fix is to pair the thumb with the track it sits on rather than with the page.',
    cites: CITATIONS,
  },
]

function Chat() {
  const [thread, setThread] = useState('kit')
  const [turns, setTurns] = useState<Turn[]>(SEED)
  const [rating, setRating] = useState<Rating | null>(null)
  const [attached, setAttached] = useState(['styles', 'button'])
  const [model, setModel] = useState('opus')
  const [busy, setBusy] = useState(false)

  const context = attached
    .map((id) => SOURCES.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s!.id, label: s!.label, icon: s!.icon, detail: s!.detail }))

  function send(text: string) {
    setTurns((current) => [...current, { kind: 'user', text }])
    setBusy(true)
    // A stand-in for a streaming reply, so the pending state is visible.
    window.setTimeout(() => {
      setTurns((current) => [
        ...current,
        {
          kind: 'assistant',
          text: 'That is the same class of bug: a token chosen for what it is called rather than for what it has to contrast with. Worth checking every place a component paints itself with `--background`.',
        },
      ])
      setBusy(false)
    }, 1400)
  }

  const empty = turns.length === 0

  return (
    <AppFrame
      product="Assistant"
      nav={THREADS}
      active={thread}
      onNavigate={setThread}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <h1 className="truncate text-sm font-semibold">
            {THREADS.find((t) => t.id === thread)?.label}
          </h1>
          <Badge size="sm">
            {turns.length} turns
          </Badge>
        </div>
      }
      footer={<AppFrameUser name="Ada Lovelace" plan="ada@astralyx.dev" />}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setTurns([])}>
            <Trash2 /> Clear
          </Button>
          <Button size="sm" variant="ghost" aria-label="Search threads">
            <Search />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Settings">
            <Settings />
          </Button>
        </div>
      }
      aside={
        <div className="space-y-5 p-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Context
            </p>
            <TokenUsage used={18400 + turns.length * 900} limit={200000} />
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Attached
            </p>
            {context.length === 0 ? (
              <p className="text-muted-foreground text-xs">Nothing attached.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {context.map((item) => (
                  <Badge key={item.id} size="sm" shape="rounded" icon={item.icon}>
                    {item.label}
                  </Badge>
                ))}
              </div>
            )}
            <ContextPicker
              sources={SOURCES}
              selected={attached}
              onSelect={(id) => setAttached((a) => [...a, id])}
              onDeselect={(id) => setAttached((a) => a.filter((x) => x !== id))}
            />
          </div>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            {empty ? (
              <div className="pt-16">
                <Empty
                  icon={<Sparkles />}
                  title="Ask about this codebase"
                  description="Attach files for context, then ask anything."
                  action={
                    <Suggestions
                      items={[
                        'Explain the colour sets',
                        'Why no shadows?',
                        'Review the field padding rule',
                      ]}
                      onSelect={send}
                    />
                  }
                />
              </div>
            ) : (
              turns.map((turn, index) =>
                turn.kind === 'tool' ? (
                  <ToolCall
                    key={index}
                    name={turn.name}
                    summary={turn.summary}
                    status={turn.status}
                    input={turn.input}
                    output={turn.output}
                  />
                ) : (
                  <Message
                    key={index}
                    role={turn.kind}
                    name={turn.kind === 'user' ? 'Ada' : 'Assistant'}
                    copyText={turn.text}
                    onRetry={turn.kind === 'assistant' ? () => {} : undefined}
                    onVote={turn.kind === 'assistant' ? () => {} : undefined}
                  >
                    {/* Reasoning goes above the answer and starts folded: it is
                        the working, and most readers want the result first. */}
                    {turn.kind === 'assistant' && turn.reasoning && (
                      <ReasoningBlock duration={9} className="mb-3">
                        {turn.reasoning}
                      </ReasoningBlock>
                    )}
                    {turn.text}
                    {turn.kind === 'assistant' && turn.cites && (
                      <Citations citations={turn.cites} className="mt-3" />
                    )}
                    {turn.kind === 'assistant' && index === turns.length - 1 && (
                      <Feedback
                        className="mt-3"
                        rating={rating}
                        onRate={setRating}
                        reasons={['Wrong', 'Incomplete', 'Too long', 'Missed the question']}
                      />
                    )}
                  </Message>
                ),
              )
            )}

            {busy && <MessagePending />}
          </div>
        </ScrollArea>

        <div className="border-border shrink-0 border-t p-3 sm:p-4">
          <div className="mx-auto max-w-3xl space-y-3">
            {!empty && (
              <Suggestions
                items={['Where else is that token used?', 'Show me the fix', 'Any similar bugs?']}
                onSelect={send}
              />
            )}
            <PromptInput
              placeholder="Ask about this codebase…"
              busy={busy}
              onStop={() => setBusy(false)}
              onSubmit={send}
              context={context}
              onRemoveContext={(id) => setAttached((a) => a.filter((x) => x !== id))}
              maxLength={2000}
              toolbar={
                <>
                  <ContextPicker
                    sources={SOURCES}
                    selected={attached}
                    onSelect={(id) => setAttached((a) => [...a, id])}
                    onDeselect={(id) => setAttached((a) => a.filter((x) => x !== id))}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Add context">
                        <Plus />
                      </Button>
                    }
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
          </div>
        </div>
      </div>
    </AppFrame>
  )
}

export const chatExample: ExampleEntry = {
  id: 'chat',
  label: 'Assistant',
  description:
    'A working chat: send a message and watch the pending state, attach and detach context, inspect a tool call, and see the context window fill as the thread grows.',
  uses: [
    'Prompt Input', 'Message', 'Reasoning Block', 'Citations', 'Feedback',
    'Context Picker', 'Tool Call', 'Model Select',
    'Token Usage', 'Suggestions', 'Scroll Area', 'Empty', 'Badge',
  ],
  render: () => <Chat />,
}
