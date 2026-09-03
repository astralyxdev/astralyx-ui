import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { ComponentEntry, ComposerState } from './types'

const TYPES = ['single', 'multiple'] as const

const SECTIONS = [
  ['what', 'What is in the kit?', 'Every component is built on its own primitives — no headless-UI dependency anywhere.'],
  ['styles', 'How is it styled?', 'One global contract in styles.ts, themed by CSS variables in index.css.'],
  ['motion', 'Why so little motion?', 'Hover and press feedback is colour only. Nothing moves, resizes or casts a shadow on interaction.'],
] as const

function AccordionPreview({ type, collapsible }: { type: (typeof TYPES)[number]; collapsible: boolean }) {
  return (
    <Accordion type={type} collapsible={collapsible} defaultValue={['what']} className="w-full max-w-md">
      {SECTIONS.map(([value, title, body]) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger>{title}</AccordionTrigger>
          <AccordionContent>{body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export const accordionEntry: ComponentEntry = {
  id: 'accordion',
  label: 'Accordion',
  description:
    'A stack of collapsible sections. Each header is a real button inside a heading, which is what makes the set navigable by heading in a screen reader.',
  usage: `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

<Accordion type="single" defaultValue={['what']}>
  <AccordionItem value="what">
    <AccordionTrigger>What is in the kit?</AccordionTrigger>
    <AccordionContent>…</AccordionContent>
  </AccordionItem>
</Accordion>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'type', label: 'type', options: TYPES, default: 'single' },
      { type: 'boolean', prop: 'collapsible', label: 'collapsible', default: true },
    ],
    render: (state: ComposerState) => (
      <AccordionPreview
        type={String(state.type) as (typeof TYPES)[number]}
        collapsible={Boolean(state.collapsible)}
      />
    ),
    code: (state) =>
      `<Accordion type="${state.type}"${state.collapsible ? '' : ' collapsible={false}'} defaultValue={['what']}>\n  <AccordionItem value="what">\n    <AccordionTrigger>What is in the kit?</AccordionTrigger>\n    <AccordionContent>…</AccordionContent>\n  </AccordionItem>\n</Accordion>`,
  },
  api: [
    { name: 'type', type: "'single' | 'multiple'", default: "'single'", description: 'Whether opening a section closes the previous one.' },
    { name: 'collapsible', type: 'boolean', default: 'true', description: 'With type="single", whether the open section can be closed again.' },
    { name: 'value / defaultValue', type: 'string[]', description: 'Open sections. An array in both modes, so switching type needs no change.' },
    { name: 'onValueChange', type: '(value: string[]) => void', description: 'Fires with the new set of open sections.' },
    { name: 'AccordionItem value', type: 'string', description: 'Required. Identifies the section.' },
  ],
  demos: [
    { title: 'Single', stack: true, code: `<Accordion type="single">…</Accordion>`, render: () => <AccordionPreview type="single" collapsible /> },
    { title: 'Multiple', stack: true, code: `<Accordion type="multiple">…</Accordion>`, render: () => <AccordionPreview type="multiple" collapsible /> },
  ],
}
