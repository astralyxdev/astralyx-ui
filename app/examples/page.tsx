import type { Metadata } from 'next'
import { Examples } from '@/screens/examples'
import docs from '@/registry/docs.generated.json'

export const metadata: Metadata = {
  title: 'Examples',
  description: `${docs.examples.length} whole products assembled from the kit — a deployment console, an agent studio, a workflow canvas, an on-call room and the back office of a shop.`,
  alternates: { canonical: '/examples/' },
}

export default function Page() {
  return <Examples />
}
