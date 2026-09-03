import type { ComponentProps, ReactNode } from 'react'
import { BadgeCheck, ImageOff } from 'lucide-react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An NFT tile: media, collection, price.
 *
 * The media sits in a fixed `AspectRatio` and a broken image resolves to a
 * placeholder rather than collapsing the tile. NFT media is loaded from IPFS
 * gateways that fail constantly, and a grid that reflows every time one 404s is
 * unusable.
 *
 * Collection verification is a badge on the *collection*, never on the item.
 * Copied collections are the standard scam here, and putting a tick beside an
 * item's name implies something nobody has checked.
 */
export type NftCardProps = Omit<ComponentProps<'article'>, 'title'> & {
  name: ReactNode
  collection?: ReactNode
  /** Verified applies to the collection, not the token. */
  verified?: boolean
  image?: string
  tokenId?: ReactNode
  price?: ReactNode
  lastSale?: ReactNode
  rarity?: ReactNode
  href?: string
  footer?: ReactNode
  /** Accessible name for the verification tick. */
  verifiedLabel?: string
  priceLabel?: ReactNode
  lastSaleLabel?: ReactNode
}

function NftCard({
  name,
  collection,
  verified = false,
  image,
  tokenId,
  price,
  lastSale,
  rarity,
  href,
  footer,
  verifiedLabel = 'Verified collection',
  priceLabel = 'Price',
  lastSaleLabel = 'Last sale',
  className,
  ...props
}: NftCardProps) {
  const body = (
    <>
      <AspectRatio ratio={1} className={cn('bg-muted overflow-hidden', radius.control)}>
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            // A dead gateway must not collapse the tile.
            onError={(event) => {
              event.currentTarget.style.display = 'none'
              event.currentTarget.nextElementSibling?.removeAttribute('hidden')
            }}
          />
        ) : null}
        <div
          hidden={Boolean(image)}
          className="text-muted-foreground/40 flex size-full items-center justify-center"
        >
          <ImageOff className="size-8" aria-hidden="true" />
        </div>
      </AspectRatio>

      <div className="flex flex-col gap-1 pt-3">
        {collection && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <span className="truncate">{collection}</span>
            {verified && (
              <BadgeCheck
                className="size-3.5 shrink-0 text-[var(--blue-soft-foreground)]"
                aria-label={verifiedLabel}
              />
            )}
          </span>
        )}

        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
          {tokenId && (
            <span className="text-muted-foreground/70 shrink-0 font-mono text-xs">
              #{tokenId}
            </span>
          )}
        </span>

        {rarity && (
          <span className="flex">
            <Badge size="sm">{rarity}</Badge>
          </span>
        )}

        {(price || lastSale) && (
          <dl className="mt-1 flex items-baseline justify-between gap-2 text-xs">
            {price && (
              <div className="min-w-0">
                <dt className="text-muted-foreground/70">{priceLabel}</dt>
                <dd className="truncate font-medium tabular-nums">{price}</dd>
              </div>
            )}
            {lastSale && (
              <div className="min-w-0 text-end">
                <dt className="text-muted-foreground/70">{lastSaleLabel}</dt>
                <dd className="text-muted-foreground truncate tabular-nums">{lastSale}</dd>
              </div>
            )}
          </dl>
        )}

        {footer}
      </div>
    </>
  )

  return (
    <article
      data-slot="nft-card"
      className={cn(surface, radius.surface, 'flex flex-col p-3', className)}
      {...props}
    >
      {href ? (
        <a href={href} className={cn('flex flex-col', radius.control, focusRing)}>
          {body}
        </a>
      ) : (
        body
      )}
    </article>
  )
}

export { NftCard }
