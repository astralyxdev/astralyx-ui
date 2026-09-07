import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { CommandDialog, type CommandItem } from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Logo } from '@/components/ui/logo'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
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
} from '@/components/ui/sidebar'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The chrome every example in this folder is built on.
 *
 * These are not four screenshots of a sidebar. Each example is a product with
 * sections, detail pages under those sections, and dialogs that change state
 * you can then see reflected somewhere else — so the shell has to carry a
 * *route*, not just an active tab. `useRoute` below is that route: a section, an
 * optional record within it, and a tab within that record.
 *
 * It is shared for the same reason the components are: four hand-written app
 * frames would drift, and a layout bug would have to be found four times. What
 * is *not* shared is anything a real product would decide for itself — the
 * navigation, the commands, the content. Those are arguments.
 */

export type Route = {
  section: string
  /** The record open under that section, if any. */
  record?: string
  /** The tab open on that record. */
  tab?: string
}

type RouteContextValue = {
  route: Route
  go: (next: Route) => void
  open: (section: string, record: string, tab?: string) => void
  back: () => void
}

/**
 * What the crumb trail and the command palette are handed.
 *
 * Both are configured from outside the provider — they are arguments to the
 * shell — but both need to *navigate*, which only exists inside it. Passing
 * them a function of the route rather than a value is what closes that gap
 * without a second context.
 */
export type Nav = RouteContextValue

const RouteContext = createContext<RouteContextValue | null>(null)

/**
 * The example's own navigation.
 *
 * Deliberately state and not the URL. These run inside a documentation page
 * that already owns the address bar, and an example that rewrote it would fight
 * the site's router and break the back button on the way out.
 */
export function useRoute() {
  const value = use(RouteContext)
  if (!value) throw new Error('useRoute must be used inside <Shell>')
  return value
}

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  /** Shown on the rail as a count chip. */
  count?: number
}

export type NavGroup = {
  label?: string
  items: NavItem[]
}

export type Notification = {
  id: string
  title: string
  body: string
  at: string
  unread?: boolean
}

/** One crumb in the trail. Omit `onClick` for the last one. */
export type Crumb = { label: string; onClick?: () => void }

function ShellChrome({
  product,
  groups,
  commands,
  notifications = [],
  user,
  crumbs,
  actions,
  aside,
  children,
}: {
  product: string
  groups: NavGroup[]
  commands: (nav: Nav) => CommandItem[]
  notifications?: Notification[]
  user: { name: string; email: string; plan: string }
  crumbs: (nav: Nav) => Crumb[]
  actions?: ReactNode
  /**
   * A second rail, on the trailing edge.
   *
   * A real `Sidebar position="right"` rather than a fixed column, so it
   * collapses from the header like the nav does and takes its width back when
   * it goes. Given a card surface, because the kit's components assume the
   * page's tokens and would come out dark-on-dark on the frame's own ground.
   */
  aside?: ReactNode
  children: ReactNode
}) {
  const nav = useRoute()
  const { route, go } = nav
  const trail = crumbs(nav)
  const [palette, setPalette] = useState(false)
  const [seen, setSeen] = useState(false)
  const unread = seen ? 0 : notifications.filter((item) => item.unread).length

  // ⌘K, the one keyboard shortcut every product of this shape has. Bound on the
  // window rather than a wrapper, because the palette has to open from a field,
  // a table cell or nothing focused at all.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setPalette((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <SidebarProvider className="h-full min-h-0" defaultOpen={{ left: true, right: true }}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-9 items-center gap-2 px-2.5">
            {/* Cropped viewBox on the rail: the wordmark is wider than 52px. */}
            <Logo className="h-4 w-auto shrink-0 group-data-[state=collapsed]/sidebar:hidden" />
            <Logo
              viewBox="0 0 42 74"
              className="hidden h-4 w-auto shrink-0 group-data-[state=collapsed]/sidebar:block"
            />
            <span className="text-[var(--sidebar-foreground)]/50 truncate text-xs group-data-[state=collapsed]/sidebar:hidden">
              {product}
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label={product} className="flex flex-col gap-1">
            {groups.map((group, index) => (
              <SidebarGroup key={group.label ?? index}>
                {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        icon={item.icon}
                        isActive={item.id === route.section}
                        tooltip={item.label}
                        trailing={
                          item.count != null ? (
                            // A count chip, not a Badge: the rail's ground is
                            // fixed black and a Badge assigns its own colours,
                            // so it would come out dark-on-dark in light mode.
                            <span className="rounded-full bg-[var(--sidebar-foreground)]/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                              {item.count}
                            </span>
                          ) : undefined
                        }
                        onClick={() => go({ section: item.id })}
                      >
                        {item.label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                icon={<Avatar size="xs" name={user.name} />}
                tooltip={user.name}
                // The avatar is 24px where a row icon is 16, so centring it on
                // the collapsed rail takes an explicit nudge.
                className="group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"
              >
                <span className="min-w-0">
                  <span className="block truncate">{user.name}</span>
                  <span className="text-[var(--sidebar-foreground)]/50 block truncate text-[11px]">
                    {user.plan}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger />

          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              {trail.map((crumb, index) => {
                const last = index === trail.length - 1
                return (
                  <BreadcrumbItem key={`${crumb.label}-${index}`}>
                    {last || !crumb.onClick ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <>
                        <BreadcrumbLink
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            crumb.onClick?.()
                          }}
                        >
                          {crumb.label}
                        </BreadcrumbLink>
                        <BreadcrumbSeparator>
                          <ChevronRight />
                        </BreadcrumbSeparator>
                      </>
                    )}
                  </BreadcrumbItem>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>

          {/* A button that opens the palette, not a search field that pretends
              to be one. The field would take focus and then hand it straight to
              a dialog, which is a worse version of the same thing. */}
          <button
            type="button"
            onClick={() => setPalette(true)}
            className={cn(
              'text-muted-foreground hidden items-center gap-2 border px-2.5 py-1.5 text-xs sm:flex',
              'border-border hover:bg-accent hover:text-accent-foreground',
              radius.control,
              focusRing,
              'transition-colors duration-150 ease-out motion-reduce:transition-none',
            )}
          >
            <Search className="size-3.5" />
            <span className="hidden md:inline">Search…</span>
            <Kbd keys="⌘+K" />
          </button>

          {actions}

          {aside && <SidebarTrigger position="right" label="Copilot" />}

          <Popover onOpenChange={(open) => open && setSeen(true)}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
                <Bell />
                {unread > 0 && (
                  <span className="bg-[var(--destructive)] absolute end-1 top-1 size-1.5 rounded-full [corner-shape:round]" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-border flex items-center justify-between border-b p-3">
                <span className="text-sm font-medium">Notifications</span>
                {unread > 0 && <Badge size="sm" color="destructive">{unread} new</Badge>}
              </div>
              <ul className="divide-border max-h-72 divide-y overflow-y-auto">
                {notifications.map((item) => (
                  <li key={item.id} className="flex flex-col gap-0.5 p-3">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium">{item.title}</span>
                      <span className="text-muted-foreground/70 shrink-0 text-[11px]">{item.at}</span>
                    </span>
                    <span className="text-muted-foreground text-xs">{item.body}</span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Account" className={cn('shrink-0 rounded-full', focusRing)}>
                <Avatar size="sm" name={user.name} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Account settings</DropdownMenuItem>
              <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* `SidebarInset` is the `<main>`; this is the scroll column inside
            it, not a second one. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>

      {/* Written after the inset and rendered after it too — `position` is the
          whole answer, so the order here is just reading order.

          `collapsedTo="nothing"` rather than an icon rail: a chat collapsed to
          52px is a column of nothing, where the nav still shows its icons. The
          width only applies while it is open, so the closed state keeps its
          `w-0` and the panel really does give the space back. */}
      {aside && (
        <Sidebar
          position="right"
          collapsedTo="nothing"
          className="data-[state=expanded]:w-96"
          aria-label="Copilot"
        >
          <div
            className={cn(
              'bg-card text-card-foreground border-border flex min-h-0 flex-1 flex-col overflow-hidden border',
              radius.surface,
            )}
          >
            {aside}
          </div>
        </Sidebar>
      )}

      <CommandDialog
        open={palette}
        onOpenChange={setPalette}
        items={commands(nav)}
        placeholder={`Search ${product}…`}
      />
    </SidebarProvider>
  )
}

/**
 * The shell, plus the two providers everything inside it assumes: a route and a
 * toast queue.
 *
 * Split from `ShellChrome` because the chrome itself calls `useRoute`, and a
 * component cannot consume a context it is also providing.
 */
export function Shell({
  home,
  children,
  ...props
}: Parameters<typeof ShellChrome>[0] & {
  /** The section the example opens on. */
  home: string
}) {
  const [stack, setStack] = useState<Route[]>([{ section: home }])
  const route = stack[stack.length - 1]

  const value = useMemo<RouteContextValue>(
    () => ({
      route,
      // A section change resets the stack: you are not "inside" anything any
      // more, and keeping the old detail page behind Back would offer to
      // return to a record from a section you have left.
      go: (next) => setStack([next]),
      open: (section, record, tab) =>
        setStack((current) => [...current, { section, record, tab }]),
      back: () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    }),
    [route],
  )

  return (
    <RouteContext value={value}>
      <ToastProvider position="bottom-end">
        <ShellChrome {...props}>{children}</ShellChrome>
      </ToastProvider>
    </RouteContext>
  )
}

/**
 * A section's own header: a title, a sentence saying what you are looking at,
 * and the actions for it.
 *
 * Every section in every example uses it, so the four products agree about
 * where the primary action lives and how much air sits above the content.
 */
export function PageHead({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** A filter row, a tab strip — anything that belongs under the title. */
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm text-pretty">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/**
 * A titled block that is *not* a Card.
 *
 * Most of the kit's larger components — a deploy list, a data grid, a trace, a
 * permission matrix — already draw their own surface: a border, a radius and a
 * background. Putting one inside a `Card` gives you two borders with a gutter
 * between them and two radii that cannot agree, which reads as a mistake
 * because it is one. This gives such a component the heading and the spacing it
 * needs without a second box around it.
 *
 * `Card` is still right for content that draws nothing of its own — a chart, a
 * timeline, a form, a meter.
 */
export function Section({
  title,
  description,
  action,
  children,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      {(title || action) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-medium">{title}</h3>}
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** The padded column every section's content sits in. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-5 p-4 md:p-6', className)}>{children}</div>
}

/**
 * `useToast`, with the two calls these examples actually make.
 *
 * Every mutation in an example is pretend, so each one has to *say* it
 * happened; without that, a dialog that closes and changes nothing visible
 * reads as broken rather than as a mock.
 */
export function useNotify() {
  const { toast } = useToast()

  return useCallback(
    (title: string, description?: string, color: 'neutral' | 'green' | 'destructive' = 'neutral') =>
      toast({ title, description, color }),
    [toast],
  )
}

/**
 * A labelled text field.
 *
 * `Field` wires the id, `aria-describedby` and `aria-invalid`, but the control
 * has to ask for them with `useFieldControl()` — and a hook can only be called
 * from a component *inside* the provider. Hence the inner component: it is the
 * one thing that cannot be done by passing props down from the call site, and
 * writing it out at every form in four examples is how one of the three
 * attributes goes missing.
 */
function FieldInput(props: ComponentProps<typeof Input>) {
  return <Input {...useFieldControl()} {...props} />
}

export function TextField({
  label,
  description,
  error,
  required,
  ...props
}: Omit<ComponentProps<typeof Input>, 'error'> & {
  label: ReactNode
  description?: ReactNode
  /** The message, not a flag: its presence is what marks the field invalid. */
  error?: ReactNode
  required?: boolean
}) {
  return (
    <Field description={description} error={error}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <FieldInput error={Boolean(error)} {...props} />
    </Field>
  )
}

function FieldTextarea(props: ComponentProps<typeof Textarea>) {
  return <Textarea {...useFieldControl()} {...props} />
}

export function TextareaField({
  label,
  description,
  error,
  required,
  ...props
}: Omit<ComponentProps<typeof Textarea>, 'error'> & {
  label: ReactNode
  description?: ReactNode
  error?: ReactNode
  required?: boolean
}) {
  return (
    <Field description={description} error={error}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <FieldTextarea error={Boolean(error)} {...props} />
    </Field>
  )
}

function FieldSelect(props: ComponentProps<typeof Select>) {
  const { id, ...aria } = useFieldControl()
  return <Select {...props} triggerClassName={props.triggerClassName} id={id} {...aria} />
}

export function SelectField({
  label,
  description,
  error,
  required,
  ...props
}: Omit<ComponentProps<typeof Select>, 'error'> & {
  label: ReactNode
  description?: ReactNode
  error?: ReactNode
  required?: boolean
}) {
  return (
    <Field description={description} error={error}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <FieldSelect error={Boolean(error)} triggerLabel={typeof label === 'string' ? label : undefined} {...props} />
    </Field>
  )
}
