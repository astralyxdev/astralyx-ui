/**
 * Builds the distributable registry from source.
 *
 * The dependency graph is derived from the imports rather than hand-listed. A
 * hand-maintained manifest is wrong the first time someone adds an import and
 * forgets to update it, and the failure is silent: the CLI writes a file that
 * cannot compile in the consumer's project.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'registry')

/** Where each source folder lands in a consumer project, and what to call it. */
const SOURCES = [
  { dir: 'src/components/ui', type: 'registry:ui', prefix: '', target: 'components/ui' },
  { dir: 'src/components/primitives', type: 'registry:primitive', prefix: 'primitive-', target: 'components/primitives' },
  { dir: 'src/lib', type: 'registry:lib', prefix: 'lib-', target: 'lib' },
]

/** Peer dependencies — the consumer already has these; never install them. */
const PEERS = new Set(['react', 'react-dom'])

/**
 * Source files that exist for this site and no one else, by registry name.
 *
 * - `logo` is the Astralyx wordmark. It lives in `components/ui` because the
 *   docs site and the examples import it like any other component, but shipping
 *   it would put our brand mark in someone else's repo behind an `add logo`
 *   they cannot have wanted.
 * - `lib-seo` writes this site's document head and hardcodes its canonical
 *   domain. In a consumer's project it is wrong on its face.
 *
 * Nothing in the registry depends on either, so dropping them leaves the graph
 * closed — `check-registry.mjs` fails the build if that ever stops being true.
 */
const PRIVATE = new Set(['logo', 'lib-seo'])

function itemNameFor(specifier) {
  for (const source of SOURCES) {
    const alias = '@/' + source.dir.replace(/^src\//, '')
    if (specifier.startsWith(alias + '/')) {
      return source.prefix + specifier.slice(alias.length + 1)
    }
  }
  return undefined
}

/** Import specifiers in a module, ignoring anything inside a comment. */
function importsOf(code) {
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  const out = new Set()
  for (const m of stripped.matchAll(/\bfrom\s+'([^']+)'/g)) out.add(m[1])
  for (const m of stripped.matchAll(/\bimport\s*\(\s*'([^']+)'\s*\)/g)) out.add(m[1])
  return [...out]
}

/** `shiki/core` and `shiki/langs/x.mjs` are both the `shiki` package. */
function packageOf(specifier) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

async function docsMetadata() {
  // The docs registry already carries a label, a description and a category for
  // every component; re-deriving them here would let the two drift apart.
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  globalThis.window ??= {
    location: { pathname: '/' },
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }
  const { CATEGORIES } = await server.ssrLoadModule('/src/registry/index.ts')
  await server.close()

  const meta = new Map()
  for (const category of CATEGORIES) {
    for (const entry of category.items) {
      meta.set(entry.id, {
        label: entry.label,
        description: entry.description,
        category: category.label,
      })
    }
  }
  return meta
}

const meta = await docsMetadata()
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const versions = { ...pkg.dependencies, ...pkg.devDependencies }

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'items'), { recursive: true })

const items = []

for (const source of SOURCES) {
  const dir = path.join(ROOT, source.dir)
  if (!fs.existsSync(dir)) continue

  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.tsx?$/.test(file)) continue
    const base = file.replace(/\.tsx?$/, '')
    const name = source.prefix + base
    if (PRIVATE.has(name)) continue
    const content = fs.readFileSync(path.join(dir, file), 'utf8')

    const registryDependencies = []
    const dependencies = new Set()

    for (const specifier of importsOf(content)) {
      const internal = itemNameFor(specifier)
      if (internal) {
        if (internal !== name) registryDependencies.push(internal)
        continue
      }
      if (specifier.startsWith('.') || specifier.startsWith('@/')) continue
      const dep = packageOf(specifier)
      if (PEERS.has(dep)) continue
      // Pin to the version this kit is built and tested against.
      dependencies.add(versions[dep] ? `${dep}@${versions[dep]}` : dep)
    }

    const info = meta.get(base)
    items.push({
      name,
      type: source.type,
      title: info?.label ?? base,
      description: info?.description,
      category: info?.category,
      dependencies: [...dependencies].sort(),
      registryDependencies: [...new Set(registryDependencies)].sort(),
      files: [{ path: `${source.target}/${file}`, type: source.type, content }],
    })
  }
}

// The token layer is its own item so `init` and `add theme` share one source.
const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8')
items.push({
  name: 'theme',
  type: 'registry:theme',
  title: 'Theme',
  description: 'Colour tokens, the surface ladder, and the keyframes components rely on.',
  dependencies: [
    versions.tailwindcss ? `tailwindcss@${versions.tailwindcss}` : 'tailwindcss',
    versions['tw-animate-css'] ? `tw-animate-css@${versions['tw-animate-css']}` : 'tw-animate-css',
  ],
  registryDependencies: [],
  files: [{ path: 'styles/astralyx.css', type: 'registry:theme', content: css }],
})

for (const item of items) {
  fs.writeFileSync(
    path.join(OUT, 'items', `${item.name}.json`),
    JSON.stringify(item, null, 2) + '\n',
  )
}

const index = {
  name: pkg.name,
  version: pkg.version,
  homepage: pkg.homepage,
  items: items.map(({ name, type, title, description, category, dependencies, registryDependencies }) => ({
    name, type, title, description, category, dependencies, registryDependencies,
  })),
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n')

const byType = items.reduce((acc, i) => ({ ...acc, [i.type]: (acc[i.type] ?? 0) + 1 }), {})
console.log('registry written to ./registry')
console.log(Object.entries(byType).map(([t, n]) => `  ${t.padEnd(20)} ${n}`).join('\n'))
