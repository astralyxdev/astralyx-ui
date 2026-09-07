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
 * by way of a 301 to the trailing-slash form, so the bare path is not the URL
 * that answers 200. A canonical naming a redirect is a smell worth not having;
 * the app's own links stay slash-free, since those navigate via pushState and
 * never hit the server.
 */
export function canonicalUrl(path: string) {
  return path === '/' ? `${SITE}/` : `${SITE}${path}/`
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
