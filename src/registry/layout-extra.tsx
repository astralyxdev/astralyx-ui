import { useState } from 'react'
import { Bold, Italic, Link2, List, Underline } from 'lucide-react'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Menubar, type MenubarMenu } from '@/components/ui/menubar'
import {
  NavigationMenu,
  NavigationMenuLink,
  NavigationMenuSection,
  type NavigationMenuEntry,
} from '@/components/ui/navigation-menu'
import { TableOfContents, type TocItem } from '@/components/ui/table-of-contents'
import { Toggle } from '@/components/ui/toggle'
import { Toolbar, ToolbarSeparator } from '@/components/ui/toolbar'
import { Tour } from '@/components/ui/tour'
import { Typography } from '@/components/ui/typography'
import type { ComponentEntry, ComposerState } from './types'

const TONES = ['info', 'success', 'warning', 'danger', 'neutral'] as const

export const bannerEntry: ComponentEntry = {
  id: 'banner',
  label: 'Banner',
  description:
    'A page-level announcement strip. Distinct from Alert, which belongs to the content around it — a banner spans the page and belongs to the session.',
  usage: `import { Banner } from '@/components/ui/banner'

<Banner tone="warning" title="Scheduled maintenance" dismissible>
  The API will be unavailable on Sunday from 02:00 UTC.
</Banner>`,
  composer: {
    controls: [
      { type: 'select', prop: 'tone', label: 'tone', options: TONES, default: 'info' },
      { type: 'boolean', prop: 'dismissible', label: 'dismissible', default: true },
    ],
    render: (state) => (
      <div className="w-full">
        <Banner
          key={String(state.tone)}
          tone={String(state.tone) as (typeof TONES)[number]}
          title="Scheduled maintenance"
          dismissible={Boolean(state.dismissible)}
          action={
            <Button size="xs" variant="secondary">
              Details
            </Button>
          }
        >
          The API will be unavailable on Sunday from 02:00 UTC.
        </Banner>
      </div>
    ),
    code: (s: ComposerState) =>
      `<Banner tone="${s.tone}" title="Scheduled maintenance" dismissible={${Boolean(s.dismissible)}}>\n  The API will be unavailable on Sunday from 02:00 UTC.\n</Banner>`,
  },
  api: [
    { name: 'tone', type: TONES.map((t) => `'${t}'`).join(' | '), default: "'info'", description: 'Icon and tint.' },
    { name: 'dismissible / onDismiss', type: 'boolean / () => void', description: 'Hides itself and reports; persistence is the caller’s.' },
    { name: 'action', type: 'ReactNode', description: 'A single control, right-aligned before the dismiss button.' },
    { name: 'role', type: 'status', description: 'Not `alert` — an assertive live region interrupts a screen reader mid-sentence, which is right for a form error and wrong for a maintenance notice.' },
  ],
  demos: [
    {
      title: 'Tones',
      stack: true,
      code: `<Banner tone="warning" title="Scheduled maintenance">…</Banner>`,
      render: () => (
        <div className="flex w-full flex-col gap-2">
          <Banner tone="info" title="New in 1.4.2">Sidebar, Timeline and Stat have landed.</Banner>
          <Banner tone="warning" title="Scheduled maintenance" dismissible>
            The API will be unavailable on Sunday from 02:00 UTC.
          </Banner>
          <Banner tone="danger" title="Payment failed">Update your card to avoid interruption.</Banner>
        </div>
      ),
    },
  ],
}

export const toolbarEntry: ComponentEntry = {
  id: 'toolbar',
  label: 'Toolbar',
  description:
    'A group of controls that arrow keys move between — the ARIA role ButtonGroup deliberately does not claim, because claiming it without implementing it is worse than not claiming it.',
  usage: `import { Toolbar, ToolbarSeparator } from '@/components/ui/toolbar'

<Toolbar>
  <Toggle size="sm"><Bold /></Toggle>
  <ToolbarSeparator />
  <Toggle size="sm"><List /></Toggle>
</Toolbar>`,
  composer: {
    controls: [
      { type: 'select', prop: 'orientation', label: 'orientation', options: ['horizontal', 'vertical'], default: 'horizontal' },
    ],
    render: (state) => (
      <Toolbar
        orientation={String(state.orientation) as 'horizontal' | 'vertical'}
        className="bg-secondary w-fit rounded-lg p-1"
      >
        <Toggle size="sm" aria-label="Bold"><Bold /></Toggle>
        <Toggle size="sm" aria-label="Italic"><Italic /></Toggle>
        <Toggle size="sm" aria-label="Underline"><Underline /></Toggle>
        <ToolbarSeparator orientation={state.orientation === 'vertical' ? 'horizontal' : 'vertical'} />
        <Toggle size="sm" aria-label="List"><List /></Toggle>
        <Toggle size="sm" aria-label="Link"><Link2 /></Toggle>
      </Toolbar>
    ),
    code: (s: ComposerState) =>
      `<Toolbar orientation="${s.orientation}">\n  <Toggle size="sm"><Bold /></Toggle>\n  <ToolbarSeparator />\n  <Toggle size="sm"><List /></Toggle>\n</Toolbar>`,
  },
  api: [
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Decides which arrow keys move focus and sets aria-orientation.' },
    { name: 'focus', type: 'roving', description: 'Recomputed on each key rather than cached on mount — toolbars gain and lose buttons as selection changes.' },
    { name: 'ToolbarSeparator', type: 'component', description: 'A hairline between groups, with the right role and orientation.' },
  ],
  demos: [
    {
      title: 'Formatting bar',
      code: `<Toolbar>…</Toolbar>`,
      render: () => (
        <Toolbar className="bg-secondary w-fit rounded-lg p-1">
          <Toggle size="sm" aria-label="Bold"><Bold /></Toggle>
          <Toggle size="sm" aria-label="Italic"><Italic /></Toggle>
          <ToolbarSeparator />
          <Toggle size="sm" aria-label="List"><List /></Toggle>
        </Toolbar>
      ),
    },
  ],
}

export const typographyEntry: ComponentEntry = {
  id: 'typography',
  label: 'Typography',
  description:
    'Prose styling for content you did not author element by element — rendered markdown, a CMS body, a changelog. Headings start at h2, since the page already has its h1.',
  usage: `import { Typography } from '@/components/ui/typography'

<Typography dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['sm', 'default', 'lg'], default: 'default' },
    ],
    render: (state) => (
      <Typography size={String(state.size) as 'sm' | 'default' | 'lg'} className="max-w-lg">
        <h2>Configuration in CSS</h2>
        <p>
          Tailwind v4 moves configuration into CSS. Define tokens in an{' '}
          <code>@theme</code> block and the utilities are generated from them.
        </p>
        <h3>What changes</h3>
        <ul>
          <li>No <code>tailwind.config.js</code> for tokens</li>
          <li>Custom properties inherit through the tree</li>
        </ul>
        <blockquote>The token and the class that uses it live in one file.</blockquote>
      </Typography>
    ),
    code: (s: ComposerState) => `<Typography size="${s.size}">\n  {renderedMarkdown}\n</Typography>`,
  },
  api: [
    { name: 'size', type: "'sm' | 'default' | 'lg'", default: "'default'", description: 'Base text size; the scale within the block is relative.' },
    { name: 'rhythm', type: 'adjacent siblings', description: 'Spacing comes from `* + *` rules rather than a margin on every element, which is why prose blocks usually have too much space after headings and too little between list items.' },
    { name: 'headings', type: 'h2 and below', description: 'A prose block is page content; shipping its own h1 gives the document two.' },
    { name: 'PROSE', type: 'string', description: 'The class string, exported for applying to an element you already control.' },
  ],
  demos: [
    {
      title: 'Rendered markdown',
      stack: true,
      code: `<Typography>{renderedMarkdown}</Typography>`,
      render: () => (
        <Typography className="max-w-lg">
          <h2>Configuration in CSS</h2>
          <p>
            Define tokens in an <code>@theme</code> block and the utilities are
            generated from them.
          </p>
          <ul>
            <li>No config file for tokens</li>
            <li>Custom properties inherit</li>
          </ul>
        </Typography>
      ),
    },
  ],
}

const MENUS: MenubarMenu[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'new', label: 'New file', shortcut: '⌘N' },
      { id: 'open', label: 'Open…', shortcut: '⌘O' },
      { id: 'save', label: 'Save', shortcut: '⌘S', separatorBefore: true },
      { id: 'close', label: 'Close window', shortcut: '⌘W' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'undo', label: 'Undo', shortcut: '⌘Z' },
      { id: 'redo', label: 'Redo', shortcut: '⇧⌘Z' },
      { id: 'find', label: 'Find…', shortcut: '⌘F', separatorBefore: true },
      { id: 'replace', label: 'Replace…', shortcut: '⌥⌘F', disabled: true },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'sidebar', label: 'Toggle sidebar', shortcut: '⌘B' },
      { id: 'terminal', label: 'Toggle terminal', shortcut: '⌃`' },
    ],
  },
]

export const menubarEntry: ComponentEntry = {
  id: 'menubar',
  label: 'Menubar',
  description:
    'An application menu bar. What makes it a menu bar rather than a row of dropdowns: once one menu is open, moving along the bar opens the next instead of merely focusing it.',
  usage: `import { Menubar } from '@/components/ui/menubar'

<Menubar menus={menus} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'menus', label: 'menus', default: 3, min: 1, max: 4, step: 1 },
    ],
    render: (state: ComposerState) => (
      <Menubar menus={MENUS.slice(0, Number(state.menus))} className="w-fit" />
    ),
    code: () => `<Menubar menus={menus} />`,
  },
  api: [
    { name: 'menus', type: 'MenubarMenu[]', description: '`{ id, label, items }` where an item is `{ id, label, shortcut?, disabled?, separatorBefore?, onSelect? }`.' },
    { name: 'keyboard', type: '← → Home End', description: 'Left and Right belong to the bar, Up and Down to the open menu. The bar is one tab stop.' },
    { name: 'hover', type: 'switches menus', description: 'Only while a menu is already open — hovering a closed bar does nothing.' },
  ],
  demos: [
    { title: 'Application menus', stack: true, code: `<Menubar menus={menus} />`, render: () => <Menubar menus={MENUS} className="w-fit" /> },
  ],
}

const NAV_ENTRIES: NavigationMenuEntry[] = [
  {
    id: 'product',
    label: 'Product',
    content: (
      <div className="flex gap-6">
        <NavigationMenuSection title="Build">
          <NavigationMenuLink href="#" title="Components" description="142 primitives, no dependencies" />
          <NavigationMenuLink href="#" title="Themes" description="One token set, both modes" />
        </NavigationMenuSection>
        <NavigationMenuSection title="Ship">
          <NavigationMenuLink href="#" title="Pipelines" description="Build, test, deploy" />
          <NavigationMenuLink href="#" title="Observability" description="Logs, metrics, alerts" />
        </NavigationMenuSection>
      </div>
    ),
  },
  {
    id: 'developers',
    label: 'Developers',
    content: (
      <NavigationMenuSection title="Resources">
        <NavigationMenuLink href="#" title="Documentation" description="Guides and API reference" />
        <NavigationMenuLink href="#" title="Changelog" description="What shipped, and when" />
      </NavigationMenuSection>
    ),
  },
  { id: 'pricing', label: 'Pricing', href: '#' },
]

export const navigationMenuEntry: ComponentEntry = {
  id: 'navigation-menu',
  label: 'Navigation Menu',
  description:
    'A site nav bar with mega-menu panels and hover intent — a short open delay so crossing the bar does not flash panels, and a longer close delay so the panel is reachable.',
  usage: `import { NavigationMenu } from '@/components/ui/navigation-menu'

<NavigationMenu entries={entries} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'openDelay', label: 'openDelay', options: ['0', '150', '400'], default: '150' },
    ],
    render: (state) => (
      <NavigationMenu entries={NAV_ENTRIES} openDelay={Number(state.openDelay)} />
    ),
    code: (s: ComposerState) =>
      `<NavigationMenu entries={entries} openDelay={${s.openDelay}} />`,
  },
  api: [
    { name: 'entries', type: 'NavigationMenuEntry[]', description: '`{ id, label, href?, content? }` — content makes it a panel trigger, href a plain link.' },
    { name: 'openDelay / closeDelay', type: 'number', default: '150 / 250', description: 'Once any panel is open, switching between triggers is immediate: the delay only decides whether you meant to open at all.' },
    { name: 'NavigationMenuSection / NavigationMenuLink', type: 'components', description: 'A titled column, and a title-plus-description link inside a panel.' },
  ],
  demos: [
    { title: 'Mega menu', stack: true, code: `<NavigationMenu entries={entries} />`, render: () => <NavigationMenu entries={NAV_ENTRIES} /> },
  ],
}

function DrawerDemo({
  title = 'Filter builds',
  footer = true,
}: { title?: string; footer?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open drawer
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            Drag the handle down or press Escape to dismiss.
          </DrawerDescription>
        </DrawerHeader>
        <p className="text-muted-foreground text-sm">
          Sheet covers side panels; this is the mobile gesture — a grab handle, a
          drag that follows your finger, and a flick that closes it.
        </p>
        {footer && (
          <DrawerFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Apply</Button>
          </DrawerFooter>
        )}
      </Drawer>
    </>
  )
}

export const drawerEntry: ComponentEntry = {
  id: 'drawer',
  label: 'Drawer',
  description:
    'A bottom sheet you can drag away. Built on a native dialog, so focus containment and inerting the page come from the platform rather than a hand-rolled trap.',
  usage: `import { Drawer, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

<Drawer open={open} onOpenChange={setOpen}>
  <DrawerHeader><DrawerTitle>Filters</DrawerTitle></DrawerHeader>
  …
</Drawer>`,
  composer: {
    controls: [
      { type: 'text', prop: 'title', label: 'title', default: 'Filter builds' },
      { type: 'boolean', prop: 'footer', label: 'footer actions', default: true },
    ],
    render: (state: ComposerState) => (
      <DrawerDemo title={String(state.title)} footer={Boolean(state.footer)} />
    ),
    code: () => `<Drawer open={open} onOpenChange={setOpen}>\n  …\n</Drawer>`,
  },
  api: [
    { name: 'open / onOpenChange', type: 'boolean / (open) => void', description: 'Controlled only — the drawer never closes itself without telling you.' },
    { name: 'dismissal', type: 'distance or velocity', description: 'A flick closes it without dragging the full height; anything shorter and slower snaps back.' },
    { name: 'drag', type: 'transform', description: 'Transition is off while the finger is down — animating a value you are also setting every frame lags behind the pointer.' },
    { name: 'parts', type: 'DrawerHeader / Title / Description / Footer', description: 'Same shape as Dialog and Sheet.' },
  ],
  demos: [
    { title: 'Bottom sheet', code: `<Drawer open={open} onOpenChange={setOpen}>…</Drawer>`, render: () => <DrawerDemo /> },
  ],
}

const TOC_ITEMS: TocItem[] = [
  { id: 'toc-install', label: 'Installation', level: 2 },
  { id: 'toc-tokens', label: 'Tokens', level: 2 },
  { id: 'toc-dark', label: 'Dark mode', level: 3 },
  { id: 'toc-usage', label: 'Usage', level: 2 },
]

export const tableOfContentsEntry: ComponentEntry = {
  id: 'table-of-contents',
  label: 'Table of Contents',
  description:
    'An anchor list that tracks which heading is on screen, through IntersectionObserver rather than scroll offsets. Reads the DOM by default, so it works for rendered markdown.',
  usage: `import { TableOfContents } from '@/components/ui/table-of-contents'

<TableOfContents selector="h2, h3" container="#doc" />`,
  composer: {
    tall: true,
    controls: [{ type: 'text', prop: 'label', label: 'label', default: 'On this page' }],
    render: (state) => (
      <div className="w-full max-w-56">
        <TableOfContents items={TOC_ITEMS} label={String(state.label)} />
      </div>
    ),
    code: (s: ComposerState) =>
      `<TableOfContents selector="h2, h3" label="${s.label}" />`,
  },
  api: [
    { name: 'items', type: 'TocItem[]', description: 'Supply headings directly, or omit and let it read the DOM.' },
    { name: 'selector / container', type: 'string', default: "'h2, h3'", description: 'What to collect and where. Headings need ids.' },
    { name: 'scroll-spy', type: 'IntersectionObserver', description: 'The rootMargin pulls the detection band to the top quarter of the viewport — without it the highlight sits one or two headings ahead of what you are reading.' },
    { name: 'useHeadings', type: 'hook', description: 'Exported, for building your own list.' },
  ],
  demos: [
    { title: 'Anchors', stack: true, code: `<TableOfContents selector="h2, h3" />`, render: () => <div className="w-full max-w-56"><TableOfContents items={TOC_ITEMS} /></div> },
  ],
}

function TourDemo({ scope, steps = 2 }: { scope: string; steps?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Start tour
        </Button>
        <Button id={`${scope}-save`} variant="secondary">Save</Button>
        <Button id={`${scope}-publish`}>Publish</Button>
      </div>
      <Tour
        open={open}
        onOpenChange={setOpen}
        steps={[
          { target: `#${scope}-save`, title: 'Save a draft', content: 'Keeps your work without publishing it.' },
          { target: `#${scope}-publish`, title: 'Publish', content: 'Makes the page visible to everyone.', side: 'bottom' as const },
          { target: `#${scope}-save`, title: 'Back to drafts', content: 'Everything you have not published lives here.' },
        ].slice(0, steps)}
      />
    </div>
  )
}

export const tourEntry: ComponentEntry = {
  id: 'tour',
  label: 'Tour',
  description:
    'Guided coach marks over the real interface. Steps point at selectors, so a tour is data next to the copy it belongs to rather than refs threaded through every component it visits.',
  usage: `import { Tour } from '@/components/ui/tour'

<Tour open={open} onOpenChange={setOpen} steps={steps} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'number', prop: 'steps', label: 'steps', default: 3, min: 1, max: 3, step: 1 },
    ],
    render: (state: ComposerState) => (
      <TourDemo scope="tour-composer" steps={Number(state.steps)} />
    ),
    code: () => `<Tour\n  open={open}\n  onOpenChange={setOpen}\n  steps={[{ target: '#publish', title: 'Publish', content: '…' }]}\n/>`,
  },
  api: [
    { name: 'steps', type: 'TourStep[]', description: '`{ target, title, content, side? }` where target is a CSS selector.' },
    { name: 'missing targets', type: 'skipped', description: 'A step whose element is absent is passed over rather than shown floating — targets disappear behind flags and closed panels all the time.' },
    { name: 'spotlight', type: 'outline', description: 'A ring drawn with a huge outline dims everything else in one element, and leaves the target fully interactive because nothing covers it.' },
    { name: 'onFinish', type: '() => void', description: 'Fires on Done, on dismiss, and when no step can be shown.' },
  ],
  demos: [
    { title: 'Coach marks', stack: true, code: `<Tour open={open} onOpenChange={setOpen} steps={steps} />`, render: () => <TourDemo scope="tour-demo" /> },
  ],
}
