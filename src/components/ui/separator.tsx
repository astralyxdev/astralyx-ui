import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SeparatorProps = Omit<ComponentProps<'div'>, 'children'> & {
  orientation?: 'horizontal' | 'vertical'
  /** Text set into the rule, e.g. "or". Horizontal only. */
  label?: ReactNode
  /**
   * Purely visual, with no structural meaning. Hidden from assistive tech —
   * which is the right default for a rule between two halves of one thing.
   */
  decorative?: boolean
}

function Separator({
  className,
  orientation = 'horizontal',
  label,
  decorative = true,
  ...props
}: SeparatorProps) {
  const a11y = decorative
    ? { role: 'none' as const }
    : { role: 'separator' as const, 'aria-orientation': orientation }

  if (label && orientation === 'horizontal') {
    return (
      <div
        data-slot="separator"
        className={cn('flex w-full items-center gap-3', className)}
        {...a11y}
        {...props}
      >
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
        <span className="bg-border h-px flex-1" />
      </div>
    )
  }

  return (
    <div
      data-slot="separator"
      className={cn(
        'bg-border shrink-0',
        // Vertical relies on `self-stretch`, not `h-full`. In a flex row the
        // parent's height is usually auto, so `height: 100%` resolves against
        // nothing and the rule collapses to a zero-height line. `align-self:
        // stretch` fills the cross axis regardless, and still yields to an
        // explicit height passed through className.
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...a11y}
      {...props}
    />
  )
}

export { Separator }
export type { SeparatorProps }
