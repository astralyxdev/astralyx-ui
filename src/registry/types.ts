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

/**
 * Which half of the kit a category belongs to.
 *
 * `basic` is the vocabulary: a component you could drop into any product
 * because it encodes no business concept. A button, a text field, a dialog, a
 * node canvas — they know about interaction, not about your domain.
 *
 * `block` is the other half, and the reason the kit is 344 components rather
 * than 60. A block knows what a commit is, or a wallet, an invoice, a span, a
 * tool call. That knowledge is the value — it is the part everyone otherwise
 * rebuilds badly — but it is also why a block is worth telling apart from a
 * basic: you reach for a basic constantly and a block when you are building
 * that particular screen.
 *
 * The distinction is about what a component *knows*, not how big it is. A
 * `data-grid` is large and still basic; a `risk-score` is small and still a
 * block.
 */
export type Tier = 'basic' | 'block'

export type Category = {
  label: string
  /** Required, so a new category cannot be filed by accident. See `Tier`. */
  tier: Tier
  items: ComponentEntry[]
}
