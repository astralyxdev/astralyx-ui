import { ConnectionString } from '@/components/ui/connection-string'
import { MigrationList, type Migration } from '@/components/ui/migration-list'
import { QueryEditor } from '@/components/ui/query-editor'
import { QueryPlan, type PlanNode } from '@/components/ui/query-plan'
import { SchemaTable, type SchemaColumn, type SchemaIndex } from '@/components/ui/schema-table'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

/* -------------------------------------------------------------- query editor */

export const queryEditorEntry: ComponentEntry = {
  id: 'query-editor',
  label: 'Query Editor',
  description:
    'A SQL editor that asks before running an UPDATE or DELETE with no WHERE clause. That is the most expensive mistake anyone makes in a query console, and it is trivial to detect.',
  usage: `import { QueryEditor } from '@/components/ui/query-editor'

<QueryEditor value={sql} onValueChange={setSql} onRun={run} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'sample', label: 'query', options: ['safe', 'no WHERE', 'schema change', 'multi'], default: 'safe' },
      { type: 'text', prop: 'dialect', label: 'dialect', default: 'PostgreSQL' },
      { type: 'number', prop: 'rows', label: 'min rows', default: 6, min: 3, max: 14, step: 1 },
      { type: 'boolean', prop: 'lineNumbers', label: 'line numbers', default: true },
      { type: 'boolean', prop: 'running', label: 'running', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <QueryEditor
          dialect={String(state.dialect)}
          rows={Number(state.rows)}
          lineNumbers={Boolean(state.lineNumbers)}
          running={Boolean(state.running)}
          onRun={() => {}}
          value={
            state.sample === 'no WHERE'
              ? 'update users set role = \'admin\';'
              : state.sample === 'schema change'
                ? 'drop table legacy_sessions;'
                : state.sample === 'multi'
                  ? "select count(*) from users;\nselect count(*) from accounts;"
                  : "select id, email, role\nfrom users\nwhere created_at > now() - interval '7 days'\nlimit 25;"
          }
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<QueryEditor\n  value={sql}\n  onValueChange={setSql}\n  onRun={run}\n  dialect="${state.dialect}"\n/>`,
  },
  api: [
    { name: 'highlighting', type: 'CodeBlock, editable', description: 'The editor is a `CodeBlock` in editable mode, so SQL is highlighted as it is typed. A console where every statement is one grey block is a console people paste out of.' },
    { name: 'guard', type: 'automatic', description: 'UPDATE or DELETE without a WHERE, and DROP/TRUNCATE/ALTER, require a second click before `onRun` fires.' },
    { name: 'shortcutKeys', type: 'string | null', default: "'⌘+↵'", description: 'Rendered with `Kbd`, split on `+`. Cmd/Ctrl+Enter runs — anyone who has used a query console expects it, and reaching for a button breaks the loop. `null` hides the hint.' },
    { name: 'statement count', type: 'shown above one', description: 'Running a multi-statement buffer does something different from running one, and that should not be a surprise.' },
    { name: 'onRun', type: '(sql: string) => void', description: 'Omit to render a read-write editor with no execution.' },
  ],
}

/* ---------------------------------------------------------------- query plan */

const PLAN: PlanNode = {
  id: 'n1', operation: 'Hash Join', cost: 4820, actualMs: 412, estimatedRows: 1200, actualRows: 98_400,
  children: [
    {
      id: 'n2', operation: 'Seq Scan', relation: 'orders', cost: 3910, actualMs: 380,
      estimatedRows: 1000, actualRows: 2_100_000,
    },
    {
      id: 'n3', operation: 'Hash', cost: 640, actualMs: 22, estimatedRows: 4200, actualRows: 4180,
      children: [
        { id: 'n4', operation: 'Index Scan using users_pkey', relation: 'users', cost: 610, actualMs: 20, estimatedRows: 4200, actualRows: 4180 },
      ],
    },
  ],
}

export const queryPlanEntry: ComponentEntry = {
  id: 'query-plan',
  label: 'Query Plan',
  description:
    'An EXPLAIN tree with cost bars drawn from self cost, not total. Every root holds 100% of total by definition, so a total-cost bar makes the root look like the problem in every query ever profiled.',
  usage: `import { QueryPlan } from '@/components/ui/query-plan'

<QueryPlan plan={plan} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'factor', label: 'misestimate ×', default: 10, min: 2, max: 100, step: 1 },
      { type: 'number', prop: 'seqRows', label: 'seq scan rows', default: 100_000, min: 1000, max: 5_000_000, step: 50_000 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <QueryPlan
          plan={PLAN}
          misestimateFactor={Number(state.factor)}
          seqScanRows={Number(state.seqRows)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<QueryPlan plan={plan} misestimateFactor={${state.factor}} />`,
  },
  api: [
    { name: 'plan', type: 'PlanNode', description: '`{ id, operation, relation?, estimatedRows?, actualRows?, cost?, actualMs?, children? }`.' },
    { name: 'misestimateFactor', type: 'number', default: '10', description: 'Ratio past which estimate-vs-actual is flagged. That mismatch is the most useful number in a plan — it means stale statistics, and it is why the planner chose a nested loop.' },
    { name: 'seqScanRows', type: 'number', description: 'Row count above which a sequential scan is marked. A seq scan on a small table is optimal; over two million rows it is usually a missing index.' },
    { name: 'bars', type: 'self cost', description: 'Total minus children — the node that is actually spending the time.' },
  ],
}

/* -------------------------------------------------------------- schema table */

const COLUMNS: SchemaColumn[] = [
  { name: 'id', type: 'uuid', nullable: false, primaryKey: true, default: 'gen_random_uuid()' },
  { name: 'email', type: 'citext', nullable: false, comment: 'Case-insensitive by column type, not by index.' },
  { name: 'account_id', type: 'uuid', nullable: false, references: 'accounts.id' },
  { name: 'owner_id', type: 'uuid', nullable: true, references: 'users.id' },
  { name: 'role', type: 'text', nullable: false, default: "'member'" },
  { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
  { name: 'deleted_at', type: 'timestamptz', nullable: true },
]

const INDEXES: SchemaIndex[] = [
  { name: 'users_pkey', columns: ['id'], unique: true, method: 'btree' },
  { name: 'users_email_key', columns: ['email'], unique: true, method: 'btree' },
  { name: 'users_account_created_idx', columns: ['account_id', 'created_at'], method: 'btree' },
]

export const schemaTableEntry: ComponentEntry = {
  id: 'schema-table',
  label: 'Schema Table',
  description:
    'Columns, keys and indexes. Foreign keys name their target inline, because `owner_id` tells you nothing about whether it points at users or accounts — which is exactly what you opened the schema to find out.',
  usage: `import { SchemaTable } from '@/components/ui/schema-table'

<SchemaTable name="users" columns={columns} indexes={indexes} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'name', label: 'table', default: 'public.users' },
      { type: 'boolean', prop: 'indexes', label: 'indexes', default: true },
      { type: 'number', prop: 'rows', label: 'row count', default: 128_400, min: 0, step: 1000 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <SchemaTable
          name={String(state.name)}
          columns={COLUMNS}
          indexes={state.indexes ? INDEXES : []}
          rowCount={Number(state.rows)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<SchemaTable name="${state.name}" columns={columns} indexes={indexes} />`,
  },
  api: [
    { name: 'columns', type: 'SchemaColumn[]', description: '`{ name, type, nullable?, primaryKey?, references?, default?, comment? }`.' },
    { name: 'nullable', type: 'stated, not implied', description: '"not null" is printed. A blank in a nullable column reads as missing information, when the constraint is the fact.' },
    { name: 'indexes', type: 'SchemaIndex[]', description: 'Columns in order. An index on `(a, b)` cannot serve a query filtering only on `b`, and a set-like display hides that.' },
    { name: 'references', type: 'string', description: 'e.g. `users.id`. Rendered inline against the column.' },
  ],
}

/* ------------------------------------------------------------ migration list */

const MIGRATIONS: Migration[] = [
  { version: '20260714093000', name: 'create users', state: 'applied', appliedAt: days(-50), duration: 84 },
  { version: '20260801121500', name: 'add accounts', state: 'applied', appliedAt: days(-32), duration: 122 },
  { version: '20260815090000', name: 'backfill account_id', state: 'applied', appliedAt: days(-18), duration: 41_200, irreversible: true },
  { version: '20260810140000', name: 'add sessions index', state: 'applied', appliedAt: days(-12), duration: 610 },
  { version: '20260828101500', name: 'drop legacy_sessions', state: 'failed', appliedAt: days(-4), error: 'ERROR: cannot drop table legacy_sessions because other objects depend on it' },
  { version: '20260901080000', name: 'add role default', state: 'pending' },
  { version: '20260902093000', name: 'add deleted_at', state: 'pending' },
]

export const migrationListEntry: ComponentEntry = {
  id: 'migration-list',
  label: 'Migration List',
  description:
    'Applied and pending migrations, sorted by version. A migration applied after a later version is flagged — that is the signature of two branches merged without a rebase, and it means this schema matches no single branch.',
  usage: `import { MigrationList } from '@/components/ui/migration-list'

<MigrationList migrations={migrations} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'pendingOnly', label: 'pending only', default: false }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <MigrationList
          migrations={state.pendingOnly ? MIGRATIONS.filter((m) => m.state === 'pending') : MIGRATIONS}
          now={NOW}
        />
      </div>
    ),
    code: () => `<MigrationList migrations={migrations} />`,
  },
  api: [
    { name: 'migrations', type: 'Migration[]', description: '`{ version, name, state, appliedAt?, duration?, irreversible?, error? }`.' },
    { name: 'ordering', type: 'by version', description: 'Never by array order. Migrations are timestamp-named precisely so they sort deterministically, and trusting the supplied order shows a rebase artefact as the real sequence.' },
    { name: 'out of order', type: 'detected', description: 'Applied after a higher version — a merge without a rebase.' },
    { name: 'irreversible', type: 'boolean', description: 'Knowing there is no down-path before you run something is the difference between a rollback and a restore from backup.' },
  ],
}

/* --------------------------------------------------------- connection string */

const SAMPLES: Record<string, string> = {
  postgres: 'postgres://app:s3cr3t-pw@db.internal:5432/production?sslmode=require&pool_max=20',
  'sqlite file': 'sqlite:///var/lib/astralyx/app.db',
  'sqlite memory': 'sqlite::memory:',
  mysql: 'mysql://root:hunter2@127.0.0.1:3306/shop?charset=utf8mb4',
  'mongodb+srv': 'mongodb+srv://api:pw@cluster0.mongodb.net/events?retryWrites=true',
  redis: 'rediss://default:token@cache.internal:6379/0',
  'sql server (odbc)': 'Server=db.internal,1433;Database=production;User Id=app;Password=s3cr3t;Encrypt=false',
  duckdb: 'duckdb://./analytics.duckdb',
  'sslmode=disable': 'postgres://app:s3cr3t-pw@db.internal:5432/production?sslmode=disable',
  'unencoded password': 'postgres://app:p@ssw0rd@db.internal:5432/production',
  invalid: 'not a connection string',
}

export const connectionStringEntry: ComponentEntry = {
  id: 'connection-string',
  label: 'Connection String',
  description:
    'A DSN parsed into the parts that matter for its driver. A file-backed database has a path and no host, user or port — pretending every database is Postgres is what makes most of these components useless outside it.',
  usage: `import { ConnectionString } from '@/components/ui/connection-string'

<ConnectionString value={dsn} />`,
  composer: {
    tall: true,
    controls: [
      {
        type: 'select',
        prop: 'sample',
        label: 'connection',
        options: [
          'postgres',
          'sqlite file',
          'sqlite memory',
          'mysql',
          'mongodb+srv',
          'redis',
          'sql server (odbc)',
          'duckdb',
          'sslmode=disable',
          'unencoded password',
          'invalid',
        ],
        default: 'postgres',
      },
      { type: 'boolean', prop: 'revealed', label: 'revealed', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <ConnectionString
          revealed={state.revealed ? true : undefined}
          value={SAMPLES[String(state.sample)] ?? SAMPLES.postgres}
        />
      </div>
    ),
    code: () => `<ConnectionString value={dsn} />`,
  },
  api: [
    { name: 'value', type: 'string', description: 'URL-style (`postgres://…`, `sqlite:///…`) or the semicolon key=value style SQL Server and ODBC use. A string that parses as neither is reported, not half-rendered.' },
    { name: 'drivers', type: 'Record<string, DriverProfile>', description: 'Adds to or replaces the built-in profiles by scheme. A profile declares which fields exist, their labels, whether the path is a file, the default port, and which parameters to flag.' },
    { name: 'file-backed drivers', type: 'sqlite, duckdb, file', description: 'Show a path and nothing else. A relative path is flagged, because it resolves against the working directory of whatever starts the process rather than the config file.' },
    { name: 'masking', type: 'default on', description: 'A DSN carries a live password mid-string, and this is the screen people paste into tickets.' },
    { name: 'warnings', type: 'per driver', description: '`sslmode=disable` on Postgres, `encrypt=false` on SQL Server, `tls=false` on MongoDB — plus an unencoded password containing `@` `/` `?` or `#`, which silently reassigns the host.' },
  ],
}
