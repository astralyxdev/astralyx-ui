import type { ReactNode } from 'react'

export type ExampleEntry = {
  /** URL slug — the page lives at `/examples/<id>`. */
  id: string
  label: string
  description: string
  /** Components the example leans on, listed on its card. */
  uses: string[]
  render: () => ReactNode
}
