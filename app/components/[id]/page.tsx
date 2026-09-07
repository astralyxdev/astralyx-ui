import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import docs from '@/registry/docs.generated.json'
import { clampDescription } from '@/lib/seo'
import { ComponentBody } from './body'

type Components = typeof docs.components
type Id = keyof Components

const entries = docs.components as Record<string, Components[Id]>

export function generateStaticParams() {
  return Object.keys(entries).map((id) => ({ id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const entry = entries[id]
  if (!entry) return {}

  // The install line is in the description on purpose: it is the phrase people
  // actually search for, and it is the one sentence that differs between 343
  // pages whose shape is otherwise identical.
  const description = clampDescription(
    `${entry.description} Copy it into your project with npx astralyx-ui add ${entry.id}.`,
  )

  return {
    title: entry.label,
    description,
    alternates: { canonical: entry.href },
    openGraph: { title: `${entry.label} — Astralyx UI`, description, url: entry.href },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!entries[id]) notFound()

  return <ComponentBody id={id} />
}
