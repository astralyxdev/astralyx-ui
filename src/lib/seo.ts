import { useEffect } from 'react'

/**
 * Per-page document metadata.
 *
 * Two halves solve two different problems, and neither covers the other:
 *
 * - This hook rewrites the head *after* navigation, which is what a browser tab,
 *   a bookmark, the history menu and a JS-executing crawler read.
 * - `scripts/build-seo.mjs` writes a static HTML file per route at build time
 *   with the same values baked in. Slack, X, iMessage and most crawlers never
 *   run the bundle, so a client-side title is invisible to them; the prerendered
 *   file is the only thing they ever see.
 *
 * Keep the two in step. The shared vocabulary is `pageTitle` and `SITE`, so a
 * change to the suffix or the domain lands in both.
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

type SeoInput = {
  /** Page name, without the site suffix. Omit on the landing page. */
  title?: string
  description: string
  /** Route path, leading slash. Becomes the canonical and `og:url`. */
  path: string
}

/** Create the tag if it is missing, so this works on any served HTML. */
function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }

  element.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.append(element)
  }

  element.href = href
}

/**
 * Writes the head for the current page.
 *
 * No cleanup on unmount: every route sets its own values, so restoring the
 * previous ones would only ever flash the wrong title between two pages.
 */
export function useSeo({ title, description, path }: SeoInput) {
  useEffect(() => {
    const fullTitle = pageTitle(title)
    const url = canonicalUrl(path)
    const text = clampDescription(description)

    document.title = fullTitle
    upsertCanonical(url)
    upsertMeta('name', 'description', text)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', text)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', text)
  }, [title, description, path])
}
