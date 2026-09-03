import { Moon, Plus, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COLOR_SETS } from '@/lib/styles'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = [
  'default',
  'colored',
  'secondary',
  'outline',
  'ghost',
  'link',
] as const

const SIZES = [
  'xs',
  'sm',
  'default',
  'lg',
  'xl',
  'icon-xs',
  'icon-sm',
  'icon',
  'icon-lg',
  'icon-xl',
] as const

/** Rebuild the JSX for whatever the composer is currently set to. */
function composeButton(state: ComposerState) {
  const attrs: string[] = []

  if (state.variant !== 'default') attrs.push(`variant="${state.variant}"`)
  if (state.tint) attrs.push(`tint="${state.tint}"`)
  else if (state.color !== 'neutral') attrs.push(`color="${state.color}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.disabled) attrs.push('disabled')

  const iconOnly = String(state.size).startsWith('icon')
  if (iconOnly) attrs.push(`aria-label="${state.label}"`)

  const open = attrs.length
    ? `<Button\n  ${attrs.join('\n  ')}\n>`
    : '<Button>'

  const children = iconOnly
    ? '  <Plus />'
    : state.icon
      ? `  <Plus />\n  ${state.label}`
      : `  ${state.label}`

  return `${open}\n${children}\n</Button>`
}

export const buttonEntry: ComponentEntry = {
  id: 'button',
  label: 'Button',
  description:
    'A control for a single action. Six variants across eight colour sets, ten sizes, and `asChild` to render as any element. Destructive is a colour, not a variant.',
  usage: `import { Button } from '@/components/ui/button'

<Button variant="outline" color="blue" size="lg">
  Click me
</Button>`,
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
        prop: 'color',
        label: 'color',
        options: COLOR_SETS,
        default: 'neutral',
      },
      {
        type: 'select',
        prop: 'size',
        label: 'size',
        options: SIZES,
        default: 'default',
      },
      { type: 'text', prop: 'label', label: 'children', default: 'Button' },
      { type: 'color', prop: 'tint', label: 'tint', default: '' },
      { type: 'boolean', prop: 'icon', label: 'with icon', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => {
      const size = String(state.size) as (typeof SIZES)[number]
      const iconOnly = size.startsWith('icon')

      return (
        <Button
          variant={String(state.variant) as (typeof VARIANTS)[number]}
          color={
            state.tint
              ? undefined
              : (String(state.color) as (typeof COLOR_SETS)[number])
          }
          tint={state.tint ? String(state.tint) : undefined}
          size={size}
          disabled={Boolean(state.disabled)}
          aria-label={iconOnly ? String(state.label) : undefined}
        >
          {iconOnly ? (
            <Plus />
          ) : (
            <>
              {state.icon && <Plus />}
              {String(state.label)}
            </>
          )}
        </Button>
      )
    },
    code: composeButton,
  },
  api: [
    {
      name: 'variant',
      type: VARIANTS.map((v) => `'${v}'`).join(' | '),
      default: "'default'",
      description: 'Which treatment to use. All of them read the active colour set.',
    },
    {
      name: 'color',
      type: COLOR_SETS.map((c) => `'${c}'`).join(' | '),
      default: "'neutral'",
      description:
        'Named colour set. Drives fill, text, tint and border together. Ignored when tint is set.',
    },
    {
      name: 'tint',
      type: 'string',
      description:
        'Any CSS colour, used instead of a named set. Fill, text, hover and border are all derived from it.',
    },
    {
      name: 'size',
      type: SIZES.map((s) => `'${s}'`).join(' | '),
      default: "'default'",
      description:
        'Height, padding, icon size and corner radius as one step. icon-* sizes are square.',
    },
    {
      name: 'asChild',
      type: 'boolean',
      default: 'false',
      description:
        'Render the single child element instead of a <button>, keeping every style. Useful for links.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Native disabled state; drops opacity and blocks pointer events.',
    },
  ],
  demos: [
    {
      title: 'Variants',
      code: `<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button color="destructive">Destructive</Button>
<Button variant="link">Link</Button>`,
      render: () => (
        <>
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button color="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </>
      ),
    },
    {
      title: 'Colored — solid',
      code: `<Button variant="colored" color="blue">Blue</Button>
<Button variant="colored" color="violet">Violet</Button>
<Button variant="colored" color="green">Green</Button>`,
      render: () => (
        <>
          {COLOR_SETS.map((color) => (
            <Button key={color} variant="colored" color={color}>
              {color}
            </Button>
          ))}
        </>
      ),
    },
    {
      title: 'Colored — secondary',
      code: `<Button variant="secondary" color="blue">Blue</Button>
<Button variant="secondary" color="amber">Amber</Button>`,
      render: () => (
        <>
          {COLOR_SETS.map((color) => (
            <Button key={color} variant="secondary" color={color}>
              {color}
            </Button>
          ))}
        </>
      ),
    },
    {
      title: 'Colored — outline and ghost',
      stack: true,
      code: `<Button variant="outline" color="blue">Blue</Button>
<Button variant="ghost" color="rose">Rose</Button>`,
      render: () => (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_SETS.map((color) => (
              <Button key={color} variant="outline" color={color}>
                {color}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_SETS.map((color) => (
              <Button key={color} variant="ghost" color={color}>
                {color}
              </Button>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Custom colour via tint',
      stack: true,
      code: `<Button tint="#7c3aed">Solid</Button>
<Button tint="#7c3aed" variant="secondary">Secondary</Button>
<Button tint="#7c3aed" variant="outline">Outline</Button>
<Button tint="#7c3aed" variant="ghost">Ghost</Button>

// any CSS colour works, including a token
<Button tint="oklch(0.7 0.18 140)">oklch</Button>
<Button tint="var(--chart-4)">var()</Button>`,
      render: () => (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {['#7c3aed', '#0f766e', '#e11d48', '#f59e0b'].map((tint) => (
              <div key={tint} className="flex flex-wrap items-center gap-2">
                <Button tint={tint}>Solid</Button>
                <Button tint={tint} variant="secondary">
                  Secondary
                </Button>
                <Button tint={tint} variant="outline">
                  Outline
                </Button>
                <Button tint={tint} variant="ghost">
                  Ghost
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button tint="oklch(0.7 0.18 140)">oklch()</Button>
            <Button tint="rgb(56 130 246)">rgb()</Button>
            <Button tint="var(--chart-4)">var()</Button>
            <Button tint="#111827">dark fill, light text</Button>
            <Button tint="#fde68a">light fill, dark text</Button>
          </div>
        </>
      ),
    },
    {
      title: 'Sizes',
      code: `<Button size="xs">Extra small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra large</Button>`,
      render: () => (
        <>
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra large</Button>
        </>
      ),
    },
    {
      title: 'Icon sizes',
      code: `<Button size="icon-xs" aria-label="Add"><Plus /></Button>
<Button size="icon-sm" aria-label="Add"><Plus /></Button>
<Button size="icon" aria-label="Add"><Plus /></Button>
<Button size="icon-lg" aria-label="Add"><Plus /></Button>
<Button size="icon-xl" aria-label="Add"><Plus /></Button>`,
      render: () => (
        <>
          <Button size="icon-xs" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon-sm" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon-lg" aria-label="Add">
            <Plus />
          </Button>
          <Button size="icon-xl" aria-label="Add">
            <Plus />
          </Button>
        </>
      ),
    },
    {
      title: 'States',
      code: `<Button disabled>Disabled</Button>
<Button variant="outline" disabled>
  Disabled
</Button>
<Button aria-invalid>Invalid</Button>`,
      render: () => (
        <>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
          <Button aria-invalid>Invalid</Button>
        </>
      ),
    },
    {
      title: 'With icon',
      code: `<Button>
  <Sun /> Light
</Button>
<Button variant="outline">
  <Moon /> Dark
</Button>`,
      render: () => (
        <>
          <Button>
            <Sun /> Light
          </Button>
          <Button variant="outline">
            <Moon /> Dark
          </Button>
        </>
      ),
    },
    {
      title: 'asChild — render as a link',
      code: `<Button asChild variant="outline">
  <a href="https://vite.dev" target="_blank" rel="noreferrer">
    Open Vite docs
  </a>
</Button>`,
      render: () => (
        <Button asChild variant="outline">
          <a href="https://vite.dev" target="_blank" rel="noreferrer">
            Open Vite docs
          </a>
        </Button>
      ),
    },
  ],
}
