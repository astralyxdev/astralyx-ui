/**
 * Finds curated API rows that no longer describe anything in the source.
 *
 * `ComponentEntry.api` is prose written by hand, and hand-written prose
 * drifts: a prop gets renamed, a helper is removed, an import line keeps a
 * name that no longer exists. The generated reference cannot drift, so it is
 * the yardstick. Reported here:
 *
 * - a curated row whose name looks like a prop (its type reads as TypeScript)
 *   but matches no prop, hook, function, type, field or inherited attribute
 *   of the file — rows about behaviour (`keyboard`, `accessibility`) match
 *   nothing on purpose and are listed only with `--notes`;
 * - a name in the entry's `usage` that the module it imports from does not
 *   export, for imports that point into the kit.
 *
 * Exit status is non-zero when anything looks stale, so it can gate a build.
 */
import fs from 'node:fs'
import { createServer } from 'vite'

globalThis.window ??= {
  location: { pathname: '/' },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const { ENTRIES } = await server.ssrLoadModule('/src/registry/index.ts')
const { apiDocs, namesIn } = await server.ssrLoadModule('/src/registry/props.ts')
await server.close()

const generated = JSON.parse(fs.readFileSync('src/registry/props.generated.json', 'utf8'))
const INHERITED = new Set(generated.inherited)

/** Every name a file exports, from the generated reference. */
function exportsOf(id) {
  const api = generated.files[id]
  if (!api) return new Set()
  return new Set([
    ...(api.components ?? []).map((component) => component.name),
    ...(api.hooks ?? []).map((hook) => hook.name),
    ...(api.functions ?? []).map((fn) => fn.name),
    ...(api.types ?? []).flatMap((type) => [type.name, ...(type.aliases ?? [])]),
  ])
}

const TYPE_LIKE = /=>|\b(boolean|string|number|ReactNode|Date|void|null)\b|\[\]|\|\s*'|^'[^']*'$|^\{/

const stale = []
const notes = []
const imports = []

for (const entry of ENTRIES) {
  const docs = apiDocs(entry.id, entry.api)
  const known = new Set([
    ...exportsOf(entry.id),
    ...docs.components.flatMap((component) => component.props.map((prop) => prop.name)),
    ...docs.types.flatMap((type) => (type.fields ?? []).map((field) => field.name)),
    ...INHERITED,
  ])

  for (const row of entry.api ?? []) {
    // `toast(options)` describes what a hook returns, not an export.
    if (/\(/.test(row.name)) continue
    const names = namesIn(row)
    // The merge reads a path by its last segment: `item.keywords` is `keywords`.
    const lookup = /[.[]/.test(row.name) ? names.slice(-1) : names
    const missing = lookup.filter((name) => !known.has(name))
    if (!missing.length) continue
    const label = missing.length === names.length ? row.name : missing.join(', ')
    // Identifiers joined by separators read as props; words read as a note.
    const propLike = /^[\w$]+(\s*[/,.]\s*[\w$]+)*(\[\])?$/.test(row.name)
    if (propLike && TYPE_LIKE.test(row.type ?? '')) {
      stale.push(`${entry.id}: "${label}" (${row.type})`)
    } else {
      notes.push(`${entry.id}: "${row.name}"`)
    }
  }

  for (const match of (entry.usage ?? '').matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const module = match[2].match(/^@\/components\/ui\/([\w-]+)$/)?.[1]
    if (!module) continue
    const exported = exportsOf(module)
    for (const raw of match[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]
      if (name && !exported.has(name)) {
        imports.push(`${entry.id}: usage imports "${name}" from ${module}, which does not export it`)
      }
    }
  }
}

if (process.argv.includes('--notes')) {
  console.log(`behaviour notes (${notes.length}):`)
  for (const note of notes) console.log(`  ${note}`)
}

const problems = [...stale, ...imports]
if (problems.length) {
  console.error(`api check found ${problems.length} stale rows:`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log(`api ok — ${ENTRIES.length} entries, ${notes.length} behaviour notes, nothing stale`)
