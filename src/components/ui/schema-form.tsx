import { useId, type ComponentProps, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { JsonSchema } from '@/components/ui/tool-schema'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A form generated from a JSON Schema, so a person can invoke a tool by hand.
 *
 * The counterpart to `ToolSchema`: that one explains the parameters, this one
 * collects them. Together they are how you test an MCP tool without writing a
 * client — which is the first thing anyone wants when a server misbehaves.
 *
 * **Validation is reported, not enforced by disabling submit.** A disabled
 * button with no explanation is the worst version of a form: you cannot submit
 * and you are not told why. Missing required fields are listed, and submit
 * stays live so the error surfaces on the field.
 *
 * It handles the schema subset that tool definitions actually use — string,
 * number, integer, boolean, enum, and string arrays entered one per line.
 * Nested objects are deliberately out of scope: a generated form for a deep
 * schema is worse than a JSON editor, and `CodeBlock` already is one.
 */
type SchemaFormValue = Record<string, unknown>

type SchemaFormProps = Omit<ComponentProps<'form'>, 'onSubmit' | 'onChange'> & {
  schema: JsonSchema
  value: SchemaFormValue
  onChange: (next: SchemaFormValue) => void
  onSubmit?: (value: SchemaFormValue) => void
  submitLabel?: ReactNode
  /** Disables submit and every control while a call is in flight. */
  busy?: boolean
  /** Names the fields that are required but empty. */
  missingLabel?: (fields: string[]) => ReactNode
  emptyLabel?: string
  /** Hint under an array field. */
  arrayHint?: string
}

/** Required, and either absent or an empty string. */
function missingFrom(schema: JsonSchema, value: SchemaFormValue) {
  return (schema.required ?? []).filter((key) => {
    const current = value[key]
    return current === undefined || current === null || current === ''
  })
}

function SchemaForm({
  schema,
  value,
  onChange,
  onSubmit,
  submitLabel = 'Run',
  busy = false,
  missingLabel = (fields) => `Required: ${fields.join(', ')}`,
  emptyLabel = 'This tool takes no parameters.',
  arrayHint = 'One per line.',
  className,
  ...props
}: SchemaFormProps) {
  const scope = useId()
  const properties = schema.properties ?? {}
  const entries = Object.entries(properties)
  const required = new Set(schema.required ?? [])
  const missing = missingFrom(schema, value)

  return (
    <form
      data-slot="schema-form"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(value)
      }}
      {...props}
    >
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      ) : (
        entries.map(([key, property]) => {
          const isRequired = required.has(key)
          const invalid = isRequired && missing.includes(key)

          if (property.type === 'boolean') {
            return (
              <Switch
                key={key}
                id={`${scope}-${key}`}
                size="sm"
                disabled={busy}
                checked={Boolean(value[key] ?? property.default ?? false)}
                onChange={(event) => onChange({ ...value, [key]: event.target.checked })}
                label={<span className="font-mono text-xs">{key}</span>}
                description={property.description}
                labelPosition="start"
                containerClassName="justify-between w-full"
              />
            )
          }

          return (
            <Field
              key={key}
              description={property.description}
              error={invalid ? 'Required' : undefined}
            >
              <FieldLabel>
                <span className="font-mono text-xs">{key}</span>
                {isRequired && <span className="text-destructive ms-1">*</span>}
              </FieldLabel>
              <SchemaControl
                property={property}
                value={value[key]}
                busy={busy}
                arrayHint={arrayHint}
                onChange={(next) => onChange({ ...value, [key]: next })}
              />
            </Field>
          )
        })
      )}

      {onSubmit && entries.length >= 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Never disabled for validation — a dead button that will not say
              why is the worst version of this form. */}
          <Button type="submit" size="sm" disabled={busy}>
            {submitLabel}
          </Button>
          {missing.length > 0 && (
            <p className="text-muted-foreground text-xs">{missingLabel(missing)}</p>
          )}
        </div>
      )}
    </form>
  )
}

/** One control, wired to its Field's generated id and description. */
function SchemaControl({
  property,
  value,
  onChange,
  busy,
  arrayHint,
}: {
  property: JsonSchema
  value: unknown
  onChange: (next: unknown) => void
  busy: boolean
  arrayHint: string
}) {
  const control = useFieldControl()

  if (property.enum) {
    return (
      <Select
        size="sm"
        disabled={busy}
        value={String(value ?? property.default ?? '')}
        options={property.enum.map((option) => ({
          value: String(option),
          label: String(option),
        }))}
        onValueChange={onChange}
      />
    )
  }

  if (property.type === 'number' || property.type === 'integer') {
    return (
      <NumberInput
        {...control}
        size="sm"
        disabled={busy}
        step={property.type === 'integer' ? 1 : undefined}
        value={Number(value ?? property.default ?? 0)}
        onValueChange={(next) => onChange(next ?? 0)}
      />
    )
  }

  if (property.type === 'array') {
    return (
      <>
        <Textarea
          {...control}
          rows={3}
          disabled={busy}
          value={Array.isArray(value) ? value.join('\n') : String(value ?? '')}
          onChange={(event) =>
            onChange(event.target.value.split('\n').filter((line) => line.trim() !== ''))
          }
        />
        <p className="text-muted-foreground text-xs">{arrayHint}</p>
      </>
    )
  }

  return (
    <Input
      {...control}
      size="sm"
      disabled={busy}
      value={String(value ?? property.default ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export { SchemaForm, missingFrom as schemaFormMissing }
export type { SchemaFormProps, SchemaFormValue }
