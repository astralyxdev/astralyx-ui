import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type DragEvent,
  type ReactNode,
} from 'react'
import { File as FileIcon, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { disabledState, focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A drop target that is also a button.
 *
 * Drag and drop is a pointer-only affordance, so the zone is a real `<button>`
 * wrapping a visually hidden `<input type="file">` — keyboard and screen-reader
 * users get the file picker, everyone else can drag onto it. A div with a drop
 * handler and no keyboard path is the usual version of this component and it
 * is unusable without a mouse.
 *
 * `dragDepth` counts enter/leave rather than tracking a boolean: dragging over
 * a child fires `dragleave` on the parent, so a boolean flickers the highlight
 * off every time the pointer crosses the icon inside the zone.
 */
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

type DropzoneProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  onFiles?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  /** Rejected above this, in bytes. */
  maxSize?: number
  label?: ReactNode
  hint?: ReactNode
  /** Show the accepted files under the zone. */
  showList?: boolean
}

function Dropzone({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  maxSize,
  label = 'Drop files here, or browse',
  hint,
  showList = true,
  className,
  ...props
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragDepth, setDragDepth] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()

  const over = dragDepth > 0

  function accepted(list: FileList | null) {
    if (!list) return
    const incoming = [...list]
    const tooBig = maxSize ? incoming.find((f) => f.size > maxSize) : undefined
    if (tooBig) {
      setError(`${tooBig.name} is larger than ${formatBytes(maxSize!)}`)
      return
    }
    setError(null)
    const next = multiple ? [...files, ...incoming] : incoming.slice(0, 1)
    setFiles(next)
    onFiles?.(next)
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragDepth(0)
    if (disabled) return
    accepted(event.dataTransfer.files)
  }

  function remove(index: number) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFiles?.(next)
  }

  return (
    <div data-slot="dropzone" className={cn('flex flex-col gap-2', className)} {...props}>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragDepth((depth) => depth + 1)
        }}
        onDragLeave={() => setDragDepth((depth) => Math.max(0, depth - 1))}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        data-dragging={over}
        className={cn(
          'border-border flex w-full flex-col items-center justify-center gap-2 border border-dashed px-6 py-8 text-center',
          radius.surface,
          interactive,
          focusRing,
          disabledState,
          over
            ? 'border-primary bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
        )}
      >
        <Upload className="size-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
        {maxSize && !hint && (
          <span className="text-muted-foreground text-xs">
            Up to {formatBytes(maxSize)}
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        // The button above is the control; this stays out of the tab order so
        // there is one stop, not two.
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          accepted(event.target.files)
          // Reset so picking the same file twice still fires a change.
          event.target.value = ''
        }}
      />

      {error && (
        <p id={errorId} role="alert" className="text-[var(--destructive-soft-foreground)] text-xs">
          {error}
        </p>
      )}

      {showList && files.length > 0 && (
        <ul className="flex list-none flex-col gap-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className={cn(
                'border-border bg-card flex items-center gap-2 border p-3 text-sm',
                radius.control,
              )}
            >
              <FileIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {formatBytes(file.size)}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${file.name}`}
                onClick={() => remove(index)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { Dropzone }
export type { DropzoneProps }
