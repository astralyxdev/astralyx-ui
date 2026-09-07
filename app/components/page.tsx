import type { Metadata } from 'next'
import { ComponentsIndex } from '@/screens/components-index'
import docs from '@/registry/docs.generated.json'

const COUNT = Object.keys(docs.components).length

export const metadata: Metadata = {
  title: 'Components',
  description: `All ${COUNT} components in the kit, grouped by what they are for. Every one is source you copy into your own repo, not a dependency you import.`,
  alternates: { canonical: '/components/' },
}

export default function Page() {
  return <ComponentsIndex />
}
