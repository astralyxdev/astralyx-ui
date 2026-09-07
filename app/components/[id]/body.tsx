'use client'

import { findEntry } from '@/registry'
import { ComponentPage } from '@/screens/component-page'

export function ComponentBody({ id }: { id: string }) {
  const entry = findEntry(id)
  if (!entry) return null
  return <ComponentPage entry={entry} />
}
