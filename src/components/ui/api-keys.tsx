import { useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * API credentials, listed and revocable.
 *
 * A key is shown in full exactly once — when it is created. After that only the
 * prefix and last four characters are available, because a list that can reveal
 * every key on demand means anyone with a session has every secret. `secret` is
 * therefore optional and expected to be absent for existing keys.
 *
 * Revoking is confirmed inline rather than in a dialog. The confirmation needs
 * to sit beside the key it affects — a modal saying "revoke this key?" with the
 * list hidden behind it is how the wrong one gets revoked.
 */
export type ApiKey = {
  id: string
  name: string
  /** Shown as `sk_live_…abcd`. */
  prefix: string
  last4: string
  created: Date
  lastUsed?: Date
  scopes?: string[]
  /** Present only for a key just created. */
  secret?: string
}

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_REVOKE_ACTION_LABEL: (name: string) => string = (name) => `Revoke ${name}`

function ApiKeys({
  keys,
  onRevoke,
  now,
  emptyLabel = 'No API keys yet',
  freshLabel = 'Copy it now',
  revealLabel = 'Reveal key',
  hideLabel = 'Hide key',
  copyLabel = 'Copy key',
  revokeLabel = 'Revoke',
  revokeActionLabel = DEFAULT_REVOKE_ACTION_LABEL,
  createdLabel = 'Created',
  lastUsedLabel = 'Last used',
  neverUsedLabel = 'Never used',
  confirmNote = 'Revoking is immediate and cannot be undone.',
  cancelLabel = 'Cancel',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  keys: ApiKey[]
  onRevoke?: (id: string) => void
  now?: Date
  emptyLabel?: ReactNode
  /** Badge on a key whose secret is still visible. */
  freshLabel?: ReactNode
  revealLabel?: string
  hideLabel?: string
  copyLabel?: string
  revokeLabel?: ReactNode
  /** Accessible name for the revoke control, given the key's name. */
  revokeActionLabel?: (name: string) => string
  createdLabel?: ReactNode
  lastUsedLabel?: ReactNode
  neverUsedLabel?: ReactNode
  confirmNote?: ReactNode
  cancelLabel?: ReactNode
}) {
  const [revealed, setRevealed] = useState<string[]>([])
  const [confirming, setConfirming] = useState<string | null>(null)

  return (
    <div
      data-slot="api-keys"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {keys.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border)]">
          {keys.map((key) => {
            const open = revealed.includes(key.id)
            const display =
              key.secret && open
                ? key.secret
                : `${key.prefix}${'•'.repeat(8)}${key.last4}`

            return (
              <li key={key.id} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <KeyRound className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {key.name}
                  </span>
                  {key.secret && (
                    <Badge size="sm" color="amber">
                      {freshLabel}
                    </Badge>
                  )}
                  {key.scopes?.map((scope) => (
                    <Badge key={scope} size="sm">
                      {scope}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <code className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
                    {display}
                  </code>

                  {/* Only a freshly created key can be revealed at all. */}
                  {key.secret && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={open ? hideLabel : revealLabel}
                      aria-pressed={open}
                      onClick={() =>
                        setRevealed((current) =>
                          open ? current.filter((id) => id !== key.id) : [...current, key.id],
                        )
                      }
                    >
                      {open ? <EyeOff /> : <Eye />}
                    </Button>
                  )}

                  {key.secret && <CopyButton value={key.secret} label={copyLabel} />}

                  {onRevoke && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={revokeActionLabel(String(key.name))}
                      className="text-[var(--destructive-soft-foreground)]"
                      onClick={() => setConfirming(key.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>

                <p className="text-muted-foreground/70 flex flex-wrap gap-x-3 text-xs">
                  <span>
                    {createdLabel} <Fmt type="relative" value={key.created} now={now} />
                  </span>
                  <span>
                    {key.lastUsed ? (
                      <>
                        {lastUsedLabel} <Fmt type="relative" value={key.lastUsed} now={now} />
                      </>
                    ) : (
                      neverUsedLabel
                    )}
                  </span>
                </p>

                {confirming === key.id && (
                  <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border p-2 text-xs">
                    <span className="text-muted-foreground min-w-0 flex-1">
                      {confirmNote}
                    </span>
                    <Button
                      size="xs"
                      color="destructive"
                      onClick={() => {
                        onRevoke?.(key.id)
                        setConfirming(null)
                      }}
                    >
                      {revokeLabel}
                    </Button>
                    <Button size="xs" variant="secondary" onClick={() => setConfirming(null)}>
                      {cancelLabel}
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { ApiKeys }
