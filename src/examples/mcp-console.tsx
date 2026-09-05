import { useState } from 'react'
import {
  Blocks, FileJson, FolderTree, Grid3x3, Inbox, Play, Plug, RotateCcw, Server,
  ShieldQuestion, Wrench,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty } from '@/components/ui/empty'
import { McpCapabilityMatrix, type CapabilityRow } from '@/components/ui/mcp-capability-matrix'
import { McpConfigEditor, type McpServerConfig } from '@/components/ui/mcp-config-editor'
import { McpElicitation } from '@/components/ui/mcp-elicitation'
import { McpPromptList, type McpPrompt } from '@/components/ui/mcp-prompt-list'
import { McpResourceList, type McpResource } from '@/components/ui/mcp-resource-list'
import { McpRoots, type McpRoot } from '@/components/ui/mcp-roots'
import { McpSampling, type SamplingMessage } from '@/components/ui/mcp-sampling'
import { McpServerCard, type McpStatus, type McpTransport } from '@/components/ui/mcp-server-card'
import { McpServerPicker, type CatalogueServer } from '@/components/ui/mcp-server-picker'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToolApproval } from '@/components/ui/tool-approval'
import { ToolDiff } from '@/components/ui/tool-diff'
import { ToolResult, type ToolContent } from '@/components/ui/tool-result'
import { ToolSchema, type JsonSchema } from '@/components/ui/tool-schema'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

type FleetServer = {
  id: string
  name: string
  target: string
  transport: McpTransport
  version?: string
  protocolVersion: string
  capabilities?: { tools: number; resources: number; prompts: number }
  status: McpStatus
  error?: string
}

const SERVERS: FleetServer[] = [
  {
    id: 'fs', name: 'filesystem', transport: 'stdio', status: 'connected',
    target: 'npx -y @modelcontextprotocol/server-filesystem /Users/ada/work',
    version: '0.6.2', protocolVersion: '2025-06-18',
    capabilities: { tools: 3, resources: 214, prompts: 0 },
  },
  {
    id: 'pg', name: 'postgres', transport: 'stdio', status: 'connected',
    target: 'server-postgres --dsn postgres://localhost:5432/astralyx',
    version: '1.2.0', protocolVersion: '2025-06-18',
    capabilities: { tools: 2, resources: 38, prompts: 1 },
  },
  {
    id: 'sentry', name: 'sentry', transport: 'http', status: 'connected',
    target: 'https://mcp.sentry.dev/mcp',
    version: '0.9.4', protocolVersion: '2025-06-18',
    capabilities: { tools: 3, resources: 12, prompts: 2 },
  },
  {
    id: 'linear', name: 'linear', transport: 'sse', status: 'error',
    target: 'https://mcp.linear.app/sse',
    protocolVersion: '2025-06-18',
    error: 'Handshake failed: 401 Unauthorized. The stored token expired on 2026-08-30.',
  },
]

type Tool = {
  key: string
  server: string
  name: string
  description: string
  destructive?: boolean
  schema: JsonSchema
  args: Record<string, unknown>
  result: ToolContent[]
  resultError?: boolean
  durationMs: number
  /** The schema this tool shipped with before the pending upgrade. */
  previous?: JsonSchema
  previousLabel?: string
  nextLabel?: string
}

const TOOLS: Tool[] = [
  {
    key: 'fs:read_file', server: 'fs', name: 'read_file', durationMs: 14,
    description: 'Read one file inside a granted root.',
    schema: {
      type: 'object',
      required: ['path', 'encoding'],
      properties: {
        path: { type: 'string', description: 'Absolute path, inside the granted roots.' },
        encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' },
        limit: { type: 'integer', description: 'Truncate above this many bytes.', default: 65_536 },
      },
    },
    previous: {
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', description: 'File to read.' },
        encoding: { type: 'string', enum: ['utf-8', 'base64', 'latin1'] },
        max_bytes: { type: 'integer' },
      },
    },
    previousLabel: '0.6.2',
    nextLabel: '0.7.0',
    args: { path: '/Users/ada/work/astralyx/package.json', encoding: 'utf-8' },
    result: [
      { type: 'text', text: 'Read 1,842 bytes from package.json.' },
      { type: 'json', value: { name: 'astralyx-ui-kit', version: '0.9.0', private: true } },
    ],
  },
  {
    key: 'fs:write_file', server: 'fs', name: 'write_file', destructive: true, durationMs: 22,
    description: 'Overwrite a file. There is no undo on the server side.',
    schema: {
      type: 'object',
      required: ['path', 'content'],
      properties: {
        path: { type: 'string', description: 'Absolute path, inside the granted roots.' },
        content: { type: 'string', description: 'Replaces the file wholesale.' },
        create_dirs: { type: 'boolean', description: 'Create missing parent directories.', default: false },
      },
    },
    args: { path: '/Users/ada/work/astralyx/.env.local', content: 'ANTHROPIC_LOG=debug\n', create_dirs: false },
    result: [{ type: 'text', text: 'Wrote 21 bytes to .env.local.' }],
  },
  {
    key: 'fs:search', server: 'fs', name: 'search', durationMs: 118,
    description: 'Full-text search across the granted roots.',
    schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        glob: { type: 'string', description: 'Restrict to matching paths, e.g. **/*.ts' },
        limit: { type: 'integer', default: 20 },
      },
    },
    args: { query: 'corner-shape', glob: '**/*.tsx', limit: 20 },
    result: [
      { type: 'text', text: '6 matches in 4 files.' },
      { type: 'resource', uri: 'file:///Users/ada/work/astralyx/src/lib/styles.ts', mimeType: 'text/plain', text: "export const radius = {\n  control: 'rounded-[10px] [corner-shape:squircle]'," },
    ],
  },
  {
    key: 'pg:run_query', server: 'pg', name: 'run_query', durationMs: 63,
    description: 'Read-only SQL against the connected database.',
    schema: {
      type: 'object',
      required: ['sql'],
      properties: {
        sql: { type: 'string', description: 'A single SELECT. Writes are rejected by the server.' },
        params: { type: 'array', description: 'Positional bind parameters.' },
        timeout_ms: { type: 'integer', default: 5_000 },
      },
    },
    args: { sql: 'select plan, count(*) from accounts group by plan', timeout_ms: 5_000 },
    result: [
      { type: 'json', value: [{ plan: 'team', count: 4_182 }, { plan: 'pro', count: 911 }, { plan: 'free', count: 60_240 }] },
    ],
  },
  {
    key: 'pg:describe_table', server: 'pg', name: 'describe_table', durationMs: 9,
    description: 'Columns, types and indexes for one table.',
    schema: {
      type: 'object',
      required: ['table'],
      properties: {
        table: { type: 'string' },
        schema: { type: 'string', default: 'public' },
      },
    },
    args: { table: 'accounts', schema: 'public' },
    result: [{ type: 'json', value: { columns: [{ name: 'id', type: 'uuid' }, { name: 'plan', type: 'text' }, { name: 'created_at', type: 'timestamptz' }], indexes: ['accounts_pkey', 'accounts_plan_idx'] } }],
  },
  {
    key: 'sentry:list_issues', server: 'sentry', name: 'list_issues', durationMs: 240,
    description: 'Unresolved issues for a project, newest first.',
    schema: {
      type: 'object',
      required: ['project'],
      properties: {
        project: { type: 'string' },
        environment: { type: 'string', enum: ['production', 'staging'], default: 'production' },
        limit: { type: 'integer', default: 25 },
      },
    },
    args: { project: 'astralyx-web', environment: 'production', limit: 25 },
    result: [
      { type: 'text', text: '3 unresolved issues in astralyx-web (production).' },
      { type: 'json', value: [{ id: 'AST-91', title: 'TypeError: cannot read properties of null (reading “focus”)', events: 412 }, { id: 'AST-88', title: 'Hydration mismatch in <ThreadList>', events: 96 }] },
    ],
  },
  {
    key: 'sentry:resolve_issue', server: 'sentry', name: 'resolve_issue', destructive: true, durationMs: 88,
    description: 'Marks an issue resolved for everyone on the project.',
    schema: {
      type: 'object',
      required: ['issue_id'],
      properties: {
        issue_id: { type: 'string' },
        in_next_release: { type: 'boolean', default: false },
        comment: { type: 'string' },
      },
    },
    args: { issue_id: 'AST-88', in_next_release: true, comment: 'Fixed by pinning the example clock.' },
    result: [{ type: 'text', text: 'Sentry returned 403: the connected token has read scope only.' }],
    resultError: true,
  },
  {
    key: 'sentry:search', server: 'sentry', name: 'search', durationMs: 310,
    description: 'Search events by message, tag or release.',
    schema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        since: { type: 'string', description: 'ISO 8601 or a relative window like 24h.', default: '24h' },
      },
    },
    args: { query: 'hydration', since: '24h' },
    result: [{ type: 'text', text: '96 events matching “hydration” in the last 24 hours.' }],
  },
]

/**
 * The merged view across servers. MCP does not namespace names, so two servers
 * exposing `search` is settled by the client's merge order — silently, unless
 * something draws it.
 */
const CAPABILITIES: CapabilityRow[] = [
  { name: 'read_file', kind: 'tool', providers: ['fs'], description: 'Read one file inside a root.' },
  { name: 'write_file', kind: 'tool', providers: ['fs'] },
  { name: 'search', kind: 'tool', providers: ['fs', 'sentry'], description: 'Two servers, one name.' },
  { name: 'run_query', kind: 'tool', providers: ['pg'] },
  { name: 'describe_table', kind: 'tool', providers: ['pg'] },
  { name: 'list_issues', kind: 'tool', providers: ['sentry', 'linear'], description: 'Issue trackers collide by default.' },
  { name: 'resolve_issue', kind: 'tool', providers: ['sentry'] },
  { name: 'schema', kind: 'resource', providers: ['pg'] },
  { name: 'triage_issue', kind: 'prompt', providers: ['sentry', 'linear'] },
  { name: 'weekly_digest', kind: 'prompt', providers: ['linear'] },
]

const RESOURCES: McpResource[] = [
  { uri: 'file:///Users/ada/work/astralyx/README.md', name: 'README', mimeType: 'text/markdown', size: 8_420, server: 'fs' },
  { uri: 'file:///Users/ada/work/astralyx/src/lib/styles.ts', name: 'styles.ts', mimeType: 'text/plain', size: 14_902, server: 'fs' },
  { uri: 'file:///Users/ada/.aws/credentials', name: 'AWS credentials', mimeType: 'text/plain', size: 412, server: 'fs' },
  { uri: 'postgres://astralyx/public/accounts', name: 'accounts', mimeType: 'application/json', server: 'pg' },
  { uri: 'postgres://astralyx/public/subscriptions', name: 'subscriptions', mimeType: 'application/json', server: 'pg' },
  { uri: 'https://mcp.sentry.dev/issues/AST-88', name: 'AST-88 — hydration mismatch', mimeType: 'application/json', server: 'sentry' },
]

const PROMPTS: McpPrompt[] = [
  { name: 'triage_issue', server: 'sentry', description: 'Summarise an issue and propose an owner.', arguments: [{ name: 'issue_id', required: true, description: 'e.g. AST-88' }, { name: 'depth', description: 'brief | full' }] },
  { name: 'release_notes', server: 'sentry', description: 'Regressions introduced since the last release.', arguments: [{ name: 'release', required: true }] },
  { name: 'explain_schema', server: 'pg', description: 'Describe a table and how it joins to the rest.', arguments: [{ name: 'table', required: true }] },
]

const CATALOGUE: CatalogueServer[] = [
  { id: 'fs', name: 'filesystem', publisher: 'modelcontextprotocol', verified: true, installs: 48_200, installed: true, tags: ['files'], target: 'npx -y @modelcontextprotocol/server-filesystem <root>', description: 'Read, write and search files under a granted root.' },
  { id: 'pg', name: 'postgres', publisher: 'modelcontextprotocol', verified: true, installs: 21_400, installed: true, tags: ['database'], target: 'npx -y @modelcontextprotocol/server-postgres <dsn>', description: 'Schema introspection and read-only queries.' },
  { id: 'gh', name: 'github', publisher: 'github.com', verified: true, installs: 33_100, tags: ['code', 'issues'], target: 'https://api.githubcopilot.com/mcp/', description: 'Repositories, pull requests and issues.' },
  { id: 'stripe', name: 'stripe', publisher: 'stripe.com', verified: true, installs: 7_600, tags: ['payments'], target: 'https://mcp.stripe.com', description: 'Customers, invoices and refunds.' },
  { id: 'scraper', name: 'browser-agent-pro', publisher: 'fastmcp-tools', installs: 84, tags: ['web'], target: 'npx -y browser-agent-pro --allow-all', description: 'Drives a headless browser and returns whatever it finds.' },
]

const CONFIG: Record<string, McpServerConfig> = {
  filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/ada/work'] },
  postgres: { command: 'server-postgres', args: ['--dsn', 'postgres://localhost:5432/astralyx'] },
  sentry: { url: 'https://mcp.sentry.dev/mcp' },
  linear: { url: 'https://mcp.linear.app/sse', env: { LINEAR_API_KEY: 'lin_api_8f2a91c4e7' } },
  scratch: { command: 'npx', args: [] },
}

const INITIAL_ROOTS: McpRoot[] = [
  { uri: 'file:///Users/ada/work/astralyx', name: 'astralyx', servers: ['filesystem'] },
  { uri: 'file:///tmp/agent-scratch', name: 'Scratch' },
  { uri: 'file:///Users/ada', name: 'Home' },
]

/** Roots the Add button grants, in order. A real client opens a file picker. */
const GRANTABLE: McpRoot[] = [
  { uri: 'file:///Users/ada/work/astralyx-docs', name: 'docs', servers: ['filesystem'], readOnly: true },
  { uri: 'file:///Users/ada/work/infra', name: 'infra', servers: ['filesystem'] },
]

const SAMPLING_REQUEST: SamplingMessage[] = [
  { role: 'system', content: 'Write a one-line changelog entry in past tense. No trailing full stop.' },
  { role: 'user', content: '--- a/src/examples/mcp-console.tsx\n+++ b/src/examples/mcp-console.tsx\n@@\n- const now = new Date()\n+ const NOW = new Date("2026-09-05T09:30:00")' },
]

const ELICIT_SCHEMA: JsonSchema = {
  type: 'object',
  required: ['environment'],
  properties: {
    environment: { type: 'string', enum: ['staging', 'production'], description: 'Which database the query should run against.' },
    confirm_readonly: { type: 'boolean', description: 'The statement is a SELECT and takes no locks.' },
    api_key: { type: 'string', description: 'Needed to authenticate the connection.' },
  },
}

const MERGE_ORDERS = [
  { value: 'connection', label: 'Connection order' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'pinned', label: 'Pinned server first' },
]

const ORDER: Record<string, string[]> = {
  connection: ['fs', 'pg', 'sentry', 'linear'],
  alphabetical: ['fs', 'linear', 'pg', 'sentry'],
}

function McpConsole() {
  const [section, setSection] = useState('servers')
  const [active, setActive] = useState('fs')
  const [statuses, setStatuses] = useState<Record<string, McpStatus>>(() =>
    Object.fromEntries(SERVERS.map((server) => [server.id, server.status])) as Record<string, McpStatus>,
  )
  const [mergeOrder, setMergeOrder] = useState('connection')
  const [attached, setAttached] = useState<string[]>(['file:///Users/ada/work/astralyx/README.md'])
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null)
  const [roots, setRoots] = useState<McpRoot[]>(INITIAL_ROOTS)
  const [installing, setInstalling] = useState<CatalogueServer | null>(null)
  const [configDirty, setConfigDirty] = useState(false)
  const [selectedTool, setSelectedTool] = useState('fs:read_file')
  const [calls, setCalls] = useState<Record<string, 'idle' | 'pending' | 'denied' | 'done'>>({})
  const [standing, setStanding] = useState<string[]>([])
  const [sampling, setSampling] = useState<'pending' | 'approved' | 'denied'>('pending')
  const [elicited, setElicited] = useState<Record<string, unknown> | null>(null)
  const [declined, setDeclined] = useState(false)

  const server = SERVERS.find((item) => item.id === active) ?? SERVERS[0]
  const serverTools = TOOLS.filter((tool) => tool.server === active)
  const tool = TOOLS.find((item) => item.key === selectedTool) ?? serverTools[0] ?? TOOLS[0]
  const callState = calls[tool.key] ?? 'idle'
  const connected = SERVERS.filter((item) => statuses[item.id] === 'connected')
  const failing = SERVERS.filter((item) => statuses[item.id] === 'error').length
  const openRequests = (sampling === 'pending' ? 1 : 0) + (elicited || declined ? 0 : 1)

  /**
   * Which provider wins a name collision. "Pinned" is what makes the picker in
   * the sidebar mean something: choosing a server moves it to the front of the
   * merge order and the shadowed rows flip.
   */
  function resolve(row: CapabilityRow) {
    if (mergeOrder === 'pinned') {
      return row.providers.includes(active) ? active : row.providers[0]
    }
    const order = ORDER[mergeOrder]
    return order.find((id) => row.providers.includes(id)) ?? row.providers[0]
  }

  function pick(id: string) {
    setActive(id)
    const first = TOOLS.find((item) => item.server === id)
    if (first) setSelectedTool(first.key)
  }

  function run() {
    // A standing grant skips the prompt — that is the whole point of "always",
    // and a UI that asks again anyway is quietly ignoring the answer.
    setCalls((current) => ({ ...current, [tool.key]: standing.includes(tool.key) ? 'done' : 'pending' }))
  }

  const nav: NavItem[] = [
    { id: 'servers', label: 'Servers', icon: <Server />, count: connected.length },
    { id: 'capabilities', label: 'Capabilities', icon: <Grid3x3 /> },
    { id: 'tools', label: 'Tools', icon: <Wrench />, count: serverTools.length },
    { id: 'requests', label: 'Requests', icon: <Inbox />, count: openRequests || undefined },
    { id: 'config', label: 'Config & roots', icon: <FileJson /> },
  ]

  return (
    <AppFrame
      inset
      product="MCP Console"
      nav={nav}
      active={section}
      onNavigate={setSection}
      title={nav.find((item) => item.id === section)?.label}
      user={{ name: 'Ada Lovelace', plan: 'Local workspace' }}
      actions={
        <div className="flex items-center gap-2">
          {failing > 0 && (
            <Badge size="sm" color="destructive">
              {failing} server{failing === 1 ? '' : 's'} down
            </Badge>
          )}
          <Button size="sm" variant="secondary" onClick={() => setSection('config')}>
            <FileJson /> mcp.json
          </Button>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <Card size="sm">
            <CardHeader size="sm">
              <CardTitle as="h2">Connected</CardTitle>
              <CardDescription>The picked server wins name collisions.</CardDescription>
            </CardHeader>
            <CardBody size="sm" className="space-y-1">
              {SERVERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item.id)}
                  aria-pressed={item.id === active}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-2.5 py-1.5 text-sm',
                    radius.control,
                    focusRing,
                    item.id === active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      statuses[item.id] === 'connected'
                        ? 'bg-[var(--green)]'
                        : statuses[item.id] === 'error'
                          ? 'bg-[var(--destructive)]'
                          : 'bg-[var(--amber)]',
                    )}
                  />
                  <span className="flex-1 truncate text-start font-mono text-xs">{item.name}</span>
                  <span className="text-muted-foreground text-[11px] tabular-nums">
                    {item.capabilities?.tools ?? 0}
                  </span>
                </button>
              ))}
            </CardBody>
          </Card>

          <Card size="sm">
            <CardHeader size="sm">
              <CardTitle as="h2">Roots</CardTitle>
              <CardDescription>The only permission boundary MCP has.</CardDescription>
            </CardHeader>
            <CardBody size="sm">
              <McpRoots
                roots={roots}
                onAdd={() =>
                  setRoots((current) => {
                    const next = GRANTABLE.find((root) => !current.some((held) => held.uri === root.uri))
                    return next ? [...current, next] : current
                  })
                }
                onRemove={(uri) => setRoots((current) => current.filter((root) => root.uri !== uri))}
              />
            </CardBody>
          </Card>
        </div>
      }
    >
      {section === 'servers' && (
        <div className="space-y-6 p-4 sm:p-6">
          {installing && (
            <Alert color="blue" icon={<Plug />} title={`Add ${installing.name} to mcp.json`}>
              <p className="mb-2">
                Nothing was installed. Installing a server is running someone else&rsquo;s code with
                your credentials, so the console hands you the line to paste instead.
              </p>
              <code className="font-mono text-xs break-all">{installing.target}</code>
            </Alert>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {SERVERS.map((item) => (
              <McpServerCard
                key={item.id}
                name={item.name}
                target={item.target}
                transport={item.transport}
                version={item.version}
                protocolVersion={item.protocolVersion}
                status={statuses[item.id]}
                capabilities={statuses[item.id] === 'error' ? undefined : item.capabilities}
                error={statuses[item.id] === 'error' ? item.error : undefined}
                selected={item.id === active}
                onSelect={() => pick(item.id)}
                onReconnect={() =>
                  setStatuses((current) => ({ ...current, [item.id]: 'connected' }))
                }
                actions={
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => { pick(item.id); setSection('tools') }}
                  >
                    <Wrench /> Tools
                  </Button>
                }
              />
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold">Add a server</h2>
              <p className="text-muted-foreground text-xs">
                Publisher and verification sit above the blurb — the blurb is written by the
                party asking to be trusted.
              </p>
            </div>
            <McpServerPicker servers={CATALOGUE} onInstall={setInstalling} />
          </div>
        </div>
      )}

      {section === 'capabilities' && (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Merged capabilities</h2>
              <p className="text-muted-foreground text-xs">
                Pinned to <code className="font-mono">{server.name}</code>. Change the order and
                watch which provider gets shadowed.
              </p>
            </div>
            <Select
              size="sm"
              variant="secondary"
              className="w-52"
              triggerLabel="Collision merge order"
              value={mergeOrder}
              options={MERGE_ORDERS}
              onValueChange={setMergeOrder}
            />
          </div>

          <McpCapabilityMatrix
            servers={SERVERS.map((item) => ({ id: item.id, name: item.name }))}
            capabilities={CAPABILITIES}
            resolve={resolve}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Resources on {server.name}</h3>
              <McpResourceList
                resources={RESOURCES.filter((resource) => resource.server === active)}
                value={attached}
                onValueChange={setAttached}
                showServer={false}
                emptyLabel="This server exposes no resources"
                emptyHint="Nothing here is addressable by URI."
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Prompts on {server.name}</h3>
              <McpPromptList
                prompts={PROMPTS.filter((prompt) => prompt.server === active)}
                showServer={false}
                onSelect={(prompt) => setUsedPrompt(prompt.name)}
              />
              {usedPrompt && (
                <p className="text-muted-foreground text-xs">
                  <code className="font-mono">{usedPrompt}</code> inserted into the composer.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {section === 'tools' && (
        <div className="flex h-full min-h-0">
          <div className="border-border hidden w-64 shrink-0 flex-col gap-1 overflow-y-auto border-e p-3 lg:flex">
            <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
              {server.name} · {serverTools.length} tools
            </p>
            {serverTools.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedTool(item.key)}
                aria-pressed={item.key === selectedTool}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 text-start text-sm',
                  radius.control,
                  focusRing,
                  item.key === selectedTool
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <span className="flex-1 truncate font-mono text-xs">{item.name}</span>
                {item.destructive && <Badge size="sm" color="destructive">rw</Badge>}
                {standing.includes(item.key) && <Badge size="sm" color="green">auto</Badge>}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {serverTools.length === 0 ? (
              <Empty
                icon={<Wrench />}
                title={`${server.name} exposes no tools`}
                description="The handshake failed, so the tool list was never fetched."
                action={
                  <Button size="sm" variant="secondary" onClick={() => setStatuses((c) => ({ ...c, [active]: 'connected' }))}>
                    <RotateCcw /> Reconnect
                  </Button>
                }
              />
            ) : (
              <Tabs defaultValue="call" className="max-w-3xl">
                <TabsList variant="underline">
                  <TabsTrigger value="call" variant="underline">Call</TabsTrigger>
                  <TabsTrigger value="schema" variant="underline">Schema</TabsTrigger>
                  <TabsTrigger value="contract" variant="underline">Contract</TabsTrigger>
                </TabsList>

                <TabsContent value="call" className="space-y-4 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-sm font-medium">{tool.name}</code>
                    <Badge size="sm">{server.name}</Badge>
                    {tool.destructive && <Badge size="sm" color="destructive">destructive</Badge>}
                    <Button
                      size="sm"
                      className="ms-auto"
                      disabled={callState === 'pending'}
                      onClick={run}
                    >
                      <Play /> {callState === 'idle' ? 'Call tool' : 'Call again'}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm">{tool.description}</p>

                  {callState === 'pending' && (
                    <ToolApproval
                      tool={tool.name}
                      origin={server.name}
                      description={tool.description}
                      destructive={tool.destructive}
                      args={tool.args}
                      onDecide={(decision) => {
                        if (decision === 'always') setStanding((current) => [...current, tool.key])
                        setCalls((current) => ({
                          ...current,
                          [tool.key]: decision === 'deny' ? 'denied' : 'done',
                        }))
                      }}
                    />
                  )}

                  {callState === 'denied' && (
                    <Alert color="neutral" icon={<ShieldQuestion />} title="Call denied">
                      Nothing was sent to <code className="font-mono">{server.name}</code>.
                      Declining a tool call is always safe; running one may not be.
                    </Alert>
                  )}

                  {callState === 'done' && (
                    <ToolResult
                      tool={tool.name}
                      durationMs={tool.durationMs}
                      isError={tool.resultError}
                      content={tool.result}
                    />
                  )}

                  {callState === 'idle' && (
                    <div className={cn('border-border border border-dashed p-6 text-center', radius.surface)}>
                      <p className="text-muted-foreground text-sm">
                        {standing.includes(tool.key)
                          ? 'A standing grant is in place — this one runs without asking.'
                          : 'Calling asks for consent first, with the arguments in full.'}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="schema" className="pt-4">
                  <ToolSchema
                    name={tool.name}
                    description={tool.description}
                    schema={tool.schema}
                    defaultDepth={2}
                  />
                </TabsContent>

                <TabsContent value="contract" className="pt-4">
                  {tool.previous ? (
                    <ToolDiff
                      tool={tool.name}
                      before={tool.previous}
                      after={tool.schema}
                      beforeLabel={tool.previousLabel}
                      afterLabel={tool.nextLabel}
                    />
                  ) : (
                    <Empty
                      icon={<Blocks />}
                      title="No pending upgrade"
                      description="This tool's schema has not changed since it was first seen."
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}

      {section === 'requests' && (
        <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Sampling</h2>
            <p className="text-muted-foreground text-xs">
              A server asking to spend your model budget on its own initiative. The messages are
              shown verbatim before the buttons.
            </p>
            {sampling === 'pending' ? (
              <McpSampling
                server="sentry"
                messages={SAMPLING_REQUEST}
                intent="Drafting a changelog line for the commit it just read."
                maxTokens={512}
                modelHint="haiku"
                onApprove={() => setSampling('approved')}
                onDeny={() => setSampling('denied')}
              />
            ) : (
              <Alert
                color={sampling === 'approved' ? 'green' : 'neutral'}
                title={sampling === 'approved' ? 'Completion returned' : 'Request denied'}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {sampling === 'approved'
                      ? '“Pinned the example clock to a fixed constant so prerendered pages hydrate”'
                      : 'sentry was told no. It may ask again on the next tool call.'}
                  </span>
                  <Button size="xs" variant="secondary" onClick={() => setSampling('pending')}>
                    <RotateCcw /> Replay
                  </Button>
                </div>
              </Alert>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Elicitation</h2>
            <p className="text-muted-foreground text-xs">
              A server asking you for structured input mid-run. The requesting server is named
              outside its own copy, and the field asking for an API key is refused outright.
            </p>
            {elicited || declined ? (
              <Alert color={elicited ? 'green' : 'neutral'} title={elicited ? 'Answer sent to postgres' : 'Request declined'}>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="font-mono text-xs">
                    {elicited ? JSON.stringify(elicited) : 'no response returned'}
                  </code>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => { setElicited(null); setDeclined(false) }}
                  >
                    <RotateCcw /> Ask again
                  </Button>
                </div>
              </Alert>
            ) : (
              <McpElicitation
                server="postgres"
                message="Before I run this SELECT I need to know which environment to target."
                schema={ELICIT_SCHEMA}
                onSubmit={setElicited}
                onDecline={() => setDeclined(true)}
              />
            )}
          </div>
        </div>
      )}

      {section === 'config' && (
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">~/.config/mcp/mcp.json</h2>
              <p className="text-muted-foreground text-xs">
                The failures people actually hit parse cleanly and then the server never
                appears — the mistake is in the shape, not the syntax.
              </p>
            </div>
            <Button size="sm" disabled={!configDirty} onClick={() => setConfigDirty(false)}>
              {configDirty ? 'Save and reload servers' : 'Saved'}
            </Button>
          </div>

          <McpConfigEditor
            servers={CONFIG}
            filePath="mcp.json"
            onChange={() => setConfigDirty(true)}
          />

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Granted roots</h2>
            <p className="text-muted-foreground text-xs">
              A root over your whole home directory is drawn as a warning, not as another grey
              row — <code className="font-mono">file:///Users/ada</code> covers the SSH keys too.
            </p>
            <McpRoots
              roots={roots}
              onAdd={() =>
                setRoots((current) => {
                  const next = GRANTABLE.find((root) => !current.some((held) => held.uri === root.uri))
                  return next ? [...current, next] : current
                })
              }
              onRemove={(uri) => setRoots((current) => current.filter((root) => root.uri !== uri))}
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">
              <FolderTree className="me-1.5 inline size-3.5" aria-hidden="true" />
              Attached resources
            </h2>
            <McpResourceList resources={RESOURCES} value={attached} onValueChange={setAttached} />
          </div>
        </div>
      )}
    </AppFrame>
  )
}

export const mcpConsoleExample: ExampleEntry = {
  id: 'mcp-console',
  label: 'MCP Console',
  description:
    'Managing Model Context Protocol servers: a fleet with one broken handshake, the merged capability matrix where two servers collide on a name, tool calls that ask for consent before they run, and the config and roots behind it all.',
  uses: [
    'MCP Server Card', 'MCP Server Picker', 'MCP Config Editor', 'MCP Roots',
    'MCP Capability Matrix', 'MCP Resource List', 'MCP Prompt List', 'MCP Sampling',
    'MCP Elicitation', 'Tool Schema', 'Tool Approval', 'Tool Result', 'Tool Diff',
  ],
  render: () => <McpConsole />,
}
