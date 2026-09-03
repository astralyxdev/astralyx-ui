import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { ComponentEntry, ComposerState } from './types'

const SEPARATORS = ['chevron', 'slash'] as const

function composeBreadcrumb(state: ComposerState) {
  const sep =
    state.separator === 'slash'
      ? '<BreadcrumbSeparator>/</BreadcrumbSeparator>'
      : '<BreadcrumbSeparator />'

  const middle = state.collapsed
    ? `    <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>\n    ${sep}\n`
    : `    <BreadcrumbItem>\n      <BreadcrumbLink href="/components">Components</BreadcrumbLink>\n    </BreadcrumbItem>\n    ${sep}\n`

  return `<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    ${sep}
${middle}    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`
}

export const breadcrumbEntry: ComponentEntry = {
  id: 'breadcrumb',
  label: 'Breadcrumb',
  description:
    'The trail back up the hierarchy. An ordered list in a labelled nav, with the current page marked aria-current and deliberately not linked.',
  usage: `import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`,
  composer: {
    controls: [
      { type: 'select', prop: 'separator', label: 'separator', options: SEPARATORS, default: 'chevron' },
      { type: 'boolean', prop: 'collapsed', label: 'collapse middle', default: false },
    ],
    render: (state) => {
      const sep =
        state.separator === 'slash' ? (
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
        ) : (
          <BreadcrumbSeparator />
        )

      return (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            {sep}
            <BreadcrumbItem>
              {state.collapsed ? (
                <BreadcrumbEllipsis />
              ) : (
                <BreadcrumbLink href="#">Components</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {sep}
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )
    },
    code: composeBreadcrumb,
  },
  api: [
    { name: 'Breadcrumb', type: 'nav', description: 'Labelled landmark wrapping the trail.' },
    { name: 'BreadcrumbList', type: 'ol', description: 'Ordered, because the sequence carries meaning.' },
    { name: 'BreadcrumbLink', type: 'a', description: 'A navigable ancestor. Accepts any anchor props, including asChild-style routing via a custom element.' },
    { name: 'BreadcrumbPage', type: 'span', description: 'The current page: aria-current="page" and not a link, since linking to where you already are is noise.' },
    { name: 'BreadcrumbSeparator', type: 'li', description: 'Presentational and aria-hidden. Defaults to a chevron; pass children to replace it.' },
    { name: 'BreadcrumbEllipsis', type: 'span', description: 'Stands in for collapsed middle segments.' },
  ],
  demos: [
    {
      title: 'Default',
      stack: true,
      code: `<Breadcrumb>…</Breadcrumb>`,
      render: () => (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ),
    },
    {
      title: 'Custom separator',
      stack: true,
      code: `<BreadcrumbSeparator>/</BreadcrumbSeparator>
<BreadcrumbSeparator>&rsaquo;</BreadcrumbSeparator>`,
      render: () => (
        <>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Components</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Docs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>&rsaquo;</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Docs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </>
      ),
    },
    {
      title: 'Collapsed',
      stack: true,
      code: `<BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>`,
      render: () => (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ),
    },
  ],
}
