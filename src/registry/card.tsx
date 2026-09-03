import { Button } from '@/components/ui/button'
import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ComponentEntry, ComposerState } from './types'

const VARIANTS = ['default', 'secondary', 'ghost'] as const
const SIZES = ['sm', 'default', 'lg'] as const

function composeCard(state: ComposerState) {
  const attrs: string[] = []
  if (state.variant !== 'default') attrs.push(`variant="${state.variant}"`)
  if (state.size !== 'default') attrs.push(`size="${state.size}"`)
  const open = attrs.length ? `<Card ${attrs.join(' ')}>` : '<Card>'

  const header = state.header
    ? `  <CardHeader>\n    <CardTitle>Deployment</CardTitle>\n    <CardDescription>Last run 4 minutes ago.</CardDescription>\n  </CardHeader>\n`
    : ''
  const footer = state.footer
    ? `  <CardFooter>\n    <Button size="sm">Re-run</Button>\n  </CardFooter>\n`
    : ''

  return `${open}\n${header}  <CardBody>Build 1482 finished on main.</CardBody>\n${footer}</Card>`
}

export const cardEntry: ComponentEntry = {
  id: 'card',
  label: 'Card',
  description:
    'A surface that groups related content. Header and footer are optional and draw their own dividers — a Card holding only a CardBody is just a padded box.',
  usage: `import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Deployment</CardTitle>
    <CardDescription>Last run 4 minutes ago.</CardDescription>
  </CardHeader>
  <CardBody>Build 1482 finished on main.</CardBody>
  <CardFooter>
    <Button size="sm">Re-run</Button>
  </CardFooter>
</Card>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: VARIANTS, default: 'default' },
      { type: 'select', prop: 'size', label: 'size', options: SIZES, default: 'default' },
      { type: 'boolean', prop: 'header', label: 'CardHeader', default: true },
      { type: 'boolean', prop: 'footer', label: 'CardFooter', default: true },
    ],
    render: (state) => (
      <Card
        variant={String(state.variant) as (typeof VARIANTS)[number]}
        size={String(state.size) as (typeof SIZES)[number]}
        className="w-full max-w-sm"
      >
        {state.header && (
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <CardDescription>Last run 4 minutes ago.</CardDescription>
          </CardHeader>
        )}
        <CardBody className="text-muted-foreground text-sm">
          Build 1482 finished on main.
        </CardBody>
        {state.footer && (
          <CardFooter>
            <Button size="sm">Re-run</Button>
            <Button size="sm" variant="ghost">
              Logs
            </Button>
          </CardFooter>
        )}
      </Card>
    ),
    code: composeCard,
  },
  api: [
    { name: 'variant', type: VARIANTS.map((v) => `'${v}'`).join(' | '), default: "'default'", description: 'Bordered surface, filled, or outline with no fill.' },
    { name: 'size', type: SIZES.map((s) => `'${s}'`).join(' | '), default: "'default'", description: 'Section padding. Reaches header, body and footer through context, so one prop re-pads the whole card.' },
    { name: 'CardHeader / CardFooter', type: 'section', description: 'Optional. Each draws its own divider, so omitting them leaves no stray rule.' },
    { name: 'CardBody', type: 'section', description: 'Grows to fill. The only section a Card needs.' },
    { name: 'CardTitle / CardDescription', type: 'text', description: 'Heading and secondary line, normally inside CardHeader.' },
    { name: 'section size', type: SIZES.map((s) => `'${s}'`).join(' | '), description: 'Overrides the inherited padding for one section.' },
  ],
  demos: [
    {
      title: 'Body only',
      stack: true,
      code: `<Card>
  <CardBody>Nothing but content — no dividers.</CardBody>
</Card>`,
      render: () => (
        <Card className="max-w-sm">
          <CardBody className="text-muted-foreground text-sm">
            Nothing but content — no dividers.
          </CardBody>
        </Card>
      ),
    },
    {
      title: 'Full composition',
      stack: true,
      code: `<Card>
  <CardHeader>
    <CardTitle>Deployment</CardTitle>
    <CardDescription>Last run 4 minutes ago.</CardDescription>
  </CardHeader>
  <CardBody>Build 1482 finished on main.</CardBody>
  <CardFooter>
    <Button size="sm">Re-run</Button>
  </CardFooter>
</Card>`,
      render: () => (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <CardDescription>Last run 4 minutes ago.</CardDescription>
          </CardHeader>
          <CardBody className="text-muted-foreground text-sm">
            Build 1482 finished on main.
          </CardBody>
          <CardFooter>
            <Button size="sm">Re-run</Button>
            <Button size="sm" variant="ghost">
              Logs
            </Button>
          </CardFooter>
        </Card>
      ),
    },
    {
      title: 'Variants',
      stack: true,
      code: `<Card variant="default" />
<Card variant="secondary" />
<Card variant="ghost" />`,
      render: () => (
        <>
          {VARIANTS.map((variant) => (
            <Card key={variant} variant={variant} className="max-w-sm">
              <CardBody className="text-muted-foreground text-sm">
                {variant}
              </CardBody>
            </Card>
          ))}
        </>
      ),
    },
    {
      title: 'Sizes',
      stack: true,
      code: `<Card size="sm">…</Card>
<Card size="default">…</Card>
<Card size="lg">…</Card>`,
      render: () => (
        <>
          {SIZES.map((size) => (
            <Card key={size} size={size} className="max-w-sm">
              <CardHeader>
                <CardTitle>{size}</CardTitle>
              </CardHeader>
              <CardBody className="text-muted-foreground text-sm">
                Padding follows the Card, not each section.
              </CardBody>
            </Card>
          ))}
        </>
      ),
    },
  ],
}
