import { useState } from 'react'
import { CurlCommand } from '@/components/ui/curl-command'
import { EndpointList, type Endpoint } from '@/components/ui/endpoint-list'
import { HttpStatus } from '@/components/ui/http-status'
import { RequestBuilder, type RequestRow } from '@/components/ui/request-builder'
import { ResponseViewer } from '@/components/ui/response-viewer'
import { SchemaViewer, type JsonSchema } from '@/components/ui/schema-viewer'
import { WebhookInspector, type WebhookDelivery } from '@/components/ui/webhook-inspector'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (m: number) => new Date(NOW.getTime() - m * 60_000)

/* --------------------------------------------------------------- http status */

export const httpStatusEntry: ComponentEntry = {
  id: 'http-status',
  label: 'HTTP Status',
  description:
    'A status code with its reason phrase. Colour follows the class, never the individual code — grading a 503 as worse than a 500 invents a severity ordering that does not exist.',
  usage: `import { HttpStatus } from '@/components/ui/http-status'

<HttpStatus status={429} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'status', label: 'status', default: 429, min: 100, max: 599, step: 1 },
      { type: 'boolean', prop: 'phrase', label: 'reason phrase', default: true },
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default'], default: 'sm' },
    ],
    render: (state: ComposerState) => (
      <div className="flex flex-wrap gap-2">
        <HttpStatus
          status={Number(state.status)}
          showPhrase={Boolean(state.phrase)}
          size={state.size as 'sm' | 'default'}
        />
        {[200, 301, 404, 500].map((code) => (
          <HttpStatus
            key={code}
            status={code}
            showPhrase={Boolean(state.phrase)}
            size={state.size as 'sm' | 'default'}
          />
        ))}
      </div>
    ),
    code: (state: ComposerState) => `<HttpStatus status={${state.status}} />`,
  },
  api: [
    { name: 'status', type: 'number', description: 'The code. Reason phrases for the common ones are built in.' },
    { name: 'phrase', type: 'string', description: 'Overrides the built-in phrase — for a server that sends its own.' },
    { name: 'colour', type: 'by class', description: 'One green for every 2xx, one red for every 5xx. 3xx is informational, not success: a redirect is not a completed request, and green hides a redirect loop.' },
    { name: 'showPhrase', type: 'boolean', default: 'true', description: 'Off gives a bare code, for a dense table.' },
  ],
  demos: [
    { title: 'Every class of response', stack: true, code: `<HttpStatus status={200} />
<HttpStatus status={301} />
<HttpStatus status={404} />
<HttpStatus status={503} />`,
      render: () => (<div className="flex flex-wrap gap-2">{[200, 201, 204, 301, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503].map((code) => (<HttpStatus key={code} status={code} />))}</div>) },
    { title: 'Codes only', stack: true, code: `<HttpStatus status={429} showPhrase={false} />`,
      render: () => (<div className="flex flex-wrap gap-1.5">{[200, 301, 404, 429, 500].map((code) => (<HttpStatus key={code} status={code} showPhrase={false} />))}</div>) },
  ],
}

/* -------------------------------------------------------------- curl command */

export const curlCommandEntry: ComponentEntry = {
  id: 'curl-command',
  label: 'Curl Command',
  description:
    'A request as a runnable curl command, shell-quoted and with secrets masked. This output gets pasted into tickets, and an Authorization header pasted into a ticket is a leaked credential.',
  usage: `import { CurlCommand } from '@/components/ui/curl-command'

<CurlCommand method="POST" url={url} headers={headers} body={body} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'method', label: 'method', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
      { type: 'boolean', prop: 'body', label: 'body', default: true },
      { type: 'boolean', prop: 'insecure', label: 'insecure (-k)', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <CurlCommand
          method={String(state.method)}
          url="https://api.example.com/v1/users?limit=25"
          insecure={Boolean(state.insecure)}
          headers={[
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Authorization', value: 'Bearer ax_live_9f21c4a8e77b' },
            { name: 'X-Request-Id', value: 'req_8812' },
          ]}
          body={state.body ? { name: "O'Brien", role: 'admin' } : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<CurlCommand\n  method="${state.method}"\n  url={url}\n  headers={headers}\n  body={body}\n/>`,
  },
  api: [
    { name: 'redact', type: 'RegExp[]', description: 'Header names whose values are masked. Defaults cover Authorization, Cookie, api-key and x-*-token.' },
    { name: 'quoting', type: 'POSIX', description: "Single-quoted with `'\\''` for embedded quotes. A JSON body pasted raw truncates at the first apostrophe in someone's surname." },
    { name: 'body', type: 'string | object', description: 'An object is JSON-encoded before quoting.' },
    { name: 'line breaks', type: 'automatic', description: 'Backslash continuations — a 400-character single line cannot be reviewed.' },
  ],
  demos: [
    { title: 'A POST with headers and a body', stack: true, code: `<CurlCommand method="POST" url="https://api.example.com/v1/refunds" headers={headers} body={body} />`,
      render: () => (<div className="w-full max-w-2xl"><CurlCommand method="POST" url="https://api.example.com/v1/refunds" headers={[{ name: 'Authorization', value: 'Bearer ax_live_9f2a11c4' }, { name: 'Content-Type', value: 'application/json' }]} body={{ customer_id: 'cus_8812', amount: 34_000 }} /></div>) },
    { title: 'A bare GET', stack: true, code: `<CurlCommand url="https://api.example.com/v1/customers/cus_8812" />`,
      render: () => (<div className="w-full max-w-2xl"><CurlCommand url="https://api.example.com/v1/customers/cus_8812" /></div>) },
  ],
}

/* ------------------------------------------------------------ request builder */

function RequestDemo() {
  const [method, setMethod] = useState('POST')
  const [url, setUrl] = useState('https://api.example.com/v1/users')
  const [params, setParams] = useState<RequestRow[]>([
    { id: 'p1', name: 'limit', value: '25', enabled: true },
    { id: 'p2', name: 'q', value: 'name & role', enabled: true },
  ])
  const [headers, setHeaders] = useState<RequestRow[]>([
    { id: 'h1', name: 'Content-Type', value: 'application/json', enabled: true },
  ])
  const [body, setBody] = useState('{\n  "role": "admin"\n}')

  return (
    <div className="w-full max-w-2xl">
      <RequestBuilder
        method={method}
        onMethodChange={setMethod}
        url={url}
        onUrlChange={setUrl}
        params={params}
        onParamsChange={setParams}
        headers={headers}
        onHeadersChange={setHeaders}
        body={body}
        onBodyChange={setBody}
        onSend={() => {}}
      />
    </div>
  )
}

export const requestBuilderEntry: ComponentEntry = {
  id: 'request-builder',
  label: 'Request Builder',
  description:
    'Method, URL, headers, query and body. Query parameters are edited as rows and the assembled URL is shown beneath — hand-editing a query string is where encoding bugs come from.',
  usage: `import { RequestBuilder } from '@/components/ui/request-builder'

<RequestBuilder method={method} url={url} params={params} onSend={send} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'method', label: 'method', options: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'], default: 'GET' },
      { type: 'boolean', prop: 'sending', label: 'sending', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <RequestBuilder
          method={String(state.method)}
          url="https://api.example.com/v1/users"
          sending={Boolean(state.sending)}
          params={[{ id: 'p1', name: 'limit', value: '25', enabled: true }]}
          headers={[{ id: 'h1', name: 'Accept', value: 'application/json', enabled: true }]}
          onSend={() => {}}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<RequestBuilder\n  method="${state.method}"\n  url={url}\n  params={params}\n  headers={headers}\n  onSend={send}\n/>`,
  },
  api: [
    { name: 'params / headers', type: 'RequestRow[]', description: '`{ id, name, value, enabled? }`. Rows toggle off rather than only delete — that is the actual workflow.' },
    { name: 'assembled URL', type: 'shown read-only', description: 'Built with `URL`, so values are encoded. An `&` inside a value would otherwise become a parameter boundary.' },
    { name: 'body section', type: 'absent for GET/HEAD', description: 'A GET body is legal in the RFC and widely stripped by proxies. Offering it invites an afternoon of debugging.' },
    { name: 'onSend', type: '() => void', description: 'Omit to render a request editor with no send control.' },
  ],
  demos: [
    { title: 'Composing a request', stack: true, code: `<RequestBuilder method={method} onMethodChange={setMethod} url={url} … />`, render: () => <RequestDemo /> },
  ],
}

/* ------------------------------------------------------------ response viewer */

export const responseViewerEntry: ComponentEntry = {
  id: 'response-viewer',
  label: 'Response Viewer',
  description:
    'Status, timing, size, headers and body. The three headline figures share one line because they are read together — a 200 that took 4 seconds is a different result from one that took 40ms.',
  usage: `import { ResponseViewer } from '@/components/ui/response-viewer'

<ResponseViewer status={200} durationMs={412} sizeBytes={8214} body={json} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'status', label: 'status', default: 200, min: 100, max: 599, step: 1 },
      { type: 'number', prop: 'duration', label: 'duration (ms)', default: 412, min: 1, max: 8000, step: 50 },
      { type: 'select', prop: 'kind', label: 'body', options: ['json', 'html', 'empty'], default: 'json' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <ResponseViewer
          status={Number(state.status)}
          durationMs={Number(state.duration)}
          sizeBytes={8214}
          contentType={state.kind === 'html' ? 'text/html; charset=utf-8' : 'application/json'}
          headers={[
            { name: 'Content-Type', value: 'application/json' },
            { name: 'x-request-id', value: 'req_8812' },
            { name: 'Cache-Control', value: 'no-store' },
            { name: 'x-ratelimit-remaining', value: '4821' },
          ]}
          body={
            state.kind === 'empty'
              ? undefined
              : state.kind === 'html'
                ? '<!doctype html>\n<html>\n  <body>Hello</body>\n</html>'
                : { id: 'usr_8812', name: 'Ada Okafor', roles: ['admin', 'billing'], active: true }
          }
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<ResponseViewer\n  status={${state.status}}\n  durationMs={${state.duration}}\n  sizeBytes={8214}\n  body={body}\n/>`,
  },
  api: [
    { name: 'body', type: 'string | object', description: 'A JSON body gets the tree view; anything else gets highlighted text. Rendering JSON as a wall of text is honest and useless.' },
    { name: 'headers', type: 'ResponseHeader[]', description: 'Lower-cased and sorted for display — HTTP header names are case-insensitive and servers are inconsistent, which breaks an A–Z scan.' },
    { name: 'durationMs', type: 'number', description: 'Turns amber past a second.' },
    { name: 'sections', type: 'stacked disclosures', description: 'Not tabs: the three panels differ hugely in height, so a shared tab panel resizes the card on every switch and the strip moves out from under the pointer. Stacking also lets headers and body be read together.' },
  ],
  demos: [
    { title: 'A 200 with headers and a body', stack: true, code: `<ResponseViewer status={200} durationMs={128} sizeBytes={1042} body={body} headers={headers} />`,
      render: () => (<div className="w-full"><ResponseViewer status={200} durationMs={128} sizeBytes={1042} headers={[{ name: 'content-type', value: 'application/json' }, { name: 'x-request-id', value: 'req_8f21' }]} body={{ id: 'cus_8812', plan: 'team', seats: 12 }} /></div>) },
    { title: 'A 404', stack: true, code: `<ResponseViewer status={404} durationMs={38} body={{ error: 'not_found' }} />`,
      render: () => (<div className="w-full"><ResponseViewer status={404} durationMs={38} sizeBytes={54} headers={[{ name: 'content-type', value: 'application/json' }]} body={{ error: 'not_found', message: 'No customer with that id.' }} /></div>) },
  ],
}

/* -------------------------------------------------------------- endpoint list */

const ENDPOINTS: Endpoint[] = [
  { id: 'e1', method: 'GET', path: '/v1/users', summary: 'List users', group: 'Users', status: 200 },
  { id: 'e2', method: 'POST', path: '/v1/users', summary: 'Create a user', group: 'Users', auth: true, status: 201 },
  { id: 'e3', method: 'GET', path: '/v1/users/{id}', summary: 'Fetch one user', group: 'Users', auth: true },
  { id: 'e4', method: 'DELETE', path: '/v1/users/{id}', summary: 'Delete a user', group: 'Users', auth: true, status: 204 },
  { id: 'e5', method: 'GET', path: '/v1/accounts', summary: 'List accounts', group: 'Accounts', auth: true },
  { id: 'e6', method: 'PATCH', path: '/v1/accounts/{id}', group: 'Accounts', auth: true, status: 200 },
  { id: 'e7', method: 'GET', path: '/v1/me/profile', summary: 'Superseded by /v1/users/{id}', group: 'Accounts', deprecated: true, auth: true },
]

export const endpointListEntry: ComponentEntry = {
  id: 'endpoint-list',
  label: 'Endpoint List',
  description:
    'API routes, grouped and filterable. The method badge is fixed-width because a route table is scanned down the method column, and a ragged left edge makes that scan impossible.',
  usage: `import { EndpointList } from '@/components/ui/endpoint-list'

<EndpointList endpoints={endpoints} onSelect={open} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'searchable', label: 'searchable', default: true },
      { type: 'boolean', prop: 'selectable', label: 'selectable', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <EndpointList
          endpoints={ENDPOINTS}
          searchable={Boolean(state.searchable)}
          selected={state.selectable ? 'e2' : undefined}
          onSelect={state.selectable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<EndpointList endpoints={endpoints} onSelect={open} />`,
  },
  api: [
    { name: 'endpoints', type: 'Endpoint[]', description: '`{ id, method, path, summary?, group?, auth?, deprecated?, status? }`.' },
    { name: 'deprecated', type: 'boolean', description: 'Struck through but kept. Removing a deprecated route from the list is how a client keeps calling it for another year.' },
    { name: 'filtering', type: 'method + path', description: 'The method is part of the haystack, so "post /users" filters the way people type.' },
    { name: 'auth', type: 'boolean', description: 'Draws a lock. Whether a route needs credentials is the second thing anyone looks for.' },
  ],
  demos: [
    { title: 'A REST surface', stack: true, code: `<EndpointList endpoints={endpoints} />`,
      render: () => (<div className="w-full max-w-2xl"><EndpointList endpoints={ENDPOINTS} /></div>) },
  ],
}

/* -------------------------------------------------------------- schema viewer */

const SCHEMA: JsonSchema = {
  type: 'object',
  required: ['id', 'email'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Server-assigned.' },
    email: { type: 'string', format: 'email', maxLength: 254 },
    name: { type: 'string', minLength: 1, maxLength: 120 },
    role: { type: 'string', enum: ['admin', 'member', 'viewer'], default: 'member' },
    legacyId: { type: 'integer', deprecated: true, description: 'Use id.' },
    address: {
      type: 'object',
      required: ['line1', 'country'],
      properties: {
        line1: { type: 'string' },
        line2: { type: 'string' },
        country: { type: 'string', pattern: '^[A-Z]{2}$' },
      },
    },
    contact: {
      oneOf: [
        { type: 'object', title: 'Email', properties: { email: { type: 'string', format: 'email' } } },
        { type: 'object', title: 'Phone', properties: { phone: { type: 'string', pattern: '^\\+[0-9]{7,15}$' } } },
      ],
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
}

export const schemaViewerEntry: ComponentEntry = {
  id: 'schema-viewer',
  label: 'Schema Viewer',
  description:
    'JSON Schema as a tree. Required fields are marked on the field itself rather than left in the parent\'s `required` array — cross-referencing that list is the one job a renderer should do for you.',
  usage: `import { SchemaViewer } from '@/components/ui/schema-viewer'

<SchemaViewer schema={schema} name="User" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'depth', label: 'open to depth', default: 2, min: 0, max: 4, step: 1 },
      { type: 'text', prop: 'name', label: 'root name', default: 'User' },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <SchemaViewer
          schema={SCHEMA}
          name={String(state.name)}
          defaultOpenDepth={Number(state.depth)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<SchemaViewer schema={schema} name="${state.name}" defaultOpenDepth={${state.depth}} />`,
  },
  api: [
    { name: 'schema', type: 'JsonSchema', description: 'A plain JSON Schema object. No `$ref` resolution — dereference before passing it in.' },
    { name: 'constraints', type: 'inline', description: '`format`, `enum`, `pattern`, length and range shown beside the type. That a string must match a UUID pattern is the interesting part; "string" is not.' },
    { name: 'oneOf / anyOf', type: 'labelled alternatives', description: 'Rendered as branches, never flattened — a flattened union looks like an object with contradictory fields.' },
    { name: 'deprecated', type: 'boolean', description: 'Struck through and badged.' },
  ],
  demos: [
    { title: 'A nested response schema', stack: true, code: `<SchemaViewer schema={schema} />`,
      render: () => (<div className="w-full max-w-2xl"><SchemaViewer schema={SCHEMA} /></div>) },
  ],
}

/* ---------------------------------------------------------- webhook inspector */

const DELIVERIES: WebhookDelivery[] = [
  {
    id: 'd1', event: 'payment.succeeded', at: ago(3), status: 200, durationMs: 84, signature: 'valid',
    payload: { id: 'evt_881', type: 'payment.succeeded', data: { amount: 4200, currency: 'gbp' } },
    responseBody: '{"received":true}',
  },
  {
    id: 'd2', event: 'payment.failed', at: ago(28), status: 500, durationMs: 4120, signature: 'valid', attempt: 3, maxAttempts: 5,
    payload: { id: 'evt_879', type: 'payment.failed', data: { code: 'card_declined' } },
    responseBody: 'upstream timeout',
  },
  {
    id: 'd3', event: 'customer.created', at: ago(96), status: 200, durationMs: 61, signature: 'invalid',
    payload: { id: 'evt_871', type: 'customer.created' },
    responseBody: '{"received":true}',
  },
  { id: 'd4', event: 'subscription.updated', at: ago(240), status: 404, durationMs: 22, signature: 'missing' },
]

export const webhookInspectorEntry: ComponentEntry = {
  id: 'webhook-inspector',
  label: 'Webhook Inspector',
  description:
    'Inbound deliveries with payload and response. Signature status is its own field, never folded into the status code — a 200 with an invalid signature is a forged request your handler accepted.',
  usage: `import { WebhookInspector } from '@/components/ui/webhook-inspector'

<WebhookInspector deliveries={deliveries} onReplay={replay} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'replay', label: 'replay action', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <WebhookInspector
          deliveries={DELIVERIES}
          now={NOW}
          onReplay={state.replay ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<WebhookInspector deliveries={deliveries} onReplay={replay} />`,
  },
  api: [
    { name: 'deliveries', type: 'WebhookDelivery[]', description: '`{ id, event, at, status?, durationMs?, payload?, responseBody?, signature?, attempt? }`.' },
    { name: 'signature', type: "'valid' | 'invalid' | 'missing' | 'unchecked'", description: 'Separate from the status. A delivery that returned 200 with an invalid signature is called out explicitly.' },
    { name: 'both directions', type: 'kept', description: 'What arrived and what you answered. A webhook failure is a disagreement between the two, and storing only the payload cannot say which side was wrong.' },
    { name: 'onReplay', type: '(id) => void', description: 'Omit for a read-only log.' },
  ],
  demos: [
    { title: 'Deliveries, one of them failing', stack: true, code: `<WebhookInspector deliveries={deliveries} now={now} onReplay={replay} />`,
      render: () => (<div className="w-full"><WebhookInspector deliveries={DELIVERIES} now={NOW} onReplay={() => {}} /></div>) },
  ],
}
