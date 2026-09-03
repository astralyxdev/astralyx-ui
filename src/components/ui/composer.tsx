import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { ColorPicker } from '@/components/ui/color-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { Language } from '@/lib/highlighter'
import { cn } from '@/lib/utils'

/**
 * A live playground: drive a set of props and watch generated source follow.
 *
 * Assembled entirely from the kit's own controls, which is the point rather
 * than a flourish — this is the densest form on the site, so anything awkward
 * about Select, Switch or NumberInput surfaces here before it reaches anyone
 * else's form.
 *
 * It owns no knowledge of the documentation registry. `controls` describes the
 * inputs, `render` draws the result and `code` writes the snippet; a composer
 * works the same in a README page, a design review or a prop explorer.
 *
 * State can be controlled. The uncontrolled default is what a docs page wants,
 * but a page that needs two composers in sync — a light and a dark preview of
 * one configuration — has to be able to lift it.
 */
export type ComposerValue = string | boolean | number

export type ComposerControl =
  | {
      type: 'select'
      prop: string
      label: string
      options: readonly string[]
      default: string
    }
  | { type: 'boolean'; prop: string; label: string; default: boolean }
  | {
      type: 'text'
      prop: string
      label: string
      default: string
      placeholder?: string
    }
  | {
      type: 'number'
      prop: string
      label: string
      default: number
      min?: number
      max?: number
      step?: number
    }
  | { type: 'color'; prop: string; label: string; default: string }

export type ComposerState = Record<string, ComposerValue>

function initialState(controls: ComposerControl[]): ComposerState {
  return Object.fromEntries(controls.map((control) => [control.prop, control.default]))
}

type ComposerProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  controls: ComposerControl[]
  /** Draws the live result. */
  render: (state: ComposerState) => ReactNode
  /** Source for the current state, shown beneath the preview. */
  code?: (state: ComposerState) => string
  language?: Language
  /** Centre the preview in a taller box, for anything with real height. */
  tall?: boolean
  panelLabel?: ReactNode
  state?: ComposerState
  onStateChange?: (state: ComposerState) => void
  resetLabel?: ReactNode
}

function Composer({
  controls,
  render,
  code,
  language = 'tsx',
  tall = false,
  panelLabel = 'Props',
  state: stateProp,
  onStateChange,
  resetLabel = 'Reset',
  className,
  ...props
}: ComposerProps) {
  const controlled = stateProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(() => initialState(controls))
  const state = controlled ? stateProp : uncontrolled

  const dirty = controls.some((control) => state[control.prop] !== control.default)
  // Two composers on one page is the ordinary docs case, so field ids are
  // namespaced per instance rather than derived from the prop name alone.
  const fieldScope = useId()

  function set(next: ComposerState) {
    if (!controlled) setUncontrolled(next)
    onStateChange?.(next)
  }

  return (
    <Card data-slot="composer" className={cn('overflow-hidden', className)} {...props}>
      {/* Panel beside the preview on wide screens, beneath it on narrow ones —
          a 280px control column leaves nothing for the preview on a phone. */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <CardBody
          className={cn(
            'flex items-center justify-center',
            tall ? 'min-h-80' : 'min-h-48',
          )}
        >
          {render(state)}
        </CardBody>

        <div className="border-border flex flex-col border-t lg:border-t-0 lg:border-s">
          {/* A real CardHeader, not a label with a rule under it: the panel
              gets the same header band as every other card in the kit, and the
              band's own border replaces the Separator. */}
          <CardHeader className="flex-row items-center justify-between gap-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {panelLabel}
            </span>
            {dirty && (
              <Button
                variant="ghost"
                size="xs"
                className="-me-2"
                onClick={() => set(initialState(controls))}
              >
                <RotateCcw />
                {resetLabel}
              </Button>
            )}
          </CardHeader>

          <div className="bg-secondary/40 flex flex-1 flex-col gap-3.5 p-4.5">
            {controls.map((control) => (
              <ComposerField
                key={control.prop}
                scope={fieldScope}
                control={control}
                value={state[control.prop]}
                onChange={(value) => set({ ...state, [control.prop]: value })}
              />
            ))}

            {controls.length === 0 && (
              <p className="text-muted-foreground text-xs">
                No props to configure.
              </p>
            )}
          </div>
        </div>
      </div>

      {code && (
        <div className="border-border border-t p-3">
          <CodeBlock code={code(state)} language={language} />
        </div>
      )}
    </Card>
  )
}

/** One row of the control panel. */
function ComposerField({
  control,
  value,
  onChange,
  scope,
}: {
  control: ComposerControl
  value: ComposerValue
  onChange: (value: ComposerValue) => void
  scope: string
  resetLabel?: ReactNode
}) {
  const id = `${scope}-${control.prop}`

  // A switch carries its own label, so it needs no Label above it.
  if (control.type === 'boolean') {
    return (
      <Switch
        id={id}
        size="sm"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
        label={<span className="font-mono text-xs">{control.label}</span>}
        labelPosition="start"
        containerClassName="justify-between w-full"
      />
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="font-mono text-xs">
        {control.label}
      </Label>

      {control.type === 'select' && (
        <Select
          size="sm"
          value={String(value)}
          onValueChange={onChange}
          options={control.options.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      )}

      {control.type === 'text' && (
        <Input
          id={id}
          size="sm"
          value={String(value)}
          placeholder={control.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {control.type === 'number' && (
        <NumberInput
          id={id}
          size="sm"
          value={Number(value)}
          min={control.min}
          max={control.max}
          step={control.step}
          onValueChange={(next) => onChange(next ?? 0)}
        />
      )}

      {control.type === 'color' && (
        <ColorPicker
          size="sm"
          clearable
          value={String(value)}
          onValueChange={onChange}
        />
      )}
    </div>
  )
}

export { Composer, initialState as composerInitialState }
export type { ComposerProps }
