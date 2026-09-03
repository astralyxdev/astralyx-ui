import { Textarea } from '@/components/ui/textarea'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['default', 'secondary', 'ghost'] as const
const SIZES = ['sm', 'default', 'lg'] as const
const RESIZE = ['none', 'vertical', 'both'] as const

function composeTextarea(state: ComposerState) {
  const attrs: string[] = []
  if (state.variant !== 'default') attrs.push(`variant="${state.variant}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.autoResize) attrs.push('autoResize')
  else if (state.resize !== 'none') attrs.push(`resize="${state.resize}"`)
  if (state.rows !== '4') attrs.push(`rows={${state.rows}}`)
  if (state.placeholder) attrs.push(`placeholder="${state.placeholder}"`)
  if (state.error) attrs.push('error')
  if (state.disabled) attrs.push('disabled')
  return attrs.length ? `<Textarea\n  ${attrs.join('\n  ')}\n/>` : '<Textarea />'
}

export const textareaEntry: ComponentEntry = {
  id: 'textarea',
  label: 'Textarea',
  description:
    'The multi-line sibling of Input. Same variants, same padding rule, with a resize control and no icon slot.',
  usage: `import { Textarea } from '@/components/ui/textarea'

<Textarea placeholder="Tell us what happened" rows={4} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: VARIANTS, default: 'default' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'boolean', prop: 'autoResize', label: 'autoResize', default: false },
      { type: 'select', prop: 'resize', label: 'resize', options: RESIZE, default: 'none' },
      { type: 'select', prop: 'rows', label: 'rows', options: ['2', '3', '4', '6', '8'], default: '4' },
      { type: 'text', prop: 'placeholder', label: 'placeholder', default: 'Tell us what happened' },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Textarea
          variant={String(state.variant) as (typeof VARIANTS)[number]}
          size={String(state.size) as (typeof SIZES)[number]}
          autoResize={Boolean(state.autoResize)}
          resize={String(state.resize) as (typeof RESIZE)[number]}
          rows={Number(state.rows)}
          placeholder={String(state.placeholder)}
          error={Boolean(state.error)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: composeTextarea,
  },
  api: [
    { name: 'variant', type: VARIANTS.map((v) => `'${v}'`).join(' | '), default: "'default'", description: 'Bordered, filled, or no chrome until hover.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Minimum height, padding, text size and corner radius.' },
    { name: 'autoResize', type: 'boolean', default: 'false', description: 'Grows with the content instead of scrolling. Forces resize="none" and hides the overflow.' },
    { name: 'resize', type: RESIZE.map((r) => `'${r}'`).join(' | '), default: "'none'", description: 'Which directions the user can drag in. The native grip is never drawn — it cannot be styled and clashes with the rounded corner.' },
    { name: 'error', type: 'boolean', default: 'false', description: 'The only colour the component takes: a red border. Also sets aria-invalid.' },
  ],
  demos: [
    {
      title: 'Variants',
      stack: true,
      code: `<Textarea placeholder="Default" />
<Textarea variant="secondary" placeholder="Secondary" />
<Textarea variant="ghost" placeholder="Ghost" />`,
      render: () => (
        <>
          <Textarea placeholder="Default" rows={3} />
          <Textarea variant="secondary" placeholder="Secondary" rows={3} />
          <Textarea variant="ghost" placeholder="Ghost" rows={3} />
        </>
      ),
    },
    {
      title: 'Sizes',
      stack: true,
      code: `<Textarea size="sm" />
<Textarea size="default" />
<Textarea size="lg" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Textarea key={size} size={size} placeholder={size} rows={2} />
          ))}
        </>
      ),
    },
    {
      title: 'Auto resize',
      stack: true,
      code: `<Textarea
  autoResize
  rows={2}
  placeholder="Type — the field grows to fit"
/>`,
      render: () => (
        <>
          <Textarea
            autoResize
            rows={2}
            placeholder="Type — the field grows to fit"
          />
          <Textarea
            autoResize
            rows={2}
            aria-label="Seeded example"
            defaultValue={'Seeded with\nthree lines\nalready'}
          />
        </>
      ),
    },
    {
      title: 'States',
      stack: true,
      code: `<Textarea error aria-label="Bio" defaultValue="Too short" />
<Textarea disabled aria-label="Bio" defaultValue="Disabled" />
<Textarea readOnly aria-label="Bio" defaultValue="Read only" />`,
      render: () => (
        <>
          <Textarea error aria-label="Bio" defaultValue="Too short" rows={2} />
          <Textarea disabled aria-label="Bio" defaultValue="Disabled" rows={2} />
          <Textarea readOnly aria-label="Bio" defaultValue="Read only" rows={2} />
        </>
      ),
    },
  ],
}
