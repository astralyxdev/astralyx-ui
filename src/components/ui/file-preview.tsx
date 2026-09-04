import { useState, type ComponentProps, type ReactNode } from 'react'
import { Download, File, FileText, Film, Music, TriangleAlert } from 'lucide-react'
import { AudioPlayer } from '@/components/ui/audio-player'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { Image } from '@/components/ui/image'
import { formatBytes } from '@/components/ui/storage-usage'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * One file, rendered as whatever it actually is.
 *
 * The dispatcher a file store needs: an image previews, text and code render
 * highlighted, audio gets a player, and everything else gets an honest "no
 * preview" panel with a download rather than a broken `<img>`.
 *
 * **The MIME type decides, not the extension.** A `.png` served as
 * `text/html` is the oldest upload attack there is, and a previewer that trusts
 * the filename renders it as markup. Extension is only consulted when the store
 * reports no type at all.
 *
 * Text is capped. A 40MB log rendered into the DOM freezes the tab, and the
 * point of a preview is to decide whether you want the file — the first few
 * hundred lines answer that.
 */
export type PreviewFile = {
  name: string
  /** MIME type from the store. Trusted over the extension. */
  type?: string
  /** Bytes. */
  size?: number
  /** For images, audio and video. */
  url?: string
  /** Already-fetched contents, for text and code. */
  text?: string
  /** Highlighting hint for `text`. */
  language?: string
}

type FilePreviewProps = Omit<ComponentProps<'div'>, 'children'> & {
  file: PreviewFile
  onDownload?: (file: PreviewFile) => void
  /** Characters of `text` to render. */
  maxChars?: number
  downloadLabel?: string
  noPreviewLabel?: string
  truncatedLabel?: (shown: number, total: number) => ReactNode
  actions?: ReactNode
}

/** MIME first; the extension is a fallback, never an override. */
export function previewKind(file: PreviewFile) {
  const type = file.type ?? ''
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('audio/')) return 'audio'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('text/') || /json|xml|javascript|typescript|sql|yaml/.test(type)) return 'text'
  if (type) return 'binary'

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'].includes(extension)) return 'image'
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(extension)) return 'audio'
  if (['mp4', 'webm', 'mov'].includes(extension)) return 'video'
  if (['txt', 'md', 'json', 'csv', 'log', 'yml', 'yaml', 'ts', 'tsx', 'js', 'sql'].includes(extension))
    return 'text'
  return 'binary'
}

function FilePreview({
  file,
  onDownload,
  maxChars = 20_000,
  downloadLabel = 'Download',
  noPreviewLabel = 'No preview for this file type.',
  truncatedLabel = (shown, total) =>
    `Showing the first ${shown.toLocaleString()} of ${total.toLocaleString()} characters.`,
  actions,
  className,
  ...props
}: FilePreviewProps) {
  const [failed, setFailed] = useState(false)
  const kind = previewKind(file)

  const text = file.text ?? ''
  const truncated = text.length > maxChars

  const Glyph = kind === 'video' ? Film : kind === 'audio' ? Music : kind === 'text' ? FileText : File

  return (
    <div
      data-slot="file-preview"
      className={cn(surface, radius.surface, 'flex flex-col overflow-hidden', className)}
      {...props}
    >
      <div className="border-border bg-muted/40 flex items-center gap-2.5 border-b px-4 py-2.5">
        <Glyph className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-medium">{file.name}</p>
          <p className="text-muted-foreground/60 text-[11px] tabular-nums">
            {[file.type, file.size !== undefined ? formatBytes(file.size) : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {actions}
        {onDownload && (
          <Button variant="ghost" size="sm" className="-me-2 shrink-0" onClick={() => onDownload(file)}>
            <Download />
            {downloadLabel}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {kind === 'image' && file.url && !failed && (
          <Image
            src={file.url}
            alt={file.name}
            ratio={16 / 10}
            fit="contain"
            mask="skeleton"
            className="rounded-none border-0"
            onStatusChange={(status) => status === 'error' && setFailed(true)}
          />
        )}

        {kind === 'audio' && file.url && (
          <div className="p-4">
            <AudioPlayer src={file.url} title={file.name} />
          </div>
        )}

        {kind === 'video' && file.url && (
          // The real element: it brings buffering, captions and the OS
          // controls with it.
          <video src={file.url} controls className="max-h-96 w-full bg-black" />
        )}

        {kind === 'text' && file.text !== undefined && (
          <div className="p-3">
            <CodeBlock
              code={truncated ? text.slice(0, maxChars) : text}
              language={(file.language ?? 'text') as never}
              header={false}
              lineNumbers
            />
            {truncated && (
              <p className="text-muted-foreground/60 mt-2 text-[11px]">
                {truncatedLabel(maxChars, text.length)}
              </p>
            )}
          </div>
        )}

        {(kind === 'binary' || failed || (kind !== 'text' && !file.url)) && (
          <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 p-8 text-center">
            {failed ? (
              <TriangleAlert className="size-5 text-[var(--destructive-soft-foreground)]" aria-hidden="true" />
            ) : (
              <File className="size-5" aria-hidden="true" />
            )}
            <p className="text-xs">{noPreviewLabel}</p>
            {file.type && (
              <Badge size="sm" variant="outline">
                {file.type}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { FilePreview }
export type { FilePreviewProps }
