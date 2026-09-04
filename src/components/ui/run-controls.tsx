import type { ComponentProps, ReactNode } from 'react'
import { Pause, Play, RotateCcw, SkipForward, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The transport bar for an agent run: start, pause, step, stop, replay.
 *
 * Stepping is what makes an agent debuggable. Watching one run at full speed
 * tells you what it did; stepping tells you what it was about to do, which is
 * the only moment you can still intervene.
 *
 * **Stop is always available while anything is running, and never disabled by a
 * pending state.** A run that has wedged is exactly when you most need to stop
 * it, and that is exactly when a UI that disables the button during "stopping"
 * leaves you with no way out.
 *
 * Which buttons exist is derived from `status`, not from a pile of booleans at
 * the call site — the invalid combinations (running *and* paused, replay while
 * live) simply cannot be expressed.
 */
export type RunStatus = 'idle' | 'running' | 'paused' | 'stopping' | 'done' | 'error'

const STATUS: Record<RunStatus, { label: string; color: 'neutral' | 'blue' | 'amber' | 'green' | 'destructive' }> = {
  idle: { label: 'Ready', color: 'neutral' },
  running: { label: 'Running', color: 'blue' },
  paused: { label: 'Paused', color: 'amber' },
  stopping: { label: 'Stopping', color: 'amber' },
  done: { label: 'Finished', color: 'green' },
  error: { label: 'Failed', color: 'destructive' },
}

type RunControlsProps = Omit<ComponentProps<'div'>, 'onPause'> & {
  status: RunStatus
  onStart?: () => void
  onPause?: () => void
  onResume?: () => void
  onStep?: () => void
  onStop?: () => void
  onReplay?: () => void
  /** Steps completed, shown beside the status. */
  step?: number
  totalSteps?: number
  /** Already formatted — this component does not own your locale. */
  elapsed?: ReactNode
  /** Trailing slot — a model picker, a spend cap, a link to the trace. */
  children?: ReactNode
  startLabel?: string
  pauseLabel?: string
  resumeLabel?: string
  stepLabel?: string
  stopLabel?: string
  replayLabel?: string
  statusLabels?: Partial<Record<RunStatus, string>>
}

function RunControls({
  status,
  onStart,
  onPause,
  onResume,
  onStep,
  onStop,
  onReplay,
  step,
  totalSteps,
  elapsed,
  children,
  startLabel = 'Run',
  pauseLabel = 'Pause',
  resumeLabel = 'Resume',
  stepLabel = 'Step',
  stopLabel = 'Stop',
  replayLabel = 'Replay',
  statusLabels,
  className,
  ...props
}: RunControlsProps) {
  const meta = STATUS[status]
  const live = status === 'running' || status === 'paused' || status === 'stopping'
  const settled = status === 'done' || status === 'error'

  return (
    <div
      data-slot="run-controls"
      data-status={status}
      className={cn(
        surface,
        radius.surface,
        'flex flex-wrap items-center gap-2 p-2.5',
        className,
      )}
      {...props}
    >
      {status === 'idle' && onStart && (
        <Button size="sm" onClick={onStart}>
          <Play />
          {startLabel}
        </Button>
      )}

      {status === 'running' && onPause && (
        <Button size="sm" variant="secondary" onClick={onPause}>
          <Pause />
          {pauseLabel}
        </Button>
      )}

      {status === 'paused' && onResume && (
        <Button size="sm" onClick={onResume}>
          <Play />
          {resumeLabel}
        </Button>
      )}

      {/* Stepping only means anything from a stopped clock. */}
      {status === 'paused' && onStep && (
        <Button size="sm" variant="secondary" onClick={onStep}>
          <SkipForward />
          {stepLabel}
        </Button>
      )}

      {live && onStop && (
        // Never disabled, including while stopping: a wedged run is exactly
        // when you need this, and exactly when a disabled button traps you.
        <Button size="sm" variant="ghost" onClick={onStop}>
          <Square />
          {stopLabel}
        </Button>
      )}

      {settled && onReplay && (
        <Button size="sm" variant="secondary" onClick={onReplay}>
          <RotateCcw />
          {replayLabel}
        </Button>
      )}

      <div className="ms-1 flex min-w-0 flex-1 items-center gap-2.5">
        {status === 'running' && <Spinner size="sm" label="Running" />}
        <Badge size="sm" color={meta.color}>
          {statusLabels?.[status] ?? meta.label}
        </Badge>

        {step !== undefined && (
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {totalSteps === undefined ? `step ${step}` : `${step} / ${totalSteps}`}
          </span>
        )}

        {elapsed !== undefined && (
          <span className="text-muted-foreground/70 font-mono text-xs tabular-nums">{elapsed}</span>
        )}
      </div>

      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

export { RunControls }
export type { RunControlsProps }
