import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { COLOR_SETS } from '@/lib/styles'
import type { ComponentEntry, ComposerState } from './types'

const SIZES = ['sm', 'default', 'lg'] as const

/** A live bar, so the width transition is visible rather than described. */
function Climbing({ size, color }: { size: (typeof SIZES)[number]; color: (typeof COLOR_SETS)[number] }) {
  const [value, setValue] = useState(12)
  useEffect(() => {
    const id = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 7)), 900)
    return () => clearInterval(id)
  }, [])
  return <Progress value={value} size={size} color={color} showValue />
}

export const progressEntry: ComponentEntry = {
  id: 'progress',
  label: 'Progress',
  description:
    'How far along a task is. Omit the value for an indeterminate bar, which sweeps rather than fills — the one honest way to say "working, duration unknown".',
  usage: `import { Progress } from '@/components/ui/progress'

<Progress value={72} showValue />
<Progress />  {/* indeterminate */}`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'select', prop: 'color', label: 'color', options: COLOR_SETS, default: 'neutral' },
      { type: 'select', prop: 'value', label: 'value', options: ['0', '35', '72', '100', 'indeterminate'], default: '72' },
      { type: 'boolean', prop: 'showValue', label: 'showValue', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <Progress
          size={String(state.size) as (typeof SIZES)[number]}
          color={String(state.color) as (typeof COLOR_SETS)[number]}
          value={state.value === 'indeterminate' ? undefined : Number(state.value)}
          showValue={Boolean(state.showValue)}
        />
      </div>
    ),
    code: (state) => {
      const attrs: string[] = []
      if (state.value !== 'indeterminate') attrs.push(`value={${state.value}}`)
      if (state.size !== 'default') attrs.push(`size="${state.size}"`)
      if (state.color !== 'neutral') attrs.push(`color="${state.color}"`)
      if (state.showValue) attrs.push('showValue')
      return attrs.length ? `<Progress ${attrs.join(' ')} />` : '<Progress />'
    },
  },
  api: [
    { name: 'value', type: 'number', description: '0–100, clamped. Omit entirely for an indeterminate bar.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Track thickness.' },
    { name: 'color / tint', type: 'ColorSet | string', default: "'neutral'", description: 'Fill colour, from a named set or any CSS colour.' },
    { name: 'showValue', type: 'boolean', default: 'false', description: 'Render the percentage beside the track.' },
  ],
  demos: [
    {
      title: 'Determinate',
      stack: true,
      code: `<Progress value={35} showValue />`,
      render: () => (
        <>
          {[0, 35, 72, 100].map((v) => <Progress key={v} value={v} showValue />)}
        </>
      ),
    },
    { title: 'Live', stack: true, code: `<Progress value={value} showValue />`, render: () => <Climbing size="default" color="blue" /> },
    { title: 'Indeterminate', stack: true, code: `<Progress />`, render: () => <Progress /> },
    {
      title: 'Sizes and colours',
      stack: true,
      code: `<Progress size="lg" color="green" value={60} />`,
      render: () => (
        <>
          {SIZES.map((size, i) => (
            <Progress key={size} size={size} value={40 + i * 20} color={(['blue', 'green', 'violet'] as const)[i]} />
          ))}
        </>
      ),
    },
  ],
}
