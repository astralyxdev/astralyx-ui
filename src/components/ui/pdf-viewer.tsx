import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Download, ExternalLink, Minus, Plus, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A PDF, shown in the browser's own viewer with a toolbar around it.
 *
 * **It delegates the rendering, on purpose.** Every browser ships a complete,
 * sandboxed, accessible, keyboard-navigable PDF viewer with text selection,
 * search and printing already built. The alternative is ~350 kB of `pdf.js`
 * plus a worker, to arrive at a worse version of what is already installed.
 * If you need what only a parser can give you — extracting text, drawing
 * annotations, rendering a page to an image, a thumbnail rail — then reach for
 * `pdf.js` directly; this component is honest that it is not that.
 *
 * What it does own is the surface: a titled frame, page and zoom controls that
 * drive the viewer through the PDF open parameters, and download and open
 * actions that keep working when the embed does not.
 *
 * **The fallback is the point of the design.** Embedded PDFs fail routinely —
 * iOS Safari has historically rendered only the first page, some enterprise
 * builds disable the plugin entirely, and a Content-Disposition of `attachment`
 * on the response means it never displays. A viewer without a visible download
 * link fails silently and looks broken; this one always shows the way out.
 *
 * `src` is put in an iframe, so it must be same-origin or served with a
 * permissive `X-Frame-Options`/`frame-ancestors`. A cross-origin PDF that
 * refuses framing shows the fallback, which is the correct outcome rather than
 * a blank rectangle.
 */
type PdfViewerProps = Omit<ComponentProps<'div'>, 'title'> & {
  src: string
  title?: ReactNode
  /** Bytes, shown beside the title when known. */
  size?: string
  /** Viewer height. A PDF has no intrinsic height to grow into. */
  height?: number | string
  /** Opening page, passed to the viewer as `#page=`. */
  page?: number
  /** Total pages, when the caller knows it. Enables the page counter. */
  pageCount?: number
  /** Start zoom, as a percentage. */
  zoom?: number
  /** Hide the toolbar for a bare embed. */
  toolbar?: boolean
  /** Suggested filename for the download action. */
  downloadName?: string
  onPageChange?: (page: number) => void
  label?: string
  emptyLabel?: string
  fallback?: ReactNode
}

const ZOOMS = [50, 75, 100, 125, 150, 200]

function PdfViewer({
  src,
  title,
  size,
  height = 520,
  page = 1,
  pageCount,
  zoom: zoomProp = 100,
  toolbar = true,
  downloadName,
  onPageChange,
  label = 'PDF document',
  emptyLabel = 'No document.',
  fallback,
  className,
  ...props
}: PdfViewerProps) {
  const frameId = useId()
  const [current, setCurrent] = useState(page)
  const [zoom, setZoom] = useState(zoomProp)

  const go = (next: number) => {
    const clamped = Math.max(1, pageCount ? Math.min(next, pageCount) : next)
    setCurrent(clamped)
    onPageChange?.(clamped)
  }

  /**
   * PDF open parameters. Not a standard every viewer implements identically —
   * Chrome and Firefox honour `page` and `zoom`, others ignore them — so they
   * are treated as a hint. Changing the fragment reloads the frame, which is
   * why the key includes them.
   */
  const url = `${src}#page=${current}&zoom=${zoom}&view=FitH`

  if (!src) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      data-slot="pdf-viewer"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      {toolbar && (
        <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="min-w-0 flex-1">
            {title && <p className="truncate text-sm font-medium">{title}</p>}
            {size && <p className="text-muted-foreground text-xs">{size}</p>}
          </div>

          {pageCount !== undefined && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous page"
                disabled={current <= 1}
                onClick={() => go(current - 1)}
              >
                <Minus />
              </Button>
              <span className="text-muted-foreground min-w-16 text-center font-mono text-xs tabular-nums">
                {current} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next page"
                disabled={current >= pageCount}
                onClick={() => go(current + 1)}
              >
                <Plus />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            aria-label="Zoom"
            onClick={() => {
              const index = ZOOMS.indexOf(zoom)
              setZoom(ZOOMS[(index + 1) % ZOOMS.length] ?? 100)
            }}
          >
            <RotateCw />
            {zoom}%
          </Button>

          {/* Always present. An embed that fails leaves these as the only way
              to reach the file, and they are plain links, not script. */}
          <Button variant="ghost" size="icon-sm" asChild aria-label="Open in a new tab">
            <a href={src} target="_blank" rel="noreferrer noopener">
              <ExternalLink />
            </a>
          </Button>
          <Button variant="ghost" size="icon-sm" asChild aria-label="Download">
            <a href={src} download={downloadName ?? true}>
              <Download />
            </a>
          </Button>
        </div>
      )}

      <div className="bg-muted/20 min-h-0 flex-1" style={{ height }}>
        <iframe
          id={frameId}
          key={url}
          src={url}
          title={label}
          className="size-full border-0"
        >
          {fallback}
        </iframe>
      </div>

      {/* Shown underneath rather than instead: an iframe that renders nothing
          gives no event to react to, so the escape hatch cannot be conditional. */}
      <noscript className="block px-3 py-2 text-xs">
        <a href={src} className="underline">
          {label}
        </a>
      </noscript>
    </div>
  )
}

export { PdfViewer }
export type { PdfViewerProps }
