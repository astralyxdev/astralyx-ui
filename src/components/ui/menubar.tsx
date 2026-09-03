import {
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import {
  focusRing,
  interactive,
  menuItem,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An application menu bar — File, Edit, View.
 *
 * The behaviour that makes it a menu bar rather than a row of dropdowns: once
 * one menu is open, moving along the bar opens the next one instead of merely
 * focusing it. That is what everyone expects from a desktop menu, and a row of
 * independent dropdowns feels broken by comparison.
 *
 * Arrow keys move between menus; the bar is one tab stop. Left and Right belong
 * to the bar, Up and Down to the open menu.
 */
export type MenubarItem = {
  id: string
  label: ReactNode
  shortcut?: string
  disabled?: boolean
  separatorBefore?: boolean
  onSelect?: () => void
}

export type MenubarMenu = {
  id: string
  label: string
  items: MenubarItem[]
}

function Menubar({
  menus,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & { menus: MenubarMenu[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [focused, setFocused] = useState(0)
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([])
  const barRef = useRef<HTMLDivElement>(null)

  function focusMenu(index: number) {
    const next = (index + menus.length) % menus.length
    setFocused(next)
    triggerRefs.current[next]?.focus()
    // Already open? Move the open menu along with focus.
    if (open) setOpen(menus[next].id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusMenu(focused + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusMenu(focused - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusMenu(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusMenu(menus.length - 1)
    } else if (event.key === 'Escape') {
      setOpen(null)
    }
  }

  return (
    <div
      ref={barRef}
      role="menubar"
      data-slot="menubar"
      onKeyDown={onKeyDown}
      className={cn('bg-card border-border flex items-center gap-0.5 border p-1', radius.control, className)}
      {...props}
    >
      {menus.map((menu, index) => (
        <MenubarTrigger
          key={menu.id}
          ref={(node) => {
            triggerRefs.current[index] = node
          }}
          menu={menu}
          open={open === menu.id}
          tabIndex={index === focused ? 0 : -1}
          onOpen={() => {
            setFocused(index)
            setOpen(open === menu.id ? null : menu.id)
          }}
          // Hovering a sibling while a menu is open switches to it, which is
          // what makes the bar feel like one control.
          onHover={() => {
            if (!open) return
            setFocused(index)
            setOpen(menu.id)
          }}
          onClose={() => {
            setOpen(null)
            triggerRefs.current[index]?.focus()
          }}
        />
      ))}
    </div>
  )
}

function MenubarTrigger({
  ref,
  menu,
  open,
  tabIndex,
  onOpen,
  onHover,
  onClose,
}: {
  ref?: React.Ref<HTMLButtonElement>
  menu: MenubarMenu
  open: boolean
  tabIndex: number
  onOpen: () => void
  onHover: () => void
  onClose: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [highlighted, setHighlighted] = useState(0)

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
    onDismiss: onClose,
    refs: [triggerRef, panelRef],
  })

  const enabled = menu.items.filter((item) => !item.disabled)

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((index) => (index + 1) % enabled.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => (index - 1 + enabled.length) % enabled.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const item = enabled[highlighted]
      item?.onSelect?.()
      onClose()
    }
    // Left and Right deliberately bubble: they belong to the bar.
  }

  return (
    <>
      <button
        ref={(node) => {
          triggerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.RefObject<HTMLButtonElement | null>).current = node
        }}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={tabIndex}
        onClick={onOpen}
        onPointerEnter={onHover}
        className={cn(
          'text-muted-foreground hover:text-foreground hover:bg-accent h-7 px-2.5 text-sm',
          radius.xs,
          interactive,
          focusRing,
          open && 'bg-accent text-foreground',
        )}
      >
        {menu.label}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={menu.label}
          tabIndex={-1}
          style={style}
          onKeyDown={onPanelKeyDown}
          className={cn(menuSurface, radius.surface, 'min-w-48 outline-none')}
        >
          {menu.items.map((item) => (
            <div key={item.id}>
              {item.separatorBefore && (
                <div role="separator" className="bg-border -mx-1 my-1 h-px" />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                data-disabled={item.disabled}
                data-highlighted={enabled.indexOf(item) === highlighted || undefined}
                onPointerEnter={() => setHighlighted(enabled.indexOf(item))}
                onClick={() => {
                  item.onSelect?.()
                  onClose()
                }}
                className={cn(menuItem, radius.control)}
              >
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-muted-foreground font-mono text-xs">
                    {item.shortcut}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export { Menubar }
