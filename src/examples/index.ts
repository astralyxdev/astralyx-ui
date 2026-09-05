import { agentStudioExample } from './agent-studio'
import { aiOpsExample } from './ai-ops'
import { apiWorkbenchExample } from './api-workbench'
import { chatExample } from './chat'
import { ciPipelineExample } from './ci-pipeline'
import { cryptoDeskExample } from './crypto-desk'
import { dashboardExample } from './dashboard'
import { databaseStudioExample } from './database-studio'
import { growthExample } from './growth'
import { incidentRoomExample } from './incident-room'
import { mailExample } from './mail'
import { mcpConsoleExample } from './mcp-console'
import { plannerExample } from './planner'
import { repoExample } from './repo'
import { settingsExample } from './settings'
import { storefrontExample } from './storefront'
import { supportDeskExample } from './support-desk'
import type { ExampleEntry } from './types'

/**
 * Whole products, in the order the rail lists them.
 *
 * Grouped by the kind of work each one is about rather than alphabetically: the
 * general shells first, then the agent and model surfaces, then operations,
 * data, and the commercial ones. Nobody arrives looking for the example whose
 * name begins with A.
 */
export const EXAMPLES: ExampleEntry[] = [
  dashboardExample,
  repoExample,
  mailExample,
  chatExample,
  settingsExample,

  agentStudioExample,
  aiOpsExample,
  mcpConsoleExample,

  incidentRoomExample,
  ciPipelineExample,
  databaseStudioExample,
  apiWorkbenchExample,

  growthExample,
  plannerExample,
  supportDeskExample,

  cryptoDeskExample,
  storefrontExample,
]

export function findExample(id: string) {
  return EXAMPLES.find((example) => example.id === id)
}

export function examplePath(id: string) {
  return `/examples/${id}`
}

export type { ExampleEntry }
