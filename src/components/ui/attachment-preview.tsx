import type { ComponentProps, ReactNode } from 'react'
import { Download, File, FileText, Film, ImageIcon, Music, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An attached file: thumbnail, size, progress.
 *
 * The icon is chosen from the MIME type, not the file extension. Extensions are
 * user-supplied and routinely wrong or absent, and `invoice.pdf.exe` is the
 * oldest trick there is — deriving the icon from what the file claims to be by
 * name would draw a document icon on an executable.
 *
 * An upload in progress is the same component as a finished one, so the layout
 * does not jump when it completes. Files change height on completion in most
 * implementations and the list reflows under the pointer.
 */
export type Attachment = {
  id: string
  name: string
  /** MIME type. Drives the icon — not the extension. */
  type?: string
  /** Bytes. */
  size?: number
  url?: string
  thumbnail?: string
  /** 0–1 while uploading; omit when complete. */
  progress?: number
  error?: ReactNode
}

function iconFor(type: string | undefined) {
  if (!type) return File
  if (type.startsWith('image/')) return ImageIcon
  if (type.startsWith('video/')) return Film
  if (type.startsWith('audio/')) return Music
  if (type === 'application/pdf' || type.startsWith('text/')) return FileText
  return File
}

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

function AttachmentPreview({
  attachment,
  onRemove,
  onDownload,
  compact = false,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  attachment: Attachment
  onRemove?: (id: string) => void
  onDownload?: (attachment: Attachment) => void
  compact?: boolean
}) {
  const Icon = iconFor(attachment.type)
  const uploading = attachment.progress !== undefined && attachment.progress < 1

  return (
    <div
      data-slot="attachment-preview"
      className={cn(
        surface,
        radius.control,
        'flex items-center gap-3 p-2',
        attachment.error && 'border-[var(--destructive)]',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'bg-secondary flex shrink-0 items-center justify-center overflow-hidden',
          radius.xs,
          compact ? 'size-8' : 'size-10',
        )}
      >
        {attachment.thumbnail ? (
          <img src={attachment.thumbnail} alt="" className="size-full object-cover" />
        ) : (
          <Icon className="text-muted-foreground size-4" aria-hidden="true" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.name}</p>

        {/* Same row whether uploading or done — no reflow on completion. */}
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          {attachment.size !== undefined && (
            <span className="tabular-nums">{formatBytes(attachment.size)}</span>
          )}
          {uploading && (
            <>
              <Progress value={attachment.progress! * 100} className="h-1 min-w-16 flex-1" />
              <span className="tabular-nums">{Math.round(attachment.progress! * 100)}%</span>
            </>
          )}
          {attachment.error && (
            <span className="text-[var(--destructive-soft-foreground)]">{attachment.error}</span>
          )}
        </div>
      </div>

      <span className="flex shrink-0 items-center gap-1">
        {onDownload && !uploading && !attachment.error && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Download ${attachment.name}`}
            onClick={() => onDownload(attachment)}
          >
            <Download />
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${attachment.name}`}
            onClick={() => onRemove(attachment.id)}
          >
            <X />
          </Button>
        )}
      </span>
    </div>
  )
}

export { AttachmentPreview, iconFor as attachmentIconFor }
