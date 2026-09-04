import { useState } from 'react'
import { Bell, Home, MessageCircle, Search, Settings, Trash2 } from 'lucide-react'
import { BackToTop } from '@/components/ui/back-to-top'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { CookieConsent } from '@/components/ui/cookie-consent'
import { Popconfirm } from '@/components/ui/popconfirm'
import { QrCode } from '@/components/ui/qr-code'
import { Result } from '@/components/ui/result'
import type { ComponentEntry } from './types'

/* --------------------------------------------------------------- qr code */

const OTPAUTH =
  'otpauth://totp/Astralyx:ada@astralyx.dev?secret=JBSWY3DPEHPK3PXP&issuer=Astralyx&algorithm=SHA1&digits=6&period=30'

export const qrCodeEntry: ComponentEntry = {
  id: 'qr-code',
  label: 'QR Code',
  isNew: true,
  description:
    'A QR code encoded in the browser and drawn as SVG. No dependency and no network round trip — which matters, because the two things people encode most are a TOTP secret and a wallet address.',
  usage: `import { QrCode } from '@/components/ui/qr-code'

<QrCode value="https://ui.astralyx.dev" level="M" size={160} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'text', prop: 'value', label: 'value', default: 'https://ui.astralyx.dev' },
      { type: 'select', prop: 'level', label: 'level', default: 'M', options: ['L', 'M', 'Q', 'H'] },
      { type: 'number', prop: 'size', label: 'size', default: 180, min: 96, max: 300, step: 12 },
    ],
    render: (state) => (
      <QrCode
        value={String(state.value || ' ')}
        level={state.level as 'L' | 'M' | 'Q' | 'H'}
        size={Number(state.size) || 180}
      />
    ),
    code: (state) =>
      `<QrCode\n  value="${state.value}"\n  level="${state.level}"\n  size={${Number(state.size) || 180}}\n/>`,
  },
  api: [
    { name: 'value', type: 'string', description: 'Encoded in byte mode, versions 1–10 — 271 bytes at level L, 213 at M. Past that it throws rather than truncating a secret.' },
    { name: 'nothing leaves the page', type: 'the whole point', description: 'The usual shortcut is an `<img>` at a QR-as-a-service URL, which hands a TOTP secret or a payment address to a third party and writes it into their access log.' },
    { name: 'level', type: "'L' | 'M' | 'Q' | 'H'", default: "'M'", description: 'Higher recovers more damage and holds less. `H` is worth it when a logo covers the middle or it is printed on something that creases.' },
    { name: 'mask selection', type: 'all eight scored', description: 'The real spec, not a fixed pattern. Scanners genuinely fail on a bad mask, and "mask 0 always" makes a code that reads on one phone and not another.' },
    { name: 'quietZone', type: 'number', default: '4', description: 'Four modules is the spec minimum, and a code butted against a coloured background is the most common reason a QR will not scan.' },
    { name: 'SVG, not canvas', type: 'stays sharp', description: 'Sharp at any size and in print, no raster memory, and it survives a server render — canvas needs an effect, a ref and a device-pixel-ratio dance.' },
    { name: 'darkColor / lightColor', type: 'string', description: 'Near-black on white regardless of theme, deliberately. Inverting them defeats most scanners.' },
  ],
  demos: [
    {
      title: 'A TOTP enrolment code',
      stack: true,
      code: `<QrCode value={otpauthUrl} level="M" size={180} />`,
      render: () => (
        <div className="flex flex-wrap items-center gap-6">
          <QrCode value={OTPAUTH} level="M" size={180} />
          <div className="text-muted-foreground max-w-xs text-xs">
            <p className="text-foreground mb-1 text-sm font-medium">Scan to enrol</p>
            <p>
              Encoded here, in the page. `TwoFactorSetup` takes this as its `qr` prop — it declares
              the slot, and this fills it.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Error correction levels',
      stack: true,
      code: `<QrCode value={url} level="L" />  {/* … M, Q, H */}`,
      render: () => (
        <div className="flex flex-wrap items-end gap-4">
          {(['L', 'M', 'Q', 'H'] as const).map((level) => (
            <div key={level} className="flex flex-col items-center gap-1">
              <QrCode value="https://ui.astralyx.dev" level={level} size={110} />
              <span className="text-muted-foreground font-mono text-[11px]">{level}</span>
            </div>
          ))}
        </div>
      ),
    },
  ],
}

/* ------------------------------------------------------------ popconfirm */

function PopconfirmDemo({ destructive = true }: { destructive?: boolean }) {
  const [rows, setRows] = useState(['staging-api', 'edge-cache', 'worker-eu'])
  return (
    <div className="w-full max-w-sm">
      <ul className="list-none">
        {rows.map((row) => (
          <li key={row} className="border-border/60 flex items-center justify-between border-b py-2 last:border-b-0">
            <span className="font-mono text-sm">{row}</span>
            <Popconfirm
              title="Remove this service?"
              description="It stops receiving traffic immediately. You can add it back."
              destructive={destructive}
              confirmLabel="Remove"
              onConfirm={() => setRows((current) => current.filter((item) => item !== row))}
            >
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${row}`}>
                <Trash2 />
              </Button>
            </Popconfirm>
          </li>
        ))}
      </ul>
      {rows.length === 0 && (
        <Button size="sm" variant="ghost" onClick={() => setRows(['staging-api', 'edge-cache', 'worker-eu'])}>
          Reset
        </Button>
      )}
    </div>
  )
}

export const popconfirmEntry: ComponentEntry = {
  id: 'popconfirm',
  label: 'Popconfirm',
  isNew: true,
  description:
    'A confirmation anchored to the control that triggered it, for reversible or single-item actions — so the row you are asking about stays visible.',
  usage: `import { Popconfirm } from '@/components/ui/popconfirm'

<Popconfirm title="Remove this?" onConfirm={remove}>
  <Button>Remove</Button>
</Popconfirm>`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'destructive', label: 'destructive', default: true },
      { type: 'select', prop: 'side', label: 'side', default: 'top', options: ['top', 'bottom', 'left', 'right'] },
    ],
    render: (state) => <PopconfirmDemo destructive={Boolean(state.destructive)} />,
    code: (state) =>
      `<Popconfirm\n  title="Remove this service?"\n  destructive={${Boolean(state.destructive)}}\n  side="${state.side}"\n  onConfirm={remove}\n>\n  <Button>Remove</Button>\n</Popconfirm>`,
  },
  api: [
    { name: 'children', type: 'ReactElement', description: 'The trigger. Cloned with a ref and the ARIA wiring, so it must accept one.' },
    { name: 'vs AlertDialog', type: 'reversibility', description: 'If it can be undone, or affects one item, confirm in place. If it destroys something irrecoverable or several things at once, take over the screen — the interruption is the feature.' },
    { name: 'in a table', type: 'why it matters', description: 'A modal covers the very row you are asking about, so "which one was it?" is hidden behind the question.' },
    { name: 'not modal', type: 'the trade', description: '`role="alertdialog"` so it is announced, focus moves to confirm and returns to the trigger, Escape cancels — but the rest of the page stays reachable.' },
    { name: 'better still', type: 'undo instead', description: 'Where you can, act immediately and offer an Undo toast. A confirmation people click through reflexively protects nobody.' },
  ],
  demos: [
    { title: 'Removing a row', stack: true, code: `<Popconfirm title="Remove this service?" onConfirm={remove}><Button /></Popconfirm>`, render: () => <PopconfirmDemo /> },
  ],
}

/* ---------------------------------------------------------------- result */

export const resultEntry: ComponentEntry = {
  id: 'result',
  label: 'Result',
  isNew: true,
  description:
    'The whole-page outcome — not found, forbidden, server error, done. Announced on render, so a client-side route change to an error page is not silent for a screen reader.',
  usage: `import { Result } from '@/components/ui/result'

<Result status="404" title="No such page" actions={<Button>Go home</Button>} />`,
  composer: {
    tall: true,
    controls: [
      {
        type: 'select',
        prop: 'status',
        label: 'status',
        default: '404',
        options: ['success', 'error', 'warning', 'info', '404', '403', '500'],
      },
      { type: 'boolean', prop: 'compact', label: 'compact', default: false },
    ],
    render: (state) => (
      <Result
        className="w-full"
        status={state.status as 'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500'}
        compact={Boolean(state.compact)}
        title="We could not find that page"
        description="The link may be out of date, or the page may have moved."
        actions={
          <>
            <Button size="sm">Go home</Button>
            <Button size="sm" variant="ghost">
              Contact support
            </Button>
          </>
        }
      />
    ),
    code: (state) =>
      `<Result\n  status="${state.status}"\n  title="We could not find that page"\n  actions={<Button>Go home</Button>}\n/>`,
  },
  api: [
    { name: 'status', type: 'ResultStatus', default: "'info'", description: "'success' | 'error' | 'warning' | 'info' | '404' | '403' | '500'. Sets an icon and tone; never the copy." },
    { name: 'vs Empty', type: 'a real difference', description: 'Empty means "this worked, there is nothing here yet" and invites a first action. A result reports how a request ended, often one the user cannot fix. Using an empty state for a 403 tells someone to create what they are not allowed to see.' },
    { name: 'announced', type: 'role=alert | status', description: 'Errors are assertive, the rest polite — an SPA that renders an error page silently is the standard failure.' },
    { name: 'actions', type: 'ReactNode', description: 'A result with no way onward is a dead end that sends people to the back button.' },
    { name: 'details', type: 'ReactNode', description: 'Collapsed. Stack traces and request ids — whatever a support ticket would want.' },
  ],
  demos: [
    {
      title: 'A 404 with a way out',
      stack: true,
      code: `<Result status="404" title="We could not find that page" actions={<Button>Go home</Button>} />`,
      render: () => (
        <Result
          className="w-full"
          status="404"
          compact
          title="We could not find that page"
          description="The link may be out of date, or the page may have moved."
          actions={<Button size="sm">Go home</Button>}
        />
      ),
    },
  ],
}

/* ------------------------------------------------------------ bottom nav */

function BottomNavDemo({ showLabels = true }: { showLabels?: boolean }) {
  const [tab, setTab] = useState('home')
  return (
    <div className="border-border w-full max-w-sm overflow-hidden rounded-xl border">
      <div className="bg-muted/30 text-muted-foreground flex h-32 items-center justify-center text-xs">
        {tab}
      </div>
      <BottomNav
        value={tab}
        onChange={setTab}
        showLabels={showLabels}
        items={[
          { value: 'home', label: 'Home', icon: <Home /> },
          { value: 'search', label: 'Search', icon: <Search /> },
          { value: 'inbox', label: 'Inbox', icon: <MessageCircle />, badge: 12 },
          { value: 'alerts', label: 'Alerts', icon: <Bell />, badge: true },
          { value: 'settings', label: 'Settings', icon: <Settings /> },
        ]}
      />
    </div>
  )
}

export const bottomNavEntry: ComponentEntry = {
  id: 'bottom-nav',
  label: 'Bottom Nav',
  isNew: true,
  description:
    'The mobile tab bar — three to five destinations, pinned to the bottom where thumbs are, with the home-indicator safe area accounted for.',
  usage: `import { BottomNav } from '@/components/ui/bottom-nav'

<BottomNav items={items} value={tab} onChange={setTab} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'showLabels', label: 'showLabels', default: true }],
    render: (state) => <BottomNavDemo showLabels={Boolean(state.showLabels)} />,
    code: (state) =>
      `<BottomNav\n  items={items}\n  value={tab}\n  onChange={setTab}\n  showLabels={${Boolean(state.showLabels)}}\n/>`,
  },
  api: [
    { name: 'items', type: 'BottomNavItem[]', description: '{ value, label, icon, href?, badge?, disabled? }.' },
    { name: 'bottom', type: 'where thumbs are', description: 'Held one-handed, the top of a phone is the hardest region to reach. A top nav bar on mobile costs a reach or a second hand.' },
    { name: 'safe area', type: 'env(safe-area-inset-bottom)', description: 'Added to the padding, so the bar clears the home indicator. Without it the last row of pixels is not tappable — the most common defect in hand-rolled tab bars.' },
    { name: 'destinations, not actions', type: 'keep it to five', description: 'A tab bar with "Share" in it is a toolbar wearing the wrong clothes. Past five, targets fall below ~44px and labels truncate to nonsense.' },
    { name: 'aria-current', type: 'page', description: 'The navigation equivalent of aria-selected. Signalling the current page with colour alone says nothing to a screen reader.' },
  ],
  demos: [
    { title: 'Five destinations, with badges', stack: true, code: `<BottomNav items={items} value={tab} onChange={setTab} />`, render: () => <BottomNavDemo /> },
  ],
}

/* ----------------------------------------------------------- back to top */

export const backToTopEntry: ComponentEntry = {
  id: 'back-to-top',
  label: 'Back To Top',
  isNew: true,
  description:
    'Appears once you have scrolled, driven by an IntersectionObserver sentinel rather than a scroll handler — and it moves focus, not just the viewport.',
  usage: `import { BackToTop } from '@/components/ui/back-to-top'

<BackToTop showAfter={400}>Top</BackToTop>`,
  composer: {
    controls: [
      { type: 'number', prop: 'showAfter', label: 'showAfter', default: 400, min: 100, max: 1200, step: 100 },
    ],
    render: (state) => (
      <div className="relative">
        <BackToTop fixed={false} showAfter={Number(state.showAfter) || 400}>
          Back to top
        </BackToTop>
      </div>
    ),
    code: (state) => `<BackToTop showAfter={${Number(state.showAfter) || 400}}>Back to top</BackToTop>`,
  },
  api: [
    { name: 'visibility', type: 'a sentinel', description: 'An IntersectionObserver fires twice for the life of the page; a scroll listener runs every frame of every scroll on the main thread to compute a boolean.' },
    { name: 'prefers-reduced-motion', type: 'honoured', description: 'Smooth-scrolling a long page is exactly the large-field motion that triggers vestibular symptoms, so it drops to an instant jump. `scroll-behavior: smooth` with no media query is the common bug.' },
    { name: 'focus', type: 'follows the scroll', description: 'Moving the viewport without moving focus leaves the next Tab at the bottom of the page you just left.' },
    { name: 'tabIndex', type: '-1 while hidden', description: 'A focusable control nobody can see is a trap.' },
    { name: 'targetRef', type: 'RefObject', description: 'Scroll a container instead of the window.' },
  ],
  demos: [
    {
      title: 'The button itself',
      code: `<BackToTop fixed={false}>Back to top</BackToTop>`,
      render: () => (
        <div className="relative">
          <BackToTop fixed={false} showAfter={0}>
            Back to top
          </BackToTop>
        </div>
      ),
    },
  ],
}

/* -------------------------------------------------------- cookie consent */

export const cookieConsentEntry: ComponentEntry = {
  id: 'cookie-consent',
  label: 'Cookie Consent',
  isNew: true,
  description:
    'A consent banner with reject as easy as accept, nothing pre-ticked, and no cookie written by the component itself — the arrangement regulators have repeatedly ruled is the compliant one.',
  usage: `import { CookieConsent } from '@/components/ui/cookie-consent'

<CookieConsent onSave={(accepted) => persist(accepted)} policyHref="/privacy" />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'defaultOpen', label: 'defaultOpen', default: false }],
    render: (state) => (
      <CookieConsent className="w-full" defaultOpen={Boolean(state.defaultOpen)} policyHref="/privacy" />
    ),
    code: (state) =>
      `<CookieConsent\n  defaultOpen={${Boolean(state.defaultOpen)}}\n  policyHref="/privacy"\n  onSave={(accepted) => persist(accepted)}\n/>`,
  },
  api: [
    { name: 'reject', type: 'equal weight', description: 'Not a style choice. Consent must be freely given, and hiding refusal behind an extra click — or greying it beside a bright "Accept all" — has been found to invalidate it. "Accept" plus "Manage" is the most-fined pattern on the web.' },
    { name: 'categories', type: 'ConsentCategory[]', description: 'Nothing optional starts on: pre-ticked boxes are explicitly not consent. `necessary` is locked on and excluded from the choice.' },
    { name: 'writes nothing', type: 'onSave', description: 'Storage and script loading are the caller’s job. A component that quietly sets its own cookie is doing the exact thing it is meant to be asking about.' },
    { name: 'not modal', type: 'aria-modal=false', description: 'Announced and reachable, but focus is not trapped — a banner people cannot escape is its own accessibility failure.' },
    { name: 'policyHref', type: 'string', description: 'Links the privacy policy inline with the description.' },
  ],
  demos: [
    {
      title: 'Categories open',
      stack: true,
      code: `<CookieConsent defaultOpen onSave={persist} policyHref="/privacy" />`,
      render: () => <CookieConsent className="w-full" defaultOpen policyHref="/privacy" />,
    },
  ],
}
