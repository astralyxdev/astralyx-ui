import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A tool's parameter schema, rendered as something a person can read.
 *
 * Tool definitions are JSON Schema, and JSON Schema shown as JSON is a wall.
 * The questions anyone actually has are "what must I pass", "what type is it"
 * and "what happens if I leave it out" — so required, type and default are the
 * three things given their own column, and everything else is prose.
 *
 * Nesting is expanded one level by default and collapsible below that. A deeply
 * nested schema rendered fully open is the wall again in a different font.
 *
 * It reads a useful subset of JSON Schema — `type`, `description`, `enum`,
 * `default`, `required`, `properties`, `items` — and ignores the rest rather
 * than half-supporting it. `$ref` in particular is deliberately not resolved:
 * following one means fetching or bundling a document this component cannot
 * see, and silently rendering an unresolved ref as an empty object is worse
 * than saying so.
 */
export type JsonSchema = {
  type?: string | string[]
  description?: string
  enum?: unknown[]
  default?: unknown
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  $ref?: string
  [key: string]: unknown
}

type ToolSchemaProps = Omit<ComponentProps<'div'>, 'title'> & {
  schema: JsonSchema
  /** Tool name, shown as a heading above the parameters. */
  name?: string
  description?: ReactNode
  /** How many levels start expanded. */
  defaultDepth?: number
  requiredLabel?: string
  optionalLabel?: string
  /** Verbs for the nested-field toggles, used in its accessible name. */
  expandLabel?: string
  collapseLabel?: string
  emptyLabel?: string
  /** Shown in place of a `$ref` this component will not resolve. */
  unresolvedRefLabel?: (ref: string) => string
}

function typeOf(schema: JsonSchema): string {
  if (schema.$ref) return 'ref'
  if (Array.isArray(schema.type)) return schema.type.join(' | ')
  if (schema.type === 'array' && schema.items) return `${typeOf(schema.items)}[]`
  return schema.type ?? 'any'
}

/** One parameter row, plus its children when it has any. */
function Row({
  name,
  schema,
  required,
  depth,
  openDepth,
  labels,
}: {
  name: string
  schema: JsonSchema
  required: boolean
  depth: number
  openDepth: number
  labels: {
    required: string
    optional: string
    expand: string
    collapse: string
    unresolvedRef: (ref: string) => string
  }
}) {
  const children = schema.properties ?? schema.items?.properties
  const hasChildren = Boolean(children && Object.keys(children).length > 0)
  const [open, setOpen] = useState(depth < openDepth)

  const childRequired = new Set(schema.required ?? schema.items?.required ?? [])

  return (
    <li>
      <div
        className="flex items-start gap-2 py-2"
        // Indent by depth rather than nesting padded containers, so a deep
        // schema does not run out of horizontal room three levels in.
        style={{ paddingInlineStart: depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            // The chevron is aria-hidden, so without this the button has no
            // accessible name at all — it announces as just "button".
            aria-label={`${open ? labels.collapse : labels.expand} ${name}`}
            onClick={() => setOpen((current) => !current)}
            className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
          >
            <ChevronRight
              className={cn(
                'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
                open && 'rotate-90',
              )}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <code className="font-mono text-sm">{name}</code>
            <span className="text-muted-foreground font-mono text-xs">{typeOf(schema)}</span>
            {required ? (
              <Badge size="sm" color="destructive" variant="ghost">
                {labels.required}
              </Badge>
            ) : (
              <span className="text-muted-foreground/60 text-[11px]">{labels.optional}</span>
            )}
          </div>

          {schema.description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {schema.description}
            </p>
          )}

          {schema.$ref && (
            <p className="text-muted-foreground/70 mt-1 font-mono text-[11px]">
              {labels.unresolvedRef(schema.$ref)}
            </p>
          )}

          {schema.enum && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {schema.enum.map((option) => (
                <code
                  key={String(option)}
                  className={cn('bg-secondary px-1.5 py-0.5 font-mono text-[11px]', radius.xs)}
                >
                  {String(option)}
                </code>
              ))}
            </div>
          )}

          {schema.default !== undefined && (
            <p className="text-muted-foreground/70 mt-1 font-mono text-[11px]">
              default: {JSON.stringify(schema.default)}
            </p>
          )}
        </div>
      </div>

      {hasChildren && open && (
        <ul className="list-none">
          {Object.entries(children!).map(([childName, childSchema]) => (
            <Row
              key={childName}
              name={childName}
              schema={childSchema}
              required={childRequired.has(childName)}
              depth={depth + 1}
              openDepth={openDepth}
              labels={labels}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function ToolSchema({
  schema,
  name,
  description,
  defaultDepth = 1,
  requiredLabel = 'required',
  optionalLabel = 'optional',
  expandLabel = 'Expand',
  collapseLabel = 'Collapse',
  emptyLabel = 'Takes no parameters.',
  unresolvedRefLabel = (ref) => `unresolved reference: ${ref}`,
  className,
  ...props
}: ToolSchemaProps) {
  const properties = schema.properties ?? {}
  const required = new Set(schema.required ?? [])
  const entries = Object.entries(properties)

  return (
    <div
      data-slot="tool-schema"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {(name || description) && (
        <div className="border-border bg-muted/40 border-b px-4 py-3">
          {name && <p className="font-mono text-sm font-medium">{name}</p>}
          {description && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>
          )}
        </div>
      )}

      <div className="px-4 py-1">
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-3 text-xs">{emptyLabel}</p>
        ) : (
          <ul className="divide-border list-none divide-y">
            {entries.map(([key, value]) => (
              <Row
                key={key}
                name={key}
                schema={value}
                required={required.has(key)}
                depth={0}
                openDepth={defaultDepth}
                labels={{
                  required: requiredLabel,
                  optional: optionalLabel,
                  expand: expandLabel,
                  collapse: collapseLabel,
                  unresolvedRef: unresolvedRefLabel,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { ToolSchema, typeOf as toolSchemaType }
export type { ToolSchemaProps }
