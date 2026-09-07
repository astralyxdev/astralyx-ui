'use client'

import { useState } from 'react'
import { Bell, FileText, Home, LifeBuoy, Search, Settings, Users } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/ui/logo'
import type { ComponentEntry, ComposerState } from './types'

const NAV = [
  { id: 'home', label: 'Home', icon: <Home /> },
  { id: 'docs', label: 'Documents', icon: <FileText /> },
  { id: 'team', label: 'Team', icon: <Users /> },
]

const SUPPORT = [
  { id: 'alerts', label: 'Alerts', icon: <Bell /> },
  { id: 'help', label: 'Support', icon: <LifeBuoy /> },
]

/** The frame is `min-h-svh` in real use; demos pin it to a fixed height. */
const DEMO_FRAME = 'h-96 min-h-0'

const SETTINGS_NAV = [
  { id: 'profile', label: 'Profile', icon: <Users /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell /> },
  { id: 'security', label: 'Security', icon: <Settings /> },
]

const SETTINGS_WORKSPACE = [
  { id: 'members', label: 'Members', icon: <Users /> },
  { id: 'billing', label: 'Billing', icon: <FileText /> },
]

/**
 * The page variant: navigation inside a page rather than around the app.
 *
 * Nothing collapses, so there is no trigger and no shortcut, and the rows are
 * painted in the page's own theme instead of on the rail's fixed black.
 */
function PageSidebarPreview() {
  const [section, setSection] = useState('notifications')
  const all = [...SETTINGS_NAV, ...SETTINGS_WORKSPACE]
  const active = all.find((item) => item.id === section) ?? all[0]

  return (
    <SidebarProvider variant="page" className="w-full">
      <Sidebar>
        <SidebarContent className="px-0">
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              {SETTINGS_NAV.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    icon={item.icon}
                    isActive={section === item.id}
                    onClick={() => setSection(item.id)}
                  >
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {SETTINGS_WORKSPACE.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    icon={item.icon}
                    isActive={section === item.id}
                    onClick={() => setSection(item.id)}
                  >
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <h3 className="text-sm font-semibold">{active.label}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          The nav keeps its width and its labels at every size, and the panel
          beside it is ordinary page content — no second card inside the one
          this already sits in.
        </p>
      </SidebarInset>
    </SidebarProvider>
  )
}

function SidebarPreview({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen} className={DEMO_FRAME}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-9 items-center px-2.5">
            {/* The wordmark is ~65px wide and the rail is 52, so the collapsed
                state shows the mark alone — the same SVG, cropped by viewBox.
                Only one is ever displayed, so only one is in the a11y tree. */}
            <Logo className="h-4 w-auto shrink-0 group-data-[state=collapsed]/sidebar:hidden" />
            <Logo
              viewBox="0 0 42 74"
              className="hidden h-4 w-auto shrink-0 group-data-[state=collapsed]/sidebar:block"
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {NAV.map((item, index) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton icon={item.icon} isActive={index === 0}>
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Support</SidebarGroupLabel>
            <SidebarMenu>
              {SUPPORT.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton icon={item.icon}>{item.label}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton icon={<Settings />}>Settings</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="border-border flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Overview</span>
          <Search className="text-muted-foreground ms-auto size-4" />
        </header>
        <div className="text-muted-foreground flex-1 p-4 text-sm">
          The panel is the only raised surface, so the rail reads as part of the page.
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const USAGE = `import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/components/ui/sidebar'

<SidebarProvider>
  <Sidebar>
    <SidebarHeader>…</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton icon={<Home />} isActive>Home</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>

  <SidebarInset>
    <SidebarTrigger />
    …
  </SidebarInset>
</SidebarProvider>`

function composeSidebar(state: ComposerState) {
  return `<SidebarProvider defaultOpen={${Boolean(state.defaultOpen)}}>
  <Sidebar>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton icon={<Home />} isActive>Home</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>

  <SidebarInset>
    <SidebarTrigger />
  </SidebarInset>
</SidebarProvider>`
}

/**
 * Two panels in one frame: navigation on the left, an inspector on the right.
 *
 * Each opens on its own, and each trigger names the side it drives — two
 * buttons both saying "Expand sidebar" is a coin toss for anyone who cannot
 * see which is which.
 */
function TwoSidedPreview() {
  const [open, setOpen] = useState({ left: true, right: true })

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next, side) => setOpen((current) => ({ ...current, [side]: next }))}
      className={DEMO_FRAME}
    >
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton icon={item.icon} isActive={item.id === 'home'}>
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="border-border flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger label="navigation" />
          <span className="text-sm font-medium">Overview</span>
          {/* The right trigger sits at the far end, beside the panel it opens. */}
          <SidebarTrigger position="right" label="inspector" className="ms-auto" />
        </header>
        <p className="text-muted-foreground p-4 text-sm">
          The navigation collapses to icons, so its destinations stay one click
          away. The inspector collapses to nothing and gives the width back,
          because a detail panel nobody is reading should not cost a strip of
          the window. Cmd-B drives the navigation.
        </p>
      </SidebarInset>

      {/* Written last, but `position` is what places it — a right sidebar put
          first in the markup still lands after the content. */}
      <Sidebar position="right" collapsedTo="nothing">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Inspector</SidebarGroupLabel>
            <SidebarMenu>
              {SUPPORT.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton icon={item.icon}>{item.label}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}

export const sidebarEntry: ComponentEntry = {
  id: 'sidebar',
  label: 'Sidebar',
  description:
    'Two sidebars from one set of parts: the app frame, a transparent rail beside a rounded content panel, and a static nav that lives inside a page. Either can be pinned to the left or the right, two can share one frame, and a rail collapses to icons or to nothing at all.',
  usage: USAGE,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'defaultOpen', label: 'defaultOpen', default: true }],
    render: (state) => <SidebarPreview defaultOpen={Boolean(state.defaultOpen)} />,
    code: composeSidebar,
  },
  api: [
    {
      name: 'SidebarProvider variant',
      type: "'app' | 'page'",
      default: "'app'",
      description:
        '`app` is the product frame that owns the window, collapses to a rail and paints its own fixed ground. `page` is navigation inside a page — a settings nav, a docs section — which never collapses, has no trigger and no shortcut, takes its height from whatever contains it, and is painted in the page theme. One prop rather than three booleans, because they are not independent: a sidebar that does not own the window has nothing to collapse into and no ground of its own to paint.',
    },
    {
      name: 'Sidebar position',
      type: "'left' | 'right'",
      default: "'left'",
      description:
        'Which edge to pin to. Two sidebars can share one provider — navigation on the left, an inspector on the right — and they open independently. The order is set from the prop, not from the markup, so a right sidebar written before the content still lands after it.',
    },
    {
      name: 'Sidebar collapsedTo',
      type: "'icon' | 'nothing'",
      default: "'icon'",
      description:
        'What is left when it collapses. `icon` keeps the 52px rail, which is right for navigation: every destination stays one click away and the layout never reflows. `nothing` gives the width back, which is right for a detail panel — an inspector nobody is reading should not cost a strip of the window. Hidden rather than unmounted, so the trigger’s `aria-controls` keeps resolving.',
    },
    {
      name: 'SidebarTrigger position / label',
      type: "'left' | 'right' / string",
      default: "'left' / '<side> sidebar'",
      description:
        'Which panel the button toggles, and what to call it. Two triggers in one header both announcing “Expand sidebar” is a coin toss for anyone who cannot see which is which, so `label` names the panel instead.',
    },
    {
      name: 'SidebarProvider open / defaultOpen / onOpenChange',
      type: 'boolean / boolean / (open: boolean) => void',
      default: 'defaultOpen: true',
      description:
        'Controlled or uncontrolled rail state. A boolean sets both sides; an object like `{ left: true, right: false }` sets the ones it names, and a side the caller does not name keeps looking after itself. `onOpenChange` is told which side moved. Below the md breakpoint both rails are pinned collapsed and these are ignored — at 36px it is already the mobile layout, so there is nothing to overlay.',
    },
    {
      name: 'SidebarMenuButton icon',
      type: 'ReactNode',
      description:
        'Leading icon, sized to 16px by the row. It stays on the rail centre line in both states, so nothing shifts sideways as the label appears.',
    },
    {
      name: 'SidebarMenuButton isActive',
      type: 'boolean',
      default: 'false',
      description: 'Marks the current page. Fills the row with the secondary surface.',
    },
    {
      name: 'SidebarMenuButton asChild',
      type: 'boolean',
      default: 'false',
      description: 'Render a router link instead of a button, keeping the row styling.',
    },
    {
      name: 'SidebarMenuButton tooltip',
      type: 'ReactNode',
      description:
        'Shown on hover while collapsed. Defaults to the row label. The label itself becomes sr-only rather than unmounting, so the accessible name survives the collapse.',
    },
    {
      name: 'useSidebar()',
      type: '{ open, setOpen, toggle, locked }',
      description:
        'Rail state for custom chrome. `locked` is true below md, where SidebarTrigger renders nothing.',
    },
    {
      name: 'grid',
      type: '8 / 52 / 256px',
      description:
        'Gutter, collapsed rail and expanded width. The rail is a 36px control unit plus the same 8px gutter either side — that gutter is load-bearing, since the scrolling content clips a row focus ring at its padding box. The 10px row inset is (36 − 16) / 2, which holds the icon on the rail centre line in both states.',
    },
    {
      name: 'shortcut',
      type: '⌘B / Ctrl-B',
      description: 'Toggles the rail while the frame is mounted and the viewport is at least md.',
    },
  ],
  demos: [
    {
      title: 'Expanded',
      stack: true,
      code: `<SidebarProvider>
  <Sidebar>…</Sidebar>
  <SidebarInset>…</SidebarInset>
</SidebarProvider>`,
      render: () => <SidebarPreview />,
    },
    {
      title: 'One on each side',
      stack: true,
      code: `// Two panels in one frame. Each opens on its own, and \`position\` places
// them — a right sidebar written first still lands after the content.
<SidebarProvider
  open={open}
  onOpenChange={(next, side) => setOpen({ ...open, [side]: next })}
>
  <Sidebar>…</Sidebar>

  <SidebarInset>
    <SidebarTrigger label="navigation" />
    <SidebarTrigger position="right" label="inspector" />
  </SidebarInset>

  {/* Gives the width back rather than leaving a rail behind. */}
  <Sidebar position="right" collapsedTo="nothing">…</Sidebar>
</SidebarProvider>`,
      render: () => <TwoSidedPreview />,
    },
    {
      title: 'Inside a page, static',
      stack: true,
      code: `// Navigation within a page — a settings nav, a docs section, a wizard.
// Never collapses, so there is no trigger and no Cmd-B, and the rows are
// painted in the page theme rather than on the rail's fixed black.
<SidebarProvider variant="page">
  <Sidebar>
    <SidebarContent className="px-0">
      <SidebarGroup>
        <SidebarGroupLabel>Account</SidebarGroupLabel>
        <SidebarMenu>…</SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>…</SidebarInset>
</SidebarProvider>`,
      render: () => (
        <div className="w-full">
          <PageSidebarPreview />
        </div>
      ),
    },
    {
      title: 'Collapsed to icons',
      stack: true,
      code: `<SidebarProvider defaultOpen={false}>
  <Sidebar>…</Sidebar>
  <SidebarInset>…</SidebarInset>
</SidebarProvider>`,
      render: () => <SidebarPreview defaultOpen={false} />,
    },
  ],
}
