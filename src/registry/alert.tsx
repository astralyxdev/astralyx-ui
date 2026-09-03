import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { COLOR_SETS } from '@/lib/styles'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['default', 'outline', 'solid'] as const
const SIZES = ['sm', 'default'] as const

function composeAlert(state: ComposerState) {
  const attrs: string[] = []
  if (state.variant !== 'default') attrs.push(`variant="${state.variant}"`)
  if (state.color !== 'neutral') attrs.push(`color="${state.color}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.icon) attrs.push('icon={<Info />}')
  attrs.push(`title="${state.title}"`)
  return `<Alert\n  ${attrs.join('\n  ')}\n>\n  ${state.body}\n</Alert>`
}

export const alertEntry: ComponentEntry = {
  id: 'alert',
  label: 'Alert',
  description:
    'A prominent message that stays on the page. Keeps the colour system, and picks its ARIA role from severity — a destructive alert interrupts, the rest wait their turn.',
  usage: `import { Alert } from '@/components/ui/alert'

<Alert color="amber" icon={<AlertTriangle />} title="Quota almost reached">
  You have used 92% of your monthly builds.
</Alert>`,
  composer: {
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: VARIANTS, default: 'default' },
      { type: 'select', prop: 'color', label: 'color', options: COLOR_SETS, default: 'neutral' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'text', prop: 'title', label: 'title', default: 'Quota almost reached' },
      { type: 'text', prop: 'body', label: 'children', default: 'You have used 92% of your monthly builds.' },
      { type: 'boolean', prop: 'icon', label: 'icon', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-md">
        <Alert
          variant={String(state.variant) as (typeof VARIANTS)[number]}
          color={String(state.color) as (typeof COLOR_SETS)[number]}
          size={String(state.size) as (typeof SIZES)[number]}
          icon={state.icon ? <Info /> : undefined}
          title={String(state.title)}
        >
          {String(state.body)}
        </Alert>
      </div>
    ),
    code: composeAlert,
  },
  api: [
    { name: 'variant', type: VARIANTS.map((v) => `'${v}'`).join(' | '), default: "'default'", description: 'Tinted panel, outline, or solid fill.' },
    { name: 'color', type: COLOR_SETS.map((c) => `'${c}'`).join(' | '), default: "'neutral'", description: 'Named colour set. destructive also switches role to "alert".' },
    { name: 'tint', type: 'string', description: 'Any CSS colour, used instead of a named set.' },
    { name: 'icon', type: 'ReactNode', description: 'Leading icon, aligned to the first line of the title.' },
    { name: 'title', type: 'ReactNode', description: 'Bold first line. Children become the body.' },
  ],
  demos: [
    {
      title: 'Severities',
      stack: true,
      code: `<Alert color="green" icon={<CheckCircle2 />} title="Deployed" />
<Alert color="amber" icon={<AlertTriangle />} title="Quota almost reached" />
<Alert color="destructive" icon={<AlertTriangle />} title="Build failed" />`,
      render: () => (
        <>
          <Alert color="green" icon={<CheckCircle2 />} title="Deployed">Build 1482 is live.</Alert>
          <Alert color="amber" icon={<AlertTriangle />} title="Quota almost reached">You have used 92% of your monthly builds.</Alert>
          <Alert color="destructive" icon={<AlertTriangle />} title="Build failed">Step 3 exited with code 1.</Alert>
          <Alert color="blue" icon={<Info />} title="New version available">Version 2.1 is ready to install.</Alert>
        </>
      ),
    },
    {
      title: 'Variants',
      stack: true,
      code: `<Alert variant="default" /> <Alert variant="outline" /> <Alert variant="solid" />`,
      render: () => (
        <>
          {VARIANTS.map((variant) => (
            <Alert key={variant} variant={variant} color="blue" icon={<Info />} title={variant}>
              The same message in each variant.
            </Alert>
          ))}
        </>
      ),
    },
  ],
}
