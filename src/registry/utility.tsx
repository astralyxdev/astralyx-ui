import { useState } from 'react'
import { LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Composer } from '@/components/ui/composer'
import { readableInk } from '@/components/ui/label-picker'
import { CopyButton } from '@/components/ui/copy-button'
import { Countdown } from '@/components/ui/countdown'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LiveAnnouncer, useAnnouncer } from '@/components/ui/live-announcer'
import { PageHeader } from '@/components/ui/page-header'
import { SkipLink } from '@/components/ui/skip-link'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Badge } from '@/components/ui/badge'
import type { ComponentEntry, ComposerState } from './types'

export const copyButtonEntry: ComponentEntry = {
  id: 'copy-button',
  label: 'Copy Button',
  description:
    'Copies a string and says so. Extracted after the same clipboard-plus-timer was written four times in this kit — CodeBlock, Terminal, EnvVars and Message all route through it now.',
  usage: `import { CopyButton } from '@/components/ui/copy-button'
import { Countdown } from '@/components/ui/countdown'
import { useClipboard } from '@/lib/use-clipboard'

<CopyButton value={snippet} />
<CopyButton value={() => buildExpensiveText()} showLabel />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'showLabel', label: 'showLabel', default: false },
      { type: 'text', prop: 'value', label: 'value', default: 'npm i astralyx-ui' },
    ],
    render: (state) => (
      <CopyButton value={String(state.value)} showLabel={Boolean(state.showLabel)} />
    ),
    code: (s: ComposerState) =>
      `<CopyButton value="${s.value}" showLabel={${Boolean(s.showLabel)}} />`,
  },
  api: [
    { name: 'value', type: 'string | (() => string)', description: 'A function is read at click time — for text that is expensive to build or that changes after render.' },
    { name: 'showLabel', type: 'boolean', default: 'false', description: 'Render the label beside the icon. When off it is still the accessible name, which is what changes to "Copied" — a tick replacing a clipboard is invisible to a screen reader.' },
    { name: 'label / copiedLabel', type: 'string', description: 'Wording for both states.' },
    { name: 'useClipboard', type: 'hook', description: 'The underlying hook: clears its timeout on unmount, restarts rather than stacks on a second copy, and reports `error` when the write is rejected instead of claiming success.' },
  ],
  demos: [
    {
      title: 'Icon and labelled',
      code: `<CopyButton value={text} />
<CopyButton value={text} showLabel />`,
      render: () => (
        <div className="flex items-center gap-3">
          <CopyButton value="npm i astralyx-ui" />
          <CopyButton value="npm i astralyx-ui" showLabel />
        </div>
      ),
    },
  ],
}

export const themeToggleEntry: ComponentEntry = {
  id: 'theme-toggle',
  label: 'Theme Toggle',
  description:
    'Switches the document between light and dark. Uncontrolled by default: it reads the class already on the element rather than flashing to its own idea of the default on mount.',
  usage: `import { ThemeToggle } from '@/components/ui/theme-toggle'

<ThemeToggle />
<ThemeToggle dark={dark} onDarkChange={setDark} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'size', label: 'size', options: ['icon-xs', 'icon-sm', 'icon'], default: 'icon-sm' },
      { type: 'select', prop: 'variant', label: 'variant', options: ['ghost', 'secondary', 'outline'], default: 'ghost' },
    ],
    render: (state: ComposerState) => (
      <ThemeToggle
        size={state.size as 'icon-xs' | 'icon-sm' | 'icon'}
        variant={state.variant as 'ghost' | 'secondary' | 'outline'}
      />
    ),
    code: () => `<ThemeToggle />`,
  },
  api: [
    { name: 'dark / onDarkChange', type: 'boolean / (dark) => void', description: 'Controlled mode. Omit both and it manages itself.' },
    { name: 'target', type: 'document.documentElement', description: 'The class goes on the root, never a wrapper: `.dark` defines the token values on the element it lands on, so a descendant cannot switch a subtree back.' },
    { name: 'variant / size', type: 'ButtonProps', default: "'secondary' / 'icon-sm'", description: 'Passed through to Button.' },
  ],
  demos: [
    { title: 'Toggle', code: `<ThemeToggle />`, render: () => <ThemeToggle /> },
  ],
}

export const pageHeaderEntry: ComponentEntry = {
  id: 'page-header',
  label: 'Page Header',
  description:
    'The masthead a page opens with: eyebrow, title, lead and a meta row. Extracted after four pages in this catalogue had each grown their own copy and drifted apart.',
  usage: `import { PageHeader } from '@/components/ui/page-header'

<PageHeader
  eyebrow={<Breadcrumb>…</Breadcrumb>}
  title="Components"
  description="Every primitive in the kit."
  meta={<Badge size="sm">142 components</Badge>}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'title', label: 'title', default: 'Components' },
      { type: 'boolean', prop: 'meta', label: 'meta row', default: true },
    ],
    render: (state) => (
      <div className="w-full max-w-2xl">
        <PageHeader
          title={String(state.title)}
          description="Every primitive in the kit, written from scratch — no headless dependency, one token set for both themes."
          meta={state.meta ? <Badge size="sm">142 components</Badge> : undefined}
          className="mb-0"
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<PageHeader\n  title="${s.title}"\n  description="…"${s.meta ? '\n  meta={<Badge size="sm">142 components</Badge>}' : ''}\n/>`,
  },
  api: [
    { name: 'title', type: 'string', description: 'Rendered as the page h1, balanced across lines.' },
    { name: 'eyebrow', type: 'ReactNode', description: 'The line above the title — a breadcrumb, a source path, a section label.' },
    { name: 'description / meta', type: 'ReactNode', description: 'Lead paragraph, and a row beneath it for counts, badges or links.' },
  ],
  demos: [
    {
      title: 'Header',
      stack: true,
      code: `<PageHeader title="Components" description="…" meta={<Badge size="sm">142</Badge>} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <PageHeader
            title="Components"
            description="Every primitive in the kit, written from scratch."
            meta={<Badge size="sm">142 components</Badge>}
            className="mb-0"
          />
        </div>
      ),
    },
  ],
}

export const skipLinkEntry: ComponentEntry = {
  id: 'skip-link',
  label: 'Skip Link',
  description:
    'The first tab stop: jump past the navigation to the content. Invisible until focused, which is the whole design.',
  usage: `import { SkipLink } from '@/components/ui/skip-link'

<SkipLink href="#main" />
…
<main id="main" tabIndex={-1}>…</main>`,
  composer: {
    controls: [
      { type: 'text', prop: 'label', label: 'label', default: 'Skip to content' },
      { type: 'text', prop: 'href', label: 'href', default: '#demo-main' },
    ],
    render: (state: ComposerState) => (
      <div className="flex flex-col gap-2">
        <SkipLink href={String(state.href)} className="focus:static">
          {String(state.label)}
        </SkipLink>
        <p className="text-muted-foreground text-xs">
          Tab into the frame — the link appears on focus.
        </p>
      </div>
    ),
    code: () => `<SkipLink href="#main" />`,
  },
  api: [
    { name: 'href', type: 'string', default: "'#main'", description: 'The target. It needs `tabIndex={-1}` or the click scrolls the page but leaves focus on the link, so the next Tab starts from the top again.' },
    { name: 'visibility', type: 'sr-only + focus:not-sr-only', description: 'Appears on focus rather than sliding in from off-screen — a state change, not motion.' },
  ],
  demos: [
    {
      title: 'Focus to reveal',
      code: `<SkipLink href="#main" />`,
      render: () => <SkipLink href="#demo-main" className="focus:static" />,
    },
  ],
}

export const visuallyHiddenEntry: ComponentEntry = {
  id: 'visually-hidden',
  label: 'Visually Hidden',
  description:
    'Hidden from sight, present for screen readers. The clip technique — not display:none or visibility:hidden, both of which remove the element from the accessibility tree entirely.',
  usage: `import { VisuallyHidden } from '@/components/ui/visually-hidden'

<button>
  <TrashIcon />
  <VisuallyHidden>Delete invoice</VisuallyHidden>
</button>`,
  composer: {
    controls: [
      { type: 'text', prop: 'text', label: 'hidden text', default: 'an invisible but announced' },
      { type: 'boolean', prop: 'reveal', label: 'reveal (debug)', default: false },
    ],
    render: (state: ComposerState) => (
      <p className="text-sm">
        This sentence contains{' '}
        {state.reveal ? (
          <mark className="bg-[color-mix(in_oklab,var(--amber)_35%,transparent)]">
            {String(state.text)}
          </mark>
        ) : (
          <VisuallyHidden>{String(state.text)}</VisuallyHidden>
        )}{' '}
        hidden text.
      </p>
    ),
    code: () => `<VisuallyHidden>Delete invoice</VisuallyHidden>`,
  },
  api: [
    { name: 'asChild', type: 'boolean', default: 'false', description: 'Apply to an element that already carries its own classes.' },
    { name: 'technique', type: 'sr-only', description: 'Identical to Tailwind sr-only; the component exists so the intent is legible in the markup.' },
  ],
  demos: [
    {
      title: 'Icon button name',
      code: `<Button size="icon-sm">
  <Settings />
  <VisuallyHidden>Settings</VisuallyHidden>
</Button>`,
      render: () => (
        <Button size="icon-sm" variant="secondary">
          <Settings />
          <VisuallyHidden>Settings</VisuallyHidden>
        </Button>
      ),
    },
  ],
}

function AnnouncerDemo({
  politeness = 'polite',
  message = 'Filter applied',
}: { politeness?: 'polite' | 'assertive'; message?: string } = {}) {
  const announce = useAnnouncer()
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setCount((n) => n + 1)
          announce(`${message}, ${count + 1} results`, politeness)
        }}
      >
        Announce
      </Button>
      <span className="text-muted-foreground text-xs">
        Announced {count} time{count === 1 ? '' : 's'} — silent on screen.
      </span>
    </div>
  )
}

export const liveAnnouncerEntry: ComponentEntry = {
  id: 'live-announcer',
  label: 'Live Announcer',
  description:
    'Imperative screen-reader announcements for things with no visible region of their own — a background save finishing, a filter narrowing a list.',
  usage: `import { LiveAnnouncer, useAnnouncer } from '@/components/ui/live-announcer'

<LiveAnnouncer>
  <App />
</LiveAnnouncer>

const announce = useAnnouncer()
announce('Filter applied, 12 results')`,
  composer: {
    controls: [
      { type: 'select', prop: 'politeness', label: 'politeness', options: ['polite', 'assertive'], default: 'polite' },
      { type: 'text', prop: 'message', label: 'message', default: 'Filter applied' },
    ],
    render: (state: ComposerState) => (
      <LiveAnnouncer>
        <AnnouncerDemo
          politeness={state.politeness as 'polite' | 'assertive'}
          message={String(state.message)}
        />
      </LiveAnnouncer>
    ),
    code: () => `const announce = useAnnouncer()\nannounce('Saved', 'polite')`,
  },
  api: [
    { name: 'announce(message, politeness)', type: "(string, 'polite' | 'assertive') => void", description: 'Defaults to polite. Assertive interrupts whatever is being read — right for an error, wrong for "maintenance on Sunday".' },
    { name: 'two regions', type: 'internal', description: 'Politeness cannot be changed on a live region after the fact, so each gets its own and the message goes to the matching one.' },
    { name: 'repeat handling', type: 'internal', description: 'Setting identical text twice is not a mutation and would not be announced; a zero-width counter forces the change without altering what is spoken.' },
  ],
  demos: [
    {
      title: 'Announce',
      code: `<LiveAnnouncer><App /></LiveAnnouncer>`,
      render: () => (
        <LiveAnnouncer>
          <AnnouncerDemo />
        </LiveAnnouncer>
      ),
    },
  ],
}

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Cannot read properties of undefined (reading "map")')
  return <p className="text-muted-foreground text-sm">Rendering normally.</p>
}

function ErrorBoundaryDemo({
  title = 'Something went wrong',
  retryLabel = 'Try again',
}: { title?: string; retryLabel?: string } = {}) {
  const [explode, setExplode] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Button size="sm" variant="secondary" onClick={() => setExplode((v) => !v)}>
        {explode ? 'Repair' : 'Throw'}
      </Button>
      <ErrorBoundary resetKeys={[explode]} title={title} retryLabel={retryLabel}>
        <Boom explode={explode} />
      </ErrorBoundary>
    </div>
  )
}

export const errorBoundaryEntry: ComponentEntry = {
  id: 'error-boundary',
  label: 'Error Boundary',
  description:
    'Catches a render error in its subtree and shows a fallback. The one component here that must be a class — getDerivedStateFromError has no hook equivalent.',
  usage: `import { ErrorBoundary } from '@/components/ui/error-boundary'

<ErrorBoundary resetKeys={[routeId]} onError={report}>
  <Page />
</ErrorBoundary>`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'title', label: 'title', default: 'Something went wrong' },
      { type: 'text', prop: 'retryLabel', label: 'retryLabel', default: 'Try again' },
    ],
    render: (state: ComposerState) => (
      <ErrorBoundaryDemo title={String(state.title)} retryLabel={String(state.retryLabel)} />
    ),
    code: () => `<ErrorBoundary resetKeys={[routeId]}>\n  <Page />\n</ErrorBoundary>`,
  },
  api: [
    { name: 'resetKeys', type: 'unknown[]', description: 'Clears the error when any entry changes. Without it, clearing re-renders the same children with the same props and throws again immediately.' },
    { name: 'fallback', type: '(error, reset) => ReactNode', description: 'Replaces the default panel.' },
    { name: 'onError', type: '(error, info) => void', description: 'Wire your own telemetry. The component deliberately reports nowhere on its own.' },
  ],
  demos: [
    { title: 'Throw and recover', stack: true, code: `<ErrorBoundary resetKeys={[explode]}><Boom /></ErrorBoundary>`, render: () => <ErrorBoundaryDemo /> },
  ],
}

export const userMenuActionsExample = [
  { id: 'profile', label: 'Profile', icon: <User />, shortcut: '⌘P' },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
  { id: 'signout', label: 'Sign out', icon: <LogOut />, destructive: true, separatorBefore: true },
]

/* --------------------------------------------------------------- composer */

export const composerEntry: ComponentEntry = {
  id: 'composer',
  label: 'Composer',
  description:
    'A live playground: drive a set of props and watch the generated source follow. Assembled from the kit’s own controls, so anything awkward about Select, Switch or NumberInput surfaces here first.',
  usage: `import { Composer } from '@/components/ui/composer'
import { readableInk } from '@/components/ui/label-picker'

<Composer
  controls={[
    { type: 'select', prop: 'variant', label: 'variant', options: ['default', 'secondary'], default: 'default' },
    { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
  ]}
  render={(state) => <Button variant={state.variant} disabled={state.disabled}>Click</Button>}
  code={(state) => \`<Button variant="\${state.variant}" />\`}
/>`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'variant', label: 'variant', options: ['default', 'secondary', 'ghost'], default: 'default' },
      { type: 'number', prop: 'count', label: 'count', default: 2, min: 1, max: 5 },
      { type: 'boolean', prop: 'disabled', label: 'disabled', default: false },
    ],
    render: (state) => (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: Number(state.count) || 1 }, (_, index) => (
          <Button
            key={index}
            variant={String(state.variant) as 'default' | 'secondary' | 'ghost'}
            disabled={Boolean(state.disabled)}
          >
            Button {index + 1}
          </Button>
        ))}
      </div>
    ),
    code: (state) =>
      `<Button variant="${state.variant}" disabled={${Boolean(state.disabled)}} />`,
  },
  api: [
    { name: 'controls', type: 'ComposerControl[]', description: 'One per prop: `select`, `boolean`, `text`, `number` or `color`. Each names the prop it drives and its default.' },
    { name: 'render', type: '(state) => ReactNode', description: 'Draws the live result from the current state.' },
    { name: 'code', type: '(state) => string', description: 'The snippet shown beneath the preview. Omit it for a preview with no source.' },
    { name: 'state / onStateChange', type: 'ComposerState', description: 'Controlled mode, for keeping two composers in sync — a light and a dark preview of one configuration.' },
    { name: 'tall', type: 'boolean', default: 'false', description: 'A taller preview box, for anything with real height.' },
    { name: 'independence', type: 'no registry coupling', description: 'The component knows nothing about the documentation registry; the registry describes its specs in terms of these types, not the reverse.' },
  ],
  demos: [
    {
      title: 'Every control type',
      stack: true,
      code: `<Composer controls={controls} render={render} code={code} />`,
      render: () => (
        <div className="w-full">
          <Composer
            controls={[
              { type: 'select', prop: 'tone', label: 'tone', options: ['neutral', 'green', 'amber'], default: 'green' },
              { type: 'text', prop: 'label', label: 'label', default: 'Passing' },
              { type: 'number', prop: 'count', label: 'count', default: 3, min: 1, max: 9 },
              { type: 'boolean', prop: 'outline', label: 'outline', default: false },
              { type: 'color', prop: 'tint', label: 'tint', default: '#22c55e' },
            ]}
            render={(state) => (
              <div className="flex flex-wrap items-center gap-2">
                {Array.from({ length: Number(state.count) || 1 }, (_, index) => (
                  <span
                    key={index}
                    // Ink derived from the swatch, not assumed white: the
                    // contrast probe caught this demo at 2.28:1 on green.
                    style={{
                      backgroundColor: String(state.tint),
                      color: readableInk(String(state.tint)),
                    }}
                    className="inline-flex h-6 items-center rounded-md px-2.5 text-xs font-medium"
                  >
                    {String(state.label)} {index + 1}
                  </span>
                ))}
              </div>
            )}
            code={(state) => `<Badge color="${state.tone}">${state.label}</Badge>`}
          />
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------------- countdown */

// Fixed points rather than `Date.now()`, so the docs page renders the same on
// the server and in the SSR audit.
const NOW = new Date('2026-09-04T09:00:00Z')
const IN_AN_HOUR = new Date(NOW.getTime() + 74 * 60_000 + 9_000)
const IN_TWO_DAYS = new Date(NOW.getTime() + 2 * 86_400_000 + 4 * 3_600_000)

export const countdownEntry: ComponentEntry = {
  id: 'countdown',
  label: 'Countdown',
  description:
    'Time remaining until a deadline, ticking. It counts toward a Date rather than decrementing a number, because setInterval is throttled in a background tab — a decremented timer drifts and then confidently shows the wrong number.',
  usage: `import { Countdown } from '@/components/ui/countdown'

<Countdown to={rateLimit.resetsAt} onExpire={refetch} />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'showSeconds', label: 'showSeconds', default: true },
      { type: 'boolean', prop: 'showDays', label: 'showDays', default: true },
      { type: 'boolean', prop: 'expired', label: 'past the deadline', default: false },
    ],
    render: (state) => (
      <div className="text-center">
        <Countdown
          className="text-3xl"
          to={state.expired ? new Date(NOW.getTime() - 1000) : IN_AN_HOUR}
          now={NOW}
          showSeconds={Boolean(state.showSeconds)}
          showDays={Boolean(state.showDays)}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<Countdown\n  to={resetsAt}\n  showSeconds={${Boolean(state.showSeconds)}}\n  showDays={${Boolean(state.showDays)}}\n  onExpire={refetch}\n/>`,
  },
  api: [
    { name: 'to', type: 'Date', description: 'The deadline. Recomputed from the clock on every tick, so an interval that fired late — or not at all, in a suspended tab — cannot make it drift.' },
    { name: 'onExpire', type: '() => void', description: 'Fires once, at zero. It never renders negative time; that reads as a bug rather than as elapsed time.' },
    { name: 'showSeconds', type: 'boolean', default: 'true', description: 'Also sets the tick rate: 1s when seconds are shown, 15s when they are not. Waking the main thread every second to redraw a number that changes every minute is a battery cost with nothing to show for it.' },
    { name: 'showDays', type: 'boolean', default: 'true', description: 'Off folds days into hours, so a two-day countdown does not read as 00:12:09.' },
    { name: 'now', type: 'Date', description: 'A fixed reference instead of the clock — for tests and deterministic server rendering.' },
    { name: 'format', type: '(parts) => ReactNode', description: 'Receives { days, hours, minutes, seconds, total }.' },
  ],
  demos: [
    {
      title: 'Deadlines',
      stack: true,
      code: `<Countdown to={resetsAt} />
<Countdown to={windowClosesAt} showSeconds={false} />
<Countdown to={new Date(Date.now() - 1)} />`,
      render: () => (
        <div className="flex flex-col gap-3 font-mono">
          <span className="flex items-baseline gap-3">
            <span className="text-muted-foreground w-40 font-sans text-xs">Rate limit resets</span>
            <Countdown to={IN_AN_HOUR} now={NOW} />
          </span>
          <span className="flex items-baseline gap-3">
            <span className="text-muted-foreground w-40 font-sans text-xs">Maintenance window</span>
            <Countdown to={IN_TWO_DAYS} now={NOW} showSeconds={false} />
          </span>
          <span className="flex items-baseline gap-3">
            <span className="text-muted-foreground w-40 font-sans text-xs">Signed URL</span>
            <Countdown to={new Date(NOW.getTime() - 1)} now={NOW} expiredLabel="Expired" />
          </span>
        </div>
      ),
    },
  ],
}
