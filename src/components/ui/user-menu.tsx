import type { ComponentProps, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The account button in a header or sidebar footer.
 *
 * Composed from `DropdownMenu` rather than reimplementing a popover, so the
 * keyboard behaviour and dismissal come from the component that already gets
 * them right.
 *
 * The identity is repeated inside the panel. On a collapsed sidebar the trigger
 * is a bare avatar, and a menu that opens with no indication of *whose* account
 * it belongs to is a real hazard on shared machines.
 *
 * Metrics follow the shared menu grid: `gap-2` and a square 8px inset, the same
 * as `menuItem` and `SidebarMenuButton`. With a 32px avatar that gives a 48px
 * row, so the trigger lines up with the rows it sits among rather than being a
 * few pixels off from all of them.
 */
export type UserMenuAction = {
  id: string
  label: ReactNode
  icon?: ReactNode
  shortcut?: string
  destructive?: boolean
  separatorBefore?: boolean
  onSelect?: () => void
}

function UserMenu({
  name,
  email,
  plan,
  avatar,
  actions,
  compact = false,
  align = 'start',
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'onSelect'> & {
  name: string
  email?: string
  plan?: ReactNode
  avatar?: ReactNode
  actions: UserMenuAction[]
  /** Avatar only — for a collapsed rail. */
  compact?: boolean
  align?: 'start' | 'center' | 'end'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="user-menu-trigger"
          className={cn(
            'hover:bg-accent flex items-center gap-2 p-2 text-start',
            // Full width only when there is text to fill it; a collapsed
            // trigger is a square around the avatar.
            compact ? 'w-auto justify-center' : 'w-full',
            radius.control,
            interactive,
            focusRing,
            className,
          )}
          {...props}
        >
          {avatar ?? <Avatar size="sm" name={name} className="shrink-0" />}

          {!compact && (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="block truncate text-sm leading-tight font-medium">
                  {name}
                </span>
                {(email || plan) && (
                  <span className="text-muted-foreground block truncate text-xs leading-tight">
                    {email ?? plan}
                  </span>
                )}
              </span>
              <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            </>
          )}
          {compact && <span className="sr-only">{name}</span>}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-56">
        {/* Repeated inside: on a collapsed rail the trigger is a bare avatar. */}
        {/* DropdownMenuLabel is muted by default — the name is the heading
            here, so it opts back into the foreground colour. */}
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-foreground block truncate text-sm font-medium">
            {name}
          </span>
          {email && (
            <span className="block truncate text-xs font-normal">{email}</span>
          )}
          {plan && (
            <span className="mt-1 flex">
              <Badge size="sm">{plan}</Badge>
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {actions.map((action) => (
          <div key={action.id}>
            {action.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={action.onSelect}
              className={cn(action.destructive && 'text-[var(--destructive-soft-foreground)]')}
            >
              {action.icon}
              <span className="flex-1">{action.label}</span>
              {action.shortcut && (
                <span className="text-muted-foreground font-mono text-xs">
                  {action.shortcut}
                </span>
              )}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UserMenu }
