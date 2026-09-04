import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A prompt template with its slots filled in, side by side with the result.
 *
 * Prompt templates fail in one specific way: a variable is renamed in the text
 * and not in the caller, so `{{customer}}` ships to the model as the literal
 * string `{{customer}}`. Nothing throws, the model improvises, and the bug is
 * found in an eval three days later.
 *
 * So the variables are **parsed out of the template** rather than declared
 * separately — they cannot drift, because there is only one list. Anything
 * still unfilled is highlighted in the preview instead of being silently
 * interpolated as an empty string.
 *
 * The preview is the exact text that will be sent, which is the point. A
 * template view that renders the slots as chips is prettier and answers a
 * different question than "what does the model actually receive".
 */
type PromptVariablesProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  /** The template. `{{name}}` marks a slot. */
  template: string
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
  /** Slots whose value should be a textarea rather than an input. */
  multiline?: string[]
  /** Descriptions per variable, shown under each field. */
  hints?: Record<string, ReactNode>
  previewLabel?: string
  variablesLabel?: string
  missingLabel?: string
  /** Characters after which a field becomes a textarea automatically. */
  multilineAfter?: number
}

const SLOT = /\{\{\s*([\w.]+)\s*\}\}/g

/** Slot names in the order they first appear. Duplicates collapse. */
export function promptSlots(template: string) {
  const seen: string[] = []
  for (const match of template.matchAll(SLOT)) {
    if (!seen.includes(match[1])) seen.push(match[1])
  }
  return seen
}

function PromptVariables({
  template,
  values,
  onChange,
  multiline = [],
  hints,
  previewLabel = 'What the model receives',
  variablesLabel = 'Variables',
  missingLabel = 'unfilled',
  multilineAfter = 60,
  className,
  ...props
}: PromptVariablesProps) {
  const slots = useMemo(() => promptSlots(template), [template])
  const missing = slots.filter((slot) => !values[slot]?.trim())

  // Split rather than replace, so an unfilled slot can be rendered as a
  // highlighted node instead of vanishing into the string.
  const preview = useMemo(() => {
    const parts: ReactNode[] = []
    let index = 0
    SLOT.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = SLOT.exec(template))) {
      if (match.index > index) parts.push(template.slice(index, match.index))
      const filled = values[match[1]]?.trim()
      parts.push(
        filled ? (
          <span key={parts.length} className="bg-[var(--green-soft)] rounded-sm px-0.5">
            {values[match[1]]}
          </span>
        ) : (
          <span
            key={parts.length}
            className="bg-[var(--destructive-soft)] text-[var(--destructive-soft-foreground)] rounded-sm px-0.5"
          >
            {match[0]}
          </span>
        ),
      )
      index = match.index + match[0].length
    }
    if (index < template.length) parts.push(template.slice(index))
    return parts
  }, [template, values])

  return (
    <div
      data-slot="prompt-variables"
      className={cn('grid gap-3 lg:grid-cols-2', className)}
      {...props}
    >
      <div className={cn(surface, radius.surface, 'flex flex-col gap-3.5 p-4')}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
            {variablesLabel}
          </p>
          {missing.length > 0 && (
            <Badge size="sm" color="destructive">
              {missing.length} {missingLabel}
            </Badge>
          )}
        </div>

        {slots.length === 0 ? (
          <p className="text-muted-foreground text-xs">This template has no variables.</p>
        ) : (
          slots.map((slot) => (
            <Field key={slot} description={hints?.[slot]}>
              <FieldLabel>
                <span className="font-mono text-xs">{slot}</span>
              </FieldLabel>
              <SlotControl
                value={values[slot] ?? ''}
                long={multiline.includes(slot) || (values[slot]?.length ?? 0) > multilineAfter}
                onChange={(next) => onChange({ ...values, [slot]: next })}
              />
            </Field>
          ))
        )}
      </div>

      <div className={cn(surface, radius.surface, 'flex flex-col gap-2 p-4')}>
        <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
          {previewLabel}
        </p>
        <pre className="text-foreground/85 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {preview}
        </pre>
      </div>
    </div>
  )
}

function SlotControl({
  value,
  long,
  onChange,
}: {
  value: string
  long: boolean
  onChange: (next: string) => void
}) {
  const control = useFieldControl()

  return long ? (
    <Textarea {...control} rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
  ) : (
    <Input {...control} size="sm" value={value} onChange={(event) => onChange(event.target.value)} />
  )
}

export { PromptVariables }
export type { PromptVariablesProps }
