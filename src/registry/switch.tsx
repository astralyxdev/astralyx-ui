import { Switch } from '@/components/ui/switch'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['sm', 'default', 'lg'] as const

function composeSwitch(state: ComposerState) {
  const attrs: string[] = []
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.label) attrs.push(`label="${state.label}"`)
  if (state.description) attrs.push(`description="${state.description}"`)
  if (state.disabled) attrs.push('disabled')
  return attrs.length ? `<Switch\n  ${attrs.join('\n  ')}\n/>` : '<Switch />'
}

export const switchEntry: ComponentEntry = {
  id: 'switch',
  label: 'Switch',
  description:
    'An instant on/off toggle. A native checkbox with role="switch", so it submits with a form and toggles from the keyboard.',
  usage: `import { Switch } from '@/components/ui/switch'

<Switch label="Dark mode" defaultChecked />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'text', prop: 'label', label: 'label', default: 'Dark mode' },
      { type: 'text', prop: 'description', label: 'description', default: '' },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <Switch
        size={String(state.size) as (typeof SIZES)[number]}
        label={state.label ? String(state.label) : undefined}
        description={state.description ? String(state.description) : undefined}
        disabled={Boolean(state.disabled)}
        defaultChecked
      />
    ),
    code: composeSwitch,
  },
  api: [
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Track and thumb size. Each step is proportioned so the thumb travels exactly its own width.' },
    { name: 'label', type: 'ReactNode', description: 'Text beside the track; makes the whole row clickable.' },
    { name: 'description', type: 'ReactNode', description: 'Secondary line under the label.' },
  ],
  demos: [
    {
      title: 'Sizes',
      stack: true,
      code: `<Switch size="sm" label="Small" />
<Switch size="default" label="Default" />
<Switch size="lg" label="Large" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Switch key={size} size={size} label={size} defaultChecked />
          ))}
        </>
      ),
    },
    {
      title: 'With description',
      stack: true,
      code: `<Switch
  label="Reduced motion"
  description="Disables every transition in the interface."
/>`,
      render: () => (
        <Switch
          label="Reduced motion"
          description="Disables every transition in the interface."
        />
      ),
    },
    {
      title: 'States',
      stack: true,
      code: `<Switch label="Off" />
<Switch label="On" defaultChecked />
<Switch label="Disabled" disabled />
<Switch label="Disabled on" disabled defaultChecked />`,
      render: () => (
        <>
          <Switch label="Off" />
          <Switch label="On" defaultChecked />
          <Switch label="Disabled" disabled />
          <Switch label="Disabled on" disabled defaultChecked />
        </>
      ),
    },
  ],
}
