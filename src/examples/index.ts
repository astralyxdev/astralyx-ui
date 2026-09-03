import { chatExample } from './chat'
import { dashboardExample } from './dashboard'
import { mailExample } from './mail'
import { repoExample } from './repo'
import { settingsExample } from './settings'
import type { ExampleEntry } from './types'

export const EXAMPLES: ExampleEntry[] = [
  dashboardExample,
  repoExample,
  mailExample,
  chatExample,
  settingsExample,
]

export function findExample(id: string) {
  return EXAMPLES.find((example) => example.id === id)
}

export function examplePath(id: string) {
  return `/examples/${id}`
}

export type { ExampleEntry }
