import type { ComponentProps } from 'react'
import {
  ExternalLink, GitBranch, RotateCcw, Timer,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip } from '@/components/ui/tooltip'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Deployments, newest first.
 *
 * A running deploy shows an indeterminate bar rather than a fake percentage —
 * a progress number nobody can compute is worse than admitting you cannot.
 */
export type Deploy = {
  id: string
  environment: 'production' | 'preview' | 'staging'
  status: 'ready' | 'building' | 'failed' | 'canceled'
  branch: string
  commit: string
  message: string
  author: string
  /** Seconds. Omit while building. */
  duration?: number
  when: string
  url?: string
}

const STATUS = {
  ready: { color: 'green', label: 'Ready' },
  building: { color: 'blue', label: 'Building' },
  failed: { color: 'destructive', label: 'Failed' },
  canceled: { color: 'neutral', label: 'Canceled' },
} as const

const ENVIRONMENT = {
  production: 'violet',
  preview: 'cyan',
  staging: 'amber',
} as const

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m}m ${s}s` : `${s}s`
}

function DeployList({
  className,
  deploys,
  onRedeploy,
  ...props
}: ComponentProps<'div'> & {
  deploys: Deploy[]
  onRedeploy?: (id: string) => void
}) {
  return (
    <div
      data-slot="deploy-list"
      // Rows are full-bleed, so the container has to clip or the first and last
      // lose the rounded corners the moment they take a background.
      className={cn(
        surface,
        radius.panel,
        'divide-border divide-y overflow-hidden',
        className,
      )}
      {...props}
    >
      {deploys.map((deploy) => {
        const status = STATUS[deploy.status]
        const building = deploy.status === 'building'

        return (
          <div key={deploy.id} data-slot="deploy" className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge size="sm" color={status.color}>
                {building && <Spinner size="xs" />}
                {status.label}
              </Badge>
              <Badge size="sm" color={ENVIRONMENT[deploy.environment]}>
                {deploy.environment}
              </Badge>
              <span className="text-muted-foreground ms-auto text-xs whitespace-nowrap">
                {deploy.when}
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">{deploy.message}</p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="flex items-center gap-1">
                  <GitBranch className="size-3" /> {deploy.branch}
                </span>
                <span className="font-mono">{deploy.commit.slice(0, 7)}</span>
                <span className="flex items-center gap-1.5">
                  <Avatar size="xs" name={deploy.author} /> {deploy.author}
                </span>
                {deploy.duration !== undefined && (
                  <span className="flex items-center gap-1">
                    <Timer className="size-3" /> {formatDuration(deploy.duration)}
                  </span>
                )}
              </div>
            </div>

            {building && <Progress size="sm" color="blue" />}

            <div className="flex items-center gap-2">
              {deploy.url && (
                <Button asChild size="xs" variant="secondary">
                  <a href={deploy.url} target="_blank" rel="noreferrer">
                    <ExternalLink /> Visit
                  </a>
                </Button>
              )}
              {onRedeploy && (
                <Tooltip content="Run this deployment again">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onRedeploy(deploy.id)}
                  >
                    <RotateCcw /> Redeploy
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { DeployList, formatDuration }
