import { circuitExample } from './circuit'
import { consoleExample } from './console'
import { opsExample } from './ops'
import { shopExample } from './shop'
import { studioExample } from './studio'
import type { ExampleEntry } from './types'

/**
 * Whole products, in the order the rail lists them.
 *
 * Five rather than twenty. An example earns its place by being deep enough to
 * answer the question people actually arrive with — what does this look like
 * once there are sub-pages, a detail view, a form that validates and a dialog
 * that commits — and twenty shallow screens never answered it.
 */
export const EXAMPLES: ExampleEntry[] = [
  consoleExample,
  studioExample,
  circuitExample,
  opsExample,
  shopExample,
]

export function examplePath(id: string) {
  return `/examples/${id}`
}

export function findExample(id: string) {
  return EXAMPLES.find((example) => example.id === id)
}

export type { ExampleEntry }
