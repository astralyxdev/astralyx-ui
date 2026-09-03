import type { ComponentProps, ReactNode } from 'react'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

/**
 * A keyboard reference, grouped by area.
 *
 * Presentational only — it renders a map of shortcuts and nothing else. It does
 * not bind them, because the component that displays a cheat sheet is never the
 * one that owns the handlers, and a sheet that silently registered global keys
 * would fight whatever actually implements them.
 *
 * Keys are given as arrays so the modifier chain stays data: `['Meta', 'K']`
 * renders two caps, and the same array can drive a matcher elsewhere.
 */
export type Shortcut = {
  keys: string[]
  label: ReactNode
}

export type ShortcutGroup = {
  label: string
  shortcuts: Shortcut[]
}

function ShortcutSheet({
  groups,
  columns = true,
  className,
  ...props
}: ComponentProps<'div'> & {
  groups: ShortcutGroup[]
  /** Two columns from `sm` up. */
  columns?: boolean
}) {
  return (
    <div
      data-slot="shortcut-sheet"
      className={cn(
        'grid gap-x-8 gap-y-6',
        columns && 'sm:grid-cols-2',
        className,
      )}
      {...props}
    >
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-1">
          <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {group.label}
          </h3>

          <dl className="flex flex-col">
            {group.shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="border-border/50 flex items-center justify-between gap-4 border-b py-1.5 last:border-b-0"
              >
                <dt className="min-w-0 truncate text-sm">{shortcut.label}</dt>
                <dd className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

export { ShortcutSheet }
