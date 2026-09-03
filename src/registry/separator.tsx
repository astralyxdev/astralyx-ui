import { Separator } from '@/components/ui/separator'
import type { ComponentEntry, ComposerState } from './types'

const ORIENTATIONS = ['horizontal', 'vertical'] as const

function composeSeparator(state: ComposerState) {
  const attrs: string[] = []
  if (state.orientation !== 'horizontal') attrs.push(`orientation="${state.orientation}"`)
  if (state.label) attrs.push(`label="${state.label}"`)
  if (!state.decorative) attrs.push('decorative={false}')
  return attrs.length ? `<Separator ${attrs.join(' ')} />` : '<Separator />'
}

export const separatorEntry: ComponentEntry = {
  id: 'separator',
  label: 'Separator',
  description:
    'A rule between sections, horizontal or vertical, optionally with a label set into it.',
  usage: `import { Separator } from '@/components/ui/separator'

<Separator />
<Separator label="or" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'orientation', label: 'orientation', options: ORIENTATIONS, default: 'horizontal' },
      { type: 'text', prop: 'label', label: 'label', default: 'or' },
      { type: 'boolean', prop: 'decorative', label: 'decorative', default: true },
    ],
    render: (state) => {
      const vertical = state.orientation === 'vertical'
      return (
        <div className={vertical ? 'flex h-20 items-center gap-4' : 'w-full max-w-sm'}>
          {vertical && <span className="text-muted-foreground text-sm">Left</span>}
          <Separator
            orientation={String(state.orientation) as (typeof ORIENTATIONS)[number]}
            label={!vertical && state.label ? String(state.label) : undefined}
            decorative={Boolean(state.decorative)}
          />
          {vertical && <span className="text-muted-foreground text-sm">Right</span>}
        </div>
      )
    },
    code: composeSeparator,
  },
  api: [
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Direction of the rule. Vertical stretches to its container.' },
    { name: 'label', type: 'ReactNode', description: 'Text set into the rule, e.g. "or". Horizontal only.' },
    { name: 'decorative', type: 'boolean', default: 'true', description: 'Hidden from assistive tech, which is right for a purely visual rule. Set false when it separates genuinely distinct regions.' },
  ],
  demos: [
    {
      title: 'Horizontal',
      stack: true,
      code: `<Separator />`,
      render: () => (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-muted-foreground text-sm">Above</p>
          <Separator />
          <p className="text-muted-foreground text-sm">Below</p>
        </div>
      ),
    },
    {
      title: 'With a label',
      stack: true,
      code: `<Separator label="or" />`,
      render: () => (
        <div className="w-full max-w-sm">
          <Separator label="or" />
        </div>
      ),
    },
    {
      title: 'Vertical',
      code: `<Separator orientation="vertical" />`,
      render: () => (
        <div className="flex h-8 items-center gap-4 text-sm">
          <span>Docs</span>
          <Separator orientation="vertical" />
          <span>API</span>
          <Separator orientation="vertical" />
          <span>Changelog</span>
        </div>
      ),
    },
  ],
}
