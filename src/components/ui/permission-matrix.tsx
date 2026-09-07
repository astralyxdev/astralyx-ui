import { Fragment, useMemo, type ComponentProps, type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { enterFade } from '@/lib/motion'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Roles against permissions, as a grid.
 *
 * Inherited permissions render differently from directly granted ones. A role
 * that gets `billing.read` because it implies `billing.write` is not the same
 * as one granted it explicitly, and an admin who cannot tell them apart will
 * revoke the wrong thing and be surprised when access remains.
 *
 * Locked cells are shown, not hidden. A permission an admin cannot change still
 * needs to be visible, or they will assume it is off and grant it elsewhere.
 */
export type Permission = {
  id: string
  label: ReactNode
  group?: string
  description?: ReactNode
}

export type PermissionRole = {
  id: string
  label: ReactNode
  /** Directly granted permission ids. */
  granted: string[]
  /** Held via implication — shown, but not directly revocable. */
  inherited?: string[]
  /** Cannot be changed here at all. */
  locked?: boolean
}

function PermissionMatrix({
  permissions,
  roles,
  onToggle,
  permissionHeader = 'Permission',
  lockedLabel = 'locked',
  inheritedLabel = 'Inherited',
  inheritedTitle = 'Inherited from another permission',
  grantedLabel = 'Granted',
  notGrantedLabel = 'Not granted',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onToggle'> & {
  permissions: Permission[]
  roles: PermissionRole[]
  onToggle?: (roleId: string, permissionId: string, granted: boolean) => void
  /** Heading over the permission column. */
  permissionHeader?: ReactNode
  /** Note under a role that cannot be edited. */
  lockedLabel?: ReactNode
  inheritedLabel?: string
  /** Tooltip on an inherited grant. */
  inheritedTitle?: string
  grantedLabel?: string
  notGrantedLabel?: string
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const permission of permissions) {
      const key = permission.group ?? ''
      map.set(key, [...(map.get(key) ?? []), permission])
    }
    return [...map.entries()]
  }, [permissions])

  return (
    <div
      data-slot="permission-matrix"
      className={cn(enterFade, surface, radius.surface, 'w-full overflow-x-auto', className)}
      {...props}
    >
      {/* The kit's table parts. The column headings were four copies of the
          same muted, extra-small recipe; density is the only thing a matrix
          this wide has to state for itself. */}
      <table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky start-0 bg-[var(--card)]">
              {permissionHeader}
            </TableHead>
            {roles.map((role) => (
              <TableHead key={role.id} className="text-center">
                {role.label}
                {role.locked && (
                  <span className="text-muted-foreground/60 block font-normal">{lockedLabel}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {groups.map(([group, items]) => (
            <Fragment key={group || 'ungrouped'}>
              {group && (
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={roles.length + 1}
                    className="text-muted-foreground py-1.5 text-xs font-medium tracking-wide uppercase"
                  >
                    {group}
                  </TableCell>
                </TableRow>
              )}

              {items.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="sticky start-0 bg-[var(--card)]">
                    <span className="block">{permission.label}</span>
                    {permission.description && (
                      <span className="text-muted-foreground block text-xs">
                        {permission.description}
                      </span>
                    )}
                  </TableCell>

                  {roles.map((role) => {
                    const direct = role.granted.includes(permission.id)
                    const inherited = role.inherited?.includes(permission.id) ?? false

                    return (
                      <TableCell key={role.id} className="text-center">
                        {inherited && !direct ? (
                          // Inherited: visible, but not revocable from here.
                          <span
                            className="text-muted-foreground/60 inline-flex items-center justify-center"
                            title={inheritedTitle}
                          >
                            <Check className="size-4" aria-label={inheritedLabel} />
                          </span>
                        ) : role.locked || !onToggle ? (
                          direct ? (
                            <Check className="mx-auto size-4" aria-label={grantedLabel} />
                          ) : (
                            <Minus
                              className="text-muted-foreground/30 mx-auto size-4"
                              aria-label={notGrantedLabel}
                            />
                          )
                        ) : (
                          <Checkbox
                            checked={direct}
                            aria-label={`${role.label} — ${permission.label}`}
                            onChange={() => onToggle(role.id, permission.id, !direct)}
                            // `w-full`, not just `justify-center`: the label is
                            // `w-fit`, so justifying inside it centres nothing
                            // and the box sat left of its own column heading.
                            containerClassName="w-full justify-center"
                          />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </table>
    </div>
  )
}

export { PermissionMatrix }
