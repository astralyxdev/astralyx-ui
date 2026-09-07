/**
 * Per-page document metadata.
 *
 * The vocabulary every route's `generateMetadata` shares, so the suffix and the
 * domain are written once.
 *
 * There used to be a hook here that rewrote the head after navigation, paired
 * with a script that baked the same values into a static file. Both existed
 * because the body was never rendered at build time: the hook covered browsers,
 * the script covered crawlers, and neither covered the other. The export writes
 * real HTML for every route now, so one source does.
 */
export const SITE = 'https://ui.astralyx.dev'
export const SITE_NAME = 'Astralyx UI'

/**
 * The absolute URL to advertise for a route.
 *
 * GitHub Pages serves `/components/button/index.html` for `/components/button`
 * by way of a 308 to the trailing-slash form, so the bare path is not the URL
 * that answers 200. A canonical naming a redirect is a smell worth not having.
 *
 * Idempotent, because callers disagree about whose job the slash is: the
 * generated data carries hrefs that already end in one, and a literal written
 * by hand usually does not. Appending unconditionally produced `…/button//`.
 */
export function canonicalUrl(path: string) {
  const clean = path.endsWith('/') ? path.slice(0, -1) : path
  return `${SITE}${clean}/`
}

/** The one place the title suffix is decided. */
export function pageTitle(title?: string) {
  return title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — React components you own`
}

/**
 * Trim to a length search results will actually show, on a word boundary.
 *
 * Google renders roughly 155-160 characters of a description. Cutting mid-word
 * looks like a bug in the page rather than a truncation by the search engine.
 */
export function clampDescription(text: string, limit = 155) {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= limit) return collapsed

  const cut = collapsed.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : limit).replace(/[,;:.]$/, '')}…`
}

/**
 * The Open Graph block for one page.
 *
 * Metadata in Next is merged a field at a time, and `openGraph` is one field: a
 * route that sets it replaces the parent's outright, images included. Leaving it
 * unset is not the answer either — then the page inherits the site's title, its
 * description and its URL, so every component and every example unfurled in
 * Slack as the home page.
 *
 * So each route builds the whole block, and this is the only copy of the parts
 * that never change.
 */
export function openGraphFor({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME,
    title: pageTitle(title),
    description,
    url: canonicalUrl(path),
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — components you actually own`,
      },
    ],
  }
}
