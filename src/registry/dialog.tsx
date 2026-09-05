import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['sm', 'default', 'lg', 'xl'] as const

function composeDialog(state: ComposerState) {
  const attrs: string[] = []
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (!state.showClose) attrs.push('showClose={false}')
  if (!state.dismissable) attrs.push('dismissable={false}')
  const open = attrs.length ? `<DialogContent ${attrs.join(' ')}>` : '<DialogContent>'

  return `<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  ${open}
    <DialogHeader>
      <DialogTitle>Rename project</DialogTitle>
      <DialogDescription>This is visible to everyone.</DialogDescription>
    </DialogHeader>
    <DialogBody>…</DialogBody>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`
}

function DialogPreview({
  size,
  showClose,
  dismissable,
}: {
  size: (typeof SIZES)[number]
  showClose: boolean
  dismissable: boolean
}) {
  const [open, setOpen] = useState(false)
  // The composer and the demo both mount this, so the field id has to be
  // unique per instance or the two labels point at the same input.
  const nameId = useId()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent size={size} showClose={showClose} dismissable={dismissable}>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>
            This name is visible to everyone in the workspace.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor={nameId}>Project name</Label>
          <Input id={nameId} defaultValue="astralyx-ui-kit" clearable />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const dialogEntry: ComponentEntry = {
  id: 'dialog',
  label: 'Dialog',
  description:
    'A modal window, built on the native <dialog> element — so the focus trap, background inerting, Escape handling and top-layer stacking come from the platform rather than from JavaScript.',
  usage: `import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rename project</DialogTitle>
    </DialogHeader>
    <DialogBody>…</DialogBody>
  </DialogContent>
</Dialog>`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'boolean', prop: 'showClose', label: 'showClose', default: true },
      { type: 'boolean', prop: 'dismissable', label: 'dismissable', default: true },
    ],
    render: (state) => (
      <DialogPreview
        size={String(state.size) as (typeof SIZES)[number]}
        showClose={Boolean(state.showClose)}
        dismissable={Boolean(state.dismissable)}
      />
    ),
    code: composeDialog,
  },
  api: [
    { name: 'open / defaultOpen', type: 'boolean', description: 'Controlled and uncontrolled open state, on Dialog.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Fires on every change, including Escape and backdrop dismissal.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Maximum width of the panel.' },
    { name: 'showClose', type: 'boolean', default: 'true', description: 'Corner close button.' },
    { name: 'dismissable', type: 'boolean', default: 'true', description: 'Whether a backdrop press closes the dialog. Escape always works.' },
    { name: 'DialogTrigger asChild', type: 'boolean', description: 'Render your own element as the trigger instead of a bare button.' },
  ],
  demos: [
    {
      title: 'Default',
      code: `<Dialog>…</Dialog>`,
      render: () => <DialogPreview size="default" showClose dismissable />,
    },
    {
      title: 'Not dismissable, no close button',
      code: `<DialogContent showClose={false} dismissable={false}>…</DialogContent>`,
      render: () => (
        <DialogPreview size="default" showClose={false} dismissable={false} />
      ),
    },
  ],
}
