import generated from './props.generated.json'
import type { ApiProp } from './types'

/**
 * The API reference a component page shows: everything the file exports,
 * described by whoever wrote about it.
 *
 * Two sources, and the split is deliberate.
 *
 * `props.generated.json` is extracted from the source by `build-props.mjs`, so
 * every exported component is present with its own props, every helper with
 * its signature and every exported type with its fields. This is the
 * completeness guarantee — an audit of the hand-written tables found 1,376
 * props that existed in code and appeared in no table, and hand-maintaining
 * them would just rebuild that backlog. Types and defaults come from here and
 * only from here: a curated row cannot describe a prop as `string` once the
 * code says `ReactNode`.
 *
 * `ComponentEntry.api` is the curated half: an author's prose. A row whose name
 * is a prop, a hook, a function, a type or a field of one lends its
 * description to that generated row. A row naming an inherited DOM attribute
 * — `disabled` on Button — is shown as a prop, since documenting it was a
 * choice. A row that names none of them — `keyboard`, `accessibility`, the
 * note about why a component takes a `Date` rather than a duration — is a
 * behaviour note and gets its own table.
 *
 * A curated row may cover several props at once (`value / onValueChange`), in
 * which case every prop it mentions takes the description. A row that names a
 * component as well (`AccordionItem value`) applies to that component only,
 * and a path (`item.keywords`) applies to its last segment.
 */

export type ApiPropRow = {
  name: string
  type: string
  required?: boolean
  default?: string
  description?: string
}

export type ApiComponent = {
  name: string
  /** Type parameters as written: `<Row extends Record<string, unknown>>`. */
  generics?: string
  description?: string
  /** Bases the props extend beyond the rows listed, as written in the source. */
  extends?: string[]
  props: ApiPropRow[]
}

export type ApiSignature = {
  name: string
  signature: string
  description?: string
}

export type ApiType = {
  name: string
  generics?: string
  /** Other exported names for the same shape. */
  aliases?: string[]
  description?: string
  /** An object type's members. */
  fields?: ApiPropRow[]
  /** Anything else — a union, a function type — verbatim. */
  definition?: string
}

/** One file's reference, curated prose merged in. */
export type ApiDocs = {
  components: ApiComponent[]
  hooks: ApiSignature[]
  functions: ApiSignature[]
  types: ApiType[]
  /** Curated rows about behaviour rather than a named export. */
  notes: ApiProp[]
}

type Generated = Partial<Omit<ApiDocs, 'notes'>>

const FILES = generated.files as Record<string, Generated>
const INHERITED = new Set<string>(generated.inherited)

/** Identifier-ish words in a curated row's `name`, which may list several. */
export function namesIn(row: ApiProp) {
  return String(row.name)
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
}

/** The generated reference alone, untouched by curation. */
export function generatedApi(id: string): Generated | undefined {
  return FILES[id]
}

export function apiDocs(id: string, curated: ApiProp[] | undefined): ApiDocs {
  const source = FILES[id]
  const docs: ApiDocs = {
    components: (source?.components ?? []).map((component) => ({
      ...component,
      props: component.props.map((prop) => ({ ...prop })),
    })),
    hooks: (source?.hooks ?? []).map((hook) => ({ ...hook })),
    functions: (source?.functions ?? []).map((fn) => ({ ...fn })),
    types: (source?.types ?? []).map((type) => ({
      ...type,
      fields: type.fields?.map((field) => ({ ...field })),
    })),
    notes: [],
  }

  for (const row of curated ?? []) {
    const names = namesIn(row)
    const description = row.description || undefined

    // Every name a component: the row is about them — `CardHeader / CardFooter`.
    const named = docs.components.filter((component) => names.includes(component.name))
    if (named.length && named.length === names.length) {
      for (const component of named) component.description = description ?? component.description
      continue
    }

    // One component named among others scopes the rest to it: `AccordionItem
    // value` is the `value` of `AccordionItem`, not of `Accordion`.
    const targets = named.length ? named : docs.components
    const path = /[.[]/.test(row.name)
    const lookup = (path ? names.slice(-1) : names).filter(
      (name) => !named.some((component) => component.name === name),
    )
    let matched = false

    for (const name of lookup) {
      let found = false

      for (const component of targets) {
        const prop = component.props.find((candidate) => candidate.name === name)
        if (!prop) continue
        found = true
        if (description) prop.description = description
        if (row.default && !prop.default) prop.default = row.default
      }

      for (const list of [docs.hooks, docs.functions, docs.types]) {
        const item = list.find((candidate) => candidate.name === name)
        if (!item) continue
        found = true
        if (description) item.description = description
      }

      // A field of a data shape — `Deploy.status`, `Column.sortValue` — only
      // when no prop took the name, so a prop and a field called `status` do
      // not both claim one sentence.
      if (!found) {
        for (const type of docs.types) {
          const field = type.fields?.find((candidate) => candidate.name === name)
          if (!field) continue
          found = true
          if (description) field.description = description
        }
      }

      // A DOM attribute the author chose to document, on the component the
      // row scopes to or the file's first.
      if (!found && INHERITED.has(name) && targets.length) {
        found = true
        targets[0].props.push({
          name,
          type: row.type,
          default: row.default,
          description,
        })
      }

      matched ||= found
    }

    if (!matched) docs.notes.push(row)
  }

  return docs
}

/** Whether a component has anything to show. Used to decide on the section. */
export function hasApi(id: string, curated: ApiProp[] | undefined) {
  return (curated?.length ?? 0) > 0 || FILES[id] !== undefined
}
