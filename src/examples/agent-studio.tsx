import { useEffect, useState, type ReactNode } from 'react'
import {
  Blocks, Brain, GitBranch, ListChecks, Play, ShieldCheck, Sparkles,
} from 'lucide-react'
import { AgentCard } from '@/components/ui/agent-card'
import { AgentMemory, type MemoryEntry } from '@/components/ui/agent-memory'
import { AgentSteps, type AgentStep, type AgentStepStatus } from '@/components/ui/agent-steps'
import { AgentTasks, type AgentTask, type AgentTaskStatus } from '@/components/ui/agent-tasks'
import { Badge } from '@/components/ui/badge'
import { BudgetGuard } from '@/components/ui/budget-guard'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GuardrailList, type Guardrail, type GuardrailOutcome } from '@/components/ui/guardrail-list'
import { HandoffTrail, type Handoff } from '@/components/ui/handoff-trail'
import { ModelSelect } from '@/components/ui/model-select'
import { RunControls, type RunStatus } from '@/components/ui/run-controls'
import { SandboxPolicy, type SandboxScope } from '@/components/ui/sandbox-policy'
import { SubagentTree, type Subagent } from '@/components/ui/subagent-tree'
import { TokenUsage } from '@/components/ui/token-usage'
import { ToolPicker, type Tool } from '@/components/ui/tool-picker'
import { TraceWaterfall, type TraceSpan } from '@/components/ui/trace-waterfall'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

const NAV: NavItem[] = [
  { id: 'build', label: 'Build', icon: <Blocks /> },
  { id: 'run', label: 'Run', icon: <Play /> },
  { id: 'trace', label: 'Trace', icon: <GitBranch /> },
  { id: 'memory', label: 'Memory', icon: <Brain />, count: 5 },
  { id: 'policy', label: 'Policy', icon: <ShieldCheck /> },
]

const SECTION_TITLE: Record<string, string> = {
  build: 'Release Auditor · build',
  run: 'Release Auditor · run',
  trace: 'Release Auditor · trace',
  memory: 'Release Auditor · memory',
  policy: 'Release Auditor · policy',
}

const MODELS = [
  { id: 'claude-opus-4-6', name: 'Opus 4.6', note: 'deepest reasoning · $15 / M in' },
  { id: 'claude-sonnet-4-6', name: 'Sonnet 4.6', note: 'balanced · $3 / M in' },
  { id: 'claude-haiku-4-5', name: 'Haiku 4.5', note: 'fastest · $0.80 / M in' },
  { id: 'gpt-oss-120b', name: 'gpt-oss 120b', note: 'self-hosted, no egress' },
]

const AGENTS = [
  {
    id: 'auditor',
    name: 'Release Auditor',
    description: 'Diffs the working tree against the last tag, runs the a11y suite, and drafts release notes.',
    tools: ['read_file', 'git_diff', 'grep', 'bash', 'github_pr'],
    temperature: 0.2,
  },
  {
    id: 'triager',
    name: 'Issue Triager',
    description: 'Labels new issues, finds the duplicate, and pings whoever last touched the file.',
    tools: ['github_issues', 'grep', 'git_blame'],
    temperature: 0,
  },
  {
    id: 'scribe',
    name: 'Docs Scribe',
    description: 'Keeps the props table in the docs honest with the actual component signature.',
    tools: ['read_file', 'write_file'],
    temperature: 0.4,
  },
]

const TOOLS: Tool[] = [
  { id: 'read_file', name: 'read_file', group: 'Filesystem', description: 'Read a file from the checkout.', meta: 'p95 4 ms' },
  { id: 'grep', name: 'grep', group: 'Filesystem', description: 'Regex search across tracked files.', meta: 'p95 61 ms' },
  { id: 'write_file', name: 'write_file', group: 'Filesystem', description: 'Overwrite a file in the working tree.', destructive: true },
  { id: 'git_diff', name: 'git_diff', group: 'Git', description: 'Diff the working tree against a ref.' },
  { id: 'git_blame', name: 'git_blame', group: 'Git', description: 'Attribute each line to its last commit.' },
  { id: 'git_push', name: 'git_push', group: 'Git', description: 'Push the current branch to origin.', destructive: true, disabled: true, disabledReason: 'Blocked by the sandbox network allow-list.' },
  { id: 'bash', name: 'bash', group: 'Shell', description: 'Run a command inside the sandbox.', destructive: true, meta: 'p95 8.4 s' },
  { id: 'github_pr', name: 'github_pr', group: 'GitHub', description: 'Open or update a pull request.' },
  { id: 'github_issues', name: 'github_issues', group: 'GitHub', description: 'Read and label issues.' },
  { id: 'web_search', name: 'web_search', group: 'Web', description: 'Search the public web.', meta: 'p95 1.2 s' },
]

/**
 * The run is a fixed script. Each step names the tool it needs so switching a
 * tool off in the picker visibly skips it — the picker is wired to the run
 * rather than being a decorative list of checkboxes.
 */
const STEPS = [
  { id: 'manifest', label: 'Read the release manifest', tool: 'read_file', duration: 240, detail: 'package.json · 132 lines · registry version 0.9.4' },
  { id: 'diff', label: 'Diff the tree against v0.9.3', tool: 'git_diff', duration: 1420, detail: '84 files changed, 2 118 insertions, 640 deletions' },
  { id: 'breaking', label: 'Search the diff for breaking changes', tool: 'grep', duration: 380, detail: '2 removed props: Switch.thumbColor, Badge.rounded' },
  { id: 'a11y', label: 'Run the accessibility suite', tool: 'bash', duration: 12400, detail: 'vitest run a11y — 214 passed, 1 failed (switch contrast)' },
  { id: 'ask', label: 'Ask a maintainer about the contrast fix', duration: 4100, detail: 'Escalated to Grace Hopper — approved, notes to mention the token change' },
  { id: 'draft', label: 'Draft the release notes', duration: 6200, detail: '1 480 output tokens · 3 sections · 2 migration callouts' },
  { id: 'pr', label: 'Open the release pull request', tool: 'github_pr', duration: 900, detail: 'astralyx/ui-kit#412 — “Release 0.9.4”' },
]

const PLAN = [
  { id: 'gather', title: 'Gather the release surface', from: 0, to: 2 },
  { id: 'verify', title: 'Verify accessibility', from: 3, to: 4, note: 'One failure needs a human sign-off before the notes can claim a clean suite.' },
  { id: 'write', title: 'Draft the notes', from: 5, to: 5 },
  { id: 'ship', title: 'Open the pull request', from: 6, to: 6 },
]

/** `after` is the step index at which each check has actually run. */
const GUARDRAILS: (Omit<Guardrail, 'outcome'> & { after: number; outcome: GuardrailOutcome })[] = [
  { id: 'secrets', name: 'No secrets in output', stage: 'output', after: 1, outcome: 'pass', detail: 'Scanned 84 diff hunks for key material.' },
  { id: 'writes', name: 'Writes stay inside the checkout', stage: 'tool', after: 2, outcome: 'pass', detail: 'No path escaped /workspace/ui-kit.' },
  { id: 'egress', name: 'Network egress allow-list', stage: 'tool', after: 3, outcome: 'warn', detail: 'bash reached api.github.com — permitted, but logged.', meta: '1 hit' },
  { id: 'claims', name: 'No unverified pass claims', stage: 'output', after: 5, outcome: 'block', detail: 'Draft said “all suites green” while a11y had 1 failure. Rewritten.' },
  { id: 'pii', name: 'PII redaction', stage: 'output', after: 6, outcome: 'pass', detail: 'No author emails carried into the notes.' },
]

const SUBAGENTS: Subagent[] = [
  {
    id: 'root',
    name: 'auditor',
    task: 'Audit and release 0.9.4',
    status: 'done',
    tokens: 41200,
    duration: '25.6 s',
    children: [
      { id: 'diff', name: 'diff-reader', task: 'Summarise 84 changed files', status: 'done', tokens: 18400, duration: '4.1 s' },
      {
        id: 'a11y',
        name: 'a11y-runner',
        task: 'Run and interpret the axe suite',
        status: 'failed',
        tokens: 9600,
        duration: '12.4 s',
        children: [
          { id: 'contrast', name: 'contrast-checker', task: 'Re-measure switch thumb on --secondary', status: 'done', tokens: 2100, duration: '0.8 s' },
        ],
      },
      { id: 'notes', name: 'notes-writer', task: 'Draft notes from the diff summary', status: 'done', tokens: 12300, duration: '6.2 s' },
    ],
  },
]

const HANDOFFS: Handoff[] = [
  { id: 'h1', to: 'diff-reader', reason: 'Diff is 2 118 lines — too large for the planner context.', at: '14:02:11' },
  { id: 'h2', to: 'a11y-runner', reason: 'Suite needs the sandbox shell, which the planner cannot call.', at: '14:02:19' },
  { id: 'h3', to: 'Grace Hopper', human: true, reason: 'Contrast failure is a design decision, not a bug the agent may decide.', at: '14:02:34', failed: true },
  { id: 'h4', to: 'notes-writer', reason: 'Maintainer approved the wording; drafting resumed.', at: '14:02:48' },
]

/**
 * Spans carry the step they belong to so the waterfall fills in as the run
 * advances, instead of showing a finished trace beside a run that has not
 * started.
 */
const SPANS: { step: number; span: TraceSpan }[] = [
  { step: 0, span: { id: 's1', name: 'read_file · package.json', start: 120, duration: 240, kind: 'tool' } },
  { step: 1, span: { id: 's2', name: 'git_diff v0.9.3..HEAD', start: 380, duration: 1420, kind: 'tool', meta: '84 files' } },
  { step: 2, span: { id: 's3', name: 'grep breaking-change markers', start: 1820, duration: 380, kind: 'tool' } },
  {
    step: 3,
    span: {
      id: 's4', name: 'bash · vitest run a11y', start: 2240, duration: 12400, kind: 'tool', error: true, meta: '1 failure',
      children: [
        { id: 's4a', name: 'install deps (cached)', start: 2260, duration: 640, kind: 'tool' },
        { id: 's4b', name: 'axe sweep · 214 cases', start: 2920, duration: 11600, kind: 'tool', error: true },
      ],
    },
  },
  { step: 4, span: { id: 's5', name: 'handoff · human review', start: 14700, duration: 4100, kind: 'guard' } },
  {
    step: 5,
    span: {
      id: 's6', name: 'notes-writer · draft', start: 18860, duration: 6200, kind: 'model', meta: '1 480 out',
      children: [
        { id: 's6a', name: 'retrieve changelog precedent', start: 18900, duration: 820, kind: 'retrieval' },
        { id: 's6b', name: 'guardrail · unverified claims', start: 24200, duration: 310, kind: 'guard', error: true },
      ],
    },
  },
  { step: 6, span: { id: 's7', name: 'github_pr · open #412', start: 25120, duration: 900, kind: 'tool' } },
]

const SANDBOX: SandboxScope[] = [
  {
    id: 'fs',
    kind: 'filesystem',
    mode: 'allowlist',
    label: 'Repository checkout',
    description: 'The agent edits in a throwaway clone, never the maintainer’s working tree.',
    allow: ['/workspace/ui-kit/**', '/tmp/agent-scratch/**'],
    deny: ['**/.env', '**/.git/config', '~/.ssh/**'],
    enabled: true,
  },
  {
    id: 'net',
    kind: 'network',
    mode: 'allowlist',
    label: 'Outbound network',
    description: 'Registry and GitHub only — anything else is a supply-chain surprise.',
    allow: ['api.github.com', 'registry.npmjs.org'],
    deny: ['*.ngrok.io', '169.254.169.254'],
    enabled: true,
  },
  {
    id: 'exec',
    kind: 'exec',
    mode: 'allowlist',
    label: 'Shell',
    description: 'Test and build commands. `git push` is deliberately absent — a human tags releases.',
    allow: ['node', 'pnpm', 'vitest', 'git'],
    deny: ['curl', 'sudo', 'rm'],
    enabled: true,
  },
]

const SEED_MEMORY: MemoryEntry[] = [
  { id: 'm1', kind: 'convention', source: 'CONTRIBUTING.md', at: '2026-06-02', importance: 0.9, pinned: true, content: 'Release notes lead with breaking changes, then additions, then fixes. Never a bare commit list.' },
  { id: 'm2', kind: 'preference', source: 'Grace Hopper', at: '2026-07-18', importance: 0.8, pinned: true, content: 'Grace reviews anything that touches contrast tokens. Do not merge a colour change without her.' },
  { id: 'm3', kind: 'fact', source: 'run 0.9.2', at: '2026-08-11', importance: 0.6, content: 'The a11y suite needs `pnpm build:tokens` first, or 40 cases fail on missing CSS variables.' },
  { id: 'm4', kind: 'fact', source: 'run 0.9.3', at: '2026-08-24', importance: 0.5, content: 'Vitest in the sandbox is capped at 4 workers; more and the container is OOM-killed.' },
  { id: 'm5', kind: 'correction', source: 'Ada Lovelace', at: '2026-09-01', importance: 0.7, content: 'The kit ships one package, not a monorepo of scoped packages. Stop writing per-package sections.' },
]

const CONTEXT_LIMIT = 200_000

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  return `${Math.floor(seconds / 60)}m ${String(Math.floor(seconds % 60)).padStart(2, '0')}s`
}

const money = (value: number) => `$${value.toFixed(2)}`

function AgentStudio() {
  const [section, setSection] = useState('run')
  const [model, setModel] = useState('claude-opus-4-6')
  const [agent, setAgent] = useState('auditor')
  const [enabledAgents, setEnabledAgents] = useState<string[]>(['auditor', 'triager'])
  const [tools, setTools] = useState<string[]>([
    'read_file', 'grep', 'git_diff', 'git_blame', 'bash', 'github_pr',
  ])
  const [scopes, setScopes] = useState(SANDBOX)
  const [memory, setMemory] = useState(SEED_MEMORY)
  const [subagent, setSubagent] = useState('a11y')
  const [status, setStatus] = useState<RunStatus>('idle')
  const [step, setStep] = useState(0)

  // A step whose tool has been switched off is skipped rather than run, so the
  // picker and the transcript can never disagree about what the agent may do.
  const runnable = (index: number) => {
    const tool = STEPS[index]?.tool
    return !tool || tools.includes(tool)
  }

  // The clock is a stand-in for a real run: one step lands every 900 ms so the
  // steps, trace, budgets and guardrails all move from a single source.
  // Both transitions happen inside the timer rather than in the effect body: a
  // synchronous setState in an effect just starts another render pass.
  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, STEPS.length))
      if (step + 1 >= STEPS.length) setStatus('done')
    }, 900)
    return () => window.clearTimeout(timer)
  }, [status, step])

  // Stopping is a state of its own, not an instant reset — the point of the
  // transport bar is that a wedged run still shows what it was doing.
  useEffect(() => {
    if (status !== 'stopping') return
    const timer = window.setTimeout(() => setStatus('done'), 500)
    return () => window.clearTimeout(timer)
  }, [status])

  const elapsed = STEPS.slice(0, step).reduce(
    (total, item, index) => total + (runnable(index) ? item.duration : 0),
    0,
  )
  const tokensUsed = 12_400 + step * 9_600
  const spend = 0.42 + step * 0.31

  function stepStatus(index: number): AgentStepStatus {
    if (!runnable(index)) return 'skipped'
    if (index < step) return index === 3 && status !== 'idle' ? 'failed' : 'done'
    if (index === step && status === 'running') return 'running'
    return 'pending'
  }

  const steps: AgentStep[] = STEPS.map((item, index) => ({
    id: item.id,
    label: item.label,
    status: stepStatus(index),
    duration: index < step && runnable(index) ? item.duration : undefined,
    detail: !runnable(index)
      ? `Skipped — ${item.tool} is switched off for this agent.`
      : index < step
        ? item.detail
        : undefined,
  }))

  const tasks: AgentTask[] = PLAN.map((task) => {
    const state: AgentTaskStatus =
      step > task.to ? 'done' : step >= task.from ? (status === 'idle' ? 'pending' : 'active') : 'pending'
    return {
      id: task.id,
      title: task.title,
      status: state,
      note: task.note,
      steps: STEPS.slice(task.from, task.to + 1).map((item, offset) => ({
        id: item.id,
        title: item.label,
        status: (() => {
          const index = task.from + offset
          if (!runnable(index)) return 'skipped' as const
          if (index < step) return 'done' as const
          if (index === step && status === 'running') return 'active' as const
          return 'pending' as const
        })(),
      })),
    }
  })

  const guardrails: Guardrail[] = GUARDRAILS.map(({ after, outcome, ...rest }) => ({
    ...rest,
    outcome: step > after ? outcome : 'pending',
    detail: step > after ? rest.detail : 'Runs later in this pass.',
  }))

  const spans: TraceSpan[] = [
    {
      id: 'root',
      name: 'audit_release',
      start: 0,
      duration: Math.max(elapsed, 400),
      kind: 'model',
      meta: MODELS.find((entry) => entry.id === model)?.name,
      children: SPANS.filter((entry) => entry.step < step).map((entry) => entry.span),
    },
  ]

  const selected = AGENTS.find((entry) => entry.id === agent) ?? AGENTS[0]

  const content: Record<string, ReactNode> = {
    build: (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {AGENTS.map((entry) => (
            <AgentCard
              key={entry.id}
              name={entry.name}
              description={entry.description}
              model={MODELS.find((m) => m.id === model)?.name ?? model}
              tools={entry.id === agent ? tools : entry.tools}
              temperature={entry.temperature}
              status={entry.id === agent && status === 'running' ? 'running' : entry.id === 'scribe' ? 'draft' : 'idle'}
              icon={<Sparkles />}
              selected={entry.id === agent}
              onSelect={() => setAgent(entry.id)}
              enabled={enabledAgents.includes(entry.id)}
              onToggle={(next) =>
                setEnabledAgents((current) =>
                  next ? [...current, entry.id] : current.filter((id) => id !== entry.id),
                )
              }
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ToolPicker
            tools={TOOLS}
            value={tools}
            onValueChange={setTools}
            summary={(enabled, total) => `${enabled} of ${total} available to ${selected.name}`}
          />
          <AgentTasks tasks={tasks} label={`Plan for ${selected.name}`} />
        </div>
      </div>
    ),
    run: (
      <div className="space-y-6">
        <AgentSteps title="Transcript" steps={steps} defaultExpanded={['a11y']} />
        <div className="grid gap-4 xl:grid-cols-2">
          <SubagentTree
            agents={SUBAGENTS}
            selectedId={subagent}
            onSelect={(node) => setSubagent(node.id)}
          />
          <div className="space-y-4">
            <HandoffTrail handoffs={HANDOFFS} live={status === 'running'} />
            <Card size="sm">
              <CardHeader size="sm">
                <CardTitle as="h2">Selected subagent</CardTitle>
                <CardDescription>Pick a node on the left to inspect it.</CardDescription>
              </CardHeader>
              <CardBody size="sm" className="space-y-2 text-sm">
                <p className="font-mono text-xs">{subagent}</p>
                <p className="text-muted-foreground">
                  {subagent === 'a11y'
                    ? 'Owns the sandbox shell. Its one failure is what forced the human handoff.'
                    : subagent === 'diff'
                      ? 'Reads the diff so the planner never has to hold 2 118 lines in context.'
                      : subagent === 'notes'
                        ? 'Writes from the diff summary only — it never sees the raw patch.'
                        : subagent === 'contrast'
                          ? 'Re-measures the switch thumb against the secondary track. 2.9:1.'
                          : 'The planner. Spawns everything else and owns the final answer.'}
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    ),
    trace: (
      <div className="space-y-6">
        <TraceWaterfall
          spans={spans}
          total={Math.max(elapsed, 400)}
          defaultDepth={2}
          formatDuration={formatDuration}
          nameWidth={260}
          emptyLabel="Nothing traced yet — start the run."
        />
        <Card>
          <CardHeader>
            <CardTitle as="h2">Where the time went</CardTitle>
            <CardDescription>
              The shell span dominates: 12.4 s of a {formatDuration(Math.max(elapsed, 400))} run is
              one vitest invocation.
            </CardDescription>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            <Badge color="blue" size="sm">model 6.2 s</Badge>
            <Badge color="violet" size="sm">tools 15.3 s</Badge>
            <Badge color="amber" size="sm">guards 4.4 s</Badge>
            <Badge color="cyan" size="sm">retrieval 0.8 s</Badge>
          </CardBody>
        </Card>
      </div>
    ),
    memory: (
      <AgentMemory
        entries={memory}
        onPin={(id, pinned) =>
          setMemory((current) => current.map((entry) => (entry.id === id ? { ...entry, pinned } : entry)))
        }
        onForget={(id) => setMemory((current) => current.filter((entry) => entry.id !== id))}
        searchPlaceholder="Search what the agent remembers…"
      />
    ),
    policy: (
      <div className="space-y-6">
        <SandboxPolicy
          scopes={scopes}
          onToggle={(id, enabled) =>
            setScopes((current) => current.map((scope) => (scope.id === id ? { ...scope, enabled } : scope)))
          }
        />
        <GuardrailList
          guardrails={guardrails}
          summary={(counts) =>
            `${counts.pass} passed · ${counts.warn} warned · ${counts.block} blocked · ${counts.pending} pending`
          }
        />
      </div>
    ),
  }

  return (
    <AppFrame
      inset
      product="Agent Studio"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title={SECTION_TITLE[section]}
      user={{ name: 'Ada Lovelace', plan: 'Workspace owner' }}
      actions={
        <div className="flex items-center gap-2">
          <Badge size="sm" color={enabledAgents.includes(agent) ? 'green' : 'neutral'}>
            {enabledAgents.includes(agent) ? 'enabled' : 'paused'}
          </Badge>
          <Button size="sm" variant="secondary" onClick={() => setSection('trace')}>
            <ListChecks /> View trace
          </Button>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <TokenUsage used={tokensUsed} limit={CONTEXT_LIMIT} label="Context" size="default" />

          <BudgetGuard
            budgets={[
              { id: 'spend', label: 'Spend', used: spend, soft: 2.5, hard: 4, format: money, note: 'Per run, billed to the platform team.' },
              { id: 'tokens', label: 'Tokens', used: tokensUsed, soft: 120_000, hard: CONTEXT_LIMIT, format: (value) => `${Math.round(value / 1000)}k` },
              { id: 'wall', label: 'Wall clock', used: elapsed / 1000, soft: 60, hard: 180, format: (value) => `${Math.round(value)}s` },
              { id: 'tools', label: 'Tool calls', used: step * 2, soft: 20, hard: 40 },
            ]}
          />

          <GuardrailList guardrails={guardrails} label="Live guardrails" />
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* The transport bar stays put across sections: whichever panel you are
            looking at, the run is the thing you are looking at it about. */}
        <RunControls
          status={status}
          step={step}
          totalSteps={STEPS.length}
          elapsed={formatDuration(elapsed)}
          onStart={() => setStatus('running')}
          onPause={() => setStatus('paused')}
          onResume={() => setStatus('running')}
          onStep={() => {
            setStep((current) => Math.min(current + 1, STEPS.length))
            if (step + 1 >= STEPS.length) setStatus('done')
          }}
          onStop={() => setStatus('stopping')}
          onReplay={() => {
            setStep(0)
            setStatus('idle')
          }}
        >
          <ModelSelect
            models={MODELS}
            value={model}
            onValueChange={setModel}
            variant="secondary"
            triggerClassName="w-44"
          />
        </RunControls>

        {content[section]}
      </div>
    </AppFrame>
  )
}

export const agentStudioExample: ExampleEntry = {
  id: 'agent-studio',
  label: 'Agent Studio',
  description:
    'Build one agent and watch it run: pick its tools and a tool switches off mid-plan, drive the transport bar and the transcript, trace, budgets and guardrails all advance together.',
  uses: [
    'Agent Card', 'Run Controls', 'Agent Steps', 'Agent Tasks', 'Tool Picker',
    'Trace Waterfall', 'Subagent Tree', 'Handoff Trail', 'Guardrail List',
    'Sandbox Policy', 'Budget Guard', 'Agent Memory', 'Model Select', 'Token Usage',
  ],
  render: () => <AgentStudio />,
}
