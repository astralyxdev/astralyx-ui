/**
 * Extracts every component's declared props from source.
 *
 * The API tables were hand-written, and hand-written lists of props drift: an
 * audit found 1,376 props that existed in code and appeared in no table, which
 * is the same failure the registry's dependency graph avoids by being derived
 * rather than listed. So this derives them.
 *
 * Read syntactically — the members the author wrote — rather than through the
 * type checker, which would also return several hundred inherited DOM
 * attributes and bury the component's own surface.
 *
 * Curated prose still wins: `ComponentEntry.api` rows are merged over these at
 * render time. What this guarantees is that a prop can never be *absent*.
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const DIR = path.join(process.cwd(), 'src/components/ui')
const OUT = path.join(process.cwd(), 'src/registry/props.generated.json')

/** `foo = 3` in the destructuring pattern, as source text. */
function defaultsFrom(node, source) {
  const defaults = new Map()
  const parameter = node.parameters?.[0]
  if (!parameter || !ts.isObjectBindingPattern(parameter.name)) return defaults

  for (const element of parameter.name.elements) {
    if (!element.initializer) continue
    const name = (element.propertyName ?? element.name).getText(source)
    defaults.set(name, element.initializer.getText(source).replace(/\s+/g, ' '))
  }
  return defaults
}

/** The JSDoc immediately above a property signature, as one line. */
function docOf(member, source) {
  const ranges = ts.getLeadingCommentRanges(source.text, member.pos) ?? []
  const block = ranges
    .map((range) => source.text.slice(range.pos, range.end))
    .filter((text) => text.startsWith('/**'))
    .pop()
  if (!block) return undefined

  return block
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*ceci?/, '').replace(/^\s*\*ceci/, '').replace(/^\s*\*\s?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || undefined
}

function propsFor(file) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  // Only the components this file actually exports. A file often defines
  // internal helpers — `Ring` inside lighthouse-score, a `Row` inside a table —
  // and their parameters are not the component's public surface. Collecting
  // them merged phantom props into the table.
  const exported = new Set()
  const findExports = (node) => {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        exported.add((element.propertyName ?? element.name).text)
      }
    }
    if (
      ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      ts.isFunctionDeclaration(node) &&
      node.name
    ) {
      exported.add(node.name.text)
    }
    ts.forEachChild(node, findExports)
  }
  findExports(source)

  // Type aliases declared in this file, so `type FooProps = BarProps | BazProps`
  // can be followed. Calendar is exactly that shape, and without this its whole
  // surface — mode, selected, onSelect — resolved to nothing.
  const locals = new Map()
  const findLocals = (node) => {
    if (ts.isTypeAliasDeclaration(node)) locals.set(node.name.text, node.type)
    ts.forEachChild(node, findLocals)
  }
  findLocals(source)

  const rows = new Map()
  let defaults = new Map()

  // The exported component's destructuring carries the defaults. Take the
  // first function whose name is capitalised — the component itself.
  const findDefaults = (node) => {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      exported.has(node.name.text) &&
      /^[A-Z]/.test(node.name.text) &&
      defaults.size === 0
    ) {
      defaults = defaultsFrom(node, source)
    }
    ts.forEachChild(node, findDefaults)
  }
  findDefaults(source)

  /**
   * Walks only the *shape* of the props type — intersections, unions and
   * parentheses — and stops at each property.
   *
   * A blanket `forEachChild` would descend into a property's own type as well,
   * so `onSubmit?: (c: { email: string }) => void` would contribute a phantom
   * `email` prop. Only the top level of the props object is the component's
   * surface.
   */
  const seen = new Set()
  const collect = (node) => {
    if (ts.isParenthesizedTypeNode(node)) return collect(node.type)

    // Follow a reference to another alias in this file, once.
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const target = locals.get(node.typeName.text)
      if (target && !seen.has(node.typeName.text)) {
        seen.add(node.typeName.text)
        collect(target)
      }
      return
    }

    if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
      for (const member of node.types) collect(member)
      return
    }

    if (!ts.isTypeLiteralNode(node)) return

    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue
      const name = member.name.getText(source).replace(/['"]/g, '')
      if (rows.has(name)) continue
      rows.set(name, {
        name,
        type: member.type ? member.type.getText(source).replace(/\s+/g, ' ') : 'unknown',
        optional: Boolean(member.questionToken),
        default: defaults.get(name),
        description: docOf(member, source),
      })
    }
  }

  const visit = (node) => {
    // `FooProps` counts when `Foo` is exported — the props type is often
    // exported alongside it, and sometimes only the component is.
    if (ts.isTypeAliasDeclaration(node) && /Props$/.test(node.name.text)) {
      const component = node.name.text.replace(/Props$/, '')
      if (exported.has(component) || exported.has(node.name.text)) collect(node.type)
    }
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      exported.has(node.name.text) &&
      node.parameters.length
    ) {
      const annotation = node.parameters[0].type
      if (annotation) collect(annotation)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  return [...rows.values()]
}

const out = {}
for (const file of fs.readdirSync(DIR).sort()) {
  if (!file.endsWith('.tsx')) continue
  const id = file.replace(/\.tsx$/, '')
  const props = propsFor(path.join(DIR, file))
  if (props.length) out[id] = props
}

fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`)

const total = Object.values(out).reduce((sum, props) => sum + props.length, 0)
const documented = Object.values(out)
  .flat()
  .filter((prop) => prop.description).length
console.log(`props ok — ${total} props across ${Object.keys(out).length} components, ${documented} with JSDoc`)
