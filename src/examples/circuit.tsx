'use client'

import { createContext, use, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import {
  ArrowLeft, Blocks, Cable, Database, GitBranch, Globe, Inbox, Mail, MessageSquare,
  Play, Plug, RotateCw, Sparkles, Timer, Trash2, Workflow, Zap,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { CronSchedule } from '@/components/ui/cron-schedule'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { DiffProposal } from '@/components/ui/diff-proposal'
import { parseUnifiedDiff } from '@/components/ui/diff-view'
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Drawer, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Empty } from '@/components/ui/empty'
import { EventStream } from '@/components/ui/event-stream'
import { Fmt } from '@/components/ui/fmt'
import { Kbd } from '@/components/ui/kbd'
import { Message, MessagePending } from '@/components/ui/message'
import {
  NodeCanvas, NodePalette, type CanvasEdge, type CanvasNode, type CanvasNodeProps, type NodeTypes,
} from '@/components/ui/node-canvas'
import { Pipeline } from '@/components/ui/pipeline'
import { PromptInput } from '@/components/ui/prompt-input'
import { RetryPolicy } from '@/components/ui/retry-policy'
import { RunControls } from '@/components/ui/run-controls'
import {
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Select } from '@/components/ui/select'
import { Stat } from '@/components/ui/stat'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Suggestions } from '@/components/ui/suggestions'
import { ToolCall } from '@/components/ui/tool-call'
import { Tooltip } from '@/components/ui/tooltip'
import {
  Page, PageHead, Section, SelectField, Shell, TextField, useNotify, useRoute,
  type Crumb, type Nav,
} from './shell'
import {
  CONNECTIONS, FLOWS, FLOW_EDGES, FLOW_NODES, NOW, PALETTE, PROPOSED_PATCH, RUNS, RUN_ERROR,
  RUN_EVENTS, RUN_STAGES, SCHEDULES, SUGGESTIONS, TEMPLATES,
  type Connection, type Flow, type Run, type StepData,
} from './circuit-data'
import type { ExampleEntry } from './types'

/**
 * Circuit — a workflow builder, and an agent that edits the workflow.
 *
 * The canvas is the product, so the copilot is not a panel bolted to the side
 * of it: the graph lives above both, the rail proposes changes to it as a diff,
 * and accepting one moves nodes on the canvas behind the panel. An assistant
 * that can only talk about the thing you are editing is a chat window; this one
 * has hands.
 */

/* ------------------------------------------------------------- node drawing */

const KINDS: Record<
  string,
  { label: string; tone: 'blue' | 'violet' | 'amber' | 'green' | 'cyan' | 'rose' | 'neutral'; icon: typeof Zap }
> = {
  trigger: { label: 'Trigger', tone: 'blue', icon: Zap },
  branch: { label: 'Branch', tone: 'amber', icon: GitBranch },
  http: { label: 'HTTP', tone: 'violet', icon: Globe },
  db: { label: 'Database', tone: 'cyan', icon: Database },
  email: { label: 'Email', tone: 'green', icon: Mail },
  queue: { label: 'Queue', tone: 'rose', icon: Inbox },
  slack: { label: 'Slack', tone: 'violet', icon: MessageSquare },
  delay: { label: 'Delay', tone: 'neutral', icon: Timer },
  retry: { label: 'Retry', tone: 'amber', icon: RotateCw },
}

/**
 * A step, as a registered node type.
 *
 * The graph carries `type: 'step'` and a kind in `data` — nothing about how a
 * step looks. That is what lets the same nodes come back from the server, or
 * out of `JSON.stringify`, and still render.
 */
function StepNode({ node }: CanvasNodeProps) {
  const data = node.data as StepData
  const kind = KINDS[data?.kind] ?? KINDS.http
  const Icon = kind.icon

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        <Badge size="sm" color={kind.tone}>
          <Icon className="size-3" />
          {kind.label}
        </Badge>
      </span>
      <p className="text-sm leading-snug font-medium">{node.label}</p>
      {data?.meta && (
        <p className="text-muted-foreground/80 truncate font-mono text-[10px]">{data.meta}</p>
      )}
    </div>
  )
}

/** A note. Draggable anywhere, because nothing in it is interactive. */
function NoteNode({ node }: CanvasNodeProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Badge size="sm" color="neutral">
        Note
      </Badge>
      <p className="text-muted-foreground text-xs leading-relaxed">{String(node.data ?? '')}</p>
    </div>
  )
}

// Declared at module scope on purpose: a component created during render is a
// new component type every render, so React would remount every node on every
// pan and take the focus out of whatever you were typing in.
const NODE_TYPES: NodeTypes = { step: StepNode, note: NoteNode }

const NEW_STEP: Record<string, { label: string; meta: string }> = {
  http: { label: 'HTTP request', meta: 'GET /' },
  branch: { label: 'Branch', meta: 'condition' },
  delay: { label: 'Delay', meta: 'wait 30s' },
  db: { label: 'Database write', meta: 'insert · table' },
  slack: { label: 'Slack message', meta: '#channel' },
  retry: { label: 'Retry', meta: '3 attempts · exponential' },
}

/* -------------------------------------------------------------- the graph */

type Point = { x: number; y: number }

type GraphValue = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  selected: string | null
  setNodes: Dispatch<SetStateAction<CanvasNode[]>>
  setEdges: Dispatch<SetStateAction<CanvasEdge[]>>
  setSelected: (id: string | null) => void
  addStep: (kind: string, position: Point, from?: string) => void
}

const GraphContext = createContext<GraphValue | null>(null)

function useGraph() {
  const value = use(GraphContext)
  if (!value) throw new Error('Must be used inside the Circuit graph')
  return value
}

/**
 * The document, held above the chrome.
 *
 * The editor changes the graph when you drag; the copilot changes it when you
 * accept a proposal. They are in different halves of the shell — one is the
 * content, the other is the rail — so neither can own it, and it sits outside
 * both. This provider is deliberately above `Shell`: it needs `useState` and
 * nothing else, while everything that reads it also needs the route.
 */
function GraphProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState(FLOW_NODES)
  const [edges, setEdges] = useState(FLOW_EDGES)
  const [selected, setSelected] = useState<string | null>('score')

  const value = useMemo<GraphValue>(() => {
    function addStep(kind: string, position: Point, from?: string) {
      const id = `${kind}-${Date.now()}`
      const spec = NEW_STEP[kind]

      setNodes((current) => [
        ...current,
        kind === 'note'
          ? { id, x: position.x, y: position.y, type: 'note', width: 220, data: 'Say why this branch exists.' }
          : {
              id,
              x: position.x,
              y: position.y,
              type: 'step',
              label: spec?.label ?? 'Step',
              data: { kind, meta: spec?.meta },
            },
      ])
      if (from) setEdges((current) => [...current, { id: `e-${id}`, from, to: id }])
      setSelected(id)
    }

    return { nodes, edges, selected, setNodes, setEdges, setSelected, addStep }
  }, [nodes, edges, selected])

  return <GraphContext value={value}>{children}</GraphContext>
}

/* ------------------------------------------------------------------ copilot */

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  body?: string
  tool?: { name: string; summary: string; output: string }
  /** Renders the patch, and accepting it applies the steps to the graph. */
  proposal?: boolean
  /** What the assistant changed on its own, and the way back. */
  applied?: { note: string; undo: () => void }
  link?: { label: string; onSelect: () => void }
}

const SEED: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    body: 'I have read this flow. Six of the last 4,128 runs failed, all of them on the same step — ask me about it, or tell me what to change.',
    tool: {
      name: 'flow.read',
      summary: 'order-paid · v7 · 6 steps',
      output: '{\n  "flow": "order-paid",\n  "version": 7,\n  "steps": 6,\n  "failures_7d": 6,\n  "all_at": "score"\n}',
    },
  },
]

/**
 * The rail.
 *
 * It does not own the graph — `CircuitBody` does — because a suggestion that
 * cannot be applied is a suggestion nobody wanted. Everything the copilot
 * offers here ends in a call to one of these setters.
 */
function Copilot() {
  const notify = useNotify()
  const { route, open } = useRoute()
  const { nodes, selected, setNodes, setEdges, setSelected } = useGraph()
  const [messages, setMessages] = useState<ChatMessage[]>(SEED)
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [decision, setDecision] = useState<'accepted' | 'rejected'>()

  const node = nodes.find((entry) => entry.id === selected)
  const flowName =
    FLOWS.find((flow) => flow.id === route.record)?.name ?? 'Order paid → fulfilment'

  /** Adds the copilot's steps, and hands back the way to take them out again. */
  function onAddSteps(steps: { node: CanvasNode; from?: string }[]) {
    const ids = steps.map((step) => step.node.id)

    setNodes((current) => [...current, ...steps.map((step) => step.node)])
    setEdges((current) => [
      ...current,
      ...steps
        .filter((step) => step.from)
        .map((step) => ({
          id: `e-${step.node.id}`,
          from: step.from as string,
          to: step.node.id,
          dashed: true,
        })),
    ])
    setSelected(ids[0])

    // An edit made from the rail is still an edit; if the canvas is not on
    // screen, go and show what moved.
    if (route.section !== 'flows' || !route.record) open('flows', 'order-paid')

    return () => {
      setNodes((current) => current.filter((entry) => !ids.includes(entry.id)))
      setEdges((current) =>
        current.filter((edge) => !ids.includes(edge.to) && !ids.includes(edge.from)),
      )
      setSelected(null)
    }
  }

  // What the model is looking at, stated rather than implied. The flow is
  // always in scope; the selected step joins it when there is one.
  const context = [
    { id: 'flow', label: flowName, icon: <Workflow />, detail: 'flow' },
    ...(node
      ? [{ id: 'node', label: String(node.label ?? node.id), icon: <Blocks />, detail: 'step' }]
      : []),
  ]

  function reply(prompt: string) {
    const text = prompt.toLowerCase()
    const id = `m${Date.now()}`

    if (/retry|timeout|resilien|survive|flak/.test(text)) {
      return {
        id,
        role: 'assistant' as const,
        body: 'The fraud call has a 30 second timeout and no retry, so one slow response ends the run. Three attempts with exponential backoff covers it, and a Slack message covers the case where backoff is not enough.',
        proposal: true,
      }
    }

    if (/slack|alert|notify|tell|ops/.test(text)) {
      const undo = onAddSteps([
        {
          node: {
            id: `alert-${Date.now()}`,
            x: 430,
            y: 430,
            type: 'step',
            label: 'Alert #ops',
            data: { kind: 'slack', meta: '#ops-alerts' },
          },
          from: 'review',
        },
      ])
      return {
        id,
        role: 'assistant' as const,
        body: 'Added a Slack step to the review queue. It posts the run id and the order, so whoever is on call can open the flagged order without asking which one it was.',
        applied: { note: 'Added 1 step · Alert #ops', undo },
      }
    }

    if (/fail|why|error|broke|r-88214/.test(text)) {
      return {
        id,
        role: 'assistant' as const,
        body: 'r-88214 stopped at “Score for fraud”. The request to /fraud/score hit its 30 second timeout, and because the step has no retry policy the run ended there — the fulfilment row was never written and the customer was never emailed.',
        tool: {
          name: 'run.read',
          summary: 'r-88214 · failed at score',
          output: '{\n  "run": "r-88214",\n  "failed_at": "score",\n  "error": "ETIMEDOUT",\n  "after": "30s",\n  "attempts": 1,\n  "downstream": "skipped"\n}',
        },
        link: { label: 'Open r-88214', onSelect: () => open('runs', 'r-88214') },
      }
    }

    if (/cost|spend|price|bill/.test(text)) {
      return {
        id,
        role: 'assistant' as const,
        body: 'About £41 a week. The database write and the email are free at this volume; the fraud call is 4,128 requests at £0.01, and the six that timed out were billed too — a retry would add roughly £0.18 a week.',
      }
    }

    return {
      id,
      role: 'assistant' as const,
      body: 'I can read this flow and edit it. Try asking why a run failed, or tell me to make a step survive a timeout — I will show you the change as a diff before anything moves.',
    }
  }

  function send(prompt: string) {
    const value = prompt.trim()
    if (!value || thinking) return

    setMessages((current) => [...current, { id: `u${Date.now()}`, role: 'user', body: value }])
    setDraft('')
    setThinking(true)

    // A real answer would stream. This one waits long enough that the pending
    // state is visible, which is the part worth showing.
    setTimeout(() => {
      // Built before the updater, never inside it. `reply` edits the graph for
      // some prompts, and React calls an updater twice in development to catch
      // exactly this — the Slack step was being added twice, and Undo could
      // only take one of them back.
      const answer = reply(value)
      setMessages((current) => [...current, answer])
      setThinking(false)
    }, 900)
  }

  return (
    <>
      <div className="border-border flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-3.5" />
          Copilot
        </span>
        <Tooltip content="Start over">
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="New conversation"
            onClick={() => {
              setMessages(SEED)
              setDecision(undefined)
            }}
          >
            <RotateCw />
          </Button>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {messages.map((message) => (
          <Message
            key={message.id}
            role={message.role}
            name={message.role === 'user' ? 'You' : 'Copilot'}
            avatar={message.role === 'user' ? <Avatar size="xs" name="Ada Lovelace" /> : undefined}
            copyText={message.body}
            onCopy={message.role === 'assistant' ? () => {} : undefined}
          >
            {message.tool && (
              <ToolCall
                name={message.tool.name}
                summary={message.tool.summary}
                output={message.tool.output}
                className="mb-2"
              />
            )}

            {message.body}

            {message.proposal && (
              <DiffProposal
                className="mt-3"
                title="Retry the fraud call, then tell someone"
                rationale="Two steps and one edge. The retry sits between the call and everything downstream, so nothing else has to change."
                file={{ path: 'flows/order-paid.yaml', status: 'modified', hunks: parseUnifiedDiff(PROPOSED_PATCH) }}
                decision={decision}
                onDecide={(next) => {
                  setDecision(next)
                  if (next === 'rejected') {
                    notify('Left alone', 'The flow is unchanged.')
                    return
                  }
                  onAddSteps([
                    {
                      node: {
                        id: 'retry_score',
                        x: 660,
                        y: 420,
                        type: 'step',
                        label: 'Retry the call',
                        data: { kind: 'retry', meta: '3 attempts · exponential' },
                      },
                      from: 'score',
                    },
                    {
                      node: {
                        id: 'alert_ops',
                        x: 890,
                        y: 420,
                        type: 'step',
                        label: 'Alert #ops',
                        data: { kind: 'slack', meta: '#ops-alerts' },
                      },
                      from: 'retry_score',
                    },
                  ])
                  notify('Applied to the canvas', 'Two steps added. Publish to make it live.', 'green')
                }}
              />
            )}

            {message.applied && (
              <span className="mt-2 flex flex-wrap items-center gap-2">
                <Badge size="sm" color="green">
                  {message.applied.note}
                </Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    message.applied?.undo()
                    notify('Reverted', 'The canvas is back where it was.')
                  }}
                >
                  Undo
                </Button>
              </span>
            )}

            {message.link && (
              <span className="mt-2 block">
                <Button size="xs" variant="secondary" onClick={message.link.onSelect}>
                  {message.link.label}
                </Button>
              </span>
            )}
          </Message>
        ))}

        {thinking && <MessagePending label="Reading the flow" />}
      </div>

      <div className="border-border flex shrink-0 flex-col gap-2 border-t p-3">
        <Suggestions items={SUGGESTIONS} onSelect={send} />
        <PromptInput
          value={draft}
          onValueChange={setDraft}
          onSubmit={send}
          busy={thinking}
          context={context}
          placeholder="Ask about this flow, or tell me to change it…"
        />
      </div>
    </>
  )
}

/* -------------------------------------------------------------------- flows */

const FLOW_TONE = {
  live: 'green',
  paused: 'amber',
  draft: 'neutral',
} as const

const TRIGGER_LABEL: Record<Flow['trigger'], string> = {
  webhook: 'Webhook',
  schedule: 'Schedule',
  event: 'Event',
  manual: 'Manual',
}

function Flows({ onNew }: { onNew: () => void }) {
  const { open } = useRoute()

  const live = FLOWS.filter((flow) => flow.status === 'live')
  const runs = FLOWS.reduce((total, flow) => total + flow.runs7d, 0)
  const failures = FLOWS.reduce((total, flow) => total + flow.failures7d, 0)

  const columns: Column<Flow>[] = [
    {
      key: 'name',
      header: 'Flow',
      render: (flow) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">{flow.name}</span>
          <span className="text-muted-foreground truncate text-xs">{flow.description}</span>
        </span>
      ),
    },
    {
      key: 'trigger',
      header: 'Trigger',
      hideOnMobile: true,
      render: (flow) => (
        <span className="text-muted-foreground text-xs">{TRIGGER_LABEL[flow.trigger]}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (flow) => (
        <Badge size="sm" color={FLOW_TONE[flow.status]}>
          {flow.status}
        </Badge>
      ),
    },
    {
      key: 'runs7d',
      header: 'Runs (7d)',
      align: 'end',
      sortValue: (flow) => flow.runs7d,
      render: (flow) => (
        <span className="tabular-nums">
          <Fmt type="number" value={flow.runs7d} />
        </span>
      ),
    },
    {
      key: 'failures7d',
      header: 'Failed',
      align: 'end',
      hideOnMobile: true,
      sortValue: (flow) => flow.failures7d,
      render: (flow) => (
        <span
          className={
            flow.failures7d > 0 ? 'text-[var(--destructive-soft-foreground)] tabular-nums' : 'text-muted-foreground tabular-nums'
          }
        >
          {flow.failures7d}
        </span>
      ),
    },
    {
      key: 'lastRun',
      header: 'Last run',
      align: 'end',
      hideOnMobile: true,
      render: (flow) => <span className="text-muted-foreground text-xs">{flow.lastRun}</span>,
    },
  ]

  return (
    <Page>
      <PageHead
        title="Flows"
        description="Five flows, one of them still in the editor. Open one to see the graph it runs."
        actions={
          <Button size="sm" onClick={onNew}>
            <Workflow /> New flow
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Live" value={live.length} hint={`of ${FLOWS.length} flows`} />
        <Stat label="Runs" value={runs} hint="Last 7 days" delta={9.2} />
        <Stat label="Failed" value={failures} goodDirection="down" delta={4} deltaSuffix="" hint="All on one step" />
        <Stat
          label="Success rate"
          value={<Fmt type="percent" value={(runs - failures) / runs} decimals={2} animate />}
          hint="Last 7 days"
        />
      </div>

      <DataGrid
        rows={FLOWS}
        columns={columns}
        rowKey={(flow) => flow.id}
        onRowClick={(flow) => open('flows', flow.id)}
        empty={<Empty bordered={false} icon={<Workflow />} title="No flows yet" />}
      />

      <Section
        title="On a schedule"
        description="The two flows nothing triggers but the clock."
      >
        <CronSchedule jobs={SCHEDULES} now={NOW} />
      </Section>
    </Page>
  )
}

/* ------------------------------------------------------------------- editor */

/**
 * The editor: a palette, a canvas, and whatever the selection wants to say.
 *
 * The copilot is not here — it is the shell's right rail, because it is the
 * product's assistant rather than this page's. The graph lives above both.
 */
function FlowEditor({ flow }: { flow: Flow }) {
  const notify = useNotify()
  const { nodes, edges, selected, setNodes, setEdges, setSelected, addStep } = useGraph()
  const [test, setTest] = useState(false)
  const [publish, setPublish] = useState(false)
  const [version, setVersion] = useState(flow.version)

  const node = nodes.find((entry) => entry.id === selected)

  function connect(from: string, to: string) {
    setEdges((current) =>
      current.some((edge) => edge.from === from && edge.to === to)
        ? current
        : [...current, { id: `e-${from}-${to}`, from, to }],
    )
  }

  return (
    <Page className="min-h-full">
      <PageHead
        title={flow.name}
        description={flow.description}
        actions={
          <>
            <Badge size="sm" color={FLOW_TONE[flow.status]}>
              v{version} · {flow.status}
            </Badge>
            <Button size="sm" variant="secondary" onClick={() => setTest(true)}>
              <Play /> Test run
            </Button>
            <Button size="sm" onClick={() => setPublish(true)}>
              Publish
            </Button>
          </>
        }
      />

      <div className="flex min-w-0 gap-3">
        {/* The palette is a drag source, so it has to stay on the page rather
            than hide in a menu — you drop a step where you want it, and the
            drop position is the node's position. */}
        <div className="hidden w-40 shrink-0 flex-col gap-2 lg:flex">
          <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
            Steps
          </p>
          <NodePalette
            items={PALETTE}
            onPick={(kind) => addStep(kind, { x: 240, y: 380 })}
          />
          <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
            Drag one onto the canvas, or press <Kbd keys="+" /> on a step to chain the next one.
          </p>
        </div>

        <NodeCanvas
          className="min-w-0 flex-1"
          height={480}
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          selectedId={selected}
          onSelect={setSelected}
          label={`${flow.name} graph`}
          defaultZoom={0.85}
          defaultPan={{ x: 20, y: 24 }}
          snapToGrid
          onNodesChange={setNodes}
          onConnect={connect}
          onDropNode={(kind, position) => addStep(kind, position)}
          onAddNode={(position) => addStep('http', position)}
          onAddConnected={(from, position) => addStep('http', position, from)}
          onRemoveNode={(id) => {
            setNodes((current) => current.filter((entry) => entry.id !== id))
            setEdges((current) => current.filter((edge) => edge.from !== id && edge.to !== id))
          }}
          onRemoveEdge={(id) => setEdges((current) => current.filter((edge) => edge.id !== id))}
        />
      </div>

      {node ? (
        <StepInspector
          key={node.id}
          node={node}
          onRename={(label) =>
            setNodes((current) =>
              current.map((entry) => (entry.id === node.id ? { ...entry, label } : entry)),
            )
          }
        />
      ) : (
        <Empty
          icon={<Blocks />}
          title="Nothing selected"
          description="Pick a step on the canvas to configure it, or drag a new one in from the left."
        />
      )}

      <Drawer open={test} onOpenChange={setTest}>
        <DrawerHeader>
          <DrawerTitle>Test run · {flow.name}</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 pb-2">
          <Alert color="amber" size="sm" title="Sandbox">
            Connections are stubbed. The database write returns a fake row id and no email leaves the
            building.
          </Alert>
          <Pipeline stages={RUN_STAGES} />
        </div>
      </Drawer>

      <AlertDialog open={publish} onOpenChange={setPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish v{version + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              Runs already in flight finish on v{version}. Everything triggered after this uses the
              graph on screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setVersion((current) => current + 1)
                setPublish(false)
                notify('Published', `${flow.name} is live on v${version + 1}.`, 'green')
              }}
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

/**
 * The selected step.
 *
 * A retry step gets `RetryPolicy` rather than three number fields, because the
 * question is never "what is the factor" — it is "how long until it gives up",
 * and only the schedule answers that.
 */
function StepInspector({ node, onRename }: { node: CanvasNode; onRename: (label: string) => void }) {
  const data = node.data as StepData
  const kind = KINDS[data?.kind]

  if (node.type === 'note') {
    return (
      <Section title="Note">
        <Card>
          <CardBody>
            <p className="text-muted-foreground text-sm">{String(node.data ?? '')}</p>
          </CardBody>
        </Card>
      </Section>
    )
  }

  return (
    <Card>
      <CardHeader
        action={
          kind && (
            <Badge size="sm" color={kind.tone}>
              {kind.label}
            </Badge>
          )
        }
      >
        <CardTitle>{String(node.label ?? node.id)}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            description="Shown on the canvas and in every run."
            value={String(node.label ?? '')}
            onChange={(event) => onRename(event.target.value)}
          />
          <TextField
            label="Step id"
            description="Referred to by other steps. Changing it breaks them."
            value={node.id}
            readOnly
          />
        </div>

        {data?.kind === 'http' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Method"
              defaultValue="POST"
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
              ]}
            />
            <TextField label="Timeout" defaultValue="30s" description="Then the step fails." />
          </div>
        )}

        {data?.kind === 'branch' && (
          <TextField
            label="Condition"
            defaultValue={data.meta}
            description="Truthy takes the solid edge; anything else takes the dashed one."
          />
        )}

        {data?.kind === 'retry' && (
          <RetryPolicy
            maxAttempts={3}
            baseDelayMs={500}
            factor={2}
            jitter={0.2}
            attempts={[
              { attempt: 1, outcome: 'failed', error: 'ETIMEDOUT after 30s' },
              { attempt: 2, outcome: 'failed', waitedMs: 500, error: 'ETIMEDOUT after 30s' },
              { attempt: 3, outcome: 'succeeded', waitedMs: 1_000 },
            ]}
          />
        )}

        {data?.kind === 'slack' && (
          <TextField label="Channel" defaultValue={data.meta} description="The bot must already be in it." />
        )}

        <Switch
          size="sm"
          defaultChecked
          label={<span className="text-sm">Record the input and output of this step</span>}
          labelPosition="start"
          containerClassName="w-full justify-between"
        />
      </CardBody>
    </Card>
  )
}

/* --------------------------------------------------------------------- runs */

const RUN_TONE = {
  succeeded: 'green',
  failed: 'destructive',
  running: 'blue',
} as const

function Runs() {
  const { open } = useRoute()
  const [status, setStatus] = useState('all')

  const rows = useMemo(
    () => (status === 'all' ? RUNS : RUNS.filter((run) => run.status === status)),
    [status],
  )

  const columns: Column<Run>[] = [
    {
      key: 'id',
      header: 'Run',
      render: (run) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono font-medium">{run.id}</span>
          <span className="text-muted-foreground truncate text-xs">{run.flow}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (run) => (
        <Badge size="sm" color={RUN_TONE[run.status]}>
          {run.status}
        </Badge>
      ),
    },
    {
      key: 'trigger',
      header: 'Triggered by',
      hideOnMobile: true,
      render: (run) => <span className="text-muted-foreground font-mono text-xs">{run.trigger}</span>,
    },
    {
      key: 'steps',
      header: 'Steps',
      align: 'end',
      hideOnMobile: true,
      sortValue: (run) => run.steps,
      render: (run) => <span className="tabular-nums">{run.steps}</span>,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'end',
      sortValue: (run) => run.duration,
      render: (run) => (
        <span className="tabular-nums">
          <Fmt type="number" value={run.duration} decimals={1} />s
        </span>
      ),
    },
    {
      key: 'started',
      header: 'Started',
      align: 'end',
      hideOnMobile: true,
      render: (run) => <span className="text-muted-foreground text-xs">{run.started}</span>,
    },
  ]

  return (
    <Page>
      <PageHead
        title="Runs"
        description="Every execution, and the one that stopped halfway."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="sm"
            triggerLabel="Status"
            value={status}
            onValueChange={setStatus}
            className="w-auto"
            triggerClassName="w-40"
            options={[
              { value: 'all', label: 'All runs' },
              { value: 'succeeded', label: 'Succeeded' },
              { value: 'failed', label: 'Failed' },
              { value: 'running', label: 'Running' },
            ]}
          />
        </div>
      </PageHead>

      <DataGrid
        rows={rows}
        columns={columns}
        rowKey={(run) => run.id}
        onRowClick={(run) => open('runs', run.id)}
        empty={<Empty bordered={false} icon={<Play />} title="No runs with that status" />}
      />
    </Page>
  )
}

function RunDetail({ run }: { run: Run }) {
  const notify = useNotify()
  const { go, open } = useRoute()
  const failed = run.status === 'failed'

  return (
    <Page>
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-xs" variant="ghost" aria-label="Back to runs" onClick={() => go({ section: 'runs' })}>
              <ArrowLeft />
            </Button>
            <span className="font-mono">{run.id}</span>
            <Badge size="sm" color={RUN_TONE[run.status]}>
              {run.status}
            </Badge>
          </span>
        }
        description={`${run.flow} · triggered by ${run.trigger} · ${run.started}`}
        actions={
          <RunControls
            status={failed ? 'error' : run.status === 'running' ? 'running' : 'done'}
            step={run.steps}
            totalSteps={5}
            elapsed={<Fmt type="duration" value={Math.round(run.duration)} />}
            onReplay={() => notify('Replaying', `${run.id} is running again on v7.`)}
            onStop={() => notify('Stopped', `${run.id} will not continue.`, 'destructive')}
          />
        }
      />

      {failed && (
        <Alert
          color="destructive"
          title="Stopped at “Score for fraud”"
        >
          The request timed out after 30 seconds and the step has no retry policy. Nothing downstream
          ran — no fulfilment row, no email.
        </Alert>
      )}

      <Section title="Stages">
        <Pipeline stages={RUN_STAGES} />
      </Section>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="error">Error</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="pt-4">
          <EventStream events={RUN_EVENTS} height={280} />
        </TabsContent>

        <TabsContent value="error" className="pt-4">
          <CodeBlock
            language="bash"
            filePath="score · attempt 1"
            code={RUN_ERROR}
            footer={
              <Button size="xs" variant="ghost" onClick={() => open('flows', run.flowId)}>
                Open the flow
              </Button>
            }
          />
        </TabsContent>
      </Tabs>
    </Page>
  )
}

/* -------------------------------------------------------------- connections */

const CONNECTION_TONE = {
  connected: 'green',
  expiring: 'amber',
  error: 'destructive',
} as const

function Connections() {
  const notify = useNotify()
  const [disconnect, setDisconnect] = useState<Connection | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  return (
    <Page>
      <PageHead
        title="Connections"
        description="What the flows are allowed to reach, and which of them is about to stop working."
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plug /> Add connection
          </Button>
        }
      />

      <Alert color="amber" size="sm" title="SendGrid expires in 9 days">
        Two live flows send through it. Renewing takes a minute and does not interrupt anything.
      </Alert>

      <Section title="Connected">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Connection</TableHead>
              <TableHead className="hidden sm:table-cell">Account</TableHead>
              <TableHead className="hidden md:table-cell">Scopes</TableHead>
              <TableHead className="text-end">Flows</TableHead>
              <TableHead className="text-end">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {CONNECTIONS.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{connection.name}</span>
                    <span className="text-muted-foreground text-xs">{connection.provider}</span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground hidden font-mono text-xs sm:table-cell">
                  {connection.account}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="flex flex-wrap gap-1">
                    {connection.scopes.map((scope) => (
                      <Badge key={scope} size="sm" color="neutral">
                        {scope}
                      </Badge>
                    ))}
                  </span>
                </TableCell>
                <TableCell className="text-end tabular-nums">{connection.flows}</TableCell>
                <TableCell className="text-end">
                  <Badge size="sm" color={CONNECTION_TONE[connection.status]}>
                    {connection.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  <Tooltip content={`Disconnect ${connection.name}`}>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Disconnect ${connection.name}`}
                      onClick={() => setDisconnect(connection)}
                    >
                      <Trash2 />
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add a connection</SheetTitle>
            <SheetDescription>
              Credentials are stored encrypted and never appear in a run log.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <TextField
              label="Name"
              required
              autoFocus
              value={name}
              placeholder="Warehouse database"
              description="How it appears in the step picker."
              onChange={(event) => setName(event.target.value)}
            />
            <SelectField
              label="Kind"
              defaultValue="http"
              options={[
                { value: 'http', label: 'HTTP endpoint' },
                { value: 'postgres', label: 'PostgreSQL' },
                { value: 'oauth', label: 'OAuth app' },
              ]}
            />
            <TextField label="Base URL" placeholder="https://…" />
          </SheetBody>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name}
              onClick={() => {
                setAdding(false)
                notify('Connection added', `${name} is available to every flow.`, 'green')
                setName('')
              }}
            >
              Add connection
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(disconnect)} onOpenChange={(open) => !open && setDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnect?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnect?.flows} live {disconnect?.flows === 1 ? 'flow uses' : 'flows use'} it. They
              will fail at the first step that needs it, and keep failing until it is reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              onClick={() => {
                notify('Disconnected', `${disconnect?.name} is no longer reachable.`, 'destructive')
                setDisconnect(null)
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

/* ----------------------------------------------------------------- library */

function Library({ onUse }: { onUse: (name: string) => void }) {
  return (
    <Page>
      <PageHead
        title="Library"
        description="Four starting points. Each one opens in the editor with its steps already wired."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader
              action={
                <Badge size="sm" color="neutral">
                  {template.steps} {template.steps === 1 ? 'step' : 'steps'}
                </Badge>
              }
            >
              <CardTitle>{template.name}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-1 flex-col gap-3">
              <p className="text-muted-foreground flex-1 text-sm">{template.description}</p>
              <span className="flex flex-wrap items-center gap-1">
                <Badge size="sm" color="blue">
                  {TRIGGER_LABEL[template.trigger]}
                </Badge>
                {template.uses.map((use) => (
                  <Badge key={use} size="sm" color="neutral">
                    {use}
                  </Badge>
                ))}
              </span>
              <Button size="sm" variant="secondary" onClick={() => onUse(template.name)}>
                Use this template
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}

/* --------------------------------------------------------------------- root */

const NAV_GROUPS = [
  {
    items: [
      { id: 'flows', label: 'Flows', icon: <Workflow />, count: FLOWS.length },
      { id: 'runs', label: 'Runs', icon: <Play />, count: RUNS.length },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'library', label: 'Library', icon: <Blocks />, count: TEMPLATES.length },
      { id: 'connections', label: 'Connections', icon: <Cable />, count: CONNECTIONS.length },
    ],
  },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'Order paid → fulfilment failed', body: 'r-88214 timed out on Score for fraud', at: '2m', unread: true },
  { id: 'n2', title: 'SendGrid expires in 9 days', body: 'Two live flows send through it', at: '3h', unread: true },
  { id: 'n3', title: 'Weekly revenue digest ran', body: '41.8s · posted to #leadership', at: '2d' },
]

const SECTION_LABEL: Record<string, string> = {
  flows: 'Flows',
  runs: 'Runs',
  library: 'Library',
  connections: 'Connections',
}

function commandsFor({ go, open }: Nav) {
  return [
    { id: 'go-flows', label: 'Go to Flows', group: 'Navigate', icon: <Workflow />, onSelect: () => go({ section: 'flows' }) },
    { id: 'go-runs', label: 'Go to Runs', group: 'Navigate', icon: <Play />, onSelect: () => go({ section: 'runs' }) },
    { id: 'go-library', label: 'Go to Library', group: 'Navigate', icon: <Blocks />, onSelect: () => go({ section: 'library' }) },
    { id: 'go-connections', label: 'Go to Connections', group: 'Navigate', icon: <Cable />, onSelect: () => go({ section: 'connections' }) },
    ...FLOWS.map((flow) => ({
      id: `flow-${flow.id}`,
      label: flow.name,
      group: 'Flows',
      keywords: `${flow.id} ${flow.trigger} ${flow.status}`,
      icon: <Workflow />,
      onSelect: () => open('flows', flow.id),
    })),
    ...RUNS.slice(0, 4).map((run) => ({
      id: `run-${run.id}`,
      label: `${run.id} — ${run.flow}`,
      group: 'Runs',
      keywords: `${run.status} ${run.trigger}`,
      icon: <Play />,
      onSelect: () => open('runs', run.id),
    })),
  ]
}

function crumbsFor({ route, go }: Nav): Crumb[] {
  const section = SECTION_LABEL[route.section] ?? 'Circuit'

  if (!route.record) return [{ label: section }]

  const record =
    route.section === 'flows'
      ? FLOWS.find((flow) => flow.id === route.record)?.name
      : RUNS.find((run) => run.id === route.record)?.id

  return [
    { label: section, onClick: () => go({ section: route.section }) },
    { label: record ?? route.record },
  ]
}

/** The content router. */
function CircuitContent({
  onNew,
  onUseTemplate,
}: {
  onNew: () => void
  onUseTemplate: (name: string) => void
}) {
  const { route } = useRoute()

  if (route.record) {
    if (route.section === 'flows') {
      const flow = FLOWS.find((entry) => entry.id === route.record)
      if (flow) return <FlowEditor flow={flow} />
    }
    if (route.section === 'runs') {
      const run = RUNS.find((entry) => entry.id === route.record)
      if (run) return <RunDetail run={run} />
    }
  }

  switch (route.section) {
    case 'runs':
      return <Runs />
    case 'library':
      return <Library onUse={onUseTemplate} />
    case 'connections':
      return <Connections />
    default:
      return <Flows onNew={onNew} />
  }
}

function CircuitBody() {
  const notify = useNotify()
  const { go, open } = useRoute()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  return (
    <>
      <CircuitContent
        onNew={() => setCreating(true)}
        onUseTemplate={(template) => {
          notify('Template copied', `${template} is open in the editor as a draft.`, 'green')
          open('flows', 'onboarding')
        }}
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New flow</DialogTitle>
            <DialogDescription>
              A flow starts as a draft. Nothing runs until you publish it.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <TextField
              label="Name"
              required
              autoFocus
              value={name}
              placeholder="Order paid → fulfilment"
              onChange={(event) => setName(event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Trigger"
                defaultValue="webhook"
                description="Changeable later, but it decides the first step."
                options={[
                  { value: 'webhook', label: 'Webhook' },
                  { value: 'schedule', label: 'Schedule' },
                  { value: 'event', label: 'Event' },
                  { value: 'manual', label: 'Manual' },
                ]}
              />
              <SelectField
                label="Start from"
                defaultValue="blank"
                options={TEMPLATES.map((template) => ({ value: template.id, label: template.name }))}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name}
              onClick={() => {
                setCreating(false)
                notify('Draft created', `${name} is open in the editor.`, 'green')
                setName('')
                go({ section: 'flows' })
              }}
            >
              Create flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Circuit() {
  return (
    <GraphProvider>
      <Shell
        home="flows"
        product="Circuit"
        groups={NAV_GROUPS}
        notifications={NOTIFICATIONS}
        user={{ name: 'Ada Lovelace', email: 'ada@astralyx.dev', plan: 'Team · 5 flows' }}
        commands={commandsFor}
        crumbs={crumbsFor}
        aside={<Copilot />}
      >
        <CircuitBody />
      </Shell>
    </GraphProvider>
  )
}

export const circuitExample: ExampleEntry = {
  id: 'circuit',
  label: 'Circuit',
  description:
    'A workflow builder where the graph is the document: drag steps onto the canvas, and an agent in the right-hand rail proposes changes to the same graph as a diff you can accept.',
  uses: [
    'Node Canvas', 'Node Palette', 'Sidebar', 'Diff Proposal', 'Prompt Input', 'Message',
    'Suggestions', 'Tool Call', 'Retry Policy', 'Pipeline', 'Event Stream', 'Cron Schedule',
    'Run Controls', 'Data Grid', 'Command', 'Dialog', 'Sheet', 'Alert Dialog', 'Drawer', 'Toast',
  ],
  render: () => <Circuit />,
}
