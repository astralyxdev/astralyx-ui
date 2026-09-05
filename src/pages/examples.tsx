import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { EXAMPLES, examplePath, type ExampleEntry } from '@/examples'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

/**
 * The width a thumbnail is composed at before it is scaled down.
 *
 * A real desktop width, because the examples lay out against breakpoints: shrink
 * the box instead of scaling it and every one of them collapses to its stacked
 * phone layout, which is not what the card is advertising.
 */
const FRAME = { width: 1440, height: 900 }

/**
 * A live preview of an example, not a picture of one.
 *
 * A screenshot would be one more artifact to regenerate whenever an example
 * changes, and the first one anybody forgets — the same reason the registry
 * derives its dependency graph rather than listing it. This renders the real
 * thing at desktop size and scales it down, so it cannot fall out of date.
 *
 * Mounted only once it is near the viewport. Seventeen whole applications
 * rendering at once on a catalogue page is not worth the first paint, and it
 * also keeps the prerender empty: the server renders no preview at all, so the
 * static HTML stays the size it was.
 */
function Thumbnail({ example }: { example: ExampleEntry }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    // Ahead of the fold by a screenful, so a preview is ready by the time it
    // arrives rather than popping in under the cursor.
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLive(true)
          watcher.disconnect()
        }
      },
      { rootMargin: '400px' },
    )
    watcher.observe(box)

    // The scale is the card's width over the composed width, remeasured as the
    // grid reflows. Without this the preview would be right at one breakpoint.
    const sizer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / FRAME.width)
    })
    sizer.observe(box)

    return () => {
      watcher.disconnect()
      sizer.disconnect()
    }
  }, [])

  return (
    <div
      ref={boxRef}
      // `aria-hidden` and `inert`: it is decoration, and everything inside is a
      // second copy of a whole app — every heading, every control, every tab
      // stop. A screen reader meets the label and the description instead.
      aria-hidden="true"
      inert
      // Tinted rather than the page's own ground: an empty box that matches the
      // card reads as a broken image for the moment before the preview mounts,
      // and a faint one reads as a place something is about to be.
      className="bg-secondary/40 border-border relative overflow-hidden border-b"
      style={{ height: scale ? FRAME.height * scale : undefined, aspectRatio: scale ? undefined : '1440 / 900' }}
    >
      {live && scale > 0 && (
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{
            width: FRAME.width,
            height: FRAME.height,
            transform: `scale(${scale})`,
          }}
        >
          {example.render()}
        </div>
      )}
    </div>
  )
}

/** Index of the full-page examples. */
function Examples() {
  useSeo({
    title: 'Examples',
    description:
      'Whole screens built from the kit — a console, an incident room, a SQL client, an agent studio, a trading desk, a storefront and more. Each is a working page, not a screenshot.',
    path: '/examples',
  })

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <PageHeader
        title="Examples"
        description="Whole screens assembled from the kit, with nothing hand-rolled. Each one is a real page — resize it, open the menus, drag the dividers, and watch a selection change what sits beside it."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <Link
            key={example.id}
            to={examplePath(example.id)}
            className={cn('group block', focusRing, 'rounded-3xl')}
          >
            <Card className="hover:border-foreground/25 h-full overflow-hidden transition-colors duration-150 ease-out motion-reduce:transition-none">
              <Thumbnail example={example} />
              <CardHeader
                action={
                  <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
                }
              >
                <CardTitle as="h2">{example.label}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {example.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {example.uses.slice(0, 6).map((name) => (
                    <Badge key={name} size="sm">
                      {name}
                    </Badge>
                  ))}
                  {example.uses.length > 6 && (
                    <Badge size="sm">
                      +{example.uses.length - 6}
                    </Badge>
                  )}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export { Examples }
