import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, FileText, Film, Music } from 'lucide-react'
import { Image } from '@/components/ui/image'
import { formatBytes } from '@/components/ui/storage-usage'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A media library: images and files as a selectable grid.
 *
 * The picker half of an asset store. Built on this kit's `Image`, so every tile
 * gets the placeholder mask, the reserved box and the failure state for free —
 * a grid of raw `<img>` tags is the fastest way to make a library page jump
 * around while it loads.
 *
 * **A broken asset stays in the grid.** An image whose URL has rotted is
 * exactly the one someone needs to find and replace, and a library that hides
 * failures makes it invisible while its reference is still live in production.
 *
 * Selection is controlled and multi-capable, because the operations people
 * actually perform here — delete these six, move these to another folder — are
 * bulk ones.
 */
export type Asset = {
  id: string
  /** Image URL, or a thumbnail for a non-image file. */
  src?: string
  name: string
  /** MIME type. Drives the fallback glyph when there is no thumbnail. */
  type?: string
  /** Bytes. */
  size?: number
  /** Already formatted. */
  modified?: string
  /** Shown on the tile — dimensions, a duration, a tag. */
  meta?: ReactNode
}

function glyphFor(type: string | undefined) {
  if (!type) return FileText
  if (type.startsWith('video/')) return Film
  if (type.startsWith('audio/')) return Music
  return FileText
}

type AssetGridProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  assets: Asset[]
  /** Selected ids. Omit both to render a read-only library. */
  value?: string[]
  onValueChange?: (next: string[]) => void
  /** One at a time. */
  single?: boolean
  onOpen?: (asset: Asset) => void
  /** Minimum tile width; the grid fills the rest. */
  minTile?: number
  ratio?: number
  emptyLabel?: string
  format?: (bytes: number) => string
}

function AssetGrid({
  assets,
  value,
  onValueChange,
  single = false,
  onOpen,
  minTile = 150,
  ratio = 1,
  emptyLabel = 'Nothing in this library yet.',
  format = formatBytes,
  className,
  ...props
}: AssetGridProps) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const selectable = value !== undefined && onValueChange !== undefined
  const selected = new Set(value ?? [])

  function toggle(id: string) {
    if (!selectable) return
    if (single) return onValueChange!(selected.has(id) ? [] : [id])
    onValueChange!(selected.has(id) ? (value ?? []).filter((item) => item !== id) : [...(value ?? []), id])
  }

  if (assets.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'p-6 text-center', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul
      data-slot="asset-grid"
      className={cn('grid list-none gap-3', className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minTile}px, 1fr))` }}
      {...(props as ComponentProps<'ul'>)}
    >
      {assets.map((asset) => {
        const on = selected.has(asset.id)
        const Glyph = glyphFor(asset.type)
        const broken = failed.has(asset.id)

        return (
          <li key={asset.id}>
            <button
              type="button"
              aria-pressed={selectable ? on : undefined}
              onClick={() => (selectable ? toggle(asset.id) : onOpen?.(asset))}
              onDoubleClick={() => onOpen?.(asset)}
              className={cn(
                'group block w-full text-start',
                radius.surface,
                focusRing,
                'border transition-colors motion-reduce:transition-none',
                on ? 'border-primary ring-ring/40 ring-2' : 'border-border hover:border-foreground/25',
              )}
            >
              <div className={cn('relative overflow-hidden', radius.surface)}>
                {asset.src && !broken ? (
                  <Image
                    src={asset.src}
                    alt={asset.name}
                    ratio={ratio}
                    mask="skeleton"
                    className="rounded-none"
                    onStatusChange={(status) => {
                      // Kept in the grid, marked. The rotted asset is the one
                      // someone came here to find.
                      if (status === 'error') {
                        setFailed((current) => new Set(current).add(asset.id))
                      }
                    }}
                  />
                ) : (
                  <div
                    className="bg-muted text-muted-foreground flex items-center justify-center"
                    style={{ aspectRatio: ratio }}
                  >
                    <Glyph className="size-6" aria-hidden="true" />
                  </div>
                )}

                {selectable && on && (
                  <span className="bg-primary text-primary-foreground absolute end-2 top-2 flex size-5 items-center justify-center rounded-full">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="min-w-0 px-2.5 py-2">
                <p className="truncate text-xs font-medium">{asset.name}</p>
                <p className="text-muted-foreground/60 truncate text-[11px] tabular-nums">
                  {[asset.size !== undefined ? format(asset.size) : null, asset.modified]
                    .filter(Boolean)
                    .join(' · ')}
                  {asset.meta}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export { AssetGrid }
export type { AssetGridProps }
