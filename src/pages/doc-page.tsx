import type { DocEntry } from '@/docs'
import { useSeo } from '@/lib/seo'

/** A documentation page. The entry supplies its own body. */
function DocPage({ doc }: { doc: DocEntry }) {
  useSeo({
    title: doc.label,
    description: doc.description,
    path: `/docs/${doc.id}`,
  })

  return doc.render()
}

export { DocPage }
