import {
  createContext,
  use,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Headless radio group. Native `<input type="radio">` elements already give
 * roving focus, arrow-key movement and form submission for free, so this only
 * has to share the group's name, value and change handler — and own the
 * controlled/uncontrolled split so items stay dumb.
 */

type RadioGroupContextValue = {
  name: string
  value: string | undefined
  select: (value: string) => void
  disabled: boolean
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

export function useRadioGroup() {
  const context = use(RadioGroupContext)
  if (!context) throw new Error('<Radio> must be used inside <RadioGroup>')
  return context
}

type RadioGroupProviderProps = {
  name?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: ReactNode
}

export function RadioGroupProvider({
  name,
  value: valueProp,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
}: RadioGroupProviderProps) {
  const generated = useId()
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      name: name ?? generated,
      value,
      disabled,
      select: (next) => {
        if (!controlled) setUncontrolled(next)
        onValueChange?.(next)
      },
    }),
    [name, generated, value, disabled, controlled, onValueChange],
  )

  return <RadioGroupContext value={context}>{children}</RadioGroupContext>
}
