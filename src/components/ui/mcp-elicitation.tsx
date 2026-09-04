import { useState, type ComponentProps, type ReactNode } from 'react'
import { MessageCircleQuestion, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SchemaForm, schemaFormMissing } from '@/components/ui/schema-form'
import type { JsonSchema } from '@/components/ui/tool-schema'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A server asking the user for structured input, mid-run.
 *
 * MCP elicitation lets a server pause and request data it does not have — a
 * confirmation, a missing field, a choice between branches. It is a genuinely
 * useful capability and a genuinely good phishing surface: the prompt text is
 * written by the server, and it appears inside your client, wearing your
 * client's chrome.
 *
 * Two rules follow from that, and they are the reason this is a component
 * rather than a `SchemaForm` in a dialog:
 *
 * **The requesting server is named at the top, outside the server's own copy.**
 * A message that says "your session expired, re-enter your token" is indistinguishable
 * from the client asking, unless the client says who is asking.
 *
 * **A field that looks like a credential is refused, not collected.** No
 * legitimate elicitation needs your password, and a component that renders that
 * field anyway is the attack working. The request still displays; the field is
 * replaced with a warning.
 */
const CREDENTIAL = /(password|passwd|secret|api[_-]?key|token|credential|private[_-]?key|seed|mnemonic)/i

/** Property names this component will not render an input for. */
export function credentialFields(schema: JsonSchema) {
  return Object.keys(schema.properties ?? {}).filter((key) => CREDENTIAL.test(key))
}

type McpElicitationProps = Omit<ComponentProps<'div'>, 'onSubmit'> & {
  /** The server asking. Always shown, outside the server's own message. */
  server: string
  /** The server's prompt. Untrusted text — rendered, never interpreted. */
  message: ReactNode
  /** What it wants back. */
  schema: JsonSchema
  onSubmit?: (value: Record<string, unknown>) => void
  onDecline?: () => void
  busy?: boolean
  submitLabel?: string
  declineLabel?: string
  askingLabel?: (server: string) => ReactNode
  credentialWarning?: (fields: string[]) => ReactNode
}

function McpElicitation({
  server,
  message,
  schema,
  onSubmit,
  onDecline,
  busy = false,
  submitLabel = 'Send',
  declineLabel = 'Decline',
  askingLabel = (name) => (
    <>
      <code className="font-mono font-medium">{name}</code> is asking for information
    </>
  ),
  credentialWarning = (fields) =>
    `This request asks for ${fields.join(', ')}. No server should need that — the field has not been rendered.`,
  className,
  ...props
}: McpElicitationProps) {
  const [value, setValue] = useState<Record<string, unknown>>({})

  const credentials = credentialFields(schema)
  // The credential properties are stripped before the form ever sees them.
  const safeSchema: JsonSchema = {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(schema.properties ?? {}).filter(([key]) => !CREDENTIAL.test(key)),
    ),
    required: (schema.required ?? []).filter((key) => !CREDENTIAL.test(key)),
  }

  const missing = schemaFormMissing(safeSchema, value)

  return (
    <div
      data-slot="mcp-elicitation"
      role="dialog"
      aria-label={`Request from ${server}`}
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      {/* Attribution first, outside anything the server controls. */}
      <div className="flex items-start gap-3">
        <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
          <MessageCircleQuestion className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">{askingLabel(server)}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{message}</p>
        </div>
      </div>

      {credentials.length > 0 && (
        <p
          className={cn(
            'flex items-start gap-2 p-2.5 text-xs leading-relaxed',
            radius.control,
            'bg-[var(--destructive-soft)] text-[var(--destructive-soft-foreground)]',
          )}
        >
          <ShieldAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{credentialWarning(credentials)}</span>
        </p>
      )}

      <SchemaForm
        schema={safeSchema}
        value={value}
        onChange={setValue}
        busy={busy}
        className="border-0 p-0"
      />

      <div className="flex flex-wrap items-center gap-2">
        {onSubmit && (
          <Button size="sm" disabled={busy} onClick={() => onSubmit(value)}>
            {submitLabel}
          </Button>
        )}
        {onDecline && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onDecline}>
            {declineLabel}
          </Button>
        )}
        {missing.length > 0 && (
          <Badge size="sm" variant="outline">
            {missing.length} required
          </Badge>
        )}
      </div>
    </div>
  )
}

export { McpElicitation }
export type { McpElicitationProps }
