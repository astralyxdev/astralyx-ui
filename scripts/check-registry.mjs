/**
 * Guards the two properties the CLI depends on and cannot recover from.
 *
 * A dangling dependency means `add` writes a file whose import resolves to
 * nothing; a cycle means resolution never terminates. Both are silent in
 * generation and loud in someone else's project, so they are checked here.
 */
import fs from 'node:fs'

const index = JSON.parse(fs.readFileSync('registry/index.json', 'utf8'))
const byName = new Map(index.items.map((item) => [item.name, item]))
const problems = []

for (const item of index.items) {
  for (const dep of item.registryDependencies) {
    if (!byName.has(dep)) problems.push(`${item.name} depends on missing "${dep}"`)
  }
  for (const file of item.files ?? []) {
    if (!file.content) problems.push(`${item.name} has an empty file: ${file.path}`)
  }
}

function walk(name, stack = []) {
  if (stack.includes(name)) {
    problems.push(`cycle: ${[...stack, name].join(' -> ')}`)
    return
  }
  for (const dep of byName.get(name)?.registryDependencies ?? []) {
    walk(dep, [...stack, name])
  }
}
for (const item of index.items) walk(item.name)

// Every item carries its own files; an item with none would write nothing.
for (const name of byName.keys()) {
  const item = JSON.parse(fs.readFileSync(`registry/items/${name}.json`, 'utf8'))
  if (!item.files?.length) problems.push(`${name} has no files`)
}

if (problems.length) {
  console.error(`registry check failed (${problems.length}):`)
  for (const problem of [...new Set(problems)].slice(0, 20)) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(`registry ok — ${index.items.length} items, graph closed and acyclic`)
