import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { colorSet, radius, tintStyle, type ColorSet } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A prominent message that stays on the page.
 *
 * Like Badge, an alert is meant to be noticed, so it keeps the colour system.
 * `role` follows severity: a destructive alert is announced immediately, the
 * rest are announced when the user gets to them.
 */
const alertVariants = cva(
  ['flex w-full gap-3', "[&_svg:not([class*='size-'])]:size-4"].join(' '),
  {
    variants: {
      variant: {
        /** Tinted panel — the readable default for a long message. */
        default: 'bg-[var(--ui-soft)] text-[var(--ui-soft-fg)]',
        outline:
          'border border-[color-mix(in_oklab,var(--ui),transparent_70%)] text-[var(--ui-soft-fg)]',
        /** Solid, for a message that must not be missed. */
        solid: 'bg-[var(--ui)] text-[var(--ui-fg)]',
      },
      color: colorSet,
      size: {
        sm: 'p-3 text-xs',
        default: 'p-4 text-sm',
      },
    },
    defaultVariants: { variant: 'default', color: 'neutral', size: 'default' },
  },
)

type AlertProps = Omit<ComponentProps<'div'>, 'color' | 'title'> &
  VariantProps<typeof alertVariants> & {
    icon?: ReactNode
    title?: ReactNode
    /** Any CSS colour, used instead of a named `color` set. */
    tint?: string
  }

function Alert({
  className,
  variant,
  color,
  size,
  icon,
  title,
  tint,
  style,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      // A destructive message interrupts; anything else waits its turn.
      role={color === 'destructive' ? 'alert' : 'status'}
      data-slot="alert"
      className={cn(alertVariants({ variant, color, size }), radius.surface, className)}
      style={tint ? { ...tintStyle(tint), ...style } : style}
      {...props}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 space-y-1">
        {title && <div className="font-medium">{title}</div>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  )
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('font-medium', className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('opacity-90', className)}
      {...props}
    />
  )
}

export { Alert, AlertDescription, AlertTitle, alertVariants }
export type { AlertProps, ColorSet }
