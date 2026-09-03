import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * Headless tabs. Owns the selected value, the ids that wire a trigger to its
 * panel, and the arrow-key roving the WAI-ARIA tabs pattern expects.
 *
 * Triggers are found by querying the list on keydown rather than registering
 * themselves: tabs can be composed, wrapped or conditionally rendered, and a
 * registry would drift out of order the moment they are.
 */
type TabsContextValue = {
  value: string | undefined
  select: (value: string) => void
  orientation: 'horizontal' | 'vertical'
  activationMode: 'automatic' | 'manual'
  baseId: string
  onListKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function useTabs() {
  const context = use(TabsContext)
  if (!context) throw new Error('Must be used inside <Tabs>')
  return context
}

export function tabIds(baseId: string, value: string) {
  return {
    trigger: `${baseId}-trigger-${value}`,
    panel: `${baseId}-panel-${value}`,
  }
}

type TabsProviderProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  orientation?: 'horizontal' | 'vertical'
  activationMode?: 'automatic' | 'manual'
  children: ReactNode
}

export function TabsProvider({
  value: valueProp,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  activationMode = 'automatic',
  children,
}: TabsProviderProps) {
  const baseId = useId()
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const select = useCallback(
    (next: string) => {
      if (!controlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [controlled, onValueChange],
  )

  const onListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const [previous, next] =
        orientation === 'vertical'
          ? ['ArrowUp', 'ArrowDown']
          : ['ArrowLeft', 'ArrowRight']

      const keys = [previous, next, 'Home', 'End']
      if (!keys.includes(event.key)) return

      const list = event.currentTarget
      const triggers = Array.from(
        list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'),
      )
      if (triggers.length === 0) return

      const current = triggers.indexOf(document.activeElement as HTMLElement)
      let target = current

      if (event.key === 'Home') target = 0
      else if (event.key === 'End') target = triggers.length - 1
      else if (event.key === next)
        target = (current + 1 + triggers.length) % triggers.length
      else target = (current - 1 + triggers.length) % triggers.length

      event.preventDefault()
      const element = triggers[target]
      element?.focus()

      // Automatic activation selects as focus moves; manual waits for Enter or
      // Space, which the trigger's click handler already covers.
      if (activationMode === 'automatic') {
        const nextValue = element?.dataset.value
        if (nextValue) select(nextValue)
      }
    },
    [orientation, activationMode, select],
  )

  const context = useMemo<TabsContextValue>(
    () => ({
      value,
      select,
      orientation,
      activationMode,
      baseId,
      onListKeyDown,
    }),
    [value, select, orientation, activationMode, baseId, onListKeyDown],
  )

  return <TabsContext value={context}>{children}</TabsContext>
}
