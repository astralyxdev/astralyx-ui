import {
  createContext,
  use,
  useMemo,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type Ref,
  type RefObject,
} from 'react'

/**
 * A headless text field, modelled on Radix Themes' `TextField.Root` /
 * `TextField.Slot` split: the box, the control and the adornments are three
 * separate parts, and this file owns only their behaviour — no styling.
 *
 * The behaviour worth having is focus delegation. A styled field is a box
 * around an `<input>`, so the padding and any icon are not the input; clicking
 * them would otherwise do nothing, or worse, blur the field. Root captures
 * those clicks and forwards focus to the control.
 */

type FieldContextValue = {
  controlRef: RefObject<HTMLInputElement | null>
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useFieldContext(part: string) {
  const context = use(FieldContext)

  if (!context) {
    throw new Error(`${part} must be used inside <Field.Root>`)
  }

  return context
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }
  }
}

/** Anything matching this already handles its own clicks. */
const INTERACTIVE = 'input, textarea, select, button, a, [data-field-interactive]'

function FieldRoot({ onMouseDown, children, ...props }: ComponentProps<'div'>) {
  const controlRef = useRef<HTMLInputElement>(null)
  const context = useMemo(() => ({ controlRef }), [])

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    onMouseDown?.(event)

    if (event.defaultPrevented || event.button !== 0) return

    const target = event.target as HTMLElement
    if (target.closest(INTERACTIVE)) return

    // Suppress the default so the press never moves focus off the control.
    event.preventDefault()
    controlRef.current?.focus()
  }

  return (
    <FieldContext value={context}>
      <div data-slot="field" onMouseDown={handleMouseDown} {...props}>
        {children}
      </div>
    </FieldContext>
  )
}

function FieldControl({ ref, ...props }: ComponentProps<'input'>) {
  const { controlRef } = useFieldContext('Field.Control')

  return (
    <input
      data-slot="field-control"
      ref={mergeRefs(ref, controlRef)}
      {...props}
    />
  )
}

type FieldSlotProps = ComponentProps<'span'> & {
  side?: 'start' | 'end'
  /** Set when the slot holds something clickable, so Root leaves it alone. */
  interactive?: boolean
}

function FieldSlot({ side = 'start', interactive, ...props }: FieldSlotProps) {
  return (
    <span
      data-slot="field-slot"
      data-side={side}
      data-field-interactive={interactive || undefined}
      {...props}
    />
  )
}

const Field = {
  Root: FieldRoot,
  Control: FieldControl,
  Slot: FieldSlot,
}

export { Field, FieldControl, FieldRoot, FieldSlot, mergeRefs }
export type { FieldSlotProps }
