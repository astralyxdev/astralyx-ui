import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Group } from '@/components/ui/group'
import { Switch } from '@/components/ui/switch'
import type { ComponentEntry, ComposerState } from './types'

const ORIENTATIONS = ['vertical', 'horizontal'] as const
const SIZES = ['sm', 'default', 'lg'] as const

function composeGroup(state: ComposerState) {
  const attrs: string[] = []
  if (state.orientation !== 'vertical') attrs.push(`orientation="${state.orientation}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  if (state.even) attrs.push('even')

  return `<Group${attrs.length ? ' ' + attrs.join(' ') : ''}>
  <Card>
    <CardBody>Notifications</CardBody>
  </Card>
  <Card>
    <CardBody>Appearance</CardBody>
  </Card>
</Group>`
}

const SETTINGS = [
  ['Notifications', 'Email me when a build finishes.'],
  ['Appearance', 'Follow the system colour scheme.'],
  ['Telemetry', 'Share anonymous usage data.'],
] as const

function GroupPreview({
  orientation,
  size,
  even,
  count = 3,
}: {
  orientation: (typeof ORIENTATIONS)[number]
  size: (typeof SIZES)[number]
  even: boolean
  count?: number
}) {
  return (
    <Group
      orientation={orientation}
      size={size}
      even={even}
      className="w-full max-w-lg"
    >
      {SETTINGS.slice(0, count).map(([title, description]) => (
        <Card key={title} size="sm">
          <CardBody className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="text-muted-foreground truncate text-xs">
                {description}
              </p>
            </div>
            <Switch size="sm" defaultChecked={title !== 'Telemetry'} />
          </CardBody>
        </Card>
      ))}
    </Group>
  )
}

export const groupEntry: ComponentEntry = {
  id: 'group',
  label: 'Group',
  description:
    'A recessed container that holds a set of cards. Padding and gap are the same value, and the corner radius is concentric with the cards inside it.',
  usage: `import { Group } from '@/components/ui/group'
import { Card, CardBody } from '@/components/ui/card'

<Group>
  <Card><CardBody>Notifications</CardBody></Card>
  <Card><CardBody>Appearance</CardBody></Card>
</Group>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'orientation', label: 'orientation', options: ORIENTATIONS, default: 'vertical' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'boolean', prop: 'even', label: 'even', default: false },
    ],
    render: (state) => (
      <GroupPreview
        orientation={String(state.orientation) as (typeof ORIENTATIONS)[number]}
        size={String(state.size) as (typeof SIZES)[number]}
        even={Boolean(state.even)}
      />
    ),
    code: composeGroup,
  },
  api: [
    {
      name: 'responsive',
      type: "'sm' | 'md' | 'lg' | false",
      default: "'sm'",
      description:
        'Breakpoint a horizontal group becomes a row at. Below it the cards stack, so a row of three never squeezes into thirds of a phone screen. `false` keeps it a row at every width.',
    },
    {
      name: 'orientation',
      type: ORIENTATIONS.map((o) => `'${o}'`).join(' | '),
      default: "'vertical'",
      description: 'Stack the cards or lay them in a row. Horizontal wraps.',
    },
    {
      name: 'size',
      type: SIZES.map((s) => `'${s}'`).join(' | '),
      default: "'default'",
      description:
        'Padding and gap together — 12, 18 or 24px. Each size also picks the matching concentric radius.',
    },
    {
      name: 'even',
      type: 'boolean',
      default: 'false',
      description:
        'Give every child an equal share of the main axis. Mostly for horizontal groups.',
    },
    {
      name: 'radius',
      type: '--radius-group-*',
      description:
        'Card radius plus the group padding, so the gap between the two curves stays even into the corners. Tunable in index.css.',
    },
  ],
  demos: [
    {
      title: 'Vertical',
      stack: true,
      code: `<Group>
  <Card><CardBody>Notifications</CardBody></Card>
  <Card><CardBody>Appearance</CardBody></Card>
</Group>`,
      render: () => <GroupPreview orientation="vertical" size="default" even={false} />,
    },
    {
      title: 'Horizontal and even',
      stack: true,
      code: `<Group orientation="horizontal" even>…</Group>`,
      render: () => (
        <Group orientation="horizontal" even className="w-full max-w-lg">
          {['Builds', 'Deploys', 'Errors'].map((label, index) => (
            <Card key={label} size="sm">
              <CardBody className="space-y-1">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {[1482, 96, 3][index]}
                </p>
              </CardBody>
            </Card>
          ))}
        </Group>
      ),
    },
    {
      title: 'Sizes',
      stack: true,
      code: `<Group size="sm" /> <Group size="default" /> <Group size="lg" />`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <GroupPreview
              key={size}
              orientation="vertical"
              size={size}
              even={false}
              count={2}
            />
          ))}
        </>
      ),
    },
    {
      title: 'With a header card',
      stack: true,
      code: `<Group>
  <Card>
    <CardHeader>
      <CardTitle>Workspace</CardTitle>
      <CardDescription>Applies to everyone.</CardDescription>
    </CardHeader>
  </Card>
  <Card><CardBody>…</CardBody></Card>
</Group>`,
      render: () => (
        <Group className="w-full max-w-lg">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Workspace <Badge size="sm" color="blue">Team</Badge>
              </CardTitle>
              <CardDescription>Applies to everyone in the workspace.</CardDescription>
            </CardHeader>
            <CardBody className="text-muted-foreground text-sm">
              Members inherit these settings unless they override them.
            </CardBody>
          </Card>
          <Card size="sm">
            <CardBody className="flex items-center justify-between gap-4">
              <span className="text-sm">Require two-factor auth</span>
              <Switch size="sm" defaultChecked />
            </CardBody>
          </Card>
          <Card size="sm">
            <CardBody className="flex items-center justify-between gap-4">
              <span className="text-sm">Allow public projects</span>
              <Button size="xs" variant="outline">Manage</Button>
            </CardBody>
          </Card>
        </Group>
      ),
    },
  ],
}
