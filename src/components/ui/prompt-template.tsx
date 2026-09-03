import { useId, useMemo, useState, type ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A prompt with `{{variable}}` placeholders and a form to fill them.
 *
 * Variables are parsed out of the template rather than declared separately.
 * Two sources for the same list drift the moment someone edits the text, and
 * the failure is silent — a placeholder with no input, or an input that fills
 * nothing.
 *
 * Unfilled placeholders stay visible in the preview instead of rendering empty.
 * A prompt that quietly sends "Summarise  in  words" is worse than one that
 * shows you what is missing.
 */
const VARIABLE = /\{\{\s*(\w+)\s*\}\}/g

function extractVariables(template: string) {
  const found = new Set<string>()
  for (const match of template.matchAll(VARIABLE)) found.add(match[1])
  return [...found]
}

function PromptTemplate({
  template,
  values: valuesProp,
  onValuesChange,
  title,
  showPreview = true,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title' | 'onChange'> & {
  template: string
  values?: Record<string, string>
  onValuesChange?: (values: Record<string, string>) => void
  title?: string
  showPreview?: boolean
}) {
  const variables = useMemo(() => extractVariables(template), [template])
  // Namespaced per instance: two templates on one page would otherwise both
  // mint `var-repo`, giving duplicate ids and labels pointing at the wrong
  // field.
  const fieldId = useId()

  const controlled = valuesProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<Record<string, string>>({})
  const values = controlled ? valuesProp : uncontrolled

  const filled = variables.filter((name) => values[name]?.trim()).length

  const preview = template.replace(VARIABLE, (whole, name: string) =>
    values[name]?.trim() ? values[name] : whole,
  )

  function set(name: string, value: string) {
    const next = { ...values, [name]: value }
    if (!controlled) setUncontrolled(next)
    onValuesChange?.(next)
  }

  return (
    <div
      data-slot="prompt-template"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title ?? 'Prompt template'}
        </span>
        <Badge size="sm" color={filled === variables.length ? 'green' : 'amber'}>
          {filled} / {variables.length} filled
        </Badge>
        <CopyButton value={() => preview} label="Copy prompt" />
      </div>

      {variables.length > 0 && (
        <div className="border-border grid gap-3 border-b p-3 sm:grid-cols-2">
          {variables.map((name) => (
            <div key={name} className="flex flex-col gap-1.5">
              <Label htmlFor={`${fieldId}-${name}`} className="font-mono text-xs">
                {name}
              </Label>
              <Input
                id={`${fieldId}-${name}`}
                size="sm"
                variant="secondary"
                placeholder={`{{${name}}}`}
                value={values[name] ?? ''}
                onChange={(event) => set(name, event.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {showPreview && (
        <pre className="max-h-64 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap">
          {/* Unfilled placeholders stay literal, so gaps are visible. */}
          {preview.split(VARIABLE).map((part, index) =>
            index % 2 === 1 ? (
              <span
                key={index}
                className="bg-[color-mix(in_oklab,var(--amber),transparent_80%)] rounded-sm px-1"
              >
                {`{{${part}}}`}
              </span>
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
        </pre>
      )}
    </div>
  )
}

export { PromptTemplate, extractVariables }
