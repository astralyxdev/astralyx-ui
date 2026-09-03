import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ComponentEntry, ComposerState } from './types'

const SIDES = ['top', 'right', 'bottom', 'left'] as const
const ALIGNS = ['start', 'center', 'end'] as const

function composePopover(state: ComposerState) {
  const attrs: string[] = []
  if (state.side !== 'bottom') attrs.push(`side="${state.side}"`)
  if (state.align !== 'center') attrs.push(`align="${state.align}"`)
  return `<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open</Button>
  </PopoverTrigger>
  <PopoverContent${attrs.length ? ' ' + attrs.join(' ') : ''}>…</PopoverContent>
</Popover>`
}

export const popoverEntry: ComponentEntry = {
  id: 'popover',
  label: 'Popover',
  description:
    'Rich content anchored to a trigger. Positioned with a fixed-position popper that flips when it would overflow, and dismissed by Escape or an outside press.',
  usage: `import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

<Popover>
  <PopoverTrigger asChild><Button>Settings</Button></PopoverTrigger>
  <PopoverContent>…</PopoverContent>
</Popover>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'side', label: 'side', options: SIDES, default: 'bottom' },
      { type: 'select', prop: 'align', label: 'align', options: ALIGNS, default: 'center' },
    ],
    render: (state) => (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent
          side={String(state.side) as (typeof SIDES)[number]}
          align={String(state.align) as (typeof ALIGNS)[number]}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Dimensions</h4>
              <p className="text-muted-foreground text-xs">Set the layer size.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pop-w">Width</Label>
              <Input id="pop-w" size="sm" defaultValue="240" />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    ),
    code: composePopover,
  },
  api: [
    { name: 'open / defaultOpen', type: 'boolean', description: 'Controlled and uncontrolled open state.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Fires on every change.' },
    { name: 'side', type: SIDES.map((s) => `'${s}'`).join(' | '), default: "'bottom'", description: 'Preferred side. Flips to the opposite one when it would overflow the viewport.' },
    { name: 'align', type: ALIGNS.map((a) => `'${a}'`).join(' | '), default: "'center'", description: 'Alignment along the cross axis. Clamped to stay on screen.' },
    { name: 'offset', type: 'number', default: '6', description: 'Gap between trigger and panel, in px.' },
  ],
  demos: [
    {
      title: 'Placement',
      code: `<PopoverContent side="top" align="start" />`,
      render: () => (
        <>
          {SIDES.map((side) => (
            <Popover key={side}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">{side}</Button>
              </PopoverTrigger>
              <PopoverContent side={side} className="w-48">
                Anchored to the {side}.
              </PopoverContent>
            </Popover>
          ))}
        </>
      ),
    },
  ],
}
