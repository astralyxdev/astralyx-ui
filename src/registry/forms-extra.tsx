import { useState } from 'react'
import { Circle, Heart, Hexagon, Star } from 'lucide-react'
import { ColorPicker } from '@/components/ui/color-picker'
import { MaskInput } from '@/components/ui/mask-input'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { NumberInput } from '@/components/ui/number-input'
import { PasswordInput } from '@/components/ui/password-input'
import { RangeSlider } from '@/components/ui/range-slider'
import { Rating } from '@/components/ui/rating'
import { TagInput } from '@/components/ui/tag-input'
import { TimePicker } from '@/components/ui/time-picker'
import type { ComponentEntry, ComposerState } from './types'

const FIELD_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const FIELD_VARIANTS = ['default', 'secondary', 'ghost'] as const

export const numberInputEntry: ComponentEntry = {
  id: 'number-input',
  label: 'Number Input',
  description:
    'A number field with steppers. Uses type="text" with inputMode="decimal", because the native number input silently discards what it cannot parse — a half-typed "1e" or "-" vanishes as you type it.',
  usage: `import { NumberInput } from '@/components/ui/number-input'

<NumberInput value={qty} onValueChange={setQty} min={1} max={99} suffix="items" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: FIELD_SIZES, default: 'md' },
      { type: 'text', prop: 'step', label: 'step', default: '1' },
      { type: 'text', prop: 'suffix', label: 'suffix', default: 'items' },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <NumberInput
          defaultValue={12}
          min={0}
          max={99}
          step={Number(state.step) || 1}
          size={String(state.size) as (typeof FIELD_SIZES)[number]}
          suffix={String(state.suffix) || undefined}
          aria-label="Quantity"
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<NumberInput\n  defaultValue={12}\n  min={0}\n  max={99}\n  step={${s.step}}\n  size="${s.size}"\n  suffix="${s.suffix}"\n/>`,
  },
  api: [
    { name: 'value / defaultValue / onValueChange', type: 'number', description: 'Reports `undefined` while the field is empty or unparseable, rather than coercing to 0.' },
    { name: 'min / max', type: 'number', description: 'Clamped on blur, not per keystroke — rewriting "5" to "10" mid-type fights someone entering "50".' },
    { name: 'step / precision', type: 'number', default: '1', description: 'Precision is inferred from the step, so 0.1 stays at one decimal instead of accumulating float noise.' },
    { name: 'prefix / suffix', type: 'string', description: 'Static affixes inside the field.' },
    { name: 'keyboard', type: '↑ ↓', description: 'Arrow keys step. The steppers are out of the tab order, since the field itself already does this.' },
  ],
  demos: [
    {
      title: 'Sizes and affixes',
      stack: true,
      code: `<NumberInput defaultValue={12} min={0} max={99} />
<NumberInput defaultValue={9.5} step={0.5} prefix="$" />`,
      render: () => (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <NumberInput defaultValue={12} min={0} max={99} suffix="items" aria-label="Quantity" />
          <NumberInput defaultValue={9.5} step={0.5} prefix="$" aria-label="Unit price" />
        </div>
      ),
    },
  ],
}

export const tagInputEntry: ComponentEntry = {
  id: 'tag-input',
  label: 'Tag Input',
  description:
    'Free-text chips for keywords, recipients or labels. Backspace on an empty field removes the last tag, and pasting a comma-separated list splits it rather than making one long tag.',
  usage: `import { TagInput } from '@/components/ui/tag-input'

<TagInput value={tags} onValueChange={setTags} max={8} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'max', label: 'max', default: '6' },
      { type: 'boolean', prop: 'duplicates', label: 'allowDuplicates', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <TagInput
          defaultValue={['react', 'tailwind']}
          max={Number(state.max) || undefined}
          allowDuplicates={Boolean(state.duplicates)}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<TagInput\n  defaultValue={['react', 'tailwind']}\n  max={${s.max}}\n  allowDuplicates={${Boolean(s.duplicates)}}\n/>`,
  },
  api: [
    { name: 'value / defaultValue / onValueChange', type: 'string[]', description: 'Controlled or uncontrolled.' },
    { name: 'delimiters', type: 'string[]', default: "[',', 'Enter', 'Tab']", description: 'Keys and characters that commit the current text. Tab only commits when there is something to commit, so an empty field still moves focus.' },
    { name: 'max / allowDuplicates', type: 'number / boolean', description: 'At the limit the field is disabled and says so.' },
    { name: 'validate', type: '(tag) => boolean', description: 'Reject an entry — an email shape, a length bound.' },
    { name: 'removal', type: 'keyboard + pointer', description: 'Each chip has a real tab-stop remove button; a chip removable only by pointer is unreachable once you tab past the field.' },
  ],
  demos: [
    {
      title: 'Tags',
      stack: true,
      code: `<TagInput defaultValue={['react', 'tailwind']} max={6} />`,
      render: () => (
        <div className="w-full max-w-md">
          <TagInput defaultValue={['react', 'tailwind', 'typescript']} max={6} />
        </div>
      ),
    },
  ],
}

export const passwordInputEntry: ComponentEntry = {
  id: 'password-input',
  label: 'Password Input',
  description:
    'A password field with a reveal toggle and an optional strength meter that rewards length over symbols — the thing naive meters get wrong when they demand punctuation from a passphrase.',
  usage: `import { PasswordInput } from '@/components/ui/password-input'

<PasswordInput strength autoComplete="new-password" />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'strength', label: 'strength', default: true },
      { type: 'select', prop: 'size', label: 'size', options: FIELD_SIZES, default: 'md' },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <PasswordInput
          strength={Boolean(state.strength)}
          size={String(state.size) as (typeof FIELD_SIZES)[number]}
          placeholder="Password"
          defaultValue="correct horse"
          aria-label="Password"
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<PasswordInput strength={${Boolean(s.strength)}} size="${s.size}" />`,
  },
  api: [
    { name: 'strength', type: 'boolean', default: 'false', description: 'Adds the meter, wired to the field through aria-describedby.' },
    { name: 'scorePassword', type: '(value) => 0..4', description: 'Exported. Length and variety only — the component says so rather than implying dictionary-based scoring it does not do.' },
    { name: 'reveal toggle', type: 'tabIndex={-1}', description: 'Out of the tab order deliberately: Tab goes field → submit, not through a control a keyboard user does not need.' },
  ],
  demos: [
    {
      title: 'With strength',
      stack: true,
      code: `<PasswordInput strength defaultValue="correct horse battery staple" />`,
      render: () => (
        <div className="flex w-full max-w-xs flex-col gap-4">
          <PasswordInput strength defaultValue="hunter2" placeholder="Password" aria-label="Password" />
          <PasswordInput
            strength
            defaultValue="correct horse battery staple"
            aria-label="Passphrase"
          />
        </div>
      ),
    },
  ],
}

const MULTI_OPTIONS: MultiSelectOption[] = [
  { value: 'build', label: 'Build', description: 'Compile and bundle' },
  { value: 'test', label: 'Test', description: '412 specs' },
  { value: 'lint', label: 'Lint' },
  { value: 'typecheck', label: 'Typecheck' },
  { value: 'deploy', label: 'Deploy', description: 'Ship to production' },
  { value: 'visual', label: 'Visual diff', disabled: true },
]

export const multiSelectEntry: ComponentEntry = {
  id: 'multi-select',
  label: 'Multi Select',
  description:
    'Pick several options. The gap Select cannot fill — it is a single-value combobox by construction, which is why the LogViewer level filter had to become a threshold instead of a set.',
  usage: `import { MultiSelect } from '@/components/ui/multi-select'

<MultiSelect options={options} value={selected} onValueChange={setSelected} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'maxShown', label: 'maxShown', default: '2' },
      { type: 'boolean', prop: 'searchable', label: 'searchable', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-sm">
        <MultiSelect
          options={MULTI_OPTIONS}
          defaultValue={['build', 'test']}
          maxShown={Number(state.maxShown) || 2}
          searchable={Boolean(state.searchable)}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<MultiSelect\n  options={options}\n  value={selected}\n  onValueChange={setSelected}\n  maxShown={${s.maxShown}}\n  searchable={${Boolean(s.searchable)}}\n/>`,
  },
  api: [
    { name: 'options', type: 'MultiSelectOption[]', description: '`{ value, label, description?, disabled? }`.' },
    { name: 'value / onValueChange', type: 'string[]', description: 'Controlled or uncontrolled.' },
    { name: 'maxShown', type: 'number', default: '2', description: 'Chips before collapsing to a count. Rendering every chip makes the trigger grow without limit and pushes the rest of the form around.' },
    { name: 'closing', type: 'never on select', description: 'Multi-select exists because people pick more than one thing; closing after each is the most common complaint about these controls.' },
  ],
  demos: [
    {
      title: 'Selection',
      stack: true,
      code: `<MultiSelect options={options} defaultValue={['build', 'test']} />`,
      render: () => (
        <div className="w-full max-w-sm">
          <MultiSelect options={MULTI_OPTIONS} defaultValue={['build', 'test']} />
        </div>
      ),
    },
  ],
}

export const timePickerEntry: ComponentEntry = {
  id: 'time-picker',
  label: 'Time Picker',
  description:
    'Pick a time of day from generated slots. The value is always HH:mm in 24-hour form regardless of how it is displayed — the format is presentation, the value is data.',
  usage: `import { TimePicker } from '@/components/ui/time-picker'

<TimePicker value={time} onValueChange={setTime} interval={15} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'interval', label: 'interval', options: ['15', '30', '60'], default: '30' },
      { type: 'boolean', prop: 'hour12', label: 'hour12', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <TimePicker
          defaultValue="09:30"
          interval={Number(state.interval)}
          hour12={Boolean(state.hour12)}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<TimePicker\n  value={time}\n  onValueChange={setTime}\n  interval={${s.interval}}\n  hour12={${Boolean(s.hour12)}}\n/>`,
  },
  api: [
    { name: 'value / onValueChange', type: 'string', description: '`HH:mm`, 24-hour, whatever the display format.' },
    { name: 'interval', type: 'number', default: '30', description: 'Minutes between options.' },
    { name: 'min / max', type: 'string', description: 'Bounds the generated list — business hours, a booking window.' },
    { name: 'hour12 / locale', type: 'boolean / string', description: 'Display only; formatting goes through Intl.' },
    { name: 'no free entry', type: 'by design', description: 'Typing a time is a parsing problem with a dozen ambiguous cases ("230", "2.30", "14h"); for scheduling, slots are what people want.' },
  ],
  demos: [
    {
      title: 'Slots',
      stack: true,
      code: `<TimePicker defaultValue="09:30" interval={15} />`,
      render: () => (
        <div className="w-full max-w-xs">
          <TimePicker defaultValue="09:30" interval={15} />
        </div>
      ),
    },
  ],
}

export const colorPickerEntry: ComponentEntry = {
  id: 'color-picker',
  label: 'Color Picker',
  description:
    'A palette first, free entry second. Most product colour pickers choose a label or category colour, where an arbitrary hex is a liability — a gradient invites a colour nobody can read text on.',
  usage: `import { ColorPicker } from '@/components/ui/color-picker'

<ColorPicker value={color} onValueChange={setColor} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'allowCustom', label: 'allowCustom', default: true }],
    render: (state) => (
      <div className="w-full max-w-xs">
        <ColorPicker defaultValue="#8b5cf6" allowCustom={Boolean(state.allowCustom)} />
      </div>
    ),
    code: (s: ComposerState) =>
      `<ColorPicker\n  value={color}\n  onValueChange={setColor}\n  allowCustom={${Boolean(s.allowCustom)}}\n/>`,
  },
  api: [
    { name: 'value / onValueChange', type: 'string', description: 'Any CSS colour; the palette supplies hex.' },
    { name: 'swatches', type: 'string[]', description: 'Overrides the default twenty. `DEFAULT_SWATCHES` is exported.' },
    { name: 'allowCustom', type: 'boolean', default: 'true', description: 'Adds the hex field and the native picker. The native input is an escape hatch, not the main control — it opens the unstyleable OS picker.' },
    { name: 'tick contrast', type: 'readableInk', description: 'Shared with LabelPicker, so the check mark is visible on both a pale yellow and a navy.' },
  ],
  demos: [
    {
      title: 'Palette',
      stack: true,
      code: `<ColorPicker defaultValue="#8b5cf6" />`,
      render: () => (
        <div className="w-full max-w-xs">
          <ColorPicker defaultValue="#8b5cf6" />
        </div>
      ),
    },
  ],
}

export const maskInputEntry: ComponentEntry = {
  id: 'mask-input',
  label: 'Mask Input',
  description:
    'Formats as you type — card numbers, phone numbers, dates. Hands back the raw characters alongside the formatted text, so a form does not submit "(555) 010-9999" to an API expecting digits.',
  usage: `import { MaskInput } from '@/components/ui/mask-input'

<MaskInput mask="#### #### #### ####" onValueChange={(text, raw) => setCard(raw)} />`,
  composer: {
    controls: [
      {
        type: 'select',
        prop: 'mask',
        label: 'mask',
        options: ['#### #### #### ####', '(###) ###-####', '##/##/####', 'AA-####'],
        default: '#### #### #### ####',
      },
    ],
    render: (state) => (
      <div className="w-full max-w-xs">
        <MaskInput key={String(state.mask)} mask={String(state.mask)} />
      </div>
    ),
    code: (s: ComposerState) => `<MaskInput mask="${s.mask}" onValueChange={handle} />`,
  },
  api: [
    { name: 'mask', type: 'string', description: '`#` a digit, `A` a letter, `*` either. Anything else is a literal the component inserts.' },
    { name: 'onValueChange', type: '(formatted, raw) => void', description: 'Both forms, so the display value and the submitted value can differ.' },
    { name: 'backspace', type: 'handled', description: 'Deleting into a literal removes the character before it, so backspace over the space in "4242 4242" takes a digit rather than sticking.' },
    { name: 'paste', type: 'handled', description: 'Characters that do not fit a slot are skipped rather than stopping the fill, so pasting "4242-4242" into a digits mask keeps the digits.' },
  ],
  demos: [
    {
      title: 'Masks',
      stack: true,
      code: `<MaskInput mask="#### #### #### ####" />
<MaskInput mask="(###) ###-####" />`,
      render: () => (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <MaskInput mask="#### #### #### ####" />
          <MaskInput mask="(###) ###-####" />
          <MaskInput mask="##/##/####" />
        </div>
      ),
    },
  ],
}

/** Selectable marks for the composer. */
const RATING_ICONS = { Hexagon, Star, Heart, Circle } as const

export const ratingEntry: ComponentEntry = {
  id: 'rating',
  label: 'Rating',
  description:
    'A rating, readable or settable, drawn with monochrome marks. The icon is a prop; read-only renders one image with a text alternative — "4 out of 5" — rather than five separate announcements.',
  usage: `import { Rating } from '@/components/ui/rating'

<Rating value={rating} onValueChange={setRating} />
<Rating value={4.5} readOnly showValue />`,
  composer: {
    controls: [
      { type: 'select', prop: 'icon', label: 'icon', options: ['Hexagon', 'Star', 'Heart', 'Circle'], default: 'Hexagon' },
      { type: 'boolean', prop: 'readOnly', label: 'readOnly', default: false },
      { type: 'boolean', prop: 'showValue', label: 'showValue', default: false },
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default', 'lg'], default: 'default' },
    ],
    render: (state) => (
      <Rating
        defaultValue={state.readOnly ? 4.5 : 3}
        icon={RATING_ICONS[String(state.icon) as keyof typeof RATING_ICONS]}
        readOnly={Boolean(state.readOnly)}
        showValue={Boolean(state.showValue)}
        size={String(state.size) as 'sm' | 'default' | 'lg'}
      />
    ),
    code: (s: ComposerState) =>
      `<Rating\n  value={rating}\n  onValueChange={setRating}\n  icon={${s.icon}}\n  readOnly={${Boolean(s.readOnly)}}\n  showValue={${Boolean(s.showValue)}}\n/>`,
  },
  api: [
    { name: 'value / onValueChange', type: 'number', description: 'Clicking the current value clears it back to zero.' },
    { name: 'readOnly', type: 'boolean', default: 'false', description: 'Switches from a radio group to a single labelled image.' },
    { name: 'count', type: 'number', default: '5', description: 'Number of marks.' },
    { name: 'icon', type: 'ComponentType<{ className?: string }>', default: 'Hexagon', description: 'The mark — any lucide icon or your own SVG component. A component, not an element: each mark renders twice, once as the outline and once clipped for the fill, so an element would leave a half value with nothing to clip.' },
    { name: 'half values', type: 'display', description: 'Rendered by clipping the icon rather than a second half-filled glyph, so 3.5 stays aligned with 3 on the same grid.' },
  ],
  demos: [
    {
      title: 'Icons and states',
      stack: true,
      code: `<Rating defaultValue={3} />
<Rating defaultValue={4} icon={Star} />
<Rating value={4.5} readOnly showValue />`,
      render: () => (
        <div className="flex flex-col gap-3">
          <Rating defaultValue={3} />
          <Rating defaultValue={4} icon={Star} />
          <Rating defaultValue={2} icon={Heart} />
          <Rating value={4.5} readOnly showValue />
        </div>
      ),
    },
  ],
}

function RangeDemo({
  size = 'default',
  step = 10,
  showValues = true,
  disabled = false,
}: {
  size?: 'sm' | 'default' | 'lg'
  step?: number
  showValues?: boolean
  disabled?: boolean
} = {}) {
  const [value, setValue] = useState<[number, number]>([200, 800])
  return (
    <div className="w-full max-w-sm">
      <RangeSlider
        min={0}
        max={1000}
        step={step}
        size={size}
        value={value}
        onValueChange={setValue}
        label="Price"
        showValues={showValues}
        disabled={disabled}
        formatValue={(n) => `$${n}`}
      />
    </div>
  )
}

export const rangeSliderEntry: ComponentEntry = {
  id: 'range-slider',
  label: 'Range Slider',
  description:
    'Two thumbs over one track. Slider is a restyled native input[type=range], which has exactly one thumb by construction — so a range needs a custom control with the ARIA written out.',
  usage: `import { RangeSlider } from '@/components/ui/range-slider'

<RangeSlider min={0} max={1000} step={10} value={range} onValueChange={setRange} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default', 'lg'], default: 'default' },
      { type: 'number', prop: 'step', label: 'step', default: 10, min: 1, max: 100, step: 1 },
      { type: 'boolean', prop: 'showValues', label: 'showValues', default: true },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state: ComposerState) => (
      <RangeDemo
        size={state.size as 'sm' | 'default' | 'lg'}
        step={Number(state.step)}
        showValues={Boolean(state.showValues)}
        disabled={Boolean(state.disabled)}
      />
    ),
    code: () => `<RangeSlider\n  min={0}\n  max={1000}\n  step={10}\n  value={range}\n  onValueChange={setRange}\n  showValues\n/>`,
  },
  api: [
    { name: 'value / onValueChange', type: '[number, number]', description: 'Always sorted low-to-high on write.' },
    { name: 'onValueCommit', type: '(value) => void', description: 'Fires once on release, for anything expensive to run per frame.' },
    { name: 'crossing', type: 'thumbs swap', description: 'Dragging the low thumb past the high one swaps which is which. Clamping is more common and feels broken — the pointer keeps moving while the thumb stays put.' },
    { name: 'accessibility', type: 'two sliders', description: 'Each thumb is a button with role="slider" and its own bounds, so both are tab stops and both announce.' },
    { name: 'size', type: "'sm' | 'default' | 'lg'", description: 'Reads the shared sliderSize tokens, so it lines up with a plain Slider of the same size.' },
  ],
  demos: [
    { title: 'Price range', stack: true, code: `<RangeSlider min={0} max={1000} step={10} showValues />`, render: () => <RangeDemo /> },
  ],
}

export const FORM_VARIANTS = FIELD_VARIANTS
