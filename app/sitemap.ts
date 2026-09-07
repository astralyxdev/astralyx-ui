import type { MetadataRoute } from 'next'
import docs from '@/registry/docs.generated.json'
import { SITE } from '@/lib/seo'

/**
 * Every route, with the trailing slash the canonicals already use.
 *
 * Nothing is hand-listed: a written-out sitemap is stale the first time someone
 * adds a component, and nothing visibly breaks when it is.
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
    at('/examples/', 0.8),
    ...docs.docs.map((doc) => at(doc.href, 0.8)),
    ...docs.examples.map((example) => at(example.href, 0.6)),
    ...Object.values(docs.components).map((entry) => at(entry.href, 0.7)),
  ]
}
