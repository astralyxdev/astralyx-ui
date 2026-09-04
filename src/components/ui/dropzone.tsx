import {
  useRef,
  useState,
  type ComponentProps,
  type DragEvent,
  type ReactNode,
} from 'react'
import { CheckCircle2, CloudUpload } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { UploadList } from '@/components/ui/upload-list'
import type { Attachment } from '@/components/ui/attachment-preview'
import {
  formatBytes,
  useUploads,
  type FileUpload,
  type UploadHandler,
} from '@/lib/use-uploads'
import { disabledState, focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The upload card: click it or drag onto it, and it runs the upload.
 *
 * Drag and drop is a pointer-only affordance, so the card is a real `<button>`
 * wrapping a visually hidden `<input type="file">` — keyboard and screen-reader
 * users get the file picker, everyone else can drag onto it. A `div` with a
 * drop handler and no keyboard path is the usual version of this component and
 * it is unusable without a mouse.
 *
 * `dragDepth` counts enter/leave rather than tracking a boolean: dragging over
 * a child fires `dragleave` on the parent, so a boolean flickers the highlight
 * off every time the pointer crosses the icon inside the card.
 *
 * The upload itself lives in `useUploads`, shared with `InputFile`. Hand this
 * component `onUpload` and it moves each file through queued → uploading → done
 * or error, reports progress, and keeps failures on screen with a retry. While
 * anything is in flight the card swaps to a spinner naming the file, so the
 * component that took the drop is also the one that says what happened to it.
 *
 * Validation runs on drop as well as on pick. The browser filters the file
 * picker by `accept`, but a dropped file never went through the picker — so
 * without a check here, dragging a `.mov` onto an image-only zone uploads it.
 */
type DropzoneProps = Omit<ComponentProps<'div'>, 'onChange' | 'onSelect'> & {
  /**
   * Runs the upload. Resolve to succeed — the value lands on `upload.result`;
   * throw to fail, and the message shows on the row with a retry.
   */
  onUpload?: UploadHandler
  /** Fires on selection, before any upload starts. */
  onSelect?: (uploads: FileUpload[]) => void
  /** Fires on every transition — start, progress, finish, failure, removal. */
  onUploadsChange?: (uploads: FileUpload[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  /** Rejected before the request is made, in bytes. */
  maxSize?: number
  label?: ReactNode
  hint?: ReactNode
  /** Show the per-file rows under the card. */
  showList?: boolean
  /**
   * Force the busy state from outside.
   *
   * For the case where the request is yours — you are not using `onUpload`, you
   * are posting the files yourself and want the card to say so. `true` shows
   * the spinner and blocks further picking. Left undefined, the component uses
   * its own upload state.
   */
  isUploading?: boolean
  /** Names the file being sent. Receives the file name, or a count. */
  uploadingLabel?: (name: string) => ReactNode
  /** Shown once everything has landed. Receives how many. */
  doneLabel?: (count: number) => ReactNode
  maxSizeLabel?: (limit: string) => string
  acceptLabel?: (accept: string) => string
}

function Dropzone({
  onUpload,
  onSelect,
  onUploadsChange,
  accept,
  multiple = false,
  disabled = false,
  maxSize,
  label = 'Click to upload, or drag and drop',
  hint,
  showList = true,
  isUploading,
  uploadingLabel = (name) => `Uploading ${name}…`,
  doneLabel = (count) => `${count} file${count === 1 ? '' : 's'} uploaded`,
  maxSizeLabel,
  acceptLabel,
  className,
  ...props
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragDepth, setDragDepth] = useState(0)

  const { uploads, select, remove, retry, uploading, failed, done } = useUploads({
    onUpload,
    multiple,
    maxSize,
    maxSizeLabel,
    accept,
    acceptLabel,
    onSelect,
    onUploadsChange,
  })

  // The prop wins when given, so a caller running its own request can drive the
  // card without adopting `onUpload`.
  const busy = isUploading ?? uploading
  const over = dragDepth > 0 && !disabled && !busy

  const inFlight = uploads.find((upload) => upload.status === 'uploading')
  const settled = done > 0 && !busy && !failed

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragDepth(0)
    if (disabled || busy) return
    select([...event.dataTransfer.files])
  }

  /** `UploadList` is presentational and takes `Attachment`, so map into it. */
  const attachments: Attachment[] = uploads.map((upload) => ({
    id: upload.id,
    name: upload.name,
    type: upload.type,
    size: upload.size,
    progress: upload.status === 'done' ? undefined : upload.progress,
    error: upload.error,
  }))

  return (
    <div data-slot="dropzone" className={cn('flex w-full flex-col gap-2', className)} {...props}>
      <button
        type="button"
        disabled={disabled || busy}
        data-dragging={over}
        data-busy={busy}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragDepth((depth) => depth + 1)
        }}
        onDragLeave={() => setDragDepth((depth) => Math.max(0, depth - 1))}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 border border-dashed px-6 py-9 text-center',
          radius.surface,
          interactive,
          focusRing,
          disabledState,
          // Busy is not disabled-looking: the card is still the thing telling
          // you what is happening, so it keeps full contrast.
          busy && 'opacity-100',
          over
            ? 'border-primary bg-accent text-foreground'
            : failed
              ? 'border-destructive text-muted-foreground'
              : 'border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground',
        )}
      >
        {busy ? (
          <>
            <Spinner size="sm" label="Uploading" />
            <span className="text-foreground max-w-full truncate text-sm font-medium">
              {uploadingLabel(
                inFlight
                  ? inFlight.name
                  : `${uploads.length} file${uploads.length === 1 ? '' : 's'}`,
              )}
            </span>
          </>
        ) : settled ? (
          <>
            <CheckCircle2
              className="size-5 shrink-0 text-[var(--green-soft-foreground)]"
              aria-hidden="true"
            />
            <span className="text-foreground text-sm font-medium">{doneLabel(done)}</span>
            <span className="text-muted-foreground text-xs">{label}</span>
          </>
        ) : (
          <>
            <CloudUpload className="size-5 shrink-0" aria-hidden="true" />
            <span className="text-foreground text-sm font-medium">{label}</span>
            {hint ? (
              <span className="text-muted-foreground text-xs">{hint}</span>
            ) : (
              (accept || maxSize !== undefined) && (
                <span className="text-muted-foreground text-xs">
                  {[accept, maxSize !== undefined ? `up to ${formatBytes(maxSize)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )
            )}
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || busy}
        // The button above is the control; this stays out of the tab order so
        // there is one stop, not two.
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          select([...(event.target.files ?? [])])
          // Reset so picking the same file twice still fires a change.
          event.target.value = ''
        }}
      />

      {showList && uploads.length > 0 && (
        <UploadList uploads={attachments} onRemove={remove} onRetry={retry} />
      )}
    </div>
  )
}

export { Dropzone }
export type { DropzoneProps }
export type { FileUpload, UploadControl, UploadHandler } from '@/lib/use-uploads'
