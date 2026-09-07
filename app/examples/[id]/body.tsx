'use client'

import { findExample } from '@/examples'
import { ExamplePage } from '@/screens/example-page'

/**
 * An example is a running product, so there is nothing here a server could
 * usefully render: it is state, drag handles and dialogs from the first frame.
 * The export still writes its opening HTML, which is all a crawler needs from a
 * page whose value is that you can click it.
 */
export function ExampleBody({ id }: { id: string }) {
  const example = findExample(id)
  if (!example) return null
  return <ExamplePage example={example} />
}
