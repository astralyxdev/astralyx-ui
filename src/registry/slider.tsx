import { Slider } from '@/components/ui/slider'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['sm', 'default', 'lg'] as const

function composeSlider(state: ComposerState) {
  const attrs: string[] = []
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.min !== '0') attrs.push(`min={${state.min}}`)
  if (state.max !== '100') attrs.push(`max={${state.max}}`)
  if (state.step !== '1') attrs.push(`step={${state.step}}`)
  if (state.label) attrs.push(`label="${state.label}"`)
  if (state.showValue) attrs.push('showValue')
  if (state.disabled) attrs.push('disabled')
  return attrs.length ? `<Slider\n  ${attrs.join('\n  ')}\n/>` : '<Slider />'
}

export const sliderEntry: ComponentEntry = {
  id: 'slider',
  label: 'Slider',
  description:
    'Pick a value along a range. A restyled native range input, so arrow keys, Home/End, touch dragging and form submission all work without JavaScript.',
  usage: `import { Slider } from '@/components/ui/slider'

<Slider min={0} max={100} step={5} defaultValue={40} showValue />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'select', prop: 'min', label: 'min', options: ['0', '10', '-50'], default: '0' },
      { type: 'select', prop: 'max', label: 'max', options: ['1', '10', '100', '200'], default: '100' },
      { type: 'select', prop: 'step', label: 'step', options: ['0.1', '1', '5', '25'], default: '1' },
      { type: 'text', prop: 'label', label: 'label', default: 'Volume' },
      { type: 'boolean', prop: 'showValue', label: 'showValue', default: true },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <Slider
          key={`${state.min}-${state.max}-${state.step}`}
          size={String(state.size) as (typeof SIZES)[number]}
          min={Number(state.min)}
          max={Number(state.max)}
          step={Number(state.step)}
          label={String(state.label)}
          showValue={Boolean(state.showValue)}
          disabled={Boolean(state.disabled)}
        />
      </div>
    ),
    code: composeSlider,
  },
  api: [
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Track thickness and thumb size, passed to the CSS as variables.' },
    { name: 'label', type: 'string', description: 'Accessible name. A range input without one is announced as just "slider" — pass this or an aria-labelledby.' },
    { name: 'showValue', type: 'boolean', default: 'false', description: 'Render the current value beside the track.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'String', description: 'Format the displayed value — units, percentages, currency.' },
    { name: 'min / max / step', type: 'number', description: 'Standard range attributes. The fill percentage is derived from them.' },
  ],
  demos: [
    {
      title: 'Sizes',
      stack: true,
      code: `<Slider size="sm" label="Small" defaultValue={30} />
<Slider size="default" label="Default" defaultValue={50} />
<Slider size="lg" label="Large" defaultValue={70} />`,
      render: () => (
        <>
          <Slider size="sm" label="Small" defaultValue={30} />
          <Slider size="default" label="Default" defaultValue={50} />
          <Slider size="lg" label="Large" defaultValue={70} />
        </>
      ),
    },
    {
      title: 'With value',
      stack: true,
      code: `<Slider label="Level" showValue defaultValue={40} />
<Slider showValue defaultValue={60} formatValue={(v) => \`\${v}%\`} />`,
      render: () => (
        <>
          <Slider label="Level" showValue defaultValue={40} />
          <Slider label="Opacity" showValue defaultValue={60} formatValue={(v) => `${v}%`} />
        </>
      ),
    },
    {
      title: 'Stepped and disabled',
      stack: true,
      code: `<Slider label="Steps" min={0} max={10} step={1} defaultValue={4} showValue />
<Slider label="Disabled" defaultValue={35} disabled showValue />`,
      render: () => (
        <>
          <Slider label="Steps" min={0} max={10} step={1} defaultValue={4} showValue />
          <Slider label="Disabled" defaultValue={35} disabled showValue />
        </>
      ),
    },
  ],
}
