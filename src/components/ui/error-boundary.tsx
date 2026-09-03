import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Catches a render error in its subtree and shows a fallback.
 *
 * The one component here that must be a class: `componentDidCatch` and
 * `getDerivedStateFromError` have no hook equivalent, and React has said they
 * are not getting one.
 *
 * `resetKeys` is what makes recovery work. Clearing the error alone re-renders
 * the same children with the same props and throws again immediately — the
 * boundary has to be told what changed. Pass whatever caused the failure (a
 * route, a record id) and it resets when that changes.
 *
 * It deliberately does not report anywhere. Wire `onError` to your own
 * telemetry rather than having a UI component decide where errors go.
 */
type ErrorBoundaryProps = {
  children: ReactNode
  /** Rendered instead of the subtree. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
  /** Clears the error whenever any of these change. */
  resetKeys?: unknown[]
  title?: string
  /** Text on the reset button in the default fallback. */
  retryLabel?: ReactNode
}

type ErrorBoundaryState = { error: Error | null }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    const before = previous.resetKeys
    const after = this.props.resetKeys
    if (!this.state.error || !before || !after) return

    const changed =
      before.length !== after.length ||
      before.some((key, index) => !Object.is(key, after[index]))

    if (changed) this.reset()
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <div
        role="alert"
        data-slot="error-boundary"
        className={cn(surface, radius.surface, 'flex flex-col items-start gap-3 p-4')}
      >
        <div className="flex items-center gap-2">
          <TriangleAlert
            className="size-4 shrink-0 text-[var(--destructive-soft-foreground)]"
            aria-hidden="true"
          />
          <h2 className="text-sm font-medium">
            {this.props.title ?? 'Something went wrong'}
          </h2>
        </div>

        <p className="text-muted-foreground font-mono text-xs break-words">
          {error.message}
        </p>

        <Button variant="secondary" size="sm" onClick={this.reset}>
          <RotateCcw />
          {this.props.retryLabel ?? 'Try again'}
        </Button>
      </div>
    )
  }
}

export { ErrorBoundary }
export type { ErrorBoundaryProps }
