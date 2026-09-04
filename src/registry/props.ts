import generated from './props.generated.json'
import type { ApiProp } from './types'

/**
 * The props table a component page shows: everything it declares, described by
 * whoever wrote about it.
 *
 * Two sources, and the split is deliberate.
 *
 * `props.generated.json` is extracted from the source by `build-props.mjs`, so
 * every declared prop is present with its real type and default. This is the
 * completeness guarantee — an audit of the hand-written tables found 1,376
 * props that existed in code and appeared in no table, and hand-maintaining
 * them would just rebuild that backlog.
 *
 * `ComponentEntry.api` is the curated half: an author's prose, a deliberate
 * ordering, and conceptual rows that are not props at all — `keyboard`,
 * `accessibility`, the note about why a component takes a `Date` rather than a
 * duration. Those are the rows worth reading, so they come first and they win
 * any conflict.
 *
 * A curated row may cover several props at once (`value / onValueChange`), in
 * which case every name it mentions is considered documented and none of them
 * is repeated below.
 */
type GeneratedProp = {
  name: string
  type: string
  optional: boolean
  default?: string
  description?: string
}

const PROPS = generated as Record<string, GeneratedProp[]>

/** Identifier-ish words in a curated row's `name`, which may list several. */
function namesIn(row: ApiProp) {
  return String(row.name)
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
}

export function apiRows(id: string, curated: ApiProp[] | undefined): ApiProp[] {
  const declared = PROPS[id] ?? []
  const rows: ApiProp[] = []

  // Curated first, in the order the author chose.
  const covered = new Set<string>()
  for (const row of curated ?? []) {
    const names = namesIn(row)
    for (const name of names) covered.add(name)

    // Fill in a type or default the author left out but the source knows.
    const match = declared.find((prop) => prop.name === row.name)
    rows.push({
      ...row,
      type: row.type || match?.type || '',
      default: row.default ?? match?.default,
    })
  }

  // Then everything declared that no curated row mentioned.
  for (const prop of declared) {
    if (covered.has(prop.name)) continue
    rows.push({
      name: prop.name,
      type: prop.type,
      default: prop.default,
      description: prop.description ?? '',
    })
  }

  return rows
}

/** Whether a component has anything to show. Used to decide on the section. */
export function hasApi(id: string, curated: ApiProp[] | undefined) {
  return (curated?.length ?? 0) > 0 || (PROPS[id]?.length ?? 0) > 0
}
