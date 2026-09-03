import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { avatarSize, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An image standing in for a person, with a fallback that always renders.
 *
 * The image is swapped out on error rather than left broken, and initials are
 * derived from `name` so a caller does not have to compute them.
 */
const avatarVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
    'bg-secondary text-secondary-foreground font-medium select-none',
  ].join(' '),
  {
    variants: {
      size: {
        xs: avatarSize.xs,
        sm: avatarSize.sm,
        default: avatarSize.default,
        lg: avatarSize.lg,
        xl: avatarSize.xl,
      },
      shape: {
        circle: 'rounded-full [corner-shape:round]',
        rounded: radius.control,
      },
    },
    defaultVariants: { size: 'default', shape: 'circle' },
  },
)

/** First letters of the first and last word — "Ada Lovelace" becomes "AL". */
function initialsFrom(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

type AvatarProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatarVariants> & {
    src?: string
    /** Used for the alt text and to derive fallback initials. */
    name?: string
    /** Overrides the derived initials. */
    fallback?: ReactNode
  }

function Avatar({
  className,
  size,
  shape,
  src,
  name,
  fallback,
  ...props
}: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span
      data-slot="avatar"
      className={cn(avatarVariants({ size, shape }), className)}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? ''}
          // A broken URL falls through to the initials instead of an icon.
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden={Boolean(name)}>
          {fallback ?? (name ? initialsFrom(name) : null)}
        </span>
      )}
      {!showImage && name && <span className="sr-only">{name}</span>}
    </span>
  )
}

/**
 * Overlapping row of avatars.
 *
 * The group's `size` is pushed onto every child rather than left to each one.
 * A row where the members and the "+N" chip disagree on size reads as a
 * rendering fault, and per-child sizes are the easiest way to end up there.
 */
function AvatarGroup({
  className,
  max,
  size = 'default',
  children,
  ...props
}: ComponentProps<'div'> & {
  max?: number
  size?: VariantProps<typeof avatarVariants>['size']
}) {
  const items = Children.toArray(children).filter(isValidElement)
  const shown = max ? items.slice(0, max) : items
  const hidden = items.length - shown.length

  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'flex items-center -space-x-2 [&_[data-slot=avatar]]:ring-background [&_[data-slot=avatar]]:ring-2',
        className,
      )}
      {...props}
    >
      {shown.map((child, index) =>
        cloneElement(child as ReactElement<AvatarProps>, {
          key: (child as ReactElement).key ?? index,
          size,
        }),
      )}
      {hidden > 0 && (
        <Avatar size={size} fallback={`+${hidden}`} className="bg-muted" />
      )}
    </div>
  )
}


/**
 * A marker pinned to a corner of an Avatar — presence, a count, a small icon.
 *
 * Positioned against an `AvatarWithBadge` wrapper rather than the Avatar
 * itself, because the Avatar is `overflow-hidden` to clip its image: anything
 * absolutely positioned inside it would be cut off at exactly the corner it is
 * meant to sit on.
 *
 * The ring is not decoration. A status dot the same colour as something behind
 * it disappears; a ring in the surface colour keeps the badge legible on any
 * background, which is why it is on by default.
 */
export type AvatarBadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

const BADGE_POSITION = {
  'top-right': 'top-0 end-0',
  'top-left': 'top-0 start-0',
  'bottom-right': 'bottom-0 end-0',
  'bottom-left': 'bottom-0 start-0',
} as const

/** Short aliases, since these corners are usually written as two letters. */
const POSITION_ALIAS = {
  tr: 'top-right',
  tl: 'top-left',
  br: 'bottom-right',
  bl: 'bottom-left',
} as const

const BADGE_SIZE = {
  xs: 'size-2 text-[8px]',
  sm: 'size-2.5 text-[8px]',
  default: 'size-3 text-[9px]',
  lg: 'size-3.5 text-[10px]',
} as const

const BADGE_TONE = {
  online: 'bg-[var(--green)]',
  away: 'bg-[var(--amber)]',
  busy: 'bg-[var(--destructive)]',
  offline: 'bg-muted-foreground',
  primary: 'bg-primary text-primary-foreground',
  neutral: 'bg-secondary text-secondary-foreground',
} as const

function AvatarBadge({
  position = 'bottom-right',
  size = 'default',
  tone = 'online',
  ring = true,
  label,
  className,
  children,
  ...props
}: ComponentProps<'span'> & {
  /** Corner to pin to. `tr`, `tl`, `br` and `bl` are accepted too. */
  position?: AvatarBadgePosition | keyof typeof POSITION_ALIAS
  size?: keyof typeof BADGE_SIZE
  tone?: keyof typeof BADGE_TONE
  /** Ring in the surface colour, so the badge reads on any background. */
  ring?: boolean
  /** Accessible name. A bare status dot is invisible without one. */
  label?: string
}) {
  const corner =
    position in POSITION_ALIAS
      ? POSITION_ALIAS[position as keyof typeof POSITION_ALIAS]
      : (position as AvatarBadgePosition)

  return (
    <span
      data-slot="avatar-badge"
      data-position={corner}
      // A dot with no text needs a name, or it is announced as nothing at all.
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'pointer-events-none absolute z-10 flex items-center justify-center rounded-full font-medium [corner-shape:round]',
        BADGE_POSITION[corner],
        // Children need room; a bare dot does not.
        children ? 'min-w-4 px-1' : '',
        BADGE_SIZE[size],
        BADGE_TONE[tone],
        ring && 'ring-background ring-2',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/**
 * Wrapper that gives an AvatarBadge something to anchor to.
 *
 * Avatar clips its own overflow, so the badge cannot live inside it.
 */
function AvatarWithBadge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar-with-badge"
      className={cn('relative inline-flex shrink-0', className)}
      {...props}
    />
  )
}

export { Avatar, AvatarBadge, AvatarGroup, AvatarWithBadge, avatarVariants }
export type { AvatarProps }
