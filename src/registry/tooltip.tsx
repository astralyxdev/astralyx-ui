import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import type { ComponentEntry, ComposerState } from './types'

const SIDES = ['top', 'right', 'bottom', 'left'] as const

function composeTooltip(state: ComposerState) {
  const attrs = [`content="${state.content}"`]
  if (state.side !== 'top') attrs.push(`side="${state.side}"`)
  if (state.delay !== '400') attrs.push(`delay={${state.delay}}`)
  return `<Tooltip ${attrs.join(' ')}>\n  <Button variant="outline">Hover me</Button>\n</Tooltip>`
}

export const tooltipEntry: ComponentEntry = {
  id: 'tooltip',
  label: 'Tooltip',
  description:
    'A short hint on hover or focus. Focus opens it immediately — a keyboard user has already committed — while pointer hover waits, so sweeping across a toolbar does not fire a row of them.',
  usage: `import { Tooltip } from '@/components/ui/tooltip'

<Tooltip content="Copy to clipboard">
  <Button size="icon"><Copy /></Button>
</Tooltip>`,
  composer: {
    controls: [
      { type: 'select', prop: 'side', label: 'side', options: SIDES, default: 'top' },
      { type: 'select', prop: 'delay', label: 'delay', options: ['0', '200', '400', '800'], default: '400' },
      { type: 'text', prop: 'content', label: 'content', default: 'Copy to clipboard' },
    ],
    render: (state) => (
      <Tooltip
        content={String(state.content)}
        side={String(state.side) as (typeof SIDES)[number]}
        delay={Number(state.delay)}
      >
        <Button variant="outline">Hover or focus me</Button>
      </Tooltip>
    ),
    code: composeTooltip,
  },
  api: [
    { name: 'content', type: 'ReactNode', description: 'What the tooltip says.' },
    { name: 'children', type: 'ReactElement', description: 'The trigger. Cloned rather than wrapped, so the tooltip adds no element to the layout.' },
    { name: 'side', type: SIDES.map((s) => `'${s}'`).join(' | '), default: "'top'", description: 'Preferred side; flips when it would overflow.' },
    { name: 'delay', type: 'number', default: '400', description: 'Pointer-hover delay in ms. Focus ignores it.' },
  ],
  demos: [
    {
      title: 'Sides',
      code: `<Tooltip content="Hint" side="right">…</Tooltip>`,
      render: () => (
        <>
          {SIDES.map((side) => (
            <Tooltip key={side} content={`Anchored ${side}`} side={side}>
              <Button variant="outline" size="sm">{side}</Button>
            </Tooltip>
          ))}
        </>
      ),
    },
    {
      title: 'On an icon button',
      code: `<Tooltip content="More information">
  <Button size="icon" variant="ghost"><Info /></Button>
</Tooltip>`,
      render: () => (
        <Tooltip content="More information">
          <Button size="icon" variant="ghost" aria-label="Info"><Info /></Button>
        </Tooltip>
      ),
    },
  ],
}
