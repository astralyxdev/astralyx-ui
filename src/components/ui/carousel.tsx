import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A horizontally scrolling row of slides.
 *
 * Built on CSS scroll-snap rather than a transform-driven track: touch swiping,
 * momentum, keyboard scrolling and the scrollbar all keep working, and the
 * component only has to move the scroll position and read it back.
 */
/**
 * Default label formatters, hoisted out of the parameter list.
 *
 * An arrow function written inline as a default parameter is a value the
 * React Compiler cannot safely reorder, so it bails on the whole component
 * and none of it gets auto-memoised. At module scope it is a stable
 * reference and the component compiles.
 */
const DEFAULT_SLIDE_LABEL: (index: number, total: number) => string = (index, total) => `${index} of ${total}`
const DEFAULT_DOT_LABEL: (index: number) => string = (index) => `Go to slide ${index}`

function Carousel({
  className,
  children,
  slidesToShow = 1,
  gap = 12,
  showControls = true,
  showDots = true,
  label = 'Carousel',
  previousLabel = 'Previous slide',
  nextLabel = 'Next slide',
  slideLabel = DEFAULT_SLIDE_LABEL,
  dotLabel = DEFAULT_DOT_LABEL,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  children: ReactNode[]
  slidesToShow?: number
  gap?: number
  showControls?: boolean
  showDots?: boolean
  label?: string
  previousLabel?: string
  nextLabel?: string
  /** Accessible name for a slide, given its 1-based index and the total. */
  slideLabel?: (index: number, total: number) => string
  /** Accessible name for a dot, given its 1-based index. */
  dotLabel?: (index: number) => string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const slide = track.scrollWidth / children.length
    setIndex(Math.round(track.scrollLeft / slide))
    setAtStart(track.scrollLeft <= 1)
    // 1px of slack: sub-pixel layout means scrollLeft rarely hits the exact max.
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1)
  }, [children.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    sync()
    track.addEventListener('scroll', sync, { passive: true })
    return () => track.removeEventListener('scroll', sync)
  }, [sync])

  function scrollTo(next: number) {
    const track = trackRef.current
    if (!track) return
    const slide = track.scrollWidth / children.length
    track.scrollTo({ left: slide * next, behavior: 'smooth' })
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-slot="carousel"
      className={cn('relative w-full', className)}
      {...props}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ gap }}
      >
        {children.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabel(i + 1, children.length)}
            className="min-w-0 shrink-0 snap-start"
            style={{
              flexBasis: `calc((100% - ${gap * (slidesToShow - 1)}px) / ${slidesToShow})`,
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      {showControls && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={previousLabel}
              disabled={atStart}
              onClick={() => scrollTo(Math.max(0, index - 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={nextLabel}
              disabled={atEnd}
              onClick={() => scrollTo(Math.min(children.length - 1, index + 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          {showDots && (
            <div className="flex items-center gap-1.5">
              {children.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={dotLabel(i + 1)}
                  aria-current={i === index}
                  onClick={() => scrollTo(i)}
                  className={cn(
                    'size-1.5 rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none',
                    focusRing,
                    i === index ? 'bg-foreground' : 'bg-border',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { Carousel }
