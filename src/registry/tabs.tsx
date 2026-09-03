import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['solid', 'underline'] as const
const ORIENTATIONS = ['horizontal', 'vertical'] as const
const ACTIVATION = ['automatic', 'manual'] as const

function composeTabs(state: ComposerState) {
  const attrs = ['defaultValue="overview"']
  if (state.orientation !== 'horizontal') attrs.push(`orientation="${state.orientation}"`)
  if (state.activationMode !== 'automatic') attrs.push(`activationMode="${state.activationMode}"`)
  const listVariant = state.variant !== 'solid' ? ` variant="${state.variant}"` : ''

  return `<Tabs ${attrs.join(' ')}>
  <TabsList${listVariant}>
    <TabsTrigger value="overview"${listVariant}>Overview</TabsTrigger>
    <TabsTrigger value="activity"${listVariant}>Activity</TabsTrigger>
    <TabsTrigger value="settings"${listVariant}>Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
</Tabs>`
}

const PANELS = [
  ['overview', 'Overview', 'Everything at a glance.'],
  ['activity', 'Activity', 'Who changed what, and when.'],
  ['settings', 'Settings', 'Configuration for this project.'],
] as const

export const tabsEntry: ComponentEntry = {
  id: 'tabs',
  label: 'Tabs',
  description:
    'Switch between panels in the same context. Full WAI-ARIA keyboard support: arrows rove, Home and End jump, and only the active tab is in the tab order.',
  usage: `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
  <TabsContent value="activity">…</TabsContent>
</Tabs>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: VARIANTS, default: 'solid' },
      { type: 'select', prop: 'orientation', label: 'orientation', options: ORIENTATIONS, default: 'horizontal' },
      { type: 'select', prop: 'activationMode', label: 'activationMode', options: ACTIVATION, default: 'automatic' },
    ],
    render: (state) => {
      const variant = String(state.variant) as (typeof VARIANTS)[number]
      return (
        <Tabs
          defaultValue="overview"
          orientation={String(state.orientation) as (typeof ORIENTATIONS)[number]}
          activationMode={String(state.activationMode) as (typeof ACTIVATION)[number]}
          className="w-full max-w-md"
        >
          <TabsList variant={variant}>
            {PANELS.map(([value, label]) => (
              <TabsTrigger key={value} value={value} variant={variant}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PANELS.map(([value, , body]) => (
            <TabsContent
              key={value}
              value={value}
              className="text-muted-foreground text-sm"
            >
              {body}
            </TabsContent>
          ))}
        </Tabs>
      )
    },
    code: composeTabs,
  },
  api: [
    { name: 'value / defaultValue', type: 'string', description: 'Controlled and uncontrolled selection, on Tabs.' },
    { name: 'onValueChange', type: '(value: string) => void', description: 'Fires with the newly selected tab.' },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Layout direction, and which arrow keys move between tabs.' },
    { name: 'activationMode', type: "'automatic' | 'manual'", default: "'automatic'", description: 'Automatic selects as focus moves; manual waits for Enter or Space.' },
    { name: 'TabsList variant', type: VARIANTS.map((v) => `'${v}'`).join(' | '), default: "'solid'", description: 'Segmented track, or a rule with the active tab underlined. Pass the same variant to the triggers.' },
    { name: 'TabsTrigger value', type: 'string', description: 'Required. Matches the TabsContent it controls.' },
  ],
  demos: [
    {
      title: 'Solid',
      stack: true,
      code: `<Tabs defaultValue="overview">
  <TabsList>…</TabsList>
</Tabs>`,
      render: () => (
        <Tabs defaultValue="overview" className="w-full max-w-md">
          <TabsList>
            {PANELS.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PANELS.map(([value, , body]) => (
            <TabsContent key={value} value={value} className="text-muted-foreground text-sm">
              {body}
            </TabsContent>
          ))}
        </Tabs>
      ),
    },
    {
      title: 'Underline',
      stack: true,
      code: `<TabsList variant="underline">
  <TabsTrigger value="overview" variant="underline">Overview</TabsTrigger>
</TabsList>`,
      render: () => (
        <Tabs defaultValue="activity" className="w-full max-w-md">
          <TabsList variant="underline">
            {PANELS.map(([value, label]) => (
              <TabsTrigger key={value} value={value} variant="underline">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PANELS.map(([value, , body]) => (
            <TabsContent key={value} value={value} className="text-muted-foreground text-sm">
              {body}
            </TabsContent>
          ))}
        </Tabs>
      ),
    },
    {
      title: 'Vertical',
      stack: true,
      code: `<Tabs defaultValue="overview" orientation="vertical">…</Tabs>`,
      render: () => (
        <Tabs defaultValue="overview" orientation="vertical" className="w-full max-w-md">
          <TabsList>
            {PANELS.map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PANELS.map(([value, , body]) => (
            <TabsContent key={value} value={value} className="text-muted-foreground text-sm">
              {body}
            </TabsContent>
          ))}
        </Tabs>
      ),
    },
    {
      title: 'Disabled trigger',
      stack: true,
      code: `<TabsTrigger value="settings" disabled>Settings</TabsTrigger>`,
      render: () => (
        <Tabs defaultValue="overview" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings" disabled>
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-muted-foreground text-sm">
            Arrow keys skip the disabled tab.
          </TabsContent>
          <TabsContent value="activity" className="text-muted-foreground text-sm">
            Who changed what, and when.
          </TabsContent>
        </Tabs>
      ),
    },
  ],
}
