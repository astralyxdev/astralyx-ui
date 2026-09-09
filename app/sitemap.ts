import type { MetadataRoute } from 'next'
import docs from '@/registry/docs.generated.json'
import { SITE } from '@/lib/seo'

/**
 * The pages worth submitting, which is not the same as every page that exists.
 *
 * This used to list all 360 routes. It now lists nine: the home page, the
 * component index and the seven docs. The 344 component pages are deliberately
 * absent.
 *
 * **Why a smaller sitemap.** A sitemap is a request for attention, and asking
 * for it 360 times at once on a young domain spends the site's crawl budget on
 * 344 near-identical pages before Google has decided the domain is worth
 * indexing at all. The nine pages here are the ones that have to rank; the
 * component pages are what someone finds *after* arriving.
 *
 * **What this does not do.** It does not hide the component pages. Every one of
 * them is linked from the rail on every page of the site, so they stay
 * crawlable and stay indexable — they are discovered by following links, which
 * is the normal path, rather than by being handed over in bulk. Nothing here is
 * `noindex` and nothing is disallowed in robots.txt.
 *
 * `/docs/` itself is not listed on purpose: it is a redirect stub carrying
 * `noindex`, and a sitemap should never name a page that asks not to be indexed.
 */
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const at = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    priority,
  })

  return [
    at('/', 1),
    at('/components/', 0.9),
    ...docs.docs.map((doc) => at(doc.href, 0.8)),
  ]
}
