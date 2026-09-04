import type { ReactNode } from 'react'
import type { Language } from '@/lib/highlighter'

/**
 * The composer's own types, re-exported so registry entries keep one import.
 *
 * The dependency runs this way round on purpose: `Composer` is a component of
 * the kit and knows nothing about this registry, so it can be used in a README
 * page or a design review with no documentation machinery attached.
 */
export type {
  ComposerControl as ControlSpec,
  ComposerState,
  ComposerValue,
} from '@/components/ui/composer'

/** An interactive playground: controls on one side, live output on the other. */
export type ComposerSpec = {
  controls: import('@/components/ui/composer').ComposerControl[]
  render: (state: import('@/components/ui/composer').ComposerState) => ReactNode
  /** Source for the current state, shown live beneath the preview. */
  code: (state: import('@/components/ui/composer').ComposerState) => string
  /** Center the preview in a tall box instead of a compact one. */
  tall?: boolean
}

/**
 * One curated row of the API reference.
 *
 * Its `name` decides where it lands: a prop, hook, function, type or field
 * of the component file takes the description; anything else — `keyboard`,
 * `accessibility` — is shown as a behaviour note. Types and defaults are read
 * from the source, so `type` here only matters for a note.
 */
export type ApiProp = {
  name: string
  type: string
  default?: string
  description: string
}

export type DemoSpec = {
  title: string
  /** Snippet shown behind the Code tab. */
  code: string
  language?: Language
  /** Lay the preview out as full-width rows instead of an inline row. */
  stack?: boolean
  render: () => ReactNode
}

export type ComponentEntry = {
  /** URL slug — the page lives at `/components/<id>`. */
  id: string
  label: string
  description: string
  /** Import line shown under Usage. */
  usage?: string
  /** Flags the entry as recently added — a NEW tag in the nav and the index. */
  isNew?: boolean
  composer?: ComposerSpec
  demos?: DemoSpec[]
  api?: ApiProp[]
}

export type Category = {
  label: string
  items: ComponentEntry[]
}
