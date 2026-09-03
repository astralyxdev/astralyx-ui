import { Button } from '@/components/ui/button'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { COLOR_SETS } from '@/lib/styles'
import type { ComponentEntry, ComposerState } from './types'

const POSITIONS = ['bottom-end', 'bottom-start', 'top-end', 'top-start'] as const

function Trigger({ color, duration, description }: {
  color: (typeof COLOR_SETS)[number]
  duration: number
  description: boolean
}) {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast({
            title: 'Deployment finished',
            description: description ? 'Build 1482 is live on production.' : undefined,
            color,
            duration,
          })
        }
      >
        Show toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast({ title: 'Saved', color: 'green', duration })}
      >
        Another
      </Button>
    </div>
  )
}

export const toastEntry: ComponentEntry = {
  id: 'toast',
  label: 'Toast',
  description:
    'Transient messages that stack and dismiss themselves. A provider plus a useToast() hook rather than a global singleton, so the queue lives in React state and two regions can coexist.',
  usage: `import { ToastProvider, useToast } from '@/components/ui/toast'

// once, near the root
<ToastProvider position="bottom-end">{children}</ToastProvider>

// anywhere below it
const { toast } = useToast()
toast({ title: 'Saved', description: 'Your changes are live.', color: 'green' })`,
  composer: {
    controls: [
      { type: 'select', prop: 'position', label: 'position', options: POSITIONS, default: 'bottom-end' },
      { type: 'select', prop: 'color', label: 'color', options: COLOR_SETS, default: 'neutral' },
      { type: 'select', prop: 'duration', label: 'duration', options: ['2000', '4000', '0'], default: '4000' },
      { type: 'boolean', prop: 'description', label: 'description', default: true },
    ],
    render: (state: ComposerState) => (
      <ToastProvider
        key={String(state.position)}
        position={String(state.position) as (typeof POSITIONS)[number]}
      >
        <Trigger
          color={String(state.color) as (typeof COLOR_SETS)[number]}
          duration={Number(state.duration)}
          description={Boolean(state.description)}
        />
      </ToastProvider>
    ),
    code: (state) =>
      `const { toast } = useToast()\n\ntoast({\n  title: 'Deployment finished',\n${state.description ? "  description: 'Build 1482 is live on production.',\n" : ''}  color: '${state.color}',\n  duration: ${state.duration},\n})`,
  },
  api: [
    { name: 'ToastProvider position', type: POSITIONS.map((p) => `'${p}'`).join(' | '), default: "'bottom-end'", description: 'Corner the region is anchored to. Bottom positions stack upward.' },
    { name: 'ToastProvider max', type: 'number', default: '4', description: 'Oldest toasts fall off once this many are showing.' },
    { name: 'toast(options)', type: '(options) => number', description: 'Queues a toast and returns its id.' },
    { name: 'options.duration', type: 'number', default: '4000', description: 'Milliseconds before auto-dismiss. 0 keeps it until dismissed.' },
    { name: 'options.color', type: 'ColorSet', description: 'Tints the title.' },
    { name: 'dismiss(id)', type: '(id: number) => void', description: 'Removes a toast early.' },
  ],
  demos: [
    {
      title: 'Queue and stacking',
      stack: true,
      code: `const { toast } = useToast()
toast({ title: 'Deployment finished', color: 'green' })`,
      render: () => (
        <ToastProvider position="bottom-end">
          <Trigger color="green" duration={4000} description />
        </ToastProvider>
      ),
    },
  ],
}
