import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CodeBlock } from '@/components/ui/code-block'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The `mcpServers` config, with the mistakes people actually make called out.
 *
 * Every MCP client is configured by hand-editing JSON, and the failure mode is
 * always the same: it parses, the client starts, and a server silently never
 * appears. The error is in the shape, not the syntax — so a plain JSON editor
 * with syntax highlighting catches none of it.
 *
 * The checks are the ones worth having, each earned from a real way this goes
 * wrong:
 *
 * - **`command` missing** on a stdio server, or `url` missing on a remote one.
 * - **A bare command** like `server-filesystem` with no runner — works in your
 *   shell because of `PATH`, fails under a client that spawns without one.
 * - **A secret pasted inline.** An API key in a config file gets committed.
 * - **No arguments on a filesystem-style server**, which usually means it is
 *   rooted at `/`.
 *
 * Findings are advisory and never block editing: a config can be mid-edit and
 * a component that refuses to render until it is valid is useless while typing.
 */
export type ConfigFinding = {
  server: string
  level: 'error' | 'warning'
  message: ReactNode
}

export type McpServerConfig = {
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  [key: string]: unknown
}

const SECRET_KEY = /(token|key|secret|password|credential)/i
const RUNNERS = new Set(['npx', 'node', 'bunx', 'uvx', 'uv', 'python', 'python3', 'docker', 'deno'])

/** The shape checks. Exported so a form can run them before saving. */
export function inspectMcpConfig(servers: Record<string, McpServerConfig>): ConfigFinding[] {
  const findings: ConfigFinding[] = []

  for (const [name, config] of Object.entries(servers)) {
    if (!config.command && !config.url) {
      findings.push({ server: name, level: 'error', message: 'Neither `command` nor `url` is set — this server can never start.' })
    }

    if (config.command && !RUNNERS.has(config.command) && !config.command.includes('/')) {
      findings.push({
        server: name,
        level: 'warning',
        message: `\`${config.command}\` is a bare command. It resolves from your shell’s PATH, which a client that spawns without one will not have.`,
      })
    }

    for (const [key, value] of Object.entries(config.env ?? {})) {
      if (SECRET_KEY.test(key) && value && !value.startsWith('${')) {
        findings.push({
          server: name,
          level: 'warning',
          message: `\`${key}\` looks like a secret pasted inline. Reference an environment variable instead.`,
        })
      }
    }

    if (config.command && (config.args ?? []).length === 0 && /file|fs/i.test(name)) {
      findings.push({
        server: name,
        level: 'warning',
        message: 'A filesystem server with no arguments is usually rooted at `/`.',
      })
    }
  }

  return findings
}

type McpConfigEditorProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  servers: Record<string, McpServerConfig>
  /** Editable when given. Receives the raw text; parse failures are surfaced. */
  onChange?: (text: string) => void
  /** Extra findings from your own validation, merged with the built-in ones. */
  findings?: ConfigFinding[]
  /** Turn off the built-in shape checks. */
  inspect?: boolean
  filePath?: string
  okLabel?: string
  label?: string
}

function McpConfigEditor({
  servers,
  onChange,
  findings: extra = [],
  inspect = true,
  filePath = 'mcp.json',
  okLabel = 'No problems found in the shape of this config.',
  label = 'Findings',
  className,
  ...props
}: McpConfigEditorProps) {
  const text = useMemo(() => JSON.stringify({ mcpServers: servers }, null, 2), [servers])
  const findings = useMemo(
    () => [...(inspect ? inspectMcpConfig(servers) : []), ...extra],
    [servers, inspect, extra],
  )

  const errors = findings.filter((finding) => finding.level === 'error').length

  return (
    <div data-slot="mcp-config-editor" className={cn('flex flex-col gap-3', className)} {...props}>
      <CodeBlock
        code={text}
        language="json"
        filePath={filePath}
        lineNumbers
        editable={Boolean(onChange)}
        onCodeChange={onChange}
      />

      <div className={cn(surface, radius.surface, 'overflow-hidden')}>
        <div className="border-border bg-muted/40 flex items-center justify-between gap-2 border-b px-4 py-2">
          <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
            {label}
          </p>
          {findings.length > 0 && (
            <Badge size="sm" color={errors > 0 ? 'destructive' : 'amber'}>
              {findings.length}
            </Badge>
          )}
        </div>

        {findings.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-3 text-xs text-[var(--green-soft-foreground)]">
            <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
            {okLabel}
          </p>
        ) : (
          <ul className="divide-border list-none divide-y">
            {findings.map((finding, index) => (
              <li key={index} className="flex items-start gap-2.5 px-4 py-2.5">
                <TriangleAlert
                  className={cn(
                    'mt-px size-3.5 shrink-0',
                    finding.level === 'error'
                      ? 'text-[var(--destructive-soft-foreground)]'
                      : 'text-[var(--amber-soft-foreground)]',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <code className="font-mono text-[11px] font-medium">{finding.server}</code>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {finding.message}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { McpConfigEditor }
export type { McpConfigEditorProps }
