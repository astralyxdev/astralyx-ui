/**
 * Emits robots.txt and sitemap.xml into the build output.
 *
 * The routes are read from the same registry the app renders from, rather than
 * listed here. A hand-written sitemap is stale the first time someone adds a
 * component, and the failure is invisible — nothing breaks, the page simply
 * never gets crawled.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const SITE = process.env.SITE_URL ?? 'https://ui.astralyx.dev'
const OUT = path.join(process.cwd(), 'dist')

// The router reads window.location in a useState initialiser, and the registry
// modules pull in components that touch matchMedia at module scope.
globalThis.window ??= {
  location: { pathname: '/' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { ENTRIES, componentPath } = await server.ssrLoadModule('/src/registry/index.ts')
const { DOCS } = await server.ssrLoadModule('/src/docs/pages.tsx')
const { EXAMPLES, examplePath } = await server.ssrLoadModule('/src/examples/index.ts')
await server.close()

/** `priority` is ordinal, not a promise: it only ranks our own pages. */
const routes = [
  { path: '/', priority: '1.0' },
  { path: '/components', priority: '0.9' },
  { path: '/examples', priority: '0.8' },
  ...DOCS.map((doc) => ({ path: `/docs/${doc.id}`, priority: '0.7' })),
  ...EXAMPLES.map((example) => ({ path: examplePath(example.id), priority: '0.6' })),
  ...ENTRIES.map((entry) => ({ path: componentPath(entry.id), priority: '0.5' })),
]

const today = new Date().toISOString().slice(0, 10)

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map(
    (route) =>
      `  <url><loc>${SITE}${route.path}</loc><lastmod>${today}</lastmod>` +
      `<priority>${route.priority}</priority></url>`,
  ),
  '</urlset>',
  '',
].join('\n')

const robots = [`User-agent: *`, `Allow: /`, ``, `Sitemap: ${SITE}/sitemap.xml`, ``].join('\n')

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap)
fs.writeFileSync(path.join(OUT, 'robots.txt'), robots)

console.log(`seo ok — ${routes.length} urls in sitemap.xml, robots.txt written`)
