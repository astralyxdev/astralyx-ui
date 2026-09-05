import { useMemo, useState } from 'react'
import {
  Blocks, Database, FileUp, GitCommitVertical, HardDrive, Play, Search,
  Table2, Terminal, Zap,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { ConnectionPool } from '@/components/ui/connection-pool'
import { ConnectionString } from '@/components/ui/connection-string'
import { CsvPreview, type CsvColumn } from '@/components/ui/csv-preview'
import { DataGrid, type DataGridColumn } from '@/components/ui/data-grid'
import { DataQuality, type ColumnProfile } from '@/components/ui/data-quality'
import { IndexList, type DatabaseIndex } from '@/components/ui/index-list'
import { Input } from '@/components/ui/input'
import { MigrationList, type Migration } from '@/components/ui/migration-list'
import { QueryConstructor } from '@/components/ui/query-constructor'
import { QueryEditor } from '@/components/ui/query-editor'
import { QueryPlan, type PlanNode } from '@/components/ui/query-plan'
import { ReplicationStatus } from '@/components/ui/replication-status'
import { SchemaTable, type SchemaColumn, type SchemaIndex } from '@/components/ui/schema-table'
import { SchemaViewer, type JsonSchema } from '@/components/ui/schema-viewer'
import { Select } from '@/components/ui/select'
import { SlowQueryLog, type SlowQuery } from '@/components/ui/slow-query-log'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppFrame, AppFrameUser, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * The clock this page is read against.
 *
 * A fixed instant rather than `new Date()`: the examples are prerendered on the
 * server and hydrated in the browser, and a relative timestamp computed twice
 * against two different "now"s renders two different strings — a hydration
 * mismatch on every visit after the first minute.
 */
const NOW = new Date('2026-09-05T14:20:00Z')

const NAV: NavItem[] = [
  { id: 'query', label: 'Query', icon: <Terminal /> },
  { id: 'builder', label: 'Builder', icon: <Blocks /> },
  { id: 'schema', label: 'Schema', icon: <Table2 />, badge: <Badge size="sm">3</Badge> },
  { id: 'import', label: 'Import', icon: <FileUp /> },
  {
    id: 'migrations',
    label: 'Migrations',
    icon: <GitCommitVertical />,
    badge: <Badge size="sm" color="amber">2</Badge>,
  },
  { id: 'health', label: 'Health', icon: <Zap /> },
]

/* ------------------------------------------------------------------ schema */

/**
 * One record per table, holding every view of it the page needs.
 *
 * Kept together rather than split into a columns map, an index map and a
 * profile map: picking a table has to swap all three at once, and three
 * lookups keyed by the same string is three chances for them to drift apart.
 */
type StudioTable = {
  name: string
  rowCount: number
  columns: SchemaColumn[]
  indexes: SchemaIndex[]
  /** What the planner sees — size on disk and how often it was actually used. */
  storedIndexes: DatabaseIndex[]
  profile: ColumnProfile[]
}

const TABLES: StudioTable[] = [
  {
    name: 'public.orders',
    rowCount: 4_812_204,
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'customer_id', type: 'uuid', references: 'customers.id' },
      { name: 'status', type: 'text', default: "'pending'", comment: 'pending → paid → fulfilled → refunded' },
      { name: 'total_cents', type: 'bigint' },
      { name: 'currency', type: 'char(3)', default: "'EUR'" },
      { name: 'placed_at', type: 'timestamptz', default: 'now()' },
      { name: 'shipped_at', type: 'timestamptz', nullable: true },
      { name: 'metadata', type: 'jsonb', nullable: true, comment: 'Checkout attribution, see the JSON tab' },
    ],
    indexes: [
      { name: 'orders_pkey', columns: ['id'], unique: true, method: 'btree' },
      { name: 'orders_customer_id_idx', columns: ['customer_id'], method: 'btree' },
      { name: 'orders_placed_at_idx', columns: ['placed_at'], method: 'btree' },
      { name: 'orders_status_placed_at_idx', columns: ['status', 'placed_at'], method: 'btree' },
      { name: 'orders_metadata_gin', columns: ['metadata'], method: 'gin' },
    ],
    storedIndexes: [
      { name: 'orders_pkey', columns: ['id'], primary: true, unique: true, size: 148_897_792, scans: 18_402_113 },
      { name: 'orders_customer_id_idx', columns: ['customer_id'], size: 112_459_776, scans: 2_214_908 },
      { name: 'orders_placed_at_idx', columns: ['placed_at'], size: 96_468_992, scans: 88_412 },
      // Same column set as the one above — pg_stat_user_indexes will show one
      // of them idle while both are still paid for on every write.
      { name: 'orders_placed_at_brin', columns: ['placed_at'], size: 262_144, scans: 0, meta: 'brin' },
      { name: 'orders_status_placed_at_idx', columns: ['status', 'placed_at'], size: 134_217_728, scans: 0 },
      { name: 'orders_metadata_gin', columns: ['metadata'], size: 402_653_184, scans: 41_209, meta: 'gin' },
    ],
    profile: [
      { name: 'id', type: 'uuid', nullFraction: 0, distinct: 4_812_204, total: 4_812_204 },
      { name: 'customer_id', type: 'uuid', nullFraction: 0.0002, distinct: 918_442, total: 4_812_204 },
      { name: 'status', type: 'text', nullFraction: 0, distinct: 4, total: 4_812_204, samples: ['paid', 'fulfilled', 'pending', 'refunded'] },
      { name: 'total_cents', type: 'bigint', nullFraction: 0, distinct: 214_882, total: 4_812_204, min: '0', max: '1,284,900' },
      { name: 'currency', type: 'char(3)', nullFraction: 0, distinct: 1, total: 4_812_204, samples: ['EUR'] },
      { name: 'shipped_at', type: 'timestamptz', nullFraction: 0.41, distinct: 2_804_119, total: 4_812_204, min: '2023-02-01', max: '2026-09-05' },
      { name: 'metadata', type: 'jsonb', nullFraction: 0.72, distinct: 1_204_882, total: 4_812_204 },
    ],
  },
  {
    name: 'public.customers',
    rowCount: 918_442,
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'email', type: 'citext' },
      { name: 'full_name', type: 'text', nullable: true },
      { name: 'country', type: 'char(2)' },
      { name: 'lifetime_value_cents', type: 'bigint', default: '0' },
      { name: 'marketing_opt_in', type: 'boolean', default: 'false' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
    ],
    indexes: [
      { name: 'customers_pkey', columns: ['id'], unique: true, method: 'btree' },
      { name: 'customers_email_key', columns: ['email'], unique: true, method: 'btree' },
      { name: 'customers_country_idx', columns: ['country'], method: 'btree' },
    ],
    storedIndexes: [
      { name: 'customers_pkey', columns: ['id'], primary: true, unique: true, size: 29_360_128, scans: 9_882_401 },
      { name: 'customers_email_key', columns: ['email'], unique: true, size: 46_137_344, scans: 4_120_884 },
      { name: 'customers_country_idx', columns: ['country'], size: 12_582_912, scans: 1_204 },
    ],
    profile: [
      { name: 'id', type: 'uuid', nullFraction: 0, distinct: 918_442, total: 918_442 },
      { name: 'email', type: 'citext', nullFraction: 0, distinct: 918_442, total: 918_442 },
      { name: 'full_name', type: 'text', nullFraction: 0.08, distinct: 812_009, total: 918_442 },
      { name: 'country', type: 'char(2)', nullFraction: 0, distinct: 41, total: 918_442, samples: ['DE', 'FR', 'NL', 'GB', 'ES'] },
      { name: 'marketing_opt_in', type: 'boolean', nullFraction: 0, distinct: 2, total: 918_442 },
      { name: 'deleted_at', type: 'timestamptz', nullFraction: 0.98, distinct: 18_402, total: 918_442 },
    ],
  },
  {
    name: 'public.order_items',
    rowCount: 14_209_881,
    columns: [
      { name: 'id', type: 'bigserial', primaryKey: true },
      { name: 'order_id', type: 'uuid', references: 'orders.id' },
      { name: 'sku', type: 'text' },
      { name: 'quantity', type: 'integer', default: '1' },
      { name: 'unit_price_cents', type: 'bigint' },
      { name: 'discount_cents', type: 'bigint', default: '0' },
    ],
    indexes: [
      { name: 'order_items_pkey', columns: ['id'], unique: true, method: 'btree' },
      { name: 'order_items_order_id_idx', columns: ['order_id'], method: 'btree' },
      { name: 'order_items_sku_idx', columns: ['sku'], method: 'btree' },
    ],
    storedIndexes: [
      { name: 'order_items_pkey', columns: ['id'], primary: true, unique: true, size: 318_767_104, scans: 22_104_882 },
      { name: 'order_items_order_id_idx', columns: ['order_id'], size: 402_653_184, scans: 31_884_002 },
      { name: 'order_items_sku_idx', columns: ['sku'], size: 289_406_976, scans: 412_009 },
    ],
    profile: [
      { name: 'id', type: 'bigserial', nullFraction: 0, distinct: 14_209_881, total: 14_209_881 },
      { name: 'order_id', type: 'uuid', nullFraction: 0, distinct: 4_812_204, total: 14_209_881 },
      { name: 'sku', type: 'text', nullFraction: 0, distinct: 8_412, total: 14_209_881, samples: ['AX-KEEB-65', 'AX-CBL-USBC-2M', 'AX-MAT-DESK-L'] },
      { name: 'quantity', type: 'integer', nullFraction: 0, distinct: 12, total: 14_209_881, min: '1', max: '48' },
      { name: 'discount_cents', type: 'bigint', nullFraction: 0.94, distinct: 88, total: 14_209_881, min: '0', max: '40,000' },
    ],
  },
]

/**
 * The shape of `orders.metadata`.
 *
 * A `jsonb` column has no schema the database can tell you about, so the one
 * the application enforces is documented beside it — otherwise the only way to
 * learn the keys is to `SELECT` a row and hope it is representative.
 */
const METADATA_SCHEMA: JsonSchema = {
  type: 'object',
  title: 'orders.metadata',
  description: 'Written by the checkout service on insert. Never updated.',
  required: ['source', 'session_id'],
  properties: {
    source: { type: 'string', enum: ['web', 'ios', 'android', 'partner_api'] },
    session_id: { type: 'string', format: 'uuid' },
    utm: {
      type: 'object',
      properties: {
        campaign: { type: 'string', maxLength: 64 },
        medium: { type: 'string', enum: ['cpc', 'email', 'organic', 'referral'] },
        term: { type: 'string', deprecated: true },
      },
    },
    cart: {
      type: 'object',
      required: ['line_count'],
      properties: {
        line_count: { type: 'integer', minimum: 1, maximum: 200 },
        promo_codes: { type: 'array', items: { type: 'string', pattern: '^[A-Z0-9-]{4,16}$' } },
        gift_wrap: { type: 'boolean', default: false },
      },
    },
    risk_score: { type: 'number', minimum: 0, maximum: 1 },
  },
}

/* ----------------------------------------------------------------- queries */

type ResultRow = Record<string, string | number>

type SavedQuery = {
  id: string
  label: string
  sql: string
  durationMs: number
  columns: DataGridColumn<ResultRow>[]
  rows: ResultRow[]
  /** The column whose value is unique — the grid's row key. */
  keyColumn: string
  plan: PlanNode
  notice?: string
}

const money = (cents: number) =>
  `€${(cents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const count = (value: number) => value.toLocaleString('en-GB')

const QUERIES: SavedQuery[] = [
  {
    id: 'revenue-by-country',
    label: 'Revenue by country, last 30 days',
    durationMs: 842,
    keyColumn: 'country',
    sql: `select c.country,
       count(*) as orders,
       sum(o.total_cents) as gross_cents,
       round(avg(o.total_cents)) as avg_cents
from orders o
join customers c on c.id = o.customer_id
where o.placed_at >= now() - interval '30 days'
  and o.status in ('paid', 'fulfilled')
group by c.country
order by gross_cents desc
limit 8;`,
    columns: [
      { key: 'country', header: 'country', width: '20%' },
      { key: 'orders', header: 'orders', align: 'end', sortValue: (row) => Number(row.orders) },
      { key: 'gross_cents', header: 'gross_cents', align: 'end', sortValue: (row) => Number(row.gross_cents), render: (row) => money(Number(row.gross_cents)) },
      { key: 'avg_cents', header: 'avg_cents', align: 'end', hideOnMobile: true, sortValue: (row) => Number(row.avg_cents), render: (row) => money(Number(row.avg_cents)) },
    ],
    rows: [
      { country: 'DE', orders: 41_882, gross_cents: 284_119_400, avg_cents: 6_784 },
      { country: 'FR', orders: 28_104, gross_cents: 191_882_200, avg_cents: 6_827 },
      { country: 'NL', orders: 19_442, gross_cents: 141_204_800, avg_cents: 7_262 },
      { country: 'GB', orders: 17_009, gross_cents: 128_880_100, avg_cents: 7_577 },
      { country: 'ES', orders: 12_884, gross_cents: 78_412_600, avg_cents: 6_086 },
      { country: 'IT', orders: 11_204, gross_cents: 68_119_900, avg_cents: 6_080 },
      { country: 'PL', orders: 8_412, gross_cents: 41_882_000, avg_cents: 4_979 },
      { country: 'SE', orders: 6_118, gross_cents: 40_204_100, avg_cents: 6_571 },
    ],
    notice: 'Planner chose a sequential scan on orders — placed_at is indexed, but the 30-day window matches 12% of the table.',
    plan: {
      id: 'limit',
      operation: 'Limit',
      estimatedRows: 8,
      actualRows: 8,
      cost: 41_882.4,
      actualMs: 842.1,
      children: [
        {
          id: 'sort',
          operation: 'Sort',
          relation: 'gross_cents DESC',
          estimatedRows: 41,
          actualRows: 41,
          cost: 41_880.2,
          actualMs: 841.8,
          children: [
            {
              id: 'agg',
              operation: 'HashAggregate',
              relation: 'c.country',
              estimatedRows: 41,
              actualRows: 41,
              cost: 41_204.9,
              actualMs: 838.4,
              children: [
                {
                  id: 'join',
                  operation: 'Hash Join',
                  relation: 'c.id = o.customer_id',
                  estimatedRows: 120_000,
                  actualRows: 588_412,
                  cost: 38_140.2,
                  actualMs: 712.6,
                  children: [
                    {
                      id: 'scan-orders',
                      operation: 'Seq Scan',
                      relation: 'orders o',
                      estimatedRows: 128_000,
                      actualRows: 588_412,
                      cost: 24_119.0,
                      actualMs: 401.2,
                    },
                    {
                      id: 'hash',
                      operation: 'Hash',
                      estimatedRows: 918_442,
                      actualRows: 918_442,
                      cost: 9_882.4,
                      actualMs: 208.9,
                      children: [
                        {
                          id: 'scan-customers',
                          operation: 'Index Only Scan',
                          relation: 'customers_pkey',
                          estimatedRows: 918_442,
                          actualRows: 918_442,
                          cost: 8_140.1,
                          actualMs: 184.2,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'stuck-orders',
    label: 'Paid but never shipped',
    durationMs: 61,
    keyColumn: 'id',
    sql: `select o.id,
       c.email,
       o.total_cents,
       o.placed_at
from orders o
join customers c on c.id = o.customer_id
where o.status = 'paid'
  and o.shipped_at is null
  and o.placed_at < now() - interval '72 hours'
order by o.placed_at asc
limit 6;`,
    columns: [
      { key: 'id', header: 'id', width: '32%', render: (row) => <span className="font-mono text-xs">{String(row.id)}</span> },
      { key: 'email', header: 'email', hideOnMobile: true },
      { key: 'total_cents', header: 'total_cents', align: 'end', sortValue: (row) => Number(row.total_cents), render: (row) => money(Number(row.total_cents)) },
      { key: 'placed_at', header: 'placed_at', align: 'end' },
    ],
    rows: [
      { id: '9f2a4c1e-8b03-4d77-9a12-0c5e7f81b204', email: 'j.kowalski@fastmail.com', total_cents: 24_900, placed_at: '2026-08-29 09:14' },
      { id: 'a1c8d0f4-2e19-4b5a-8f60-7d21c3e94a88', email: 'marie.dubois@laposte.net', total_cents: 118_400, placed_at: '2026-08-30 11:02' },
      { id: 'c73b19ad-5f42-4e88-b019-2a6f80d4c115', email: 'tom.devries@ziggo.nl', total_cents: 8_990, placed_at: '2026-08-31 16:47' },
      { id: 'd04e7b21-9a66-4c03-8e5f-11b2094ca7de', email: 'l.schmidt@web.de', total_cents: 64_500, placed_at: '2026-09-01 07:22' },
      { id: 'e58f3c90-1d74-4a2b-93c6-88e0417fb5a3', email: 'ana.ferreira@sapo.pt', total_cents: 31_200, placed_at: '2026-09-01 19:38' },
      { id: 'f2910b8c-6e35-40d9-a71b-53c4d8f0192e', email: 'oliver.grant@icloud.com', total_cents: 209_800, placed_at: '2026-09-02 05:10' },
    ],
    plan: {
      id: 'limit',
      operation: 'Limit',
      estimatedRows: 6,
      actualRows: 6,
      cost: 1_204.2,
      actualMs: 61.4,
      children: [
        {
          id: 'nested',
          operation: 'Nested Loop',
          relation: 'c.id = o.customer_id',
          estimatedRows: 220,
          actualRows: 188,
          cost: 1_198.6,
          actualMs: 60.8,
          children: [
            {
              id: 'idx-orders',
              operation: 'Index Scan',
              relation: 'orders_status_placed_at_idx',
              estimatedRows: 240,
              actualRows: 188,
              cost: 402.1,
              actualMs: 18.2,
            },
            {
              id: 'idx-customers',
              operation: 'Index Scan',
              relation: 'customers_pkey',
              estimatedRows: 1,
              actualRows: 1,
              cost: 3.4,
              actualMs: 0.2,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'top-skus',
    label: 'Top SKUs by units shipped',
    durationMs: 2_418,
    keyColumn: 'sku',
    sql: `select i.sku,
       sum(i.quantity) as units,
       count(distinct i.order_id) as orders,
       sum(i.quantity * i.unit_price_cents) as revenue_cents
from order_items i
join orders o on o.id = i.order_id
where o.shipped_at is not null
group by i.sku
order by units desc
limit 6;`,
    columns: [
      { key: 'sku', header: 'sku', width: '34%', render: (row) => <span className="font-mono text-xs">{String(row.sku)}</span> },
      { key: 'units', header: 'units', align: 'end', sortValue: (row) => Number(row.units), render: (row) => count(Number(row.units)) },
      { key: 'orders', header: 'orders', align: 'end', hideOnMobile: true, sortValue: (row) => Number(row.orders), render: (row) => count(Number(row.orders)) },
      { key: 'revenue_cents', header: 'revenue_cents', align: 'end', sortValue: (row) => Number(row.revenue_cents), render: (row) => money(Number(row.revenue_cents)) },
    ],
    rows: [
      { sku: 'AX-CBL-USBC-2M', units: 412_884, orders: 288_119, revenue_cents: 61_932_600 },
      { sku: 'AX-KEEB-65', units: 188_402, orders: 181_204, revenue_cents: 2_826_030_000 },
      { sku: 'AX-MAT-DESK-L', units: 141_009, orders: 128_884, revenue_cents: 493_531_500 },
      { sku: 'AX-HUB-7P', units: 98_412, orders: 91_002, revenue_cents: 786_296_000 },
      { sku: 'AX-STAND-ALU', units: 74_118, orders: 71_440, revenue_cents: 518_826_000 },
      { sku: 'AX-CASE-TRAVEL', units: 41_882, orders: 40_119, revenue_cents: 167_528_000 },
    ],
    notice: 'Two and a half seconds and the aggregate is recomputed every call — this is the query behind the merchandising dashboard.',
    plan: {
      id: 'limit',
      operation: 'Limit',
      estimatedRows: 6,
      actualRows: 6,
      cost: 284_119.8,
      actualMs: 2_418.4,
      children: [
        {
          id: 'sort',
          operation: 'Sort',
          relation: 'units DESC',
          estimatedRows: 8_412,
          actualRows: 8_412,
          cost: 284_100.2,
          actualMs: 2_412.9,
          children: [
            {
              id: 'agg',
              operation: 'GroupAggregate',
              relation: 'i.sku',
              estimatedRows: 8_412,
              actualRows: 8_412,
              cost: 281_402.6,
              actualMs: 2_388.1,
              children: [
                {
                  id: 'merge',
                  operation: 'Merge Join',
                  relation: 'o.id = i.order_id',
                  estimatedRows: 620_000,
                  actualRows: 8_402_119,
                  cost: 241_880.4,
                  actualMs: 1_984.6,
                  children: [
                    {
                      id: 'scan-items',
                      operation: 'Seq Scan',
                      relation: 'order_items i',
                      estimatedRows: 14_209_881,
                      actualRows: 14_209_881,
                      cost: 141_204.0,
                      actualMs: 902.4,
                    },
                    {
                      id: 'scan-orders',
                      operation: 'Seq Scan',
                      relation: 'orders o',
                      estimatedRows: 2_840_000,
                      actualRows: 2_838_419,
                      cost: 88_412.2,
                      actualMs: 684.1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
]

/* ---------------------------------------------------------------- health */

const SLOW_QUERIES: SlowQuery[] = [
  {
    id: 'sq-1',
    statement: 'select i.sku, sum(i.quantity) from order_items i join orders o on o.id = i.order_id where o.shipped_at is not null group by i.sku',
    calls: 8_412,
    meanMs: 2_418,
    p95Ms: 4_902,
    rows: 8_412,
    seqScan: true,
    meta: 'merchandising-dashboard',
  },
  {
    id: 'sq-2',
    statement: "select * from orders where metadata @> $1 order by placed_at desc limit 50",
    calls: 41_209,
    meanMs: 612,
    p95Ms: 1_840,
    rows: 50,
    meta: 'admin-search',
  },
  {
    id: 'sq-3',
    statement: 'update customers set lifetime_value_cents = $1 where id = $2',
    calls: 1_204_882,
    meanMs: 4.2,
    p95Ms: 18,
    rows: 1,
    meta: 'ltv-worker',
  },
  {
    id: 'sq-4',
    statement: "select count(*) from orders where status = 'pending' and placed_at < now() - interval '72 hours'",
    calls: 288_119,
    meanMs: 88,
    p95Ms: 402,
    rows: 1,
    seqScan: true,
    meta: 'fulfilment-alerting',
  },
  {
    id: 'sq-5',
    statement: 'insert into order_items (order_id, sku, quantity, unit_price_cents) values ($1, $2, $3, $4)',
    calls: 2_804_119,
    meanMs: 1.8,
    p95Ms: 9,
    rows: 1,
    meta: 'checkout',
  },
]

/**
 * Two connections, one deliberately wrong.
 *
 * The replica DSN pools through PgBouncer with `sslmode=disable`, which
 * `ConnectionString` flags — the point of putting a switcher above it is that
 * you can see the difference between the two, not just be told about one.
 */
const CONNECTIONS = [
  {
    id: 'primary',
    label: 'orders-eu-primary (rw)',
    dsn: 'postgres://studio_app:t9Kq-2fXm@orders-eu-primary.db.internal:5432/orders?sslmode=require&application_name=studio',
  },
  {
    id: 'replica',
    label: 'orders-eu-replica-1 (ro)',
    dsn: 'postgres://studio_ro:r4Vb-7pLn@pgbouncer.db.internal:6432/orders?sslmode=disable&application_name=studio-ro',
  },
]

const REPLICAS = [
  { id: 'r1', name: 'orders-eu-replica-1', region: 'eu-central-1', lagSeconds: 0.4, lagBytes: 1_048_576, state: 'streaming' as const, readable: true },
  { id: 'r2', name: 'orders-eu-replica-2', region: 'eu-west-1', lagSeconds: 2.1, lagBytes: 8_912_896, state: 'streaming' as const, readable: true },
  { id: 'r3', name: 'orders-us-analytics', region: 'us-east-1', lagSeconds: 184, lagBytes: 742_391_808, state: 'catchup' as const, readable: false, meta: 'restarted 12 min ago' },
]

/* ------------------------------------------------------------- migrations */

const MIGRATIONS: Migration[] = [
  { version: '20260901120400', name: 'add_orders_status_placed_at_idx', state: 'applied', appliedAt: new Date('2026-09-01T12:06:11Z'), duration: 184_209 },
  { version: '20260828094100', name: 'backfill_customers_country', state: 'applied', appliedAt: new Date('2026-09-02T08:12:04Z'), duration: 902_411, irreversible: true },
  { version: '20260903171200', name: 'drop_orders_legacy_ref_column', state: 'failed', appliedAt: new Date('2026-09-03T17:12:48Z'), duration: 412, error: 'ERROR: column "legacy_ref" is referenced by view orders_export_v1' },
  { version: '20260904083000', name: 'add_order_items_discount_cents', state: 'pending' },
  { version: '20260905101500', name: 'create_orders_metadata_gin', state: 'pending', irreversible: true },
  { version: '20260820140200', name: 'add_customers_deleted_at', state: 'rolled-back', appliedAt: new Date('2026-08-20T14:04:22Z'), duration: 1_204 },
]

/** The up/down SQL behind each version, keyed the same way the list is. */
const MIGRATION_SQL: Record<string, string> = {
  '20260901120400': `-- up
create index concurrently orders_status_placed_at_idx
  on public.orders (status, placed_at desc);

-- down
drop index concurrently if exists orders_status_placed_at_idx;`,
  '20260828094100': `-- up
update public.customers c
   set country = a.country_code
  from public.addresses a
 where a.customer_id = c.id
   and c.country is null;

alter table public.customers
  alter column country set not null;

-- down
-- none: the original nulls are not recoverable.`,
  '20260903171200': `-- up
alter table public.orders drop column legacy_ref;

-- down
alter table public.orders add column legacy_ref text;`,
  '20260904083000': `-- up
alter table public.order_items
  add column discount_cents bigint not null default 0;

-- down
alter table public.order_items drop column discount_cents;`,
  '20260905101500': `-- up
create index concurrently orders_metadata_gin
  on public.orders using gin (metadata jsonb_path_ops);

-- down
drop index concurrently if exists orders_metadata_gin;`,
  '20260820140200': `-- up
alter table public.customers add column deleted_at timestamptz;

-- down
alter table public.customers drop column deleted_at;`,
}

/* ----------------------------------------------------------------- import */

type StagedFile = {
  id: string
  label: string
  columns: CsvColumn[]
  rows: string[][]
  totalRows: number
  malformed: number[]
  target: string
}

const STAGED_FILES: StagedFile[] = [
  {
    id: 'skus-2026-09',
    label: 'sku-catalogue-2026-09.csv',
    target: 'public.order_items',
    totalRows: 8_412,
    malformed: [3],
    columns: [
      { name: 'sku', type: 'string', confidence: 1, nulls: 0 },
      { name: 'title', type: 'string', confidence: 1, nulls: 0 },
      { name: 'unit_price_cents', type: 'integer', confidence: 0.98, nulls: 0 },
      { name: 'weight_grams', type: 'mixed', confidence: 0.61, nulls: 214 },
      { name: 'discontinued_on', type: 'date', confidence: 0.88, nulls: 7_902 },
    ],
    rows: [
      ['AX-KEEB-65', 'Astralyx 65% keyboard', '14990', '812', ''],
      ['AX-CBL-USBC-2M', 'USB-C cable, 2 m', '1500', '96', ''],
      ['AX-MAT-DESK-L', 'Desk mat, large', '3500', '440', ''],
      // Short by one field, and the weight is a string where the rest of the
      // column is grams — the row `malformed` points at.
      ['AX-HUB-7P', 'Seven-port hub', '7990', '1.2kg'],
      ['AX-STAND-ALU', 'Aluminium laptop stand', '6990', '', '2026-06-30'],
      ['AX-CASE-TRAVEL', 'Travel case', '3990', '380', ''],
    ],
  },
  {
    id: 'refunds-q3',
    label: 'refunds-q3-reconciliation.csv',
    target: 'public.orders',
    totalRows: 1_204,
    malformed: [],
    columns: [
      { name: 'order_id', type: 'string', confidence: 1, nulls: 0 },
      { name: 'refunded_cents', type: 'integer', confidence: 1, nulls: 0 },
      { name: 'reason_code', type: 'string', confidence: 0.94, nulls: 18 },
      { name: 'processed_at', type: 'date', confidence: 1, nulls: 0 },
    ],
    rows: [
      ['9f2a4c1e-8b03-4d77-9a12-0c5e7f81b204', '24900', 'damaged_in_transit', '2026-08-14'],
      ['a1c8d0f4-2e19-4b5a-8f60-7d21c3e94a88', '118400', 'customer_changed_mind', '2026-08-15'],
      ['c73b19ad-5f42-4e88-b019-2a6f80d4c115', '8990', 'wrong_item', '2026-08-18'],
      ['d04e7b21-9a66-4c03-8e5f-11b2094ca7de', '64500', '', '2026-08-21'],
      ['e58f3c90-1d74-4a2b-93c6-88e0417fb5a3', '31200', 'late_delivery', '2026-08-24'],
    ],
  },
]

/* -------------------------------------------------------------- component */

const TITLES: Record<string, string> = {
  query: 'Query console',
  builder: 'Query builder',
  schema: 'Schema',
  import: 'Staged imports',
  migrations: 'Migrations',
  health: 'Health',
}

function DatabaseStudio() {
  const [section, setSection] = useState('query')
  const [connection, setConnection] = useState(CONNECTIONS[0].id)

  // The editor is the source of truth for the text; `queryId` remembers which
  // saved query that text came from, so running it can produce that query's
  // result set rather than pretending to parse arbitrary SQL.
  const [queryId, setQueryId] = useState(QUERIES[0].id)
  const [sql, setSql] = useState(QUERIES[0].sql)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(QUERIES[0])
  const [resultTab, setResultTab] = useState('rows')

  const [tableName, setTableName] = useState(TABLES[0].name)
  const [fileId, setFileId] = useState(STAGED_FILES[0].id)
  const [migrationVersion, setMigrationVersion] = useState('20260904083000')
  const [builderSql, setBuilderSql] = useState('')

  const active = useMemo(() => QUERIES.find((q) => q.id === queryId) ?? QUERIES[0], [queryId])
  const table = useMemo(() => TABLES.find((t) => t.name === tableName) ?? TABLES[0], [tableName])
  const file = useMemo(() => STAGED_FILES.find((f) => f.id === fileId) ?? STAGED_FILES[0], [fileId])
  const dsn = useMemo(
    () => CONNECTIONS.find((c) => c.id === connection)?.dsn ?? CONNECTIONS[0].dsn,
    [connection],
  )

  const loadQuery = (id: string) => {
    const next = QUERIES.find((q) => q.id === id)
    if (!next) return
    setQueryId(id)
    setSql(next.sql)
  }

  /**
   * Fake the round trip rather than swapping the grid instantly.
   *
   * A console where the result appears in the same frame as the click reads as
   * a static page; the short pending state is what makes the Run button feel
   * like it did something.
   */
  const run = () => {
    setRunning(true)
    setTimeout(() => {
      setResult(active)
      setResultTab('rows')
      setRunning(false)
    }, 420)
  }

  return (
    <AppFrame
      product="Studio"
      nav={NAV}
      active={section}
      onNavigate={setSection}
      title={TITLES[section]}
      footer={<AppFrameUser name="Ada Lovelace" plan="orders · eu-central-1" />}
      actions={
        <div className="flex items-center gap-2">
          <Input
            variant="secondary"
            size="sm"
            icon={<Search />}
            placeholder="Search tables and columns"
            clearable
            containerClassName="hidden w-64 lg:flex"
          />
          <Select
            variant="secondary"
            size="sm"
            value={connection}
            onValueChange={setConnection}
            icon={<Database />}
            className="hidden w-56 sm:block"
            triggerLabel="Connection"
            options={CONNECTIONS.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>
      }
      aside={
        <div className="space-y-4 p-4">
          <ConnectionString value={dsn} />
          <ConnectionPool active={34} idle={4} max={40} waiting={6} waitMs={412} />
          <ReplicationStatus
            primary={{ name: 'orders-eu-primary', region: 'eu-central-1', writes: '1,240 tx/s' }}
            replicas={REPLICAS}
          />
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        {section === 'query' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                variant="secondary"
                size="sm"
                value={queryId}
                onValueChange={loadQuery}
                className="w-full sm:w-80"
                triggerLabel="Saved query"
                options={QUERIES.map((q) => ({ value: q.id, label: q.label }))}
              />
              {sql !== active.sql && (
                <Badge size="sm" color="amber">
                  edited
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ms-auto"
                disabled={sql === active.sql}
                onClick={() => setSql(active.sql)}
              >
                Revert
              </Button>
            </div>

            <QueryEditor
              value={sql}
              onValueChange={setSql}
              onRun={run}
              running={running}
              dialect="PostgreSQL 16"
              rows={10}
            />

            {result.notice && (
              <Alert color="amber" title="This one is worth a second look">
                {result.notice}
              </Alert>
            )}

            <Card>
              <CardHeader
                action={
                  <Button size="sm" variant="secondary" disabled={running} onClick={run}>
                    <Play /> Run again
                  </Button>
                }
              >
                <CardTitle as="h2">{result.label}</CardTitle>
                <CardDescription>
                  {count(result.rows.length)} rows in {result.durationMs} ms
                </CardDescription>
              </CardHeader>

              <Tabs value={resultTab} onValueChange={setResultTab} className="gap-0">
                <div className="border-border border-b px-4.5 py-2">
                  <TabsList variant="underline">
                    <TabsTrigger value="rows" variant="underline">Rows</TabsTrigger>
                    <TabsTrigger value="plan" variant="underline">Plan</TabsTrigger>
                    <TabsTrigger value="sql" variant="underline">Statement</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="rows" className="p-4">
                  <DataGrid
                    columns={result.columns}
                    rows={result.rows}
                    rowKey={(row) => String(row[result.keyColumn])}
                  />
                </TabsContent>

                <TabsContent value="plan" className="p-4">
                  <QueryPlan plan={result.plan} />
                </TabsContent>

                <TabsContent value="sql" className="p-4">
                  <CodeBlock code={result.sql} language="sql" lineNumbers title="statement" />
                </TabsContent>
              </Tabs>
            </Card>
          </>
        )}

        {section === 'builder' && (
          <>
            <Alert title="Built against the live schema">
              Every picker is limited to the tables and columns above — values compile to bound
              parameters, so nothing typed here can reach the statement as SQL.
            </Alert>

            <QueryConstructor
              tables={TABLES.map((t) => ({
                // The builder qualifies as `table.column`, so the schema-qualified
                // name would come out as `public.orders.status`.
                name: t.name.replace('public.', ''),
                columns: t.columns,
              }))}
              defaultDialect="postgres"
              functions={[
                { name: 'count', returns: 'number' },
                { name: 'sum', families: ['number'], returns: 'number' },
                { name: 'avg', families: ['number'], returns: 'number' },
                { name: 'date_trunc', families: ['date'], returns: 'date', dialects: ['postgres'] },
                { name: 'lower', families: ['string'], returns: 'string' },
              ]}
              defaultLimit={100}
              onCompile={(compiled) => setBuilderSql(compiled)}
            />

            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!builderSql}
                onClick={() => {
                  setSql(builderSql)
                  setSection('query')
                }}
              >
                Open in the console
              </Button>
            </div>
          </>
        )}

        {section === 'schema' && (
          <>
            <Select
              variant="secondary"
              size="sm"
              value={tableName}
              onValueChange={setTableName}
              className="w-full sm:w-80"
              triggerLabel="Table"
              options={TABLES.map((t) => ({ value: t.name, label: t.name }))}
            />

            <SchemaTable
              name={table.name}
              columns={table.columns}
              indexes={table.indexes}
              rowCount={table.rowCount}
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <IndexList indexes={table.storedIndexes} label={`Indexes on ${table.name}`} />
              <DataQuality columns={table.profile} label={`Profile of ${table.name}`} />
            </div>

            {table.name === 'public.orders' && (
              <Card>
                <CardHeader>
                  <CardTitle as="h2">orders.metadata</CardTitle>
                  <CardDescription>
                    Postgres cannot describe a jsonb column, so the contract the checkout service
                    writes is documented here.
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  <SchemaViewer schema={METADATA_SCHEMA} name="metadata" />
                </CardBody>
              </Card>
            )}
          </>
        )}

        {section === 'import' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                variant="secondary"
                size="sm"
                value={fileId}
                onValueChange={setFileId}
                className="w-full sm:w-80"
                triggerLabel="Staged file"
                options={STAGED_FILES.map((f) => ({ value: f.id, label: f.label }))}
              />
              <Badge size="sm" color="blue" icon={<HardDrive />}>
                {file.target}
              </Badge>
            </div>

            <CsvPreview
              columns={file.columns}
              rows={file.rows}
              totalRows={file.totalRows}
              malformed={file.malformed}
            />

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary">Download rejects</Button>
              <Button size="sm" disabled={file.malformed.length > 0}>
                Import {count(file.totalRows)} rows
              </Button>
            </div>
          </>
        )}

        {section === 'migrations' && (
          <>
            <MigrationList migrations={MIGRATIONS} now={NOW} />

            <Card>
              <CardHeader
                action={
                  <Select
                                    variant="secondary"
                                    size="sm"
                                    value={migrationVersion}
                                    onValueChange={setMigrationVersion}
                                    className="w-64"
                                    triggerLabel="Migration"
                                    options={MIGRATIONS.map((m) => ({
                                      value: m.version,
                                      label: `${m.version} · ${String(m.name)}`,
                                    }))}
                                  />
                }
              >
<CardTitle as="h2">Migration source</CardTitle>
                                <CardDescription>Both directions, as checked in.</CardDescription>
              </CardHeader>
              <CardBody>
                <CodeBlock
                  code={MIGRATION_SQL[migrationVersion] ?? '-- no source on disk'}
                  language="sql"
                  lineNumbers
                  title={`${migrationVersion}.sql`}
                />
              </CardBody>
            </Card>
          </>
        )}

        {section === 'health' && (
          <>
            <SlowQueryLog queries={SLOW_QUERIES} label="Slowest statements, last hour" />

            {/* The aside carries these on wide screens; repeated here because the
                health page is where you go looking for them, and the aside is
                hidden below the xl breakpoint. */}
            <div className="grid gap-4 xl:hidden">
              <ConnectionPool active={34} idle={4} max={40} waiting={6} waitMs={412} />
              <ReplicationStatus
                primary={{ name: 'orders-eu-primary', region: 'eu-central-1', writes: '1,240 tx/s' }}
                replicas={REPLICAS}
              />
            </div>
          </>
        )}
      </div>
    </AppFrame>
  )
}

export const databaseStudioExample: ExampleEntry = {
  id: 'database-studio',
  label: 'Database Studio',
  description:
    'A SQL client end to end: run a saved query and the grid, the plan and the statement all follow; build one from the schema and send it to the console; read the indexes, the migrations and the replica lag.',
  uses: [
    'Query Editor', 'Query Constructor', 'Query Plan', 'Schema Table', 'Schema Viewer',
    'Index List', 'Slow Query Log', 'Migration List', 'Connection String', 'Connection Pool',
    'Replication Status', 'CSV Preview', 'Data Quality', 'Data Grid',
  ],
  render: () => <DatabaseStudio />,
}
