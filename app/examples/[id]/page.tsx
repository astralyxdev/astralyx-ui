import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import docs from '@/registry/docs.generated.json'
import { clampDescription, openGraphFor } from '@/lib/seo'
import { ExampleBody } from './body'

export function generateStaticParams() {
  return docs.examples.map((example) => ({ id: example.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const example = docs.examples.find((entry) => entry.id === id)
  if (!example) return {}

  const description = clampDescription(example.description)

  return {
    title: example.label,
    description,
    alternates: { canonical: example.href },
    openGraph: openGraphFor({ title: example.label, description, path: example.href }),
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!docs.examples.some((example) => example.id === id)) notFound()

  return <ExampleBody id={id} />
}
