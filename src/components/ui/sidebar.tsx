import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { PanelLeft } from 'lucide-react'
import { Slot } from '@/components/primitives/slot'
import { useBreakpoint } from '@/components/primitives/media-query'
import { Tooltip } from '@/components/ui/tooltip'
import {
  disabledState,
  focusRing,
  iconChild,
  interactive,
  radius,
  sidebarInk,
  sidebarSurface,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An inset application frame: a transparent rail beside a rounded content
 * panel, both floating on the page background.
 *
 * Inset is the only layout, and icon is the only collapsed state. Those are
 * decisions, not omissions — an off-canvas sidebar needs an overlay, a scrim
 * and focus containment, and a flush sidebar needs a border that the inset
 * panel already provides by being a separate surface. Supporting one shape
 * well is what keeps the geometry exact.
 *
 * The grid, in one place:
 *
 *   gutter    8px   `p-2` on the frame, `gap-2` between rail and panel, and
 *                   `px-2` inside the rail — one value everywhere
 *   rail      52px  36 + 2×8: one control unit plus that same gutter either
 *                   side. The gutter is not decoration — a menu row's focus
 *                   ring is a 3px box-shadow, and `SidebarContent` scrolls,
 *                   so a rail sized to the button exactly would clip the ring
 *                   against its padding box on both edges
 *   expanded  256px `w-64`
 *   inset     10px  `px-2.5` on a menu row — (36 − 16) / 2, which holds a 16px
 *                   icon on the rail's centre line whether open or collapsed,
 *                   so nothing shifts sideways as the label appears
 */
const RAIL = 'w-13' // 52px — a 36px control unit plus an 8px gutter either side
const EXPANDED = 'w-64' // 256px

type SidebarContext = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  /** Below `md` the rail is forced closed and the trigger is inert. */
  locked: boolean
  id: string
}

const SidebarCtx = createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = use(SidebarCtx)
  if (!context) {
    throw new Error('useSidebar must be used inside a <SidebarProvider>')
  }
  return context
}

/**
 * The frame. Owns the open state and paints the page background the rail and
 * panel float on.
 *
 * Narrow viewports pin it collapsed rather than offering an overlay: the rail
 * is 36px, which is already the mobile layout. Nothing to open, nothing to
 * trap focus in, and the content panel keeps the full remaining width.
 */
function SidebarProvider({
  children,
  className,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  ...props
}: ComponentProps<'div'> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const controlled = openProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const wide = useBreakpoint('md')
  const id = useId()

  const open = (controlled ? openProp : uncontrolled) && wide

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )

  const toggle = useCallback(() => setOpen(!open), [open, setOpen])

  // Ctrl/Cmd-B, the conventional shortcut. Bound on the frame rather than the
  // document body would miss it when focus is inside the content panel.
  useEffect(() => {
    if (!wide) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [toggle, wide])

  return (
    <SidebarCtx value={{ open, setOpen, toggle, locked: !wide, id }}>
      <div
        data-slot="sidebar-provider"
        data-state={open ? 'expanded' : 'collapsed'}
        className={cn(
          sidebarSurface,
          'flex min-h-svh w-full gap-2 p-2',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarCtx>
  )
}

/**
 * The rail itself — transparent by design, so the frame's background reads as
 * one continuous surface behind it and only the content panel looks raised.
 *
 * Width is the one thing in the kit that animates on a size, and only here:
 * collapsing *is* the interaction, not a reaction to a pointer passing over
 * something. Hover and press stay colour-only everywhere, this component
 * included.
 */
function Sidebar({ className, children, ...props }: ComponentProps<'aside'>) {
  const { open, id } = useSidebar()

  return (
    <aside
      id={id}
      data-slot="sidebar"
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'group/sidebar flex shrink-0 flex-col gap-2 bg-transparent',
        'transition-[width] duration-200 ease-out motion-reduce:transition-none',
        open ? EXPANDED : RAIL,
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

/** Fixed top section — a product mark, a workspace switcher. */
function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex min-h-9 shrink-0 flex-col gap-2 px-2', className)}
      {...props}
    />
  )
}

/**
 * The scrolling middle.
 *
 * Its `px-2` is what keeps a focus ring visible: overflow clips at the padding
 * box, so the gutter has to be padding on the scroller itself, not margin on
 * the rows or width on the rail.
 *
 * Nothing overflows horizontally during the width animation either — a label
 * is `sr-only` the moment the rail collapses, and `truncate` clips it while
 * the rail is still growing.
 */
function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2',
        className,
      )}
      {...props}
    />
  )
}

/** Fixed bottom section — an account row, a sign-out. */
function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex shrink-0 flex-col gap-2 px-2', className)}
      {...props}
    />
  )
}

/** A titled run of menu rows. */
function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

/**
 * A section heading. It collapses to nothing rather than to an icon, since a
 * heading has no icon to fall back to — but it keeps its height, so the rows
 * either side of it do not close up as the rail narrows.
 */
function SidebarGroupLabel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        // Same type as DropdownMenuLabel, so a section heading reads the
        // same wherever it appears. Height is on the control grid.
        'flex h-7 shrink-0 items-center px-2.5 text-xs font-medium',
        sidebarInk.label,
        'truncate whitespace-nowrap',
        'group-data-[state=collapsed]/sidebar:invisible',
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn('flex list-none flex-col gap-1', className)}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={className} {...props} />
}

/**
 * One row. Renders a button by default, or whatever it is given via `asChild`
 * — a router link, usually.
 *
 * The label is hidden rather than unmounted so the accessible name is stable:
 * a collapsed rail of icon buttons that lose their names to a CSS state is a
 * screen-reader dead end. `sr-only` keeps the text, and the tooltip covers the
 * sighted case.
 */
function SidebarMenuButton({
  className,
  asChild = false,
  isActive = false,
  icon,
  trailing,
  tooltip,
  children,
  ...props
}: ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  icon?: ReactNode
  /** A count or status, hidden with the label when the rail collapses. */
  trailing?: ReactNode
  /** Shown on hover while collapsed. Defaults to the row's own label. */
  tooltip?: ReactNode
}) {
  const { open } = useSidebar()
  const Comp = asChild ? Slot : 'button'

  const row = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      // `aria-current` is the part a screen reader announces; `data-active`
      // only styles.
      aria-current={isActive ? 'page' : undefined}
      // `px-2.5` is (rail − icon) / 2, so the icon sits on the rail's centre
      // line in both states and the label grows out to its right.
      className={cn(
        'flex h-9 w-full items-center gap-2 px-2.5 text-sm font-medium',
        radius.control,
        iconChild,
        interactive,
        sidebarInk.ring,
        disabledState,
        // Ink comes from the fixed sidebar token, not the theme, so the row
        // stays legible on the black ground in both themes.
        isActive ? sidebarInk.active : cn(sidebarInk.row, sidebarInk.hover),
        className,
      )}
      {...props}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-start group-data-[state=collapsed]/sidebar:sr-only">
        {children}
      </span>
      {trailing && (
        <span className="shrink-0 group-data-[state=collapsed]/sidebar:hidden">
          {trailing}
        </span>
      )}
    </Comp>
  )

  if (open) return row

  return (
    <Tooltip content={tooltip ?? children} side="right">
      {row}
    </Tooltip>
  )
}

/** Toggles the rail. Inert below `md`, where the rail is already the layout. */
function SidebarTrigger({
  className,
  onClick,
  ...props
}: ComponentProps<'button'>) {
  const { open, toggle, locked, id } = useSidebar()
  if (locked) return null

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-expanded={open}
      aria-controls={id}
      onClick={(event) => {
        onClick?.(event)
        toggle()
      }}
      className={cn(
        'text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center',
        radius.control,
        iconChild,
        interactive,
        focusRing,
        className,
      )}
      {...props}
    >
      <PanelLeft />
    </button>
  )
}

/**
 * The content panel — an ordinary themed surface on the rail's fixed black
 * ground, which is what makes the layout read as inset.
 *
 * The border is not decoration. In the dark theme the panel is `--card` at 13%
 * lightness sitting on an 8% ground: a five-point difference, which is not
 * enough of an edge to see where the page stops and the rail begins. Contrast
 * alone only carries the light theme.
 *
 * `overflow-hidden` is what earns the radius: a table or a list that runs to
 * the panel's edge has to be clipped by the curve, not drawn over it.
 */
function SidebarInset({ className, ...props }: ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'bg-card text-card-foreground border-border flex min-w-0 flex-1 flex-col overflow-hidden border',
        radius.surface,
        className,
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
