import type { Metadata } from 'next'
import { ComponentsIndex } from '@/screens/components-index'
import docs from '@/registry/docs.generated.json'
import { openGraphFor } from '@/lib/seo'

const COUNT = Object.keys(docs.components).length

const DESCRIPTION = `All ${COUNT} components in the kit, grouped by what they are for. Every one is source you copy into your own repo, not a dependency you import.`

export const metadata: Metadata = {
  title: 'Components',
  description: DESCRIPTION,
  alternates: { canonical: '/components/' },
  openGraph: openGraphFor({ title: 'Components', description: DESCRIPTION, path: '/components/' }),
}

export default function Page() {
  return <ComponentsIndex />
}
