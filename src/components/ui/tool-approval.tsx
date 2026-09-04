import { useState, type ComponentProps, type ReactNode } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The consent prompt before a tool runs.
 *
 * The most consequential component in an agent UI, and the one most often
 * built wrong. Three rules it follows:
 *
 * **The arguments are shown, in full, before the buttons.** A prompt that says
 * "Allow `issue_refund`?" is asking you to approve a function name. What
 * matters is that it wants to refund £3,400 to an account added this morning,
 * and that is in the arguments.
 *
 * **"Always allow" is scoped and labelled as a standing grant.** It is the
 * option people click by reflex, so it says what it will do next time rather
 * than reading as a slightly faster "yes".
 *
 * **Deny is not styled as the dangerous choice.** Declining a tool call is
 * always safe; running one may not be. A destructive tool puts the emphasis on
 * approve, not on cancel, so the visual weight matches the actual risk.
 *
 * There is no default focus on approve, and no timeout that auto-approves.
 */
export type ToolApprovalDecision = 'once' | 'always' | 'deny'

type ToolApprovalProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  /** The tool the agent wants to call. */
  tool: string
  /** Which server or agent is asking. */
  origin?: string
  description?: ReactNode
  /** The call's arguments. Shown in full — this is the point of the prompt. */
  args?: unknown
  /** Marks the call as consequential: deletes, payments, sends. */
  destructive?: boolean
  onDecide: (decision: ToolApprovalDecision) => void
  /** Disables the buttons while the decision is being applied. */
  busy?: boolean
  onceLabel?: string
  alwaysLabel?: string
  denyLabel?: string
  /** Explains the standing grant. Receives the tool name. */
  alwaysHint?: (tool: string) => ReactNode
  argsLabel?: string
  destructiveLabel?: string
}

function ToolApproval({
  tool,
  origin,
  description,
  args,
  destructive = false,
  onDecide,
  busy = false,
  onceLabel = 'Allow once',
  alwaysLabel = 'Always allow',
  denyLabel = 'Deny',
  alwaysHint = (name) => `${name} will run without asking again in this project.`,
  argsLabel = 'Arguments',
  destructiveLabel = 'Destructive',
  className,
  ...props
}: ToolApprovalProps) {
  const [hoveringAlways, setHoveringAlways] = useState(false)

  return (
    <div
      data-slot="tool-approval"
      role="alertdialog"
      aria-label={`Approve ${tool}`}
      className={cn(
        surface,
        radius.surface,
        'flex flex-col gap-4 p-4',
        destructive && 'border-destructive',
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            destructive
              ? 'bg-[var(--destructive-soft)] text-[var(--destructive-soft-foreground)]'
              : 'bg-secondary text-secondary-foreground',
          )}
        >
          {destructive ? (
            <ShieldAlert className="size-4" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-4" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-sm font-medium">{tool}</code>
            {destructive && (
              <Badge size="sm" color="destructive">
                {destructiveLabel}
              </Badge>
            )}
            {origin && (
              <Badge size="sm" variant="outline">
                {origin}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Before the buttons, always. The arguments are what is being approved;
          the tool name is just the label on the envelope. */}
      {args !== undefined && (
        <div>
          <p className="text-muted-foreground/70 mb-1.5 text-[11px] font-medium tracking-[0.14em] uppercase">
            {argsLabel}
          </p>
          <pre
            className={cn(
              'bg-muted/60 text-foreground/85 max-h-56 overflow-auto p-3 font-mono text-[11px] leading-relaxed',
              radius.control,
            )}
          >
            {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => onDecide('once')}>
            {onceLabel}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => onDecide('always')}
            onMouseEnter={() => setHoveringAlways(true)}
            onMouseLeave={() => setHoveringAlways(false)}
            onFocus={() => setHoveringAlways(true)}
            onBlur={() => setHoveringAlways(false)}
          >
            {alwaysLabel}
          </Button>
          {/* Ghost, not destructive. Declining is always the safe option, and
              styling it as the dangerous one inverts the actual risk. */}
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onDecide('deny')}>
            {denyLabel}
          </Button>
        </div>

        {hoveringAlways && (
          <p className="text-muted-foreground text-xs">{alwaysHint(tool)}</p>
        )}
      </div>
    </div>
  )
}

export { ToolApproval }
export type { ToolApprovalProps }
