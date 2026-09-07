'use client'

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'
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
 * Inset is the only layout. That is a decision, not an omission: a flush
 * sidebar needs a border that the inset panel already provides by being a
 * separate surface, and supporting one shape well is what keeps the geometry
 * exact.
 *
 * A rail collapses to icons by default, or to nothing at all — see
 * `collapsedTo`. Neither slides over the content: an overlay needs a scrim and
 * focus containment, and a panel that takes no width needs neither.
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

/**
 * Which of the two sidebars this is.
 *
 * `app` is the product's own frame — the one that owns the window, collapses
 * to a rail, and paints its own fixed ground so the content panel reads as
 * inset. `page` is navigation *within* a page: a settings nav, a docs
 * section, a wizard's steps. It never collapses, has no trigger and no
 * shortcut, takes its height from whatever it sits in, and is painted in the
 * page's own theme rather than on the rail's fixed black.
 *
 * One prop rather than three booleans, because those are not independent: a
 * sidebar that does not own the window has nothing to collapse into and no
 * ground of its own to paint.
 */
type SidebarVariant = 'app' | 'page'

/**
 * Which edge a sidebar is pinned to.
 *
 * A frame can carry one of each — navigation on the left, an inspector or a
 * details panel on the right — so the two open independently and each trigger
 * says which it drives.
 */
type SidebarSide = 'left' | 'right'

/** Open state per side, or one value for both. */
type SidebarOpen = boolean | Partial<Record<SidebarSide, boolean>>

type SidebarContext = {
  isOpen: (side: SidebarSide) => boolean
  setOpen: (side: SidebarSide, open: boolean) => void
  toggle: (side: SidebarSide) => void
  /** Below `md` the rail is forced closed and the trigger is inert. */
  locked: boolean
  variant: SidebarVariant
  /** The panel's DOM id, for a trigger's `aria-controls`. */
  panelId: (side: SidebarSide) => string
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
 * Which sidebar a row is inside.
 *
 * With two panels in one frame, a menu row cannot ask the provider whether
 * "the" sidebar is open — it has to ask about its own. `Sidebar` publishes
 * that here, and the rows read it rather than the frame.
 */
type SidebarPanel = { side: SidebarSide; open: boolean }

const SidebarPanelCtx = createContext<SidebarPanel | null>(null)

/** Falls back to an open left panel, so a row rendered loose still reads. */
function useSidebarPanel(): SidebarPanel {
  return use(SidebarPanelCtx) ?? { side: 'left', open: true }
}

/** One value for both sides, or a partial object naming them. */
function bySide(
  value: SidebarOpen | undefined,
  fallback: Record<SidebarSide, boolean>,
): Record<SidebarSide, boolean> {
  if (typeof value === 'boolean') return { left: value, right: value }
  return {
    left: value?.left ?? fallback.left,
    right: value?.right ?? fallback.right,
  }
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
  variant = 'app',
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  ...props
}: ComponentProps<'div'> & {
  variant?: SidebarVariant
  /** A boolean sets both sides; an object sets the ones it names. */
  open?: SidebarOpen
  defaultOpen?: SidebarOpen
  onOpenChange?: (open: boolean, side: SidebarSide) => void
}) {
  const [uncontrolled, setUncontrolled] = useState(() =>
    bySide(defaultOpen, { left: true, right: true }),
  )
  const wide = useBreakpoint('md')
  const id = useId()
  const page = variant === 'page'

  // Controlled per side, so a frame can drive its inspector from state and
  // leave the navigation to look after itself.
  const wanted = bySide(openProp, uncontrolled)

  // A page sidebar is always open: it has no rail to collapse to, and the
  // breakpoint lock exists so the app frame can shed its width on a phone,
  // which a nav inside a page does by stacking instead.
  // Memoised so the context value, and every callback closing over it, only
  // changes when a side actually opens or closes. A fresh object each render
  // would re-render both panels on every keystroke in the content beside them.
  const open = useMemo<Record<SidebarSide, boolean>>(
    () => ({
      left: page || (wanted.left && wide),
      right: page || (wanted.right && wide),
    }),
    [page, wanted.left, wanted.right, wide],
  )

  const isOpen = useCallback((side: SidebarSide) => open[side], [open])

  const setOpen = useCallback(
    (side: SidebarSide, next: boolean) => {
      // Only the sides the caller actually named are theirs to own; the rest
      // keep looking after themselves.
      const owned =
        openProp !== undefined &&
        (typeof openProp === 'boolean' || openProp[side] !== undefined)
      if (!owned) setUncontrolled((current) => ({ ...current, [side]: next }))
      onOpenChange?.(next, side)
    },
    [onOpenChange, openProp],
  )

  const toggle = useCallback(
    (side: SidebarSide) => setOpen(side, !open[side]),
    [open, setOpen],
  )

  const panelId = useCallback((side: SidebarSide) => `${id}-${side}`, [id])

  // Ctrl/Cmd-B, the conventional shortcut. Bound on the frame rather than the
  // document body would miss it when focus is inside the content panel.
  useEffect(() => {
    // Cmd-B belongs to the window's own sidebar. Binding it for a nav inside a
    // page would mean two of them fighting over the same chord on any page
    // that has both.
    if (!wide || page) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        // The chord belongs to the navigation. A second panel is a detail
        // view, opened from the thing it details rather than from a shortcut.
        toggle('left')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [page, toggle, wide])

  return (
    <SidebarCtx
      value={{ isOpen, setOpen, toggle, locked: page || !wide, variant, panelId }}
    >
      <div
        data-slot="sidebar-provider"
        data-variant={variant}
        data-state-left={open.left ? 'expanded' : 'collapsed'}
        data-state-right={open.right ? 'expanded' : 'collapsed'}
        className={cn(
          'flex w-full',
          // The app frame owns the window and paints the ground under both
          // columns. A page nav owns nothing: it takes the height it is given
          // and leaves the page's own background alone.
          page
            ? 'min-h-0 flex-col gap-6 md:flex-row md:gap-8'
            : cn(sidebarSurface, 'min-h-svh gap-2 p-2'),
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
function Sidebar({
  className,
  children,
  position = 'left',
  collapsedTo = 'icon',
  ...props
}: ComponentProps<'aside'> & {
  /**
   * Which edge to pin to. Two sidebars can share one provider — navigation on
   * the left, an inspector on the right — and they open independently.
   */
  position?: SidebarSide
  /**
   * What is left when it collapses.
   *
   * `icon` keeps the 52px rail, which is the right answer for navigation: the
   * destinations stay reachable in one click and the layout never reflows.
   * `nothing` gives the width back, which is the right answer for a panel that
   * is a detail view rather than a place to go — an inspector nobody is using
   * should not cost a strip of the window.
   */
  collapsedTo?: 'icon' | 'nothing'
}) {
  const { isOpen, variant, panelId } = useSidebar()
  const page = variant === 'page'
  const open = isOpen(position)
  const vanishes = !page && collapsedTo === 'nothing'
  // `inert` rather than `hidden`: `display: none` cannot be transitioned, so a
  // panel that hid itself popped out of existence instead of closing. This
  // keeps it in flow at zero width, out of the tab order and out of the
  // accessibility tree, and still addressable by the trigger's
  // `aria-controls`.
  const gone = vanishes && !open

  return (
    <SidebarPanelCtx value={{ side: position, open }}>
      <aside
        id={panelId(position)}
        inert={gone}
        data-slot="sidebar"
        data-variant={variant}
        data-side={position}
        data-collapsed-to={collapsedTo}
        data-state={open ? 'expanded' : 'collapsed'}
        className={cn(
          'group/sidebar flex shrink-0 flex-col gap-2 bg-transparent',
          // Ordered rather than left to the DOM, so `position` is the whole
          // answer: a right sidebar written before the content still lands
          // after it, and the content keeps the middle either way.
          position === 'right' ? 'order-last' : 'order-first',
          page
            ? // No width transition, because nothing changes it. Full width on a
              // phone so the nav stacks above the content rather than becoming a
              // 224px column beside a squeezed one.
              'w-full md:w-56'
            : cn(
                'transition-[width,margin] duration-200 ease-out motion-reduce:transition-none',
                open ? EXPANDED : vanishes ? 'w-0' : RAIL,
                // Contents are still 256px wide while the box shrinks around
                // them, so they have to be clipped or they spill across the
                // content panel for the length of the animation. The rail's own
                // `px-2` leaves more slack than a focus ring needs, so nothing
                // legible is lost.
                vanishes && 'overflow-hidden',
                // The frame's `gap-2` outlives a zero-width child, which would
                // leave an 8px gutter where the panel used to be. Cancelling it
                // on the side the gap falls, and transitioning it with the
                // width, is what closes the seam.
                gone && (position === 'right' ? '-ms-2' : '-me-2'),
              ),
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </SidebarPanelCtx>
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
  const { variant } = useSidebar()

  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        // Same type as DropdownMenuLabel, so a section heading reads the
        // same wherever it appears. Height is on the control grid.
        'flex h-7 shrink-0 items-center px-2.5 text-xs font-medium',
        // Theme ink on a page, rail ink on the frame — the rail's steps are
        // measured against its own fixed black ground.
        variant === 'page' ? 'text-muted-foreground' : sidebarInk.label,
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
  const { variant } = useSidebar()
  const { side, open } = useSidebarPanel()
  const page = variant === 'page'
  // `sidebarInk` is measured against the rail's fixed black ground. A page nav
  // sits on the theme's own surface, where those steps are the wrong ones —
  // white-on-white in the light theme.
  const ink = page
    ? {
        row: 'text-muted-foreground',
        hover: 'hover:bg-accent hover:text-foreground',
        active: 'bg-accent text-accent-foreground',
        ring: focusRing,
      }
    : {
        row: sidebarInk.row,
        hover: sidebarInk.hover,
        active: sidebarInk.active,
        ring: sidebarInk.ring,
      }
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
        ink.ring,
        disabledState,
        isActive ? ink.active : cn(ink.row, ink.hover),
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

  // Only the collapsed rail needs one: the label is `sr-only` there, and this
  // is what puts it back for a pointer. It opens away from the rail, so a
  // right-hand one points inward rather than off the edge of the window.
  return (
    <Tooltip content={tooltip ?? children} side={side === 'right' ? 'left' : 'right'}>
      {row}
    </Tooltip>
  )
}

/** Toggles the rail. Inert below `md`, where the rail is already the layout. */
function SidebarTrigger({
  className,
  onClick,
  position = 'left',
  label,
  ...props
}: ComponentProps<'button'> & {
  /** Which sidebar this toggles. */
  position?: SidebarSide
  /** Names the panel in the button's accessible label. */
  label?: string
}) {
  const { isOpen, toggle, locked, panelId } = useSidebar()
  const open = isOpen(position)
  if (locked) return null

  const name = label ?? `${position} sidebar`

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      data-side={position}
      // Named, because two triggers in one header both reading "Expand
      // sidebar" is a coin toss for anyone who cannot see which is which.
      aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
      aria-expanded={open}
      aria-controls={panelId(position)}
      onClick={(event) => {
        onClick?.(event)
        toggle(position)
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
      {position === 'right' ? <PanelRight /> : <PanelLeft />}
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
  const { variant } = useSidebar()

  return (
    <main
      data-slot="sidebar-inset"
      data-variant={variant}
      className={cn(
        'flex min-w-0 flex-1 flex-col',
        // A page nav is not a frame, so its content is not a panel: giving it
        // a card surface would put a second raised box inside whatever card or
        // page section already contains it.
        variant === 'page'
          ? 'min-h-0'
          : cn(
              'bg-card text-card-foreground border-border overflow-hidden border',
              radius.surface,
            ),
        className,
      )}
      {...props}
    />
  )
}

export type { SidebarOpen, SidebarSide, SidebarVariant }
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
