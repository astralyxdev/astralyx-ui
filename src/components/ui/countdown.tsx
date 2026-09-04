import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Time remaining until a deadline, ticking.
 *
 * For the things an agent or an API hands you an expiry for: a rate-limit
 * reset, a signed URL, a token, a maintenance window, a hold on a booking.
 *
 * **It counts toward a `Date`, not down from a number of seconds.** A duration
 * decremented on an interval drifts — `setInterval` is throttled in a
 * background tab and never fires on exactly its period — so a five-minute timer
 * left in a background tab finishes minutes late and confidently displays the
 * wrong number. Recomputing from the target each tick is correct whatever the
 * interval actually did, and survives the tab being suspended entirely.
 *
 * The interval is derived from what is displayed: a countdown showing seconds
 * ticks every second, one showing only minutes ticks every fifteen. Waking the
 * main thread once a second to redraw a number that changes once a minute is a
 * battery cost with nothing to show for it.
 *
 * At zero it stops and renders `expiredLabel` — it never shows negative time,
 * which reads as a bug rather than as elapsed time.
 */
type CountdownProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** The deadline. */
  to: Date
  /** Hide seconds for a long, coarse countdown. */
  showSeconds?: boolean
  /** Include days once the gap is over 24 hours. */
  showDays?: boolean
  /** Rendered once the deadline passes. */
  expiredLabel?: ReactNode
  /** Fires once, when it reaches zero. */
  onExpire?: () => void
  /** Fixed reference instead of the clock — for tests and static rendering. */
  now?: Date
  /** Formats the parts. Defaults to `1d 04:12:09`. */
  format?: (parts: {
    days: number
    hours: number
    minutes: number
    seconds: number
    total: number
  }) => ReactNode
}

const pad = (value: number) => String(value).padStart(2, '0')

function defaultFormat(
  { days, hours, minutes, seconds }: { days: number; hours: number; minutes: number; seconds: number },
  showSeconds: boolean,
  showDays: boolean,
) {
  const clock = showSeconds
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}`
  return showDays && days > 0 ? `${days}d ${clock}` : clock
}

function Countdown({
  to,
  showSeconds = true,
  showDays = true,
  expiredLabel = 'Expired',
  onExpire,
  now,
  format,
  className,
  ...props
}: CountdownProps) {
  // Frozen when `now` is given, so a server render and a test are deterministic.
  const [tick, setTick] = useState(() => (now ?? new Date()).getTime())
  const target = to.getTime()
  const remaining = Math.max(0, target - tick)

  useEffect(() => {
    if (now) return
    if (target <= Date.now()) {
      onExpire?.()
      return
    }

    // Matched to what is on screen: no point waking every second to redraw a
    // number that only changes every minute.
    const period = showSeconds ? 1000 : 15_000
    const id = setInterval(() => {
      // Recomputed from the clock, never decremented — an interval that fired
      // late, or not at all, cannot make this drift.
      const next = Date.now()
      setTick(next)
      if (next >= target) {
        clearInterval(id)
        onExpire?.()
      }
    }, period)

    return () => clearInterval(id)
  }, [target, showSeconds, now, onExpire])

  if (remaining <= 0) {
    return (
      <span data-slot="countdown" data-expired="true" className={cn('tabular-nums', className)} {...props}>
        {expiredLabel}
      </span>
    )
  }

  const totalSeconds = Math.floor(remaining / 1000)
  const parts = {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    total: totalSeconds,
  }
  // Days fold into hours when they are not shown separately, or a two-day
  // countdown would read as `00:12:09`.
  const shown = showDays ? parts : { ...parts, hours: parts.hours + parts.days * 24, days: 0 }

  return (
    <span
      data-slot="countdown"
      className={cn('font-mono tabular-nums', className)}
      {...props}
    >
      {format ? format(shown) : defaultFormat(shown, showSeconds, showDays)}
    </span>
  )
}

export { Countdown }
export type { CountdownProps }
