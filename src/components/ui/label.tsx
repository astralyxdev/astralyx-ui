import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A form label. `htmlFor` is the point — clicking it focuses the control, and a
 * screen reader announces the two together.
 */
function Label({
  className,
  required,
  children,
  ...props
}: ComponentProps<'label'> & { required?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-1 text-sm leading-none font-medium select-none',
        'has-[+_:disabled]:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </label>
  )
}

export { Label }
