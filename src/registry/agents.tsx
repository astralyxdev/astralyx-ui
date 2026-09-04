import { useState } from 'react'
import { AgentCard } from '@/components/ui/agent-card'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkline } from '@/components/ui/sparkline'
import { Switch } from '@/components/ui/switch'
import { AgentMemory, type MemoryEntry } from '@/components/ui/agent-memory'
import { AgentTasks, type AgentTask } from '@/components/ui/agent-tasks'
import { BudgetGuard } from '@/components/ui/budget-guard'
import { RetryPolicy } from '@/components/ui/retry-policy'
import { StreamInspector, type StreamEvent } from '@/components/ui/stream-inspector'
import { SubagentTree, type Subagent } from '@/components/ui/subagent-tree'
import { ContextWindow } from '@/components/ui/context-window'
import { EvalBoard, type EvalCase } from '@/components/ui/eval-board'
import { PromptDiff } from '@/components/ui/prompt-diff'
import { ToolLatency, type ToolLatencyRow } from '@/components/ui/tool-latency'
import { RunControls, type RunStatus } from '@/components/ui/run-controls'
import { SandboxPolicy, type SandboxScope } from '@/components/ui/sandbox-policy'
import { Badge } from '@/components/ui/badge'
import { GuardrailList, type Guardrail } from '@/components/ui/guardrail-list'
import {
  Inspector,
  type InspectorSection,
  type InspectorValue,
} from '@/components/ui/inspector'
import { HandoffTrail, type Handoff } from '@/components/ui/handoff-trail'
import { ToolPicker, type Tool } from '@/components/ui/tool-picker'
import { TraceWaterfall, type TraceSpan } from '@/components/ui/trace-waterfall'
import { ToolSchema } from '@/components/ui/tool-schema'
import {
  NodeCanvas,
  NodePalette,
  type CanvasEdge,
  type CanvasNode,
} from '@/components/ui/node-canvas'
import type { ComponentEntry } from './types'

/** The kinds of step an agent pipeline is built from. */
const KINDS: Record<string, { label: string; tone: 'blue' | 'violet' | 'amber' | 'green' }> = {
  trigger: { label: 'Trigger', tone: 'blue' },
  model: { label: 'Model', tone: 'violet' },
  tool: { label: 'Tool', tone: 'amber' },
  output: { label: 'Output', tone: 'green' },
}

const START_NODES: CanvasNode[] = [
  { id: 'in', x: 0, y: 60, label: 'Incoming message', data: 'trigger', deletable: false },
  { id: 'plan', x: 260, y: 60, label: 'Plan the reply', data: 'model' },
  { id: 'search', x: 520, y: 0, label: 'search_docs', data: 'tool' },
  { id: 'ticket', x: 520, y: 120, label: 'create_ticket', data: 'tool' },
  { id: 'out', x: 780, y: 60, label: 'Send reply', data: 'output', connectable: false },
]

const START_EDGES: CanvasEdge[] = [
  { id: 'e1', from: 'in', to: 'plan' },
  { id: 'e2', from: 'plan', to: 'search' },
  { id: 'e3', from: 'plan', to: 'ticket' },
  { id: 'e4', from: 'search', to: 'out' },
  { id: 'e5', from: 'ticket', to: 'out', dashed: true },
]

const PALETTE = [
  { id: 'model', label: 'Model call', hint: 'Prompt a model' },
  { id: 'tool', label: 'Tool call', hint: 'Run a function' },
  { id: 'output', label: 'Output', hint: 'Return to the user' },
]

/**
 * A working agent pipeline editor, which is the point of the component.
 *
 * Everything the canvas offers is reachable here: drag a node, drag a wire
 * between two ports, drag a step in from the palette, press the `+` on a node
 * to chain a new one, and delete with a node focused.
 */
function PipelineEditor({
  editable = true,
  height = 340,
}: {
  editable?: boolean
  height?: number
}) {
  const [nodes, setNodes] = useState(START_NODES)
  const [edges, setEdges] = useState(START_EDGES)
  const [selected, setSelected] = useState<string | null>('plan')

  function addNode(kind: string, position: { x: number; y: number }, from?: string) {
    const id = `${kind}-${Date.now()}`
    setNodes((current) => [
      ...current,
      { id, x: position.x, y: position.y, label: KINDS[kind]?.label ?? kind, data: kind },
    ])
    if (from) setEdges((current) => [...current, { id: `e-${id}`, from, to: id }])
    setSelected(id)
  }

  const editing = editable
    ? {
        onNodesChange: setNodes,
        onConnect: (from: string, to: string) =>
          setEdges((current) =>
            current.some((edge) => edge.from === from && edge.to === to)
              ? current
              : [...current, { id: `e-${from}-${to}`, from, to }],
          ),
        onDropNode: (payload: string, position: { x: number; y: number }) =>
          addNode(payload, position),
        onAddNode: (position: { x: number; y: number }) => addNode('model', position),
        onAddConnected: (from: string, position: { x: number; y: number }) =>
          addNode('model', position, from),
        onRemoveNode: (id: string) => {
          setNodes((current) => current.filter((node) => node.id !== id))
          setEdges((current) =>
            current.filter((edge) => edge.from !== id && edge.to !== id),
          )
        },
      }
    : {}

  return (
    <div className="flex w-full gap-3">
      {editable && (
        <div className="w-40 shrink-0">
          <p className="text-muted-foreground/70 mb-2 text-[11px] font-medium tracking-[0.14em] uppercase">
            Steps
          </p>
          <NodePalette
            items={PALETTE}
            onPick={(kind) => addNode(kind, { x: 300, y: 240 })}
          />
        </div>
      )}

      <NodeCanvas
        className="min-w-0 flex-1"
        height={height}
        nodes={nodes}
        edges={edges}
        selectedId={selected}
        onSelect={setSelected}
        label="Agent pipeline"
        renderNode={(node) => {
          const kind = KINDS[String(node.data)] ?? KINDS.model
          return (
            <div className="space-y-1.5">
              <Badge size="sm" color={kind.tone}>
                {kind.label}
              </Badge>
              <p className="text-sm leading-snug font-medium">{node.label}</p>
            </div>
          )
        }}
        {...editing}
      />
    </div>
  )
}

/**
 * The freeform demo: nodes are DOM, and you can add empty ones.
 *
 * The pipeline demo above shows the canvas doing a specific job. This one shows
 * the mechanism — a blank node you type into, a node holding real form
 * controls, a node holding a chart — because "what can go inside a node" is the
 * first question anyone has and a screenshot of a finished graph never answers
 * it.
 */
const BLANK_START: CanvasNode[] = [
  { id: 'n1', x: 20, y: 30, data: 'form', width: 240 },
  { id: 'n2', x: 320, y: 140, data: 'people', width: 240 },
]

function FreeformCanvas() {
  const [nodes, setNodes] = useState<CanvasNode[]>(BLANK_START)
  const [edges, setEdges] = useState<CanvasEdge[]>([])
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)

  function add(at: { x: number; y: number }, from?: string) {
    const id = `n-${Date.now()}`
    setNodes((current) => [...current, { id, x: at.x, y: at.y, data: 'blank', width: 240 }])
    if (from) setEdges((current) => [...current, { id: `e-${id}`, from, to: id }])
    setSelected(id)
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => add({ x: 60, y: 260 })}>
          Add an empty node
        </Button>
        <p className="text-muted-foreground text-xs">
          …or double-click the canvas, or press the <code className="font-mono">+</code> on a node
          to add one already wired to it.
        </p>
      </div>

      <NodeCanvas
        height={380}
        nodeWidth={240}
        nodes={nodes}
        edges={edges}
        selectedId={selected}
        onSelect={setSelected}
        onNodesChange={setNodes}
        onAddNode={(at) => add(at)}
        onAddConnected={(from, at) => add(at, from)}
        onRemoveNode={(id) => {
          setNodes((current) => current.filter((node) => node.id !== id))
          setEdges((current) => current.filter((e) => e.from !== id && e.to !== id))
        }}
        onConnect={(from, to) =>
          setEdges((current) =>
            current.some((e) => e.from === from && e.to === to)
              ? current
              : [...current, { id: `e-${from}-${to}`, from, to }],
          )
        }
        label="Freeform canvas"
        renderNode={(node) => {
          // A blank node you can actually type into — the point being that the
          // canvas owns position and wiring, and nothing else.
          if (node.data === 'blank') {
            return (
              <div
                className="space-y-1.5"
                // The canvas starts a drag on pointerdown; a field inside a
                // node needs that stopped or it can never take focus.
                onPointerDown={(event) => event.stopPropagation()}
              >
                <p className="text-muted-foreground/70 text-[10px] tracking-[0.14em] uppercase">
                  New node
                </p>
                <Input
                  size="sm"
                  placeholder="Name this step…"
                  value={titles[node.id] ?? ''}
                  onChange={(event) =>
                    setTitles((current) => ({ ...current, [node.id]: event.target.value }))
                  }
                />
              </div>
            )
          }

          if (node.data === 'form') {
            return (
              <div className="space-y-2.5" onPointerDown={(event) => event.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Badge size="sm" color="amber">Webhook</Badge>
                  <span className="text-xs font-medium">On completion</span>
                </div>
                <Input size="sm" placeholder="https://hooks.example.com/…" />
                <Switch
                  size="sm"
                  label={<span className="text-xs">Retry on 5xx</span>}
                  labelPosition="start"
                  containerClassName="justify-between w-full"
                  defaultChecked
                />
              </div>
            )
          }

          return (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Badge size="sm" color="violet">Reviewers</Badge>
                <span className="text-xs font-medium">Needs two approvals</span>
              </div>
              <AvatarGroup max={4}>
                {['Ada Okafor', 'Marc Laurent', 'Iris Chen', 'Devon Reyes'].map((name) => (
                  <Avatar key={name} name={name} size="sm" />
                ))}
              </AvatarGroup>
              <Sparkline values={[3, 5, 4, 8, 6, 9, 12]} variant="area" className="h-8" />
            </div>
          )
        }}
      />
    </div>
  )
}

export const nodeCanvasEntry: ComponentEntry = {
  id: 'node-canvas',
  label: 'Node Canvas',
  isNew: true,
  description:
    'A pannable, zoomable canvas of draggable nodes and the edges between them — the substrate for an agent pipeline, a retrieval chain or a build DAG. Nodes are real DOM, so you put your own components inside them.',
  usage: `import { NodeCanvas, NodePalette } from '@/components/ui/node-canvas'

<NodeCanvas
  nodes={nodes}
  edges={edges}
  onNodesChange={setNodes}
  onConnect={(from, to) => setEdges([...edges, { id: \`\${from}-\${to}\`, from, to }])}
  onAddConnected={(from, at) => addStep(from, at)}
  renderNode={(node) => <StepCard step={node.data} />}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'editable', label: 'editable', default: true },
      { type: 'number', prop: 'height', label: 'height', default: 340, min: 220, max: 560, step: 20 },
    ],
    render: (state) => (
      <div className="w-full">
        <PipelineEditor
          editable={Boolean(state.editable)}
          height={Number(state.height)}
        />
      </div>
    ),
    code: (state) =>
      `<NodeCanvas\n  nodes={nodes}\n  edges={edges}\n  height={${Number(state.height)}}\n${
        state.editable
          ? '  onNodesChange={setNodes}\n  onConnect={connect}\n  onAddConnected={addStep}\n  onDropNode={dropStep}\n'
          : ''
      }  renderNode={(node) => <StepCard step={node.data} />}\n/>`,
  },
  api: [
    { name: 'nodes / edges', type: 'CanvasNode[] / CanvasEdge[]', description: '{ id, x, y, width?, label?, data?, connectable?, draggable?, deletable? } and { id, from, to, dashed? }. Positions are graph units, not pixels.' },
    { name: 'renderNode', type: '(node, { selected }) => ReactNode', description: 'Draws the inside of a node. It is real DOM, so a Badge, a Switch or a Select all work in there.' },
    { name: 'onNodesChange', type: '(nodes: CanvasNode[]) => void', description: 'Dragging and arrow-key nudges. Omit it and the canvas is read-only, though nodes stay focusable.' },
    { name: 'onConnect', type: '(from: string, to: string) => void', description: 'Drag from a node’s trailing port onto another node. Also what makes the ports render at all.' },
    { name: 'onAddConnected', type: '(fromId, position) => void', description: 'The + on a node: create a step already wired to it. A real button, so chaining has a keyboard path even though dragging a wire does not.' },
    { name: 'onAddNode / onDropNode', type: '(position) => void / (payload, position) => void', description: 'Double-click empty canvas, and drops from NodePalette. Both receive graph coordinates, already corrected for pan and zoom.' },
    { name: 'onRemoveNode', type: '(id: string) => void', description: 'Backspace or Delete with a node focused, unless the node sets deletable: false.' },
    { name: 'zoom / pan', type: 'wheel, background drag', description: 'Zoom is anchored to the pointer, so the point under the cursor stays put. minZoom, maxZoom, defaultPan and defaultZoom are all props.' },
    { name: 'keyboard', type: 'Tab / arrows / Shift+arrows', description: 'Every node is a tab stop; arrows nudge by `nudge` units and Shift by ten times that. Precise placement is easier this way than with a pointer.' },
  ],
  demos: [
    {
      title: 'An agent pipeline you can edit',
      stack: true,
      code: `<NodeCanvas nodes={nodes} edges={edges} onNodesChange={setNodes} onConnect={connect} />`,
      render: () => <PipelineEditor />,
    },
    {
      title: 'Adding nodes, and putting anything inside them',
      stack: true,
      code: `// A node is real DOM, so renderNode can return whatever you like.
<NodeCanvas
  nodes={nodes}
  edges={edges}
  onNodesChange={setNodes}
  onConnect={connect}
  onAddNode={(at) => add('blank', at)}        // double-click empty canvas
  onAddConnected={(from, at) => add('blank', at, from)}  // the + on a node
  nodeWidth={240}
  renderNode={(node) => {
    if (node.data === 'blank') return <BlankCard id={node.id} />
    if (node.data === 'form') return (
      <div className="space-y-2">
        <Input size="sm" placeholder="Webhook URL" />
        <Switch size="sm" label="Retry on 5xx" labelPosition="start" />
      </div>
    )
    return <AvatarRow />
  }}
/>`,
      render: () => <FreeformCanvas />,
    },
    {
      title: 'Read-only',
      stack: true,
      code: `<NodeCanvas nodes={nodes} edges={edges} />`,
      render: () => <PipelineEditor editable={false} height={260} />,
    },
  ],
}

/* ------------------------------------------------------------- agent card */

const ROSTER = [
  {
    name: 'Support triage',
    description: 'Reads an incoming ticket, answers it or routes it on.',
    model: 'claude-opus-5',
    temperature: 0.2,
    tools: ['search_docs', 'get_customer', 'create_ticket'],
    status: 'running' as const,
  },
  {
    name: 'Billing operator',
    description: 'Handles refunds and plan changes, inside a spend cap.',
    model: 'claude-sonnet-5',
    temperature: 0,
    tools: ['get_invoice', 'issue_refund', 'change_plan', 'delete_customer', 'export_ledger'],
    status: 'error' as const,
  },
]

function Roster({ enabled: withSwitch = true }: { enabled?: boolean }) {
  const [on, setOn] = useState<Record<string, boolean>>({ 'Support triage': true })
  const [picked, setPicked] = useState('Support triage')

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      {ROSTER.map((agent) => (
        <AgentCard
          key={agent.name}
          {...agent}
          selected={picked === agent.name}
          onSelect={() => setPicked(agent.name)}
          enabled={withSwitch ? Boolean(on[agent.name]) : undefined}
          onToggle={(next) => setOn((current) => ({ ...current, [agent.name]: next }))}
        />
      ))}
    </div>
  )
}

export const agentCardEntry: ComponentEntry = {
  id: 'agent-card',
  label: 'Agent Card',
  isNew: true,
  description:
    'One agent’s definition as a card: the model behind it, the tools it may reach for, and whether it is allowed to run. Tools are listed by name rather than counted, because a count tells you nothing about blast radius.',
  usage: `import { AgentCard } from '@/components/ui/agent-card'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkline } from '@/components/ui/sparkline'
import { Switch } from '@/components/ui/switch'
import { AgentMemory, type MemoryEntry } from '@/components/ui/agent-memory'
import { AgentTasks, type AgentTask } from '@/components/ui/agent-tasks'
import { BudgetGuard } from '@/components/ui/budget-guard'
import { RetryPolicy } from '@/components/ui/retry-policy'
import { StreamInspector, type StreamEvent } from '@/components/ui/stream-inspector'
import { SubagentTree, type Subagent } from '@/components/ui/subagent-tree'
import { ContextWindow } from '@/components/ui/context-window'
import { EvalBoard, type EvalCase } from '@/components/ui/eval-board'
import { PromptDiff } from '@/components/ui/prompt-diff'
import { ToolLatency, type ToolLatencyRow } from '@/components/ui/tool-latency'
import { RunControls, type RunStatus } from '@/components/ui/run-controls'
import { SandboxPolicy, type SandboxScope } from '@/components/ui/sandbox-policy'

<AgentCard
  name="Billing operator"
  model="claude-sonnet-5"
  tools={['get_invoice', 'issue_refund']}
  temperature={0}
  status="running"
  enabled={enabled}
  onToggle={setEnabled}
/>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'enabled', label: 'with switch', default: true }],
    render: (state) => <Roster enabled={Boolean(state.enabled)} />,
    code: (state) =>
      `<AgentCard\n  name="Billing operator"\n  model="claude-sonnet-5"\n  tools={tools}\n  status="running"\n${state.enabled ? '  enabled={enabled}\n  onToggle={setEnabled}\n' : ''}/>`,
  },
  api: [
    { name: 'name / description / model', type: 'string / ReactNode / string', description: 'The model id is shown verbatim — an agent’s behaviour is tied to the exact one, not to a family.' },
    { name: 'tools / maxTools', type: 'string[] / number', default: '— / 4', description: 'Listed by name. `delete_customer` in that list is what makes someone look twice; “6 tools” is not.' },
    { name: 'status', type: "'idle' | 'running' | 'error' | 'draft'", default: "'idle'", description: 'Kept separate from `enabled`: an agent can be switched on and still be failing, and folding the two hides that case.' },
    { name: 'enabled / onToggle', type: 'boolean / (enabled: boolean) => void', description: 'Renders the switch. Omit `enabled` entirely for a read-only card.' },
    { name: 'selected / onSelect', type: 'boolean / () => void', description: 'For a roster that drives a detail panel. The switch stops propagation, so toggling does not also select.' },
    { name: 'actions / icon', type: 'ReactNode', description: 'Trailing slot and the leading glyph — a menu, a Run button, an avatar.' },
    { name: 'statusLabels / toggleLabel', type: 'Partial<Record<AgentStatus, string>> / string', description: 'Every string is a prop.' },
  ],
  demos: [
    { title: 'A roster', stack: true, code: `<AgentCard name="Support triage" model="claude-opus-5" tools={tools} status="running" />`, render: () => <Roster /> },
    { title: 'Read-only', stack: true, code: `<AgentCard name="Support triage" model="claude-opus-5" tools={tools} />`, render: () => <Roster enabled={false} /> },
  ],
}

/* ------------------------------------------------------------ tool picker */

const TOOLS: Tool[] = [
  { id: 'search_docs', name: 'search_docs', group: 'Read', description: 'Full-text search over the help centre.' },
  { id: 'get_customer', name: 'get_customer', group: 'Read', description: 'Profile, plan and lifetime value by id.' },
  { id: 'get_invoice', name: 'get_invoice', group: 'Read', description: 'One invoice, with its line items.' },
  { id: 'create_ticket', name: 'create_ticket', group: 'Write', description: 'Opens a ticket in the queue.' },
  { id: 'issue_refund', name: 'issue_refund', group: 'Write', destructive: true, description: 'Moves money. Capped at £200 per run by policy.' },
  { id: 'delete_customer', name: 'delete_customer', group: 'Write', destructive: true, description: 'Irreversible. Cascades to invoices and tickets.' },
  { id: 'send_email', name: 'send_email', group: 'Write', destructive: true, disabled: true, disabledReason: 'Needs a verified sending domain.', description: 'Sends from the support address.' },
]

function ToolPickerDemo({ searchable = true }: { searchable?: boolean }) {
  const [enabled, setEnabled] = useState(['search_docs', 'get_customer', 'create_ticket'])
  return (
    <div className="w-full max-w-xl">
      <ToolPicker tools={TOOLS} value={enabled} onValueChange={setEnabled} searchable={searchable} />
    </div>
  )
}

export const toolPickerEntry: ComponentEntry = {
  id: 'tool-picker',
  label: 'Tool Picker',
  isNew: true,
  description:
    'The catalogue of tools an agent may call, with a switch on each. Destructive capabilities are marked rather than hidden — the whole risk of an agent is a capability nobody noticed it had.',
  usage: `import { GuardrailList, type Guardrail } from '@/components/ui/guardrail-list'
import {
  Inspector,
  type InspectorSection,
  type InspectorValue,
} from '@/components/ui/inspector'
import { HandoffTrail, type Handoff } from '@/components/ui/handoff-trail'
import { ToolPicker, type Tool } from '@/components/ui/tool-picker'
import { TraceWaterfall, type TraceSpan } from '@/components/ui/trace-waterfall'

<ToolPicker tools={tools} value={enabled} onValueChange={setEnabled} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'searchable', label: 'searchable', default: true }],
    render: (state) => <ToolPickerDemo searchable={Boolean(state.searchable)} />,
    code: (state) =>
      `<ToolPicker\n  tools={tools}\n  value={enabled}\n  onValueChange={setEnabled}\n  searchable={${Boolean(state.searchable)}}\n/>`,
  },
  api: [
    { name: 'tools', type: 'Tool[]', description: '{ id, name, description?, group?, destructive?, disabled?, disabledReason?, meta? }.' },
    { name: 'value / onValueChange', type: 'string[] / (next: string[]) => void', description: 'Controlled — the caller owns the enabled set, because it is usually part of a larger form.' },
    { name: 'destructive', type: 'boolean', description: 'Puts a warning badge on the row. For anything that deletes, refunds or sends.' },
    { name: 'searchable', type: 'boolean', default: 'true', description: 'Matches name, group and description — people look for tools by what they do at least as often as by what they are called.' },
    { name: 'group', type: 'string', description: 'Headings, in the order the tools appear. Empty groups collapse rather than leaving a bare heading.' },
    { name: 'summary', type: '(enabled, total) => ReactNode', description: 'Caption under the list. Counted from the data, so it cannot disagree with the rows.' },
  ],
  demos: [
    { title: 'Grouped, with destructive tools marked', stack: true, code: `<ToolPicker tools={tools} value={enabled} onValueChange={setEnabled} />`, render: () => <ToolPickerDemo /> },
  ],
}

/* ------------------------------------------------------------ tool schema */

const SCHEMA = {
  type: 'object',
  required: ['customer_id', 'amount'],
  properties: {
    customer_id: { type: 'string', description: 'The customer to refund. Must already exist.' },
    amount: {
      type: 'object',
      description: 'Integer minor units, never a float.',
      required: ['value', 'currency'],
      properties: {
        value: { type: 'integer', description: 'Pennies. 19_99 is £19.99.' },
        currency: { type: 'string', enum: ['GBP', 'USD', 'EUR'], default: 'GBP' },
      },
    },
    reason: { type: 'string', enum: ['duplicate', 'fraudulent', 'requested_by_customer'], description: 'Recorded on the ledger entry.' },
    notify: { type: 'boolean', default: true, description: 'Email the customer when the refund settles.' },
  },
}

export const toolSchemaEntry: ComponentEntry = {
  id: 'tool-schema',
  label: 'Tool Schema',
  isNew: true,
  description:
    'A tool’s parameter schema, rendered as something a person can read. Required, type and default get their own column, because those are the three questions anyone actually has about a parameter.',
  usage: `import { ToolSchema } from '@/components/ui/tool-schema'

<ToolSchema name="issue_refund" schema={tool.inputSchema} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'depth', label: 'defaultDepth', default: 1, min: 0, max: 3, step: 1 }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <ToolSchema
          name="issue_refund"
          description="Refunds part or all of a payment."
          schema={SCHEMA}
          defaultDepth={Number(state.depth)}
        />
      </div>
    ),
    code: (state) =>
      `<ToolSchema\n  name="issue_refund"\n  schema={tool.inputSchema}\n  defaultDepth={${Number(state.depth)}}\n/>`,
  },
  api: [
    { name: 'schema', type: 'JsonSchema', description: 'Reads type, description, enum, default, required, properties and items. Other keywords are ignored rather than half-supported.' },
    { name: '$ref', type: 'not resolved', description: 'Deliberately. Following one means fetching or bundling a document this component cannot see; rendering an unresolved ref as an empty object would be worse than saying so.' },
    { name: 'defaultDepth', type: 'number', default: '1', description: 'Levels open on first render. A deep schema fully expanded is the same wall of JSON in a different font.' },
    { name: 'name / description', type: 'string / ReactNode', description: 'Heading above the parameters.' },
    { name: 'requiredLabel / optionalLabel / emptyLabel', type: 'string', description: 'Every string is a prop.' },
  ],
  demos: [
    { title: 'A nested schema', stack: true, code: `<ToolSchema name="issue_refund" schema={schema} />`, render: () => (<div className="w-full max-w-xl"><ToolSchema name="issue_refund" description="Refunds part or all of a payment." schema={SCHEMA} /></div>) },
    { title: 'No parameters', stack: true, code: `<ToolSchema name="list_open_tickets" schema={{ type: 'object' }} />`, render: () => (<div className="w-full max-w-xl"><ToolSchema name="list_open_tickets" schema={{ type: 'object' }} /></div>) },
  ],
}

/* --------------------------------------------------------- trace waterfall */

const SPANS: TraceSpan[] = [
  {
    id: 'run', name: 'run', start: 0, duration: 4820, kind: 'model', meta: '18.4k tokens',
    children: [
      { id: 'guard-in', name: 'guard: pii_scan', start: 10, duration: 60, kind: 'guard' },
      { id: 'plan', name: 'model: plan', start: 80, duration: 940, kind: 'model', meta: '2.1k tokens' },
      {
        id: 'fanout', name: 'tools (parallel)', start: 1040, duration: 2180, kind: 'tool',
        children: [
          { id: 'search', name: 'search_docs', start: 1040, duration: 2120, kind: 'retrieval', meta: '12 chunks' },
          { id: 'customer', name: 'get_customer', start: 1050, duration: 240, kind: 'tool' },
          { id: 'invoice', name: 'get_invoice', start: 1300, duration: 1880, kind: 'tool', error: true, meta: '504' },
        ],
      },
      { id: 'answer', name: 'model: answer', start: 3260, duration: 1480, kind: 'model', meta: '16.3k tokens' },
      { id: 'guard-out', name: 'guard: tone', start: 4750, duration: 60, kind: 'guard' },
    ],
  },
]

export const traceWaterfallEntry: ComponentEntry = {
  id: 'trace-waterfall',
  label: 'Trace Waterfall',
  isNew: true,
  description:
    'An agent run as a waterfall of spans. Bars are positioned against the whole run rather than each row’s own width, which is what makes concurrency visible — two tools that ran in parallel look identical to two that ran in sequence until you share the axis.',
  usage: `import { TraceWaterfall, type TraceSpan } from '@/components/ui/trace-waterfall'

<TraceWaterfall spans={spans} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'depth', label: 'defaultDepth', default: 2, min: 1, max: 4, step: 1 },
      { type: 'number', prop: 'nameWidth', label: 'nameWidth', default: 200, min: 120, max: 320, step: 20 },
    ],
    render: (state) => (
      <div className="w-full">
        <TraceWaterfall spans={SPANS} defaultDepth={Number(state.depth)} nameWidth={Number(state.nameWidth)} />
      </div>
    ),
    code: (state) =>
      `<TraceWaterfall\n  spans={spans}\n  defaultDepth={${Number(state.depth)}}\n  nameWidth={${Number(state.nameWidth)}}\n/>`,
  },
  api: [
    { name: 'spans', type: 'TraceSpan[]', description: '{ id, name, start, duration, kind?, error?, meta?, children? }. start and duration are milliseconds from the beginning of the run.' },
    { name: 'total', type: 'number', description: 'The run window. Defaults to the furthest span end, including nested ones.' },
    { name: 'kind', type: "'model' | 'tool' | 'retrieval' | 'guard' | string", description: 'Drives the bar colour. An unknown kind falls back to neutral rather than throwing.' },
    { name: 'minimum bar', type: '2px', description: 'A span too short to draw still gets a sliver — “it ran and was instant” and “it never ran” must not look the same.' },
    { name: 'defaultDepth', type: 'number', default: '2', description: 'Levels open on first render. Forty retrieval spans under one node are unreadable expanded.' },
    { name: 'formatDuration', type: '(ms: number) => string', description: 'Defaults to ms under a second, then seconds.' },
  ],
  demos: [
    { title: 'A run with a parallel fan-out and a failure', stack: true, code: `<TraceWaterfall spans={spans} />`, render: () => <TraceWaterfall spans={SPANS} /> },
  ],
}

/* ---------------------------------------------------------- guardrail list */

const RAILS: Guardrail[] = [
  { id: 'pii', name: 'PII scan', outcome: 'pass', stage: 'input', detail: 'No identifiers found in the prompt.', meta: '48ms' },
  { id: 'jailbreak', name: 'Prompt injection', outcome: 'warn', stage: 'input', detail: 'A retrieved document contained instruction-like text. Quoted rather than followed.', meta: '0.62' },
  { id: 'spend', name: 'Spend cap', outcome: 'block', stage: 'tool', detail: 'issue_refund asked for £340, over the £200 per-run cap.' },
  { id: 'tone', name: 'Tone check', outcome: 'pass', stage: 'output', meta: '31ms' },
  { id: 'grounding', name: 'Citation grounding', outcome: 'skipped', stage: 'output', detail: 'Skipped — the run was blocked before an answer was produced.' },
]

export const guardrailListEntry: ComponentEntry = {
  id: 'guardrail-list',
  label: 'Guardrail List',
  isNew: true,
  description:
    'The safety checks around a run and how each one landed, ordered by consequence rather than by execution. A skipped check is its own state — “we did not scan” and “the scan found nothing” are opposite facts.',
  usage: `import { GuardrailList, type Guardrail } from '@/components/ui/guardrail-list'
import {
  Inspector,
  type InspectorSection,
  type InspectorValue,
} from '@/components/ui/inspector'

<GuardrailList guardrails={rails} summary={(c) => \`\${c.block} blocked, \${c.warn} warnings\`} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'sorted', label: 'sorted (worst first)', default: true }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <GuardrailList
          guardrails={RAILS}
          sorted={Boolean(state.sorted)}
          summary={(counts) => `${counts.block} blocked · ${counts.warn} warning · ${counts.pass} passed · ${counts.skipped} skipped`}
        />
      </div>
    ),
    code: (state) => `<GuardrailList\n  guardrails={rails}\n  sorted={${Boolean(state.sorted)}}\n  summary={(c) => \`\${c.block} blocked\`}\n/>`,
  },
  api: [
    { name: 'guardrails', type: 'Guardrail[]', description: '{ id, name, outcome, detail?, stage?, meta? }.' },
    { name: 'outcome', type: "'pass' | 'warn' | 'block' | 'skipped' | 'pending'", description: 'Five states, not three. Skipped and pending are distinct from passing, and collapsing them is how an unchecked output ships.' },
    { name: 'sorted', type: 'boolean', default: 'true', description: 'Worst first. A screen that buries the one blocked check among fifteen green rows is complete and useless.' },
    { name: 'summary', type: '(counts) => ReactNode', description: 'Tallies come from the data, so a summary cannot disagree with the rows under it.' },
    { name: 'outcomeLabels', type: 'Partial<Record<GuardrailOutcome, string>>', description: 'Override any wording.' },
  ],
  demos: [
    { title: 'A blocked run', stack: true, code: `<GuardrailList guardrails={rails} />`, render: () => (<div className="w-full max-w-2xl"><GuardrailList guardrails={RAILS} /></div>) },
  ],
}

/* ------------------------------------------------------------ handoff trail */

const HOPS: Handoff[] = [
  { id: 'h1', to: 'Triage agent', reason: 'Entry point for every inbound message.', at: '09:41:02' },
  { id: 'h2', to: 'Billing operator', reason: 'Classified as a billing dispute with 0.91 confidence.', at: '09:41:08', meta: 'handled 4 turns' },
  { id: 'h3', to: 'Refund specialist', reason: 'Requested refund exceeded the billing agent’s £200 cap.', at: '09:43:20', failed: true },
  { id: 'h4', to: 'Dana Whitfield', human: true, reason: 'No agent is permitted to approve over £200. Escalated for sign-off.', at: '09:43:22' },
]

export const handoffTrailEntry: ComponentEntry = {
  id: 'handoff-trail',
  label: 'Handoff Trail',
  isNew: true,
  description:
    'Who handled a request, in order, and why each handover happened. The hardest question in a multi-agent system is “why did this agent answer”, and the answer is never in one agent’s transcript — it is in the chain.',
  usage: `import { HandoffTrail, type Handoff } from '@/components/ui/handoff-trail'

<HandoffTrail handoffs={hops} live />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'live', label: 'live', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <HandoffTrail handoffs={HOPS} live={Boolean(state.live)} />
      </div>
    ),
    code: (state) => `<HandoffTrail handoffs={hops} live={${Boolean(state.live)}} />`,
  },
  api: [
    { name: 'handoffs', type: 'Handoff[]', description: '{ id, to, human?, reason?, at?, failed?, meta? }. `reason` is the point of the component — a chain without reasons explains nothing.' },
    { name: 'human', type: 'boolean', description: 'A handover to a person is a first-class hop, not a status field. Escalation is usually what the system is judged on.' },
    { name: 'failed', type: 'boolean', description: 'Marks a handover caused by a failure rather than by routing.' },
    { name: 'live', type: 'boolean', default: 'false', description: 'Marks the last hop as still holding the request, so a running trail does not read as finished.' },
    { name: 'at', type: 'string', description: 'Pre-formatted. This component does not own your locale.' },
  ],
  demos: [
    { title: 'Escalating to a person', stack: true, code: `<HandoffTrail handoffs={hops} live />`, render: () => (<div className="w-full max-w-xl"><HandoffTrail handoffs={HOPS} live /></div>) },
    { title: 'One agent handled it', stack: true, code: `<HandoffTrail handoffs={[]} />`, render: () => (<div className="w-full max-w-xl"><HandoffTrail handoffs={[]} /></div>) },
  ],
}

/* --------------------------------------------------------------- inspector */

const SECTIONS: InspectorSection[] = [
  {
    label: 'Step',
    fields: [
      { type: 'readonly', key: 'id', label: 'Node id' },
      { type: 'text', key: 'name', label: 'Name', placeholder: 'Plan the reply' },
      { type: 'select', key: 'kind', label: 'Kind', options: [
        { value: 'model', label: 'Model call' },
        { value: 'tool', label: 'Tool call' },
        { value: 'output', label: 'Output' },
      ] },
    ],
  },
  {
    label: 'Model',
    fields: [
      { type: 'select', key: 'model', label: 'Model', options: [
        { value: 'claude-opus-5', label: 'Opus 5' },
        { value: 'claude-sonnet-5', label: 'Sonnet 5' },
        { value: 'claude-haiku-4-5', label: 'Haiku 4.5' },
      ] },
      { type: 'number', key: 'temperature', label: 'Temperature', min: 0, max: 2, step: 0.1, hint: 'Zero for anything that touches money.' },
      { type: 'number', key: 'maxTokens', label: 'Max tokens', min: 256, max: 32_000, step: 256 },
      { type: 'textarea', key: 'system', label: 'System prompt', rows: 3 },
      { type: 'boolean', key: 'stream', label: 'Stream the reply' },
    ],
  },
]

function InspectorDemo({ withPanel = true }: { withPanel?: boolean }) {
  const [value, setValue] = useState<InspectorValue>({
    id: 'plan',
    name: 'Plan the reply',
    kind: 'model',
    model: 'claude-opus-5',
    temperature: 0.2,
    maxTokens: 4096,
    system: 'You triage support tickets. Prefer the docs over your own memory.',
    stream: true,
  })

  return (
    <div className="w-full max-w-sm">
      <Inspector
        sections={withPanel ? SECTIONS : []}
        value={value}
        onChange={setValue}
        title={withPanel ? String(value.name) : undefined}
        description={withPanel ? 'Model call' : undefined}
      />
    </div>
  )
}

export const inspectorEntry: ComponentEntry = {
  id: 'inspector',
  label: 'Inspector',
  isNew: true,
  description:
    'The properties panel for whatever is selected — the other half of a canvas. Driven by a field schema rather than by children, because the fields change with the selection and writing that as JSX means a switch statement per kind at the call site.',
  usage: `import { Inspector, type InspectorSection } from '@/components/ui/inspector'

<Inspector sections={sections} value={node.data} onChange={updateNode} title={node.name} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'withPanel', label: 'has a selection', default: true }],
    render: (state) => <InspectorDemo withPanel={Boolean(state.withPanel)} />,
    code: (state) =>
      state.withPanel
        ? `<Inspector\n  sections={sections}\n  value={value}\n  onChange={setValue}\n  title="Plan the reply"\n/>`
        : `<Inspector sections={[]} value={{}} onChange={setValue} />`,
  },
  api: [
    { name: 'sections', type: 'InspectorSection[]', description: '{ label?, fields }. Fields are text, textarea, number, boolean, select or readonly.' },
    { name: 'value / onChange', type: 'Record<string, unknown> / (next) => void', description: 'One onChange for the whole object, not one per field. A (key, value) callback pushes the merge onto every caller, and the merge is where the stale-closure bugs live.' },
    { name: 'title / description', type: 'ReactNode', description: 'Panel heading — usually the selected thing’s name.' },
    { name: 'emptyLabel', type: 'string', default: "'Nothing selected.'", description: 'Pass an empty sections array alongside it.' },
    { name: 'accessibility', type: 'Field + useFieldControl', description: 'Every control is wired to its label and hint through Field’s context, so ids and aria-describedby are generated rather than hand-managed.' },
  ],
  demos: [
    { title: 'Editing a canvas node', stack: true, code: `<Inspector sections={sections} value={value} onChange={setValue} />`, render: () => <InspectorDemo /> },
    { title: 'Nothing selected', stack: true, code: `<Inspector sections={[]} value={{}} onChange={setValue} />`, render: () => <InspectorDemo withPanel={false} /> },
  ],
}

/* ------------------------------------------------------ context window */

export const contextWindowEntry: ComponentEntry = {
  id: 'context-window',
  label: 'Context Window',
  isNew: true,
  description:
    'What is in the context right now and how much room is left. Segments are drawn to scale against the window, not against what is used — a bar normalised to the used total always looks full, which is exactly backwards.',
  usage: `import { AgentMemory, type MemoryEntry } from '@/components/ui/agent-memory'
import { AgentTasks, type AgentTask } from '@/components/ui/agent-tasks'
import { BudgetGuard } from '@/components/ui/budget-guard'
import { RetryPolicy } from '@/components/ui/retry-policy'
import { StreamInspector, type StreamEvent } from '@/components/ui/stream-inspector'
import { SubagentTree, type Subagent } from '@/components/ui/subagent-tree'
import { ContextWindow } from '@/components/ui/context-window'
import { EvalBoard, type EvalCase } from '@/components/ui/eval-board'
import { PromptDiff } from '@/components/ui/prompt-diff'
import { ToolLatency, type ToolLatencyRow } from '@/components/ui/tool-latency'

<ContextWindow limit={200_000} reserved={8_000} segments={segments} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'history', label: 'history tokens', default: 24_000, min: 0, max: 150_000, step: 2000 },
      { type: 'number', prop: 'reserved', label: 'reserved', default: 8000, min: 0, max: 32_000, step: 1000 },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <ContextWindow
          limit={200_000}
          reserved={Number(state.reserved)}
          segments={[
            { id: 'sys', label: 'System prompt', tokens: 1_800 },
            { id: 'tools', label: 'Tool definitions', tokens: 6_400 },
            { id: 'hist', label: 'Conversation', tokens: Number(state.history) },
            { id: 'rag', label: 'Retrieved docs', tokens: 12_200 },
          ]}
        />
      </div>
    ),
    code: (state) => `<ContextWindow\n  limit={200_000}\n  reserved={${Number(state.reserved)}}\n  segments={segments}\n/>`,
  },
  api: [
    { name: 'segments / limit', type: 'ContextSegment[] / number', description: '{ id, label, tokens, color? } against the model’s full window. Free space is the information, so the bar is scaled to the window.' },
    { name: 'reserved', type: 'number', description: 'Held back for the reply, drawn hatched as unavailable. Showing it as headroom lies about how much you can add.' },
    { name: 'warnAt', type: 'number', default: '0.9', description: 'Fraction of the limit past which the readout turns destructive.' },
    { name: 'minimum segment', type: '2px', description: '“The system prompt is small” and “there is no system prompt” must not look identical.' },
  ],
  demos: [
    { title: 'A comfortable run', stack: true, code: `<ContextWindow limit={200_000} segments={segments} />`, render: () => (<div className="w-full max-w-xl"><ContextWindow limit={200_000} reserved={8_000} segments={[{ id: 'sys', label: 'System prompt', tokens: 1_800 }, { id: 'tools', label: 'Tool definitions', tokens: 6_400 }, { id: 'hist', label: 'Conversation', tokens: 24_000 }, { id: 'rag', label: 'Retrieved docs', tokens: 12_200 }]} /></div>) },
    { title: 'Nearly full', stack: true, code: `<ContextWindow limit={200_000} warnAt={0.9} segments={segments} />`, render: () => (<div className="w-full max-w-xl"><ContextWindow limit={200_000} reserved={8_000} segments={[{ id: 'sys', label: 'System prompt', tokens: 1_800 }, { id: 'tools', label: 'Tool definitions', tokens: 6_400 }, { id: 'hist', label: 'Conversation', tokens: 158_000 }, { id: 'rag', label: 'Retrieved docs', tokens: 24_000 }]} /></div>) },
  ],
}

/* ------------------------------------------------------ sandbox policy */

const SCOPES: SandboxScope[] = [
  { id: 'fs', kind: 'filesystem', mode: 'allowlist', enabled: true, allow: ['/Users/ada/work/astralyx', '/tmp'], deny: ['~/.ssh', '~/.aws', '**/.env'], description: 'Reads and writes are confined to these roots.' },
  { id: 'net', kind: 'network', mode: 'allowlist', enabled: true, allow: ['api.anthropic.com', 'registry.npmjs.org'], deny: ['169.254.169.254'], description: 'Outbound HTTP only, to these hosts.' },
  { id: 'exec', kind: 'exec', mode: 'none', enabled: false, description: 'The agent cannot spawn processes.' },
]

const OPEN_SCOPES: SandboxScope[] = [
  { id: 'fs', kind: 'filesystem', mode: 'allowlist', enabled: true, allow: ['/'], description: 'Configured as an allow-list — of everything.' },
  { id: 'net', kind: 'network', mode: 'full', enabled: true },
  { id: 'exec', kind: 'exec', mode: 'full', enabled: true },
]

export const sandboxPolicyEntry: ComponentEntry = {
  id: 'sandbox-policy',
  label: 'Sandbox Policy',
  isNew: true,
  description:
    'The permissions an agent actually runs under — filesystem, network and process execution. Built to make the dangerous configuration look dangerous: an allow-list of `/` is functionally no sandbox, and it says so.',
  usage: `import { SandboxPolicy, type SandboxScope } from '@/components/ui/sandbox-policy'

<SandboxPolicy scopes={scopes} onToggle={setScopeEnabled} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'wideOpen', label: 'wide open', default: false }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <SandboxPolicy scopes={state.wideOpen ? OPEN_SCOPES : SCOPES} onToggle={() => {}} />
      </div>
    ),
    code: () => `<SandboxPolicy scopes={scopes} onToggle={setScopeEnabled} />`,
  },
  api: [
    { name: 'scopes', type: 'SandboxScope[]', description: "{ id, kind: 'filesystem' | 'network' | 'exec', mode, allow?, deny?, enabled?, label?, description? }." },
    { name: 'mode', type: "'none' | 'allowlist' | 'full'", description: 'Blocked, allow-list, or unrestricted. Only the middle one renders its allow list.' },
    { name: 'wide-open detection', type: 'automatic', description: '`/`, `*`, `**`, `~` and `0.0.0.0/0` in an allow-list are flagged — they are “everything” wearing an allow-list costume.' },
    { name: 'deny before allow', type: 'rendering order', description: 'Every real sandbox evaluates deny first. Showing the lists side by side invites the assumption that an allow entry re-opens what a deny closed.' },
    { name: 'no scopes', type: 'flagged, not empty', description: 'An empty policy renders as a warning: the agent runs with the host’s own permissions.' },
  ],
  demos: [
    { title: 'A confined agent', stack: true, code: `<SandboxPolicy scopes={scopes} />`, render: () => (<div className="w-full max-w-xl"><SandboxPolicy scopes={SCOPES} /></div>) },
    { title: 'An allow-list of everything', stack: true, code: `<SandboxPolicy scopes={[{ id: 'fs', kind: 'filesystem', mode: 'allowlist', allow: ['/'] }]} />`, render: () => (<div className="w-full max-w-xl"><SandboxPolicy scopes={OPEN_SCOPES} /></div>) },
  ],
}

/* -------------------------------------------------------- run controls */

function RunControlsDemo() {
  const [status, setStatus] = useState<RunStatus>('idle')
  const [step, setStep] = useState(0)

  return (
    <div className="w-full max-w-2xl">
      <RunControls
        status={status}
        step={step}
        totalSteps={12}
        elapsed="00:04.2"
        onStart={() => { setStatus('running'); setStep(1) }}
        onPause={() => setStatus('paused')}
        onResume={() => setStatus('running')}
        onStep={() => setStep((current) => Math.min(12, current + 1))}
        onStop={() => setStatus('done')}
        onReplay={() => { setStatus('idle'); setStep(0) }}
      />
    </div>
  )
}

export const runControlsEntry: ComponentEntry = {
  id: 'run-controls',
  label: 'Run Controls',
  isNew: true,
  description:
    'The transport bar for an agent run: start, pause, step, stop, replay. Which buttons exist is derived from status, so the invalid combinations — running and paused, replay while live — cannot be expressed.',
  usage: `import { RunControls } from '@/components/ui/run-controls'

<RunControls status={status} step={step} totalSteps={12} onPause={pause} onStep={stepOnce} onStop={stop} />`,
  composer: { tall: true, controls: [], render: () => <RunControlsDemo />, code: () => `<RunControls\n  status={status}\n  step={step}\n  totalSteps={12}\n  onStart={start}\n  onPause={pause}\n  onStep={stepOnce}\n  onStop={stop}\n  onReplay={replay}\n/>` },
  api: [
    { name: 'status', type: "'idle' | 'running' | 'paused' | 'stopping' | 'done' | 'error'", description: 'The single source of truth. The button set is derived from it rather than from a pile of booleans at the call site.' },
    { name: 'onStep', type: '() => void', description: 'Only offered while paused — stepping means nothing from a running clock. It is what makes an agent debuggable: you see what it was *about* to do.' },
    { name: 'onStop', type: '() => void', description: 'Available whenever anything is live, including while stopping. A wedged run is exactly when you need it and exactly when a disabled button traps you.' },
    { name: 'step / totalSteps / elapsed', type: 'number / number / ReactNode', description: 'Progress readout. `elapsed` is pre-formatted — this component does not own your locale.' },
    { name: 'children', type: 'ReactNode', description: 'Trailing slot — a model picker, a spend cap, a link to the trace.' },
  ],
  demos: [{ title: 'Driving a run', stack: true, code: `<RunControls status={status} onStart={start} onPause={pause} onStep={stepOnce} onStop={stop} />`, render: () => <RunControlsDemo /> }],
}

/* -------------------------------------------------------- tool latency */

const LATENCY: ToolLatencyRow[] = [
  { name: 'search_docs', p50: 180, p95: 2_140, calls: 8_412, errorRate: 0.004 },
  { name: 'get_customer', p50: 42, p95: 96, calls: 12_930, errorRate: 0.0002 },
  { name: 'issue_refund', p50: 610, p95: 9_200, calls: 214, errorRate: 0.052, meta: 'upstream: stripe' },
  { name: 'create_ticket', p50: 220, p95: 480, calls: 1_902, errorRate: 0 },
  { name: 'send_email', p50: 340, p95: 1_120, calls: 640, errorRate: 0.019 },
]

export const toolLatencyEntry: ComponentEntry = {
  id: 'tool-latency',
  label: 'Tool Latency',
  isNew: true,
  description:
    'Per-tool latency and failure rate — the ops view of a tool fleet. Bars are drawn from p95, not the mean: a tool averaging 200ms that spikes to nine seconds one call in twenty is the one blowing your timeout, and the mean hides it.',
  usage: `import { ToolLatency } from '@/components/ui/tool-latency'

<ToolLatency tools={rows} errorThreshold={0.01} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'sorted', label: 'sorted (slowest first)', default: true },
      { type: 'number', prop: 'threshold', label: 'errorThreshold %', default: 1, min: 0, max: 10, step: 1 },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <ToolLatency
          tools={LATENCY}
          sorted={Boolean(state.sorted)}
          errorThreshold={Number(state.threshold) / 100}
        />
      </div>
    ),
    code: (state) => `<ToolLatency\n  tools={rows}\n  sorted={${Boolean(state.sorted)}}\n  errorThreshold={${Number(state.threshold) / 100}}\n/>`,
  },
  api: [
    { name: 'tools', type: 'ToolLatencyRow[]', description: '{ name, p50, p95, calls, errorRate?, meta? }. Durations in milliseconds, errorRate as 0–1.' },
    { name: 'bar scale', type: 'p95 vs the slowest tool', description: 'Scaled across the set, so the worst row is the longest bar. Scaling each to its own maximum would draw every tool full and rank nothing.' },
    { name: 'errorThreshold', type: 'number', default: '0.01', description: 'A threshold, not a gradient: above it is a problem, below it is noise, and a smooth ramp makes 0.4% and 4% look like neighbours.' },
    { name: 'sorted', type: 'boolean', default: 'true', description: 'Slowest p95 first. Sorts a copy — the caller’s array is never mutated.' },
  ],
  demos: [{ title: 'A fleet with one bad upstream', stack: true, code: `<ToolLatency tools={rows} />`, render: () => (<div className="w-full max-w-2xl"><ToolLatency tools={LATENCY} /></div>) }],
}

/* -------------------------------------------------------- agent memory */

const MEMORIES: MemoryEntry[] = [
  { id: 'm1', content: 'Ada prefers British spelling and metric units in all generated copy.', source: 'user:ada · stated', at: '12 Aug', importance: 0.9, pinned: true, kind: 'preference' },
  { id: 'm2', content: 'The staging database is reset every Sunday at 03:00 UTC — data written before then is gone.', source: 'run:8841 · inferred', at: '28 Aug', importance: 0.6, kind: 'fact' },
  { id: 'm3', content: 'Refunds above £200 always need a human. The agent proposed one at £340 and was blocked.', source: 'run:9102 · correction', at: '3 Sep', importance: 0.95, kind: 'correction' },
  { id: 'm4', content: 'The team calls the billing service “ledger”, not “payments”.', source: 'thread:eng-4127', at: '1 Sep', importance: 0.4, kind: 'fact' },
]

function MemoryDemo() {
  const [entries, setEntries] = useState(MEMORIES)
  return (
    <div className="w-full max-w-2xl">
      <AgentMemory
        entries={entries}
        onPin={(id, pinned) =>
          setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, pinned } : entry)))
        }
        onForget={(id) => setEntries((current) => current.filter((entry) => entry.id !== id))}
      />
    </div>
  )
}

export const agentMemoryEntry: ComponentEntry = {
  id: 'agent-memory',
  label: 'Agent Memory',
  isNew: true,
  description:
    'What an agent has remembered and where each piece came from. Distinct from retrieval: these are injected into every future run whether relevant or not, which is why a person has to be able to inspect and delete them.',
  usage: `import { AgentMemory, type MemoryEntry } from '@/components/ui/agent-memory'
import { AgentTasks, type AgentTask } from '@/components/ui/agent-tasks'
import { BudgetGuard } from '@/components/ui/budget-guard'
import { RetryPolicy } from '@/components/ui/retry-policy'
import { StreamInspector, type StreamEvent } from '@/components/ui/stream-inspector'
import { SubagentTree, type Subagent } from '@/components/ui/subagent-tree'

<AgentMemory entries={entries} onPin={pin} onForget={forget} />`,
  composer: { tall: true, controls: [], render: () => <MemoryDemo />, code: () => `<AgentMemory entries={entries} onPin={pin} onForget={forget} />` },
  api: [
    { name: 'entries', type: 'MemoryEntry[]', description: '{ id, content, source, at?, importance?, pinned?, kind? }.' },
    { name: 'source', type: 'string — required', description: 'Required in the type, not optional. A memory with no provenance cannot be audited, and an agent that has silently learned something wrong is exactly what this screen exists for.' },
    { name: 'pinned', type: 'boolean', description: 'Sorts first and is exempt from eviction — the things a person asserted, as opposed to what the agent inferred.' },
    { name: 'onForget', type: '(id: string) => void', description: 'Deleting a memory is a normal operation, not an admin one.' },
  ],
  demos: [{ title: 'Inspecting and editing memory', stack: true, code: `<AgentMemory entries={entries} onPin={pin} onForget={forget} />`, render: () => <MemoryDemo /> }],
}

/* ---------------------------------------------------------- eval board */

const MODELS = [
  { id: 'opus', name: 'Opus 5' },
  { id: 'sonnet', name: 'Sonnet 5' },
  { id: 'haiku', name: 'Haiku 4.5' },
]

const CASES: EvalCase[] = [
  { id: 'c1', name: 'Refuses an over-cap refund', results: { opus: 'pass', sonnet: 'pass', haiku: 'fail' } },
  { id: 'c2', name: 'Cites the retrieved document', results: { opus: 'pass', sonnet: 'partial', haiku: 'partial' } },
  { id: 'c3', name: 'Handles an ambiguous ticket', description: 'The ticket names two orders and asks about “the refund”.', results: { opus: 'fail', sonnet: 'fail', haiku: 'fail' } },
  { id: 'c4', name: 'Escalates a chargeback', results: { opus: 'pass', sonnet: 'pass', haiku: 'pass' } },
  { id: 'c5', name: 'Respects British spelling', results: { opus: 'pass', sonnet: 'pass', haiku: 'skip' } },
]

export const evalBoardEntry: ComponentEntry = {
  id: 'eval-board',
  label: 'Eval Board',
  isNew: true,
  description:
    'Which model to ship, and what is still broken — as a ranking plus a case list rather than a grid. Chips carry their own model name, so there is no column header to align to and nothing that scrolls sideways at four models.',
  usage: `import { EvalBoard, type EvalCase } from '@/components/ui/eval-board'

<EvalBoard models={models} cases={cases} onSelectCase={openCase} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'partial', label: 'partialWeight', default: 0.5, min: 0, max: 1, step: 0.1 },
      { type: 'boolean', prop: 'selectable', label: 'cases clickable', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <EvalBoard
          models={MODELS}
          cases={CASES}
          partialWeight={Number(state.partial)}
          onSelectCase={state.selectable ? () => {} : undefined}
        />
      </div>
    ),
    code: (state) =>
      `<EvalBoard\n  models={models}\n  cases={cases}\n  partialWeight={${Number(state.partial)}}\n${state.selectable ? '  onSelectCase={openCase}\n' : ''}/>`,
  },
  api: [
    { name: 'models / cases', type: 'EvalModel[] / EvalCase[]', description: 'EvalCase is { id, name, description?, results } keyed by model id. A missing entry is “not run”, which is distinct from skipped.' },
    { name: 'why not a matrix', type: 'design note', description: 'A column per model starts scrolling sideways at three, needs a sticky first column to stay readable, and turns every cell into a coloured block whose glyph is too small to carry meaning. A ranking plus labelled chips wraps at any width.' },
    { name: 'scores', type: 'computed here', description: 'From the results, never a prop. Skips and not-run are excluded from the denominator — a model is not penalised for a case that never ran against it.' },
    { name: 'partialWeight', type: 'number', default: '0.5', description: 'What a partial earns when scoring.' },
    { name: 'flagUniversalFailures', type: 'boolean', default: 'true', description: 'A case no model passed is usually a broken test rather than four broken models — flagged inline as a badge, not as a sentence that doubles the row height.' },
    { name: 'onSelectCase', type: '(evalCase: EvalCase) => void', description: 'Makes each case row a button for drilling in. Omit and the rows are static.' },
  ],
  demos: [
    { title: 'Three models, one broken test', stack: true, code: `<EvalBoard models={models} cases={cases} />`, render: () => (<div className="w-full max-w-2xl"><EvalBoard models={MODELS} cases={CASES} /></div>) },
  ],
}

/* --------------------------------------------------------- prompt diff */

const PROMPT_BEFORE = `You are a support agent for Astralyx.

Answer from the retrieved documents. If they do not cover the question, say so.
Be concise.

Never issue a refund without checking the customer's plan.`

const PROMPT_AFTER = `You are a support agent for Astralyx.

Answer from the retrieved documents. If they do not cover the question, say so
and offer to open a ticket.
Be concise. Prefer British spelling.

Never issue a refund above £200 — escalate those to a human.
Never quote a price you have not read from the pricing tool.`

export const promptDiffEntry: ComponentEntry = {
  id: 'prompt-diff',
  label: 'Prompt Diff',
  isNew: true,
  description:
    'Two versions of a prompt with what changed between them. Prompts are the source code of an agent and almost never treated that way — the reason a run regressed is usually a sentence somebody rewrote three days ago.',
  usage: `import { PromptDiff } from '@/components/ui/prompt-diff'

<PromptDiff before={previous.system} after={current.system} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'context', label: 'context lines', default: 2, min: 0, max: 6, step: 1 }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <PromptDiff before={PROMPT_BEFORE} after={PROMPT_AFTER} context={Number(state.context)} />
      </div>
    ),
    code: (state) => `<PromptDiff\n  before={previous.system}\n  after={current.system}\n  context={${Number(state.context)}}\n/>`,
  },
  api: [
    { name: 'before / after', type: 'string', description: 'The two versions. Diffed by line.' },
    { name: 'algorithm', type: 'prefix/suffix trim + LCS', description: 'Deliberately simple. Prompts are short and edited in place; pulling in a diff library for forty lines would be the wrong trade for a kit that ships its source into other people’s repos.' },
    { name: 'context', type: 'number', default: '2', description: 'Unchanged lines kept around each change. Longer runs collapse to a marker — the point of the view is the change.' },
    { name: 'summary', type: '(added, removed) => ReactNode', description: 'Optional caption under the diff.' },
  ],
  demos: [{ title: 'A prompt that grew two rules', stack: true, code: `<PromptDiff before={previous} after={current} />`, render: () => (<div className="w-full max-w-2xl"><PromptDiff before={PROMPT_BEFORE} after={PROMPT_AFTER} /></div>) }],
}

/* ---------------------------------------------------------- agent tasks */

const TASKS: AgentTask[] = [
  { id: 't1', title: 'Read the ticket and classify it', status: 'done' },
  { id: 't2', title: 'Look up the customer and their plan', status: 'done', steps: [
    { id: 't2a', title: 'get_customer', status: 'done' },
    { id: 't2b', title: 'get_invoice', status: 'done' },
  ] },
  { id: 't3', title: 'Check the refund against policy', status: 'active', note: 'Requested £340; the per-run cap is £200.', steps: [
    { id: 't3a', title: 'Read the refund policy', status: 'done' },
    { id: 't3b', title: 'Compare against the cap', status: 'active' },
  ] },
  { id: 't4', title: 'Draft a reply', status: 'pending' },
  { id: 't5', title: 'Issue the refund', status: 'skipped', note: 'Over the cap — a human has to approve it.' },
]

export const agentTasksEntry: ComponentEntry = {
  id: 'agent-tasks',
  label: 'Agent Tasks',
  isNew: true,
  description:
    'The plan an agent is working from, as it works through it. Not a trace of what happened — a list of what it intends to do, which is what lets you see it heading somewhere wrong while there is still time to stop it.',
  usage: `import { AgentTasks, type AgentTask } from '@/components/ui/agent-tasks'

<AgentTasks tasks={plan} />`,
  composer: { tall: true, controls: [], render: () => (<div className="w-full max-w-xl"><AgentTasks tasks={TASKS} /></div>), code: () => `<AgentTasks tasks={plan} />` },
  api: [
    { name: 'tasks', type: 'AgentTask[]', description: "{ id, title, status, steps?, note? } where status is 'pending' | 'active' | 'done' | 'failed' | 'skipped'." },
    { name: 'one active task', type: 'enforced here', description: 'An agent reporting three tasks in progress has lost track of its plan. Later actives are demoted to pending rather than all being drawn live, which would hide the bug.' },
    { name: 'steps', type: 'one level', description: 'Deliberately not a tree. A plan that needs deep nesting is a plan the agent will not finish.' },
  ],
  demos: [{ title: 'A plan mid-run', stack: true, code: `<AgentTasks tasks={plan} />`, render: () => (<div className="w-full max-w-xl"><AgentTasks tasks={TASKS} /></div>) }],
}

/* -------------------------------------------------------- subagent tree */

const SUBAGENTS: Subagent[] = [
  {
    id: 'root', name: 'orchestrator', task: 'Answer the support ticket', status: 'done', tokens: 4_200, duration: '18.2s',
    children: [
      { id: 'a', name: 'researcher', task: 'Search docs and past tickets', status: 'done', tokens: 31_000, duration: '9.1s', children: [
        { id: 'a1', name: 'reranker', task: 'Score 40 candidates', status: 'done', tokens: 12_400, duration: '2.2s' },
      ] },
      { id: 'b', name: 'billing', task: 'Check the refund against policy', status: 'done', tokens: 6_100, duration: '3.4s' },
      { id: 'c', name: 'drafter', task: 'Write the reply', status: 'failed', tokens: 2_900, duration: '1.8s' },
    ],
  },
]

export const subagentTreeEntry: ComponentEntry = {
  id: 'subagent-tree',
  label: 'Subagent Tree',
  isNew: true,
  description:
    'The tree of subagents a run spawned and what each is costing. Cost aggregates up the tree — a parent that spent 400 tokens itself and fanned out to children that spent 90,000 is cheap by its own line and ruinous in total.',
  usage: `import { SubagentTree, subtreeTokens } from '@/components/ui/subagent-tree'

<SubagentTree agents={agents} onSelect={openAgent} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'totals', label: 'subtree totals', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <SubagentTree agents={SUBAGENTS} showSubtreeTotals={Boolean(state.totals)} onSelect={() => {}} />
      </div>
    ),
    code: (state) => `<SubagentTree\n  agents={agents}\n  showSubtreeTotals={${Boolean(state.totals)}}\n  onSelect={openAgent}\n/>`,
  },
  api: [
    { name: 'agents', type: 'Subagent[]', description: '{ id, name, task?, status?, tokens?, duration?, children? }. `tokens` is that agent alone, excluding its children.' },
    { name: 'subtreeTokens', type: '(agent) => number', description: 'Exported. A node plus every descendant — the number that actually matters on a parent, and the one a per-node readout hides.' },
    { name: 'vs HandoffTrail', type: 'tree vs chain', description: 'A handoff is one agent passing to the next. This is a parent fanning out to several at once; drawing that as a list loses who spawned whom.' },
  ],
  demos: [{ title: 'A fan-out with one failure', stack: true, code: `<SubagentTree agents={agents} />`, render: () => (<div className="w-full max-w-xl"><SubagentTree agents={SUBAGENTS} /></div>) }],
}

/* --------------------------------------------------------- budget guard */

const money = (value: number) => `£${(value / 100).toFixed(2)}`

export const budgetGuardEntry: ComponentEntry = {
  id: 'budget-guard',
  label: 'Budget Guard',
  isNew: true,
  description:
    'Spend and token caps against what a run has consumed. A soft limit warns and a hard limit stops — collapsing them into one bar is how a team ends up believing they have a spend cap when what they have is a notification.',
  usage: `import { BudgetGuard } from '@/components/ui/budget-guard'

<BudgetGuard budgets={[{ id: 'spend', label: 'Spend', used: 18_40, soft: 20_00, hard: 25_00 }]} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'used', label: 'spend used (p)', default: 1840, min: 0, max: 3000, step: 100 }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <BudgetGuard
          budgets={[
            { id: 'spend', label: 'Spend', used: Number(state.used), soft: 2000, hard: 2500, format: money },
            { id: 'tokens', label: 'Tokens', used: 184_000, soft: 400_000, hard: 500_000 },
            { id: 'tools', label: 'Tool calls', used: 12, hard: 40, note: 'per run' },
          ]}
        />
      </div>
    ),
    code: (state) => `<BudgetGuard\n  budgets={[\n    { id: 'spend', label: 'Spend', used: ${Number(state.used)}, soft: 2000, hard: 2500 },\n  ]}\n/>`,
  },
  api: [
    { name: 'budgets', type: 'Budget[]', description: '{ id, label, used, soft?, hard?, format?, note? }.' },
    { name: 'soft vs hard', type: 'the whole point', description: 'Soft warns, hard stops. A hard limit is a wall on the track and turns the row destructive when passed; a soft one is a dashed threshold.' },
    { name: 'bar scale', type: 'against the hard limit', description: 'So the length being read is “room left before it stops”. Scaling to the soft limit makes a run look finished with half its budget left.' },
    { name: 'no budgets', type: 'flagged', description: 'An empty list renders as “this run is uncapped”, not as an empty box.' },
  ],
  demos: [{ title: 'One budget past its warning threshold', stack: true, code: `<BudgetGuard budgets={budgets} />`, render: () => (<div className="w-full max-w-xl"><BudgetGuard budgets={[{ id: 'spend', label: 'Spend', used: 2180, soft: 2000, hard: 2500, format: money }, { id: 'tokens', label: 'Tokens', used: 184_000, soft: 400_000, hard: 500_000 }]} /></div>) }],
}

/* --------------------------------------------------------- retry policy */

export const retryPolicyEntry: ComponentEntry = {
  id: 'retry-policy',
  label: 'Retry Policy',
  isNew: true,
  description:
    'A retry policy and the attempts it produced. A policy shown alone reads as reasonable right up until you see it fired four times in ninety milliseconds — the attempt list is what proves the policy running is the one configured.',
  usage: `import { RetryPolicy } from '@/components/ui/retry-policy'

<RetryPolicy maxAttempts={4} baseDelayMs={500} factor={2} jitter={0.3} attempts={attempts} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'attempts', label: 'maxAttempts', default: 4, min: 1, max: 8, step: 1 },
      { type: 'number', prop: 'jitter', label: 'jitter', default: 0.3, min: 0, max: 0.5, step: 0.1 },
    ],
    render: (state) => (
      <div className="w-full max-w-xl">
        <RetryPolicy
          maxAttempts={Number(state.attempts)}
          baseDelayMs={500}
          factor={2}
          maxDelayMs={30_000}
          jitter={Number(state.jitter)}
          attempts={[
            { attempt: 1, outcome: 'failed', at: '09:41:02', error: '503 from the embedding service' },
            { attempt: 2, outcome: 'failed', waitedMs: 520, at: '09:41:03', error: '503 from the embedding service' },
            { attempt: 3, outcome: 'succeeded', waitedMs: 1_180, at: '09:41:04' },
          ]}
        />
      </div>
    ),
    code: (state) => `<RetryPolicy\n  maxAttempts={${Number(state.attempts)}}\n  baseDelayMs={500}\n  factor={2}\n  jitter={${Number(state.jitter)}}\n  attempts={attempts}\n/>`,
  },
  api: [
    { name: 'maxAttempts / baseDelayMs / factor / maxDelayMs', type: 'number', description: 'The policy. The projected schedule is computed from it, so a policy that would wait eleven minutes on its last attempt says so before anyone ships it.' },
    { name: 'jitter', type: 'number (0–1)', description: 'Rendered as a range, not a point. A delay shown as “2s” hides whether jitter is configured at all — and without it a thousand clients retry in lockstep and turn one outage into two.' },
    { name: 'attempts', type: 'RetryAttempt[]', description: '{ attempt, at?, outcome, waitedMs?, error? }. The history that proves the configured policy is the one running.' },
  ],
  demos: [{ title: 'Two failures then a success', stack: true, code: `<RetryPolicy maxAttempts={4} baseDelayMs={500} jitter={0.3} attempts={attempts} />`, render: () => (<div className="w-full max-w-xl"><RetryPolicy maxAttempts={4} baseDelayMs={500} factor={2} maxDelayMs={30_000} jitter={0.3} attempts={[{ attempt: 1, outcome: 'failed', at: '09:41:02', error: '503' }, { attempt: 2, outcome: 'failed', waitedMs: 520, at: '09:41:03', error: '503' }, { attempt: 3, outcome: 'succeeded', waitedMs: 1_180, at: '09:41:04' }]} /></div>) }],
}

/* ------------------------------------------------------ stream inspector */

const STREAM: StreamEvent[] = [
  { id: 's1', at: 0, kind: 'start', content: 'request sent' },
  { id: 's2', at: 412, kind: 'thinking', content: 'The customer is asking about a refund…' },
  { id: 's3', at: 890, kind: 'text', content: 'Your' }, { id: 's4', at: 912, kind: 'text', content: ' refund' },
  { id: 's5', at: 938, kind: 'text', content: ' of' }, { id: 's6', at: 960, kind: 'text', content: ' £34' },
  { id: 's7', at: 984, kind: 'text', content: '0' }, { id: 's8', at: 1_010, kind: 'text', content: ' is' },
  { id: 's9', at: 1_040, kind: 'tool', content: 'get_invoice({ id: "inv_881" })' },
  { id: 's10', at: 3_120, kind: 'text', content: ' pending' }, { id: 's11', at: 3_150, kind: 'text', content: ' approval' },
  { id: 's12', at: 3_180, kind: 'text', content: '.' },
  { id: 's13', at: 3_240, kind: 'stop', content: 'end_turn' },
]

export const streamInspectorEntry: ComponentEntry = {
  id: 'stream-inspector',
  label: 'Stream Inspector',
  isNew: true,
  description:
    'A model’s token stream event by event, with the timing between them. An average tokens-per-second hides both numbers that matter — time to first token, and the stalls after it.',
  usage: `import { StreamInspector, type StreamEvent } from '@/components/ui/stream-inspector'

<StreamInspector events={events} stallMs={400} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'stall', label: 'stallMs', default: 400, min: 100, max: 2000, step: 100 }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <StreamInspector events={STREAM} stallMs={Number(state.stall)} />
      </div>
    ),
    code: (state) => `<StreamInspector events={events} stallMs={${Number(state.stall)}} />`,
  },
  api: [
    { name: 'events', type: 'StreamEvent[]', description: "{ id, at, kind, content? } where kind is 'start' | 'text' | 'tool' | 'thinking' | 'stop' | 'error'. `at` is ms from the start of the request." },
    { name: 'stallMs', type: 'number', default: '400', description: 'A gap longer than this is marked inline, in the sequence, where it can be traced to the event that caused it — usually a tool call the stream paused for.' },
    { name: 'collapseText', type: 'boolean', default: 'true', description: 'A stream is thousands of two-character deltas; a row each makes the tool-call boundaries impossible to find, which is the only reason to open this.' },
    { name: 'time to first token', type: 'computed', description: 'From the first text or thinking event, shown in the header.' },
  ],
  demos: [{ title: 'A stream that paused for a tool call', stack: true, code: `<StreamInspector events={events} />`, render: () => (<div className="w-full max-w-xl"><StreamInspector events={STREAM} /></div>) }],
}
