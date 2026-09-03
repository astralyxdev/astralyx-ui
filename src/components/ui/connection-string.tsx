import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A connection string, parsed into the parts that matter for its driver.
 *
 * Which parts those are is not universal, and pretending otherwise is what
 * makes most of these components useless outside Postgres. A file-backed
 * database has a path and no host, user or port; a cluster URL has several
 * hosts and no single one; an ODBC string is not a URL at all. So the shape is
 * driven by a per-driver profile, and `drivers` lets you add or replace any of
 * them without touching the component.
 *
 * Two formats are parsed: URL-style (`postgres://…`, `sqlite:///…`) and the
 * semicolon key-value style SQL Server and ODBC use. A string that parses as
 * neither is reported rather than half-rendered from a regex that matched the
 * wrong separator.
 *
 * The secret is masked by default. This is the screen people paste into
 * tickets, and a DSN carries a live password in the middle of it.
 */
export type DsnField = 'user' | 'host' | 'port' | 'database' | 'path' | 'protocol'

export type DriverProfile = {
  /** Display name for the driver. */
  label: string
  /** Which parts to show, in order. */
  fields: DsnField[]
  /** Per-driver overrides for the field headings. */
  labels?: Partial<Record<DsnField, string>>
  /** The path is a file on disk, not a network address. */
  fileBased?: boolean
  /** Shown when the port is absent, so the effective value is visible. */
  defaultPort?: number
  /** Parameters worth flagging, mapped to why. */
  warn?: Record<string, string>
}

const NETWORK: DsnField[] = ['protocol', 'user', 'host', 'port', 'database']
const FILE: DsnField[] = ['protocol', 'path']

/**
 * Built-in profiles. Every one of these is overridable through `drivers`, and
 * an unknown scheme falls back to the network shape rather than refusing to
 * render — a driver nobody here anticipated is still probably a URL.
 */
const DRIVERS: Record<string, DriverProfile> = {
  postgres: {
    label: 'PostgreSQL', fields: NETWORK, defaultPort: 5432,
    warn: { sslmode: 'disable' },
  },
  postgresql: {
    label: 'PostgreSQL', fields: NETWORK, defaultPort: 5432,
    warn: { sslmode: 'disable' },
  },
  cockroachdb: { label: 'CockroachDB', fields: NETWORK, defaultPort: 26257, warn: { sslmode: 'disable' } },
  mysql: { label: 'MySQL', fields: NETWORK, defaultPort: 3306, warn: { tls: 'false' } },
  mariadb: { label: 'MariaDB', fields: NETWORK, defaultPort: 3306 },
  mongodb: { label: 'MongoDB', fields: NETWORK, defaultPort: 27017, warn: { tls: 'false', ssl: 'false' } },
  'mongodb+srv': { label: 'MongoDB (SRV)', fields: ['protocol', 'user', 'host', 'database'] },
  redis: { label: 'Redis', fields: NETWORK, defaultPort: 6379 },
  rediss: { label: 'Redis (TLS)', fields: NETWORK, defaultPort: 6379 },
  clickhouse: { label: 'ClickHouse', fields: NETWORK, defaultPort: 8123 },
  mssql: { label: 'SQL Server', fields: NETWORK, defaultPort: 1433, warn: { encrypt: 'false' } },
  sqlserver: { label: 'SQL Server', fields: NETWORK, defaultPort: 1433, warn: { encrypt: 'false' } },
  amqp: { label: 'AMQP', fields: NETWORK, defaultPort: 5672 },
  // File-backed: no host, no user, no port. A path and nothing else.
  sqlite: { label: 'SQLite', fields: FILE, fileBased: true, labels: { path: 'File' } },
  sqlite3: { label: 'SQLite', fields: FILE, fileBased: true, labels: { path: 'File' } },
  file: { label: 'SQLite', fields: FILE, fileBased: true, labels: { path: 'File' } },
  duckdb: { label: 'DuckDB', fields: FILE, fileBased: true, labels: { path: 'File' } },
  libsql: { label: 'libSQL', fields: NETWORK },
}

const FALLBACK: DriverProfile = { label: 'Database', fields: NETWORK }

const FIELD_LABELS: Record<DsnField, string> = {
  protocol: 'Driver',
  user: 'User',
  host: 'Host',
  port: 'Port',
  database: 'Database',
  path: 'Path',
}

type Parsed = {
  scheme: string
  user: string
  password: string
  host: string
  port: string
  database: string
  path: string
  params: [string, string][]
  memory: boolean
}

/** `Server=x;Database=y;Password=z` — SQL Server and ODBC. */
function parseKeyValue(dsn: string): Parsed | null {
  if (!/^[A-Za-z ]+\s*=/.test(dsn.trim()) || !dsn.includes(';')) return null
  const entries = dsn
    .split(';')
    .map((pair) => pair.split('='))
    .filter((pair) => pair.length >= 2)
    .map(([key, ...rest]) => [key.trim().toLowerCase(), rest.join('=').trim()] as const)
  if (entries.length === 0) return null

  const get = (...keys: string[]) =>
    entries.find(([k]) => keys.includes(k))?.[1] ?? ''

  const server = get('server', 'data source', 'addr', 'host')
  const [host, port = ''] = server.split(/[,:]/)
  const known = new Set(['server', 'data source', 'addr', 'host', 'database', 'initial catalog', 'user id', 'uid', 'user', 'password', 'pwd'])

  return {
    scheme: 'sqlserver',
    user: get('user id', 'uid', 'user'),
    password: get('password', 'pwd'),
    host: host ?? '',
    port,
    database: get('database', 'initial catalog'),
    path: '',
    params: entries.filter(([k]) => !known.has(k)).map(([k, v]) => [k, v]),
    memory: false,
  }
}

function parseUrl(dsn: string): Parsed | null {
  try {
    const url = new URL(dsn)
    const scheme = url.protocol.replace(':', '').toLowerCase()
    // The text after the scheme, not `pathname`. `URL` normalises a relative
    // file path — `file:./data.db` becomes `/data.db` — which turns a path
    // relative to the working directory into an absolute one, and that is the
    // single most consequential detail in a file-backed DSN.
    const body = dsn.slice(dsn.indexOf(':') + 1).replace(/^\/\//, '').split('?')[0]
    const memory = /^:?memory:?$/.test(body)

    return {
      scheme,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ''),
      path: memory ? ':memory:' : body,
      params: [...url.searchParams.entries()],
      memory,
    }
  } catch {
    return null
  }
}

function ConnectionString({
  value,
  drivers,
  revealed: revealedProp,
  mask = '••••••••',
  invalidNote = 'That does not parse as a connection string. Expected a URL, or semicolon-separated key=value pairs.',
  unencodedNote = 'The password contains a character that must be percent-encoded. As written, the host will parse wrong.',
  relativePathNote = 'A relative path resolves against the working directory of whatever starts the process — not the config file.',
  memoryNote = 'An in-memory database is discarded when the process exits, and is not shared between connections.',
  revealLabel = 'Reveal password',
  hideLabel = 'Hide password',
  copyLabel = 'Copy connection string',
  fieldLabels,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  value: string
  /** Adds to or replaces the built-in driver profiles, keyed by scheme. */
  drivers?: Record<string, DriverProfile>
  revealed?: boolean
  mask?: string
  invalidNote?: ReactNode
  unencodedNote?: ReactNode
  /** Shown for a file-backed database given a relative path. */
  relativePathNote?: ReactNode
  memoryNote?: ReactNode
  revealLabel?: string
  hideLabel?: string
  copyLabel?: string
  /** Overrides the field headings for every driver. */
  fieldLabels?: Partial<Record<DsnField, string>>
}) {
  const [own, setOwn] = useState(false)
  const revealed = revealedProp ?? own

  const parsed = useMemo(() => parseUrl(value) ?? parseKeyValue(value), [value])

  const profile = useMemo(() => {
    if (!parsed) return FALLBACK
    return drivers?.[parsed.scheme] ?? DRIVERS[parsed.scheme] ?? FALLBACK
  }, [parsed, drivers])

  const display = useMemo(() => {
    if (!parsed || revealed || !parsed.password) return value
    return value
      .replace(encodeURIComponent(parsed.password), mask)
      .replace(parsed.password, mask)
  }, [value, parsed, revealed, mask])

  if (!parsed) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="flex items-start gap-1.5 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {invalidNote}
        </p>
      </div>
    )
  }

  const shown: Record<DsnField, string> = {
    protocol: parsed.scheme,
    user: parsed.user,
    host: parsed.host,
    port: parsed.port || (profile.defaultPort ? `${profile.defaultPort}` : ''),
    database: parsed.database,
    path: parsed.path,
  }

  const flagged = profile.warn
    ? parsed.params.filter(([key, val]) => profile.warn?.[key] === val)
    : []
  // A raw @ or / in the password silently reassigns the host.
  const unencoded =
    /[@/?#]/.test(parsed.password) && !value.includes(encodeURIComponent(parsed.password))
  const relative =
    profile.fileBased && !parsed.memory && Boolean(parsed.path) && !parsed.path.startsWith('/')

  return (
    <div
      data-slot="connection-string"
      data-driver={parsed.scheme}
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-4', className)}
      {...props}
    >
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 font-mono text-xs break-all">{display}</code>
        {revealedProp === undefined && parsed.password && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={revealed ? hideLabel : revealLabel}
            aria-pressed={revealed}
            className="shrink-0"
            onClick={() => setOwn((v) => !v)}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        )}
        <CopyButton value={value} label={copyLabel} className="shrink-0" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge size="sm">{profile.label}</Badge>
        {parsed.memory && (
          <Badge size="sm" color="amber">
            in-memory
          </Badge>
        )}
      </div>

      {/* Only the fields this driver actually has. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        {profile.fields.map((field) => (
          <div key={field} className={field === 'path' ? 'col-span-2 sm:col-span-3' : undefined}>
            <dt className="text-muted-foreground">
              {fieldLabels?.[field] ?? profile.labels?.[field] ?? FIELD_LABELS[field]}
            </dt>
            <dd className="mt-0.5 truncate font-mono font-medium">
              {shown[field] || <span className="text-muted-foreground/50">—</span>}
              {field === 'port' && !parsed.port && profile.defaultPort && (
                <span className="text-muted-foreground/60 ms-1 font-normal">default</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {parsed.params.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {parsed.params.map(([key, val]) => (
            <Badge
              key={key}
              size="sm"
              color={profile.warn?.[key] === val ? 'destructive' : 'neutral'}
              className="font-mono"
            >
              {key}={val}
            </Badge>
          ))}
        </div>
      )}

      {flagged.map(([key, val]) => (
        <p key={key} className="text-xs text-[var(--destructive-soft-foreground)]">
          <code className="font-mono">
            {key}={val}
          </code>{' '}
          — credentials and results travel in the clear.
        </p>
      ))}

      {unencoded && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">{unencodedNote}</p>
      )}
      {relative && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">{relativePathNote}</p>
      )}
      {parsed.memory && (
        <p className="text-[var(--amber-soft-foreground)] text-xs">{memoryNote}</p>
      )}
    </div>
  )
}

export { ConnectionString, DRIVERS as connectionDrivers, parseUrl as parseDsn }
