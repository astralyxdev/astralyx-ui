import type { ComponentProps, ReactNode } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/**
 * Who is currently typing.
 *
 * The wording is built from the count rather than concatenated by the caller,
 * because the grammar changes at every step: one name, two names joined by
 * "and", then "and 3 others". Callers that build this string themselves get
 * "Ada and  are typing" the moment the list is empty.
 *
 * The dots animate — the one place a pure-colour transition cannot carry the
 * meaning, since "someone is typing right now" is inherently about liveness.
 * They stop under `prefers-reduced-motion`, where the text still says it.
 */
function TypingIndicator({
  names,
  showAvatars = false,
  avatars,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  names: string[]
  showAvatars?: boolean
  avatars?: ReactNode
}) {
  if (names.length === 0) return null

  // Grammar by count — the reason this is not a template string in the caller.
  const text =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]}, ${names[1]} and ${names.length - 2} ${
            names.length - 2 === 1 ? 'other' : 'others'
          } are typing`

  return (
    <div
      data-slot="typing-indicator"
      aria-live="polite"
      className={cn('text-muted-foreground flex items-center gap-2 text-xs', className)}
      {...props}
    >
      {showAvatars &&
        (avatars ?? (
          <span className="flex -space-x-1.5">
            {names.slice(0, 3).map((name) => (
              <Avatar key={name} size="xs" name={name} className="ring-background ring-2" />
            ))}
          </span>
        ))}

      <span>{text}</span>

      <span aria-hidden="true" className="flex items-center gap-0.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="bg-muted-foreground/60 size-1 animate-bounce rounded-full [corner-shape:round] motion-reduce:animate-none"
            style={{ animationDelay: `${index * 140}ms` }}
          />
        ))}
      </span>
    </div>
  )
}

export { TypingIndicator }
