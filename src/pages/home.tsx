import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Check, Copy } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import { Avatar, AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { Cart } from '@/components/ui/cart'
import { CheckoutSummary } from '@/components/ui/checkout-summary'
import { Input } from '@/components/ui/input'
import { composerInitialState } from '@/components/ui/composer'
import { Logo } from '@/components/ui/logo'
import { Masonry } from '@/components/ui/masonry'
import { Message } from '@/components/ui/message'
import { PromptInput } from '@/components/ui/prompt-input'
import { SessionList } from '@/components/ui/session-list'
import { Switch } from '@/components/ui/switch'
import { ToolCall } from '@/components/ui/tool-call'
import { useClipboard } from '@/lib/use-clipboard'
import { EXAMPLES, examplePath } from '@/examples'
import { CATEGORIES, componentPath, ENTRIES, type ComponentEntry } from '@/registry'
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
 * The catalogue at the foot of the page runs every one of them at once, which
 * is the strongest version of that argument and also the reason the previews
 * there are clipped, inert and mounted only when scrolled near.
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

/**
 * Every component in the kit, running, one card each.
 *
 * Not a shortlist and not a list of names — 309 live components, because the
 * honest answer to "what is in it" is the thing itself, and a landing page
 * showing twelve highlights invites you to go and count.
 *
 * Each preview is the component's own composer at its default state, so the
 * cards cannot drift from the components: adding one to the registry puts it
 * here, correctly configured, with no second copy of the setup to maintain.
 *
 * **Mounted only when scrolled near.** Rendering three hundred live components
 * at once is not a page anyone can use — some of them fetch map tiles, decode
 * audio, or run animation loops. `LazyMount` keeps a reserved box until the
 * card is close to the viewport, so the cost is paid for the dozen on screen
 * rather than for all of them.
 *
 * Previews are inert: `pointer-events-none` means a click lands on the card
 * and navigates, rather than being swallowed by an input inside the preview.
 */
function Catalogue() {
  return (
    <Bleed className="py-20 lg:py-28">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            All {ENTRIES.length}, running.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            Every component across {CATEGORIES.length} categories — no shortlist, and none of them
            a screenshot. Each has a page with a live composer, worked examples and a full props
            table.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/components">
            Component index <ArrowRight />
          </Link>
        </Button>
      </div>

      <Masonry columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={3}>
        {CATEGORIES.flatMap((category) =>
          category.items.map((entry) => (
            <ShowcaseCard key={entry.id} entry={entry} category={category.label} />
          )),
        )}
      </Masonry>
    </Bleed>
  )
}

/** One component, running, in a card that links to its page. */
function ShowcaseCard({ entry, category }: { entry: ComponentEntry; category: string }) {
  const preview = entry.composer
    ? entry.composer.render(composerInitialState(entry.composer.controls))
    : entry.demos?.[0]?.render()

  return (
    <Link
      to={componentPath(entry.id)}
      className={cn(
        'group block',
        surface,
        radius.surface,
        'hover:border-foreground/25 overflow-hidden transition-colors duration-150 ease-out',
        'motion-reduce:transition-none',
        focusRing,
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-4 pt-3.5">
        <span className="text-muted-foreground/50 truncate text-[10px] tracking-[0.14em] uppercase">
          {category}
        </span>
        {entry.isNew && (
          <span
            className={cn(
              'shrink-0 px-1.5 py-px text-[10px] font-medium tracking-wide uppercase',
              'bg-[var(--green-soft)] text-[var(--green-soft-foreground)]',
              radius.xs,
            )}
          >
            New
          </span>
        )}
      </div>

      <p className="px-4 pb-3 text-sm font-medium">{entry.label}</p>

      {preview && (
        <LazyMount className="border-border bg-muted/30 border-t">
          {/*
            Inert and clipped. The preview is here to be recognised, not
            operated — a live Input would otherwise swallow the click that is
            meant to open the component's page.
          */}
          <div
            // Hidden from assistive technology, not just from the pointer.
            // These previews are decorative — the card already names the
            // component and links to its page — and without this the landing
            // page inherits three hundred components' worth of headings,
            // labels and controls, which is unusable to navigate and skipped
            // the page's own heading levels.
            aria-hidden="true"
            className="pointer-events-none flex min-h-28 max-h-52 items-start justify-center overflow-hidden p-4"
            // A soft bottom edge, so a preview taller than the box reads as
            // continuing rather than as having been chopped. Masked rather
            // than overlaid with a gradient, which would have to know the
            // card's background and would be wrong in the other theme.
            style={{
              maskImage: 'linear-gradient(to bottom, #000 72%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 72%, transparent)',
            }}
          >
            {/*
              Centred horizontally, anchored to the top vertically. Centring
              both ways clipped tall previews at the top as well as the bottom,
              so a card opened mid-sentence — and the first line is the part
              that identifies the component. `mx-auto` centres a preview with
              its own max-width, while a full-width table still fills the card.
            */}
            <div className="w-full origin-top scale-[0.85] [&>*]:mx-auto">{preview}</div>
          </div>
        </LazyMount>
      )}
    </Link>
  )
}

/**
 * Renders its children once the box has been near the viewport.
 *
 * A reserved box until then, so the page's scroll height is stable and nothing
 * jumps as cards fill in. `rootMargin` is generous: mounting a component the
 * moment its top edge appears means watching it appear, and the point is for it
 * to be there already.
 *
 * Without an observer — during server rendering, or in a browser that has none
 * — it renders immediately, because a catalogue that shows nothing without
 * JavaScript is worse than a slow one.
 */
function LazyMount({
  children,
  className,
  placeholderHeight = 140,
}: {
  children: ReactNode
  className?: string
  placeholderHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (shown) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return (
    <div ref={ref} className={className}>
      {shown ? children : <div style={{ height: placeholderHeight }} />}
    </div>
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
