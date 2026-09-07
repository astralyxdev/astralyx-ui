import { Copy, FolderTree, Gauge, Palette, Ruler, ShieldCheck, Sparkles } from 'lucide-react'

/**
 * The rail's doc glyphs, declared away from the docs themselves.
 *
 * `src/docs/pages.tsx` is 900 lines of JSX and a client module; the layout is a
 * server component and needs seven icons out of it. Importing the file for them
 * would drag every doc page onto the server graph.
 */
const ICONS: Record<string, typeof Copy> = {
  introduction: Sparkles,
  installation: Copy,
  theming: Palette,
  structure: FolderTree,
  conventions: Ruler,
  motion: Gauge,
  accessibility: ShieldCheck,
}

export function DocIcon({ id }: { id: string }) {
  const Icon = ICONS[id]
  return Icon ? <Icon /> : null
}
