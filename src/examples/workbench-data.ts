import type { Commit } from '@/components/ui/commit-list'
import type { CoverageFile } from '@/components/ui/coverage-report'
import type { FileNode } from '@/components/ui/file-tree'
import type { ReviewComment } from '@/components/ui/review-thread'
import type { TestSuite } from '@/components/ui/test-results'

/**
 * Workbench — the fixtures for reviewing one pull request.
 *
 * Everything here belongs to PR #4182, the change that broke checkout in the
 * Circuit example. Reading both, the same incident is a graph in one product
 * and a diff in the other, which is the only reason two examples share a
 * number.
 */

export const NOW = new Date('2026-09-08T09:00:00Z')

const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

export const PR = {
  number: 4182,
  title: 'Batch the address lookup',
  author: 'Alan Turing',
  branch: 'perf/batch-address-lookup',
  baseBranch: 'main',
  comments: 4,
  reviewers: ['Ada Lovelace', 'Grace Hopper'],
}

/* -------------------------------------------------------------------- files */

export type OpenFile = {
  /** Path, and the tab's identity. */
  path: string
  /** Just the filename, for the tab strip. */
  name: string
  language: 'tsx' | 'typescript' | 'json' | 'sql'
  patch: string
}

/**
 * Counted from the patch, never written down.
 *
 * The first version carried `additions` and `deletions` as fixture fields and
 * they disagreed with the diff underneath them within an hour of being typed —
 * the tree said +24 while `DiffView`, which counts, said +15. One of them had
 * to be derived, and it was never going to be the one the reader can see.
 */
export function countPatch(patch: string) {
  const lines = patch.split('\n')
  return {
    additions: lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length,
    deletions: lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).length,
  }
}

export const statOf = (file: OpenFile) => countPatch(file.patch)

export const FILES: OpenFile[] = [
  {
    path: 'src/address/lookup.ts',
    name: 'lookup.ts',
    language: 'typescript',
    patch: `@@ -14,10 +14,22 @@ export async function lookup(ids: string[]) {
-  const results = []
-  for (const id of ids) {
-    results.push(await fetchOne(id))
-  }
-  return results
+  // One request per checkout was the whole cost. The service takes a list.
+  const batches = chunk(ids, BATCH_SIZE)
+  const results: Address[] = []
+
+  for (const batch of batches) {
+    const response = await fetch(ENDPOINT, {
+      method: 'POST',
+      body: JSON.stringify({ ids: batch }),
+    })
+
+    if (!response.ok) throw new LookupError(response.status)
+    results.push(...(await response.json()))
+  }
+
+  return results
 }
`,
  },
  {
    path: 'src/address/config.ts',
    name: 'config.ts',
    language: 'typescript',
    patch: `@@ -1,6 +1,12 @@
-export const BATCH_SIZE = 1
+/**
+ * The address service documents a limit of 50 and returns 429 above it.
+ */
+export const BATCH_SIZE = 200
+
+export const ENDPOINT = process.env.ADDRESS_URL ?? 'https://address.internal/v2/lookup'
+
+export const TIMEOUT_MS = 30_000
`,
  },
  {
    path: 'src/checkout/order.ts',
    name: 'order.ts',
    language: 'typescript',
    patch: `@@ -88,10 +88,12 @@ export async function priceOrder(order: Order) {
-  const addresses = await Promise.all(
-    order.lines.map((line) => lookup([line.addressId])),
-  )
+  const addresses = await lookup(order.lines.map((line) => line.addressId))
 
   return {
     ...order,
     addresses,
   }
 }
`,
  },
]

/** `+n −n` for one file, from the patch it is a view of. */
function metaFor(name: string) {
  const file = FILES.find((entry) => entry.name === name)
  if (!file) return undefined
  const { additions, deletions } = countPatch(file.patch)
  return `+${additions} −${deletions}`
}

export const TREE: FileNode[] = [
  {
    name: 'src',
    defaultOpen: true,
    children: [
      {
        name: 'address',
        defaultOpen: true,
        children: [
          { name: 'lookup.ts', meta: metaFor('lookup.ts'), badge: 'M' },
          { name: 'config.ts', meta: metaFor('config.ts'), badge: 'M' },
        ],
      },
      {
        name: 'checkout',
        defaultOpen: true,
        children: [{ name: 'order.ts', meta: metaFor('order.ts'), badge: 'M' }],
      },
    ],
  },
]

/** The request's totals are the files' totals. */
export const TOTALS = FILES.reduce(
  (sum, file) => {
    const { additions, deletions } = countPatch(file.patch)
    return { additions: sum.additions + additions, deletions: sum.deletions + deletions }
  },
  { additions: 0, deletions: 0 },
)

/** Tree path to the file it opens. The tree speaks in names, tabs in paths. */
export const PATH_BY_NODE: Record<string, string> = {
  'src/address/lookup.ts': 'src/address/lookup.ts',
  'src/address/config.ts': 'src/address/config.ts',
  'src/checkout/order.ts': 'src/checkout/order.ts',
}

/* ------------------------------------------------------------------- checks */

export const SUITES: TestSuite[] = [
  {
    id: 'unit',
    name: 'Unit · address',
    tests: [
      { id: 'u1', name: 'chunks a list into batches', status: 'passed', duration: 0.004 },
      { id: 'u2', name: 'throws on a non-2xx response', status: 'passed', duration: 0.003 },
      { id: 'u3', name: 'stops at the documented batch limit', status: 'failed', duration: 0.006, error: 'Expected 50, received 200' },
    ],
  },
  {
    id: 'integration',
    name: 'Integration · checkout',
    tests: [
      { id: 'i1', name: 'prices an order with three lines', status: 'passed', duration: 1.2 },
      { id: 'i2', name: 'retries a rate-limited lookup', status: 'skipped' },
    ],
  },
]

export const COVERAGE: CoverageFile[] = [
  { path: 'src/address/lookup.ts', statements: 0.94, branches: 0.71, functions: 1, lines: 0.94, uncovered: [31, 32, 33] },
  { path: 'src/address/config.ts', statements: 1, branches: 1, functions: 1, lines: 1 },
  { path: 'src/checkout/order.ts', statements: 0.88, branches: 0.62, functions: 0.9, lines: 0.88, uncovered: [92, 93] },
]

/* --------------------------------------------------------------- discussion */

export const THREADS: {
  id: string
  path: string
  line: number
  snippet: string
  resolved: boolean
  comments: ReviewComment[]
}[] = [
  {
    id: 't1',
    path: 'src/address/config.ts',
    line: 4,
    snippet: 'export const BATCH_SIZE = 200',
    resolved: false,
    comments: [
      { id: 'c1', author: 'Ada Lovelace', time: '18m ago', body: 'The service documents a limit of 50 and returns 429 above it. 200 will shed load under any real traffic.' },
      { id: 'c2', author: 'Alan Turing', time: '12m ago', body: 'It passed staging at 200 — but staging has one tenth the orders. Dropping it to 50.' },
    ],
  },
  {
    id: 't2',
    path: 'src/address/lookup.ts',
    line: 22,
    snippet: 'if (!response.ok) throw new LookupError(response.status)',
    resolved: true,
    comments: [
      { id: 'c3', author: 'Grace Hopper', time: '1h ago', body: 'A 429 here ends the whole checkout. Worth a retry with backoff before it throws.' },
      { id: 'c4', author: 'Alan Turing', time: '52m ago', body: 'Added in the follow-up — the retry policy is a step in the flow rather than a loop in here.' },
    ],
  },
]

/* ------------------------------------------------------------------ history */

export const COMMITS: Commit[] = [
  { sha: 'a3f19c2', message: 'Batch the address lookup', author: 'Alan Turing', date: ago(120), status: 'failed', verified: true, additions: 38, deletions: 12 },
  { sha: '7b21e04', message: 'Pull the endpoint out of the module', author: 'Alan Turing', date: ago(190), status: 'passed', verified: true, additions: 9, deletions: 3 },
  { sha: '1c8d5aa', message: 'Test the chunker on an empty list', author: 'Ada Lovelace', date: ago(260), status: 'passed', additions: 21, deletions: 0 },
]
