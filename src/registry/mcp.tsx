import { useState } from 'react'
import { McpCapabilityMatrix, type CapabilityRow } from '@/components/ui/mcp-capability-matrix'
import { McpConfigEditor, type McpServerConfig } from '@/components/ui/mcp-config-editor'
import { McpElicitation } from '@/components/ui/mcp-elicitation'
import { McpRoots, type McpRoot } from '@/components/ui/mcp-roots'
import { McpSampling, type SamplingMessage } from '@/components/ui/mcp-sampling'
import { McpServerPicker, type CatalogueServer } from '@/components/ui/mcp-server-picker'
import { ToolDiff } from '@/components/ui/tool-diff'
import { McpPromptList, type McpPrompt } from '@/components/ui/mcp-prompt-list'
import { McpResourceList, type McpResource } from '@/components/ui/mcp-resource-list'
import { McpServerCard } from '@/components/ui/mcp-server-card'
import { RpcConsole, type RpcMessage } from '@/components/ui/rpc-console'
import { SchemaForm } from '@/components/ui/schema-form'
import { ToolApproval } from '@/components/ui/tool-approval'
import { ToolResult, type ToolContent } from '@/components/ui/tool-result'
import type { JsonSchema } from '@/components/ui/tool-schema'
import type { ComponentEntry } from './types'

/* ---------------------------------------------------------- server card */

function ServerFleet({ withError = true }: { withError?: boolean }) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <McpServerCard
        name="filesystem"
        target="npx -y @modelcontextprotocol/server-filesystem /Users/ada/work"
        transport="stdio"
        status="connected"
        version="0.6.2"
        protocolVersion="2025-06-18"
        capabilities={{ tools: 8, resources: 214, prompts: 0 }}
        onReconnect={() => {}}
      />
      <McpServerCard
        name="linear"
        target="https://mcp.linear.app/sse"
        transport="sse"
        status={withError ? 'error' : 'connecting'}
        capabilities={withError ? undefined : { tools: 12, resources: 0, prompts: 3 }}
        error={withError ? 'Handshake failed: 401 Unauthorized. The stored token has expired.' : undefined}
        onReconnect={() => {}}
      />
    </div>
  )
}

export const mcpServerCardEntry: ComponentEntry = {
  id: 'mcp-server-card',
  label: 'MCP Server Card',
  description:
    'One MCP server: what it is, how it is attached, and what it brought with it. Leads with the transport and the actual command line, because a server named “filesystem” tells you nothing and `--root /` tells you everything.',
  usage: `import { McpServerCard } from '@/components/ui/mcp-server-card'

<McpServerCard
  name="filesystem"
  target="npx -y @modelcontextprotocol/server-filesystem /Users/ada/work"
  transport="stdio"
  status="connected"
  capabilities={{ tools: 8, resources: 214, prompts: 0 }}
  onReconnect={reconnect}
/>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'withError', label: 'one failed', default: true }],
    render: (state) => <ServerFleet withError={Boolean(state.withError)} />,
    code: () => `<McpServerCard\n  name="filesystem"\n  target="npx -y @modelcontextprotocol/server-filesystem /Users/ada/work"\n  transport="stdio"\n  status="connected"\n  capabilities={{ tools: 8, resources: 214, prompts: 0 }}\n/>`,
  },
  api: [
    { name: 'target', type: 'string', description: 'The command line or endpoint, on its own full-width row, wrapping rather than truncating. The first version clipped it mid-flag — a card that claims one field matters most and then cuts it off is arguing against itself.' },
    { name: 'copyTarget', type: 'boolean', default: 'true', description: 'A copy button beside the command. Off for an endpoint nobody needs on the clipboard.' },
    { name: 'transport', type: "'stdio' | 'http' | 'sse' | 'websocket'", default: "'stdio'", description: 'How it is attached. Shown as a badge beside the status.' },
    { name: 'status', type: "'connected' | 'connecting' | 'disconnected' | 'error'", description: 'A failed server stays in the list — silently dropping it is how a client quietly loses half its capabilities with no indication why.' },
    { name: 'capabilities', type: '{ tools?, resources?, prompts? }', description: 'Counted per kind, never totalled — forty resources is a search index; three tools might be a shell. Zeroes stay visible but dimmed, so an absent capability does not look like an unreported one.' },
    { name: 'alignment', type: 'h-full + mt-auto footer', description: 'Footers line up across a grid even when only some cards carry an error block — the usual way a card grid goes ragged.' },
    { name: 'error', type: 'ReactNode', description: 'Handshake or runtime failure, rendered prominently rather than as a tooltip.' },
    { name: 'onReconnect', type: '() => void', description: 'Renders the retry. Stops propagation, so it does not also select the card.' },
  ],
  demos: [{ title: 'A fleet, one of them broken', stack: true, code: `<McpServerCard name="linear" status="error" error="401 Unauthorized" />`, render: () => <ServerFleet /> }],
}

/* ------------------------------------------------------- resource list */

const RESOURCES: McpResource[] = [
  { uri: 'file:///Users/ada/work/astralyx/README.md', name: 'README', mimeType: 'text/markdown', size: 8_420, server: 'filesystem' },
  { uri: 'file:///Users/ada/.ssh/id_rsa', name: 'SSH key', mimeType: 'text/plain', size: 2_602, server: 'filesystem' },
  { uri: 'postgres://prod/public/customers', name: 'customers', mimeType: 'application/json', server: 'postgres' },
  { uri: 'https://mcp.linear.app/issues/ENG-4127', name: 'ENG-4127 — retry storm', mimeType: 'application/json', server: 'linear' },
]

function ResourcePicker() {
  const [picked, setPicked] = useState(['file:///Users/ada/work/astralyx/README.md'])
  return (
    <div className="w-full max-w-2xl">
      <McpResourceList resources={RESOURCES} value={picked} onValueChange={setPicked} />
    </div>
  )
}

export const mcpResourceListEntry: ComponentEntry = {
  id: 'mcp-resource-list',
  label: 'MCP Resource List',
  description:
    'The resources a server exposes, addressed by URI. The URI is always shown in full and is what search matches first — “SSH key” and file:///Users/me/.ssh/id_rsa are the same resource, and only one of them makes anyone look twice.',
  usage: `import { McpResourceList } from '@/components/ui/mcp-resource-list'

<McpResourceList resources={resources} value={attached} onValueChange={setAttached} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => <ResourcePicker />,
    code: () => `<McpResourceList\n  resources={resources}\n  value={attached}\n  onValueChange={setAttached}\n/>`,
  },
  api: [
    { name: 'resources', type: 'McpResource[]', description: '{ uri, name?, description?, mimeType?, server?, size? }.' },
    { name: 'value / onValueChange', type: 'string[] / (next) => void', description: 'Selected URIs. Omit both for a read-only catalogue — the rows stop being buttons rather than becoming inert ones.' },
    { name: 'searchable', type: 'boolean', default: 'true', description: 'Matches URI, name and MIME type, URI first.' },
    { name: 'showServer', type: 'boolean', default: 'true', description: 'Which server offered it — matters as soon as more than one is connected.' },
  ],
  demos: [{ title: 'Attaching resources to a prompt', stack: true, code: `<McpResourceList resources={resources} value={attached} onValueChange={setAttached} />`, render: () => <ResourcePicker /> }],
}

/* --------------------------------------------------------- prompt list */

const PROMPTS: McpPrompt[] = [
  { name: 'summarise_issue', server: 'linear', description: 'Summarise an issue and its comments.', arguments: [{ name: 'issue_id', required: true, description: 'e.g. ENG-4127' }, { name: 'tone', description: 'terse | detailed' }] },
  { name: 'weekly_digest', server: 'linear', description: 'Everything that moved this week, grouped by project.', arguments: [] },
  { name: 'review_diff', server: 'git', description: 'Review a diff for correctness and style.', arguments: [{ name: 'base', required: true }, { name: 'head', required: true }, { name: 'focus' }] },
]

export const mcpPromptListEntry: ComponentEntry = {
  id: 'mcp-prompt-list',
  label: 'MCP Prompt List',
  description:
    'The prompts a server offers, with the arguments each one takes. How much has to be filled in is visible without expanding, because that is what decides which prompt you pick.',
  usage: `import { McpPromptList } from '@/components/ui/mcp-prompt-list'

<McpPromptList prompts={prompts} onSelect={(p) => insertIntoComposer(p)} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'selectable', label: 'with Use button', default: true }],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <McpPromptList prompts={PROMPTS} onSelect={state.selectable ? () => {} : undefined} />
      </div>
    ),
    code: (state) => `<McpPromptList\n  prompts={prompts}\n${state.selectable ? '  onSelect={insertIntoComposer}\n' : ''}/>`,
  },
  api: [
    { name: 'prompts', type: 'McpPrompt[]', description: '{ name, description?, server?, arguments? } where each argument is { name, description?, required? }.' },
    { name: 'onSelect', type: '(prompt: McpPrompt) => void', description: 'Usually inserts the prompt into a composer. Omit to render the list read-only.' },
    { name: 'argument summary', type: 'always visible', description: 'Count and required-count sit on the collapsed row. A prompt needing three inputs and one needing none are chosen differently.' },
  ],
  demos: [{ title: 'Prompts from two servers', stack: true, code: `<McpPromptList prompts={prompts} onSelect={use} />`, render: () => (<div className="w-full max-w-2xl"><McpPromptList prompts={PROMPTS} onSelect={() => {}} /></div>) }],
}

/* --------------------------------------------------- capability matrix */

const SERVERS = [
  { id: 'fs', name: 'filesystem' },
  { id: 'git', name: 'git' },
  { id: 'linear', name: 'linear' },
]

const CAPS: CapabilityRow[] = [
  { name: 'search', kind: 'tool', providers: ['fs', 'linear'] },
  { name: 'read_file', kind: 'tool', providers: ['fs'] },
  { name: 'list_issues', kind: 'tool', providers: ['linear'] },
  { name: 'diff', kind: 'tool', providers: ['git'] },
  { name: 'status', kind: 'tool', providers: ['git', 'linear'] },
  { name: 'review_diff', kind: 'prompt', providers: ['git'] },
]

export const mcpCapabilityMatrixEntry: ComponentEntry = {
  id: 'mcp-capability-matrix',
  label: 'MCP Capability Matrix',
  description:
    'Which server provides which capability, and where two of them collide. MCP names are not namespaced by the protocol, so two servers exposing `search` is decided by your client’s merge order — silently. A per-server list can never show that.',
  usage: `import { McpCapabilityMatrix } from '@/components/ui/mcp-capability-matrix'

<McpCapabilityMatrix servers={servers} capabilities={caps} resolve={(row) => row.providers[0]} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => (
      <div className="w-full">
        <McpCapabilityMatrix servers={SERVERS} capabilities={CAPS} resolve={(row) => row.providers[0]} />
      </div>
    ),
    code: () => `<McpCapabilityMatrix\n  servers={servers}\n  capabilities={caps}\n  resolve={(row) => row.providers[0]}\n/>`,
  },
  api: [
    { name: 'servers / capabilities', type: '{ id, name }[] / CapabilityRow[]', description: 'CapabilityRow is { name, kind?, providers, description? }. More than one provider is a collision.' },
    { name: 'resolve', type: '(row) => string', description: 'Which provider wins — usually your client’s merge order. The losers are marked Shadowed rather than looking equally available.' },
    { name: 'why a grid', type: 'collisions live between lists', description: 'The clash only exists across servers, so no per-server view can show it. That is the entire reason this renders a matrix.' },
  ],
  demos: [{ title: 'Two servers both exposing `search`', stack: true, code: `<McpCapabilityMatrix servers={servers} capabilities={caps} />`, render: () => <McpCapabilityMatrix className="w-full" servers={SERVERS} capabilities={CAPS} resolve={(row) => row.providers[0]} /> }],
}

/* --------------------------------------------------------- rpc console */

const TRAFFIC: RpcMessage[] = [
  { key: '1', direction: 'out', method: 'initialize', id: 1, kind: 'request', at: '09:41:02.104', payload: { protocolVersion: '2025-06-18', capabilities: { roots: {}, sampling: {} } } },
  { key: '2', direction: 'in', id: 1, kind: 'response', durationMs: 38, at: '09:41:02.142', payload: { serverInfo: { name: 'filesystem', version: '0.6.2' }, capabilities: { tools: {}, resources: { subscribe: true } } } },
  { key: '3', direction: 'out', method: 'tools/list', id: 2, kind: 'request', at: '09:41:02.150', payload: {} },
  { key: '4', direction: 'in', id: 2, kind: 'response', durationMs: 12, at: '09:41:02.162', payload: { tools: [{ name: 'read_file' }, { name: 'write_file' }] } },
  { key: '5', direction: 'in', method: 'notifications/resources/list_changed', kind: 'notification', at: '09:41:08.001', payload: {} },
  { key: '6', direction: 'out', method: 'tools/call', id: 3, kind: 'request', at: '09:41:09.220', payload: { name: 'read_file', arguments: { path: '/etc/shadow' } } },
  { key: '7', direction: 'in', id: 3, kind: 'error', durationMs: 6, at: '09:41:09.226', error: { code: -32603, message: 'Path is outside the permitted roots' }, payload: {} },
  { key: '8', direction: 'out', method: 'resources/read', id: 4, kind: 'request', at: '09:41:10.400', payload: { uri: 'file:///Users/ada/work/README.md' } },
]

export const rpcConsoleEntry: ComponentEntry = {
  id: 'rpc-console',
  label: 'RPC Console',
  description:
    'The JSON-RPC wire between a client and an MCP server. Requests and responses are paired by id, which is what produces the latency figure and what makes an unanswered request visible — the single most useful thing this view can show.',
  usage: `import { RpcConsole, type RpcMessage } from '@/components/ui/rpc-console'

<RpcConsole messages={traffic} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'onlyProblems', label: 'onlyProblems', default: false }],
    render: (state) => (
      <div className="w-full">
        <RpcConsole messages={TRAFFIC} onlyProblems={Boolean(state.onlyProblems)} />
      </div>
    ),
    code: (state) => `<RpcConsole messages={traffic} onlyProblems={${Boolean(state.onlyProblems)}} />`,
  },
  api: [
    { name: 'messages', type: 'RpcMessage[]', description: '{ key, direction, method?, id?, kind?, payload?, error?, at?, durationMs? }. `key` is row identity — several messages share a JSON-RPC id.' },
    { name: 'pairing', type: 'by JSON-RPC id', description: 'An outbound request with no inbound response sharing its id is flagged “no reply”. A flat log renders that as an ordinary row.' },
    { name: 'notifications', type: 'never paired', description: 'They have no id by definition, so they are marked as their own kind rather than looking like an orphaned request.' },
    { name: 'onlyProblems', type: 'boolean', default: 'false', description: 'Errors and unanswered requests only.' },
  ],
  demos: [{ title: 'A handshake, a refusal and a request still in flight', stack: true, code: `<RpcConsole messages={traffic} />`, render: () => <RpcConsole className="w-full" messages={TRAFFIC} /> }],
}

/* ------------------------------------------------------- tool approval */

function ApprovalDemo({ destructive = true }: { destructive?: boolean }) {
  const [decision, setDecision] = useState<string | null>(null)

  if (decision) {
    return (
      <div className="text-muted-foreground w-full max-w-lg text-sm">
        Decided: <code className="font-mono">{decision}</code>{' '}
        <button type="button" className="underline" onClick={() => setDecision(null)}>
          reset
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg">
      <ToolApproval
        tool={destructive ? 'issue_refund' : 'search_docs'}
        origin="billing-mcp"
        destructive={destructive}
        description={
          destructive
            ? 'Moves money out of the merchant account.'
            : 'Full-text search over the help centre.'
        }
        args={
          destructive
            ? { customer_id: 'cus_8812', amount: { value: 340_000, currency: 'GBP' }, reason: 'requested_by_customer' }
            : { query: 'refund policy', limit: 5 }
        }
        onDecide={(next) => setDecision(next)}
      />
    </div>
  )
}

export const toolApprovalEntry: ComponentEntry = {
  id: 'tool-approval',
  label: 'Tool Approval',
  description:
    'The consent prompt before a tool runs. The arguments are shown in full above the buttons, because “Allow issue_refund?” asks you to approve a function name — what matters is that it wants to move £3,400.',
  usage: `import { ToolApproval } from '@/components/ui/tool-approval'

<ToolApproval
  tool="issue_refund"
  origin="billing-mcp"
  destructive
  args={call.arguments}
  onDecide={(decision) => resolve(decision)}
/>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'destructive', label: 'destructive', default: true }],
    render: (state) => <ApprovalDemo destructive={Boolean(state.destructive)} />,
    code: (state) => `<ToolApproval\n  tool="issue_refund"\n  origin="billing-mcp"\n${state.destructive ? '  destructive\n' : ''}  args={call.arguments}\n  onDecide={resolve}\n/>`,
  },
  api: [
    { name: 'args', type: 'unknown', description: 'Rendered in full, above the buttons. This is the thing actually being approved; the tool name is the label on the envelope.' },
    { name: 'onDecide', type: "(d: 'once' | 'always' | 'deny') => void", description: 'Three outcomes, not two. “Always” is a standing grant and says what it will do next time rather than reading as a faster yes.' },
    { name: 'destructive', type: 'boolean', description: 'Puts the weight on the approve action rather than on cancel, so the emphasis matches the actual risk.' },
    { name: 'deny styling', type: 'ghost, never destructive', description: 'Declining a tool call is always safe; running one may not be. Styling deny as the dangerous choice inverts that.' },
    { name: 'no auto-approve', type: 'by design', description: 'There is no timeout and no default focus on approve.' },
  ],
  demos: [
    { title: 'A destructive call', stack: true, code: `<ToolApproval tool="issue_refund" destructive args={args} onDecide={resolve} />`, render: () => <ApprovalDemo /> },
    { title: 'An ordinary one', stack: true, code: `<ToolApproval tool="search_docs" args={args} onDecide={resolve} />`, render: () => <ApprovalDemo destructive={false} /> },
  ],
}

/* --------------------------------------------------------- tool result */

const BLOCKS: ToolContent[] = [
  { type: 'text', text: 'Found 3 matching documents in the help centre.' },
  { type: 'json', value: { hits: [{ id: 'doc_18', score: 0.94, title: 'Refund policy' }, { id: 'doc_41', score: 0.71, title: 'Chargebacks' }] } },
  { type: 'resource', uri: 'file:///docs/refunds.md', mimeType: 'text/markdown', text: '# Refund policy\n\nRefunds are issued to the original payment method within 5 working days.' },
]

export const toolResultEntry: ComponentEntry = {
  id: 'tool-result',
  label: 'Tool Result',
  description:
    'What a tool actually returned, rendered by content type. An MCP result is a list of blocks that can mix text, images and embedded resources — JSON.stringify turns a returned screenshot into four thousand characters of base64.',
  usage: `import { ToolResult, type ToolContent } from '@/components/ui/tool-result'

<ToolResult tool="search_docs" content={result.content} isError={result.isError} durationMs={120} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'isError', label: 'isError', default: false }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <ToolResult
          tool="search_docs"
          durationMs={120}
          isError={Boolean(state.isError)}
          content={
            state.isError
              ? [{ type: 'text', text: 'Index unavailable: the embedding service returned 503.' }]
              : BLOCKS
          }
        />
      </div>
    ),
    code: (state) => `<ToolResult\n  tool="search_docs"\n  content={result.content}\n  isError={${Boolean(state.isError)}}\n  durationMs={120}\n/>`,
  },
  api: [
    { name: 'content', type: 'ToolContent[]', description: "Blocks of { type: 'text' | 'json' | 'image' | 'resource' }. Each is rendered as what it is — an image is a picture, not base64." },
    { name: 'isError', type: 'boolean', description: 'Part of the payload, not the transport: MCP reports tool failure with a successful response carrying isError. A UI that only styles transport errors shows a failed call as a success.' },
    { name: 'maxBlocks', type: 'number', default: '3', description: 'Collapses the rest behind a disclosure.' },
    { name: 'copying', type: 'text and JSON only', description: 'Those are the blocks anyone wants on the clipboard.' },
  ],
  demos: [{ title: 'Mixed content blocks', stack: true, code: `<ToolResult tool="search_docs" content={result.content} />`, render: () => (<div className="w-full max-w-xl"><ToolResult tool="search_docs" durationMs={120} content={BLOCKS} /></div>) }],
}

/* --------------------------------------------------------- schema form */

const CALL_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: { type: 'string', description: 'Absolute path, inside the permitted roots.' },
    encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' },
    max_bytes: { type: 'integer', description: 'Truncate above this.', default: 65_536 },
    tail: { type: 'boolean', description: 'Read from the end instead of the start.' },
    exclude: { type: 'array', description: 'Glob patterns to skip.' },
  },
}

function SchemaFormDemo() {
  const [value, setValue] = useState<Record<string, unknown>>({ encoding: 'utf-8', max_bytes: 65_536 })
  const [sent, setSent] = useState<string | null>(null)

  return (
    <div className="w-full max-w-md space-y-2">
      <SchemaForm
        schema={CALL_SCHEMA}
        value={value}
        onChange={setValue}
        onSubmit={(next) => setSent(JSON.stringify(next))}
        submitLabel="Call read_file"
      />
      {sent && <p className="text-muted-foreground font-mono text-[11px] break-all">{sent}</p>}
    </div>
  )
}

export const schemaFormEntry: ComponentEntry = {
  id: 'schema-form',
  label: 'Schema Form',
  description:
    'A form generated from a JSON Schema, so a person can invoke a tool by hand. The counterpart to Tool Schema: that one explains the parameters, this one collects them — together they are how you test an MCP tool without writing a client.',
  usage: `import { SchemaForm } from '@/components/ui/schema-form'

<SchemaForm
  schema={tool.inputSchema}
  value={args}
  onChange={setArgs}
  onSubmit={(args) => callTool(tool.name, args)}
/>`,
  composer: { tall: true, controls: [], render: () => <SchemaFormDemo />, code: () => `<SchemaForm\n  schema={tool.inputSchema}\n  value={args}\n  onChange={setArgs}\n  onSubmit={(args) => callTool(tool.name, args)}\n/>` },
  api: [
    { name: 'schema', type: 'JsonSchema', description: 'Handles the subset tool definitions actually use: string, number, integer, boolean, enum, and string arrays entered one per line.' },
    { name: 'nested objects', type: 'out of scope', description: 'Deliberately. A generated form for a deep schema is worse than a JSON editor, and CodeBlock already is one.' },
    { name: 'validation', type: 'reported, not enforced', description: 'Submit is never disabled for missing fields. A dead button that will not say why is the worst version of a form — the missing names are listed instead.' },
    { name: 'busy', type: 'boolean', description: 'Disables every control while the call is in flight.' },
  ],
  demos: [{ title: 'Calling read_file by hand', stack: true, code: `<SchemaForm schema={tool.inputSchema} value={args} onChange={setArgs} onSubmit={call} />`, render: () => <SchemaFormDemo /> }],
}

/* ------------------------------------------------------- config editor */

const CONFIG: Record<string, McpServerConfig> = {
  filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/ada/work'] },
  linear: { url: 'https://mcp.linear.app/sse', env: { LINEAR_API_KEY: 'lin_api_8f2a91c4e7' } },
  postgres: { command: 'server-postgres', args: ['--dsn', 'postgres://localhost/app'] },
  files: { command: 'npx', args: [] },
}

export const mcpConfigEditorEntry: ComponentEntry = {
  id: 'mcp-config-editor',
  label: 'MCP Config Editor',
  description:
    'The mcpServers config with the mistakes people actually make called out. The usual failure parses cleanly and the server silently never appears — the error is in the shape, not the syntax, so a JSON editor catches none of it.',
  usage: `import { McpConfigEditor, inspectMcpConfig } from '@/components/ui/mcp-config-editor'

<McpConfigEditor servers={servers} onChange={setText} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'inspect', label: 'shape checks', default: true }],
    render: (state) => (
      <div className="w-full">
        <McpConfigEditor servers={CONFIG} inspect={Boolean(state.inspect)} />
      </div>
    ),
    code: (state) => `<McpConfigEditor\n  servers={servers}\n  inspect={${Boolean(state.inspect)}}\n  onChange={setText}\n/>`,
  },
  api: [
    { name: 'servers', type: 'Record<string, McpServerConfig>', description: 'The mcpServers object. Rendered as JSON, inspected as a shape.' },
    { name: 'checks', type: 'four, each earned', description: 'No command or url; a bare command that only resolves from your shell’s PATH; a secret pasted inline; a filesystem server with no arguments, which usually means rooted at /.' },
    { name: 'inspectMcpConfig', type: '(servers) => ConfigFinding[]', description: 'Exported, so a save handler can run the same checks before writing the file.' },
    { name: 'advisory only', type: 'never blocks', description: 'A config being edited is invalid most of the time. A component that refuses to render until it is valid is useless while typing.' },
  ],
  demos: [{ title: 'Four servers, three problems', stack: true, code: `<McpConfigEditor servers={servers} />`, render: () => <McpConfigEditor className="w-full" servers={CONFIG} /> }],
}

/* --------------------------------------------------------------- roots */

const ROOTS: McpRoot[] = [
  { uri: 'file:///Users/ada/work/astralyx', name: 'astralyx', servers: ['filesystem', 'git'] },
  { uri: 'file:///tmp/agent-scratch', name: 'Scratch', readOnly: false },
  { uri: 'file:///Users/ada', name: 'Home', servers: ['filesystem'] },
]

export const mcpRootsEntry: ComponentEntry = {
  id: 'mcp-roots',
  label: 'MCP Roots',
  description:
    'The roots a client has granted its servers — the closest thing MCP has to a permission boundary, and invisible in most clients. A root covering a whole home directory is drawn as a warning rather than as another grey row.',
  usage: `import { McpRoots } from '@/components/ui/mcp-roots'

<McpRoots roots={roots} onAdd={add} onRemove={remove} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'editable', label: 'editable', default: true }],
    render: (state) => (
      <div className="w-full max-w-xl">
        <McpRoots
          roots={ROOTS}
          onAdd={state.editable ? () => {} : undefined}
          onRemove={state.editable ? () => {} : undefined}
        />
      </div>
    ),
    code: (state) => `<McpRoots\n  roots={roots}\n${state.editable ? '  onAdd={add}\n  onRemove={remove}\n' : ''}/>`,
  },
  api: [
    { name: 'roots', type: 'McpRoot[]', description: '{ uri, name?, servers?, readOnly? }. `servers` absent or empty means every connected server.' },
    { name: 'broad detection', type: 'isBroadRoot', description: '`/`, a bare `~`, and `/Users/<name>` or `/home/<name>` cover everything a person owns. Exported so a save handler can check before granting.' },
    { name: 'scoping', type: 'shown per root', description: 'A root granted to every server is a different fact from one granted to a single trusted server, and a flat path list cannot tell them apart.' },
    { name: 'no roots', type: 'stated explicitly', description: 'Rendered as “servers can see nothing”, rather than as an empty box that could mean either thing.' },
  ],
  demos: [{ title: 'One root wider than intended', stack: true, code: `<McpRoots roots={roots} onRemove={remove} />`, render: () => (<div className="w-full max-w-xl"><McpRoots roots={ROOTS} onRemove={() => {}} /></div>) }],
}

/* ------------------------------------------------------------ sampling */

const SAMPLING: SamplingMessage[] = [
  { role: 'system', content: 'Summarise the diff for a changelog entry. One sentence, past tense.' },
  { role: 'user', content: '--- a/src/auth.ts\n+++ b/src/auth.ts\n@@\n- const TTL = 3600\n+ const TTL = 900' },
]

export const mcpSamplingEntry: ComponentEntry = {
  id: 'mcp-sampling',
  label: 'MCP Sampling',
  description:
    'A server asking the client to run a model on its behalf. Sampling inverts the usual direction — the server sends the request, your model and your budget answer it — so the messages are shown verbatim before the buttons.',
  usage: `import { McpSampling } from '@/components/ui/mcp-sampling'

<McpSampling server="git" messages={request.messages} maxTokens={512} onApprove={run} onDeny={deny} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'bounded', label: 'maxTokens set', default: true }],
    render: (state) => (
      <div className="w-full max-w-lg">
        <McpSampling
          server="git"
          messages={SAMPLING}
          intent="Generating a changelog line for the last commit."
          maxTokens={state.bounded ? 512 : undefined}
          modelHint="haiku"
          onApprove={() => {}}
          onDeny={() => {}}
        />
      </div>
    ),
    code: (state) => `<McpSampling\n  server="git"\n  messages={request.messages}\n${state.bounded ? '  maxTokens={512}\n' : ''}  onApprove={run}\n  onDeny={deny}\n/>`,
  },
  api: [
    { name: 'messages', type: 'SamplingMessage[]', description: 'Shown verbatim, in the server’s order, above the buttons. A server you installed for file search can ask for a completion; unless the client shows it, nobody sees what was sent.' },
    { name: 'maxTokens', type: 'number', description: 'What the request will cost. Absent is flagged as unbounded rather than defaulted quietly.' },
    { name: 'approve styling', type: 'secondary, not primary', description: 'This is a server spending your budget on its own initiative. The emphasis belongs on reading it first.' },
  ],
  demos: [{ title: 'A server asking for a completion', stack: true, code: `<McpSampling server="git" messages={messages} maxTokens={512} />`, render: () => (<div className="w-full max-w-lg"><McpSampling server="git" messages={SAMPLING} intent="Generating a changelog line." maxTokens={512} onApprove={() => {}} onDeny={() => {}} /></div>) }],
}

/* --------------------------------------------------------- elicitation */

const ELICIT_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['environment'],
  properties: {
    environment: { type: 'string', enum: ['staging', 'production'], description: 'Which database to migrate.' },
    confirm_backup: { type: 'boolean', description: 'A backup was taken in the last hour.' },
    api_key: { type: 'string', description: 'Needed to authenticate the migration.' },
  },
}

export const mcpElicitationEntry: ComponentEntry = {
  id: 'mcp-elicitation',
  label: 'MCP Elicitation',
  description:
    'A server asking the user for structured input mid-run. Useful, and a good phishing surface — the prompt text is written by the server and appears wearing your client’s chrome, so the requesting server is named outside its own copy.',
  usage: `import { McpElicitation } from '@/components/ui/mcp-elicitation'

<McpElicitation server="postgres" message={request.message} schema={request.schema} onSubmit={reply} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => (
      <div className="w-full max-w-lg">
        <McpElicitation
          server="postgres"
          message="Before running the migration I need to know which environment to target."
          schema={ELICIT_SCHEMA}
          onSubmit={() => {}}
          onDecline={() => {}}
        />
      </div>
    ),
    code: () => `<McpElicitation\n  server="postgres"\n  message={request.message}\n  schema={request.schema}\n  onSubmit={reply}\n  onDecline={decline}\n/>`,
  },
  api: [
    { name: 'server', type: 'string', description: 'Named at the top, outside the server’s own message. “Your session expired, re-enter your token” is indistinguishable from the client asking unless the client says who is asking.' },
    { name: 'credential refusal', type: 'automatic', description: 'A field named like a password, key, token, secret or seed phrase is stripped from the schema before the form is built, and the request is flagged. No legitimate elicitation needs one.' },
    { name: 'credentialFields', type: '(schema) => string[]', description: 'Exported, so a client can refuse the request outright rather than rendering it.' },
    { name: 'message', type: 'ReactNode', description: 'Untrusted text from the server. Rendered, never interpreted.' },
  ],
  demos: [{ title: 'A request that also asks for an API key', stack: true, code: `<McpElicitation server="postgres" message={message} schema={schema} />`, render: () => (<div className="w-full max-w-lg"><McpElicitation server="postgres" message="Before running the migration I need to know which environment to target." schema={ELICIT_SCHEMA} onSubmit={() => {}} onDecline={() => {}} /></div>) }],
}

/* -------------------------------------------------------- server picker */

const CATALOGUE: CatalogueServer[] = [
  { id: 'fs', name: 'filesystem', publisher: 'modelcontextprotocol', verified: true, installs: 48_200, installed: true, tags: ['files'], target: 'npx -y @modelcontextprotocol/server-filesystem <root>', description: 'Read, write and search files under a granted root.' },
  { id: 'pg', name: 'postgres', publisher: 'modelcontextprotocol', verified: true, installs: 21_400, tags: ['database'], target: 'npx -y @modelcontextprotocol/server-postgres <dsn>', description: 'Schema introspection and read-only queries.' },
  { id: 'linear', name: 'linear', publisher: 'linear.app', verified: true, installs: 9_800, tags: ['issues'], target: 'https://mcp.linear.app/sse', description: 'Issues, projects and cycles.' },
  { id: 'scraper', name: 'web-scraper-pro', publisher: 'anon-dev-2024', installs: 120, tags: ['web'], target: 'npx -y web-scraper-pro', description: 'Scrapes any page and returns the text.' },
]

export const mcpServerPickerEntry: ComponentEntry = {
  id: 'mcp-server-picker',
  label: 'MCP Server Picker',
  description:
    'A catalogue of servers you could install. Installing one is running someone else’s code with your credentials, so the card leads with publisher and verification rather than with the blurb — which is written by the person asking to be trusted.',
  usage: `import { McpServerPicker } from '@/components/ui/mcp-server-picker'

<McpServerPicker servers={catalogue} onInstall={(server) => showCommand(server)} />`,
  composer: { tall: true, controls: [], render: () => (<div className="w-full"><McpServerPicker servers={CATALOGUE} onInstall={() => {}} /></div>), code: () => `<McpServerPicker\n  servers={catalogue}\n  onInstall={(server) => showCommand(server)}\n/>` },
  api: [
    { name: 'servers', type: 'CatalogueServer[]', description: '{ id, name, publisher, description?, target?, verified?, installs?, tags?, installed? }.' },
    { name: 'provenance first', type: 'layout decision', description: 'Publisher and verification sit above the description. The description is marketing copy from the party asking for trust.' },
    { name: 'installed', type: 'marked, not filtered', description: 'Hiding them makes the catalogue lie about what exists, and “which of these do I already have” is the second question anyone asks.' },
    { name: 'onInstall', type: '(server) => void', description: 'A callback, not an installer. A catalogue that installs on click is a supply-chain problem with a nice UI — hosts usually show the command instead.' },
  ],
  demos: [{ title: 'Three verified publishers and one that is not', stack: true, code: `<McpServerPicker servers={catalogue} onInstall={showCommand} />`, render: () => <McpServerPicker className="w-full" servers={CATALOGUE} onInstall={() => {}} /> }],
}

/* ------------------------------------------------------------ tool diff */

const TOOL_BEFORE: JsonSchema = {
  type: 'object',
  required: ['path'],
  properties: {
    path: { type: 'string', description: 'File to read.' },
    encoding: { type: 'string', enum: ['utf-8', 'base64', 'latin1'] },
    max_bytes: { type: 'integer' },
  },
}

const TOOL_AFTER: JsonSchema = {
  type: 'object',
  required: ['path', 'encoding'],
  properties: {
    path: { type: 'string', description: 'Absolute path, inside the granted roots.' },
    encoding: { type: 'string', enum: ['utf-8', 'base64'] },
    limit: { type: 'integer' },
  },
}

export const toolDiffEntry: ComponentEntry = {
  id: 'tool-diff',
  label: 'Tool Diff',
  description:
    'What changed in a tool’s contract between two server versions, with breaking changes classified rather than just listed. Adding an optional parameter and making one required are both edits to `properties`; only one breaks every existing call.',
  usage: `import { ToolDiff, diffToolSchemas } from '@/components/ui/tool-diff'

<ToolDiff tool="read_file" before={old.inputSchema} after={next.inputSchema} />`,
  composer: {
    tall: true,
    controls: [],
    render: () => (
      <div className="w-full max-w-xl">
        <ToolDiff tool="read_file" before={TOOL_BEFORE} after={TOOL_AFTER} beforeLabel="0.6.2" afterLabel="0.7.0" />
      </div>
    ),
    code: () => `<ToolDiff\n  tool="read_file"\n  before={old.inputSchema}\n  after={next.inputSchema}\n  beforeLabel="0.6.2"\n  afterLabel="0.7.0"\n/>`,
  },
  api: [
    { name: 'before / after', type: 'JsonSchema', description: 'The two input schemas. Compared one level deep, which is where tool parameters live.' },
    { name: 'breaking rules', type: 'encoded, not guessed', description: 'Removals, newly-required fields, type changes and removed enum values break. Additions, relaxed requirements and description edits do not.' },
    { name: 'type changes', type: 'always breaking', description: 'Even integer → number. The caller is a model that was shown the old schema and will keep producing the old shape.' },
    { name: 'diffToolSchemas', type: '(before, after) => ToolChange[]', description: 'Exported, so CI can fail a server upgrade that breaks a contract.' },
    { name: 'changes', type: 'ToolChange[]', description: 'Supply your own comparison instead of the built-in one.' },
  ],
  demos: [{ title: 'A server upgrade that breaks three things', stack: true, code: `<ToolDiff tool="read_file" before={before} after={after} />`, render: () => (<div className="w-full max-w-xl"><ToolDiff tool="read_file" before={TOOL_BEFORE} after={TOOL_AFTER} beforeLabel="0.6.2" afterLabel="0.7.0" /></div>) }],
}
