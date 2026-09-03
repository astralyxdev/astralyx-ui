import { Check, GitBranch, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { COLOR_SETS } from '@/lib/styles'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['default', 'secondary', 'outline', 'ghost'] as const
const SIZES = ['sm', 'default', 'lg'] as const
const SHAPES = ['pill', 'rounded'] as const

function composeBadge(state: ComposerState) {
  const attrs: string[] = []
  if (state.variant !== 'secondary') attrs.push(`variant="${state.variant}"`)
  if (state.tint) attrs.push(`tint="${state.tint}"`)
  else if (state.color !== 'neutral') attrs.push(`color="${state.color}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.shape !== 'pill') attrs.push(`shape="${state.shape}"`)
  if (state.icon !== 'none') {
    attrs.push('icon={<Check />}')
    if (state.icon === 'end') attrs.push('iconPosition="end"')
  }
  const open = attrs.length ? `<Badge ${attrs.join(' ')}>` : '<Badge>'
  return `${open}${state.label}</Badge>`
}

export const badgeEntry: ComponentEntry = {
  id: 'badge',
  label: 'Badge',
  description:
    'A short status or category marker. Unlike a field, a badge exists to be noticed, so it keeps the full colour system and the tint escape hatch.',
  usage: `import { Badge } from '@/components/ui/badge'

<Badge color="green">Passing</Badge>`,
  composer: {
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: VARIANTS, default: 'secondary' },
      { type: 'select', prop: 'color', label: 'color', options: COLOR_SETS, default: 'neutral' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'select', prop: 'shape', label: 'shape', options: SHAPES, default: 'pill' },
      { type: 'select', prop: 'icon', label: 'iconPosition', options: ['none', 'start', 'end'], default: 'start' },
      { type: 'text', prop: 'label', label: 'children', default: 'Passing' },
      { type: 'color', prop: 'tint', label: 'tint', default: '' },
    ],
    render: (state) => (
      <Badge
        variant={String(state.variant) as (typeof VARIANTS)[number]}
        color={state.tint ? undefined : (String(state.color) as (typeof COLOR_SETS)[number])}
        tint={state.tint ? String(state.tint) : undefined}
        size={String(state.size) as (typeof SIZES)[number]}
        shape={String(state.shape) as (typeof SHAPES)[number]}
        icon={state.icon === 'none' ? undefined : <Check />}
        iconPosition={state.icon === 'end' ? 'end' : 'start'}
      >
        {String(state.label)}
      </Badge>
    ),
    code: composeBadge,
  },
  api: [
    { name: 'variant', type: VARIANTS.map((v) => `'${v}'`).join(' | '), default: "'secondary'", description: 'Solid, tinted, outline or text-only. All read the active colour set. Choosing one: secondary for almost everything — it is the tinted default and stays legible on any surface; default (solid) only where a badge must be the loudest thing in view; outline when the badge sits on an already-tinted fill and another tint would compete; ghost for a count that should recede.' },
    { name: 'color', type: COLOR_SETS.map((c) => `'${c}'`).join(' | '), default: "'neutral'", description: 'Named colour set, shared with Button.' },
    { name: 'tint', type: 'string', description: 'Any CSS colour, used instead of a named set.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Height, padding and text size.' },
    { name: 'shape', type: SHAPES.map((s) => `'${s}'`).join(' | '), default: "'pill'", description: 'A true pill, or the squircle used elsewhere in the kit.' },
    { name: 'icon', type: 'ReactNode', description: 'Rendered inside the badge. Sized automatically from the badge size — 12px at sm and default, 14px at lg.' },
    { name: 'iconPosition', type: "'start' | 'end'", default: "'start'", description: 'Which side the icon sits on. Ignored with asChild, where the caller owns the children.' },
    { name: 'asChild', type: 'boolean', default: 'false', description: 'Render the child element instead of a <span> — for a badge that is also a link.' },
  ],
  demos: [
    {
      title: 'Variants',
      code: `<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="ghost">Ghost</Badge>`,
      render: () => (
        <>
          {VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </>
      ),
    },
    {
      title: 'Colour sets',
      stack: true,
      code: `<Badge color="green">Passing</Badge>
<Badge color="destructive" variant="default">Failed</Badge>`,
      render: () => (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SETS.map((color) => (
              <Badge key={color} color={color}>
                {color}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SETS.map((color) => (
              <Badge key={color} color={color} variant="default">
                {color}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SETS.map((color) => (
              <Badge key={color} color={color} variant="outline">
                {color}
              </Badge>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Sizes and shapes',
      code: `<Badge size="sm">sm</Badge>
<Badge size="lg" shape="rounded">lg rounded</Badge>`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Badge key={size} size={size}>
              {size}
            </Badge>
          ))}
          {SIZES.map((size) => (
            <Badge key={size} size={size} shape="rounded">
              {size}
            </Badge>
          ))}
        </>
      ),
    },
    {
      title: 'With an icon',
      stack: true,
      code: `<Badge icon={<Check />} color="green">Verified</Badge>
<Badge icon={<X />} iconPosition="end" color="destructive">Failed</Badge>
<Badge icon={<GitBranch />} variant="outline">main</Badge>`,
      render: () => (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge icon={<Check />} color="green">
              Verified
            </Badge>
            <Badge icon={<X />} iconPosition="end" color="destructive">
              Failed
            </Badge>
            <Badge icon={<GitBranch />} variant="outline">
              main
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SIZES.map((size) => (
              <Badge key={size} size={size} icon={<Check />} color="blue">
                {size}
              </Badge>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Custom tint',
      code: `<Badge tint="#7c3aed">Custom</Badge>
<Badge tint="#0f766e" variant="default">Custom solid</Badge>`,
      render: () => (
        <>
          <Badge tint="#7c3aed">Custom</Badge>
          <Badge tint="#0f766e" variant="default">
            Custom solid
          </Badge>
          <Badge tint="#e11d48" variant="outline">
            Custom outline
          </Badge>
        </>
      ),
    },
  ],
}
