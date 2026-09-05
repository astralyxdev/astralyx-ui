import { useMemo, useState } from 'react'
import { KeyRound, Radio, Search, Send, Webhook } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { ApiKeys, type ApiKey } from '@/components/ui/api-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurlCommand } from '@/components/ui/curl-command'
import { EndpointList, type Endpoint } from '@/components/ui/endpoint-list'
import { HttpStatus } from '@/components/ui/http-status'
import { Input } from '@/components/ui/input'
import { JwtInspector } from '@/components/ui/jwt-inspector'
import { RateLimitMeter } from '@/components/ui/rate-limit-meter'
import { RequestBuilder, type RequestRow } from '@/components/ui/request-builder'
import { ResponseViewer, type ResponseHeader } from '@/components/ui/response-viewer'
import { RpcConsole, type RpcMessage } from '@/components/ui/rpc-console'
import { SchemaForm, type SchemaFormValue } from '@/components/ui/schema-form'
import type { JsonSchema } from '@/components/ui/schema-viewer'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { WebhookInspector, type WebhookDelivery } from '@/components/ui/webhook-inspector'
import { WebSocketFrames, type WsFrame } from '@/components/ui/websocket-frames'
import { AppFrame, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * A fixed instant, not `new Date()`.
 *
 * Everything on this page that reads as "3 minutes ago" or "expires in 30
 * minutes" is measured against this. The examples are prerendered on the
 * server, so a moving now would render one string on the server and another in
 * the browser — a hydration mismatch, every time.
 */
const NOW = new Date('2026-09-05T14:20:00Z')

const NAV: NavItem[] = [
  { id: 'request', label: 'Request', icon: <Send /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook />, count: 2 },
  { id: 'realtime', label: 'Realtime', icon: <Radio /> },
  { id: 'auth', label: 'Auth', icon: <KeyRound /> },
]

const BASE = 'https://api.astralyx.dev'

/** Sent on every request, so it is defined once rather than per endpoint. */
const COMMON_HEADERS: RequestRow[] = [
  { id: 'h-auth', name: 'Authorization', value: 'Bearer ax_live_9f2a4c1e8b034d77', enabled: true },
  { id: 'h-accept', name: 'Accept', value: 'application/json', enabled: true },
  { id: 'h-version', name: 'Astralyx-Version', value: '2026-07-01', enabled: true },
]

/* --------------------------------------------------------------- endpoints */

/**
 * An endpoint carries both halves: what to send, and what came back last time.
 *
 * Keeping the canned response next to the route is what lets picking a route
 * fill the builder *and* the response pane from one selection — a separate
 * responses map keyed by id would be two things to keep in step.
 */
type WorkbenchEndpoint = Endpoint & {
  url: string
  headers: RequestRow[]
  params: RequestRow[]
  body: string
  /** Present when the route takes a JSON body the OpenAPI document describes. */
  bodySchema?: JsonSchema
  response: {
    status: number
    statusText: string
    durationMs: number
    sizeBytes: number
    contentType: string
    headers: ResponseHeader[]
    body: object
  }
}

const ORDER_BODY_SCHEMA: JsonSchema = {
  type: 'object',
  title: 'CreateOrderRequest',
  required: ['customer_id', 'currency', 'line_items'],
  properties: {
    customer_id: { type: 'string', format: 'uuid', description: 'An existing customer.' },
    currency: { type: 'string', enum: ['EUR', 'GBP', 'USD'], default: 'EUR' },
    line_items: { type: 'array', items: { type: 'string' }, description: 'One SKU per line.' },
    promo_code: { type: 'string', pattern: '^[A-Z0-9-]{4,16}$' },
    capture: { type: 'boolean', default: true, description: 'Charge now instead of authorising.' },
  },
}

const REFUND_BODY_SCHEMA: JsonSchema = {
  type: 'object',
  title: 'CreateRefundRequest',
  required: ['amount_cents', 'reason'],
  properties: {
    amount_cents: { type: 'integer', minimum: 1, maximum: 1_000_000 },
    reason: {
      type: 'string',
      enum: ['damaged_in_transit', 'wrong_item', 'customer_changed_mind', 'late_delivery'],
    },
    notify_customer: { type: 'boolean', default: true },
  },
}

const RESPONSE_HEADERS: ResponseHeader[] = [
  { name: 'content-type', value: 'application/json; charset=utf-8' },
  { name: 'astralyx-request-id', value: 'req_7d4c19ae82b0' },
  { name: 'ratelimit-limit', value: '1000' },
  { name: 'ratelimit-remaining', value: '184' },
  { name: 'ratelimit-reset', value: '1788618900' },
  { name: 'cache-control', value: 'no-store' },
]

const ENDPOINTS: WorkbenchEndpoint[] = [
  {
    id: 'list-orders',
    method: 'GET',
    path: '/v1/orders',
    summary: 'List orders, newest first',
    group: 'Orders',
    auth: true,
    status: 200,
    url: `${BASE}/v1/orders`,
    headers: COMMON_HEADERS,
    params: [
      { id: 'p-status', name: 'status', value: 'paid', enabled: true },
      { id: 'p-limit', name: 'limit', value: '2', enabled: true },
      { id: 'p-cursor', name: 'starting_after', value: 'ord_9f2a4c1e', enabled: false },
    ],
    body: '',
    response: {
      status: 200,
      statusText: 'OK',
      durationMs: 142,
      sizeBytes: 1_842,
      contentType: 'application/json',
      headers: RESPONSE_HEADERS,
      body: {
        object: 'list',
        has_more: true,
        next_cursor: 'ord_c73b19ad',
        data: [
          {
            id: 'ord_9f2a4c1e8b03',
            status: 'paid',
            currency: 'EUR',
            total_cents: 24900,
            customer: { id: 'cus_4d779a12', email: 'j.kowalski@fastmail.com' },
            placed_at: '2026-09-05T13:58:11Z',
          },
          {
            id: 'ord_a1c8d0f42e19',
            status: 'paid',
            currency: 'EUR',
            total_cents: 118400,
            customer: { id: 'cus_4b5a8f60', email: 'marie.dubois@laposte.net' },
            placed_at: '2026-09-05T13:41:02Z',
          },
        ],
      },
    },
  },
  {
    id: 'get-order',
    method: 'GET',
    path: '/v1/orders/{order_id}',
    summary: 'Retrieve one order with its line items',
    group: 'Orders',
    auth: true,
    status: 200,
    url: `${BASE}/v1/orders/ord_9f2a4c1e8b03`,
    headers: COMMON_HEADERS,
    params: [{ id: 'p-expand', name: 'expand[]', value: 'line_items', enabled: true }],
    body: '',
    response: {
      status: 200,
      statusText: 'OK',
      durationMs: 61,
      sizeBytes: 924,
      contentType: 'application/json',
      headers: RESPONSE_HEADERS,
      body: {
        id: 'ord_9f2a4c1e8b03',
        object: 'order',
        status: 'paid',
        currency: 'EUR',
        total_cents: 24900,
        line_items: [
          { sku: 'AX-CBL-USBC-2M', quantity: 2, unit_price_cents: 1500 },
          { sku: 'AX-MAT-DESK-L', quantity: 1, unit_price_cents: 3500 },
        ],
        metadata: { source: 'web', utm: { medium: 'cpc', campaign: 'back-to-desk' } },
      },
    },
  },
  {
    id: 'create-order',
    method: 'POST',
    path: '/v1/orders',
    summary: 'Create an order and optionally capture payment',
    group: 'Orders',
    auth: true,
    status: 201,
    url: `${BASE}/v1/orders`,
    headers: [
      ...COMMON_HEADERS,
      { id: 'h-ct', name: 'Content-Type', value: 'application/json', enabled: true },
      { id: 'h-idem', name: 'Idempotency-Key', value: 'idem_2f81c04a9e', enabled: true },
    ],
    params: [],
    bodySchema: ORDER_BODY_SCHEMA,
    body: JSON.stringify(
      {
        customer_id: '4d779a12-0c5e-4f81-b204-9f2a4c1e8b03',
        currency: 'EUR',
        line_items: ['AX-KEEB-65', 'AX-CBL-USBC-2M'],
        capture: true,
      },
      null,
      2,
    ),
    response: {
      status: 201,
      statusText: 'Created',
      durationMs: 388,
      sizeBytes: 612,
      contentType: 'application/json',
      headers: [
        ...RESPONSE_HEADERS,
        { name: 'location', value: '/v1/orders/ord_e58f3c901d74' },
      ],
      body: {
        id: 'ord_e58f3c901d74',
        object: 'order',
        status: 'paid',
        currency: 'EUR',
        total_cents: 16490,
        capture: { id: 'pay_88e0417fb5a3', status: 'succeeded' },
        created_at: '2026-09-05T14:19:44Z',
      },
    },
  },
  {
    id: 'refund-order',
    method: 'POST',
    path: '/v1/orders/{order_id}/refunds',
    summary: 'Refund all or part of an order',
    group: 'Orders',
    auth: true,
    status: 402,
    url: `${BASE}/v1/orders/ord_c73b19ad5f42/refunds`,
    headers: [
      ...COMMON_HEADERS,
      { id: 'h-ct2', name: 'Content-Type', value: 'application/json', enabled: true },
    ],
    params: [],
    bodySchema: REFUND_BODY_SCHEMA,
    body: JSON.stringify({ amount_cents: 8990, reason: 'wrong_item' }, null, 2),
    response: {
      status: 402,
      statusText: 'Payment Required',
      durationMs: 704,
      sizeBytes: 288,
      contentType: 'application/problem+json',
      headers: [
        { name: 'content-type', value: 'application/problem+json' },
        { name: 'astralyx-request-id', value: 'req_1d744a2b93c6' },
        { name: 'ratelimit-remaining', value: '183' },
      ],
      body: {
        type: 'https://docs.astralyx.dev/errors/balance_insufficient',
        title: 'Balance insufficient',
        status: 402,
        detail: 'The connected account has €12.40 available and cannot cover a €89.90 refund.',
        request_id: 'req_1d744a2b93c6',
      },
    },
  },
  {
    id: 'list-customers',
    method: 'GET',
    path: '/v1/customers',
    summary: 'Search customers by email or country',
    group: 'Customers',
    auth: true,
    status: 200,
    url: `${BASE}/v1/customers`,
    headers: COMMON_HEADERS,
    params: [
      { id: 'p-country', name: 'country', value: 'NL', enabled: true },
      { id: 'p-q', name: 'query', value: 'ziggo.nl', enabled: true },
    ],
    body: '',
    response: {
      status: 200,
      statusText: 'OK',
      durationMs: 88,
      sizeBytes: 402,
      contentType: 'application/json',
      headers: RESPONSE_HEADERS,
      body: {
        object: 'list',
        has_more: false,
        data: [
          {
            id: 'cus_b0192a6f80d4',
            email: 'tom.devries@ziggo.nl',
            country: 'NL',
            lifetime_value_cents: 41880,
          },
        ],
      },
    },
  },
  {
    id: 'delete-customer',
    method: 'DELETE',
    path: '/v1/customers/{customer_id}',
    summary: 'Hard-delete a customer — use the erasure endpoint instead',
    group: 'Customers',
    auth: true,
    deprecated: true,
    status: 410,
    url: `${BASE}/v1/customers/cus_b0192a6f80d4`,
    headers: COMMON_HEADERS,
    params: [],
    body: '',
    response: {
      status: 410,
      statusText: 'Gone',
      durationMs: 24,
      sizeBytes: 214,
      contentType: 'application/problem+json',
      headers: [
        { name: 'content-type', value: 'application/problem+json' },
        { name: 'sunset', value: 'Wed, 01 Jul 2026 00:00:00 GMT' },
        { name: 'link', value: '</v1/customers/{id}/erasure>; rel="successor-version"' },
      ],
      body: {
        type: 'https://docs.astralyx.dev/errors/endpoint_removed',
        title: 'Endpoint removed',
        status: 410,
        detail: 'DELETE /v1/customers was removed in 2026-07-01. Use POST /v1/customers/{id}/erasure.',
      },
    },
  },
  {
    id: 'get-inventory',
    method: 'GET',
    path: '/v1/inventory/{sku}',
    summary: 'Stock on hand for one SKU',
    group: 'Inventory',
    auth: true,
    status: 404,
    url: `${BASE}/v1/inventory/AX-KEEB-75`,
    headers: COMMON_HEADERS,
    params: [{ id: 'p-wh', name: 'warehouse', value: 'eu-nl-1', enabled: true }],
    body: '',
    response: {
      status: 404,
      statusText: 'Not Found',
      durationMs: 19,
      sizeBytes: 176,
      contentType: 'application/problem+json',
      headers: [
        { name: 'content-type', value: 'application/problem+json' },
        { name: 'astralyx-request-id', value: 'req_3c9088e0417f' },
      ],
      body: {
        type: 'https://docs.astralyx.dev/errors/not_found',
        title: 'No such SKU',
        status: 404,
        detail: 'AX-KEEB-75 is not in the catalogue. Did you mean AX-KEEB-65?',
      },
    },
  },
  {
    id: 'create-webhook',
    method: 'POST',
    path: '/v1/webhook_endpoints',
    summary: 'Register a URL for event delivery',
    group: 'Webhooks',
    auth: true,
    status: 201,
    url: `${BASE}/v1/webhook_endpoints`,
    headers: [
      ...COMMON_HEADERS,
      { id: 'h-ct3', name: 'Content-Type', value: 'application/json', enabled: true },
    ],
    params: [],
    body: JSON.stringify(
      {
        url: 'https://hooks.northwind.example/astralyx',
        enabled_events: ['order.paid', 'order.refunded', 'customer.created'],
        api_version: '2026-07-01',
      },
      null,
      2,
    ),
    response: {
      status: 201,
      statusText: 'Created',
      durationMs: 211,
      sizeBytes: 344,
      contentType: 'application/json',
      headers: RESPONSE_HEADERS,
      body: {
        id: 'we_53c4d8f0192e',
        object: 'webhook_endpoint',
        url: 'https://hooks.northwind.example/astralyx',
        secret: 'whsec_••••••••••••4a2b',
        status: 'enabled',
      },
    },
  },
]

/* ----------------------------------------------------------------- history */

type Call = { id: string; method: string; path: string; status: number; durationMs: number; at: string }

const INITIAL_HISTORY: Call[] = [
  { id: 'c-1', method: 'GET', path: '/v1/orders', status: 200, durationMs: 142, at: '14:18:02' },
  { id: 'c-2', method: 'POST', path: '/v1/orders/ord_c73b…/refunds', status: 402, durationMs: 704, at: '14:14:39' },
  { id: 'c-3', method: 'GET', path: '/v1/inventory/AX-KEEB-75', status: 404, durationMs: 19, at: '14:11:20' },
  { id: 'c-4', method: 'POST', path: '/v1/orders', status: 201, durationMs: 388, at: '14:02:55' },
  { id: 'c-5', method: 'DELETE', path: '/v1/customers/cus_b019…', status: 410, durationMs: 24, at: '13:58:41' },
]

/* ---------------------------------------------------------------- webhooks */

const DELIVERIES: WebhookDelivery[] = [
  {
    id: 'evt_8b034d779a12',
    event: 'order.paid',
    at: new Date('2026-09-05T14:17:40Z'),
    status: 200,
    durationMs: 184,
    signature: 'valid',
    attempt: 1,
    maxAttempts: 5,
    payload: {
      id: 'evt_8b034d779a12',
      type: 'order.paid',
      data: { id: 'ord_9f2a4c1e8b03', total_cents: 24900, currency: 'EUR' },
    },
    responseBody: '{"received":true}',
  },
  {
    id: 'evt_0c5e7f81b204',
    event: 'order.refunded',
    at: new Date('2026-09-05T14:09:12Z'),
    status: 500,
    durationMs: 30_012,
    signature: 'valid',
    attempt: 3,
    maxAttempts: 5,
    payload: {
      id: 'evt_0c5e7f81b204',
      type: 'order.refunded',
      data: { id: 'ord_c73b19ad5f42', amount_cents: 8990, reason: 'wrong_item' },
    },
    responseBody: 'upstream connect error or disconnect/reset before headers',
  },
  {
    id: 'evt_2e194b5a8f60',
    event: 'customer.created',
    at: new Date('2026-09-05T13:52:03Z'),
    status: 202,
    durationMs: 91,
    signature: 'missing',
    attempt: 1,
    payload: {
      id: 'evt_2e194b5a8f60',
      type: 'customer.created',
      data: { id: 'cus_b0192a6f80d4', email: 'tom.devries@ziggo.nl' },
    },
    responseBody: '',
  },
  {
    id: 'evt_7d21c3e94a88',
    event: 'order.paid',
    at: new Date('2026-09-05T13:44:28Z'),
    status: 401,
    durationMs: 62,
    signature: 'invalid',
    attempt: 5,
    maxAttempts: 5,
    payload: {
      id: 'evt_7d21c3e94a88',
      type: 'order.paid',
      data: { id: 'ord_a1c8d0f42e19', total_cents: 118400, currency: 'EUR' },
    },
    responseBody: '{"error":"signature mismatch"}',
  },
]

/* ---------------------------------------------------------------- realtime */

const FRAMES: WsFrame[] = [
  { id: 'f1', direction: 'sent', opcode: 'text', at: new Date('2026-09-05T14:19:02Z'), bytes: 96, data: '{"op":"subscribe","channels":["orders:eu","inventory:eu-nl-1"],"since":"ord_a1c8d0f42e19"}' },
  { id: 'f2', direction: 'received', opcode: 'text', at: new Date('2026-09-05T14:19:02Z'), bytes: 58, data: '{"op":"subscribed","channels":["orders:eu","inventory:eu-nl-1"]}' },
  { id: 'f3', direction: 'received', opcode: 'text', at: new Date('2026-09-05T14:19:11Z'), bytes: 142, data: '{"op":"event","channel":"orders:eu","type":"order.paid","data":{"id":"ord_9f2a4c1e8b03","total_cents":24900}}' },
  { id: 'f4', direction: 'sent', opcode: 'ping', at: new Date('2026-09-05T14:19:32Z'), bytes: 0, data: '' },
  { id: 'f5', direction: 'received', opcode: 'pong', at: new Date('2026-09-05T14:19:32Z'), bytes: 0, data: '' },
  { id: 'f6', direction: 'received', opcode: 'text', at: new Date('2026-09-05T14:19:48Z'), bytes: 118, data: '{"op":"event","channel":"inventory:eu-nl-1","type":"stock.low","data":{"sku":"AX-HUB-7P","on_hand":4}}' },
  { id: 'f7', direction: 'received', opcode: 'text', at: new Date('2026-09-05T14:20:01Z'), bytes: 74, data: '{"op":"error","code":"slow_consumer","detail":"1,204 messages dropped"}' },
  { id: 'f8', direction: 'received', opcode: 'close', at: new Date('2026-09-05T14:20:04Z'), bytes: 0, data: '1013 try again later' },
]

const RPC_MESSAGES: RpcMessage[] = [
  { key: 'r1', direction: 'out', kind: 'request', id: 1, method: 'catalogue.search', at: '14:18:44', payload: { query: 'usb-c cable', locale: 'de-DE', limit: 5 } },
  { key: 'r2', direction: 'in', kind: 'response', id: 1, at: '14:18:44', durationMs: 38, payload: { hits: 3, skus: ['AX-CBL-USBC-2M', 'AX-CBL-USBC-1M', 'AX-HUB-7P'] } },
  { key: 'r3', direction: 'out', kind: 'request', id: 2, method: 'pricing.quote', at: '14:18:51', payload: { sku: 'AX-KEEB-65', country: 'DE', quantity: 1 } },
  { key: 'r4', direction: 'in', kind: 'error', id: 2, at: '14:18:51', durationMs: 12, error: { code: -32602, message: 'Invalid params: country must be an ISO-3166-1 alpha-2 code in upper case' } },
  { key: 'r5', direction: 'out', kind: 'notification', method: 'cart.viewed', at: '14:18:58', payload: { session_id: '4d779a12-0c5e-4f81-b204-9f2a4c1e8b03' } },
  // No response with id 3 — `RpcConsole` marks it as still outstanding.
  { key: 'r6', direction: 'out', kind: 'request', id: 3, method: 'fulfilment.reserve', at: '14:19:05', payload: { order_id: 'ord_e58f3c901d74', warehouse: 'eu-nl-1' } },
]

/* -------------------------------------------------------------------- auth */

const TOKENS = [
  {
    id: 'live',
    label: 'Live session token (RS256)',
    value:
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjYtMDgtcm90YXRlLWEifQ.eyJpc3MiOiJodHRwczovL2F1dGguYXN0cmFseXguZGV2LyIsInN1YiI6InVzcl84ZjIxYzQwYjZkIiwiYXVkIjpbImh0dHBzOi8vYXBpLmFzdHJhbHl4LmRldi92MSJdLCJzY29wZSI6Im9yZGVyczpyZWFkIG9yZGVyczp3cml0ZSB3ZWJob29rczptYW5hZ2UiLCJvcmciOiJvcmdfbm9ydGh3aW5kIiwicGxhbiI6InNjYWxlIiwiaWF0IjoxNzg4NjE0NDAwLCJleHAiOjE3ODg2MTk4MDAsImp0aSI6InRva180YzE5YWU4MiJ9.MEUCIQD2xR1kq7wYbN0pLm4TjVhQZ8sCfA9eGkKu3rBxYw6dNQIgTn5vHc1oPyLdWmEj0aRfKu8ZbXqI6sVtCgN4pM2hAeU',
  },
  {
    id: 'staging',
    label: 'Import worker token (expired)',
    value:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0YWdpbmctMjAyNi0wNyJ9.eyJpc3MiOiJodHRwczovL2F1dGguc3RhZ2luZy5hc3RyYWx5eC5kZXYvIiwic3ViIjoic3ZjX2ltcG9ydF93b3JrZXIiLCJhdWQiOiJodHRwczovL2FwaS5zdGFnaW5nLmFzdHJhbHl4LmRldi92MSIsInNjb3BlIjoib3JkZXJzOnJlYWQiLCJvcmciOiJvcmdfbm9ydGh3aW5kIiwiaWF0IjoxNzg3NzU0MDAwLCJleHAiOjE3ODc4NDA0MDAsImp0aSI6InRva185YjAyZGU0MSJ9.Kf3nQ8sYb1TzVxLm0aRpWc7hEuJd2NgOy6XiBvA4tPk',
  },
]

const API_KEYS: ApiKey[] = [
  {
    id: 'k1',
    name: 'Storefront (production)',
    prefix: 'ax_live',
    last4: '8b03',
    created: new Date('2026-03-11T09:20:00Z'),
    lastUsed: new Date('2026-09-05T14:19:51Z'),
    scopes: ['orders:read', 'orders:write', 'customers:read'],
  },
  {
    id: 'k2',
    name: 'Analytics warehouse sync',
    prefix: 'ax_live',
    last4: '2e19',
    created: new Date('2025-11-02T16:04:00Z'),
    lastUsed: new Date('2026-09-05T04:00:12Z'),
    scopes: ['orders:read', 'customers:read'],
  },
  {
    id: 'k3',
    name: 'Partner sandbox — Northwind',
    prefix: 'ax_test',
    last4: '5f42',
    created: new Date('2026-01-19T11:47:00Z'),
    scopes: ['orders:read'],
  },
  {
    // A key just minted: `ApiKeys` shows the plaintext once and nags you to copy it.
    id: 'k4',
    name: 'Webhook replayer',
    prefix: 'ax_live',
    last4: '4a2b',
    created: new Date('2026-09-05T14:19:00Z'),
    scopes: ['webhooks:manage'],
    secret: 'ax_live_7d21c3e94a88b0192a6f80d44a2b',
  },
]

/* --------------------------------------------------------------- component */

const TITLES: Record<string, string> = {
  request: 'Request',
  webhooks: 'Webhook deliveries',
  realtime: 'Realtime',
  auth: 'Auth and quota',
}

const enabled = (rows: RequestRow[]) => rows.filter((row) => row.enabled !== false)

function ApiWorkbench() {
  const [section, setSection] = useState('request')

  const [endpointId, setEndpointId] = useState(ENDPOINTS[0].id)
  const [method, setMethod] = useState(ENDPOINTS[0].method)
  const [url, setUrl] = useState(ENDPOINTS[0].url)
  const [headers, setHeaders] = useState(ENDPOINTS[0].headers)
  const [params, setParams] = useState(ENDPOINTS[0].params)
  const [body, setBody] = useState(ENDPOINTS[0].body)

  const [sending, setSending] = useState(false)
  // The response pane shows the last endpoint that was actually sent, which is
  // not necessarily the one loaded in the builder — same as a real client.
  const [answered, setAnswered] = useState(ENDPOINTS[0])
  const [history, setHistory] = useState(INITIAL_HISTORY)

  const [formValue, setFormValue] = useState<SchemaFormValue>({ currency: 'EUR', capture: true })
  const [tokenId, setTokenId] = useState(TOKENS[0].id)
  const [replayed, setReplayed] = useState<string[]>([])
  // Revoking is a real removal here so the confirm flow in `ApiKeys` has
  // somewhere to land — a no-op handler would leave the row sitting there.
  const [keys, setKeys] = useState(API_KEYS)

  const endpoint = useMemo(
    () => ENDPOINTS.find((e) => e.id === endpointId) ?? ENDPOINTS[0],
    [endpointId],
  )
  const token = useMemo(() => TOKENS.find((t) => t.id === tokenId) ?? TOKENS[0], [tokenId])

  const load = (id: string) => {
    const next = ENDPOINTS.find((e) => e.id === id)
    if (!next) return
    setEndpointId(id)
    setMethod(next.method)
    setUrl(next.url)
    setHeaders(next.headers)
    setParams(next.params)
    setBody(next.body)
    // A body built from the previous route's schema has no meaning on this one.
    setFormValue({})
  }

  /**
   * Simulate the round trip instead of swapping the pane in the same frame.
   *
   * The pending state is the whole point of a Send button — without it the
   * response looks like it was always there, and the page reads as a poster.
   */
  const send = () => {
    setSending(true)
    setTimeout(() => {
      setAnswered(endpoint)
      setHistory((prev) => [
        {
          id: `c-${prev.length + 6}`,
          method: endpoint.method,
          path: endpoint.path,
          status: endpoint.response.status,
          durationMs: endpoint.response.durationMs,
          at: '14:20:11',
        },
        ...prev,
      ])
      setSending(false)
    }, 480)
  }

  const curlHeaders = useMemo(
    () => enabled(headers).map((row) => ({ name: row.name, value: row.value })),
    [headers],
  )
  const curlUrl = useMemo(() => {
    const query = enabled(params)
      .map((row) => `${encodeURIComponent(row.name)}=${encodeURIComponent(row.value)}`)
      .join('&')
    return query ? `${url}?${query}` : url
  }, [url, params])

  return (
    <AppFrame
      inset
      product="Workbench"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title={TITLES[section]}
      user={{ name: 'Grace Hopper', plan: 'org_northwind · live' }}
      actions={
        <div className="flex items-center gap-2">
          <Input
            variant="secondary"
            size="sm"
            icon={<Search />}
            placeholder="Search the OpenAPI document"
            clearable
            containerClassName="hidden w-64 lg:flex"
          />
          <Badge size="sm" color="blue">
            2026-07-01
          </Badge>
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          {/* Regenerated from the builder state, so it is always the request in
              front of you rather than a snippet from the docs. */}
          <CurlCommand
            method={method}
            url={curlUrl}
            headers={curlHeaders}
            body={body || undefined}
            title={`curl · ${endpoint.path}`}
          />
          <RateLimitMeter
            limit={1000}
            remaining={184}
            resetAt={new Date('2026-09-05T14:35:00Z')}
            windowSeconds={3600}
            now={NOW}
          />
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        {section === 'request' && (
          <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="space-y-4">
              <EndpointList
                endpoints={ENDPOINTS}
                selected={endpointId}
                onSelect={load}
                searchPlaceholder="Filter 8 routes"
              />

              <Card size="sm">
                <CardHeader size="sm">
                  <CardTitle as="h2">Recent calls</CardTitle>
                  <CardDescription>Pick one to load it back in.</CardDescription>
                </CardHeader>
                <CardBody size="sm" className="space-y-1">
                  {history.slice(0, 6).map((call) => {
                    const match = ENDPOINTS.find(
                      (e) => e.method === call.method && e.path === call.path,
                    )
                    return (
                      <button
                        key={call.id}
                        type="button"
                        disabled={!match}
                        onClick={() => match && load(match.id)}
                        className="hover:bg-accent/50 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition-colors duration-150 ease-out disabled:opacity-50 motion-reduce:transition-none"
                      >
                        <span className="text-muted-foreground w-12 shrink-0 font-mono text-[10px] uppercase">
                          {call.method}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">
                          {call.path}
                        </span>
                        <HttpStatus status={call.status} showPhrase={false} />
                        <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                          {call.durationMs}ms
                        </span>
                      </button>
                    )
                  })}
                </CardBody>
              </Card>
            </div>

            <div className="min-w-0 space-y-6">
              {endpoint.deprecated && (
                <Alert color="amber" title="This route is deprecated">
                  It answers with a <code className="font-mono">410</code> and a{' '}
                  <code className="font-mono">Sunset</code> header. The successor is on the response
                  headers tab.
                </Alert>
              )}

              <RequestBuilder
                method={method}
                onMethodChange={setMethod}
                url={url}
                onUrlChange={setUrl}
                headers={headers}
                onHeadersChange={setHeaders}
                params={params}
                onParamsChange={setParams}
                body={body}
                onBodyChange={setBody}
                onSend={send}
                sending={sending}
              />

              {endpoint.bodySchema && (
                <Card>
                  <CardHeader>
                    <CardTitle as="h2">Body from the schema</CardTitle>
                    <CardDescription>
                      Generated from <code className="font-mono">{endpoint.bodySchema.title}</code>{' '}
                      in the OpenAPI document — submitting writes it into the request body above.
                    </CardDescription>
                  </CardHeader>
                  <CardBody>
                    <SchemaForm
                      schema={endpoint.bodySchema}
                      value={formValue}
                      onChange={setFormValue}
                      onSubmit={(value) => setBody(JSON.stringify(value, null, 2))}
                      submitLabel="Write into the body"
                    />
                  </CardBody>
                </Card>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">Last response</span>
                <Badge size="sm" shape="rounded" className="font-mono">
                  {answered.method} {answered.path}
                </Badge>
                <HttpStatus status={answered.response.status} />
                <Separator orientation="vertical" className="hidden sm:block" />
                <span className="text-muted-foreground text-xs tabular-nums">
                  {answered.response.durationMs} ms · {answered.response.sizeBytes} B
                </span>
                {answered.id !== endpoint.id && (
                  <Badge size="sm" color="amber">
                    from another route
                  </Badge>
                )}
              </div>

              <ResponseViewer
                status={answered.response.status}
                statusText={answered.response.statusText}
                durationMs={answered.response.durationMs}
                sizeBytes={answered.response.sizeBytes}
                contentType={answered.response.contentType}
                headers={answered.response.headers}
                body={answered.response.body}
              />
            </div>
          </div>
        )}

        {section === 'webhooks' && (
          <>
            <Alert color="rose" title="One endpoint is rejecting our signature">
              <code className="font-mono">hooks.northwind.example</code> returned 401 on the fifth
              and final attempt of <code className="font-mono">evt_7d21c3e94a88</code>. Rotate the
              signing secret on their side before replaying.
            </Alert>

            <WebhookInspector
              deliveries={DELIVERIES}
              now={NOW}
              onReplay={(id) => setReplayed((prev) => (prev.includes(id) ? prev : [...prev, id]))}
            />

            {replayed.length > 0 && (
              <Card size="sm">
                <CardBody size="sm" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">Queued for replay:</span>
                  {replayed.map((id) => (
                    <Badge key={id} size="sm" color="blue" className="font-mono">
                      {id}
                    </Badge>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ms-auto"
                    onClick={() => setReplayed([])}
                  >
                    Clear
                  </Button>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {section === 'realtime' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <Card size="sm">
                <CardHeader size="sm">
                  <CardTitle as="h2">wss://stream.astralyx.dev/v1</CardTitle>
                  <CardDescription>
                    Closed by the server with 1013 after the consumer fell behind.
                  </CardDescription>
                </CardHeader>
              </Card>
              <WebSocketFrames frames={FRAMES} locale="en-GB" />
            </div>

            <div className="min-w-0 space-y-4">
              <Card size="sm">
                <CardHeader size="sm">
                  <CardTitle as="h2">catalogue-rpc.internal</CardTitle>
                  <CardDescription>
                    JSON-RPC 2.0 over the same socket. One request is still unanswered.
                  </CardDescription>
                </CardHeader>
              </Card>
              <RpcConsole messages={RPC_MESSAGES} label="catalogue-rpc traffic" />
            </div>
          </div>
        )}

        {section === 'auth' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <Select
                variant="secondary"
                size="sm"
                value={tokenId}
                onValueChange={setTokenId}
                className="w-full"
                triggerLabel="Token"
                options={TOKENS.map((t) => ({ value: t.id, label: t.label }))}
              />
              <JwtInspector token={token.value} now={NOW} />
            </div>

            <div className="min-w-0 space-y-4">
              <RateLimitMeter
                limit={1000}
                remaining={184}
                resetAt={new Date('2026-09-05T14:35:00Z')}
                windowSeconds={3600}
                now={NOW}
              />
              <ApiKeys
                keys={keys}
                now={NOW}
                onRevoke={(id) => setKeys((prev) => prev.filter((key) => key.id !== id))}
              />
            </div>
          </div>
        )}
      </div>
    </AppFrame>
  )
}

export const apiWorkbenchExample: ExampleEntry = {
  id: 'api-workbench',
  label: 'API Workbench',
  description:
    'Send a request and read what came back: picking a route fills the builder, the curl snippet and the response pane follow, a schema builds the body, and the webhook, socket and token panes cover everything the call left behind.',
  uses: [
    'Request Builder', 'Response Viewer', 'Endpoint List', 'curl Command', 'HTTP Status',
    'Webhook Inspector', 'RPC Console', 'WebSocket Frames', 'Schema Form', 'JWT Inspector',
    'API Keys', 'Rate Limit Meter',
  ],
  render: () => <ApiWorkbench />,
}
