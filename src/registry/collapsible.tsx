import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardBody } from '@/components/ui/card'
import type { ComponentEntry, ComposerState } from './types'

export const collapsibleEntry: ComponentEntry = {
  id: 'collapsible',
  label: 'Collapsible',
  description:
    'A single panel that expands and collapses. The open height is measured rather than assumed, because height: auto cannot be transitioned.',
  usage: `import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

<Collapsible>
  <CollapsibleTrigger>Advanced options</CollapsibleTrigger>
  <CollapsibleContent>…</CollapsibleContent>
</Collapsible>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'defaultOpen', label: 'defaultOpen', default: false },
      { type: 'boolean', prop: 'showChevron', label: 'showChevron', default: true },
      { type: 'text', prop: 'label', label: 'trigger', default: 'Advanced options' },
    ],
    render: (state: ComposerState) => (
      <Collapsible defaultOpen={Boolean(state.defaultOpen)} className="w-full max-w-md space-y-2">
        <CollapsibleTrigger showChevron={Boolean(state.showChevron)} className="px-1 py-2">
          {String(state.label)}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card size="sm">
            <CardBody className="text-muted-foreground text-sm">
              Content revealed by the trigger. The panel animates to its measured
              height, so it works with any amount of content.
            </CardBody>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    ),
    code: (state) =>
      `<Collapsible${state.defaultOpen ? ' defaultOpen' : ''}>\n  <CollapsibleTrigger${state.showChevron ? '' : ' showChevron={false}'}>${state.label}</CollapsibleTrigger>\n  <CollapsibleContent>…</CollapsibleContent>\n</Collapsible>`,
  },
  api: [
    { name: 'open / defaultOpen', type: 'boolean', description: 'Controlled and uncontrolled state.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Fires on every change.' },
    { name: 'CollapsibleTrigger showChevron', type: 'boolean', default: 'true', description: 'Rotating chevron on the trailing edge.' },
    { name: 'CollapsibleTrigger asChild', type: 'boolean', description: 'Use your own element as the trigger. Suppresses the chevron.' },
  ],
  demos: [
    {
      title: 'Closed by default',
      stack: true,
      code: `<Collapsible>…</Collapsible>`,
      render: () => (
        <Collapsible className="w-full max-w-md space-y-2">
          <CollapsibleTrigger className="px-1 py-2">Advanced options</CollapsibleTrigger>
          <CollapsibleContent>
            <Card size="sm"><CardBody className="text-muted-foreground text-sm">Three settings you rarely need.</CardBody></Card>
          </CollapsibleContent>
        </Collapsible>
      ),
    },
  ],
}
