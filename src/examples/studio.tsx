import { useMemo, useState } from 'react'
import {
  ArrowLeft, Bot, FlaskConical, GitCompare, MessagesSquare, Play, ShieldCheck, Sparkles, 
  Star, Wrench
} from 'lucide-react'
import { AgentSteps } from '@/components/ui/agent-steps'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { BudgetGuard } from '@/components/ui/budget-guard'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Citations } from '@/components/ui/citations'
import { CopyButton } from '@/components/ui/copy-button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import {
  Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DiffView, parseUnifiedDiff } from '@/components/ui/diff-view'
import { Empty } from '@/components/ui/empty'
import { EvalBoard } from '@/components/ui/eval-board'
import { Fmt } from '@/components/ui/fmt'
import { GuardrailList } from '@/components/ui/guardrail-list'
import { Message } from '@/components/ui/message'
import { ModelComparison } from '@/components/ui/model-comparison'
import { PromptInput } from '@/components/ui/prompt-input'
import { PromptVersions } from '@/components/ui/prompt-versions'
import { ReasoningBlock } from '@/components/ui/reasoning-block'
import { SandboxPolicy } from '@/components/ui/sandbox-policy'
import { Select } from '@/components/ui/select'
import {
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Stat } from '@/components/ui/stat'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenUsage } from '@/components/ui/token-usage'
import { ToolApproval } from '@/components/ui/tool-approval'
import { ToolCall } from '@/components/ui/tool-call'
import { ToolSchema } from '@/components/ui/tool-schema'
import { TraceWaterfall } from '@/components/ui/trace-waterfall'
import {
  Page, PageHead, Section, SelectField, Shell, TextField, useNotify, useRoute, type Crumb, type Nav,
} from './shell'
import {
  BUDGETS, CITATIONS, EVAL_CASES, EVAL_MODELS, GUARDRAILS, MODEL_OUTPUTS, PROMPTS, PROMPT_PATCH, RUNS, RUN_STEPS, RUN_TRACE, SANDBOX, THREADS, TOOLS, type Run, type Tool,
} from './studio-data'
import { type ExampleEntry } from './types'

/**
 * Agent Studio — where an agent is written, run, watched and argued with.
 *
 * The four sections are the four things you actually do with one: talk to it,
 * read what it did, change the prompt, and decide what it is allowed to touch.
 * Each is a real surface rather than a card — a run opens into its own trace, a
 * prompt opens into its versions and a diff, a tool opens into its schema and
 * the policy that gates it.
 */

const RUN_TONE = {
  succeeded: 'green',
  failed: 'destructive',
  running: 'blue',
  blocked: 'amber',
} as const

/* ------------------------------------------------------------------ threads */

const ANSWER = `PR #4182 batched the address lookup, and the address service started shedding
load: its 429 rate went from 0.4% to 11.2% at 02:00 UTC — the same twenty
minutes checkout p95 moved from 210ms to 480ms.

The batch size in the diff is 200. The address service documents a limit of 50
per request and returns 429 above it without a Retry-After, so the client's
backoff never engages and every batch costs a full timeout.`

function Threads() {
  const notify = useNotify()
  const { open } = useRoute()
  const [draft, setDraft] = useState('')
  const [active, setActive] = useState(THREADS[0].id)
  const thread = THREADS.find((item) => item.id === active) ?? THREADS[0]

  return (
    <div className="flex h-full min-h-0">
      <div className="border-border hidden w-64 shrink-0 flex-col overflow-y-auto border-e lg:flex">
        <div className="border-border flex items-center justify-between gap-2 border-b p-3">
          <span className="text-sm font-medium">Threads</span>
          <Badge size="sm">{THREADS.length}</Badge>
        </div>
        <ul className="flex list-none flex-col p-2">
          {THREADS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(item.id)}
                aria-current={item.id === active ? 'true' : undefined}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-start transition-colors duration-150 ease-out motion-reduce:transition-none ${
                  item.id === active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {item.starred && <Star className="size-3 shrink-0 fill-current" />}
                  <span className="truncate text-xs font-medium">{item.title}</span>
                </span>
                <span className="text-muted-foreground/70 truncate text-[11px]">
                  {item.model} · {item.updated}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-border flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{thread.title}</h2>
            <p className="text-muted-foreground truncate text-xs">
              {thread.model} · {thread.messages} messages
            </p>
          </div>
          <TokenUsage used={thread.tokens} limit={200_000} className="w-40" />
          <Button size="xs" variant="secondary" onClick={() => open('runs', 'r-8841')}>
            Open run
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <Message role="user" name="Ada Lovelace">
            Checkout p95 doubled overnight. What happened?
          </Message>

          <Message
            role="assistant"
            name="Investigator"
            copyText={ANSWER}
            onCopy={() => notify('Copied', 'The answer is on your clipboard.')}
            onRetry={() => notify('Retrying', 'Same prompt, same tools, new sample.')}
            onVote={(vote) =>
              notify(
                vote === 'up' ? 'Marked good' : 'Marked bad',
                'The rating goes to the eval set for this prompt.',
                vote === 'up' ? 'green' : 'neutral',
              )
            }
          >
            <div className="flex flex-col gap-3">
              <ReasoningBlock duration={4}>
                The window is twenty minutes wide and one deploy lands inside it, so that deploy is
                a candidate rather than a cause. Before concluding I need a mechanism: something in
                the diff has to explain the latency. The diff batches a lookup, so the question is
                whether the downstream service can take the batch size — check its error rate over
                the same window before saying anything.
              </ReasoningBlock>

              <ToolCall
                name="grafana.query"
                status="done"
                summary="p95, checkout-service, 7 days"
                input={'{\n  "query": "histogram_quantile(0.95, checkout_request_seconds)",\n  "window": "7d",\n  "step": "5m"\n}'}
                output={'{\n  "before": 0.21,\n  "after": 0.48,\n  "changedAt": "2026-09-02T02:00:00Z"\n}'}
              />

              <ToolCall
                name="github.diff"
                status="done"
                summary="PR #4182 — 1 file, +38 −12"
                input={'{ "repo": "astralyxdev/checkout", "number": 4182 }'}
                output="- const address = await lookup(line)\n+ const addresses = await lookupBatch(lines, { size: 200 })"
                language="tsx"
              />

              <p className="text-sm leading-relaxed whitespace-pre-line">{ANSWER}</p>

              <Citations citations={CITATIONS} />
            </div>
          </Message>
        </div>

        <div className="border-border shrink-0 border-t p-3">
          <PromptInput
            value={draft}
            onValueChange={setDraft}
            placeholder="Ask a follow-up…"
            context={[
              { id: 'ctx1', label: 'checkout-service', detail: 'metrics' },
              { id: 'ctx2', label: 'PR #4182', detail: 'diff' },
            ]}
            onRemoveContext={() => notify('Context removed', 'It will not be sent with the next turn.')}
            onSubmit={(value) => {
              setDraft('')
              notify('Sent', value.slice(0, 60))
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- runs */

function Runs() {
  const { open } = useRoute()
  const [status, setStatus] = useState('all')

  const rows = useMemo(
    () => RUNS.filter((run) => status === 'all' || run.status === status),
    [status],
  )

  const columns: Column<Run>[] = [
    {
      key: 'id',
      header: 'Run',
      width: '30%',
      render: (run) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{run.thread}</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            {run.id} · {run.agent}
          </span>
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
    { key: 'model', header: 'Model', hideOnMobile: true, render: (run) => <span className="text-muted-foreground text-xs">{run.model}</span> },
    { key: 'steps', header: 'Steps', align: 'end', hideOnMobile: true, render: (run) => <span className="tabular-nums">{run.steps}</span> },
    {
      key: 'tokens',
      header: 'Tokens',
      align: 'end',
      hideOnMobile: true,
      sortValue: (run) => run.tokensIn + run.tokensOut,
      render: (run) => (
        <span className="tabular-nums">
          <Fmt type="number" value={run.tokensIn + run.tokensOut} />
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'end',
      sortValue: (run) => run.cost,
      render: (run) => <span className="tabular-nums">${run.cost.toFixed(2)}</span>,
    },
    { key: 'started', header: 'Started', align: 'end', render: (run) => <span className="text-muted-foreground text-xs">{run.started}</span> },
  ]

  const spend = RUNS.reduce((total, run) => total + run.cost, 0)
  // Median, not mean: one nine-step investigation drags an average somewhere no
  // individual run has ever been.
  const median = (() => {
    const sorted = RUNS.map((run) => run.duration / 1000).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    return Number(value.toFixed(1))
  })()

  return (
    <Page>
      <PageHead
        title="Runs"
        description="Every agent execution, with what it cost and what it was stopped from doing."
      >
        <Select
          size="sm"
          triggerLabel="Status"
          value={status}
          onValueChange={setStatus}
          className="w-auto"
          triggerClassName="w-44"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'succeeded', label: 'Succeeded' },
            { value: 'failed', label: 'Failed' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'running', label: 'Running' },
          ]}
        />
      </PageHead>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Runs today" value={RUNS.length} />
        <Stat
          label="Spend today"
          value={<Fmt type="currency" currency="USD" locale="en-US" value={spend} decimals={2} animate />}
          hint="Across every agent"
        />
        <Stat
          label="Blocked by policy"
          value={RUNS.filter((run) => run.status === 'blocked').length}
          goodDirection="down"
        />
        <Stat label="Median duration" value={median} hint="Seconds" />
      </div>

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
  const { back } = useRoute()
  const notify = useNotify()
  const [approval, setApproval] = useState(run.status === 'blocked')

  return (
    <Page>
      <PageHead
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to runs" onClick={back}>
              <ArrowLeft />
            </Button>
            <span className="truncate">{run.thread}</span>
            <Badge size="sm" color={RUN_TONE[run.status]}>
              {run.status}
            </Badge>
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {run.id} · {run.agent} · {run.model}
          </span>
        }
        actions={
          <>
            {run.status === 'blocked' && (
              <Button size="sm" onClick={() => setApproval(true)}>
                Review approval
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => notify('Replaying', `${run.id} is running again with the same inputs.`)}>
              <Play /> Replay
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Duration" value={Number((run.duration / 1000).toFixed(1))} hint="Seconds" />
        <Stat label="Tokens in" value={run.tokensIn} />
        <Stat label="Tokens out" value={run.tokensOut} />
        <Stat
          label="Cost"
          value={<Fmt type="currency" currency="USD" locale="en-US" value={run.cost} decimals={2} animate />}
          hint={`${run.tools} tool calls`}
        />
      </div>

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="pt-4">
          <Section>
            <AgentSteps steps={RUN_STEPS} defaultExpanded={['s5']} />
          </Section>
        </TabsContent>

        <TabsContent value="trace" className="pt-4">
          <Section title="Where the 18.4 seconds went">
            <TraceWaterfall spans={RUN_TRACE} defaultDepth={3} />
          </Section>
        </TabsContent>

        <TabsContent value="guardrails" className="pt-4">
          <Section>
            <GuardrailList guardrails={GUARDRAILS} />
          </Section>
        </TabsContent>

        <TabsContent value="budgets" className="pt-4">
          <Section>
            <BudgetGuard budgets={BUDGETS} />
          </Section>
        </TabsContent>
      </Tabs>

      <Dialog open={approval} onOpenChange={setApproval}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>The run is waiting on you</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ToolApproval
              tool="issues.create"
              origin="github-mcp"
              destructive
              description="Opens an issue on astralyxdev/checkout with the finding attached."
              args={{
                repo: 'astralyxdev/checkout',
                title: 'Address lookup batch size exceeds the documented limit',
                labels: ['bug', 'latency'],
              }}
              onDecide={(decision) => {
                setApproval(false)
                notify(
                  decision === 'deny' ? 'Denied' : 'Allowed',
                  decision === 'always'
                    ? 'issues.create will not ask again in this project.'
                    : decision === 'once'
                      ? 'The run continued and opened the issue.'
                      : 'The run finished without opening an issue.',
                  decision === 'deny' ? 'destructive' : 'green',
                )
              }}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

/* ------------------------------------------------------------------ prompts */

function Prompts() {
  const { open } = useRoute()

  return (
    <Page>
      <PageHead
        title="Prompts"
        description="Two prompts, versioned. The live one is whatever the agents are running right now."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {PROMPTS.map((prompt) => (
          <Card key={prompt.id}>
            <CardHeader
              action={
                <Badge size="sm" color="green">
                  {prompt.live} live
                </Badge>
              }
            >
              <CardTitle>{prompt.name}</CardTitle>
              <span className="text-muted-foreground text-xs">{prompt.purpose}</span>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {prompt.variables.map((variable) => (
                  <Badge key={variable.name} size="sm" variant="outline">
                    {`{{${variable.name}}}`}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {prompt.versions.length} versions
                </span>
                <Button size="xs" variant="secondary" onClick={() => open('prompts', prompt.id)}>
                  Open
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function PromptDetail({ prompt }: { prompt: (typeof PROMPTS)[number] }) {
  const { back } = useRoute()
  const notify = useNotify()
  const [version, setVersion] = useState(prompt.live)
  const [diff, setDiff] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(prompt.variables.map((variable) => [variable.name, variable.example])),
  )

  const rendered = prompt.variables.reduce(
    (body, variable) => body.replaceAll(`{{${variable.name}}}`, values[variable.name] || `{{${variable.name}}}`),
    prompt.body,
  )

  return (
    <Page>
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to prompts" onClick={back}>
              <ArrowLeft />
            </Button>
            {prompt.name}
            <Badge size="sm" color="green">
              {prompt.live} live
            </Badge>
          </span>
        }
        description={prompt.purpose}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setDiff(true)}>
              <GitCompare /> Compare
            </Button>
            <Button size="sm" onClick={() => notify('Published', `${version} is now serving every agent.`, 'green')}>
              Publish {version}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="flex flex-col gap-3 xl:col-span-2">
          <Section title="Body">
            {/* A `<pre>`, not a CodeBlock: a prompt is prose with holes in
                it, and a TypeScript highlighter colours "Rules:" and "with"
                as though they meant something. */}
            <CopyButton
              value={prompt.body}
              label="Copy prompt"
              className="absolute end-2 top-2 z-10"
            />
            <pre className="text-muted-foreground overflow-x-auto p-4 font-mono text-xs leading-relaxed">
              {prompt.body}
            </pre>
          </Section>

          <Card>
            <CardHeader>
              <CardTitle>Rendered with these variables</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {prompt.variables.map((variable) => (
                  <TextField
                    key={variable.name}
                    size="sm"
                    label={variable.name}
                    description={variable.description}
                    value={values[variable.name]}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [variable.name]: event.target.value }))
                    }
                  />
                ))}
              </div>
              <pre className="border-border bg-muted/40 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
                {rendered}
              </pre>
            </CardBody>
          </Card>
        </div>

        <Section>
          <PromptVersions
            versions={prompt.versions}
            selectedId={version}
            onSelect={(next) => {
              setVersion(next.id)
              notify('Loaded', `${next.label} — ${next.note ?? 'no note'}`)
            }}
            onCompare={() => setDiff(true)}
          />
        </Section>
      </div>

      <Sheet open={diff} onOpenChange={setDiff}>
        <SheetContent width="46rem">
          <SheetHeader>
            <SheetTitle>v6 → v7</SheetTitle>
            <SheetDescription>
              The change that moved this prompt from 86% to 91% on the eval set.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <DiffView
              view="unified"
              file={{
                path: 'prompts/investigator.md',
                status: 'modified',
                hunks: parseUnifiedDiff(PROMPT_PATCH),
              }}
            />
          </SheetBody>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setDiff(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDiff(false)
                notify('Rolled back', 'v6 is live again.', 'destructive')
              }}
            >
              Revert to v6
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Page>
  )
}

/* -------------------------------------------------------------------- tools */

const APPROVAL_LABEL = {
  always: 'Always allow',
  once: 'Ask each time',
  never: 'Never allow',
} as const

function Tools() {
  const { open } = useRoute()

  return (
    <Page>
      <PageHead
        title="Tools"
        description="What the agents can reach, how often they reach for it, and how often it breaks."
      />

      <Section>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead className="hidden sm:table-cell">Origin</TableHead>
              <TableHead className="text-end">Calls (7d)</TableHead>
              <TableHead className="hidden text-end md:table-cell">p95</TableHead>
              <TableHead className="hidden text-end md:table-cell">Errors</TableHead>
              <TableHead>Approval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TOOLS.map((tool) => (
              <TableRow
                key={tool.id}
                className="cursor-pointer"
                onClick={() => open('tools', tool.id)}
              >
                <TableCell>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2 font-mono font-medium">
                      {tool.name}
                      {tool.destructive && (
                        <Badge size="sm" color="destructive">
                          destructive
                        </Badge>
                      )}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {tool.description}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground hidden font-mono text-xs sm:table-cell">
                  {tool.origin}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  <Fmt type="number" value={tool.calls7d} />
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-end tabular-nums md:table-cell">
                  <Fmt type="number" value={tool.p95} />ms
                </TableCell>
                <TableCell
                  className={`hidden text-end tabular-nums md:table-cell ${
                    tool.errorRate > 5 ? 'text-[var(--destructive-soft-foreground)]' : 'text-muted-foreground'
                  }`}
                >
                  {tool.errorRate}%
                </TableCell>
                <TableCell>
                  <Badge
                    size="sm"
                    color={tool.approval === 'never' ? 'destructive' : tool.approval === 'once' ? 'amber' : 'green'}
                  >
                    {APPROVAL_LABEL[tool.approval]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </Page>
  )
}

function ToolDetail({ tool }: { tool: Tool }) {
  const { back } = useRoute()
  const notify = useNotify()
  const [approval, setApproval] = useState(tool.approval)

  return (
    <Page>
      <PageHead
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-sm" variant="ghost" aria-label="Back to tools" onClick={back}>
              <ArrowLeft />
            </Button>
            <span className="font-mono">{tool.name}</span>
            {tool.destructive && (
              <Badge size="sm" color="destructive">
                destructive
              </Badge>
            )}
          </span>
        }
        description={tool.description}
        actions={
          <SelectField
            label=""
            className="w-auto"
            triggerClassName="w-44"
            value={approval}
            onValueChange={(next) => {
              setApproval(next as Tool['approval'])
              notify('Policy updated', `${tool.name} — ${APPROVAL_LABEL[next as Tool['approval']].toLowerCase()}.`)
            }}
            options={Object.entries(APPROVAL_LABEL).map(([value, label]) => ({ value, label }))}
          />
        }
      />

      {tool.destructive && approval === 'always' && (
        <Alert color="destructive" icon={<ShieldCheck />} title="This tool changes things">
          Allowing it without asking means an agent can run it in a loop. There is no undo on the
          other side of this switch.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Calls (7 days)" value={tool.calls7d} />
        <Stat label="p95 latency" value={tool.p95} hint="Milliseconds" />
        <Stat
          label="Error rate"
          value={<Fmt type="percent" value={tool.errorRate / 100} decimals={1} animate />}
          goodDirection="down"
          hint="Last 7 days"
        />
      </div>

      <Section title="Arguments">
        <ToolSchema schema={tool.schema} name={tool.name} defaultDepth={2} />
      </Section>
    </Page>
  )
}

/* -------------------------------------------------------------------- evals */

function Evals() {
  const notify = useNotify()
  const [picked, setPicked] = useState('large')

  return (
    <Page>
      <PageHead
        title="Evals"
        description="Six cases, three models. One case no model passes, which is the only interesting row."
        actions={
          <Button size="sm" onClick={() => notify('Running', 'Six cases against three models — about ninety seconds.')}>
            <Play /> Run suite
          </Button>
        }
      />

      <Section>
        <EvalBoard
          models={EVAL_MODELS}
          cases={EVAL_CASES}
          onSelectCase={(evalCase) => notify(evalCase.name, 'Opening the transcript for this case.')}
        />
      </Section>

      <Card>
        <CardHeader>
          <CardTitle>The same question, three models</CardTitle>
        </CardHeader>
        <CardBody>
          <ModelComparison
            outputs={MODEL_OUTPUTS}
            selected={picked}
            onSelect={(id) => {
              setPicked(id)
              notify('Picked', `${MODEL_OUTPUTS.find((output) => output.id === id)?.model} is the answer of record.`, 'green')
            }}
          />
        </CardBody>
      </Card>
    </Page>
  )
}

/* ------------------------------------------------------------------- policy */

function Policy() {
  const notify = useNotify()
  const [scopes, setScopes] = useState(SANDBOX)

  return (
    <Page>
      <PageHead
        title="Policy"
        description="What an agent may touch, and what it may spend before it is stopped."
      />

      {/* Two columns because the sandbox is a long list and the budgets are a
          short one; stacked, the page is mostly the scroll between them.
          SandboxPolicy and BudgetGuard both draw their own heading, so neither
          gets a Section wrapper on top of it. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SandboxPolicy
          scopes={scopes}
          onToggle={(id, enabled) => {
            setScopes((current) =>
              current.map((scope) => (scope.id === id ? { ...scope, enabled } : scope)),
            )
            notify(enabled ? 'Scope enabled' : 'Scope disabled', `${id} — applies to the next run.`)
          }}
        />

        <div className="flex flex-col gap-5">
          <BudgetGuard budgets={BUDGETS} />

          <Card>
            <CardHeader>
              <CardTitle>Defaults</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Model"
                description="Agents may override this per run."
                defaultValue="large"
                options={[
                  { value: 'large', label: 'astralyx-large' },
                  { value: 'small', label: 'astralyx-small' },
                ]}
              />
              <SelectField
                label="On a blocked tool"
                description="What happens when policy stops a call."
                defaultValue="ask"
                options={[
                  { value: 'ask', label: 'Ask a human' },
                  { value: 'skip', label: 'Skip and continue' },
                  { value: 'stop', label: 'Stop the run' },
                ]}
              />
              <TextField
                label="Max steps"
                type="number"
                defaultValue={12}
                description="A run that needs more is a run that is lost."
              />
              <TextField
                label="Timeout"
                defaultValue="120s"
                description="Wall clock, including tool calls."
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}

/* --------------------------------------------------------------------- root */

const NAV_GROUPS = [
  {
    items: [
      { id: 'threads', label: 'Threads', icon: <MessagesSquare />, count: THREADS.length },
      { id: 'runs', label: 'Runs', icon: <Play />, count: RUNS.length },
    ],
  },
  {
    label: 'Build',
    items: [
      { id: 'prompts', label: 'Prompts', icon: <Sparkles />, count: PROMPTS.length },
      { id: 'tools', label: 'Tools', icon: <Wrench />, count: TOOLS.length },
      { id: 'evals', label: 'Evals', icon: <FlaskConical /> },
      { id: 'policy', label: 'Policy', icon: <ShieldCheck /> },
    ],
  },
]

const NOTIFICATIONS = [
  { id: 'n1', title: 'A run is waiting on you', body: 'r-8839 asked to run issues.create', at: '1h', unread: true },
  { id: 'n2', title: 'Eval regression', body: 'Injected-instruction case now fails on every model', at: '4h', unread: true },
  { id: 'n3', title: 'v7 published', body: 'Investigator prompt, 91% on the suite', at: '2d' },
]

const SECTION_LABEL: Record<string, string> = {
  threads: 'Threads',
  runs: 'Runs',
  prompts: 'Prompts',
  tools: 'Tools',
  evals: 'Evals',
  policy: 'Policy',
}

function commandsFor({ go, open }: Nav) {
  return [
    { id: 'go-threads', label: 'Go to Threads', group: 'Navigate', icon: <MessagesSquare />, onSelect: () => go({ section: 'threads' }) },
    { id: 'go-runs', label: 'Go to Runs', group: 'Navigate', icon: <Play />, onSelect: () => go({ section: 'runs' }) },
    { id: 'go-prompts', label: 'Go to Prompts', group: 'Navigate', icon: <Sparkles />, onSelect: () => go({ section: 'prompts' }) },
    { id: 'go-tools', label: 'Go to Tools', group: 'Navigate', icon: <Wrench />, onSelect: () => go({ section: 'tools' }) },
    { id: 'go-evals', label: 'Go to Evals', group: 'Navigate', icon: <FlaskConical />, onSelect: () => go({ section: 'evals' }) },
    { id: 'go-policy', label: 'Go to Policy', group: 'Navigate', icon: <ShieldCheck />, onSelect: () => go({ section: 'policy' }) },
    ...RUNS.slice(0, 4).map((run) => ({
      id: `run-${run.id}`,
      label: run.thread,
      group: 'Runs',
      keywords: `${run.id} ${run.agent} ${run.status}`,
      icon: <Bot />,
      onSelect: () => open('runs', run.id),
    })),
    ...TOOLS.map((tool) => ({
      id: `tool-${tool.id}`,
      label: tool.name,
      group: 'Tools',
      keywords: tool.origin,
      icon: <Wrench />,
      onSelect: () => open('tools', tool.id),
    })),
  ]
}

function crumbsFor({ route, go }: Nav): Crumb[] {
  const section = SECTION_LABEL[route.section] ?? 'Studio'
  if (!route.record) return [{ label: section }]

  const record =
    route.section === 'runs'
      ? RUNS.find((run) => run.id === route.record)?.thread
      : route.section === 'prompts'
        ? PROMPTS.find((prompt) => prompt.id === route.record)?.name
        : TOOLS.find((tool) => tool.id === route.record)?.name

  return [
    { label: section, onClick: () => go({ section: route.section }) },
    { label: record ?? route.record },
  ]
}

function StudioContent() {
  const { route } = useRoute()

  if (route.record) {
    if (route.section === 'runs') {
      const run = RUNS.find((item) => item.id === route.record)
      if (run) return <RunDetail run={run} />
    }
    if (route.section === 'prompts') {
      const prompt = PROMPTS.find((item) => item.id === route.record)
      if (prompt) return <PromptDetail prompt={prompt} />
    }
    if (route.section === 'tools') {
      const tool = TOOLS.find((item) => item.id === route.record)
      if (tool) return <ToolDetail tool={tool} />
    }
  }

  switch (route.section) {
    case 'runs':
      return <Runs />
    case 'prompts':
      return <Prompts />
    case 'tools':
      return <Tools />
    case 'evals':
      return <Evals />
    case 'policy':
      return <Policy />
    default:
      return <Threads />
  }
}

function Studio() {
  return (
    <Shell
      home="threads"
      product="Studio"
      groups={NAV_GROUPS}
      notifications={NOTIFICATIONS}
      user={{ name: 'Ada Lovelace', email: 'ada@astralyx.dev', plan: 'Workspace · astralyx' }}
      commands={commandsFor}
      crumbs={crumbsFor}
    >
      <StudioContent />
    </Shell>
  )
}

export const studioExample: ExampleEntry = {
  id: 'studio',
  label: 'Agent Studio',
  description:
    'Where an agent is written, run, watched and argued with: a thread with tool calls and reasoning, a run that opens into its own trace and guardrails, versioned prompts with a diff, and a tool policy you can actually change.',
  uses: [
    'Message', 'Prompt Input', 'Tool Call', 'Reasoning Block', 'Citations', 'Agent Steps',
    'Trace Waterfall', 'Guardrail List', 'Budget Guard', 'Tool Approval', 'Tool Schema',
    'Prompt Versions', 'Diff View', 'Eval Board', 'Model Comparison', 'Sandbox Policy',
    'Token Usage', 'Data Grid', 'Sheet', 'Dialog', 'Command',
  ],
  render: () => <Studio />,
}
