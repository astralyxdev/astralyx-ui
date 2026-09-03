import type { ComponentProps, ReactNode } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { AttachmentPreview, type Attachment } from '@/components/ui/attachment-preview'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A batch of uploads with an aggregate bar.
 *
 * Overall progress is weighted by file size, not by count. Five thumbnails and
 * one video are not six equal sixths, and a per-file average sits at 83% while
 * the only file that matters has barely started.
 *
 * Failures stay in the list with a retry. Dropping them silently is how a user
 * ends up believing an upload finished; the failed row is the notification.
 */
function UploadList({
  uploads,
  onRetry,
  onRemove,
  onCancelAll,
  cancelAllLabel = 'Cancel remaining',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  uploads: Attachment[]
  onRetry?: (id: string) => void
  onRemove?: (id: string) => void
  onCancelAll?: () => void
  cancelAllLabel?: ReactNode
}) {
  const active = uploads.filter((u) => u.progress !== undefined && u.progress < 1 && !u.error)
  const failed = uploads.filter((u) => u.error)
  const done = uploads.filter((u) => u.progress === undefined || u.progress >= 1).length

  // Weighted by bytes: five thumbnails and one video are not six equal sixths.
  const totalBytes = uploads.reduce((sum, u) => sum + (u.size ?? 0), 0)
  const uploadedBytes = uploads.reduce(
    (sum, u) => sum + (u.size ?? 0) * (u.error ? 0 : (u.progress ?? 1)),
    0,
  )
  const overall = totalBytes > 0 ? uploadedBytes / totalBytes : done / Math.max(uploads.length, 1)

  if (uploads.length === 0) return null

  return (
    <div
      data-slot="upload-list"
      className={cn(surface, radius.surface, 'flex flex-col gap-3 p-3', className)}
      {...props}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium">
            {active.length > 0
              ? `Uploading ${active.length} of ${uploads.length}`
              : failed.length > 0
                ? `${failed.length} failed`
                : `${uploads.length} uploaded`}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {Math.round(overall * 100)}%
          </span>
        </div>
        <Progress value={overall * 100} className="h-1.5" />
      </div>

      <ul className="flex list-none flex-col gap-2">
        {uploads.map((upload) => (
          <li key={upload.id} className="flex items-center gap-2">
            <AttachmentPreview
              attachment={upload}
              onRemove={onRemove}
              compact
              className="min-w-0 flex-1"
            />
            {/* Failures keep a retry rather than disappearing. */}
            {upload.error && onRetry && (
              <Button
                variant="secondary"
                size="icon-xs"
                aria-label={`Retry ${upload.name}`}
                onClick={() => onRetry(upload.id)}
              >
                <RotateCcw />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {active.length > 0 && onCancelAll && (
        <Button variant="ghost" size="xs" className="self-start" onClick={onCancelAll}>
          <X />
          {cancelAllLabel}
        </Button>
      )}
    </div>
  )
}

export { UploadList }
