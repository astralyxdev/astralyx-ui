import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ComponentEntry, ComposerState } from './types'

const SIDES = ['top', 'right', 'bottom', 'left'] as const
const ALIGNS = ['start', 'center', 'end'] as const

function MenuPreview({ side, align, checkboxes }: {
  side: (typeof SIDES)[number]
  align: (typeof ALIGNS)[number]
  checkboxes: boolean
}) {
  const [dense, setDense] = useState(true)
  const [wrap, setWrap] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align}>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>Edit<DropdownMenuShortcut>⌘E</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuItem>Duplicate<DropdownMenuShortcut>⌘D</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuSeparator />
        {checkboxes ? (
          <>
            <DropdownMenuCheckboxItem checked={dense} onCheckedChange={setDense}>
              Dense rows
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={wrap} onCheckedChange={setWrap}>
              Wrap text
            </DropdownMenuCheckboxItem>
          </>
        ) : (
          <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[var(--destructive-soft-foreground)]">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function composeMenu(state: ComposerState) {
  const attrs: string[] = []
  if (state.side !== 'bottom') attrs.push(`side="${state.side}"`)
  if (state.align !== 'start') attrs.push(`align="${state.align}"`)
  return `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon"><MoreHorizontal /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent${attrs.length ? ' ' + attrs.join(' ') : ''}>
    <DropdownMenuLabel>Actions</DropdownMenuLabel>
    <DropdownMenuItem>Edit<DropdownMenuShortcut>⌘E</DropdownMenuShortcut></DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`
}

export const dropdownMenuEntry: ComponentEntry = {
  id: 'dropdown-menu',
  label: 'Dropdown Menu',
  description:
    'A menu of actions hung off a trigger. Unlike Select this is a list of commands, not a value — items are buttons, the menu closes on activation, and focus returns to the trigger.',
  usage: `import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button>Actions</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={edit}>Edit</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'side', label: 'side', options: SIDES, default: 'bottom' },
      { type: 'select', prop: 'align', label: 'align', options: ALIGNS, default: 'start' },
      { type: 'boolean', prop: 'checkboxes', label: 'checkbox items', default: false },
    ],
    render: (state) => (
      <MenuPreview
        side={String(state.side) as (typeof SIDES)[number]}
        align={String(state.align) as (typeof ALIGNS)[number]}
        checkboxes={Boolean(state.checkboxes)}
      />
    ),
    code: composeMenu,
  },
  api: [
    { name: 'open / defaultOpen', type: 'boolean', description: 'Controlled and uncontrolled open state.' },
    { name: 'side / align / offset', type: 'placement', description: 'Same popper placement options as Popover.' },
    { name: 'DropdownMenuItem onSelect', type: '() => void', description: 'Fires on activation, before the menu closes.' },
    { name: 'DropdownMenuCheckboxItem', type: 'checked, onCheckedChange', description: 'A menu item that carries state. Uses role="menuitemcheckbox".' },
    { name: 'DropdownMenuLabel / DropdownMenuSeparator / DropdownMenuShortcut', type: 'presentational', description: 'Section heading, divider, and right-aligned key hint.' },
  ],
  demos: [
    { title: 'Default', code: `<DropdownMenu>…</DropdownMenu>`, render: () => <MenuPreview side="bottom" align="start" checkboxes={false} /> },
    { title: 'With checkbox items', code: `<DropdownMenuCheckboxItem checked={dense} onCheckedChange={setDense}>Dense rows</DropdownMenuCheckboxItem>`, render: () => <MenuPreview side="bottom" align="start" checkboxes /> },
  ],
}
