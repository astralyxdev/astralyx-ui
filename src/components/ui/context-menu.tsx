import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useDismissable } from '@/components/primitives/dismissable'
import { menuItem, menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A menu opened by right-click, positioned at the pointer.
 *
 * Unlike the other layers this has no element to anchor to — the anchor is a
 * point. It clamps against the viewport itself rather than flipping, since a
 * context menu should open down-and-right from the cursor whenever it fits.
 */
export type ContextMenuItem = {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  destructive?: boolean
  separatorBefore?: boolean
  onSelect?: () => void
}

function ContextMenu({
  items,
  children,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  items: ContextMenuItem[]
  children: ReactNode
}) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useDismissable({
    open: point !== null,
    onDismiss: () => setPoint(null),
    refs: [menuRef],
  })

  // Measure after mount, then pull the menu back inside the viewport.
  useEffect(() => {
    if (!point || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const x = Math.min(point.x, window.innerWidth - rect.width - 8)
    const y = Math.min(point.y, window.innerHeight - rect.height - 8)
    if (x !== point.x || y !== point.y) setPoint({ x, y })
  }, [point])

  return (
    <>
      <div
        ref={triggerRef}
        data-slot="context-menu-trigger"
        onContextMenu={(event) => {
          event.preventDefault()
          setPoint({ x: event.clientX, y: event.clientY })
        }}
        className={className}
        {...props}
      >
        {children}
      </div>

      {point && (
        <div
          ref={menuRef}
          role="menu"
          data-slot="context-menu"
          style={{ position: 'fixed', top: point.y, left: point.x }}
          className={cn(menuSurface, radius.surface, 'min-w-48')}
        >
          {items.map((item) => (
            <div key={item.id}>
              {item.separatorBefore && (
                <div role="separator" className="bg-border -mx-1 my-1 h-px" />
              )}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                data-disabled={item.disabled}
                onClick={() => {
                  item.onSelect?.()
                  setPoint(null)
                }}
                className={cn(
                  menuItem,
                  radius.control,
                  item.destructive && 'text-[var(--destructive-soft-foreground)]',
                )}
              >
                {item.icon}
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

export { ContextMenu }
