/**
 * Print the public API of one or more components, for writing an example
 * against without opening every source file.
 *
 * Reads the same generated reference the docs render, so it cannot describe a
 * prop the code does not have.
 *
 *   node scripts/component-api.mjs gantt kanban scheduler
 */
import fs from 'node:fs'

const { files } = JSON.parse(fs.readFileSync('src/registry/props.generated.json', 'utf8'))
const ids = process.argv.slice(2)
if (!ids.length) {
  console.error('usage: node scripts/component-api.mjs <component-id> [...]')
  process.exit(1)
}

for (const id of ids) {
  const api = files[id]
  console.log(`\n${'='.repeat(70)}\n${id}   (import from '@/components/ui/${id}')`)
  if (!api) {
    console.log('  no such component')
    continue
  }
  for (const component of api.components ?? []) {
    console.log(`\n  <${component.name}${component.generics ?? ''}>`)
    if (component.extends?.length) console.log(`    extends ${component.extends.join(', ')}`)
    for (const prop of component.props) {
      const req = prop.required ? ' (required)' : ''
      const def = prop.default ? ` = ${prop.default}` : ''
      console.log(`    ${prop.name}: ${prop.type}${def}${req}`)
    }
  }
  for (const kind of ['hooks', 'functions']) {
    for (const row of api[kind] ?? []) console.log(`\n  ${row.name}${row.signature}`)
  }
  for (const type of api.types ?? []) {
    console.log(`\n  type ${type.name}${type.generics ?? ''}`)
    if (type.fields) {
      for (const f of type.fields) console.log(`    ${f.name}${f.required ? '' : '?'}: ${f.type}`)
    } else {
      console.log(`    = ${type.definition?.replace(/\n\s*/g, ' ')}`)
    }
  }
}
console.log()
