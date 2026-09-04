import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { ImageOff } from 'lucide-react'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An `<img>` that reserves its space, covers its own load, and survives a 404.
 *
 * Three things a bare `<img>` gets wrong on a real page:
 *
 * **Layout shift.** An image with no intrinsic size is zero pixels tall until
 * it decodes, then shoves everything below it down the page. `ratio` puts the
 * box on the page immediately, so the reflow never happens.
 *
 * **The blank frame.** Between "requested" and "decoded" there is nothing to
 * look at. `mask` fills that gap — a skeleton, a shimmer, or a blurred
 * thumbnail that dissolves into the real thing. That last one matters for
 * generated images in particular: they arrive slowly and often *after* their
 * own low-resolution preview, so the preview is genuinely useful rather than
 * decorative.
 *
 * **The cached-image flash.** This is the subtle one and the reason for the
 * layout effect below. A cached image can finish decoding before React attaches
 * `onLoad`, so the event never fires and the placeholder stays up forever — or,
 * if you reset on every render, flashes for a frame on an image that was
 * already there. Reading `complete` before paint settles both.
 *
 * Failure is a state, not a broken icon: `fallback` renders in the same box, so
 * a dead URL costs the layout nothing.
 */
type ImageStatus = 'loading' | 'loaded' | 'error'

type ImageProps = Omit<
  ComponentProps<'img'>,
  'src' | 'srcSet' | 'sizes' | 'placeholder' | 'width' | 'height'
> & {
  src: string
  /**
   * Required, and deliberately so. An image with no alt is either meaningful
   * and unreadable, or decorative and should say so — pass `alt=""` for the
   * second, which is a decision rather than an omission.
   */
  alt: string
  /** What fills the frame until the image decodes. */
  mask?: 'skeleton' | 'shimmer' | 'blur' | 'none'
  /**
   * The low-resolution stand-in for `mask="blur"` — usually a tiny inline
   * data URI. Falls back to the skeleton when absent, because a blur mask with
   * nothing to blur is an empty box with extra steps.
   */
  blurSrc?: string
  /**
   * Widths to offer the browser, turned into a `srcset` through `srcFor`. The
   * browser picks using `sizes`, the viewport and the device pixel ratio — all
   * facts this component does not have.
   */
  widths?: number[]
  /** Builds the URL for one width. Defaults to a `w` query parameter. */
  srcFor?: (src: string, width: number) => string
  /** How wide the image will actually render. Ignored without `widths`. */
  sizes?: string
  /** Width divided by height. Reserves the box before anything loads. */
  ratio?: number
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Shown instead of the image when the request fails. */
  fallback?: ReactNode
  /** Accessible text for the default failure state. */
  errorLabel?: string
  /**
   * Load immediately at high priority. For the one image above the fold that
   * is worth blocking on — everything else should stay lazy.
   */
  priority?: boolean
  onStatusChange?: (status: ImageStatus) => void
}

const FIT = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
} as const

/** `?w=800`, appended without trampling an existing query string. */
function defaultSrcFor(src: string, width: number) {
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`
}

function Image({
  src,
  alt,
  mask = 'skeleton',
  blurSrc,
  widths,
  srcFor = defaultSrcFor,
  sizes,
  ratio,
  fit = 'cover',
  fallback,
  errorLabel = 'Image unavailable',
  priority = false,
  className,
  style,
  onStatusChange,
  onLoad,
  onError,
  ...props
}: ImageProps) {
  const ref = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<ImageStatus>('loading')

  function update(next: ImageStatus) {
    setStatus(next)
    onStatusChange?.(next)
  }

  // Before paint, and on every `src` change. A cached image is already
  // `complete` by the time this runs, so it never shows a placeholder; a fresh
  // one resets to loading in the same pass, so the previous image's frame is
  // not left standing under the new one's mask.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    if (node.complete && node.naturalWidth > 0) setStatus('loaded')
    else if (node.complete && node.naturalWidth === 0) setStatus('error')
    else setStatus('loading')
  }, [src])

  const pending = status === 'loading'
  const failed = status === 'error'
  // A blur mask with no thumbnail would render an empty box, so it degrades to
  // the skeleton rather than to nothing.
  const effectiveMask = mask === 'blur' && !blurSrc ? 'skeleton' : mask

  return (
    <span
      data-slot="image"
      data-status={status}
      className={cn('relative block overflow-hidden', radius.surface, className)}
      style={{ aspectRatio: ratio, ...style }}
    >
      {!failed && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          sizes={widths ? sizes : undefined}
          srcSet={widths ? widths.map((w) => `${srcFor(src, w)} ${w}w`).join(', ') : undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={(event) => {
            update('loaded')
            onLoad?.(event)
          }}
          onError={(event) => {
            update('error')
            onError?.(event)
          }}
          className={cn(
            'h-full w-full',
            FIT[fit],
            // Cross-fade in. The mask underneath stays put until this finishes,
            // so nothing ever shows through a half-transparent image.
            'transition-opacity duration-300 ease-out motion-reduce:transition-none',
            pending ? 'opacity-0' : 'opacity-100',
          )}
          {...props}
        />
      )}

      {pending && effectiveMask !== 'none' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {effectiveMask === 'blur' ? (
            <img
              src={blurSrc}
              alt=""
              aria-hidden="true"
              className={cn('h-full w-full scale-110 blur-xl', FIT[fit])}
            />
          ) : (
            <span
              className={cn(
                'bg-muted block h-full w-full',
                effectiveMask === 'shimmer' &&
                  'motion-safe:animate-pulse motion-reduce:animate-none',
              )}
            />
          )}
        </span>
      )}

      {failed && (
        <span className="bg-muted text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
          {fallback ?? (
            <>
              <ImageOff className="size-5 shrink-0" aria-hidden="true" />
              <span className="text-xs">{errorLabel}</span>
            </>
          )}
        </span>
      )}
    </span>
  )
}

export { Image }
export type { ImageProps, ImageStatus }
