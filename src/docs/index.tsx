import type { ReactNode } from 'react'

export type DocEntry = {
  /** URL slug — the page lives at `/docs/<id>`. */
  id: string
  label: string
  description: string
  render: () => ReactNode
}

export function docPath(id: string) {
  return `/docs/${id}`
}
