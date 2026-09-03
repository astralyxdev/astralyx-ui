import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** A keyboard key. Splits on `+` so a chord can be written as one string. */
function Kbd({
  className,
  keys,
  children,
  ...props
}: ComponentProps<'kbd'> & { keys?: string }) {
  const parts = keys?.split('+').map((key) => key.trim())

  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'text-muted-foreground inline-flex items-center gap-1 font-mono text-xs',
        className,
      )}
      {...props}
    >
      {parts
        ? parts.map((key, index) => (
            <span
              key={index}
              className="border-border bg-muted rounded-md border px-1.5 py-0.5"
            >
              {key}
            </span>
          ))
        : children}
    </kbd>
  )
}

export { Kbd }
