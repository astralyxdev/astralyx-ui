import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The chrome the fullscreen examples share: a product sidebar, a top bar, and a
 * scrolling content column.
 *
 * Shared because these examples are about the components inside them — three
 * near-identical app shells written out three times would be noise, and any
 * layout bug would have to be fixed three times.
 */
export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  /** Flush shell only — a Badge styles itself for the page theme. */
  badge?: ReactNode
  /**
   * A count for the inset shell. Kept as data rather than a Badge because the
   * rail's ground is fixed black: a Badge sets its own colours and a parent
   * cannot override them, so it would come out dark-on-dark in the light theme.
   */
  count?: ReactNode
}

function AppFrame({
  product,
  nav,
  active,
  onNavigate,
  title,
  actions,
  aside,
  children,
  footer,
  user,
  inset = false,
}: {
  product: string
  nav: NavItem[]
  active: string
  onNavigate: (id: string) => void
  title?: ReactNode
  actions?: ReactNode
  /** A second column beside the content, on wide screens. */
  aside?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Account row for the inset shell, rendered as a menu row on the rail. */
  user?: { name: string; plan: string }
  /**
   * Use the inset shell — a rail that collapses to icons beside a rounded
   * panel — instead of the flush bordered sidebar.
   *
   * Opt-in rather than the default: the other examples are laid out against a
   * full-bleed edge, and switching them all would be a redesign rather than a
   * component swap.
   */
  inset?: boolean
}) {
  const header = (
    <>
      <div className="min-w-0 flex-1">
        {typeof title === 'string' ? (
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        ) : (
          title
        )}
      </div>
      {actions}
      <Separator orientation="vertical" className="hidden sm:block" />
      <Avatar size="sm" name="Ada Lovelace" />
    </>
  )

  if (inset) {
    return (
      <SidebarProvider className="h-full min-h-0">
        <Sidebar>
          <SidebarHeader>
            <div className="flex h-9 items-center px-2.5">
              {/* Cropped viewBox for the rail: the wordmark is wider than 52px. */}
              <Logo className="h-4 w-auto shrink-0 group-data-[state=collapsed]/sidebar:hidden" />
              <Logo
                viewBox="0 0 42 74"
                className="hidden h-4 w-auto shrink-0 group-data-[state=collapsed]/sidebar:block"
              />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <nav aria-label={product} className="flex flex-col gap-1">
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      icon={item.icon}
                      isActive={item.id === active}
                      trailing={
                        item.count != null ? (
                          <span className="rounded-full bg-[var(--sidebar-foreground)]/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                            {item.count}
                          </span>
                        ) : undefined
                      }
                      onClick={() => onNavigate(item.id)}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarContent>

          {user && (
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    icon={<Avatar size="xs" name={user.name} />}
                    tooltip={user.name}
                    // The avatar is 24px where a row icon is 16, so centring it
                    // on the rail takes an explicit nudge rather than the
                    // shared `px-2.5`.
                    className="group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"
                  >
                    {user.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          )}
        </Sidebar>

        <SidebarInset>
          <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 md:px-4">
            <SidebarTrigger />
            {header}
          </header>

          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
            {aside && (
              <div className="border-border hidden w-80 shrink-0 overflow-y-auto border-s xl:block">
                {aside}
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <div className="flex h-full">
      <aside className="border-border hidden w-56 shrink-0 flex-col border-e md:flex">
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <Logo className="h-4" />
          <Separator orientation="vertical" />
          <span className="text-muted-foreground truncate text-xs">{product}</span>
        </div>

        <nav aria-label={product} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={item.id === active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 text-sm',
                radius.control,
                focusRing,
                'transition-colors duration-150 ease-out motion-reduce:transition-none',
                "[&_svg:not([class*='size-'])]:size-4",
                item.id === active
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {item.icon}
              <span className="flex-1 truncate text-start">{item.label}</span>
              {item.badge}
            </button>
          ))}
        </nav>

        {footer && (
          <div className="border-border shrink-0 border-t p-2">{footer}</div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 md:px-6">
          {header}
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          {aside && (
            <div className="border-border hidden w-80 shrink-0 overflow-y-auto border-s xl:block">
              {aside}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * A compact sign-out row for the flush shell's sidebar footer.
 *
 * The inset shell does not use this: a Button styles itself from the page
 * theme, which is wrong on the rail's fixed black ground — that shell builds
 * its account row from `SidebarMenuButton` instead.
 */
function AppFrameUser({ name, plan }: { name: string; plan: string }) {
  return (
    <Button variant="ghost" className="h-auto w-full justify-start gap-2.5 px-3 py-2">
      <Avatar size="sm" name={name} />
      <span className="min-w-0 flex-1 text-start group-data-[state=collapsed]/sidebar:hidden">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="text-muted-foreground block truncate text-xs">{plan}</span>
      </span>
    </Button>
  )
}

export { AppFrame, AppFrameUser }
