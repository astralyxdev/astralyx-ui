import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'
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
  /**
   * Offer a button that gives the playground the whole screen.
   *
   * Worth turning off for a composer driving something small, where the room is
   * not the constraint and the button is just another thing in the header.
   */
  fullscreen?: boolean
  fullscreenLabel?: string
  exitFullscreenLabel?: string
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
  fullscreen = true,
  fullscreenLabel = 'Expand to full screen',
  exitFullscreenLabel = 'Exit full screen',
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

  const shellRef = useRef<HTMLDivElement>(null)
  const { expanded, toggle } = useExpand(shellRef)

  return (
    <Card
      ref={shellRef}
      data-slot="composer"
      data-expanded={expanded || undefined}
      className={cn(
        'overflow-hidden',
        // Filling the screen is the same shape either way: the browser sizes a
        // fullscreen element itself, and these are what the fallback needs.
        expanded && 'fixed inset-0 z-50 rounded-none',
        className,
      )}
      {...props}
    >
      {/* Panel beside the preview on wide screens, beneath it on narrow ones —
          a 280px control column leaves nothing for the preview on a phone. */}
      <div
        className={cn(
          'grid lg:grid-cols-[minmax(0,1fr)_280px]',
          // `min-h-0` or the preview refuses to shrink and pushes the code
          // block off the bottom of the screen instead of scrolling.
          expanded && 'min-h-0 flex-1',
        )}
      >
        <CardBody
          className={cn(
            'flex items-center justify-center',
            expanded ? 'min-h-0 overflow-auto' : tall ? 'min-h-80' : 'min-h-48',
          )}
        >
          {render(state)}
        </CardBody>

        <div
          className={cn(
            'border-border flex flex-col border-t lg:border-t-0 lg:border-s',
            expanded && 'min-h-0',
          )}
        >
          {/* A real CardHeader, not a label with a rule under it: the panel
              gets the same header band as every other card in the kit, and the
              band's own border replaces the Separator. */}
          <CardHeader className="flex-row items-center justify-between gap-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {panelLabel}
            </span>
            <span className="-me-2 flex items-center gap-1">
              {dirty && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => set(initialState(controls))}
                >
                  <RotateCcw />
                  {resetLabel}
                </Button>
              )}
              {fullscreen && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={expanded ? exitFullscreenLabel : fullscreenLabel}
                  onClick={toggle}
                >
                  {expanded ? <Minimize2 /> : <Maximize2 />}
                </Button>
              )}
            </span>
          </CardHeader>

          <div
            className={cn(
              'bg-secondary/40 flex flex-1 flex-col gap-3.5 p-4.5',
              expanded && 'overflow-y-auto',
            )}
          >
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
        <div
          className={cn(
            'border-border border-t p-3',
            // Capped rather than free, so the source never crowds out the
            // preview the screen was given over to.
            expanded && 'max-h-[40vh] shrink-0 overflow-auto',
          )}
        >
          <CodeBlock code={code(state)} language={language} />
        </div>
      )}
    </Card>
  )
}

/**
 * Fill the screen, by whichever route the browser allows.
 *
 * The Fullscreen API is the one that means it — the page chrome goes too, and
 * Escape is handled for us. It is not everywhere: iPhone Safari exposes no
 * element fullscreen at all, and a request can be refused outright. So a
 * refusal falls back to covering the viewport instead, which is the same thing
 * minus the browser's own furniture, and never leaves a button that does
 * nothing.
 *
 * Fullscreen can also be left without asking us — Escape, or the browser's own
 * control — so the state is read back from `fullscreenchange` rather than
 * assumed from the click that started it.
 */
function useExpand(ref: React.RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const expanded = native || overlay

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement === ref.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [ref])

  // Only the fallback needs these: in real fullscreen the browser already owns
  // Escape, and the page behind is not being scrolled past.
  useEffect(() => {
    if (!overlay) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverlay(false)
    }
    window.addEventListener('keydown', onKeyDown)

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [overlay])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    if (overlay) {
      setOverlay(false)
      return
    }

    const element = ref.current
    if (element?.requestFullscreen && document.fullscreenEnabled) {
      // A rejected request resolves nothing and throws asynchronously, which is
      // why the fallback is chained rather than decided up front.
      element.requestFullscreen().catch(() => setOverlay(true))
      return
    }
    setOverlay(true)
  }, [overlay, ref])

  return { expanded, toggle }
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
