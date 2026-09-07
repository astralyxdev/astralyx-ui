import type { Metadata } from 'next'
import { Examples } from '@/screens/examples'
import docs from '@/registry/docs.generated.json'
import { openGraphFor } from '@/lib/seo'

const DESCRIPTION = `${docs.examples.length} whole products assembled from the kit — a deployment console, an agent studio, a workflow canvas, an on-call room and the back office of a shop.`

export const metadata: Metadata = {
  title: 'Examples',
  description: DESCRIPTION,
  alternates: { canonical: '/examples/' },
  openGraph: openGraphFor({ title: 'Examples', description: DESCRIPTION, path: '/examples/' }),
}

export default function Page() {
  return <Examples />
}
