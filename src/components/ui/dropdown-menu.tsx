import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Check } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper, type Align, type Side } from '@/components/primitives/popper'
import { Slot } from '@/components/primitives/slot'
import { menuItem, menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A menu of actions hung off a trigger.
 *
 * Unlike Select this is a list of commands, not a value — so items are buttons
 * with `role="menuitem"`, the menu closes on activation, and focus goes back to
 * the trigger. Roving focus is done by querying the menu on keydown, which keeps
 * conditionally rendered items in the right order.
 */
type MenuContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const MenuContext = createContext<MenuContextValue | null>(null)

function useMenu() {
  const context = use(MenuContext)
  if (!context) throw new Error('Must be used inside <DropdownMenu>')
  return context
}

function items(container: HTMLElement | null) {
  if (!container) return []
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([data-disabled="true"]),[role="menuitemcheckbox"]:not([data-disabled="true"])',
    ),
  )
}

function DropdownMenu({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const controlled = openProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ? openProp : uncontrolled

  const triggerRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const context = useMemo<MenuContextValue>(
    () => ({
      open,
      triggerRef,
      contentRef,
      setOpen: (next) => {
        if (!controlled) setUncontrolled(next)
        onOpenChange?.(next)
        if (!next) triggerRef.current?.focus()
      },
    }),
    [open, controlled, onOpenChange],
  )

  return <MenuContext value={context}>{children}</MenuContext>
}

function DropdownMenuTrigger({
  asChild = false,
  onClick,
  onKeyDown,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
  const { open, setOpen, triggerRef, contentRef } = useMenu()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      data-slot="dropdown-menu-trigger"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!open)
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
          event.preventDefault()
          setOpen(true)
          // Wait a frame so the menu exists before focus moves into it.
          requestAnimationFrame(() => items(contentRef.current)[0]?.focus())
        }
      }}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  side = 'bottom',
  align = 'start',
  offset = 6,
  ...props
}: ComponentProps<'div'> & { side?: Side; align?: Align; offset?: number }) {
  const { open, setOpen, triggerRef, contentRef } = useMenu()

  const { style, side: resolved } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: contentRef,
    side,
    align,
    offset,
  })

  useDismissable({
    open,
    onDismiss: () => setOpen(false),
    refs: [triggerRef, contentRef],
  })

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() =>
      items(contentRef.current)[0]?.focus(),
    )
    return () => cancelAnimationFrame(frame)
  }, [open, contentRef])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      role="menu"
      data-slot="dropdown-menu-content"
      data-side={resolved}
      style={style}
      onKeyDown={(event) => {
        const list = items(contentRef.current)
        if (list.length === 0) return
        const index = list.indexOf(document.activeElement as HTMLElement)

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          list[(index + 1) % list.length]?.focus()
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          list[(index - 1 + list.length) % list.length]?.focus()
        } else if (event.key === 'Home') {
          event.preventDefault()
          list[0]?.focus()
        } else if (event.key === 'End') {
          event.preventDefault()
          list[list.length - 1]?.focus()
        }
      }}
      className={cn(menuSurface, radius.surface, 'min-w-48', className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  disabled,
  onSelect,
  onClick,
  ...props
}: Omit<ComponentProps<'button'>, 'onSelect'> & {
  /** Fires on activation, before the menu closes. */
  onSelect?: () => void
}) {
  const { setOpen } = useMenu()

  return (
    <button
      type="button"
      role="menuitem"
      data-slot="dropdown-menu-item"
      data-disabled={disabled || undefined}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        onSelect?.()
        setOpen(false)
      }}
      className={cn(menuItem, radius.control, className)}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  checked = false,
  disabled,
  onCheckedChange,
  children,
  ...props
}: Omit<ComponentProps<'button'>, 'onChange'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      data-slot="dropdown-menu-checkbox-item"
      data-disabled={disabled || undefined}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(menuItem, radius.control, className)}
      {...props}
    >
      <span className="flex-1">{children}</span>
      {checked && <Check className="size-3.5 shrink-0" />}
    </button>
  )
}

function DropdownMenuLabel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(
        'text-muted-foreground px-2.5 py-1.5 text-xs font-medium',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      data-slot="dropdown-menu-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'text-muted-foreground ms-auto font-mono text-xs tracking-widest',
        className,
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
}
