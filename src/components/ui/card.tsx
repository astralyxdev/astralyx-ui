import { createContext, use, type ComponentProps, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cardPadding, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A surface that groups related content, split into three optional sections.
 *
 * Header and footer draw their own dividers; a Card holding only a CardBody is
 * just a padded box, with no stray rules. The Card's `size` reaches its sections
 * through context, so `<Card size="lg">` re-pads all of them and a section can
 * still override its own.
 */
type CardSize = keyof typeof cardPadding

const CardContext = createContext<CardSize>('default')

// `overflow-hidden` is what lets a tinted header sit flush in the rounded
// corner instead of poking a square edge out of it.
const cardVariants = cva([surface, 'flex flex-col overflow-hidden'].join(' '), {
  variants: {
    variant: {
      default: '',
      /** Filled, no border — for a card sitting on the page background. */
      secondary: 'bg-secondary border-transparent',
      /** Outline only, no fill. */
      ghost: 'bg-transparent',
    },
  },
  defaultVariants: { variant: 'default' },
})

type CardProps = ComponentProps<'div'> &
  VariantProps<typeof cardVariants> & { size?: CardSize }

function Card({
  className,
  variant,
  size = 'default',
  ...props
}: CardProps) {
  return (
    <CardContext value={size}>
      <div
        data-slot="card"
        data-size={size}
        className={cn(cardVariants({ variant }), radius.panel, className)}
        {...props}
      />
    </CardContext>
  )
}

function useCardPadding(override?: CardSize) {
  const inherited = use(CardContext)
  return cardPadding[override ?? inherited]
}

/**
 * A header takes a title and a description. Anything else — a menu, a filter,
 * a badge — goes in `action`.
 *
 * The slot exists because the alternative was a habit: a caller who needs a
 * control beside the title reaches for `className="flex-row justify-between"`,
 * which turns the header's own column into a row and lands the description
 * beside the title rather than under it. Every one of them then re-stacks the
 * pair in a wrapper div by hand. This owns that layout instead, so the title
 * column keeps its stacking and the control keeps its size.
 *
 * The control never shrinks and the text column always can, so a long title
 * truncates rather than squeezing a select into illegibility.
 */
function CardHeader({
  className,
  size,
  action,
  children,
  ...props
}: ComponentProps<'div'> & { size?: CardSize; action?: ReactNode }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // A shade darker than the body, so the header reads as a distinct band
        // without needing a heavier rule under it.
        'border-border bg-[var(--card-header)] flex gap-1 border-b',
        action ? 'flex-row items-center justify-between gap-3' : 'flex-col',
        useCardPadding(size),
        className,
      )}
      {...props}
    >
      {action ? <div className="flex min-w-0 flex-col gap-1">{children}</div> : children}
      {action && (
        <div className="flex shrink-0 items-center gap-1.5">{action}</div>
      )}
    </div>
  )
}

/**
 * The heading level is a prop because the right one depends on where the card
 * sits: a card directly under the page's `h1` should be an `h2`, and one inside
 * a section that already has an `h2` should be an `h3`. Hard-coding it means
 * every page that nests differently skips a level.
 */
function CardTitle({
  className,
  as: Comp = 'h3',
  ...props
}: ComponentProps<'h3'> & { as?: 'h2' | 'h3' | 'h4' | 'div' }) {
  return (
    <Comp
      data-slot="card-title"
      className={cn('text-sm leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-muted-foreground text-xs', className)}
      {...props}
    />
  )
}

function CardBody({
  className,
  size,
  ...props
}: ComponentProps<'div'> & { size?: CardSize }) {
  return (
    <div
      data-slot="card-body"
      className={cn('flex-1', useCardPadding(size), className)}
      {...props}
    />
  )
}

function CardFooter({
  className,
  size,
  ...props
}: ComponentProps<'div'> & { size?: CardSize }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'border-border flex items-center gap-2 border-t',
        useCardPadding(size),
        className,
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
}
export type { CardProps, CardSize }
