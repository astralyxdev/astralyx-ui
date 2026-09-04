import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A canvas you sign with a finger, a stylus or a mouse.
 *
 * **Strokes are stored as points, and the canvas is redrawn from them.** The
 * naive version draws straight to the canvas and keeps no model — which means
 * undo is impossible, a resize wipes the drawing, and exporting at a different
 * resolution is not an option. Keeping the points makes all three fall out.
 *
 * **Pointer events, not mouse or touch.** One set of handlers covers a mouse, a
 * finger and a pen, and `pressure` from a stylus varies the stroke width the
 * way a real pen does. `touch-action: none` is essential: without it the first
 * downward stroke scrolls the page instead of drawing.
 *
 * **It is drawn at device pixel ratio.** A canvas sized in CSS pixels is
 * visibly soft on any modern screen, and a signature is a thing people zoom
 * into. The backing store is scaled up and the context scaled down to match.
 *
 * A signature captured this way is a picture of a squiggle. It is fine as a
 * record that someone signed; it is **not** a digital signature and proves
 * nothing cryptographically. If you need non-repudiation, sign a hash of the
 * document with a key, and keep this as the human-facing part.
 */
export type Point = { x: number; y: number; pressure: number }
export type Stroke = Point[]

type SignaturePadProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  /** Controlled strokes, in CSS pixels relative to the canvas. */
  value?: Stroke[]
  defaultValue?: Stroke[]
  onChange?: (strokes: Stroke[]) => void
  /** Fires with the flattened image on demand. */
  onSign?: (blob: Blob, strokes: Stroke[]) => void
  height?: number
  penColor?: string
  /** Base stroke width. Stylus pressure scales it. */
  penWidth?: number
  /** Transparent by default, so it composites onto a document. */
  background?: string
  outputType?: string
  clearLabel?: string
  undoLabel?: string
  saveLabel?: string
  actions?: boolean
  /** The line people sign above. */
  guideline?: boolean
  placeholder?: string
  label?: string
  disabled?: boolean
}

function SignaturePad({
  value,
  defaultValue,
  onChange,
  onSign,
  height = 180,
  penColor = 'currentColor',
  penWidth = 2,
  background = 'transparent',
  outputType = 'image/png',
  clearLabel = 'Clear',
  undoLabel = 'Undo',
  saveLabel = 'Save',
  actions = true,
  guideline = true,
  placeholder = 'Sign here',
  label = 'Signature',
  disabled,
  className,
  ...props
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [internal, setInternal] = useState<Stroke[]>(defaultValue ?? [])
  const drawing = useRef(false)

  const strokes = value ?? internal

  /**
   * The stroke being drawn right now, held in a ref and painted directly.
   *
   * Routing every pointer sample through `setState` loses points, and loses
   * more of them the faster you sign. Pointer events fire at 60-120Hz-plus,
   * well above React's render rate, so several moves run against the *same*
   * closed-over `strokes` array before any of them re-renders — each rebuilds
   * from the stale value and the last one wins. The dropped samples show up as
   * gaps, which is why a quick signature came out dashed and a slow one did
   * not.
   *
   * So the gesture is painted from a ref on an animation frame, and React state
   * is touched exactly once per stroke, on release. That is also the right
   * granularity for `onChange`: a completed stroke, not a mouse sample.
   */
  const live = useRef<Point[] | null>(null)
  const frame = useRef(0)
  /** Latest committed strokes, for the release handler to append to. */
  const latest = useRef(strokes)
  latest.current = strokes

  const commit = useCallback(
    (next: Stroke[]) => {
      if (value === undefined) setInternal(next)
      onChange?.(next)
    },
    [value, onChange],
  )

  /** Repaint everything from the model. Cheap — a signature is a few hundred points. */
  const redraw = useCallback(
    (list: Stroke[], inProgress?: Stroke | null) => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return

      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const box = canvas.clientHeight

      // Only resize when it actually changed: assigning width clears the canvas.
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(box * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(box * ratio)
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, box)

      if (background !== 'transparent') {
        context.fillStyle = background
        context.fillRect(0, 0, width, box)
      }

      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle =
        penColor === 'currentColor'
          ? getComputedStyle(canvas).color || '#000'
          : penColor

      for (const stroke of [...list, ...(inProgress?.length ? [inProgress] : [])]) {
        if (stroke.length === 0) continue
        if (stroke.length === 1) {
          // A tap is a dot, not nothing.
          context.beginPath()
          context.arc(stroke[0].x, stroke[0].y, penWidth / 2, 0, Math.PI * 2)
          context.fillStyle = context.strokeStyle
          context.fill()
          continue
        }

        /*
         * Quadratic tiling: each segment runs midpoint-to-midpoint, curving
         * through the sample point between them.
         *
         * The obvious version — move to the previous point and curve to the
         * midpoint — draws only the first half of every span and leaves the
         * second half unpainted. Signing slowly hides it, because consecutive
         * samples land a pixel apart and the gaps are sub-pixel; signing
         * quickly spreads the samples out and the stroke comes out dashed.
         *
         * Tiling midpoint to midpoint covers the whole path exactly once, with
         * the sample point as the control point, which is also what smooths it:
         * joining raw samples with straight lines makes a signature look like a
         * seismograph.
         */
        const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

        for (let i = 0; i < stroke.length - 1; i++) {
          const current = stroke[i]
          const next = stroke[i + 1]
          // Start at the very first point and finish at the very last, so the
          // ends are not clipped back to a midpoint.
          const start = i === 0 ? current : mid(stroke[i - 1], current)
          const end = i === stroke.length - 2 ? next : mid(current, next)

          context.beginPath()
          context.lineWidth = penWidth * (0.5 + current.pressure)
          context.moveTo(start.x, start.y)
          context.quadraticCurveTo(current.x, current.y, end.x, end.y)
          context.stroke()
        }
      }
    },
    [background, penColor, penWidth],
  )

  /** Repaint on the next frame, coalescing a burst of samples into one paint. */
  const paint = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      redraw(latest.current, live.current)
    })
  }, [redraw])

  /** Move the finished stroke into state — the one setState per stroke. */
  const endStroke = useCallback(() => {
    if (!drawing.current) return
    drawing.current = false

    const finished = live.current
    live.current = null
    if (frame.current) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
    if (!finished || finished.length === 0) return

    const next = [...latest.current, finished]
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }, [value, onChange])

  useEffect(() => {
    redraw(strokes, live.current)
  }, [strokes, redraw])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    // The backing store must follow the element, and resizing clears it — so
    // the model is repainted rather than the pixels being scaled.
    const observer = new ResizeObserver(() => redraw(strokes, live.current))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [strokes, redraw])

  const toPoint = (clientX: number, clientY: number, pressure: number): Point => {
    const box = canvasRef.current?.getBoundingClientRect()
    return {
      x: clientX - (box?.left ?? 0),
      y: clientY - (box?.top ?? 0),
      // A mouse reports 0.5 or 0; only a real stylus varies it.
      pressure: pressure > 0 && pressure !== 0.5 ? pressure : 0.5,
    }
  }

  const pointFrom = (event: ReactPointerEvent): Point =>
    toPoint(event.clientX, event.clientY, event.pressure)

  const pointFromNative = (event: PointerEvent): Point =>
    toPoint(event.clientX, event.clientY, event.pressure)

  const empty = strokes.length === 0

  return (
    <div data-slot="signature-pad" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className={cn('relative', surface, radius.surface, disabled && 'opacity-50')}>
        <canvas
          ref={canvasRef}
          aria-label={label}
          role="img"
          style={{ height }}
          // Without this the first stroke scrolls the page on a touch screen.
          className="block w-full touch-none"
          onPointerDown={(event) => {
            if (disabled) return
            try {
              event.currentTarget.setPointerCapture(event.pointerId)
            } catch {
              // A pointer that is no longer active cannot be captured. Not a
              // reason to drop the stroke.
            }
            drawing.current = true
            live.current = [pointFrom(event)]
            paint()
          }}
          onPointerMove={(event) => {
            if (!drawing.current || disabled) return

            /*
             * Every sample the browser captured, not just the one it delivered.
             *
             * Pointer events are coalesced to the frame rate, so a fast stroke
             * arrives as a handful of far-apart points and the curve through
             * them cuts every corner. `getCoalescedEvents` returns the full
             * high-frequency history behind this one — often 4-8× the samples
             * on a 120Hz stylus — which is what makes a quick signature keep
             * its shape.
             */
            const native = event.nativeEvent
            const samples =
              typeof native.getCoalescedEvents === 'function'
                ? native.getCoalescedEvents()
                : []

            const added = samples.length > 0 ? samples.map(pointFromNative) : [pointFrom(event)]

            // Appended to the ref synchronously, so nothing can be lost to a
            // render that has not happened yet.
            live.current?.push(...added)
            paint()
          }}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />

        {guideline && (
          <span
            aria-hidden="true"
            className="border-border pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed"
          />
        )}

        {empty && (
          <span
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-xs"
          >
            {placeholder}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={empty || disabled}
            onClick={() => commit(strokes.slice(0, -1))}
          >
            {undoLabel}
          </Button>
          <Button size="sm" variant="ghost" disabled={empty || disabled} onClick={() => commit([])}>
            {clearLabel}
          </Button>
          {onSign && (
            <Button
              size="sm"
              className="ms-auto"
              disabled={empty || disabled}
              onClick={() => {
                canvasRef.current?.toBlob((blob) => {
                  if (blob) onSign(blob, strokes)
                }, outputType)
              }}
            >
              {saveLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export { SignaturePad }
export type { SignaturePadProps }
