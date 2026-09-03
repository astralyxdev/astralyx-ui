import { useRef, useState, type ComponentProps } from 'react'
import { Check, Pipette, X } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import { readableInk } from '@/components/ui/label-picker'
import {
  fieldBase,
  fieldInput,
  fieldSize,
  focusRing,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Pick a colour from a swatch set, or type one.
 *
 * A palette first, free entry second. Most product colour pickers exist to
 * choose a label or a category colour, where an arbitrary hex is a liability —
 * a saturation-value gradient invites a colour nobody can read text on.
 *
 * The native `input[type=color]` is offered as an escape hatch rather than the
 * main control: it opens the OS picker, which cannot be styled and looks
 * nothing like the rest of a form.
 *
 * Swatch ticks use `readableInk`, shared with `LabelPicker`, so the check mark
 * is visible on both a pale yellow and a navy.
 *
 * `clearable` exists because "no colour" is a real value, not an empty state —
 * a tint that falls back to a named colour set, a label with no colour yet. The
 * trigger says so in words rather than showing an empty swatch.
 */
const DEFAULT_SWATCHES = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#78716c', '#64748b', '#0f172a',
]

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_SWATCH_LABEL: (colour: string) => string = (colour) => `Colour ${colour}`

function ColorPicker({
  value: valueProp,
  defaultValue = '#3b82f6',
  onValueChange,
  swatches = DEFAULT_SWATCHES,
  allowCustom = true,
  clearable = false,
  unsetLabel = 'Unset',
  chooseLabel = 'Choose a colour',
  clearLabel = 'Clear colour',
  hexLabel = 'Hex colour',
  systemPickerLabel = 'Open the system colour picker',
  swatchLabel = DEFAULT_SWATCH_LABEL,
  size = 'md',
  variant = 'default',
  disabled = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  swatches?: string[]
  /** Show the hex field and the native picker. */
  allowCustom?: boolean
  /** Allow clearing back to no colour. */
  clearable?: boolean
  unsetLabel?: string
  /** Accessible name for the trigger when nothing is chosen. */
  chooseLabel?: string
  clearLabel?: string
  /** Accessible name for the hex field. */
  hexLabel?: string
  systemPickerLabel?: string
  /** Accessible name for a swatch, given its value. */
  swatchLabel?: (colour: string) => string
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  disabled?: boolean
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { style } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side: 'bottom',
    align: 'start',
    offset: 4,
  })

  useDismissable({
    open,
    onDismiss: () => {
      setOpen(false)
      triggerRef.current?.focus()
    },
    refs: [triggerRef, panelRef],
  })

  function commit(next: string) {
    if (!controlled) setUncontrolled(next)
    setDraft(next)
    onValueChange?.(next)
  }

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'hover:bg-accent border border-transparent bg-transparent',
  }[variant]

  return (
    <div data-slot="color-picker" className={cn('relative w-full', className)} {...props}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        // Named explicitly: with no value the trigger has no text of its own,
        // which would leave the button unnamed.
        aria-label={value ? swatchLabel(value) : chooseLabel}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          fieldBase,
          fieldSize[size],
          VARIANT,
          'justify-start text-start',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <span
          aria-hidden="true"
          style={value ? { backgroundColor: value } : undefined}
          className={cn(
            'border-border size-4 shrink-0 border',
            radius.xs,
            // No colour reads as a struck-through swatch, not a white one.
            !value && 'bg-secondary relative overflow-hidden',
          )}
        >
          {!value && (
            <span className="bg-border absolute inset-x-[-2px] top-1/2 h-px rotate-45" />
          )}
        </span>

        <span
          className={cn(
            'min-w-0 flex-1 truncate font-mono text-sm uppercase',
            !value && 'text-muted-foreground/70 normal-case',
          )}
        >
          {value || unsetLabel}
        </span>

        {clearable && value && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={clearLabel}
            onClick={(event) => {
              event.stopPropagation()
              commit('')
            }}
            className="text-muted-foreground hover:text-foreground flex size-4 shrink-0 items-center justify-center rounded-sm"
          >
            <X className="size-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={style}
          role="dialog"
          aria-label={chooseLabel}
          className={cn(menuSurface, radius.surface, 'w-60 p-2')}
        >
          <div className="grid grid-cols-5 gap-1.5">
            {swatches.map((swatch) => {
              const selected = swatch.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  aria-pressed={selected}
                  style={{ backgroundColor: swatch }}
                  onClick={() => commit(swatch)}
                  className={cn(
                    'flex aspect-square items-center justify-center',
                    radius.xs,
                    focusRing,
                    'transition-transform duration-150 ease-out motion-reduce:transition-none',
                  )}
                >
                  {selected && (
                    <Check className="size-3.5" style={{ color: readableInk(swatch) }} />
                  )}
                </button>
              )
            })}
          </div>

          {allowCustom && (
            <div className="border-border mt-2 flex items-center gap-1.5 border-t pt-2">
              <span
                aria-hidden="true"
                style={{ backgroundColor: HEX.test(draft) ? draft : value }}
                className={cn('border-border size-6 shrink-0 border', radius.xs)}
              />

              <input
                value={draft}
                aria-label={hexLabel}
                spellCheck={false}
                onChange={(event) => {
                  const next = event.target.value
                  setDraft(next)
                  // Only commit a value that parses, so a half-typed hex does
                  // not repaint everything mid-keystroke.
                  if (HEX.test(next)) commit(next)
                }}
                className={cn(
                  fieldInput,
                  'border-border h-7 min-w-0 flex-1 border px-2 font-mono text-xs uppercase',
                  radius.xs,
                )}
              />

              <label
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-accent flex size-7 shrink-0 cursor-pointer items-center justify-center',
                  radius.xs,
                  'transition-colors duration-150 ease-out motion-reduce:transition-none',
                )}
              >
                <Pipette className="size-3.5" />
                <span className="sr-only">{systemPickerLabel}</span>
                <input
                  type="color"
                  value={HEX.test(draft) ? draft : value}
                  onChange={(event) => commit(event.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { ColorPicker, DEFAULT_SWATCHES }
