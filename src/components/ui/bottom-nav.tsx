import type { ComponentProps, ReactNode } from 'react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The mobile tab bar: three to five destinations, pinned to the bottom.
 *
 * **Bottom, because that is where thumbs are.** On a phone held one-handed the
 * top of the screen is the hardest region to reach and the bottom third is the
 * easiest — which is why every mobile OS puts primary navigation there and why
 * a top nav bar on mobile costs a reach or a second hand.
 *
 * **It respects the home indicator.** `env(safe-area-inset-bottom)` is added to
 * the padding, so on a notched phone the bar sits above the gesture area
 * instead of underneath it, where the last few pixels of every tap get eaten by
 * the system. This is the single most common defect in hand-rolled tab bars.
 *
 * **Destinations, not actions.** These switch *where you are*; a tab bar with
 * "Share" in it is a toolbar wearing the wrong clothes. Keep it to five — past
 * that the targets fall below the ~44px comfortable minimum and labels truncate
 * to nonsense.
 *
 * It renders `<nav>` + a list of links, with `aria-current="page"` on the
 * active one — the same markup as any other navigation, so it is announced as
 * navigation and works with the browser's own history.
 */
export type BottomNavItem = {
  value: string
  label: ReactNode
  icon: ReactNode
  href?: string
  /** A count, or `true` for a plain dot. */
  badge?: number | boolean
  disabled?: boolean
}

type BottomNavProps = Omit<ComponentProps<'nav'>, 'onChange'> & {
  items: BottomNavItem[]
  value?: string
  onChange?: (value: string, item: BottomNavItem) => void
  /** Hide the text, leaving icons only. Costs clarity; buys room. */
  showLabels?: boolean
  /** Position it fixed to the viewport bottom, as it would be in an app. */
  fixed?: boolean
  label?: string
}

function BottomNav({
  items,
  value,
  onChange,
  showLabels = true,
  fixed = false,
  label = 'Primary',
  className,
  ...props
}: BottomNavProps) {
  return (
    <nav
      data-slot="bottom-nav"
      aria-label={label}
      className={cn(
        'border-border bg-background/95 z-40 border-t backdrop-blur',
        fixed && 'fixed inset-x-0 bottom-0',
        className,
      )}
      // The home indicator lives here on a notched phone; without this the last
      // row of pixels is not tappable.
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      {...props}
    >
      <ul className="mx-auto flex max-w-lg list-none items-stretch justify-around">
        {items.map((item) => {
          const active = item.value === value
          const Tag = item.href ? 'a' : 'button'

          return (
            <li key={item.value} className="min-w-0 flex-1">
              <Tag
                {...(item.href
                  ? { href: item.href }
                  : { type: 'button' as const, disabled: item.disabled })}
                // The navigation equivalent of aria-selected. A tab bar that
                // only signals the current page with colour says nothing to a
                // screen reader.
                aria-current={active ? 'page' : undefined}
                aria-disabled={item.disabled || undefined}
                onClick={() => !item.disabled && onChange?.(item.value, item)}
                className={cn(
                  'relative flex w-full flex-col items-center justify-center gap-1 px-1 py-2',
                  // 44px is the smallest target most people can hit reliably.
                  'min-h-[3.25rem]',
                  radius.control,
                  focusRing,
                  active ? 'text-foreground' : 'text-muted-foreground',
                  item.disabled && 'pointer-events-none opacity-50',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('relative [&_svg]:size-5', active && '[&_svg]:stroke-[2.25]')}
                >
                  {item.icon}
                  {item.badge !== undefined && item.badge !== false && (
                    <span
                      className={cn(
                        'bg-[var(--destructive)] absolute -end-1.5 -top-1 flex items-center justify-center rounded-full text-[10px] leading-none text-white',
                        item.badge === true ? 'size-2' : 'min-w-4 px-1 py-0.5',
                      )}
                    >
                      {item.badge === true ? '' : item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>

                {showLabels ? (
                  <span className="w-full truncate text-center text-[11px] leading-none">
                    {item.label}
                  </span>
                ) : (
                  <span className="sr-only">{item.label}</span>
                )}

                {/* The badge count must be readable, not just visible. */}
                {typeof item.badge === 'number' && (
                  <span className="sr-only">{item.badge} unread</span>
                )}
              </Tag>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { BottomNav }
export type { BottomNavProps }
