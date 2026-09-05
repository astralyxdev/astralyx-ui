import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Component } from 'lucide-react'
import {
  Link,
  Router,
  useLocation,
  useRoute,
} from '@/components/primitives/router'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Tooltip } from '@/components/ui/tooltip'
import { DOCS, DOC_ICONS, docPath, findDoc } from '@/docs/pages'
import { EXAMPLES, examplePath, findExample } from '@/examples'
import { ComponentPage } from '@/pages/component-page'
import { ComponentsIndex } from '@/pages/components-index'
import { DocPage } from '@/pages/doc-page'
import { ExamplePage } from '@/pages/example-page'
import { Examples } from '@/pages/examples'
import { Home } from '@/pages/home'
import { NotFound } from '@/pages/not-found'
import { CATEGORIES, componentPath, findEntry } from '@/registry'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

function App() {
  return (
    <Router>
      <Shell />
    </Router>
  )
}

function Shell() {
  // Dark is the default; the toggle switches to light.
  const [dark, setDark] = useState(false)

  /*
   * The theme class lives on <html>, not on a wrapper div.
   *
   * `.dark` sets the token values on the element it lands on, and everything
   * below inherits them — so a wrapper cannot switch back to light while an
   * ancestor still carries the class. index.html ships with the class already
   * set, which also avoids a light flash before React mounts.
   */
  const path = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const exampleRoute = useRoute('/examples/:id')
  const example = exampleRoute ? findExample(exampleRoute.id) : undefined
  // Both hooks run every render. Short-circuiting them with `||` would skip the
  // second whenever the first matched, changing hook order between renders.
  const onComponent = useRoute('/components/:id')
  const onDoc = useRoute('/docs/:id')

  // The rail is the navigation for everything that is documentation: the docs,
  // the component catalogue and the examples index all share it, so moving
  // between the three never costs a trip through the header. The landing page
  // is the one surface without it — a rail there narrows the thing it exists to
  // show — and a running example is the other, for the same reason.
  const inIndex =
    path === '/components' || path === '/docs' || path === '/examples'
  const showSidebar = Boolean(onComponent || onDoc) || inIndex

  // Each page starts at the top; the scroll lives on <main>, not the window.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [path])

  // An example is a whole screen pretending to be its own product, so it takes
  // the viewport: no rail, no header, no page padding. The one piece of chrome
  // is a way out — relying on the browser's back button assumes the reader
  // arrived from inside the site, and anyone following a link straight to an
  // example has nowhere to go.
  if (example) {
    return (
      <div className="bg-background text-foreground h-svh overflow-hidden">
        <ExamplePage example={example} />
        <ExampleEscape label={example.label} />
      </div>
    )
  }

  return (
    <div className="h-svh">
      <div className="bg-background text-foreground flex h-full flex-col">
        <header className="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="Astralyx UI, home"
              className={cn('px-1 py-1', radius.control, focusRing)}
            >
              <Logo className="h-5" />
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-muted-foreground hidden text-xs sm:inline">
              UI kit
            </span>
          </div>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Sections">
            <Button asChild variant="ghost" size="sm">
              <Link
                to={docPath('introduction')}
                aria-current={path.startsWith('/docs') ? 'page' : undefined}
                className={path.startsWith('/docs') ? 'text-foreground' : ''}
              >
                Docs
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/components"
                aria-current={path.startsWith('/components') ? 'page' : undefined}
                className={path.startsWith('/components') ? 'text-foreground' : ''}
              >
                Components
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/examples"
                aria-current={path.startsWith('/examples') ? 'page' : undefined}
                className={path.startsWith('/examples') ? 'text-foreground' : ''}
              >
                Examples
              </Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <Tooltip content={dark ? 'Light theme' : 'Dark theme'}>
              <ThemeToggle dark={dark} onDarkChange={setDark} />
            </Tooltip>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* The component index is long enough to need a rail; the landing and
              examples pages are not, and a sidebar there just narrows the very
              thing they exist to show. */}
          {showSidebar && <Sidebar path={path} />}

          <main
            ref={mainRef}
            // Both axes are stated. Setting only `overflow-y` computes the
            // other axis from `visible` to `auto` — so a single wide child
            // silently made the whole region scroll sideways, past the layout
            // and into blank space. Wide content scrolls inside its own
            // container; the region itself never does.
            className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 outline-none sm:p-6 lg:p-8"
          >
            <Routes />
          </main>
        </div>
      </div>
    </div>
  )
}

function Routes() {
  const path = useLocation()
  const component = useRoute('/components/:id')
  const doc = useRoute('/docs/:id')

  if (path === '/') return <Home />
  if (path === '/examples') return <Examples />
  if (path === '/components') return <ComponentsIndex />

  if (doc) {
    const entry = findDoc(doc.id)
    if (entry) return <DocPage key={entry.id} doc={entry} />
  }

  if (component) {
    const entry = findEntry(component.id)
    // Keyed by id so navigating between components remounts the page. Without
    // it React reuses the instance — the composer keeps the previous
    // component's prop values, and the demo tabs stay wherever they were left.
    if (entry) return <ComponentPage key={entry.id} entry={entry} />
  }

  return <NotFound path={path} />
}

/**
 * The NEW marker.
 *
 * The word is in the accessible name rather than conveyed by colour alone, so
 * it survives a screen reader and a monochrome display. `aria-hidden` on a
 * coloured dot would have been the cheaper version of the same idea and says
 * nothing to anyone who cannot see it.
 */
function NewTag() {
  return (
    <span
      className={cn(
        'ms-auto shrink-0 px-1.5 py-px text-[10px] font-medium tracking-wide uppercase',
        'bg-[var(--green-soft)] text-[var(--green-soft-foreground)]',
        radius.control,
      )}
    >
      New
    </span>
  )
}

function NavLink({
  to,
  current,
  children,
}: {
  to: string
  current: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-left text-sm whitespace-nowrap',
        radius.control,
        focusRing,
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
        current
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
    >
      {children}
    </Link>
  )
}

function Sidebar({ path }: { path: string }) {
  const navRef = useRef<HTMLElement>(null)

  /**
   * Bring the current page into view in the sidebar.
   *
   * The list is several hundred entries long, so after a reload — or a jump
   * from search, or a link from anywhere — the highlighted item is usually far
   * outside the visible window, and the only way to see where you are is to
   * scroll looking for it.
   *
   * The container is scrolled directly rather than through `scrollIntoView`,
   * which walks up the ancestors and will happily scroll the page as well as
   * the sidebar. It only moves when the item is actually out of view, so
   * stepping between two adjacent components does not shunt the list around;
   * and it is instant, because an animation the user did not ask for competes
   * with the page navigation that just happened.
   */
  useLayoutEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !active) return

    const navBox = nav.getBoundingClientRect()
    const box = active.getBoundingClientRect()

    // Vertical on desktop, where the sidebar is a column.
    if (nav.scrollHeight > nav.clientHeight && (box.top < navBox.top || box.bottom > navBox.bottom)) {
      nav.scrollTop += box.top - navBox.top - (nav.clientHeight - box.height) / 2
    }

    // Horizontal on narrow screens, where it is a scrolling strip.
    if (nav.scrollWidth > nav.clientWidth && (box.left < navBox.left || box.right > navBox.right)) {
      nav.scrollLeft += box.left - navBox.left - (nav.clientWidth - box.width) / 2
    }
  }, [path])

  return (
    <nav
      ref={navRef}
      aria-label="Documentation"
      className="border-border flex shrink-0 gap-4 overflow-x-auto overflow-y-hidden border-b px-4 py-2 md:w-56 md:flex-col md:gap-5 md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-4"
    >
      <div className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch">
        <div className="text-muted-foreground/70 shrink-0 px-3 text-[11px] font-medium tracking-wide uppercase md:mb-1">
          Getting started
        </div>
        {DOCS.map((doc) => {
          const to = docPath(doc.id)
          return (
            <NavLink key={doc.id} to={to} current={path === to}>
              <span className="flex items-center gap-2">
                <span className="[&_svg]:size-3.5">{DOC_ICONS[doc.id]}</span>
                {doc.label}
              </span>
            </NavLink>
          )
        })}
      </div>

      <div className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch">
        <div className="text-muted-foreground/70 shrink-0 px-3 text-[11px] font-medium tracking-wide uppercase md:mb-1">
          Examples
        </div>
        <NavLink to="/examples" current={path === '/examples'}>
          All examples
        </NavLink>
        {EXAMPLES.map((example) => {
          const to = examplePath(example.id)
          return (
            <NavLink key={example.id} to={to} current={path === to}>
              <span className="flex items-center gap-2">
                <ArrowUpRight className="text-muted-foreground/60 size-3.5 shrink-0" aria-hidden="true" />
                {example.label}
              </span>
            </NavLink>
          )
        })}
      </div>

      <div className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch">
        <div className="text-muted-foreground/70 shrink-0 px-3 text-[11px] font-medium tracking-wide uppercase md:mb-1">
          Components
        </div>
        <NavLink to="/components" current={path === '/components'}>
          All components
        </NavLink>
      </div>

      {CATEGORIES.map((category) => (
        <div
          key={category.label}
          className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch"
        >
          <div className="text-muted-foreground/70 shrink-0 px-3 text-[11px] font-medium tracking-wide uppercase md:mb-1">
            {category.label}
          </div>
          {category.items.map((entry) => {
            const to = componentPath(entry.id)
            return (
              <NavLink key={entry.id} to={to} current={path === to}>
                <span className="flex min-w-0 items-center gap-2">
                  {/* One glyph for every component, the same everywhere. It
                      marks the row as a component rather than identifying which
                      one — the label already does that, and 343 distinct icons
                      would be 343 things to learn. */}
                  <Component
                    className="text-muted-foreground/60 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{entry.label}</span>
                </span>
                {entry.isNew && <NewTag />}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/**
 * The way out of a full-screen example.
 *
 * Hidden until focused, in the manner of a skip link. A floating pill was the
 * first attempt and it was wrong: an example is a whole app layout, so every
 * corner belongs to something — the account menu sits bottom-left, a compose
 * button bottom-right — and a permanent overlay lands on top of one of them in
 * at least one example whatever corner it picks.
 *
 * So it takes no space and covers nothing. Keyboard users reach it as the first
 * tab stop; anyone with a pointer has the browser's back button, which is where
 * they came from.
 */
function ExampleEscape({ label }: { label: string }) {
  return (
    <Link
      to="/examples"
      className={cn(
        'sr-only focus-visible:not-sr-only',
        'focus-visible:bg-card focus-visible:border-border focus-visible:text-foreground',
        'focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50',
        'focus-visible:flex focus-visible:items-center focus-visible:gap-1.5',
        'focus-visible:border focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm',
        radius.control,
        focusRing,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Leave the {label} example
    </Link>
  )
}

export default App
