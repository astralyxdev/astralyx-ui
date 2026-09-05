import {
  useCallback,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The step between picking an image and saving it.
 *
 * A kit with a dropzone, a file input and an upload list still cannot set an
 * avatar, because every avatar upload needs a square and every photo is a
 * rectangle. Without this the crop happens on the server, or not at all and
 * the image is squashed by CSS.
 *
 * **The crop rectangle is stored in natural image coordinates**, not in
 * displayed pixels. The display size depends on the container, which changes
 * with the viewport; a crop expressed in screen pixels silently means something
 * different after a resize, and produces a different output on a phone than on
 * a desktop.
 *
 * **The output is produced with `canvas.toBlob`, not `toDataURL`.** A data URL
 * is base64, which is a third larger, has to be built as one string in memory,
 * and then usually gets converted back to a blob to upload anyway. `toBlob`
 * hands you something you can put straight in a `FormData`.
 *
 * **A cross-origin image taints the canvas** and makes `toBlob` throw a
 * `SecurityError`. `crossOrigin="anonymous"` is set on the image so a server
 * that sends permissive CORS headers works; one that does not will fail at
 * export, and `onError` reports it rather than leaving a dead button.
 */
export type CropRect = { x: number; y: number; width: number; height: number }

// Omitted because the DOM declares it too, and in an intersection the DOM
// signature wins — which left the prop below unusable and the generated docs
// advertising the browser's handler instead of ours.
type ImageCropperProps = Omit<ComponentProps<'div'>, 'onChange' | 'onError'> & {
  src: string
  /** Width divided by height. Omit to crop freely. */
  aspect?: number
  /** Controlled crop, in natural image pixels. */
  value?: CropRect
  defaultValue?: CropRect
  onChange?: (crop: CropRect) => void
  /** The cropped image. Fires on demand, not on every drag. */
  onCrop?: (blob: Blob, crop: CropRect) => void
  onError?: (error: Error) => void
  /** Output type and quality for the exported blob. */
  outputType?: string
  outputQuality?: number
  /** Longest side of the export. The crop is scaled to fit. */
  maxOutput?: number
  /** Round mask, for avatars. Cosmetic — the export is still a rectangle. */
  round?: boolean
  cropLabel?: string
  resetLabel?: string
  /** Hide the built-in buttons to drive it from your own footer. */
  actions?: boolean
  alt?: string
}

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'move'

const HANDLES: { id: Handle; className: string; label: string }[] = [
  { id: 'nw', className: 'start-0 top-0 cursor-nwse-resize', label: 'Top left' },
  { id: 'ne', className: 'end-0 top-0 cursor-nesw-resize', label: 'Top right' },
  { id: 'sw', className: 'start-0 bottom-0 cursor-nesw-resize', label: 'Bottom left' },
  { id: 'se', className: 'end-0 bottom-0 cursor-nwse-resize', label: 'Bottom right' },
]

function ImageCropper({
  src,
  aspect,
  value,
  defaultValue,
  onChange,
  onCrop,
  onError,
  outputType = 'image/png',
  outputQuality = 0.92,
  maxOutput,
  round = false,
  cropLabel = 'Crop',
  resetLabel = 'Reset',
  actions = true,
  alt = 'Image to crop',
  className,
  ...props
}: ImageCropperProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  /**
   * Measurements carry the `src` they belong to, rather than being reset by an
   * effect when `src` changes.
   *
   * The effect version has a race that only shows up in a browser: the reset
   * runs *after* the image has already loaded (a remount, or a cached image
   * that resolves before effects flush), clearing the measured size — and
   * because the image is already complete, `load` never fires again, so the
   * crop rectangle never comes back. Deriving staleness from the src makes the
   * stale state unrepresentable instead.
   */
  const [measured, setMeasured] = useState<{ src: string; width: number; height: number } | null>(null)
  const [internal, setInternal] = useState<{ src: string; rect: CropRect } | null>(
    defaultValue ? { src, rect: defaultValue } : null,
  )
  const drag = useRef<{ handle: Handle; startX: number; startY: number; from: CropRect } | null>(null)

  const natural =
    measured?.src === src ? { width: measured.width, height: measured.height } : { width: 0, height: 0 }
  const crop = value ?? (internal?.src === src ? internal.rect : null)

  /** Largest rectangle of the requested aspect that fits the image, centred. */
  const initial = useCallback(
    (width: number, height: number): CropRect => {
      if (!aspect) {
        const inset = Math.min(width, height) * 0.1
        return { x: inset, y: inset, width: width - inset * 2, height: height - inset * 2 }
      }
      const byWidth = width / aspect <= height
      const w = byWidth ? width : height * aspect
      const h = byWidth ? width / aspect : height
      return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
    },
    [aspect],
  )

  const commit = (next: CropRect) => {
    if (value === undefined) setInternal({ src, rect: next })
    onChange?.(next)
  }

  /** Measure, and seed a crop if there is not one for this image yet. */
  const measure = (image: HTMLImageElement) => {
    if (!image.naturalWidth) return
    if (measured?.src === src && measured.width === image.naturalWidth) return

    setMeasured({ src, width: image.naturalWidth, height: image.naturalHeight })
    if (value === undefined && internal?.src !== src) {
      const seeded = initial(image.naturalWidth, image.naturalHeight)
      setInternal({ src, rect: seeded })
      onChange?.(seeded)
    }
  }

  /** Natural pixels per displayed pixel — the whole coordinate story. */
  const scale = () => {
    const image = imageRef.current
    if (!image || !image.clientWidth) return 1
    return natural.width / image.clientWidth
  }

  function onPointerDown(event: ReactPointerEvent, handle: Handle) {
    if (!crop) return
    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)
    drag.current = { handle, startX: event.clientX, startY: event.clientY, from: { ...crop } }
  }

  function onPointerMove(event: ReactPointerEvent) {
    const state = drag.current
    if (!state || !crop) return

    const factor = scale()
    const dx = (event.clientX - state.startX) * factor
    const dy = (event.clientY - state.startY) * factor
    const { from, handle } = state
    const limit = { width: natural.width, height: natural.height }

    if (handle === 'move') {
      commit({
        ...from,
        x: Math.min(Math.max(0, from.x + dx), limit.width - from.width),
        y: Math.min(Math.max(0, from.y + dy), limit.height - from.height),
      })
      return
    }

    const west = handle === 'nw' || handle === 'sw'
    const north = handle === 'nw' || handle === 'ne'
    const right = west ? from.x + from.width : limit.width
    const bottom = north ? from.y + from.height : limit.height

    let width = Math.max(24, west ? from.width - dx : from.width + dx)
    let height = Math.max(24, north ? from.height - dy : from.height + dy)

    // With a locked aspect the two axes cannot be resolved independently, so
    // width wins and height follows it.
    if (aspect) height = width / aspect

    width = Math.min(width, west ? right : limit.width - from.x)
    height = Math.min(height, north ? bottom : limit.height - from.y)
    if (aspect) width = Math.min(width, height * aspect)

    commit({
      x: west ? right - width : from.x,
      y: north ? bottom - height : from.y,
      width,
      height,
    })
  }

  const endDrag = () => {
    drag.current = null
  }

  /** Draw the crop to a canvas and hand back a blob. */
  const exportCrop = () => {
    const image = imageRef.current
    if (!image || !crop) return

    const ratio = maxOutput ? Math.min(1, maxOutput / Math.max(crop.width, crop.height)) : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(crop.width * ratio)
    canvas.height = Math.round(crop.height * ratio)

    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, canvas.width, canvas.height,
    )

    try {
      canvas.toBlob(
        (blob) => {
          if (blob) onCrop?.(blob, crop)
          else onError?.(new Error('The canvas produced no image.'))
        },
        outputType,
        outputQuality,
      )
    } catch (error) {
      // A cross-origin image without CORS headers taints the canvas; this is
      // the only place it surfaces, so it must not be swallowed.
      onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  const percent = (part: number, whole: number) => (whole ? `${(part / whole) * 100}%` : '0%')

  return (
    <div
      data-slot="image-cropper"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    >
      <div
        ref={boxRef}
        className={cn('relative touch-none overflow-hidden select-none', surface, radius.surface)}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <img
          ref={(element) => {
            imageRef.current = element
            // A cached image can already be complete before any load event
            // would fire, so it is measured here as well as on load.
            if (element?.complete) measure(element)
          }}
          src={src}
          alt={alt}
          // Required for `toBlob` to work on an image from another origin.
          crossOrigin="anonymous"
          onLoad={(event) => measure(event.currentTarget)}
          draggable={false}
          className="block max-h-[420px] w-full object-contain"
        />

        {crop && natural.width > 0 && (
          <>
            {/* One element, four shadows: darkening the outside without four
                positioned overlays that have to stay in sync. */}
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]',
                round && 'rounded-full',
              )}
              style={{
                left: percent(crop.x, natural.width),
                top: percent(crop.y, natural.height),
                width: percent(crop.width, natural.width),
                height: percent(crop.height, natural.height),
              }}
            />

            <div
              className={cn(
                'absolute cursor-move border-2 border-white/90',
                round && 'rounded-full',
              )}
              style={{
                left: percent(crop.x, natural.width),
                top: percent(crop.y, natural.height),
                width: percent(crop.width, natural.width),
                height: percent(crop.height, natural.height),
              }}
              onPointerDown={(event) => onPointerDown(event, 'move')}
            >
              {HANDLES.map((handle) => (
                <span
                  key={handle.id}
                  role="slider"
                  tabIndex={0}
                  aria-label={`${handle.label} corner`}
                  aria-valuenow={Math.round(crop.width)}
                  aria-valuemin={24}
                  aria-valuemax={natural.width}
                  className={cn(
                    'absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/20 bg-white',
                    'ltr:translate-x-[-50%] rtl:translate-x-[50%]',
                    focusRing,
                    handle.className,
                  )}
                  style={{
                    insetInlineStart: handle.id.includes('w') ? 0 : undefined,
                    insetInlineEnd: handle.id.includes('e') ? 0 : undefined,
                    top: handle.id.startsWith('n') ? 0 : undefined,
                    bottom: handle.id.startsWith('s') ? 0 : undefined,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onPointerDown={(event) => onPointerDown(event, handle.id)}
                  onKeyDown={(event) => {
                    // Keyboard resize, because a drag handle that only responds
                    // to a pointer is unusable without one.
                    const step = event.shiftKey ? 20 : 4
                    const delta =
                      event.key === 'ArrowRight' || event.key === 'ArrowDown'
                        ? step
                        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                          ? -step
                          : 0
                    if (!delta) return
                    event.preventDefault()
                    const width = Math.max(24, Math.min(crop.width + delta, natural.width - crop.x))
                    commit({
                      ...crop,
                      width,
                      height: aspect ? width / aspect : crop.height,
                    })
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={exportCrop} disabled={!crop}>
            {cropLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => commit(initial(natural.width, natural.height))}
            disabled={!natural.width}
          >
            {resetLabel}
          </Button>
          {crop && (
            <span className="text-muted-foreground ms-auto font-mono text-xs tabular-nums">
              {Math.round(crop.width)}×{Math.round(crop.height)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export { ImageCropper }
export type { ImageCropperProps }
