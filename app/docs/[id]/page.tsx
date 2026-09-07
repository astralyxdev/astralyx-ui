import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import docs from '@/registry/docs.generated.json'
import { clampDescription, openGraphFor } from '@/lib/seo'
import { DocBody } from './body'

export function generateStaticParams() {
  return docs.docs.map((doc) => ({ id: doc.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const doc = docs.docs.find((entry) => entry.id === id)
  if (!doc) return {}

  return {
    title: doc.label,
    description: clampDescription(doc.description),
    alternates: { canonical: doc.href },
    openGraph: openGraphFor({
      title: doc.label,
      description: clampDescription(doc.description),
      path: doc.href,
    }),
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!docs.docs.some((doc) => doc.id === id)) notFound()

  return <DocBody id={id} />
}
