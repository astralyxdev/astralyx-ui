import type { ReactNode } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { useClipboard } from '@/lib/use-clipboard'
import { cn } from '@/lib/utils'

/**
 * Copies a string and says so.
 *
 * The label changes rather than only the icon, because a tick replacing a
 * clipboard is invisible to a screen reader unless the accessible name changes
 * too — and `aria-live` on a button is the wrong tool for something the user
 * just did deliberately.
 *
 * `value` may be a function, for text that is expensive to build or that must
 * be read at click time rather than at render time.
 */
function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  showLabel = false,
  variant = 'ghost',
  size,
  className,
  onClick,
  ...props
}: Omit<ButtonProps, 'value' | 'children'> & {
  value: string | (() => string)
  label?: string
  copiedLabel?: string
  /** Render the label beside the icon instead of only as the accessible name. */
  showLabel?: boolean
  children?: ReactNode
}) {
  const { copy, state } = useClipboard()

  const text =
    state === 'error' ? 'Copy failed' : state === 'copied' ? copiedLabel : label
  const Icon = state === 'error' ? X : state === 'copied' ? Check : Copy

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (showLabel ? 'xs' : 'icon-xs')}
      data-state={state}
      // The accessible name carries the result; the icon alone would not.
      aria-label={showLabel ? undefined : text}
      className={cn(state === 'error' && 'text-[var(--destructive-soft-foreground)]', className)}
      onClick={(event) => {
        onClick?.(event)
        void copy(typeof value === 'function' ? value() : value)
      }}
      {...props}
    >
      <Icon />
      {showLabel && text}
    </Button>
  )
}

export { CopyButton }
