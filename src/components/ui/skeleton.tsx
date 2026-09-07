import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A placeholder shape for content that has not arrived.
 *
 * A band of light crossing the shape, rather than the whole shape pulsing. Both
 * read as *loading*, but a sweep has a direction, so a column of twelve of them
 * scans as one surface waking up instead of twelve boxes blinking out of step.
 *
 * The band is a pseudo-element that translates, so the animation is composited
 * and the box itself never repaints. Under `prefers-reduced-motion` the sweep
 * is dropped entirely and the plain tinted shape is left standing — a
 * placeholder still has to look like a placeholder when it cannot move.
 */
const skeletonVariants = cva(
  [
    'bg-secondary relative isolate overflow-hidden',
    'after:absolute after:inset-0 after:content-[""]',
    'after:bg-gradient-to-r after:from-transparent after:via-foreground/10 after:to-transparent',
    'motion-safe:after:animate-[ax-sweep_1.6s_ease-in-out_infinite]',
    'motion-reduce:after:hidden',
  ].join(' '),
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
