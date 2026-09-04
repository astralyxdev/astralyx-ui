import { useState } from 'react'
import { Grid2x2, LayoutList, Rows3 } from 'lucide-react'
import { Cascader, type CascaderOption } from '@/components/ui/cascader'
import { CurrencyInput } from '@/components/ui/currency-input'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { PhoneInput } from '@/components/ui/phone-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SignaturePad } from '@/components/ui/signature-pad'
import { Transfer, type TransferItem } from '@/components/ui/transfer'
import { TreeSelect, type TreeSelectNode } from '@/components/ui/tree-select'
import type { ComponentEntry } from './types'

/* --------------------------------------------------- segmented control */

function SegmentedDemo({ size = 'md', fullWidth = false }: { size?: 'sm' | 'md' | 'lg'; fullWidth?: boolean }) {
  const [view, setView] = useState('board')
  return (
    <SegmentedControl
      label="View"
      size={size}
      fullWidth={fullWidth}
      value={view}
      onValueChange={setView}
      options={[
        { value: 'board', label: <><Grid2x2 className="size-3.5" /> Board</> },
        { value: 'list', label: <><LayoutList className="size-3.5" /> List</> },
        { value: 'table', label: <><Rows3 className="size-3.5" /> Table</> },
      ]}
    />
  )
}

export const segmentedControlEntry: ComponentEntry = {
  id: 'segmented-control',
  label: 'Segmented Control',
  isNew: true,
  description:
    'A small set of mutually exclusive choices shown at once, built from real radio inputs in a fieldset — so arrow keys, form submission and screen-reader announcement all work without any script.',
  usage: `import { SegmentedControl } from '@/components/ui/segmented-control'

<SegmentedControl label="View" options={options} value={view} onValueChange={setView} />`,
  composer: {
    controls: [
      {
        type: 'select',
        prop: 'size',
        label: 'size',
        default: 'md',
        options: ['sm', 'md', 'lg'],
      },
      { type: 'boolean', prop: 'fullWidth', label: 'fullWidth', default: false },
    ],
    render: (state) => (
      <SegmentedDemo size={state.size as 'sm' | 'md' | 'lg'} fullWidth={Boolean(state.fullWidth)} />
    ),
    code: (state) =>
      `<SegmentedControl\n  label="View"\n  options={options}\n  size="${state.size}"\n  fullWidth={${Boolean(state.fullWidth)}}\n/>`,
  },
  api: [
    { name: 'options', type: 'Segment[]', description: '{ value, label, srLabel?, disabled? }. Keep it under about five with short labels.' },
    { name: 'radios, not buttons', type: 'fieldset', description: 'It picks a value, so it is a radio group. A row of buttons with aria-pressed gets arrow keys, :checked and form submission wrong.' },
    { name: 'vs ButtonGroup / Tabs', type: 'different jobs', description: 'A button group is independent actions; tabs switch a visible panel and carry aria-controls. This sets a value.' },
    { name: 'indicator', type: 'one element', description: 'Positioned by index rather than a background on the selected item, so it slides instead of blinking and there is one thing to animate.' },
    { name: 'fullWidth', type: 'boolean', default: 'false', description: 'Fill the container, splitting the width evenly.' },
  ],
  demos: [
    { title: 'Choosing a view', code: `<SegmentedControl label="View" options={options} />`, render: () => <SegmentedDemo /> },
  ],
}

/* ------------------------------------------------------------ phone */

function PhoneDemo() {
  const [value, setValue] = useState('+442079460958')
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <PhoneInput value={value} onChange={setValue} />
      <p className="text-muted-foreground font-mono text-xs">{value || '—'}</p>
    </div>
  )
}

export const phoneInputEntry: ComponentEntry = {
  id: 'phone-input',
  label: 'Phone Input',
  isNew: true,
  description:
    'A country selector and a national number that together produce E.164 — the shape every telephony API wants. Honest about not being a validator.',
  usage: `import { PhoneInput } from '@/components/ui/phone-input'

<PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />`,
  composer: {
    controls: [
      {
        type: 'select',
        prop: 'size',
        label: 'size',
        default: 'md',
        options: ['sm', 'md', 'lg'],
      },
    ],
    render: (state) => (
      <PhoneInput
        className="w-full max-w-sm"
        size={state.size as 'sm' | 'md' | 'lg'}
        defaultValue="+14155550123"
      />
    ),
    code: (state) => `<PhoneInput size="${state.size}" value={phone} onChange={setPhone} />`,
  },
  api: [
    { name: 'value', type: 'E.164', description: '`+441632960961` — digits and a leading plus. Storing the pretty version means every consumer re-parses it and they disagree about how.' },
    { name: 'not a validator', type: 'stated plainly', description: 'Real validation is a per-country length and prefix table that changes as regulators allocate ranges. That is libphonenumber, and it is 200 kB+. This checks a plausible length and reports it through `onValidChange` without blocking typing.' },
    { name: 'vs MaskInput', type: 'why a mask fails', description: 'Formatting is per country and often per prefix inside one. A fixed `(___) ___-____` is wrong for most of the world and blocks valid numbers.' },
    { name: 'countries', type: 'Country[]', description: 'A short default is exported as `COMMON_COUNTRIES`. The right list is usually "the countries you ship to", not all 249.' },
    { name: 'autoComplete', type: 'tel-national', description: 'Set so a password manager can fill it, with `inputMode="tel"` for the phone keypad.' },
  ],
  demos: [
    { title: 'Producing E.164', stack: true, code: `<PhoneInput value={value} onChange={setValue} />`, render: () => <PhoneDemo /> },
  ],
}

/* --------------------------------------------------------- currency */

function CurrencyDemo({ currency = 'USD' }: { currency?: string }) {
  const [amount, setAmount] = useState<number | null>(129_900)
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <CurrencyInput value={amount} onChange={setAmount} currency={currency} showCode />
      <p className="text-muted-foreground font-mono text-xs">
        minor units: {amount === null ? 'null' : amount}
      </p>
    </div>
  )
}

export const currencyInputEntry: ComponentEntry = {
  id: 'currency-input',
  label: 'Currency Input',
  isNew: true,
  description:
    'A money field whose value is an integer number of minor units, formatted only while unfocused. Reads its decimal count from Intl, so zero-decimal currencies work without a special case.',
  usage: `import { CurrencyInput } from '@/components/ui/currency-input'

<CurrencyInput value={cents} onChange={setCents} currency="EUR" />`,
  composer: {
    controls: [
      {
        type: 'select',
        prop: 'currency',
        label: 'currency',
        default: 'USD',
        options: ['USD', 'EUR', 'GBP', 'JPY'],
      },
    ],
    render: (state) => <CurrencyDemo currency={String(state.currency)} />,
    code: (state) => `<CurrencyInput\n  value={amount}\n  onChange={setAmount}\n  currency="${state.currency}"\n/>`,
  },
  api: [
    { name: 'value', type: 'minor units', description: '`1234` is $12.34. Floats cannot represent most decimal fractions, so a total assembled from float prices drifts by a cent — and every payment API takes integer minor units for that reason.' },
    { name: 'zero-decimal currencies', type: 'from Intl', description: 'JPY, KRW and VND have no minor unit. The decimal count is resolved per currency rather than assumed to be two.' },
    { name: 'formatting', type: 'on blur only', description: 'Reformatting under the caret is the classic money-input bug: you type `1`, it becomes `$1.00`, and the caret jumps behind the decimals.' },
    { name: 'type', type: 'text, not number', description: 'A number input lets the scroll wheel change the amount, rejects grouping separators, and its spinners are meaningless for money.' },
    { name: 'min / max', type: 'number', description: 'Clamped on blur. Also in minor units.' },
  ],
  demos: [
    { title: 'Cents in, cents out', stack: true, code: `<CurrencyInput value={cents} onChange={setCents} />`, render: () => <CurrencyDemo /> },
  ],
}

/* -------------------------------------------------------- signature */

export const signaturePadEntry: ComponentEntry = {
  id: 'signature-pad',
  label: 'Signature Pad',
  isNew: true,
  description:
    'A canvas you sign with a finger, stylus or mouse. Strokes are kept as points and redrawn, so undo, resize and export all work — and stylus pressure varies the line.',
  usage: `import { SignaturePad } from '@/components/ui/signature-pad'

<SignaturePad onSign={(blob) => upload(blob)} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'penWidth', label: 'penWidth', default: 2, min: 1, max: 6, step: 1 },
      { type: 'boolean', prop: 'guideline', label: 'guideline', default: true },
    ],
    render: (state) => (
      <SignaturePad
        className="w-full max-w-md"
        penWidth={Number(state.penWidth) || 2}
        guideline={Boolean(state.guideline)}
        onSign={() => {}}
      />
    ),
    code: (state) =>
      `<SignaturePad\n  penWidth={${Number(state.penWidth) || 2}}\n  onSign={(blob) => upload(blob)}\n/>`,
  },
  api: [
    { name: 'value', type: 'Stroke[]', description: 'Points, not pixels. Drawing straight to the canvas with no model makes undo impossible and loses the drawing on resize.' },
    { name: 'pointer events', type: 'one set', description: 'Mouse, finger and pen through one path, with `pressure` from a stylus varying the width. `touch-action: none` is essential or the first stroke scrolls the page.' },
    { name: 'device pixel ratio', type: 'handled', description: 'The backing store is scaled up and the context scaled down; a canvas sized in CSS pixels is visibly soft, and a signature is a thing people zoom into.' },
    { name: 'not a digital signature', type: 'a picture', description: 'Fine as a record that someone signed; proves nothing cryptographically. For non-repudiation, sign a hash of the document with a key.' },
    { name: 'onSign', type: '(blob, strokes) => void', description: 'Flattened image on demand, via `toBlob`.' },
  ],
  demos: [
    {
      title: 'Sign, undo, clear',
      stack: true,
      code: `<SignaturePad onSign={(blob) => upload(blob)} />`,
      render: () => <SignaturePad className="w-full max-w-md" onSign={() => {}} />,
    },
  ],
}

/* --------------------------------------------------------- transfer */

const PERMISSIONS: TransferItem[] = [
  { value: 'billing.read', label: 'billing.read' },
  { value: 'billing.write', label: 'billing.write' },
  { value: 'users.read', label: 'users.read' },
  { value: 'users.write', label: 'users.write' },
  { value: 'users.invite', label: 'users.invite' },
  { value: 'keys.read', label: 'keys.read' },
  { value: 'keys.rotate', label: 'keys.rotate' },
  { value: 'logs.read', label: 'logs.read' },
  { value: 'logs.export', label: 'logs.export' },
  { value: 'deploy.create', label: 'deploy.create' },
  { value: 'deploy.rollback', label: 'deploy.rollback' },
  { value: 'settings.write', label: 'settings.write', disabled: true },
]

function TransferDemo({ searchable = true }: { searchable?: boolean }) {
  const [granted, setGranted] = useState(['users.read', 'logs.read', 'deploy.create'])
  return (
    <Transfer
      className="w-full"
      items={PERMISSIONS}
      value={granted}
      onChange={setGranted}
      searchable={searchable}
      titles={['Available', 'Granted']}
    />
  )
}

export const transferEntry: ComponentEntry = {
  id: 'transfer',
  label: 'Transfer',
  isNew: true,
  description:
    'Two lists and the movement between them, for choosing a subset from a large pool. Both sides are searchable — filtering the target is what makes a 200-item selection usable.',
  usage: `import { Transfer } from '@/components/ui/transfer'

<Transfer items={items} value={selected} onChange={setSelected} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'searchable', label: 'searchable', default: true },
      { type: 'number', prop: 'height', label: 'height', default: 240, min: 140, max: 360, step: 20 },
    ],
    render: (state) => <TransferDemo searchable={Boolean(state.searchable)} />,
    code: (state) =>
      `<Transfer\n  items={items}\n  value={selected}\n  onChange={setSelected}\n  searchable={${Boolean(state.searchable)}}\n/>`,
  },
  api: [
    { name: 'items / value', type: 'TransferItem[] / string[]', description: '{ value, label, keywords?, disabled? }. `value` holds what is on the right.' },
    { name: 'vs MultiSelect', type: 'a list, not chips', description: 'Past about a dozen, chips wrap into a wall you cannot scan, search or sort — and "did I already add Maria?" stops being answerable at a glance.' },
    { name: 'both sides searchable', type: 'the useful half', description: 'Filtering the source is obvious. Filtering the target is what most implementations leave out.' },
    { name: 'selection', type: 'clears on move', description: 'The rows are no longer where you left them, so keeping them ticked would be misleading.' },
    { name: 'titles', type: '[ReactNode, ReactNode]', default: "['Available', 'Selected']", description: 'Headings for the two panels.' },
  ],
  demos: [
    { title: 'Granting permissions', stack: true, code: `<Transfer items={permissions} value={granted} onChange={setGranted} />`, render: () => <TransferDemo /> },
  ],
}

/* --------------------------------------------------------- cascader */

const REGIONS: CascaderOption[] = [
  {
    value: 'eu',
    label: 'Europe',
    children: [
      { value: 'de', label: 'Germany', children: [{ value: 'ber', label: 'Berlin' }, { value: 'muc', label: 'Munich' }] },
      { value: 'fr', label: 'France', children: [{ value: 'par', label: 'Paris' }, { value: 'lyo', label: 'Lyon' }] },
      { value: 'pl', label: 'Poland', children: [{ value: 'waw', label: 'Warsaw' }, { value: 'krk', label: 'Kraków' }] },
    ],
  },
  {
    value: 'na',
    label: 'North America',
    children: [
      { value: 'us', label: 'United States', children: [{ value: 'nyc', label: 'New York' }, { value: 'sfo', label: 'San Francisco' }] },
      { value: 'ca', label: 'Canada', children: [{ value: 'yyz', label: 'Toronto' }, { value: 'yvr', label: 'Vancouver' }] },
    ],
  },
  {
    value: 'apac',
    label: 'Asia Pacific',
    children: [
      { value: 'jp', label: 'Japan', children: [{ value: 'tyo', label: 'Tokyo' }] },
      { value: 'sg', label: 'Singapore', children: [{ value: 'sin', label: 'Singapore' }] },
      { value: 'au', label: 'Australia', children: [{ value: 'syd', label: 'Sydney' }] },
    ],
  },
]

function CascaderDemo({ changeOnSelect = false }: { changeOnSelect?: boolean }) {
  const [path, setPath] = useState<string[]>(['eu', 'de', 'ber'])
  return (
    <Cascader
      className="w-64"
      options={REGIONS}
      value={path}
      onChange={setPath}
      changeOnSelect={changeOnSelect}
      label="Region"
    />
  )
}

export const cascaderEntry: ComponentEntry = {
  id: 'cascader',
  label: 'Cascader',
  isNew: true,
  description:
    'A regular hierarchy picked one level at a time, in side-by-side columns — so the path stays readable and the siblings you passed are still visible.',
  usage: `import { Cascader } from '@/components/ui/cascader'

<Cascader options={regions} value={path} onChange={setPath} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'changeOnSelect', label: 'changeOnSelect', default: false }],
    render: (state) => <CascaderDemo changeOnSelect={Boolean(state.changeOnSelect)} />,
    code: (state) =>
      `<Cascader\n  options={regions}\n  value={path}\n  onChange={setPath}\n  changeOnSelect={${Boolean(state.changeOnSelect)}}\n/>`,
  },
  api: [
    { name: 'options / value', type: 'CascaderOption[] / string[]', description: 'The value is the path from the root: `[\'eu\', \'de\', \'ber\']`.' },
    { name: 'columns', type: 'not a tree', description: 'For a real classification, columns show where you are and what the siblings were — which a tree of disclosure triangles hides as soon as it scrolls.' },
    { name: 'vs Tree', type: 'when to switch', description: 'Use `Tree` when the shape is uneven, when several branches must be open at once, or when depth varies wildly. This is for regular hierarchies two to four levels deep.' },
    { name: 'changeOnSelect', type: 'boolean', default: 'false', description: 'The difference between "pick a city" and "pick anywhere, at any level".' },
    { name: 'expandOnHover', type: 'boolean', default: 'true', description: 'Browsing opens the next column without committing anything.' },
  ],
  demos: [
    { title: 'Region, country, city', stack: true, code: `<Cascader options={regions} value={path} onChange={setPath} />`, render: () => <CascaderDemo /> },
  ],
}

/* ------------------------------------------------------ tree select */

const SCOPES: TreeSelectNode[] = [
  {
    value: 'repo',
    label: 'Repository',
    children: [
      { value: 'repo.read', label: 'Read code' },
      { value: 'repo.write', label: 'Push code' },
      { value: 'repo.admin', label: 'Administer' },
    ],
  },
  {
    value: 'issues',
    label: 'Issues',
    children: [
      { value: 'issues.read', label: 'Read issues' },
      { value: 'issues.write', label: 'Create and comment' },
      { value: 'issues.delete', label: 'Delete' },
    ],
  },
  {
    value: 'actions',
    label: 'Actions',
    children: [
      { value: 'actions.read', label: 'Read runs' },
      { value: 'actions.run', label: 'Trigger runs' },
      {
        value: 'actions.secrets',
        label: 'Secrets',
        children: [
          { value: 'actions.secrets.read', label: 'Read names' },
          { value: 'actions.secrets.write', label: 'Set values' },
        ],
      },
    ],
  },
]

function TreeSelectDemo() {
  const [scopes, setScopes] = useState(['repo.read', 'issues.read', 'issues.write'])
  return (
    <TreeSelect
      className="w-72"
      nodes={SCOPES}
      value={scopes}
      onChange={setScopes}
      defaultExpanded={['repo', 'issues']}
      label="Scopes"
      summary={(values) => `${values.length} scopes`}
    />
  )
}

export const treeSelectEntry: ComponentEntry = {
  id: 'tree-select',
  label: 'Tree Select',
  isNew: true,
  description:
    'A tree in a popover with real tri-state parents. Checking a branch checks its subtree, the value holds only leaves, and searching keeps the ancestors of every match.',
  usage: `import { TreeSelect } from '@/components/ui/tree-select'

<TreeSelect nodes={scopes} value={selected} onChange={setSelected} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'searchable', label: 'searchable', default: true }],
    render: () => <TreeSelectDemo />,
    code: (state) => `<TreeSelect\n  nodes={scopes}\n  value={selected}\n  onChange={setSelected}\n  searchable={${Boolean(state.searchable)}}\n/>`,
  },
  api: [
    { name: 'nodes / value', type: 'TreeSelectNode[] / string[]', description: 'The value holds leaves only — a parent in the list would leave every consumer guessing whether it implies its children.' },
    { name: 'tri-state', type: 'the whole problem', description: 'A partly-chosen parent is neither checked nor unchecked. Rendering it as unchecked is a lie people act on: they tick it and silently replace a careful selection with everything.' },
    { name: 'indeterminate', type: 'a property', description: 'Not an HTML attribute, so it cannot be expressed in JSX — it is set through a ref callback, with `aria-checked="mixed"` carrying the same fact.' },
    { name: 'search', type: 'keeps ancestors', description: 'A result with its path cut off is unplaceable: you cannot tell which "General" you found. Matching branches are force-opened.' },
    { name: 'summary', type: '(values) => ReactNode', description: 'Summarises the selection on the trigger.' },
  ],
  demos: [
    { title: 'Token scopes', stack: true, code: `<TreeSelect nodes={scopes} value={selected} onChange={setSelected} />`, render: () => <TreeSelectDemo /> },
  ],
}

/* ------------------------------------------------------ emoji picker */

function EmojiDemo({ columns = 8 }: { columns?: number }) {
  const [recent, setRecent] = useState<string[]>(['🚀', '👍', '🐛'])
  const [picked, setPicked] = useState('🚀')
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">
        Reacted with <span className="text-2xl align-middle">{picked}</span>
      </p>
      <EmojiPicker
        columns={columns}
        recent={recent}
        onSelect={(emoji) => {
          setPicked(emoji.char)
          setRecent((current) => [emoji.char, ...current.filter((c) => c !== emoji.char)].slice(0, 8))
        }}
      />
    </div>
  )
}

export const emojiPickerEntry: ComponentEntry = {
  id: 'emoji-picker',
  label: 'Emoji Picker',
  isNew: true,
  description:
    'A grouped, searchable grid with recents, rendered as text rather than sprites. One tab stop with arrow-key movement, and it never touches localStorage.',
  usage: `import { EmojiPicker } from '@/components/ui/emoji-picker'

<EmojiPicker recent={recent} onSelect={(emoji) => react(emoji.char)} />`,
  composer: {
    tall: true,
    controls: [{ type: 'number', prop: 'columns', label: 'columns', default: 8, min: 5, max: 10, step: 1 }],
    render: (state) => <EmojiDemo columns={Number(state.columns) || 8} />,
    code: (state) =>
      `<EmojiPicker\n  columns={${Number(state.columns) || 8}}\n  recent={recent}\n  onSelect={(emoji) => react(emoji.char)}\n/>`,
  },
  api: [
    { name: 'emoji', type: 'Emoji[]', description: 'A curated default is exported as `COMMON_EMOJI`. A full set with keywords is ~200 kB of JSON that needs updating every Unicode release; pass your own if you need it.' },
    { name: 'text, not sprites', type: 'system fonts', description: 'Already installed, already right for the platform, scale as text, cost nothing to load. Sprite sheets buy identical rendering everywhere, at the cost of shipping and maintaining the sheet.' },
    { name: 'recent', type: 'string[]', description: 'Persisted by the caller. A picker that writes to localStorage itself cannot be server-rendered predictably and puts a key in a browser nobody chose.' },
    { name: 'roving tabindex', type: 'one tab stop', description: 'Arrow keys move within the grid, crossing group boundaries in reading order. Eight tab stops a row is unusable.' },
    { name: 'columns', type: 'number', default: '8', description: 'Grid width. Also the arrow-key row size.' },
  ],
  demos: [
    { title: 'Reacting, with recents', stack: true, code: `<EmojiPicker recent={recent} onSelect={react} />`, render: () => <EmojiDemo /> },
  ],
}
