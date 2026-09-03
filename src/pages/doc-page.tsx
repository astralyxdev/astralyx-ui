import type { DocEntry } from '@/docs'

/** A documentation page. The entry supplies its own body. */
function DocPage({ doc }: { doc: DocEntry }) {
  return doc.render()
}

export { DocPage }
