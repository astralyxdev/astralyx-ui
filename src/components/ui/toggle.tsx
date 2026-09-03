import {
  createContext,
  use,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { controlBase, controlSize } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A button that stays pressed.
 *
 * `aria-pressed` rather than a checkbox: this is a control that changes state,
 * not a value submitted with a form. ToggleGroup adds single or multiple
 * selection on top without changing the item.
 */
const toggleVariants = cva(controlBase, {
  variants: {
    variant: {
      default:
        'bg-transparent hover:bg-accent hover:text-accent-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground',
      outline:
        'border-border border bg-transparent hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary',
    },
    size: {
      sm: controlSize.sm,
      default: controlSize.md,
      lg: controlSize.lg,
      icon: controlSize.icon,
      'icon-sm': controlSize.iconSm,
      'icon-lg': controlSize.iconLg,
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

type ToggleProps = Omit<ComponentProps<'button'>, 'value'> &
  VariantProps<typeof toggleVariants> & {
    pressed?: boolean
    defaultPressed?: boolean
    onPressedChange?: (pressed: boolean) => void
  }

function Toggle({
  className,
  variant,
  size,
  pressed: pressedProp,
  defaultPressed = false,
  onPressedChange,
  onClick,
  ...props
}: ToggleProps) {
  const controlled = pressedProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultPressed)
  const pressed = controlled ? pressedProp : uncontrolled

  return (
    <button
      type="button"
      data-slot="toggle"
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (!controlled) setUncontrolled(!pressed)
        onPressedChange?.(!pressed)
      }}
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  )
}

type GroupContextValue = {
  value: string[]
  toggle: (value: string) => void
  variant: ToggleProps['variant']
  size: ToggleProps['size']
}

const GroupContext = createContext<GroupContextValue | null>(null)

type ToggleGroupProps = Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  type?: 'single' | 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  variant?: ToggleProps['variant']
  size?: ToggleProps['size']
  children: ReactNode
}

function ToggleGroup({
  className,
  type = 'single',
  value: valueProp,
  defaultValue = [],
  onValueChange,
  variant,
  size,
  ...props
}: ToggleGroupProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const context = useMemo<GroupContextValue>(
    () => ({
      value,
      variant,
      size,
      toggle: (item) => {
        const next =
          type === 'single'
            ? value.includes(item)
              ? []
              : [item]
            : value.includes(item)
              ? value.filter((v) => v !== item)
              : [...value, item]

        if (!controlled) setUncontrolled(next)
        onValueChange?.(next)
      },
    }),
    [value, variant, size, type, controlled, onValueChange],
  )

  return (
    <GroupContext value={context}>
      <div
        role="group"
        data-slot="toggle-group"
        className={cn('flex items-center gap-1', className)}
        {...props}
      />
    </GroupContext>
  )
}

function ToggleGroupItem({
  value,
  className,
  ...props
}: Omit<ToggleProps, 'pressed' | 'onPressedChange'> & { value: string }) {
  const group = use(GroupContext)
  if (!group) throw new Error('<ToggleGroupItem> must be inside <ToggleGroup>')

  return (
    <Toggle
      pressed={group.value.includes(value)}
      onPressedChange={() => group.toggle(value)}
      variant={props.variant ?? group.variant}
      size={props.size ?? group.size}
      className={className}
      {...props}
    />
  )
}

export { Toggle, ToggleGroup, ToggleGroupItem, toggleVariants }
export type { ToggleProps }
