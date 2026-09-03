import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { AlertTriangle, BellOff, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Fmt } from '@/components/ui/fmt'
import { focusRing, interactive, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An alert queue, grouped by fingerprint.
 *
 * Grouping is the whole job. A flapping check fires two hundred times and the
 * useful view is "this one alert, 200 occurrences" — an ungrouped list buries
 * every other alert underneath it, which is how real pages get missed.
 *
 * Bulk actions report ids and never mutate the list. Acknowledging is a
 * server-side decision, and a queue that optimistically hid rows would show two
 * responders different pictures of the same incident.
 */
export type Alert = {
  id: string
  title: ReactNode
  severity: 'critical' | 'warning' | 'info'
  /** Alerts sharing a fingerprint collapse into one row. */
  fingerprint?: string
  count?: number
  source?: string
  firstSeen?: Date
  lastSeen?: Date
  acknowledged?: boolean
  detail?: ReactNode
}

const SEVERITY = {
  critical: { label: 'Critical', color: 'destructive', edge: 'bg-[var(--destructive)]' },
  warning: { label: 'Warning', color: 'amber', edge: 'bg-[var(--amber)]' },
  info: { label: 'Info', color: 'blue', edge: 'bg-[var(--blue)]' },
} as const

const RANK = { critical: 0, warning: 1, info: 2 } as const

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_SELECT_ALERT_LABEL: (fingerprint: string) => string = (key) => `Select alert ${key}`
const DEFAULT_TOGGLE_DETAIL_LABEL: (open: boolean) => string = (open) => `${open ? 'Hide' : 'Show'} alert detail`
const DEFAULT_SELECTED_LABEL: (count: number) => ReactNode = (count) => `${count} selected`
const DEFAULT_SUMMARY_LABEL: (total: number, critical: number) => ReactNode = (total, critical) => `${total} alerts · ${critical} critical`

function AlertTriage({
  alerts,
  onAcknowledge,
  onSilence,
  now,
  selectAllLabel = 'Select all alerts',
  clearSelectionLabel = 'Clear selection',
  selectAlertLabel = DEFAULT_SELECT_ALERT_LABEL,
  toggleDetailLabel = DEFAULT_TOGGLE_DETAIL_LABEL,
  selectedLabel = DEFAULT_SELECTED_LABEL,
  summaryLabel = DEFAULT_SUMMARY_LABEL,
  acknowledgeLabel = 'Acknowledge',
  silenceLabel = 'Silence',
  acknowledgedLabel = 'Acked',
  lastSeenLabel = 'last',
  firstSeenLabel = 'first',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  alerts: Alert[]
  onAcknowledge?: (ids: string[]) => void
  onSilence?: (ids: string[]) => void
  now?: Date
  selectAllLabel?: string
  clearSelectionLabel?: string
  selectAlertLabel?: (fingerprint: string) => string
  toggleDetailLabel?: (open: boolean) => string
  selectedLabel?: (count: number) => ReactNode
  /** Roll-up shown when nothing is selected. */
  summaryLabel?: (total: number, critical: number) => ReactNode
  acknowledgeLabel?: ReactNode
  silenceLabel?: ReactNode
  acknowledgedLabel?: ReactNode
  /** Precedes the last-seen time. */
  lastSeenLabel?: ReactNode
  /** Precedes the first-seen time. */
  firstSeenLabel?: ReactNode
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])

  // Group by fingerprint, then sort by severity. Order within a group is the
  // caller's; only the roll-up is computed.
  const groups = useMemo(() => {
    const map = new Map<string, Alert[]>()
    for (const alert of alerts) {
      const key = alert.fingerprint ?? alert.id
      map.set(key, [...(map.get(key) ?? []), alert])
    }
    return [...map.entries()]
      .map(([key, members]) => ({
        key,
        lead: members[0],
        count: members.reduce((sum, alert) => sum + (alert.count ?? 1), 0),
        members,
      }))
      .sort((a, b) => RANK[a.lead.severity] - RANK[b.lead.severity])
  }, [alerts])

  const allKeys = groups.map((group) => group.key)
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.includes(key))

  const idsFor = (keys: string[]) =>
    groups.filter((group) => keys.includes(group.key)).flatMap((group) => group.members.map((m) => m.id))

  return (
    <div
      data-slot="alert-triage"
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b p-2">
        <Checkbox
          aria-label={allSelected ? clearSelectionLabel : selectAllLabel}
          checked={allSelected}
          indeterminate={selected.length > 0 && !allSelected}
          onChange={() => setSelected(allSelected ? [] : allKeys)}
        />
        <span className="text-muted-foreground text-xs">
          {selected.length > 0
            ? selectedLabel(selected.length)
            : summaryLabel(
                groups.length,
                groups.filter((g) => g.lead.severity === 'critical').length,
              )}
        </span>

        {selected.length > 0 && (
          <div className="ms-auto flex flex-wrap gap-1.5">
            {onAcknowledge && (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  onAcknowledge(idsFor(selected))
                  setSelected([])
                }}
              >
                <Check />
                {acknowledgeLabel}
              </Button>
            )}
            {onSilence && (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => {
                  onSilence(idsFor(selected))
                  setSelected([])
                }}
              >
                <BellOff />
                {silenceLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {groups.map((group) => {
          const alert = group.lead
          const level = SEVERITY[alert.severity]
          const open = expanded.includes(group.key)
          const isSelected = selected.includes(group.key)

          return (
            <li
              key={group.key}
              data-severity={alert.severity}
              className={cn('relative ps-1.5', alert.acknowledged && 'opacity-60')}
            >
              <span
                aria-hidden="true"
                className={cn('absolute inset-y-0 start-0 w-1', level.edge)}
              />

              <div className="flex items-start gap-2.5 p-3">
                <Checkbox
                  aria-label={selectAlertLabel(group.key)}
                  checked={isSelected}
                  className="mt-0.5"
                  onChange={() =>
                    setSelected((current) =>
                      isSelected
                        ? current.filter((key) => key !== group.key)
                        : [...current, group.key],
                    )
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" color={level.color}>
                      <AlertTriangle />
                      {level.label}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {alert.title}
                    </span>
                    {group.count > 1 && (
                      <Badge size="sm">×{group.count}</Badge>
                    )}
                    {alert.acknowledged && (
                      <Badge size="sm" color="green">
                        <Check />
                        {acknowledgedLabel}
                      </Badge>
                    )}
                  </div>

                  <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                    {alert.source && <span>{alert.source}</span>}
                    {alert.lastSeen && (
                      <span>
                        {lastSeenLabel} <Fmt type="relative" value={alert.lastSeen} now={now} />
                      </span>
                    )}
                    {alert.firstSeen && (
                      <span>
                        {firstSeenLabel} <Fmt type="relative" value={alert.firstSeen} now={now} />
                      </span>
                    )}
                  </p>
                </div>

                {alert.detail && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={toggleDetailLabel(open)}
                    onClick={() =>
                      setExpanded((current) =>
                        open
                          ? current.filter((key) => key !== group.key)
                          : [...current, group.key],
                      )
                    }
                    className={cn(
                      'text-muted-foreground hover:text-foreground shrink-0 p-1',
                      radius.xs,
                      interactive,
                      focusRing,
                    )}
                  >
                    {open ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                )}
              </div>

              {open && alert.detail && (
                <div className="bg-muted/30 border-border/60 border-t p-3 text-sm">
                  {alert.detail}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export { AlertTriage }
