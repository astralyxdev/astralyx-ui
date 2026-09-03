import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import {
  focusRing,
  interactive,
  menuSurface,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A site navigation bar with mega-menu panels.
 *
 * Hover intent, not raw hover. Opening the instant the pointer touches a
 * trigger makes a nav bar flash panels as you cross it on the way somewhere
 * else, and closing the instant it leaves makes the panel impossible to reach —
 * the pointer has to cross the gap between trigger and panel. A short open
 * delay and a longer close delay fix both.
 *
 * Once any panel is open, switching between triggers is immediate. The delay
 * exists to decide whether you meant to open the menu at all; once that is
 * settled, waiting again is just latency.
 *
 * Keyboard users get click-to-open, and the panel is reachable by Tab because
 * it follows its trigger in the DOM.
 */
export type NavigationMenuEntry = {
  id: string
  label: string
  href?: string
  /** Presence makes this a panel trigger rather than a link. */
  content?: ReactNode
}

function NavigationMenu({
  entries,
  openDelay = 150,
  closeDelay = 250,
  className,
  ...props
}: ComponentProps<'nav'> & {
  entries: NavigationMenuEntry[]
  openDelay?: number
  closeDelay?: number
}) {
  const [open, setOpen] = useState<string | null>(null)
  const timer = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  function schedule(next: string | null, delay: number) {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), delay)
  }

  return (
    <nav
      data-slot="navigation-menu"
      onPointerLeave={() => schedule(null, closeDelay)}
      className={cn('flex items-center gap-0.5', className)}
      {...props}
    >
      {entries.map((entry) =>
        entry.content ? (
          <NavigationMenuItem
            key={entry.id}
            entry={entry}
            open={open === entry.id}
            // Immediate once something is already open — the delay was only
            // ever about deciding whether to open at all.
            onHover={() => schedule(entry.id, open ? 0 : openDelay)}
            onToggle={() => {
              clearTimeout(timer.current)
              setOpen(open === entry.id ? null : entry.id)
            }}
            onClose={() => {
              clearTimeout(timer.current)
              setOpen(null)
            }}
          />
        ) : (
          <a
            key={entry.id}
            href={entry.href}
            onPointerEnter={() => schedule(null, closeDelay)}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-accent flex h-8 items-center px-3 text-sm font-medium',
              radius.control,
              interactive,
              focusRing,
            )}
          >
            {entry.label}
          </a>
        ),
      )}
    </nav>
  )
}

function NavigationMenuItem({
  entry,
  open,
  onHover,
  onToggle,
  onClose,
}: {
  entry: NavigationMenuEntry
  open: boolean
  onHover: () => void
  onToggle: () => void
  onClose: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { style } = usePopper({
    open,
    anchorRef: triggerRef,
    floatingRef: panelRef,
    side: 'bottom',
    align: 'start',
    offset: 8,
  })

  useDismissable({
    open,
    onDismiss: () => {
      onClose()
      triggerRef.current?.focus()
    },
    refs: [triggerRef, panelRef],
  })

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={onToggle}
        onPointerEnter={onHover}
        className={cn(
          'text-muted-foreground hover:text-foreground hover:bg-accent flex h-8 items-center gap-1 px-3 text-sm font-medium',
          radius.control,
          interactive,
          focusRing,
          open && 'bg-accent text-foreground',
        )}
      >
        {entry.label}
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={style}
          onPointerEnter={onHover}
          className={cn(menuSurface, radius.panel, 'w-max max-w-[min(48rem,calc(100vw-2rem))] p-4')}
        >
          {entry.content}
        </div>
      )}
    </>
  )
}

/** A titled column inside a panel. */
function NavigationMenuSection({
  title,
  className,
  ...props
}: ComponentProps<'div'> & { title?: ReactNode }) {
  return (
    <div className={cn('flex min-w-48 flex-col gap-1', className)} {...props}>
      {title && (
        <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
          {title}
        </h3>
      )}
    </div>
  )
}

/** A link inside a panel: title plus a line of description. */
function NavigationMenuLink({
  title,
  description,
  className,
  ...props
}: Omit<ComponentProps<'a'>, 'title'> & {
  title: ReactNode
  description?: ReactNode
}) {
  return (
    <a
      className={cn(
        'hover:bg-accent flex flex-col gap-0.5 p-2',
        radius.control,
        interactive,
        focusRing,
        className,
      )}
      {...props}
    >
      <span className="text-sm font-medium">{title}</span>
      {description && (
        <span className="text-muted-foreground text-xs">{description}</span>
      )}
    </a>
  )
}

export {
  NavigationMenu,
  NavigationMenuLink,
  NavigationMenuSection,
}
