import type { ComponentProps, ReactNode } from 'react'
import { Ban, FolderTree, Globe, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The permissions an agent actually runs under.
 *
 * Filesystem, network and process execution, each with an explicit mode and the
 * paths or hosts it applies to. This is the screen someone is asked to approve
 * before an agent is let near a real machine, so it is built to make the
 * dangerous configuration look dangerous.
 *
 * **A wide-open scope is called out, not rendered as an ordinary row.** An
 * allow-list of `/` or `*` is functionally "no sandbox", and a UI that shows it
 * in the same grey mono as `/tmp` is technically accurate and practically
 * useless. `unrestricted` flags those rows.
 *
 * **Deny wins, and says so.** Every real sandbox evaluates deny before allow;
 * showing the two lists side by side without that ordering invites someone to
 * assume an allow entry re-opens something a deny closed.
 */
export type SandboxMode = 'none' | 'allowlist' | 'full'

export type SandboxScope = {
  id: string
  kind: 'filesystem' | 'network' | 'exec'
  mode: SandboxMode
  /** Paths, hosts or binaries permitted. Ignored when mode is not allowlist. */
  allow?: string[]
  /** Always refused, whatever `allow` says. */
  deny?: string[]
  label?: ReactNode
  description?: ReactNode
  /** Toggle the whole scope. Omit for a read-only policy. */
  enabled?: boolean
}

const KIND = {
  filesystem: { label: 'Filesystem', icon: FolderTree },
  network: { label: 'Network', icon: Globe },
  exec: { label: 'Process execution', icon: Terminal },
} as const

const MODE: Record<SandboxMode, { label: string; color: 'green' | 'amber' | 'destructive' }> = {
  none: { label: 'Blocked', color: 'green' },
  allowlist: { label: 'Allow-list', color: 'amber' },
  full: { label: 'Unrestricted', color: 'destructive' },
}

/** `/`, `*`, `**` and bare `~` are "everything" wearing an allow-list costume. */
const WIDE_OPEN = new Set(['/', '*', '**', '~', '0.0.0.0/0', '*.*'])

type SandboxPolicyProps = Omit<ComponentProps<'div'>, 'children'> & {
  scopes: SandboxScope[]
  onToggle?: (id: string, enabled: boolean) => void
  modeLabels?: Partial<Record<SandboxMode, string>>
  denyLabel?: string
  allowLabel?: string
  unrestrictedLabel?: string
  emptyLabel?: string
  label?: string
}

function SandboxPolicy({
  scopes,
  onToggle,
  modeLabels,
  denyLabel = 'Always denied',
  allowLabel = 'Permitted',
  unrestrictedLabel = 'This grants access to everything.',
  emptyLabel = 'No sandbox configured — the agent runs with the host’s own permissions.',
  label = 'Sandbox policy',
  className,
  ...props
}: SandboxPolicyProps) {
  if (scopes.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'border-destructive p-4', className)} {...props}>
        <p className="flex items-start gap-2 text-xs text-[var(--destructive-soft-foreground)]">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {emptyLabel}
        </p>
      </div>
    )
  }

  return (
    <ul
      data-slot="sandbox-policy"
      aria-label={label}
      className={cn(surface, radius.surface, 'divide-border list-none divide-y overflow-hidden', className)}
      {...(props as ComponentProps<'ul'>)}
    >
      {scopes.map((scope) => {
        const kind = KIND[scope.kind]
        const Icon = kind.icon
        const mode = MODE[scope.mode]
        const wideOpen =
          scope.mode === 'full' || (scope.allow ?? []).some((entry) => WIDE_OPEN.has(entry.trim()))

        return (
          <li key={scope.id} className="flex flex-col gap-3 px-4 py-3.5">
            <div className="flex items-start gap-3">
              <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{scope.label ?? kind.label}</p>
                  <Badge size="sm" color={mode.color}>
                    {modeLabels?.[scope.mode] ?? mode.label}
                  </Badge>
                </div>
                {scope.description && (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {scope.description}
                  </p>
                )}
              </div>

              {scope.enabled !== undefined && onToggle && (
                <Switch
                  size="sm"
                  className="mt-0.5 shrink-0"
                  checked={scope.enabled}
                  aria-label={`Enable ${scope.label ?? kind.label}`}
                  onChange={(event) => onToggle(scope.id, event.target.checked)}
                />
              )}
            </div>

            {wideOpen && (
              <p className="flex items-start gap-2 text-xs text-[var(--destructive-soft-foreground)]">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {unrestrictedLabel}
              </p>
            )}

            {/* Deny first, because that is the order a sandbox evaluates in. */}
            {scope.deny && scope.deny.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground/70 flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                  <Ban className="size-3" aria-hidden="true" />
                  {denyLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {scope.deny.map((entry) => (
                    <code
                      key={entry}
                      className={cn(
                        'bg-[var(--destructive-soft)] px-2 py-0.5 font-mono text-[11px] text-[var(--destructive-soft-foreground)]',
                        radius.xs,
                      )}
                    >
                      {entry}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {scope.mode === 'allowlist' && scope.allow && scope.allow.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground/70 flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
                  <ShieldCheck className="size-3" aria-hidden="true" />
                  {allowLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {scope.allow.map((entry) => (
                    <code
                      key={entry}
                      className={cn(
                        'bg-secondary text-secondary-foreground px-2 py-0.5 font-mono text-[11px]',
                        radius.xs,
                      )}
                    >
                      {entry}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export { SandboxPolicy }
export type { SandboxPolicyProps }
