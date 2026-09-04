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

  const commit = useCallback(
    (next: Stroke[]) => {
      if (value === undefined) setInternal(next)
      onChange?.(next)
    },
    [value, onChange],
  )

  /** Repaint everything from the model. Cheap — a signature is a few hundred points. */
  const redraw = useCallback(
    (list: Stroke[]) => {
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

      for (const stroke of list) {
        if (stroke.length === 0) continue
        if (stroke.length === 1) {
          // A tap is a dot, not nothing.
          context.beginPath()
          context.arc(stroke[0].x, stroke[0].y, penWidth / 2, 0, Math.PI * 2)
          context.fillStyle = context.strokeStyle
          context.fill()
          continue
        }

        for (let i = 1; i < stroke.length; i++) {
          const from = stroke[i - 1]
          const to = stroke[i]
          context.beginPath()
          context.lineWidth = penWidth * (0.5 + to.pressure)
          context.moveTo(from.x, from.y)
          // Quadratic through the midpoint: joining raw points with straight
          // lines makes a signature look like a seismograph.
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          context.quadraticCurveTo(from.x, from.y, midX, midY)
          context.stroke()
        }
      }
    },
    [background, penColor, penWidth],
  )

  useEffect(() => {
    redraw(strokes)
  }, [strokes, redraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof ResizeObserver === 'undefined') return
    // The backing store must follow the element, and resizing clears it — so
    // the model is repainted rather than the pixels being scaled.
    const observer = new ResizeObserver(() => redraw(strokes))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [strokes, redraw])

  const pointFrom = (event: ReactPointerEvent): Point => {
    const box = canvasRef.current?.getBoundingClientRect()
    return {
      x: event.clientX - (box?.left ?? 0),
      y: event.clientY - (box?.top ?? 0),
      // A mouse reports 0.5 or 0; only a real stylus varies it.
      pressure: event.pressure > 0 && event.pressure !== 0.5 ? event.pressure : 0.5,
    }
  }

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
            event.currentTarget.setPointerCapture(event.pointerId)
            drawing.current = true
            commit([...strokes, [pointFrom(event)]])
          }}
          onPointerMove={(event) => {
            if (!drawing.current || disabled) return
            const next = strokes.slice()
            next[next.length - 1] = [...next[next.length - 1], pointFrom(event)]
            commit(next)
          }}
          onPointerUp={() => {
            drawing.current = false
          }}
          onPointerCancel={() => {
            drawing.current = false
          }}
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
