import { Radio, RadioGroup } from '@/components/ui/radio-group'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['sm', 'default', 'lg'] as const
const ORIENTATIONS = ['vertical', 'horizontal'] as const

function composeRadioGroup(state: ComposerState) {
  const groupAttrs: string[] = ['defaultValue="week"']
  if (state.orientation !== 'vertical') {
    groupAttrs.push(`orientation="${state.orientation}"`)
  }
  if (state.disabled) groupAttrs.push('disabled')

  const itemAttrs = state.size !== 'default' ? ` size="${state.size}"` : ''
  const description = state.description
    ? `\n    description="How often we email you"`
    : ''

  return `<RadioGroup\n  ${groupAttrs.join('\n  ')}\n>
  <Radio value="day"${itemAttrs} label="Every day"${description} />
  <Radio value="week"${itemAttrs} label="Every week" />
  <Radio value="never"${itemAttrs} label="Never" />
</RadioGroup>`
}

export const radioGroupEntry: ComponentEntry = {
  id: 'radio-group',
  label: 'Radio Group',
  description:
    'One choice out of several. Built on native radio inputs, so arrow-key roving, form submission and the single-selection invariant come from the platform.',
  usage: `import { Radio, RadioGroup } from '@/components/ui/radio-group'

<RadioGroup defaultValue="week" onValueChange={setValue}>
  <Radio value="day" label="Every day" />
  <Radio value="week" label="Every week" />
  <Radio value="never" label="Never" />
</RadioGroup>`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'select', prop: 'orientation', label: 'orientation', options: ORIENTATIONS, default: 'vertical' },
      { type: 'boolean', prop: 'description', label: 'description', default: false },
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => {
      const size = String(state.size) as (typeof SIZES)[number]
      const error = Boolean(state.error)

      return (
        <RadioGroup
          defaultValue="week"
          orientation={String(state.orientation) as (typeof ORIENTATIONS)[number]}
          disabled={Boolean(state.disabled)}
        >
          <Radio
            value="day"
            size={size}
            error={error}
            label="Every day"
            description={
              state.description ? 'How often we email you' : undefined
            }
          />
          <Radio value="week" size={size} error={error} label="Every week" />
          <Radio value="never" size={size} error={error} label="Never" />
        </RadioGroup>
      )
    },
    code: composeRadioGroup,
  },
  api: [
    {
      name: 'responsive',
      type: "'sm' | 'md' | 'lg' | false",
      default: "'sm'",
      description:
        'Breakpoint a horizontal group becomes a row at. Below it the options stack, keeping each label and its control on one line rather than wrapping between them.',
    },
    { name: 'value / defaultValue', type: 'string', description: 'Controlled and uncontrolled selection, on RadioGroup.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Fires with the chosen value.' },
    { name: 'name', type: 'string', description: 'Shared input name. Generated with useId when omitted, so two groups on a page never collide.' },
    { name: 'orientation', type: "'vertical' | 'horizontal'", default: "'vertical'", description: 'Layout direction, also reported as aria-orientation.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'On RadioGroup, disables every item at once.' },
    { name: 'Radio value', type: 'string', description: 'Required. Identifies the option within the group.' },
    { name: 'Radio label / description', type: 'ReactNode', description: 'Text beside the dot; the whole row is clickable.' },
  ],
  demos: [
    {
      title: 'Sizes',
      stack: true,
      code: `<RadioGroup defaultValue="b">
  <Radio value="a" size="sm" label="Small" />
  <Radio value="b" size="default" label="Default" />
  <Radio value="c" size="lg" label="Large" />
</RadioGroup>`,
      render: () => (
        <RadioGroup defaultValue="b">
          <Radio value="a" size="sm" label="Small" />
          <Radio value="b" size="default" label="Default" />
          <Radio value="c" size="lg" label="Large" />
        </RadioGroup>
      ),
    },
    {
      title: 'Horizontal',
      code: `<RadioGroup defaultValue="week" orientation="horizontal">…</RadioGroup>`,
      render: () => (
        <RadioGroup defaultValue="week" orientation="horizontal">
          <Radio value="day" label="Day" />
          <Radio value="week" label="Week" />
          <Radio value="month" label="Month" />
        </RadioGroup>
      ),
    },
    {
      title: 'With descriptions',
      stack: true,
      code: `<Radio
  value="all"
  label="All activity"
  description="Every comment, mention and status change."
/>`,
      render: () => (
        <RadioGroup defaultValue="mentions">
          <Radio
            value="all"
            label="All activity"
            description="Every comment, mention and status change."
          />
          <Radio
            value="mentions"
            label="Mentions only"
            description="Just the threads you are named in."
          />
          <Radio
            value="none"
            label="Nothing"
            description="You will still see the in-app badge."
          />
        </RadioGroup>
      ),
    },
    {
      title: 'Disabled group',
      stack: true,
      code: `<RadioGroup defaultValue="week" disabled>…</RadioGroup>`,
      render: () => (
        <RadioGroup defaultValue="week" disabled>
          <Radio value="day" label="Every day" />
          <Radio value="week" label="Every week" />
        </RadioGroup>
      ),
    },
  ],
}
