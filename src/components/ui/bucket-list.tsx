import type { ComponentProps, ReactNode } from 'react'
import { Globe, Lock, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBytes } from '@/components/ui/storage-usage'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Object-storage buckets, with the fact that matters first.
 *
 * That fact is **public or not**. Every storage breach of the last decade is
 * some version of a bucket nobody realised was world-readable, and a list that
 * renders access as a small grey tag among five other small grey tags is how it
 * stays unnoticed. Public buckets get a warning treatment, not a label.
 *
 * Region is shown because it is immutable and expensive to get wrong — a bucket
 * in the wrong region is a migration, not a setting — and because latency and
 * data residency both hang off it.
 */
export type Bucket = {
  name: string
  region?: string
  /** Bytes. */
  size?: number
  objects?: number
  /** World-readable. Rendered as a warning, not a tag. */
  public?: boolean
  /** Object-lock, versioning, whatever your provider calls it. */
  badges?: ReactNode[]
  /** Already formatted. */
  createdAt?: string
}

type BucketListProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  buckets: Bucket[]
  onSelect?: (bucket: Bucket) => void
  selectedName?: string
  publicLabel?: string
  privateLabel?: string
  objectsLabel?: string
  emptyLabel?: string
  format?: (bytes: number) => string
  label?: string
}

function BucketList({
  buckets,
  onSelect,
  selectedName,
  publicLabel = 'Public',
  privateLabel = 'Private',
  objectsLabel = 'objects',
  emptyLabel = 'No buckets.',
  format = formatBytes,
  label = 'Buckets',
  className,
  ...props
}: BucketListProps) {
  if (buckets.length === 0) {
    return (
      <div className={cn(surface, radius.surface, 'p-4', className)} {...props}>
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul
      data-slot="bucket-list"
      aria-label={label}
      className={cn(surface, radius.surface, 'divide-border list-none divide-y overflow-hidden', className)}
      {...(props as ComponentProps<'ul'>)}
    >
      {buckets.map((bucket) => {
        const Row = onSelect ? 'button' : 'div'
        return (
          <li key={bucket.name}>
            <Row
              {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(bucket) } : {})}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-start',
                onSelect && cn('hover:bg-accent/40', focusRing),
                bucket.name === selectedName && 'bg-accent/60',
              )}
            >
              {bucket.public ? (
                <Globe
                  className="size-4 shrink-0 text-[var(--destructive-soft-foreground)]"
                  aria-hidden="true"
                />
              ) : (
                <Lock className="text-muted-foreground/50 size-4 shrink-0" aria-hidden="true" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="truncate font-mono text-sm">{bucket.name}</code>
                  {/* A warning, not a tag — this is the fact that matters. */}
                  {bucket.public ? (
                    <Badge size="sm" color="destructive">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      {publicLabel}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/50 text-[11px]">{privateLabel}</span>
                  )}
                  {bucket.badges?.map((badge, index) => (
                    <Badge key={index} size="sm" variant="outline">
                      {badge}
                    </Badge>
                  ))}
                </div>

                <p className="text-muted-foreground/60 mt-0.5 flex flex-wrap gap-x-3 text-[11px] tabular-nums">
                  {bucket.region && <span className="font-mono">{bucket.region}</span>}
                  {bucket.objects !== undefined && (
                    <span>
                      {bucket.objects.toLocaleString()} {objectsLabel}
                    </span>
                  )}
                  {bucket.createdAt && <span>{bucket.createdAt}</span>}
                </p>
              </div>

              {bucket.size !== undefined && (
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {format(bucket.size)}
                </span>
              )}
            </Row>
          </li>
        )
      })}
    </ul>
  )
}

export { BucketList }
export type { BucketListProps }
