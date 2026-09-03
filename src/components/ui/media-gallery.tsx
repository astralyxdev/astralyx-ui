import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { Portal } from '@/components/primitives/portal'
import { useFocusTrap } from '@/components/primitives/focus-trap'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useRef } from 'react'

/**
 * A thumbnail grid with a lightbox.
 *
 * The lightbox traps focus and restores it to the thumbnail that opened it.
 * Returning focus to the top of the document is the standard failure and it
 * loses a keyboard user's place in a grid of fifty images.
 *
 * Arrow keys move between items while open, and Escape closes. These are the
 * bindings people try first; a lightbox that only responds to on-screen arrows
 * is one they will call broken.
 *
 * Every item needs `alt`. It is a required field rather than an optional one,
 * because a gallery is exactly where empty alt text accumulates.
 */
export type MediaItem = {
  id: string
  src: string
  /** Required — a gallery is where missing alt text accumulates. */
  alt: string
  thumbnail?: string
  caption?: ReactNode
}

function MediaGallery({
  items,
  columns = 3,
  ratio = 1,
  closeLabel = 'Close',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  emptyLabel = 'Nothing to show',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  items: MediaItem[]
  columns?: 2 | 3 | 4 | 5
  ratio?: number
  /** Accessible names for the lightbox controls. */
  closeLabel?: string
  previousLabel?: string
  nextLabel?: string
  emptyLabel?: ReactNode
}) {
  const [open, setOpen] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggers = useRef<(HTMLButtonElement | null)[]>([])

  useFocusTrap(panelRef, open !== null)

  useEffect(() => {
    if (open === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
      if (event.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % items.length))
      if (event.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + items.length) % items.length))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, items.length])

  const grid = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  }[columns]

  const current = open === null ? undefined : items[open]

  return (
    <div data-slot="media-gallery" className={className} {...props}>
      <ul className={cn('grid list-none gap-2', grid)}>
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              ref={(node) => {
                triggers.current[index] = node
              }}
              onClick={() => setOpen(index)}
              className={cn('block w-full overflow-hidden', radius.control, focusRing)}
            >
              <AspectRatio ratio={ratio} className="bg-muted">
                <img
                  src={item.thumbnail ?? item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </AspectRatio>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(null)
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={current.alt}
              tabIndex={-1}
              className="flex min-h-0 flex-1 flex-col gap-3 outline-none"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-white/80 tabular-nums">
                  {open! + 1} / {items.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={closeLabel}
                  className="text-white hover:bg-white/10"
                  onClick={() => {
                    const index = open
                    setOpen(null)
                    // Back to the thumbnail that opened it, not the document top.
                    if (index !== null) triggers.current[index]?.focus()
                  }}
                >
                  <X />
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={previousLabel}
                  className="shrink-0 text-white hover:bg-white/10"
                  onClick={() => setOpen((i) => (i === null ? i : (i - 1 + items.length) % items.length))}
                >
                  <ChevronLeft />
                </Button>

                <img
                  src={current.src}
                  alt={current.alt}
                  className="mx-auto max-h-full min-h-0 flex-1 object-contain"
                />

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={nextLabel}
                  className="shrink-0 text-white hover:bg-white/10"
                  onClick={() => setOpen((i) => (i === null ? i : (i + 1) % items.length))}
                >
                  <ChevronRight />
                </Button>
              </div>

              {current.caption && (
                <p className="text-center text-sm text-white/80">{current.caption}</p>
              )}
            </div>
          </div>
        </Portal>
      )}

      {items.length === 0 && (
        <p className="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm">
          <ImageOff className="size-6" aria-hidden="true" />
          {emptyLabel}
        </p>
      )}
    </div>
  )
}

export { MediaGallery }
