import { ArrowRight, ArrowUpRight, Check, Copy } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { Cart } from '@/components/ui/cart'
import { CheckoutSummary } from '@/components/ui/checkout-summary'
import { HttpStatus } from '@/components/ui/http-status'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { Message } from '@/components/ui/message'
import { PriceTicker } from '@/components/ui/price-ticker'
import { PromptInput } from '@/components/ui/prompt-input'
import { QueueMonitor } from '@/components/ui/queue-monitor'
import { RiskScore } from '@/components/ui/risk-score'
import { SessionList } from '@/components/ui/session-list'
import { Sparkline } from '@/components/ui/sparkline'
import { Stat } from '@/components/ui/stat'
import { Switch } from '@/components/ui/switch'
import { ToolCall } from '@/components/ui/tool-call'
import { UptimeStrip } from '@/components/ui/uptime-strip'
import { useClipboard } from '@/lib/use-clipboard'
import { EXAMPLES, examplePath } from '@/examples'
import { CATEGORIES, componentPath, ENTRIES } from '@/registry'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

const NOW = new Date('2026-09-03T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

/**
 * The landing page.
 *
 * Every component here is the real one, wired to real props. A screenshot of a
 * component library tells you nothing a design file would not; the argument is
 * that you can type into these, open their menus and drag their handles.
 *
 * Which is also the trap. Components have intrinsic minimum widths — the uptime
 * strip is 90 buckets at a 3px floor, so it cannot render below ~470px no
 * matter what box you put it in — and a showcase that sizes cells by eye will
 * eventually put one in a box too small and have it burst out the side. So the
 * showcase is a grid whose cells are sized against those minimums, every cell
 * clips as a backstop, and anything with a hard floor gets a span wide enough
 * for it at every breakpoint. See `Showcase`.
 */
function Home() {
  useSeo({
    description:
      'Accessible React components and primitives for React 19 and Tailwind v4. A CLI copies the source into your repo — nothing is imported from a package at runtime.',
    path: '/',
  })

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      <Hero />
      <Showcase />
      <Install />
      <Anatomy />
      <Breadth />
      <Examples />
      <Catalogue />
      <Footer />
    </div>
  )
}

/** Page gutter and maximum measure, decided once. */
function Bleed({
  children,
  className,
  tint = false,
}: {
  children: React.ReactNode
  className?: string
  tint?: boolean
}) {
  return (
    <section className={cn('w-full px-4 sm:px-6 lg:px-8', tint && 'bg-muted/40', className)}>
      <div className="mx-auto w-full max-w-[104rem]">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------- hero */

/**
 * One column, left-aligned, with air around it.
 *
 * The previous hero put the copy in a left column and left the right half
 * empty, which reads as a layout waiting for an illustration that never
 * arrived. Components belong below the fold-line in a grid built for them, not
 * wedged into the negative space beside a headline.
 */
function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Dot grid, faded out before it reaches the text so it never competes
          with it. Decorative, so it is hidden from assistive tech. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-25"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          color: 'var(--muted-foreground)',
          maskImage: 'radial-gradient(120% 80% at 50% 0%, #000 20%, transparent 70%)',
        }}
      />

      <Bleed className="relative pt-20 pb-16 sm:pt-28 lg:pt-36 lg:pb-24">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
          React 19 · Tailwind v4 · MIT
        </p>

        <h1 className="mt-7 max-w-4xl text-5xl leading-[0.95] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
          Components you actually own.
        </h1>

        <p className="text-muted-foreground mt-8 max-w-xl text-base leading-relaxed text-pretty">
          {ENTRIES.length} components with no headless-UI dependency underneath
          them. A CLI copies the source into your repo and stops there — nothing
          phones home, nothing to upgrade, nothing that breaks the week you
          change your mind about a border radius.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/docs/installation">
              Get started <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/components">Browse all {ENTRIES.length}</Link>
          </Button>
          <InstallPill command="npm i -D astralyx-ui" />
        </div>
      </Bleed>
    </div>
  )
}

/** The install line as a single copyable chip, sitting with the buttons. */
function InstallPill({ command }: { command: string }) {
  const { copy, copied } = useClipboard()

  return (
    <button
      type="button"
      onClick={() => void copy(command)}
      aria-label={copied ? 'Copied' : `Copy: ${command}`}
      className={cn(
        surface,
        radius.control,
        focusRing,
        'hover:bg-accent flex h-11 items-center gap-3 px-4 font-mono text-sm',
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
      )}
    >
      <span className="text-muted-foreground/60 select-none">$</span>
      {command}
      {copied ? (
        <Check className="size-3.5 shrink-0" />
      ) : (
        <Copy className="text-muted-foreground size-3.5 shrink-0" />
      )}
    </button>
  )
}

/* --------------------------------------------------------------- showcase */

/**
 * The breadth argument, as a grid of live components.
 *
 * Spans are chosen from each component's measured minimum width, not by eye:
 *
 * - `QueueMonitor` lays its counters out at `sm:grid-cols-4`, a *viewport*
 *   breakpoint, so between 640px and the two-column layout it wants roughly
 *   360px of its own or the labels collide. It takes the full row on `md`.
 * - `UptimeStrip` is 90 buckets with a 3px floor — about 470px, more than a
 *   sixth of the grid — so it runs at 45 buckets across two columns.
 *
 * `Frame` clips as a backstop. A caption naming the component is the point of
 * the section: this is a catalogue, and an unlabelled screenshot is decoration.
 */
function Showcase() {
  return (
    <Bleed tint className="border-border border-y py-16 lg:py-20">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Frame name="Stat · Sparkline" className="lg:col-span-2">
          <Stat
            label="Monthly revenue"
            value="$128,400"
            delta={12.4}
            bordered={false}
            chart={
              <Sparkline
                values={[42, 48, 45, 61, 58, 72, 69, 84, 91, 88, 104, 118]}
                variant="area"
                className="h-10"
              />
            }
          />
        </Frame>

        <Frame name="Price Ticker" className="lg:col-span-2">
          <PriceTicker
            symbol="BTC"
            price={67_240}
            change={2.41}
            history={[62, 63, 61, 64, 66, 65, 67]}
          />
        </Frame>

        <Frame name="HTTP Status" className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {[200, 201, 204, 301, 400, 401, 404, 409, 422, 429, 500, 503].map((code) => (
              <HttpStatus key={code} status={code} showPhrase={false} />
            ))}
          </div>
        </Frame>

        <Frame name="Risk Score" className="lg:col-span-2">
          <RiskScore
            score={82}
            factors={[
              { label: 'Payout wallet shared with 3 accounts', weight: 28 },
              { label: 'Datacenter IP', weight: 9 },
              { label: 'Identity verified', weight: -12 },
            ]}
          />
        </Frame>

        <Frame name="Queue Monitor" className="md:col-span-2 lg:col-span-2">
          <QueueMonitor
            name="emails.outbound"
            depth={1_920}
            processing={18}
            failed={94}
            deadLettered={12}
            arrivalRate={42}
            completionRate={61}
            now={NOW}
          />
        </Frame>

        <Frame name="Uptime Strip" className="md:col-span-2 lg:col-span-2">
          <p className="text-muted-foreground mb-3 text-xs font-medium">
            api.astralyx.dev — 45 days
          </p>
          <UptimeStrip
            summary="99.94%"
            buckets={Array.from({ length: 45 }, (_, index) => ({
              label: `Day ${45 - index}`,
              status:
                index === 31
                  ? ('down' as const)
                  : index === 6 || index === 20
                    ? ('degraded' as const)
                    : ('up' as const),
            }))}
          />
        </Frame>
      </div>
    </Bleed>
  )
}

/**
 * One showcase cell.
 *
 * `min-w-0` stops a wide child from forcing the grid track open — without it a
 * single component pushes its column past its share and the whole row skews.
 * `overflow-hidden` is the backstop for the same class of bug: if a component
 * ever does exceed its cell, it gets clipped at the card edge rather than
 * drawn across its neighbour.
 */
function Frame({
  name,
  className,
  children,
}: {
  name: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2.5', className)}>
      <div
        className={cn(
          surface,
          radius.surface,
          'flex min-w-0 flex-1 items-center overflow-hidden p-5',
        )}
      >
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <p className="text-muted-foreground/60 px-1 text-[11px] tracking-wide">{name}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- install */

const STEPS = [
  { command: 'npm i -D astralyx-ui', caption: 'The CLI. No runtime dependencies.' },
  { command: 'npx astralyx-ui init', caption: 'Writes components.json, the theme and two helpers.' },
  { command: 'npx astralyx-ui add data-grid', caption: 'Brings table, checkbox and empty with it.' },
]

/**
 * The install flow, laid out as three steps rather than one code block.
 *
 * Each line is copyable on its own, because that is how anyone actually uses
 * it — one command at a time, checking the result before the next.
 */
function Install() {
  return (
    <Bleed className="py-20 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-20">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Three commands.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            The CLI resolves what a component imports and copies that too. It
            installs the npm packages a component actually needs, and skips any
            file you have already edited unless you tell it otherwise.
          </p>
          <Button asChild variant="ghost" size="sm" className="mt-6 -ms-3">
            <Link to="/docs/installation">
              Full setup <ArrowRight />
            </Link>
          </Button>
        </div>

        <ol className="flex list-none flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.command}>
              <CommandRow index={index + 1} command={step.command} caption={step.caption} />
            </li>
          ))}
        </ol>
      </div>
    </Bleed>
  )
}

function CommandRow({
  index,
  command,
  caption,
}: {
  index: number
  command: string
  caption: string
}) {
  const { copy, copied } = useClipboard()

  return (
    <div className={cn(surface, radius.surface, 'flex items-center gap-4 p-4')}>
      <span className="text-muted-foreground/50 w-4 shrink-0 text-center text-xs tabular-nums">
        {index}
      </span>
      <span className="min-w-0 flex-1">
        <code className="block truncate font-mono text-sm">
          <span className="text-muted-foreground/60 select-none">$ </span>
          {command}
        </code>
        <span className="text-muted-foreground/70 mt-1 block text-xs">{caption}</span>
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={copied ? 'Copied' : `Copy: ${command}`}
        className="shrink-0"
        onClick={() => void copy(command)}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

/* ---------------------------------------------------------------- anatomy */

const CART_LINES = [
  { id: 'c1', name: 'Aeron chair', variant: 'Size B · Graphite', price: 149_500, quantity: 1, max: 3 },
  { id: 'c2', name: 'Monitor arm', variant: 'Silver', price: 21_900, quantity: 2, max: 2 },
]

/**
 * One component, shown next to the code that produced it.
 *
 * The rest of the page argues breadth. This one argues that a component is a
 * few lines and a real API, not a wall of configuration.
 */
function Anatomy() {
  return (
    <Bleed tint className="py-20 lg:py-28">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Props you would have written yourself.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Money is integer minor units everywhere, because a basket that has
            been through a float has already lost. Stock limits are enforced at
            the stepper, not rejected at checkout. Every string is a prop.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to={componentPath('cart')}>
            Cart reference <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Cart lines={CART_LINES} currency="GBP" onQuantityChange={() => {}} onRemove={() => {}} />
          <CheckoutSummary
            subtotal={193_300}
            currency="GBP"
            lines={[
              { id: 'k1', label: 'Discount — WELCOME10', amount: -19_330 },
              { id: 'k2', label: 'Delivery', amount: null, note: 'Depends on your address' },
            ]}
            footer={<Button className="w-full">Continue to payment</Button>}
          />
        </div>

        <CodeBlock
          language="tsx"
          filePath="src/app/basket.tsx"
          lineNumbers
          code={`<Cart
  lines={lines}
  currency="GBP"
  onQuantityChange={setQuantity}
  onRemove={remove}
/>

<CheckoutSummary
  subtotal={193_300}
  currency="GBP"
  lines={[
    { id: 'discount', label: 'WELCOME10', amount: -19_330 },
    // null, not 0 — a charge you cannot promise yet
    { id: 'delivery', label: 'Delivery', amount: null },
  ]}
  footer={<Button className="w-full">Continue</Button>}
/>`}
        />
      </div>
    </Bleed>
  )
}

/* ---------------------------------------------------------------- breadth */

const SESSIONS = [
  { id: 's1', device: 'desktop' as const, browser: 'Chrome 141', os: 'macOS 27', ip: '81.2.69.142', location: 'London, UK', lastActive: ago(1), current: true },
  { id: 's2', device: 'mobile' as const, browser: 'Safari', os: 'iOS 27', ip: '81.2.69.142', location: 'London, UK', lastActive: ago(140) },
  { id: 's3', device: 'desktop' as const, browser: 'Firefox 139', os: 'Windows 11', ip: '45.83.220.11', location: 'Frankfurt, DE', lastActive: ago(2800), suspicious: true },
]

/**
 * Three surfaces from three different products, side by side.
 *
 * Breadth is the claim this section has to earn, and a grid of buttons in six
 * colours does not earn it. An assistant thread, a security screen and a
 * settings panel do, because they are the screens people actually have to
 * build.
 */
function Breadth() {
  return (
    <Bleed className="py-20 lg:py-28">
      <div className="mb-12 max-w-xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Built for the screens that are hard.
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Assistant threads, session lists, ledgers, queue depth, order books,
          flame graphs. The parts of a product that get built badly because
          nobody ships components for them.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel label="AI">
          <Message role="user">How much did we spend on inference last month?</Message>
          <Message role="assistant" copyText="4,182 across three models." onVote={() => {}}>
            £4,182 across three models. The cheap model handled 91% of calls and
            11% of the bill.
          </Message>
          <ToolCall
            name="query_costs"
            status="done"
            summary="3 rows"
            input={'{\n  "period": "2026-08",\n  "group_by": "model"\n}'}
            output={'[\n  { "model": "astralyx-small", "usd": 462 },\n  { "model": "astralyx-large", "usd": 3720 }\n]'}
          />
          <PromptInput placeholder="Ask a follow-up..." />
        </Panel>

        <Panel label="Security">
          <SessionList
            sessions={SESSIONS}
            now={NOW}
            onRevoke={() => {}}
            onRevokeOthers={() => {}}
          />
        </Panel>

        <Panel label="Settings">
          <div className={cn(surface, radius.surface, 'space-y-5 p-5')}>
            <Switch
              label="Require 2FA for withdrawals"
              defaultChecked
              labelPosition="start"
              containerClassName="justify-between w-full"
            />
            <Switch
              label="Alert on new device"
              defaultChecked
              labelPosition="start"
              containerClassName="justify-between w-full"
            />
            <Switch
              label="Allow API key creation"
              labelPosition="start"
              containerClassName="justify-between w-full"
            />
            <div className="space-y-2">
              <Input placeholder="ops@example.com" icon={<ArrowRight />} iconPosition="end" />
              <p className="text-muted-foreground text-xs">
                Where security alerts are sent.
              </p>
            </div>
            <div className="border-border flex items-center justify-between border-t pt-4">
              <AvatarGroup max={4}>
                {['Ada Okafor', 'Marc Laurent', 'Iris Chen', 'Devon Reyes', 'Priya N.'].map((name) => (
                  <Avatar key={name} name={name} size="sm" />
                ))}
              </AvatarGroup>
              <Badge size="sm">5 admins</Badge>
            </div>
          </div>
        </Panel>
      </div>
    </Bleed>
  )
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
        {label}
      </p>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  )
}

/* --------------------------------------------------------------- examples */

function Examples() {
  return (
    <Bleed tint className="py-20 lg:py-28">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Five whole screens.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Not marketing pages. A mail client with a resizable split and a
            command palette, a repository browser with a file tree and a diff
            viewer, a settings form with real validation.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/examples">
            All examples <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {EXAMPLES.map((example) => (
          <Link
            key={example.id}
            to={examplePath(example.id)}
            className={cn('group block', radius.surface, focusRing)}
          >
            <Card className="hover:border-foreground/25 h-full transition-colors duration-150 ease-out motion-reduce:transition-none">
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{example.label}</span>
                  <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-3.5 transition-colors" />
                </div>
                <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                  {example.description}
                </p>
                <p className="text-muted-foreground/60 text-[11px] tabular-nums">
                  {example.uses.length} components
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </Bleed>
  )
}

/* -------------------------------------------------------------- catalogue */

function Catalogue() {
  return (
    <Bleed className="py-20 lg:py-28">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything, in {CATEGORIES.length} categories.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Each has a page with a live composer, worked examples and a full
            props table.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/components">
            Component index <ArrowRight />
          </Link>
        </Button>
      </div>

      <div className="columns-1 gap-10 md:columns-2 xl:columns-3">
        {CATEGORIES.map((category) => (
          <div key={category.label} className="mb-9 break-inside-avoid">
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-[11px] font-medium tracking-[0.14em] uppercase">
                {category.label}
              </h3>
              <span className="text-muted-foreground/50 text-[11px] tabular-nums">
                {category.items.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {category.items.map((entry) => (
                <Link
                  key={entry.id}
                  to={componentPath(entry.id)}
                  className={cn(
                    'bg-secondary text-secondary-foreground hover:bg-accent px-2.5 py-1 text-xs',
                    radius.control,
                    focusRing,
                  )}
                >
                  {entry.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Bleed>
  )
}

/* ----------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="border-border bg-muted/40 w-full border-t px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[104rem]">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-sm">
            <Logo className="h-6" />
            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              {ENTRIES.length} components, 12 primitives, one style contract.
              MIT licensed. React 19 and Tailwind v4.
            </p>
          </div>

          <div className="flex gap-14 text-xs">
            <FooterColumn
              title="Start"
              links={[
                { label: 'Introduction', to: '/docs/introduction' },
                { label: 'Installation', to: '/docs/installation' },
                { label: 'Theming', to: '/docs/theming' },
              ]}
            />
            <FooterColumn
              title="Browse"
              links={[
                { label: 'Components', to: '/components' },
                { label: 'Examples', to: '/examples' },
                { label: 'Accessibility', to: '/docs/accessibility' },
              ]}
            />
          </div>
        </div>

        <p className="text-muted-foreground/60 border-border mt-12 border-t pt-6 font-mono text-[11px]">
          npm i -D astralyx-ui
        </p>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; to: string }[]
}) {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground/70 text-[11px] font-medium tracking-[0.14em] uppercase">
        {title}
      </p>
      <ul className="flex list-none flex-col gap-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={cn('text-muted-foreground hover:text-foreground', focusRing)}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { Home }
