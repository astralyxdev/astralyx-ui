'use client'

import { findDoc } from '@/docs/pages'
import { DocPage } from '@/screens/doc-page'

export function DocBody({ id }: { id: string }) {
  const doc = findDoc(id)
  if (!doc) return null
  return <DocPage doc={doc} />
}
