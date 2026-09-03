import { useState } from 'react'
import { Bold, Italic, Underline } from 'lucide-react'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { HoverCard } from '@/components/ui/hover-card'
import { InputOTP } from '@/components/ui/input-otp'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { Toggle, ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { ComponentEntry } from './types'

/* ------------------------------------------------------------------ label */

export const labelEntry: ComponentEntry = {
  id: 'label',
  label: 'Label',
  description:
    'A form label. htmlFor is the point — clicking it focuses the control, and a screen reader announces the two together.',
  usage: `import { Label } from '@/components/ui/label'

<Label htmlFor="email" required>Email</Label>
<Input id="email" type="email" />`,
  composer: {
    controls: [
      { type: 'text', prop: 'text', label: 'children', default: 'Email address' },
      { type: 'boolean', prop: 'required', label: 'required', default: false },
      { type: 'boolean', prop: 'disabled', label: 'disabled control', default: false },
    ],
    render: (state) => (
      <div className="w-full max-w-sm space-y-2">
        <Label htmlFor="demo-email" required={Boolean(state.required)}>
          {String(state.text)}
        </Label>
        <Input id="demo-email" placeholder="you@example.com" disabled={Boolean(state.disabled)} />
      </div>
    ),
    code: (state) =>
      `<Label htmlFor="email"${state.required ? ' required' : ''}>${state.text}</Label>\n<Input id="email" />`,
  },
  api: [
    { name: 'htmlFor', type: 'string', description: 'Id of the control this labels. Without it the click-to-focus and the announcement are both lost.' },
    { name: 'required', type: 'boolean', default: 'false', description: 'Appends a destructive asterisk, hidden from assistive tech since the control carries `required` itself.' },
  ],
  demos: [
    {
      title: 'With a field',
      stack: true,
      code: `<Label htmlFor="email" required>Email</Label>\n<Input id="email" />`,
      render: () => (
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="ex-email" required>Email</Label>
          <Input id="ex-email" placeholder="you@example.com" />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------------- alert dlg */

function AlertDialogPreview() {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button color="destructive">Delete project</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the project and all 1,482 builds. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction color="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const alertDialogEntry: ComponentEntry = {
  id: 'alert-dialog',
  label: 'Alert Dialog',
  description:
    'A modal that interrupts to confirm something consequential. Unlike Dialog it has no backdrop dismissal and no corner close — a destructive confirmation should take a deliberate answer.',
  usage: `import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

<AlertDialog>
  <AlertDialogTrigger asChild><Button color="destructive">Delete</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this project?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction color="destructive">Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
  composer: {
    controls: [{ type: 'boolean', prop: 'placeholder', label: 'open it', default: true }],
    render: () => <AlertDialogPreview />,
    code: () => `<AlertDialog>\n  <AlertDialogTrigger asChild>\n    <Button color="destructive">Delete project</Button>\n  </AlertDialogTrigger>\n  <AlertDialogContent>…</AlertDialogContent>\n</AlertDialog>`,
  },
  api: [
    { name: 'role', type: '"alertdialog"', description: 'Set automatically. Tells assistive tech this needs a response, not just attention.' },
    { name: 'AlertDialogCancel', type: 'Button', description: 'Outline button that closes without acting. Rendered first in DOM order so it is the safer default.' },
    { name: 'AlertDialogAction', type: 'Button', description: 'Confirms and closes. Takes every Button prop, including color="destructive".' },
    { name: 'dismissal', type: 'Escape only', description: 'No backdrop click and no close button, by design. Escape still works — trapping someone in a modal is worse.' },
  ],
  demos: [{ title: 'Destructive confirmation', code: `<AlertDialog>…</AlertDialog>`, render: () => <AlertDialogPreview /> }],
}

/* ----------------------------------------------------------------- toggle */

export const toggleEntry: ComponentEntry = {
  id: 'toggle',
  label: 'Toggle',
  description:
    'A button that stays pressed. Uses aria-pressed rather than a checkbox, because this is a control that changes state, not a value submitted with a form.',
  usage: `import { Toggle, ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle'

<Toggle aria-label="Bold"><Bold /></Toggle>

<ToggleGroup type="multiple" defaultValue={['bold']}>
  <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
</ToggleGroup>`,
  composer: {
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: ['default', 'outline'], default: 'outline' },
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default', 'lg', 'icon'], default: 'icon' },
      { type: 'select', prop: 'type', label: 'group type', options: ['single', 'multiple'], default: 'multiple' },
    ],
    render: (state) => (
      <ToggleGroup
        type={state.type as 'single' | 'multiple'}
        variant={state.variant as 'default' | 'outline'}
        size={state.size as 'sm' | 'default' | 'lg' | 'icon'}
        defaultValue={['bold']}
      >
        <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>
      </ToggleGroup>
    ),
    code: (state) =>
      `<ToggleGroup type="${state.type}" variant="${state.variant}" size="${state.size}" defaultValue={['bold']}>\n  <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>\n  <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>\n</ToggleGroup>`,
  },
  api: [
    { name: 'pressed / defaultPressed', type: 'boolean', description: 'Controlled and uncontrolled state, on Toggle.' },
    { name: 'onPressedChange', type: '(pressed: boolean) => void', description: 'Fires with the new state.' },
    { name: 'ToggleGroup type', type: "'single' | 'multiple'", default: "'single'", description: 'Whether one item or many can be pressed at once.' },
    { name: 'ToggleGroup value', type: 'string[]', description: 'An array in both modes, so switching type needs no change.' },
  ],
  demos: [
    {
      title: 'Standalone',
      code: `<Toggle aria-label="Bold"><Bold /></Toggle>`,
      render: () => (
        <>
          <Toggle size="icon" aria-label="Bold"><Bold /></Toggle>
          <Toggle size="icon" variant="outline" aria-label="Italic"><Italic /></Toggle>
          <Toggle defaultPressed>Pressed</Toggle>
        </>
      ),
    },
    {
      title: 'Group',
      code: `<ToggleGroup type="multiple">…</ToggleGroup>`,
      render: () => (
        <ToggleGroup type="multiple" variant="outline" size="icon" defaultValue={['bold']}>
          <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>
        </ToggleGroup>
      ),
    },
  ],
}

/* -------------------------------------------------------------- input-otp */

export const inputOtpEntry: ComponentEntry = {
  id: 'input-otp',
  label: 'Input OTP',
  description:
    'A fixed-length code entry, one box per character. Every box is a real input so autofill can target it, and paste is distributed across all of them.',
  usage: `import { InputOTP } from '@/components/ui/input-otp'

<InputOTP length={6} groupAfter={3} onComplete={verify} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'length', label: 'length', options: ['4', '6', '8'], default: '6' },
      { type: 'select', prop: 'pattern', label: 'pattern', options: ['numeric', 'alphanumeric'], default: 'numeric' },
      { type: 'boolean', prop: 'group', label: 'groupAfter', default: true },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <InputOTP
        key={`${state.length}-${state.group}`}
        length={Number(state.length)}
        pattern={state.pattern as 'numeric' | 'alphanumeric'}
        groupAfter={state.group ? Number(state.length) / 2 : undefined}
        disabled={Boolean(state.disabled)}
      />
    ),
    code: (state) =>
      `<InputOTP\n  length={${state.length}}\n  pattern="${state.pattern}"\n${state.group ? `  groupAfter={${Number(state.length) / 2}}\n` : ''}  onComplete={verify}\n/>`,
  },
  api: [
    { name: 'length', type: 'number', default: '6', description: 'How many boxes.' },
    { name: 'value / defaultValue', type: 'string', description: 'Controlled and uncontrolled value.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Fires on every keystroke.' },
    { name: 'onComplete', type: '(value: string) => void', description: 'Fires once the last box is filled.' },
    { name: 'pattern', type: "'numeric' | 'alphanumeric'", default: "'numeric'", description: 'Filters input and picks the mobile keyboard.' },
    { name: 'groupAfter', type: 'number', description: 'Insert a dash after this many boxes.' },
  ],
  demos: [
    { title: 'Six digits, grouped', stack: true, code: `<InputOTP length={6} groupAfter={3} />`, render: () => <InputOTP length={6} groupAfter={3} /> },
    { title: 'Four digits', stack: true, code: `<InputOTP length={4} />`, render: () => <InputOTP length={4} /> },
    { title: 'Alphanumeric', stack: true, code: `<InputOTP length={6} pattern="alphanumeric" />`, render: () => <InputOTP length={6} pattern="alphanumeric" /> },
  ],
}

/* ------------------------------------------------------------- hover card */

export const hoverCardEntry: ComponentEntry = {
  id: 'hover-card',
  label: 'Hover Card',
  description:
    'A preview card shown on hover — richer than a tooltip, and pointer-only. There is a close delay as well as an open delay, so the pointer can travel into the card without it vanishing.',
  usage: `import { HoverCard } from '@/components/ui/hover-card'

<HoverCard content={<Profile user={user} />}>
  <a href={user.url}>@{user.handle}</a>
</HoverCard>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'side', label: 'side', options: ['top', 'right', 'bottom', 'left'], default: 'bottom' },
      { type: 'select', prop: 'openDelay', label: 'openDelay', options: ['0', '150', '300', '600'], default: '300' },
    ],
    render: (state) => (
      <HoverCard
        side={state.side as 'top' | 'right' | 'bottom' | 'left'}
        openDelay={Number(state.openDelay)}
        content={
          <div className="flex gap-3">
            <Avatar name="Ada Lovelace" size="sm" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Ada Lovelace</p>
              <p className="text-muted-foreground text-xs">
                Wrote the first algorithm intended for a machine.
              </p>
            </div>
          </div>
        }
      >
        <Button variant="link">@ada</Button>
      </HoverCard>
    ),
    code: (state) =>
      `<HoverCard side="${state.side}" openDelay={${state.openDelay}} content={<Profile />}>\n  <Button variant="link">@ada</Button>\n</HoverCard>`,
  },
  api: [
    { name: 'content', type: 'ReactNode', description: 'What the card shows.' },
    { name: 'children', type: 'ReactElement', description: 'The trigger, cloned rather than wrapped.' },
    { name: 'openDelay / closeDelay', type: 'number', default: '300 / 200', description: 'The close delay is what lets the pointer travel into the card.' },
    { name: 'keyboard', type: 'not triggered', description: 'Deliberately pointer-only — the content is supplementary. Use Popover when it must be reachable by keyboard.' },
  ],
  demos: [
    {
      title: 'On a link',
      code: `<HoverCard content={<Profile />}><Button variant="link">@ada</Button></HoverCard>`,
      render: () => (
        <HoverCard
          content={
            <div className="flex gap-3">
              <Avatar name="Ada Lovelace" size="sm" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Ada Lovelace</p>
                <p className="text-muted-foreground text-xs">Wrote the first algorithm intended for a machine.</p>
              </div>
            </div>
          }
        >
          <Button variant="link">@ada</Button>
        </HoverCard>
      ),
    },
  ],
}

/* ------------------------------------------------------ small primitives */

export const kbdEntry: ComponentEntry = {
  id: 'kbd',
  label: 'Kbd',
  description: 'A keyboard key. Splits on "+" so a chord can be written as one string.',
  usage: `import { Kbd } from '@/components/ui/kbd'

<Kbd keys="⌘+K" />`,
  composer: {
    controls: [{ type: 'text', prop: 'keys', label: 'keys', default: '⌘+K' }],
    render: (state) => <Kbd keys={String(state.keys)} />,
    code: (state) => `<Kbd keys="${state.keys}" />`,
  },
  api: [
    { name: 'keys', type: 'string', description: 'Chord written as one string, split on "+".' },
    { name: 'children', type: 'ReactNode', description: 'Used instead of `keys` when you want full control.' },
  ],
  demos: [
    {
      title: 'Chords',
      code: `<Kbd keys="⌘+K" />`,
      render: () => (
        <>
          <Kbd keys="⌘+K" />
          <Kbd keys="Ctrl+Shift+P" />
          <Kbd keys="Esc" />
        </>
      ),
    },
  ],
}

export const spinnerEntry: ComponentEntry = {
  id: 'spinner',
  label: 'Spinner',
  description:
    'An indeterminate busy indicator. Rotation is the one exception the motion rule has to allow — a still spinner says nothing. It stops under prefers-reduced-motion.',
  usage: `import { Spinner } from '@/components/ui/spinner'

<Spinner size="sm" label="Loading results" />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['xs', 'sm', 'default', 'lg', 'xl'], default: 'default' },
      { type: 'text', prop: 'label', label: 'label', default: 'Loading' },
    ],
    render: (state) => (
      <Spinner size={state.size as 'xs' | 'sm' | 'default' | 'lg' | 'xl'} label={String(state.label)} />
    ),
    code: (state) => `<Spinner size="${state.size}" label="${state.label}" />`,
  },
  api: [
    { name: 'size', type: "'xs' | 'sm' | 'default' | 'lg' | 'xl'", default: "'default'", description: 'Diameter and border weight.' },
    { name: 'label', type: 'string', default: "'Loading'", description: 'Screen-reader text. The element is role="status", so this is what gets announced.' },
  ],
  demos: [
    {
      title: 'Sizes',
      code: `<Spinner size="sm" />`,
      render: () => (
        <>
          {(['xs', 'sm', 'default', 'lg', 'xl'] as const).map((size) => (
            <Spinner key={size} size={size} />
          ))}
        </>
      ),
    },
    {
      title: 'In a button',
      code: `<Button disabled><Spinner size="xs" /> Saving</Button>`,
      render: () => (
        <>
          <Button disabled><Spinner size="xs" /> Saving</Button>
          <Button variant="outline" disabled><Spinner size="xs" /> Loading</Button>
        </>
      ),
    },
  ],
}

export const aspectRatioEntry: ComponentEntry = {
  id: 'aspect-ratio',
  label: 'Aspect Ratio',
  description:
    'Hold a box at a fixed ratio while its width is fluid. Modern CSS aspect-ratio, so no padding-top hack.',
  usage: `import { AspectRatio } from '@/components/ui/aspect-ratio'

<AspectRatio ratio={16 / 9}>
  <img src={cover} alt="" className="size-full object-cover" />
</AspectRatio>`,
  composer: {
    controls: [
      { type: 'select', prop: 'ratio', label: 'ratio', options: ['16 / 9', '4 / 3', '1 / 1', '3 / 4'], default: '16 / 9' },
    ],
    render: (state) => {
      const [w, h] = String(state.ratio).split('/').map((n) => Number(n.trim()))
      return (
        <div className="w-full max-w-xs">
          <AspectRatio ratio={w / h} className="bg-secondary text-muted-foreground grid place-items-center rounded-2xl text-xs">
            {String(state.ratio)}
          </AspectRatio>
        </div>
      )
    },
    code: (state) => `<AspectRatio ratio={${state.ratio}}>\n  <img src={cover} alt="" className="size-full object-cover" />\n</AspectRatio>`,
  },
  api: [
    { name: 'ratio', type: 'number', default: '16 / 9', description: 'Width divided by height.' },
  ],
  demos: [
    {
      title: 'Common ratios',
      code: `<AspectRatio ratio={4 / 3}>…</AspectRatio>`,
      render: () => (
        <>
          {(['16 / 9', '4 / 3', '1 / 1'] as const).map((r) => {
            const [w, h] = r.split('/').map((n) => Number(n.trim()))
            return (
              <div key={r} className="w-40">
                <AspectRatio ratio={w / h} className="bg-secondary text-muted-foreground grid place-items-center rounded-2xl text-xs">
                  {r}
                </AspectRatio>
              </div>
            )
          })}
        </>
      ),
    },
  ],
}

export const scrollAreaEntry: ComponentEntry = {
  id: 'scroll-area',
  label: 'Scroll Area',
  description:
    'A scrollable region with a themed scrollbar, styled through the standard scrollbar properties rather than a JavaScript overlay — so native momentum and keyboard scrolling stay intact.',
  usage: `import { ScrollArea } from '@/components/ui/scroll-area'

<ScrollArea className="h-64">…</ScrollArea>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'orientation', label: 'orientation', options: ['vertical', 'horizontal', 'both'], default: 'vertical' },
    ],
    render: (state) => {
      const horizontal = state.orientation !== 'vertical'
      return (
        <ScrollArea
          orientation={state.orientation as 'vertical' | 'horizontal' | 'both'}
          className="border-border h-48 w-full max-w-sm rounded-2xl border p-4"
        >
          <div className={horizontal ? 'flex w-max gap-3' : 'space-y-2'}>
            {Array.from({ length: 24 }, (_, i) => (
              <p key={i} className="text-muted-foreground text-sm whitespace-nowrap">
                Row {i + 1} — scrollable content
              </p>
            ))}
          </div>
        </ScrollArea>
      )
    },
    code: (state) => `<ScrollArea orientation="${state.orientation}" className="h-64">\n  …\n</ScrollArea>`,
  },
  api: [
    { name: 'orientation', type: "'vertical' | 'horizontal' | 'both'", default: "'vertical'", description: 'Which axis scrolls.' },
    { name: 'className', type: 'string', description: 'Where the height comes from — a scroll area needs a bounded size to scroll at all.' },
  ],
  demos: [
    {
      title: 'Vertical',
      stack: true,
      code: `<ScrollArea className="h-48">…</ScrollArea>`,
      render: () => (
        <ScrollArea className="border-border h-48 w-full max-w-sm rounded-2xl border p-4">
          <div className="space-y-2">
            {Array.from({ length: 24 }, (_, i) => (
              <p key={i} className="text-muted-foreground text-sm">Row {i + 1}</p>
            ))}
          </div>
        </ScrollArea>
      ),
    },
  ],
}
