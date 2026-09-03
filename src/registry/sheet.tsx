import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetBody, SheetContent, SheetDescription,
  SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import type { ComponentEntry } from './types'

const SIDES = ['right', 'left', 'top', 'bottom'] as const

function SheetPreview({
  side,
  showClose,
  width,
}: {
  side: (typeof SIDES)[number]
  showClose: boolean
  width?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Open {side}</Button>
      </SheetTrigger>
      <SheetContent side={side} showClose={showClose} width={width}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow the results below.</SheetDescription>
        </SheetHeader>
        <SheetBody>Sheet content goes here.</SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Apply</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export const sheetEntry: ComponentEntry = {
  id: 'sheet',
  label: 'Sheet',
  description:
    'A panel that slides in from an edge. Same native <dialog> machinery as Dialog, pinned to one side — so it inherits the focus trap and Escape handling.',
  usage: `import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet'

<Sheet>
  <SheetTrigger asChild><Button>Filters</Button></SheetTrigger>
  <SheetContent side="right">
    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
    <SheetBody>…</SheetBody>
  </SheetContent>
</Sheet>`,
  composer: {
    controls: [
      { type: 'select', prop: 'side', label: 'side', options: SIDES, default: 'right' },
      { type: 'boolean', prop: 'showClose', label: 'showClose', default: true },
      { type: 'select', prop: 'width', label: 'width', options: ['default', '20rem', '32rem', '50vw'], default: 'default' },
    ],
    render: (state) => (
      <SheetPreview
        side={String(state.side) as (typeof SIDES)[number]}
        showClose={Boolean(state.showClose)}
        width={state.width === 'default' ? undefined : String(state.width)}
      />
    ),
    code: (state) =>
      `<SheetContent\n  side="${state.side}"\n${state.showClose ? '' : '  showClose={false}\n'}${state.width !== 'default' ? `  width="${state.width}"\n` : ''}>\n  …\n</SheetContent>`,
  },
  api: [
    { name: 'side', type: SIDES.map((s) => `'${s}'`).join(' | '), default: "'right'", description: 'Which edge the panel is pinned to, and the direction it enters from.' },
    { name: 'open / defaultOpen', type: 'boolean', description: 'Controlled and uncontrolled open state.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Fires on every change, including Escape.' },
    { name: 'showClose / dismissable', type: 'boolean', default: 'true', description: 'Corner close button, and whether a backdrop press closes.' },
    { name: 'width', type: 'string', default: "'min(24rem, 100vw - 2rem)'", description: 'Any CSS length. Applies to a left or right sheet.' },
    { name: 'height', type: 'string', description: 'Any CSS length, for a top or bottom sheet.' },
    { name: 'edges', type: 'no border', description: 'A sheet meets the viewport on three sides, so it draws no outline — a border would only be a line down the middle of the screen.' },
  ],
  demos: [
    {
      title: 'Every side',
      code: `<SheetContent side="right" />`,
      render: () => (
        <>{SIDES.map((side) => <SheetPreview key={side} side={side} showClose />)}</>
      ),
    },
    {
      title: 'Custom width',
      code: `<SheetContent side="right" width="32rem" />`,
      render: () => (
        <>
          <SheetPreview side="right" showClose width="20rem" />
          <SheetPreview side="right" showClose width="32rem" />
          <SheetPreview side="right" showClose width="50vw" />
        </>
      ),
    },
  ],
}
