import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * An indeterminate busy indicator.
 *
 * Rotation is the exception the motion rule has to allow — a still spinner says
 * nothing at all. It stops under `prefers-reduced-motion`, where the label and
 * `role="status"` still carry the meaning.
 */
const spinnerVariants = cva(
  'inline-block animate-spin rounded-full border-current border-e-transparent motion-reduce:animate-none',
  {
    variants: {
      size: {
        xs: 'size-3 border-[1.5px]',
        sm: 'size-4 border-2',
        default: 'size-5 border-2',
        lg: 'size-6 border-2',
        xl: 'size-8 border-[3px]',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

function Spinner({
  className,
  size,
  label = 'Loading',
  ...props
}: ComponentProps<'span'> & VariantProps<typeof spinnerVariants> & {
  label?: string
}) {
  return (
    <span
      role="status"
      data-slot="spinner"
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      <span aria-hidden="true" className={cn(spinnerVariants({ size }))} />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export { Spinner, spinnerVariants }
