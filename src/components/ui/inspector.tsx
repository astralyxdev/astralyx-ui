import { useId, type ComponentProps, type ReactNode } from 'react'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The properties panel for whatever is selected.
 *
 * The other half of a canvas: `NodeCanvas` owns position and wiring, this owns
 * everything else about the selected thing. Also the right shape for a layer
 * panel, a chart configurator, or any "click a thing, edit its fields" surface.
 *
 * Driven by a schema rather than by children, because the fields change with
 * the selection — a model node and a tool node have almost nothing in common,
 * and writing that as JSX means a switch statement per node kind at the call
 * site. Describe the fields and the panel renders them.
 *
 * **One `onChange` for the whole object, not one per field.** A panel that
 * emits `(key, value)` pushes the merge onto every caller, and the merge is
 * where the stale-closure bugs live. This emits the next object.
 *
 * Sections are flat and always visible. An inspector is read at a glance while
 * doing something else; collapsing groups saves vertical space and costs the
 * glance, which is the whole point of the panel.
 */
export type InspectorField =
  | { type: 'text'; key: string; label: string; placeholder?: string; hint?: ReactNode }
  | { type: 'textarea'; key: string; label: string; rows?: number; placeholder?: string; hint?: ReactNode }
  | { type: 'number'; key: string; label: string; min?: number; max?: number; step?: number; hint?: ReactNode }
  | { type: 'boolean'; key: string; label: string; hint?: ReactNode }
  | {
      type: 'select'
      key: string
      label: string
      options: { value: string; label: string }[]
      hint?: ReactNode
    }
  /** Not editable — an id, a computed total, a timestamp. */
  | { type: 'readonly'; key: string; label: string; hint?: ReactNode }

export type InspectorSection = {
  label?: string
  fields: InspectorField[]
}

type InspectorValue = Record<string, unknown>

type InspectorProps = Omit<ComponentProps<'div'>, 'onChange' | 'title'> & {
  sections: InspectorSection[]
  value: InspectorValue
  onChange: (next: InspectorValue) => void
  /** Heading for the panel — usually the selected thing's name. */
  title?: ReactNode
  description?: ReactNode
  /** Shown when nothing is selected. Pass `sections: []` alongside it. */
  emptyLabel?: string
}

function Inspector({
  sections,
  value,
  onChange,
  title,
  description,
  emptyLabel = 'Nothing selected.',
  className,
  ...props
}: InspectorProps) {
  const scope = useId()

  function set(key: string, next: unknown) {
    onChange({ ...value, [key]: next })
  }

  const empty = sections.every((section) => section.fields.length === 0)

  return (
    <div
      data-slot="inspector"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {(title || description) && (
        <div className="border-border bg-muted/40 border-b px-4 py-3">
          {title && <p className="truncate text-sm font-medium">{title}</p>}
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
          )}
        </div>
      )}

      {empty ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : (
        <div className="divide-border divide-y">
          {sections.map((section, index) => (
            <div key={section.label ?? index} className="flex flex-col gap-3.5 p-4">
              {section.label && (
                <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
                  {section.label}
                </p>
              )}

              {section.fields.map((field) => {
                const current = value[field.key]

                // A switch carries its own label, so it skips the Field wrapper
                // rather than being labelled twice.
                if (field.type === 'boolean') {
                  return (
                    <Switch
                      key={field.key}
                      id={`${scope}-${field.key}`}
                      size="sm"
                      checked={Boolean(current)}
                      onChange={(event) => set(field.key, event.target.checked)}
                      label={<span className="text-xs">{field.label}</span>}
                      description={field.hint}
                      labelPosition="start"
                      containerClassName="justify-between w-full"
                    />
                  )
                }

                return (
                  <Field key={field.key} description={field.hint}>
                    <FieldLabel>{field.label}</FieldLabel>
                    <InspectorControl
                      field={field}
                      value={current}
                      onChange={(next) => set(field.key, next)}
                    />
                  </Field>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * One control, wired to its Field.
 *
 * A child rather than inline JSX because `useFieldControl` reads the id and the
 * `aria-describedby` Field generates, and a hook cannot be called from inside
 * the map that renders Field's own children.
 */
function InspectorControl({
  field,
  value,
  onChange,
}: {
  field: InspectorField
  value: unknown
  onChange: (next: unknown) => void
}) {
  const control = useFieldControl()

  if (field.type === 'text') {
    return (
      <Input
        {...control}
        size="sm"
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        {...control}
        rows={field.rows ?? 3}
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === 'number') {
    return (
      <NumberInput
        {...control}
        size="sm"
        value={Number(value ?? 0)}
        min={field.min}
        max={field.max}
        step={field.step}
        onValueChange={(next) => onChange(next ?? 0)}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <Select
        size="sm"
        value={String(value ?? '')}
        options={field.options}
        onValueChange={onChange}
      />
    )
  }

  return (
    <p {...control} className="text-muted-foreground truncate font-mono text-xs">
      {String(value ?? '—')}
    </p>
  )
}

export { Inspector }
export type { InspectorProps, InspectorValue }
