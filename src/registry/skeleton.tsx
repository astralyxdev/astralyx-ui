import { Skeleton } from '@/components/ui/skeleton'
import type { ComponentEntry, ComposerState } from './types'

const SHAPES = ['block', 'text', 'circle'] as const

function composeSkeleton(state: ComposerState) {
  const attrs: string[] = []
  if (state.shape !== 'block') attrs.push(`shape="${state.shape}"`)
  if (state.lines !== '1') attrs.push(`lines={${state.lines}}`)
  attrs.push(`className="${state.className}"`)
  return `<Skeleton ${attrs.join(' ')} />`
}

export const skeletonEntry: ComponentEntry = {
  id: 'skeleton',
  label: 'Skeleton',
  description:
    'A placeholder shape for content that has not arrived. The pulse animates opacity only, so it stays inside the kit motion rule, and stops under prefers-reduced-motion.',
  usage: `import { Skeleton } from '@/components/ui/skeleton'

<Skeleton className="h-8 w-40" />
<Skeleton shape="text" lines={3} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'shape', label: 'shape', options: SHAPES, default: 'block' },
      { type: 'select', prop: 'lines', label: 'lines', options: ['1', '2', '3', '5'], default: '1' },
      { type: 'text', prop: 'className', label: 'className', default: 'h-8 w-48' },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Skeleton
          shape={String(state.shape) as (typeof SHAPES)[number]}
          lines={Number(state.lines)}
          className={String(state.className)}
        />
      </div>
    ),
    code: composeSkeleton,
  },
  api: [
    { name: 'shape', type: SHAPES.map((s) => `'${s}'`).join(' | '), default: "'block'", description: 'Corner treatment: control radius, a text line, or a circle.' },
    { name: 'lines', type: 'number', description: 'Render this many stacked lines. The last one is short, so it reads as a paragraph rather than a block.' },
    { name: 'className', type: 'string', description: 'Where the size comes from — a skeleton has no intrinsic dimensions.' },
  ],
  demos: [
    {
      title: 'Shapes',
      stack: true,
      code: `<Skeleton className="h-8 w-48" />
<Skeleton shape="text" className="w-64" />
<Skeleton shape="circle" className="size-10" />`,
      render: () => (
        <>
          <Skeleton className="h-8 w-48" />
          <Skeleton shape="text" className="w-64" />
          <Skeleton shape="circle" className="size-10" />
        </>
      ),
    },
    {
      title: 'Paragraph',
      stack: true,
      code: `<Skeleton shape="text" lines={4} />`,
      render: () => (
        <div className="w-full max-w-sm">
          <Skeleton shape="text" lines={4} />
        </div>
      ),
    },
    {
      title: 'Composed into a card layout',
      stack: true,
      code: `<div className="flex gap-3">
  <Skeleton shape="circle" className="size-10" />
  <Skeleton shape="text" lines={2} />
</div>`,
      render: () => (
        <div className="flex w-full max-w-sm gap-3">
          <Skeleton shape="circle" className="size-10 shrink-0" />
          <Skeleton shape="text" lines={2} />
        </div>
      ),
    },
  ],
}
