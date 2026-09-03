import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A JSON Schema rendered as a navigable tree.
 *
 * Required fields are marked on the field, not listed separately at the parent.
 * JSON Schema puts `required` on the object as an array of names, which means
 * reading a schema involves cross-referencing a list against the properties
 * below it — the one job a renderer should do for you.
 *
 * Constraints are shown inline: `minLength`, `enum`, `pattern`, `format`. A type
 * of "string" is rarely the interesting part; that it must match a UUID pattern
 * is.
 *
 * `oneOf` and `anyOf` render as labelled alternatives rather than being
 * flattened. A flattened union looks like an object with contradictory fields.
 */
export type JsonSchema = {
  type?: string | string[]
  title?: string
  description?: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  enum?: unknown[]
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  default?: unknown
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  deprecated?: boolean
}

/** The short constraint list shown beside a field's type. */
function constraints(schema: JsonSchema): string[] {
  const out: string[] = []
  if (schema.format) out.push(schema.format)
  if (schema.enum) out.push(schema.enum.map((v) => JSON.stringify(v)).join(' | '))
  if (schema.pattern) out.push(`/${schema.pattern}/`)
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    out.push(`${schema.minLength ?? 0}–${schema.maxLength ?? '∞'} chars`)
  }
  if (schema.minimum !== undefined || schema.maximum !== undefined) {
    out.push(`${schema.minimum ?? '−∞'}–${schema.maximum ?? '∞'}`)
  }
  if (schema.default !== undefined) out.push(`default ${JSON.stringify(schema.default)}`)
  return out
}

function typeOf(schema: JsonSchema): string {
  if (Array.isArray(schema.type)) return schema.type.join(' | ')
  if (schema.type === 'array' && schema.items) return `${typeOf(schema.items)}[]`
  return schema.type ?? (schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : 'any')
}

function SchemaViewer({
  schema,
  name = 'root',
  defaultOpenDepth = 2,
  requiredLabel = 'required',
  deprecatedLabel = 'deprecated',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  schema: JsonSchema
  name?: string
  defaultOpenDepth?: number
  requiredLabel?: ReactNode
  deprecatedLabel?: ReactNode
}) {
  return (
    <div
      data-slot="schema-viewer"
      className={cn(surface, radius.surface, 'overflow-hidden p-2', className)}
      {...props}
    >
      <Node
        schema={schema}
        name={name}
        depth={0}
        required={false}
        defaultOpenDepth={defaultOpenDepth}
        requiredLabel={requiredLabel}
        deprecatedLabel={deprecatedLabel}
      />
    </div>
  )
}

/** At module scope: a component declared in render remounts every keystroke. */
function Node({
  schema,
  name,
  depth,
  required,
  defaultOpenDepth,
  requiredLabel,
  deprecatedLabel,
}: {
  schema: JsonSchema
  name: string
  depth: number
  required: boolean
  defaultOpenDepth: number
  requiredLabel: ReactNode
  deprecatedLabel: ReactNode
}) {
  const [open, setOpen] = useState(depth < defaultOpenDepth)

  const properties = schema.properties ?? schema.items?.properties
  const requiredSet = new Set(schema.required ?? schema.items?.required ?? [])
  const alternatives = schema.oneOf ?? schema.anyOf
  const branching = Boolean(properties || alternatives)
  const notes = constraints(schema)

  return (
    <div>
      <button
        type="button"
        aria-expanded={branching ? open : undefined}
        disabled={!branching}
        onClick={() => setOpen((v) => !v)}
        style={{ paddingInlineStart: depth * 14 + 6 }}
        className={cn(
          'flex w-full items-baseline gap-2 py-1 pe-2 text-start',
          radius.xs,
          branching && interactive,
          focusRing,
        )}
      >
        {branching ? (
          open ? (
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0 self-center" aria-hidden="true" />
          ) : (
            <ChevronRight className="text-muted-foreground size-3.5 shrink-0 self-center" aria-hidden="true" />
          )
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden="true" />
        )}

        <code className={cn('font-mono text-xs font-medium', schema.deprecated && 'line-through')}>
          {name}
        </code>

        {/* Marked on the field, not cross-referenced from the parent's array. */}
        {required && (
          <span className="text-[var(--destructive-soft-foreground)] text-xs" title={String(requiredLabel)}>
            *
          </span>
        )}

        <code className="text-muted-foreground font-mono text-xs">{typeOf(schema)}</code>

        {schema.deprecated && (
          <Badge size="sm" color="amber">
            {deprecatedLabel}
          </Badge>
        )}

        {/* The constraint, not the type, is usually the interesting part. */}
        {notes.length > 0 && (
          <span className="text-muted-foreground/70 min-w-0 truncate font-mono text-xs">
            {notes.join(' · ')}
          </span>
        )}
      </button>

      {schema.description && (
        <p
          className="text-muted-foreground/80 pe-2 text-xs"
          style={{ paddingInlineStart: depth * 14 + 26 }}
        >
          {schema.description}
        </p>
      )}

      {open && properties && (
        <div>
          {Object.entries(properties).map(([key, child]) => (
            <Node
              key={key}
              schema={child}
              name={key}
              depth={depth + 1}
              required={requiredSet.has(key)}
              defaultOpenDepth={defaultOpenDepth}
              requiredLabel={requiredLabel}
              deprecatedLabel={deprecatedLabel}
            />
          ))}
        </div>
      )}

      {/* Labelled alternatives — a flattened union looks self-contradictory. */}
      {open && alternatives && (
        <div>
          {alternatives.map((child, index) => (
            <Node
              key={index}
              schema={child}
              name={`${schema.oneOf ? 'oneOf' : 'anyOf'}[${index}]`}
              depth={depth + 1}
              required={false}
              defaultOpenDepth={defaultOpenDepth}
              requiredLabel={requiredLabel}
              deprecatedLabel={deprecatedLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { SchemaViewer, constraints as schemaConstraints }
