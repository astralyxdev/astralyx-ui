import NextLink from 'next/link'
import type { ComponentProps } from 'react'

/**
 * The site's internal link.
 *
 * Two jobs. It keeps the `to` prop every page in this repo already writes, so
 * the move to file routing did not touch 33 call sites; and it is the one place
 * the trailing slash is applied.
 *
 * That slash is not cosmetic. `trailingSlash: true` means `/components` answers
 * with a 308 to `/components/`, so a link written without it costs a redirect on
 * every click and hands a crawler a redirect chain to walk instead of a page.
 * The canonical URL and the link that points at it should be the same string.
 */
export function Link({
  to,
  ...props
}: Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string }) {
  const external = /^[a-z]+:|^\/\//i.test(to)
  const bare = to.split(/[?#]/)[0]
  const href = external || bare.endsWith('/') || /\.\w+$/.test(bare) ? to : to.replace(bare, `${bare}/`)

  return <NextLink href={href} {...props} />
}
