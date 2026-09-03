import type { ComponentProps, ReactNode } from 'react'
import { Box, Play, RotateCcw, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fmt } from '@/components/ui/fmt'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Running containers with their state, ports and resource use.
 *
 * Restart count is shown whenever it is non-zero, not just when the container
 * is unhealthy. A container that is "running" with 47 restarts is crash-looping
 * and its state alone says everything is fine.
 *
 * The image tag is shown separately from the repository, because `:latest` is
 * the detail that explains why two hosts are running different code.
 *
 * Actions are offered per state: you cannot start a running container, and the
 * control is absent rather than disabled — a greyed-out Start on a running
 * container is noise on every row.
 */
export type ContainerState = 'running' | 'exited' | 'restarting' | 'paused' | 'created'

export type Container = {
  id: string
  name: ReactNode
  /** Repository, without the tag. */
  image: string
  tag?: string
  state: ContainerState
  startedAt?: Date
  /** Non-zero is worth seeing even on a healthy container. */
  restarts?: number
  ports?: string[]
  cpu?: number
  memory?: number
}

const STATE = {
  running: { label: 'Running', color: 'green' },
  exited: { label: 'Exited', color: 'neutral' },
  restarting: { label: 'Restarting', color: 'amber' },
  paused: { label: 'Paused', color: 'blue' },
  created: { label: 'Created', color: 'neutral' },
} as const

/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_RESTARTS_LABEL: (count: number) => ReactNode = (count) => `${count} restart${count === 1 ? '' : 's'}`

function ContainerList({
  containers,
  onStart,
  onStop,
  onRestart,
  now,
  locale = 'en-GB',
  emptyLabel = 'No containers',
  upLabel = 'up',
  restartsLabel = DEFAULT_RESTARTS_LABEL,
  startLabel = 'Start',
  stopLabel = 'Stop',
  restartLabel = 'Restart',
  className,
  ...props
}: ComponentProps<'div'> & {
  containers: Container[]
  onStart?: (id: string) => void
  onStop?: (id: string) => void
  onRestart?: (id: string) => void
  now?: Date
  locale?: string
  emptyLabel?: ReactNode
  /** Precedes the uptime. */
  upLabel?: ReactNode
  /** Restart count, given the number. */
  restartsLabel?: (count: number) => ReactNode
  startLabel?: string
  stopLabel?: string
  restartLabel?: string
}) {
  if (containers.length === 0) {
    return (
      <div className={cn(surface, radius.surface, className)} {...props}>
        <p className="text-muted-foreground p-8 text-center text-sm">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul
      data-slot="container-list"
      className={cn(surface, radius.surface, 'divide-border list-none divide-y', className)}
      {...(props as ComponentProps<'ul'>)}
    >
      {containers.map((container) => {
        const meta = STATE[container.state]
        const live = container.state === 'running' || container.state === 'restarting'

        return (
          <li key={container.id} className="flex items-start gap-3 p-3">
            <Box className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium">{container.name}</span>
                <Badge size="sm" color={meta.color}>
                  {meta.label}
                </Badge>
                {/* Running with 47 restarts is a crash loop, not health. */}
                {Boolean(container.restarts) && (
                  <Badge size="sm" color={container.restarts! > 3 ? 'destructive' : 'amber'}>
                    {restartsLabel(container.restarts!)}
                  </Badge>
                )}
              </p>

              <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
                {container.image}
                {/* The tag is why two hosts run different code. */}
                <span className="text-muted-foreground/60">:{container.tag ?? 'latest'}</span>
              </p>

              <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                {container.startedAt && live && (
                  <span>
                    {upLabel} <Fmt type="relative" value={container.startedAt} now={now} locale={locale} />
                  </span>
                )}
                {container.cpu !== undefined && (
                  <span className="tabular-nums">{container.cpu.toFixed(1)}% CPU</span>
                )}
                {container.memory !== undefined && (
                  <span className="tabular-nums">
                    <Fmt type="bytes" value={container.memory} />
                  </span>
                )}
                {container.ports?.map((port) => (
                  <span key={port} className="font-mono">
                    {port}
                  </span>
                ))}
              </p>
            </div>

            {/* Absent rather than disabled — a greyed Start on every running
                row is noise. */}
            <div className="flex shrink-0 gap-1">
              {!live && onStart && (
                <Button variant="ghost" size="icon-xs" aria-label={startLabel} onClick={() => onStart(container.id)}>
                  <Play />
                </Button>
              )}
              {live && onStop && (
                <Button variant="ghost" size="icon-xs" aria-label={stopLabel} onClick={() => onStop(container.id)}>
                  <Square />
                </Button>
              )}
              {onRestart && (
                <Button variant="ghost" size="icon-xs" aria-label={restartLabel} onClick={() => onRestart(container.id)}>
                  <RotateCcw />
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export { ContainerList }
