import { useState } from 'react'
import {
  Bold, Copy, Italic, Link2, Minus, Plus, Search, Underline,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ButtonGroup, ButtonGroupSeparator, ButtonGroupText,
} from '@/components/ui/button-group'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { ComponentEntry, ComposerState } from './types'

const ORIENTATIONS = ['horizontal', 'vertical'] as const

function composeGroup(state: ComposerState) {
  const attrs: string[] = []
  if (state.orientation !== 'horizontal') attrs.push(`orientation="${state.orientation}"`)
  if (state.grow) attrs.push('grow')
  const open = attrs.length ? `<ButtonGroup ${attrs.join(' ')}>` : '<ButtonGroup>'

  if (state.shape === 'field') {
    return `${open}\n  <Input placeholder="Search components" />\n  <Button>Search</Button>\n</ButtonGroup>`
  }
  if (state.shape === 'addon') {
    return `${open}\n  <ButtonGroupText>https://</ButtonGroupText>\n  <Input defaultValue="astralyx.dev" />\n</ButtonGroup>`
  }
  return `${open}\n  <Button variant="secondary">Copy</Button>\n  <Button variant="secondary">Paste</Button>\n  <Button variant="secondary">Cut</Button>\n</ButtonGroup>`
}

function Preview({
  shape,
  orientation,
  grow,
}: {
  shape: string
  orientation: (typeof ORIENTATIONS)[number]
  grow: boolean
}) {
  if (shape === 'field') {
    return (
      <ButtonGroup orientation={orientation} grow={grow} className={grow ? 'max-w-sm' : ''}>
        <Input variant="secondary" placeholder="Search components" />
        <Button>Search</Button>
      </ButtonGroup>
    )
  }

  if (shape === 'addon') {
    return (
      <ButtonGroup orientation={orientation} grow={grow} className={grow ? 'max-w-sm' : ''}>
        <ButtonGroupText>https://</ButtonGroupText>
        <Input variant="secondary" defaultValue="astralyx.dev" aria-label="Domain" />
      </ButtonGroup>
    )
  }

  return (
    <ButtonGroup orientation={orientation} grow={grow}>
      <Button variant="secondary">Copy</Button>
      <Button variant="secondary">Paste</Button>
      <Button variant="secondary">Cut</Button>
    </ButtonGroup>
  )
}

function Stepper() {
  const [value, setValue] = useState(3)
  return (
    <ButtonGroup>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Decrease"
        onClick={() => setValue((v) => Math.max(0, v - 1))}
      >
        <Minus />
      </Button>
      <ButtonGroupText className="w-14 justify-center tabular-nums">
        {value}
      </ButtonGroupText>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Increase"
        onClick={() => setValue((v) => v + 1)}
      >
        <Plus />
      </Button>
    </ButtonGroup>
  )
}

export const buttonGroupEntry: ComponentEntry = {
  id: 'button-group',
  label: 'Button Group',
  description:
    'Joins controls into one segmented unit — buttons, inputs, selects, or a mix. Inner corners are squared and adjacent borders overlap, so the row reads as a single control rather than a queue of separate ones.',
  usage: `import { ButtonGroup } from '@/components/ui/button-group'

<ButtonGroup>
  <Button variant="secondary">Copy</Button>
  <Button variant="secondary">Paste</Button>
</ButtonGroup>

<ButtonGroup grow>
  <Input placeholder="Search" />
  <Button>Search</Button>
</ButtonGroup>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'shape', label: 'contents', options: ['buttons', 'field', 'addon'], default: 'buttons' },
      { type: 'select', prop: 'orientation', label: 'orientation', options: ORIENTATIONS, default: 'horizontal' },
      { type: 'boolean', prop: 'grow', label: 'grow', default: false },
    ],
    render: (state) => (
      <Preview
        shape={String(state.shape)}
        orientation={String(state.orientation) as (typeof ORIENTATIONS)[number]}
        grow={Boolean(state.grow)}
      />
    ),
    code: composeGroup,
  },
  api: [
    {
      name: 'responsive',
      type: "'sm' | 'md' | 'lg' | false",
      default: 'false',
      description:
        'Breakpoint a horizontal group becomes a row at; below it the group stacks and welds its top and bottom edges instead of its sides. Defaults to false because a pair of icon buttons is fine at any width — set it for a field-and-button row, which is not. Ignored when orientation is vertical.',
    },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Which edges are joined. Vertical squares the top and bottom corners instead of the sides.' },
    { name: 'grow', type: 'boolean', default: 'false', description: 'Fill the width and let fields take the free space — the shape a search box plus a button wants.' },
    { name: 'ButtonGroupText', type: 'segment', description: 'A non-interactive segment: a unit, a prefix, a counter. Takes the same size scale as the controls beside it.' },
    { name: 'ButtonGroupSeparator', type: 'hairline', description: 'A rule between two segments that share a fill, where the collapsed borders leave no visible seam.' },
    { name: 'nested triggers', type: 'handled', description: 'Select and Combobox render a wrapper around their trigger, so the corner rules reach one level down as well as at the top level.' },
    { name: 'role', type: '"group"', description: 'Not "toolbar" — a toolbar implies arrow-key navigation between its controls. These are ordinary tab stops that happen to share edges.' },
  ],
  demos: [
    {
      title: 'Buttons',
      code: `<ButtonGroup>
  <Button variant="secondary">Copy</Button>
  <Button variant="secondary">Paste</Button>
  <Button variant="secondary">Cut</Button>
</ButtonGroup>`,
      render: () => (
        <>
          <ButtonGroup>
            <Button variant="secondary">Copy</Button>
            <Button variant="secondary">Paste</Button>
            <Button variant="secondary">Cut</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="secondary" size="icon" aria-label="Bold"><Bold /></Button>
            <Button variant="secondary" size="icon" aria-label="Italic"><Italic /></Button>
            <Button variant="secondary" size="icon" aria-label="Underline"><Underline /></Button>
            <Button variant="secondary" size="icon" aria-label="Link"><Link2 /></Button>
          </ButtonGroup>
        </>
      ),
    },
    {
      title: 'Field and button',
      stack: true,
      code: `<ButtonGroup grow>
  <Input placeholder="Search components" />
  <Button>Search</Button>
</ButtonGroup>`,
      render: () => (
        <>
          <ButtonGroup grow className="max-w-sm">
            <Input variant="secondary" icon={<Search />} placeholder="Search components" />
            <Button>Search</Button>
          </ButtonGroup>
          <ButtonGroup grow className="max-w-sm">
            <Select
              variant="secondary"
              defaultValue="all"
              options={[
                { value: 'all', label: 'All' },
                { value: 'forms', label: 'Forms' },
                { value: 'display', label: 'Display' },
              ]}
            />
            <Input variant="secondary" placeholder="Filter" />
            <Button size="icon" aria-label="Copy"><Copy /></Button>
          </ButtonGroup>
        </>
      ),
    },
    {
      title: 'With a text segment',
      stack: true,
      code: `<ButtonGroup grow>
  <ButtonGroupText>https://</ButtonGroupText>
  <Input defaultValue="astralyx.dev" />
</ButtonGroup>`,
      render: () => (
        <>
          <ButtonGroup grow className="max-w-sm">
            <ButtonGroupText>https://</ButtonGroupText>
            <Input variant="secondary" defaultValue="astralyx.dev" aria-label="Domain" />
          </ButtonGroup>
          <ButtonGroup grow className="max-w-sm">
            <Input variant="secondary" defaultValue="24.00" aria-label="Amount" />
            <ButtonGroupText>USD</ButtonGroupText>
          </ButtonGroup>
          <Stepper />
        </>
      ),
    },
    {
      title: 'With a combobox',
      stack: true,
      code: `<ButtonGroup grow>
  <Combobox options={frameworks} />
  <Button>Add</Button>
</ButtonGroup>`,
      render: () => (
        <ButtonGroup grow className="max-w-sm">
          <Combobox
            variant="secondary"
            defaultValue="react"
            options={[
              { value: 'react', label: 'React' },
              { value: 'vue', label: 'Vue' },
              { value: 'svelte', label: 'Svelte' },
            ]}
          />
          <Button>Add</Button>
        </ButtonGroup>
      ),
    },
    {
      title: 'Vertical',
      code: `<ButtonGroup orientation="vertical">…</ButtonGroup>`,
      render: () => (
        <ButtonGroup orientation="vertical">
          <Button variant="secondary">Top</Button>
          <ButtonGroupSeparator orientation="vertical" />
          <Button variant="secondary">Middle</Button>
          <Button variant="secondary">Bottom</Button>
        </ButtonGroup>
      ),
    },
  ],
}
