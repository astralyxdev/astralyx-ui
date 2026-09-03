import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Environment variables, with secrets masked until asked for.
 *
 * Reveal is per-row and never sticky — there is no "show all", and nothing is
 * remembered across a remount. Someone screen-sharing a deploy dashboard should
 * not have every production secret on screen because they expanded one an hour
 * ago.
 *
 * The mask is a fixed width rather than the value's real length, since the
 * length of a secret is itself a hint about what it is.
 */
export type EnvVar = {
  key: string
  value: string
  /** Masked until revealed. */
  secret?: boolean
  /** Which environments it applies to. */
  scopes?: string[]
  updated?: string
}

const MASK = '••••••••••••'

function EnvVars({
  vars,
  className,
  ...props
}: ComponentProps<'div'> & { vars: EnvVar[] }) {
  const [revealed, setRevealed] = useState<string[]>([])

  return (
    <div
      data-slot="env-vars"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <ul className="list-none divide-y divide-[var(--border)]">
        {vars.map((entry) => {
          const open = revealed.includes(entry.key)
          const masked = entry.secret && !open

          return (
            <li
              key={entry.key}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 items-center gap-2 sm:w-56">
                {entry.secret && (
                  <Lock className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                )}
                <code className="min-w-0 truncate font-mono text-xs font-medium">
                  {entry.key}
                </code>
              </div>

              <code
                className={cn(
                  'text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs',
                  masked && 'tracking-widest',
                )}
              >
                {masked ? MASK : entry.value}
              </code>

              {entry.scopes && (
                <div className="flex shrink-0 flex-wrap gap-1">
                  {entry.scopes.map((scope) => (
                    <Badge key={scope} size="sm">
                      {scope}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {entry.secret && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={open ? `Hide ${entry.key}` : `Reveal ${entry.key}`}
                    aria-pressed={open}
                    onClick={() =>
                      setRevealed((current) =>
                        open
                          ? current.filter((key) => key !== entry.key)
                          : [...current, entry.key],
                      )
                    }
                  >
                    {open ? <EyeOff /> : <Eye />}
                  </Button>
                )}
                {/* Copies the real value even while masked — the usual reason
                    to open one of these is to paste it somewhere. */}
                <CopyButton value={entry.value} label={`Copy ${entry.key}`} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { EnvVars }
