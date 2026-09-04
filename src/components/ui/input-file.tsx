import { useId, useRef, type ComponentProps, type ReactNode } from 'react'
import { Check, Paperclip, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { UploadList } from '@/components/ui/upload-list'
import type { Attachment } from '@/components/ui/attachment-preview'
import { useUploads, type FileUpload, type UploadHandler } from '@/lib/use-uploads'
import {
  disabledState,
  fieldBase,
  fieldSize,
  focusRing,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A file picker shaped like an Input, which also runs the upload.
 *
 * The counterpart to `Dropzone`, not a replacement: this is the control you put
 * on a settings form beside a Label, where a full drop card would be absurd.
 * Dropzone is the better default for a standalone uploader — dropping is the
 * primary gesture there, and it has room to say what is happening.
 *
 * The native control is replaced rather than restyled. `input[type=file]` gives
 * you a UA button whose text is not settable and whose layout is not reachable
 * except through a vendor pseudo-element, so matching the kit's field metrics
 * means driving a hidden input from our own trigger.
 *
 * The upload lives in `useUploads`, shared with Dropzone, so the two shapes
 * cannot drift in behaviour.
 */
type InputFileProps = Omit<
  ComponentProps<'input'>,
  'size' | 'type' | 'value' | 'onChange' | 'onSelect'
> & {
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  /** Text shown when nothing is picked. */
  placeholder?: string
  buttonLabel?: ReactNode
  clearLabel?: ReactNode
  /** Show the per-file rows under the field. */
  showList?: boolean
  /**
   * Runs the upload. Resolve to succeed — the value lands on `upload.result`;
   * throw to fail, and the message shows on the row with a retry.
   */
  onUpload?: UploadHandler
  /** Fires on selection, before any upload starts. */
  onSelect?: (uploads: FileUpload[]) => void
  /** Fires on every transition — start, progress, finish, failure, removal. */
  onUploadsChange?: (uploads: FileUpload[]) => void
  /** Reject anything larger, in bytes, before the upload starts. */
  maxSize?: number
  maxSizeLabel?: (limit: string) => string
  /** Force the busy state from outside, when the request is yours. */
  isUploading?: boolean
  /** Names the file being sent. */
  uploadingLabel?: (name: string) => string
}

const VARIANT = {
  default: 'border-border bg-background border',
  secondary: 'bg-secondary border border-transparent',
  ghost: 'border border-transparent bg-transparent hover:bg-accent',
} as const

/**
 * The trigger, sized from the field rather than from the button scale.
 *
 * Two rules, both derived from the box it sits in: it is 4px shorter than the
 * field, so the inset above and below matches the trailing one; and its radius
 * is half its own height, which is the rule every control in the kit follows.
 * `xs` is the exception the field itself makes — that size is a true pill
 * (`rounded-full [corner-shape:round]`), so its trigger is one too.
 *
 * Mapping straight onto `controlSize` is what produced the original bug: sizes
 * `xs` and `sm` both took the `xs` button, which is a pill by design, and a
 * lozenge inside a 16px-radius field reads as a mistake.
 */
const TRIGGER = {
  xs: { size: 'sm', className: 'h-6 px-2.5 rounded-full [corner-shape:round]' },
  sm: { size: 'sm', className: 'h-7 px-3 rounded-[14px]' },
  md: { size: 'sm', className: '' },
  lg: { size: 'default', className: '' },
  xl: { size: 'default', className: 'h-11 px-5 rounded-[22px]' },
} as const

function InputFile({
  size = 'md',
  variant = 'default',
  error = false,
  placeholder = 'No file selected',
  buttonLabel = 'Browse',
  clearLabel = 'Clear',
  showList = true,
  multiple = false,
  disabled = false,
  maxSize,
  maxSizeLabel,
  accept,
  isUploading,
  uploadingLabel = (name) => `Uploading ${name}…`,
  className,
  onUpload,
  onSelect,
  onUploadsChange,
  ...props
}: InputFileProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const { uploads, select, remove, retry, clear, uploading, failed, done } = useUploads({
    onUpload,
    multiple,
    maxSize,
    maxSizeLabel,
    accept,
    onSelect,
    onUploadsChange,
  })

  const busy = isUploading ?? uploading
  const inFlight = uploads.find((upload) => upload.status === 'uploading')

  let summary: ReactNode = placeholder
  if (busy) {
    summary = uploadingLabel(
      inFlight ? inFlight.name : `${uploads.length} file${uploads.length === 1 ? '' : 's'}`,
    )
  } else if (uploads.length === 1) summary = uploads[0].name
  else if (uploads.length > 1) summary = `${uploads.length} files`

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
    <div className="flex w-full flex-col gap-2">
      <div
        data-slot="input-file"
        data-busy={busy}
        className={cn(
          fieldBase,
          fieldSize[size],
          VARIANT[variant],
          (error || failed) && 'border-destructive',
          // The trailing inset belongs to text, not to a button. Every size
          // leaves 2px above and below the trigger, so the trailing side
          // matches it — the field's own text inset left a gap three times
          // that, and the button read as floating off the edge.
          'pe-0.5',
          // The wrapper is the focus surface: focus lands on the hidden input,
          // so the ring is drawn from `focus-within` on the box around it.
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
      >
        {busy ? (
          <Spinner size="sm" label="Uploading" className="shrink-0" />
        ) : done > 0 && !failed ? (
          <Check className="shrink-0 text-[var(--green-soft-foreground)]" aria-hidden="true" />
        ) : (
          <Paperclip className="text-muted-foreground shrink-0" aria-hidden="true" />
        )}

        <span
          id={id}
          className={cn(
            'min-w-0 flex-1 truncate text-start',
            uploads.length === 0 && !busy && 'text-muted-foreground/70',
          )}
        >
          {summary}
        </span>

        {uploads.length > 0 && !busy && (
          <Button
            type="button"
            variant="ghost"
            size={TRIGGER[size].size}
            className={cn('shrink-0', TRIGGER[size].className)}
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ''
              clear()
            }}
          >
            {clearLabel}
          </Button>
        )}

        <Button
          type="button"
          variant="secondary"
          size={TRIGGER[size].size}
          disabled={busy}
          className={cn('shrink-0', TRIGGER[size].className)}
          onClick={() => inputRef.current?.click()}
        >
          <Upload />
          {buttonLabel}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || busy}
          aria-labelledby={id}
          className={cn('sr-only', focusRing, disabledState, radius.control)}
          onChange={(event) => {
            select([...(event.target.files ?? [])])
            // Reset so picking the same file twice still fires a change.
            event.target.value = ''
          }}
          {...props}
        />
      </div>

      {showList && uploads.length > 0 && (
        <UploadList uploads={attachments} onRemove={remove} onRetry={retry} />
      )}
    </div>
  )
}

export { InputFile }
export type { InputFileProps }
