import { Checkbox } from '@/components/ui/checkbox'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['sm', 'default', 'lg'] as const

function composeCheckbox(state: ComposerState) {
  const attrs: string[] = []
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.label) attrs.push(`label="${state.label}"`)
  if (state.description) attrs.push(`description="${state.description}"`)
  if (state.indeterminate) attrs.push('indeterminate')
  if (state.error) attrs.push('error')
  if (state.disabled) attrs.push('disabled')
  return attrs.length ? `<Checkbox\n  ${attrs.join('\n  ')}\n/>` : '<Checkbox />'
}

export const checkboxEntry: ComponentEntry = {
  id: 'checkbox',
  label: 'Checkbox',
  description:
    'A binary choice. A real native checkbox under a styled box, so labels, forms, keyboard and the indeterminate state all work.',
  usage: `import { Checkbox } from '@/components/ui/checkbox'

<Checkbox label="Email me updates" defaultChecked />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'text', prop: 'label', label: 'label', default: 'Email me updates' },
      { type: 'text', prop: 'description', label: 'description', default: '' },
      { type: 'boolean', prop: 'indeterminate', label: 'indeterminate', default: false },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <Checkbox
        size={String(state.size) as (typeof SIZES)[number]}
        label={state.label ? String(state.label) : undefined}
        description={state.description ? String(state.description) : undefined}
        indeterminate={Boolean(state.indeterminate)}
        error={Boolean(state.error)}
        disabled={Boolean(state.disabled)}
        defaultChecked
      />
    ),
    code: composeCheckbox,
  },
  api: [
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Box and tick size.' },
    { name: 'label', type: 'ReactNode', description: 'Text beside the box. Also makes the whole row clickable.' },
    { name: 'description', type: 'ReactNode', description: 'Secondary line under the label.' },
    { name: 'indeterminate', type: 'boolean', default: 'false', description: 'Shows a dash and reports indeterminate to assistive tech. A DOM property, not an attribute — set through a ref internally.' },
    { name: 'error', type: 'boolean', default: 'false', description: 'Red border. Also sets aria-invalid.' },
  ],
  demos: [
    {
      title: 'Sizes',
      stack: true,
      code: `<Checkbox size="sm" label="Small" />
<Checkbox size="default" label="Default" />
<Checkbox size="lg" label="Large" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Checkbox key={size} size={size} label={size} defaultChecked />
          ))}
        </>
      ),
    },
    {
      title: 'With description',
      stack: true,
      code: `<Checkbox
  label="Email notifications"
  description="Product news and occasional tips. No more than twice a month."
/>`,
      render: () => (
        <Checkbox
          label="Email notifications"
          description="Product news and occasional tips. No more than twice a month."
          defaultChecked
        />
      ),
    },
    {
      title: 'States',
      stack: true,
      code: `<Checkbox label="Unchecked" />
<Checkbox label="Checked" defaultChecked />
<Checkbox label="Indeterminate" indeterminate />
<Checkbox label="Error" error />
<Checkbox label="Disabled" disabled defaultChecked />`,
      render: () => (
        <>
          <Checkbox label="Unchecked" />
          <Checkbox label="Checked" defaultChecked />
          <Checkbox label="Indeterminate" indeterminate />
          <Checkbox label="Error" error />
          <Checkbox label="Disabled" disabled defaultChecked />
        </>
      ),
    },
  ],
}
