import { Globe } from 'lucide-react'
import { Select } from '@/components/ui/select'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['default', 'secondary', 'ghost'] as const
const SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'contrast', label: 'High contrast', disabled: true },
]

/** Three levels deep, to show that nesting is not capped at one. */
const NESTED = [
  { value: 'new', label: 'New file' },
  {
    value: 'export',
    label: 'Export as',
    children: [
      {
        value: 'image',
        label: 'Image',
        children: [
          { value: 'png', label: 'PNG' },
          { value: 'jpg', label: 'JPEG' },
          { value: 'webp', label: 'WebP' },
          { value: 'avif', label: 'AVIF', disabled: true },
        ],
      },
      {
        value: 'doc',
        label: 'Document',
        children: [
          { value: 'pdf', label: 'PDF' },
          { value: 'docx', label: 'Word' },
        ],
      },
      { value: 'svg', label: 'SVG' },
    ],
  },
  {
    value: 'share',
    label: 'Share with',
    children: [
      { value: 'link', label: 'Anyone with the link' },
      { value: 'team', label: 'My team' },
      { value: 'nobody', label: 'Nobody', disabled: true },
    ],
  },
  { value: 'archive', label: 'Archive' },
]

function composeSelect(state: ComposerState) {
  const attrs = ['options={options}']
  if (state.variant !== 'default') attrs.push(`variant="${state.variant}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.placeholder) attrs.push(`placeholder="${state.placeholder}"`)
  if (state.icon) attrs.push('icon={<Globe />}')
  if (state.error) attrs.push('error')
  if (state.disabled) attrs.push('disabled')
  return `<Select\n  ${attrs.join('\n  ')}\n/>`
}

export const selectEntry: ComponentEntry = {
  id: 'select',
  label: 'Select',
  description:
    'A custom dropdown, not a native select — the trigger matches Input exactly and the panel is real markup. Full keyboard support, type-ahead, and dismissal on Escape or outside click.',
  usage: `import { Select } from '@/components/ui/select'

const options = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

<Select options={options} defaultValue="system" />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: VARIANTS, default: 'default' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'text', prop: 'placeholder', label: 'placeholder', default: 'Select a theme' },
      { type: 'boolean', prop: 'icon', label: 'icon', default: false },
      { type: 'boolean', prop: 'nested', label: 'nested options', default: false },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Select
          options={state.nested ? NESTED : OPTIONS}
          variant={String(state.variant) as (typeof VARIANTS)[number]}
          size={String(state.size) as (typeof SIZES)[number]}
          placeholder={String(state.placeholder)}
          icon={state.icon ? <Globe /> : undefined}
          error={Boolean(state.error)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: composeSelect,
  },
  api: [
    { name: 'options', type: '{ value, label, disabled?, children? }[]', description: 'The choices. A disabled option is skipped by arrow keys and type-ahead.' },
    { name: 'children', type: 'SelectOption[]', description: 'Makes an option a submenu instead of a value, and nests without limit. The row shows a chevron and cannot be selected itself.' },
    { name: 'placement', type: 'right → left → top', description: 'A submenu opens to the right, falls back to the left, then above. Fixed positioning, so it is never clipped by a scrolling ancestor.' },
    { name: 'keyboard', type: 'arrows', description: 'Right or Enter opens a submenu and focuses it, Left closes one level and returns focus to the parent row, Escape closes. Type-ahead searches the level you are in.' },
    { name: 'value / defaultValue', type: 'string', description: 'Controlled and uncontrolled selection.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Fires with the chosen value.' },
    { name: 'variant', type: VARIANTS.map((v) => `'${v}'`).join(' | '), default: "'default'", description: 'Matches Input, so the two line up in a form.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Same size steps as Input.' },
    { name: 'placeholder', type: 'string', default: "'Select…'", description: 'Shown until something is chosen.' },
    { name: 'icon', type: 'ReactNode', description: 'Leading adornment in the trigger.' },
    { name: 'error', type: 'boolean', default: 'false', description: 'Red border. Also sets aria-invalid.' },
  ],
  demos: [
    {
      title: 'Nested submenus',
      stack: true,
      code: `const options = [
  { value: 'new', label: 'New file' },
  {
    value: 'export',
    label: 'Export as',
    children: [
      { value: 'image', label: 'Image', children: [
        { value: 'png', label: 'PNG' },
        { value: 'jpg', label: 'JPEG' },
      ]},
      { value: 'svg', label: 'SVG' },
    ],
  },
]

<Select options={options} placeholder="Actions" />`,
      render: () => (
        <div className="w-full max-w-xs">
          <Select options={NESTED} placeholder="Actions" />
        </div>
      ),
    },
    {
      title: 'Variants',
      stack: true,
      code: `<Select options={options} defaultValue="system" />
<Select options={options} variant="secondary" />
<Select options={options} variant="ghost" />`,
      render: () => (
        <>
          <Select options={OPTIONS} defaultValue="system" />
          <Select options={OPTIONS} variant="secondary" placeholder="Secondary" />
          <Select options={OPTIONS} variant="ghost" placeholder="Ghost" />
        </>
      ),
    },
    {
      title: 'Sizes',
      stack: true,
      code: `<Select options={options} size="xs" />
<Select options={options} size="default" />
<Select options={options} size="xl" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Select key={size} options={OPTIONS} size={size} placeholder={size} />
          ))}
        </>
      ),
    },
    {
      title: 'With icon, and a disabled option',
      stack: true,
      code: `<Select options={options} icon={<Globe />} placeholder="Region" />`,
      render: () => (
        <Select options={OPTIONS} icon={<Globe />} placeholder="Region" />
      ),
    },
    {
      title: 'States',
      stack: true,
      code: `<Select options={options} error />
<Select options={options} disabled />`,
      render: () => (
        <>
          <Select options={OPTIONS} error placeholder="Required" />
          <Select options={OPTIONS} disabled placeholder="Disabled" />
        </>
      ),
    },
  ],
}
