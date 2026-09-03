import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A placeholder shape for content that has not arrived.
 *
 * The pulse animates opacity only — no size or position — so it sits inside the
 * kit's motion rule, and it stops entirely under `prefers-reduced-motion`.
 */
const skeletonVariants = cva(
  'bg-secondary animate-pulse motion-reduce:animate-none',
  {
    variants: {
      shape: {
        block: radius.control,
        /** A line of text: height follows the line, corners stay soft. */
        text: 'h-4 rounded-md',
        circle: 'rounded-full [corner-shape:round]',
      },
    },
    defaultVariants: { shape: 'block' },
  },
)

type SkeletonProps = ComponentProps<'div'> &
  VariantProps<typeof skeletonVariants> & {
    /** Render this many stacked lines. Only meaningful with `shape="text"`. */
    lines?: number
  }

function Skeleton({ className, shape, lines, ...props }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div data-slot="skeleton-group" className="grid w-full gap-2" {...props}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            data-slot="skeleton"
            className={cn(
              skeletonVariants({ shape: shape ?? 'text' }),
              // A ragged last line reads as a paragraph rather than a block.
              index === lines - 1 ? 'w-3/5' : 'w-full',
              className,
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ shape }), className)}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
export type { SkeletonProps }
