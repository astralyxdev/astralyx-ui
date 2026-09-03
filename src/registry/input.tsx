import { useState } from 'react'
import { Mail, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['default', 'secondary', 'ghost'] as const
const SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const
const ICON_POSITIONS = ['none', 'start', 'end'] as const

/** Rebuild the JSX for whatever the composer is currently set to. */
function composeInput(state: ComposerState) {
  const attrs: string[] = []

  if (state.variant !== 'default') attrs.push(`variant="${state.variant}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.placeholder) attrs.push(`placeholder="${state.placeholder}"`)
  if (state.icon !== 'none') {
    attrs.push('icon={<Search />}')
    if (state.icon === 'end') attrs.push('iconPosition="end"')
  }
  if (state.clearable) attrs.push('clearable')
  if (state.error) attrs.push('error')
  if (state.disabled) attrs.push('disabled')

  return attrs.length ? `<Input\n  ${attrs.join('\n  ')}\n/>` : '<Input />'
}

export const inputEntry: ComponentEntry = {
  id: 'input',
  label: 'Input',
  description:
    'A single-line text field, built on the headless Field primitive. Monochrome by design — it shares the Button size steps but none of its colour sets.',
  usage: `import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

<Input placeholder="Search components" icon={<Search />} />`,
  composer: {
    controls: [
      {
        type: 'select',
        prop: 'variant',
        label: 'variant',
        options: VARIANTS,
        default: 'default',
      },
      {
        type: 'select',
        prop: 'size',
        label: 'size',
        options: SIZES,
        default: 'default',
      },
      {
        type: 'select',
        prop: 'icon',
        label: 'iconPosition',
        options: ICON_POSITIONS,
        default: 'start',
      },
      {
        type: 'text',
        prop: 'placeholder',
        label: 'placeholder',
        default: 'Search components',
      },
      { type: 'boolean', prop: 'clearable', label: 'clearable', default: true },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Input
          variant={String(state.variant) as (typeof VARIANTS)[number]}
          size={String(state.size) as (typeof SIZES)[number]}
          placeholder={String(state.placeholder)}
          icon={state.icon === 'none' ? undefined : <Search />}
          iconPosition={state.icon === 'end' ? 'end' : 'start'}
          clearable={Boolean(state.clearable)}
          defaultValue="Type to see the clear button"
          error={Boolean(state.error)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: composeInput,
  },
  api: [
    {
      name: 'variant',
      type: VARIANTS.map((v) => `'${v}'`).join(' | '),
      default: "'default'",
      description: 'Bordered, filled, or no chrome until hover.',
    },
    {
      name: 'size',
      type: SIZES.map((s) => `'${s}'`).join(' | '),
      default: "'default'",
      description:
        'Height, padding, text and corner radius — the same steps a Button uses, so the two align in a row.',
    },
    {
      name: 'icon',
      type: 'ReactNode',
      description:
        'Rendered inside the field. Padding tightens automatically on the icon side.',
    },
    {
      name: 'iconPosition',
      type: "'start' | 'end'",
      default: "'start'",
      description: 'Which side the icon sits on.',
    },
    {
      name: 'clearable',
      type: 'boolean',
      default: 'false',
      description:
        'Shows a clear button on the trailing side once the field has content. Works controlled or uncontrolled.',
    },
    {
      name: 'onClear',
      type: '() => void',
      description:
        'Fires after the clear button empties the field, in addition to the usual onChange.',
    },
    {
      name: 'clearLabel',
      type: 'string',
      default: "'Clear'",
      description: 'Accessible label for the clear button.',
    },
    {
      name: 'error',
      type: 'boolean',
      default: 'false',
      description:
        'The only colour the component takes: a red border. Also sets aria-invalid on the field.',
    },
    {
      name: 'containerClassName',
      type: 'string',
      description:
        'Styles the wrapper. `className` goes to the <input> itself, so both are reachable.',
    },
  ],
  demos: [
    {
      title: 'Variants',
      stack: true,
      code: `<Input placeholder="Default" />
<Input variant="secondary" placeholder="Secondary" />
<Input variant="ghost" placeholder="Ghost" />`,
      render: () => (
        <>
          <Input placeholder="Default" />
          <Input variant="secondary" placeholder="Secondary" />
          <Input variant="ghost" placeholder="Ghost" />
        </>
      ),
    },
    {
      title: 'Sizes',
      stack: true,
      code: `<Input size="xs" placeholder="Extra small" />
<Input size="sm" placeholder="Small" />
<Input size="default" placeholder="Default" />
<Input size="lg" placeholder="Large" />
<Input size="xl" placeholder="Extra large" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Input key={size} size={size} placeholder={size} icon={<Search />} />
          ))}
        </>
      ),
    },
    {
      title: 'Icon position',
      stack: true,
      code: `<Input icon={<Search />} placeholder="Leading icon" />
<Input icon={<Mail />} iconPosition="end" placeholder="Trailing icon" />
<Input placeholder="No icon" />`,
      render: () => (
        <>
          <Input icon={<Search />} placeholder="Leading icon" />
          <Input icon={<Mail />} iconPosition="end" placeholder="Trailing icon" />
          <Input placeholder="No icon" />
        </>
      ),
    },
    {
      title: 'Clearable',
      stack: true,
      code: `<Input clearable defaultValue="Clear me" />
<Input clearable icon={<Search />} defaultValue="With a leading icon" />
<Input clearable size="lg" defaultValue="Any size" />`,
      render: () => (
        <>
          <Input aria-label="Clearable" clearable defaultValue="Clear me" />
          <Input aria-label="With a leading icon" clearable icon={<Search />} defaultValue="With a leading icon" />
          <Input aria-label="Any size" clearable size="lg" defaultValue="Any size" />
          <ControlledClearable />
        </>
      ),
    },
    {
      title: 'States',
      stack: true,
      code: `<Input placeholder="Disabled" disabled />
<Input placeholder="Error" error defaultValue="not-an-email" />
<Input placeholder="Read only" readOnly defaultValue="Read only" />`,
      render: () => (
        <>
          <Input placeholder="Disabled" disabled icon={<Search />} />
          <Input aria-label="Email" error defaultValue="not-an-email" icon={<Mail />} />
          <Input aria-label="Read only field" readOnly defaultValue="Read only" />
        </>
      ),
    },
    {
      title: 'Aligned with a Button',
      code: `<Input placeholder="Email" icon={<Mail />} />
<Button>Subscribe</Button>`,
      render: () => (
        <div className="flex w-full max-w-md gap-2">
          <Input placeholder="Email" icon={<Mail />} />
          <Button>Subscribe</Button>
        </div>
      ),
    },
  ],
}

/** Controlled usage: the clear button drives the caller's state, not its own. */
function ControlledClearable() {
  const [value, setValue] = useState('Controlled — state stays in sync')

  return (
    <Input
      clearable
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Controlled"
    />
  )
}
