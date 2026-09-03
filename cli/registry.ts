/**
 * Registry access, shared by the CLI and exported as this package's public API.
 *
 * The registry ships inside the package, so resolution works offline and the
 * components you get always match the version that resolved them. Pass a
 * `registry` URL to read a fork instead.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BUNDLED = path.join(HERE, '..', 'registry')

export type ItemType =
  | 'registry:ui'
  | 'registry:primitive'
  | 'registry:lib'
  | 'registry:theme'

export type RegistryFile = { path: string; type: ItemType; content: string }

export type Item = {
  name: string
  type: ItemType
  title: string
  description?: string
  category?: string
  dependencies: string[]
  registryDependencies: string[]
  files?: RegistryFile[]
}

export type Index = {
  name: string
  version: string
  homepage?: string
  items: Item[]
}

export class RegistryError extends Error {}

/** The catalogue: every item, without file contents. */
export async function getRegistry(remote?: string): Promise<Index> {
  if (remote) {
    const base = remote.replace(/\/$/, '')
    const response = await fetch(`${base}/index.json`)
    if (!response.ok) {
      throw new RegistryError(`Could not read registry at ${base} (${response.status}).`)
    }
    return (await response.json()) as Index
  }
  const local = path.join(BUNDLED, 'index.json')
  if (!fs.existsSync(local)) {
    throw new RegistryError('Bundled registry is missing - reinstall astralyx-ui.')
  }
  return JSON.parse(fs.readFileSync(local, 'utf8')) as Index
}

/** One item, with its file contents. */
export async function getItem(name: string, remote?: string): Promise<Item> {
  if (remote) {
    const base = remote.replace(/\/$/, '')
    const response = await fetch(`${base}/items/${name}.json`)
    if (!response.ok) throw new RegistryError(`Registry has no item "${name}".`)
    return (await response.json()) as Item
  }
  const local = path.join(BUNDLED, 'items', `${name}.json`)
  if (!fs.existsSync(local)) throw new RegistryError(`Registry has no item "${name}".`)
  return JSON.parse(fs.readFileSync(local, 'utf8')) as Item
}

/**
 * Every item the named ones need, transitively.
 *
 * Depth-first, so a dependency always appears before whatever imports it —
 * which is the order they have to be written to disk in.
 */
export async function resolveItems(names: string[], remote?: string): Promise<Item[]> {
  const resolved = new Map<string, Item>()

  async function visit(name: string) {
    if (resolved.has(name)) return
    const item = await getItem(name, remote)
    resolved.set(name, item)
    for (const dep of item.registryDependencies) await visit(dep)
  }

  for (const name of names) await visit(name)
  return [...resolved.values()]
}

/** npm packages the named items need, deduplicated. */
export async function resolveDependencies(names: string[], remote?: string) {
  const items = await resolveItems(names, remote)
  return [...new Set(items.flatMap((item) => item.dependencies))].sort()
}
