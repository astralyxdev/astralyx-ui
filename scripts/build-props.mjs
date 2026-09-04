/**
 * Extracts every component file's public API from source.
 *
 * The API tables were hand-written, and hand-written lists of props drift: an
 * audit found 1,376 props that existed in code and appeared in no table, which
 * is the same failure the registry's dependency graph avoids by being derived
 * rather than listed. So this derives them.
 *
 * Per file it records four things, each shown as its own table:
 *
 * - `components` — every exported component with *its own* props, defaults
 *   and JSDoc. A compound file (`Dialog`, `DialogContent`, `DialogFooter`…)
 *   used to collapse into one list where `size` could belong to anything.
 * - `hooks` and `functions` — exported helpers with their signatures.
 * - `types` — exported type aliases and interfaces, verbatim, so the shape of
 *   a `GanttTask` or a `SelectOption` sits next to the prop that takes it.
 *
 * Props are read through the type checker rather than syntactically, because
 * a surface like `VariantProps<typeof buttonVariants>` or a union alias only
 * exists after resolution. What the checker would also return — several
 * hundred inherited DOM attributes — is dropped: a prop declared inside
 * `node_modules` is not the component's own surface, and the base it came
 * from is recorded as `extends` instead.
 *
 * Curated prose still wins: `ComponentEntry.api` rows are merged over these
 * at render time. What this guarantees is that a prop can never be *absent*.
 */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const DIR = path.join(ROOT, 'src/components/ui')
const OUT = path.join(ROOT, 'src/registry/props.generated.json')

/* ----------------------------------------------------------------- program */

const config = ts.getParsedCommandLineOfConfigFile(
  path.join(ROOT, 'tsconfig.app.json'),
  {},
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    },
  },
)

const files = fs
  .readdirSync(DIR)
  .filter((file) => file.endsWith('.tsx'))
  .sort()
  .map((file) => path.join(DIR, file))

const program = ts.createProgram({
  rootNames: files,
  options: { ...config.options, noEmit: true, incremental: false, tsBuildInfoFile: undefined },
})
const checker = program.getTypeChecker()

/**
 * Names of inherited DOM attributes seen on any component. A curated row about
 * one of them — `disabled` on Button, `htmlFor` on Label — is deliberate and
 * is shown as a prop; a row naming something in neither list is stale.
 */
const inherited = new Set()

const TYPE_FLAGS =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType

/* ----------------------------------------------------------------- helpers */

const collapse = (text) => text.replace(/\s+/g, ' ').trim()

/** Optional-ness is shown by the table, not repeated in every type. */
const tidy = (text) =>
  collapse(text)
    .replace(/ \| null \| undefined\b/g, '')
    .replace(/ \| undefined\b/g, '')

/** The first paragraph of a JSDoc block: the summary, without the essay. */
function summary(text) {
  if (!text) return undefined
  const paragraph = text.trim().split(/\n\s*\n/)[0]
  return collapse(paragraph) || undefined
}

function docOfNode(node) {
  const docs = node.jsDoc
  if (!docs?.length) return undefined
  const last = docs[docs.length - 1]
  // A blank line between the comment and the declaration makes it a file
  // header that happens to sit above the first statement, not its doc.
  const gap = node.getSourceFile().text.slice(last.end, node.getStart())
  if (/\n\s*\n/.test(gap)) return undefined
  const comment =
    typeof last.comment === 'string' ? last.comment : ts.getTextOfJSDocComment(last.comment)
  return comment || undefined
}

function docOfSymbol(symbol) {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)) || undefined
}

/** Source text with the common indentation of its continuation lines removed. */
function dedent(text) {
  const lines = text.split('\n')
  if (lines.length === 1) return text
  const rest = lines.slice(1).filter((line) => line.trim())
  const indent = Math.min(...rest.map((line) => line.match(/^\s*/)[0].length))
  return [lines[0], ...lines.slice(1).map((line) => line.slice(indent))].join('\n')
}

function inNodeModules(node) {
  return /node_modules/.test(node.getSourceFile().fileName)
}

/** `{ foo = 3 }` in a destructuring pattern, as source text. */
function readDefaults(pattern, defaults) {
  for (const element of pattern.elements) {
    if (!element.initializer) continue
    const name = (element.propertyName ?? element.name).getText()
    if (ts.isIdentifier(element.propertyName ?? element.name) && !defaults.has(name)) {
      defaults.set(name, collapse(element.initializer.getText()))
    }
  }
}

/**
 * Defaults from the parameter itself and from `const { x = 1 } = props`
 * inside the body — `Calendar` takes `props` whole and destructures later.
 */
function defaultsOf(fn) {
  const defaults = new Map()
  const parameter = fn.parameters?.[0]
  if (!parameter) return defaults

  if (ts.isObjectBindingPattern(parameter.name)) readDefaults(parameter.name, defaults)

  if (ts.isIdentifier(parameter.name) && fn.body) {
    const name = parameter.name.text
    const visit = (node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isObjectBindingPattern(node.name) &&
        node.initializer &&
        ts.isIdentifier(node.initializer) &&
        node.initializer.text === name
      ) {
        readDefaults(node.name, defaults)
      }
      ts.forEachChild(node, visit)
    }
    visit(fn.body)
  }
  return defaults
}

/**
 * The bases a props annotation extends, as written: `ComponentProps<'div'>`,
 * `Omit<ComponentProps<typeof Combobox>, 'options'>`. Local aliases are
 * followed and literals skipped, since their members appear as rows.
 * `VariantProps` is skipped too — its keys resolve into rows as well.
 */
function basesOf(typeNode, locals, seen = new Set()) {
  if (!typeNode) return []
  if (ts.isParenthesizedTypeNode(typeNode)) return basesOf(typeNode.type, locals, seen)
  if (ts.isIntersectionTypeNode(typeNode) || ts.isUnionTypeNode(typeNode)) {
    return typeNode.types.flatMap((member) => basesOf(member, locals, seen))
  }
  if (ts.isTypeLiteralNode(typeNode)) return []
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    const name = typeNode.typeName.text
    const local = locals.get(name)
    if (local && !typeNode.typeArguments) {
      if (seen.has(name)) return []
      seen.add(name)
      return basesOf(local, locals, seen)
    }
    if (name === 'VariantProps') return []
  }
  return [collapse(typeNode.getText())]
}

const isFunctionLike = (node) =>
  ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)

/** The function behind an exported name: a declaration or a const's initializer. */
function functionOf(declaration) {
  if (ts.isFunctionDeclaration(declaration)) return declaration
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    const init = declaration.initializer
    if (isFunctionLike(init)) return init
  }
  return undefined
}

function typeParametersOf(node) {
  const params = node.typeParameters
  if (!params?.length) return undefined
  return `<${params.map((param) => param.getText()).join(', ')}>`
}

/* -------------------------------------------------------------- extraction */

/**
 * One property of a shape, as text. The author's own words where a signature
 * exists in the kit; otherwise what the checker resolved (a `VariantProps`
 * key, a mapped type).
 */
function memberOf(symbol, location) {
  const declarations = symbol.getDeclarations() ?? []
  const signature = declarations.find(
    (declaration) => ts.isPropertySignature(declaration) && declaration.type,
  )
  const resolved = checker.getTypeOfSymbolAtLocation(symbol, location)
  const optional = Boolean(symbol.flags & ts.SymbolFlags.Optional)
  const type = signature
    ? tidy(signature.type.getText())
    : tidy(
        checker.typeToString(
          optional ? checker.getNonNullableType(resolved) : resolved,
          undefined,
          TYPE_FLAGS,
        ),
      )
  return { type, optional }
}

/**
 * The fields of an exported object type — a `SelectOption`, a `GanttTask` —
 * so a data shape reads as a table like a component's props do. A union, a
 * function type or a primitive alias has no fields and keeps its definition.
 */
function fieldsOf(declaration) {
  const type = checker.getTypeAtLocation(declaration.name)
  if (type.isUnion() || !(type.flags & ts.TypeFlags.Object)) return undefined
  if (type.getCallSignatures().length || checker.isArrayType(type)) return undefined

  const fields = []
  for (const symbol of checker.getPropertiesOfType(type)) {
    const declarations = symbol.getDeclarations() ?? []
    if (declarations.length && declarations.every(inNodeModules)) continue
    const { type: typeText, optional } = memberOf(symbol, declaration)
    fields.push({
      name: symbol.getName(),
      type: typeText,
      required: optional ? undefined : true,
      description: summary(docOfSymbol(symbol)),
    })
  }
  return fields.length ? fields : undefined
}

function propsOf(fn, source, locals) {
  const parameter = fn.parameters[0]
  if (!parameter) return { props: [], extends: [] }

  const type = parameter.type
    ? checker.getTypeFromTypeNode(parameter.type)
    : checker.getTypeAtLocation(parameter)
  const defaults = defaultsOf(fn)
  const rows = new Map()

  // A union of shapes — `CalendarSingleProps | CalendarRangeProps` — has the
  // members of every arm, not only the common ones.
  const shapes = type.isUnion() ? type.types : [type]
  for (const shape of shapes) {
    for (const symbol of checker.getPropertiesOfType(shape)) {
      const name = symbol.getName()
      const declarations = symbol.getDeclarations() ?? []
      if (declarations.length && declarations.every(inNodeModules)) {
        inherited.add(name)
        continue
      }

      const { type: typeText, optional } = memberOf(symbol, parameter)

      // The same prop in another arm of the union widens the row: `selected`
      // is a `Date` in single mode and a `DateRange` in range mode. `never`
      // is how an arm forbids a prop, which is not a type worth printing.
      const existing = rows.get(name)
      if (existing) {
        if (typeText !== 'never' && !existing.type.split(' | ').includes(typeText)) {
          existing.type = existing.type === 'never' ? typeText : `${existing.type} | ${typeText}`
        }
        existing.required = existing.required && !optional ? true : undefined
        existing.description ??= summary(docOfSymbol(symbol))
        continue
      }

      rows.set(name, {
        name,
        type: typeText,
        required: optional ? undefined : true,
        default: defaults.get(name),
        description: summary(docOfSymbol(symbol)),
      })
    }
  }

  return {
    props: [...rows.values()],
    extends: [...new Set(basesOf(parameter.type, locals))],
  }
}

function signatureOf(declaration) {
  const fn = functionOf(declaration)
  if (fn) {
    const params = fn.parameters.map((param) => collapse(param.getText())).join(', ')
    const signature = checker.getSignatureFromDeclaration(fn)
    const returns = fn.type
      ? collapse(fn.type.getText())
      : signature
        ? checker.typeToString(signature.getReturnType(), undefined, TYPE_FLAGS)
        : 'unknown'
    return `${typeParametersOf(fn) ?? ''}(${params}) => ${tidy(returns)}`
  }
  const type = checker.getTypeAtLocation(declaration.name ?? declaration)
  return variantsSignature(declaration, type) ?? tidy(checker.typeToString(type, undefined, TYPE_FLAGS))
}

/**
 * `cva()` results print with every class string inlined. Only the keys and
 * their values are the API: `(props?: { variant?: 'default' | 'ghost' }) => string`.
 */
function variantsSignature(declaration, type) {
  const init = ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined
  if (!init || !ts.isCallExpression(init) || init.expression.getText() !== 'cva') return undefined

  const call = type.getCallSignatures()[0]
  const parameter = call?.parameters[0]
  if (!parameter) return undefined
  const shape = checker.getNonNullableType(checker.getTypeOfSymbol(parameter))
  const keys = checker
    .getPropertiesOfType(shape)
    .filter((symbol) => symbol.getName() !== 'class' && symbol.getName() !== 'className')
    .map((symbol) => {
      const value = checker.getNonNullableType(checker.getTypeOfSymbol(symbol))
      return `${symbol.getName()}?: ${checker.typeToString(value, undefined, TYPE_FLAGS)}`
    })
  return `(props?: { ${keys.join('; ')} }) => string`
}

function definitionOf(declaration) {
  if (ts.isTypeAliasDeclaration(declaration)) return dedent(declaration.type.getText())
  if (ts.isInterfaceDeclaration(declaration)) {
    // Everything after the name: an `extends` clause, then the body.
    const text = declaration.getText()
    const start = declaration.name.end - declaration.getStart()
    const tail = declaration.typeParameters
      ? text.slice(text.indexOf('>', start) + 1)
      : text.slice(start)
    return dedent(tail.trim())
  }
  return undefined
}

function apiOf(file) {
  const source = program.getSourceFile(file)
  const moduleSymbol = checker.getSymbolAtLocation(source)
  if (!moduleSymbol) return undefined

  // Local aliases, so a `FooProps` reference in an annotation can be followed
  // to the shape it names.
  const locals = new Map()
  for (const statement of source.statements) {
    if (ts.isTypeAliasDeclaration(statement)) locals.set(statement.name.text, statement.type)
  }

  const entries = []
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
    const declaration = symbol.valueDeclaration ?? symbol.getDeclarations()?.[0]
    if (!declaration) continue
    entries.push({ name: exported.getName(), symbol, declaration })
  }

  // Declaration order is composition order — `Dialog`, then `DialogTrigger`,
  // then `DialogContent` — where the export list is usually alphabetical.
  entries.sort((a, b) => {
    const fileA = a.declaration.getSourceFile().fileName === file ? 0 : 1
    const fileB = b.declaration.getSourceFile().fileName === file ? 0 : 1
    return fileA - fileB || a.declaration.getStart() - b.declaration.getStart()
  })

  // A file often opens with a JSDoc about the component above whatever is
  // declared first — usually an option type. That block describes the
  // component, and lands on it when the component has none of its own.
  const first = source.statements.find(
    (statement) => !ts.isImportDeclaration(statement) && !ts.isFunctionDeclaration(statement),
  )
  const header = first && first === source.statements.find((s) => !ts.isImportDeclaration(s))
    ? { node: first, text: summary(docOfNode(first)) }
    : undefined

  const components = []
  const hooks = []
  const functions = []
  const types = []

  for (const { name, declaration } of entries) {
    const fn = functionOf(declaration)
    if (fn && /^[A-Z]/.test(name)) {
      const { props, extends: bases } = propsOf(fn, source, locals)
      components.push({
        name,
        generics: typeParametersOf(fn),
        description: summary(docOfNode(declaration)),
        extends: bases.length ? bases : undefined,
        props,
      })
      continue
    }
    if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
      // `export type { Column as DataGridColumn }` beside `Column` is one
      // shape under two names; the second is an alias, not a second type.
      const twin = types.find((type) => type.declaration === declaration)
      if (twin) {
        twin.aliases = [...(twin.aliases ?? []), name]
        continue
      }
      const fields = fieldsOf(declaration)
      types.push({
        declaration,
        name,
        generics: typeParametersOf(declaration),
        description: declaration === header?.node ? undefined : summary(docOfNode(declaration)),
        fields,
        definition: fields ? undefined : definitionOf(declaration),
      })
      continue
    }
    const row = {
      name,
      signature: signatureOf(declaration),
      description: summary(docOfNode(fn ?? declaration) ?? docOfNode(declaration.parent?.parent ?? declaration)),
    }
    ;(/^use[A-Z]/.test(name) ? hooks : functions).push(row)
  }

  if (header?.text && components.length && !components[0].description) {
    components[0].description = header.text
  }

  // A component's props alias is its table; listing it again says nothing.
  const documented = new Set(components.map((component) => `${component.name}Props`))
  const ownTypes = types
    .filter((type) => !documented.has(type.name))
    .map(({ declaration: _declaration, ...type }) => type)

  const api = {}
  if (components.length) api.components = components
  if (hooks.length) api.hooks = hooks
  if (functions.length) api.functions = functions
  if (ownTypes.length) api.types = ownTypes
  return Object.keys(api).length ? api : undefined
}

/* ------------------------------------------------------------------ output */

const out = {}
for (const file of files) {
  const id = path.basename(file, '.tsx')
  const api = apiOf(file)
  if (api) out[id] = api
}

fs.writeFileSync(
  OUT,
  `${JSON.stringify({ inherited: [...inherited].sort(), files: out }, null, 2)}\n`,
)

const all = Object.values(out)
const components = all.flatMap((api) => api.components ?? [])
const props = components.flatMap((component) => component.props)
const documented = props.filter((prop) => prop.description).length
const helpers = all.reduce(
  (sum, api) => sum + (api.hooks?.length ?? 0) + (api.functions?.length ?? 0),
  0,
)
const types = all.reduce((sum, api) => sum + (api.types?.length ?? 0), 0)
console.log(
  `props ok — ${components.length} components across ${Object.keys(out).length} files, ${props.length} props (${documented} with JSDoc), ${helpers} helpers, ${types} types`,
)
