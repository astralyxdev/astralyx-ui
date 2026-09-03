import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { colorSet, menuSurface, radius, type ColorSet } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Transient messages that stack and dismiss themselves.
 *
 * A provider plus a `useToast()` hook, rather than a global singleton: the queue
 * lives in React state, so it participates in normal rendering and testing, and
 * two independent regions can coexist.
 *
 * The region is `aria-live="polite"` so a toast is announced without stealing
 * focus — a toast that grabs focus interrupts whatever the user was typing.
 */
type ToastOptions = {
  title?: ReactNode
  description?: ReactNode
  color?: ColorSet
  /** Milliseconds before auto-dismiss. `0` keeps it until dismissed. */
  duration?: number
  action?: ReactNode
}

type ToastRecord = ToastOptions & { id: number }

type ToastContextValue = {
  toasts: ToastRecord[]
  toast: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}

function ToastProvider({
  children,
  max = 4,
  position = 'bottom-end',
}: {
  children: ReactNode
  /** Oldest toasts fall off the end once this many are showing. */
  max?: number
  position?: 'top-end' | 'top-start' | 'bottom-end' | 'bottom-start'
}) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      const duration = options.duration ?? 4000

      setToasts((current) => [...current, { ...options, id }].slice(-max))

      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        )
      }

      return id
    },
    [dismiss, max],
  )

  // Clear every pending timer on unmount, or they fire into a dead tree.
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [])

  const context = useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  )

  return (
    <ToastContext value={context}>
      {children}
      <ToastRegion position={position} />
    </ToastContext>
  )
}

const POSITION = {
  'top-end': 'top-4 end-4 flex-col',
  'top-start': 'top-4 start-4 flex-col',
  'bottom-end': 'bottom-4 end-4 flex-col-reverse',
  'bottom-start': 'bottom-4 start-4 flex-col-reverse',
}

function ToastRegion({
  position,
  label = 'Notifications',
}: {
  position: keyof typeof POSITION
  /** Accessible name for the live region. */
  label?: string
}) {
  const { toasts, dismiss } = useToast()

  return (
    <div
      role="region"
      aria-label={label}
      aria-live="polite"
      data-slot="toast-region"
      className={cn(
        'pointer-events-none fixed z-50 flex w-[min(24rem,100vw-2rem)] gap-2',
        POSITION[position],
      )}
    >
      {toasts.map(({ id, ...item }) => (
        <Toast key={id} {...item} onDismiss={() => dismiss(id)} />
      ))}
    </div>
  )
}

// `id` is deliberately not forwarded: a numeric record id is not a DOM id.
function Toast({
  title,
  description,
  color = 'neutral',
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
  ...props
}: ToastOptions & {
  onDismiss: () => void
  /** Accessible name for the dismiss button. */
  dismissLabel?: string
} & Omit<ComponentProps<'div'>, 'title' | 'color'>) {
  return (
    <div
      data-slot="toast"
      className={cn(
        menuSurface,
        radius.surface,
        colorSet[color],
        'pointer-events-auto flex items-start gap-3 overflow-hidden p-4',
        'animate-[toast-in_200ms_ease-out] motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {title && (
          <div className="text-sm font-medium text-[var(--ui-soft-fg)]">
            {title}
          </div>
        )}
        {description && (
          <div className="text-muted-foreground text-xs">{description}</div>
        )}
        {action && <div className="pt-1">{action}</div>}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={dismissLabel}
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  )
}

export { Toast, ToastProvider }
export type { ToastOptions }
