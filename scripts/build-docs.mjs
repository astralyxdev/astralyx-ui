/**
 * The serialisable half of the registry, for the pages that render on a server.
 *
 * A registry entry mixes two kinds of thing: facts about a component — its
 * label, its description, the code behind each demo — and functions that render
 * it. Only the first kind can cross into a React Server Component, and only the
 * first kind is needed to draw the page's text.
 *
 * So this splits them. What comes out is every word a component page shows
 * before anything hydrates: the heading, the description, the install line, the
 * source behind each demo, and the curated API prose. The playground and the
 * live previews import the registry proper, on the client, where the render
 * functions still exist.
 *
 * Loaded through Vite for the same reason `build-registry.mjs` is: the registry
 * is TypeScript that imports 343 components, and this is the loader that
 * already works on it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const OUT = path.join(process.cwd(), 'src/registry/docs.generated.json')

// The registry's module scope reaches for a few browser globals. Nothing reads
// them during this load; they only have to exist.
globalThis.window ??= {
  location: { pathname: '/' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })

const { CATEGORIES, isReady, componentPath } = await server.ssrLoadModule('/src/registry/index.ts')
const { DOCS, docPath } = await server.ssrLoadModule('/src/docs/pages.tsx')
const { EXAMPLES, examplePath } = await server.ssrLoadModule('/src/examples/index.ts')

const components = {}

for (const category of CATEGORIES) {
  for (const entry of category.items) {
    components[entry.id] = {
      id: entry.id,
      label: entry.label,
      description: entry.description,
      category: category.label,
      href: `${componentPath(entry.id)}/`,
      ready: isReady(entry),
      ...(entry.usage ? { usage: entry.usage } : {}),
      ...(entry.isNew ? { isNew: true } : {}),
      ...(entry.api?.length ? { api: entry.api } : {}),
      // The preview is a function and stays behind; the source is a string and
      // is the half a crawler can read.
      ...(entry.demos?.length
        ? {
            demos: entry.demos.map((demo) => ({
              title: demo.title,
              code: demo.code,
              ...(demo.language ? { language: demo.language } : {}),
            })),
          }
        : {}),
      hasComposer: Boolean(entry.composer),
    }
  }
}

const data = {
  categories: CATEGORIES.map((category) => ({
    label: category.label,
    items: category.items.map((entry) => entry.id),
  })),
  components,
  docs: DOCS.map((doc) => ({
    id: doc.id,
    label: doc.label,
    description: doc.description,
    href: `${docPath(doc.id)}/`,
  })),
  examples: EXAMPLES.map((example) => ({
    id: example.id,
    label: example.label,
    description: example.description,
    uses: example.uses,
    href: `${examplePath(example.id)}/`,
  })),
}

fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`)
await server.close()

const ids = Object.keys(components)
console.log(
  `docs ok — ${ids.length} components across ${data.categories.length} categories, ` +
    `${ids.filter((id) => components[id].demos).length} with demos, ` +
    `${ids.filter((id) => components[id].api).length} with curated API prose, ` +
    `${data.docs.length} docs, ${data.examples.length} examples`,
)
