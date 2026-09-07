import { redirect } from 'next/navigation'
import docs from '@/registry/docs.generated.json'

/**
 * Nothing is published at /docs and nothing links to it, but it is the obvious
 * thing to type after reading /docs/theming. A redirect beats a 404 that only
 * says the first page exists somewhere.
 */
export default function Page() {
  redirect(docs.docs[0].href)
}
