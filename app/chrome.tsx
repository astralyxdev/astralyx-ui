'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Tooltip } from '@/components/ui/tooltip'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useTheme } from './use-theme'

/**
 * The chrome, and the one client component the whole site shares.
 *
 * It takes its navigation as data from the server layout rather than importing
 * the registry: the registry pulls in 343 component modules, and a client
 * import here would put all of them in the chunk every page waits on. What
 * crosses the boundary is 366 strings.
 *
 * Route groups would be the tidier way to say "an example has no chrome", but
 * they would also split the rail's own layout across two trees for one
 * boolean. The pathname answers it here.
 */

export type NavItem = { id: string; label: string; href: string; isNew?: boolean }
export type NavGroup = { label: string; items: NavItem[] }

export type Nav = {
  docs: { id: string; label: string; href: string; icon: ReactNode }[]
  examples: NavItem[]
  categories: NavGroup[]
}

export function Chrome({ nav, children }: { nav: Nav; children: ReactNode }) {
  const path = usePathname() ?? '/'
  const mainRef = useRef<HTMLElement>(null)
  const { dark, setDark } = useTheme()

  // An example is a whole screen pretending to be its own product, so it takes
  // the viewport: no rail, no header, no page padding. The one piece of chrome
  // is a way out — anyone following a link straight to one has nowhere to go.
  const inExample = /^\/examples\/[^/]+/.test(path)

  const inIndex = path === '/components/' || path === '/docs/' || path === '/examples/'
  const onComponent = /^\/components\/[^/]+/.test(path)
  const onDoc = /^\/docs\/[^/]+/.test(path)
  const showSidebar = onComponent || onDoc || inIndex

  if (inExample) {
    return (
      <div className="bg-background text-foreground h-svh overflow-hidden">
        {children}
        <ExampleEscape />
      </div>
    )
  }

  return (
    <div className="h-svh">
      <div className="bg-background text-foreground flex h-full flex-col">
        <header className="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Astralyx UI, home" className={cn('px-1 py-1', radius.control, focusRing)}>
              <Logo className="h-5" />
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-muted-foreground hidden text-xs sm:inline">UI kit</span>
          </div>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Sections">
            <Button asChild variant="ghost" size="sm">
              <Link
                href="/docs/introduction/"
                aria-current={path.startsWith('/docs') ? 'page' : undefined}
                className={path.startsWith('/docs') ? 'text-foreground' : ''}
              >
                Docs
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link
                href="/components/"
                aria-current={path.startsWith('/components') ? 'page' : undefined}
                className={path.startsWith('/components') ? 'text-foreground' : ''}
              >
                Components
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link
                href="/examples/"
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
          {showSidebar && <Sidebar nav={nav} path={path} />}

          <main
            ref={mainRef}
            // Both axes are stated. Setting only `overflow-y` computes the
            // other axis from `visible` to `auto` — so a single wide child
            // silently made the whole region scroll sideways, past the layout
            // and into blank space.
            className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 outline-none sm:p-6 lg:p-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

/**
 * The NEW marker.
 *
 * The word is in the accessible name rather than conveyed by colour alone, so
 * it survives a screen reader and a monochrome display.
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

/** `.rail-link` is defined in index.css — see the note there for why. */
function NavLink({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className="rail-link">
      {children}
    </Link>
  )
}

const GLYPH = 'ax-component-glyph'

/**
 * Lucide's `component` icon, defined once per page.
 *
 * `lucide-react` renders its paths inline at every call site, which is right
 * for an icon used a handful of times and wrong for one used 343 times in a
 * single list.
 */
function ComponentGlyphSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <symbol id={GLYPH} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z" />
        <path d="M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z" />
        <path d="M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z" />
        <path d="M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z" />
      </symbol>
    </svg>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground/70 shrink-0 px-3 text-[11px] font-medium tracking-wide uppercase md:mb-1">
      {children}
    </div>
  )
}

function Sidebar({ nav, path }: { nav: Nav; path: string }) {
  const navRef = useRef<HTMLElement>(null)

  /**
   * Bring the current page into view in the sidebar.
   *
   * The list is several hundred entries long, so after a reload the highlighted
   * item is usually far outside the visible window. The container is scrolled
   * directly rather than through `scrollIntoView`, which walks up the ancestors
   * and will happily scroll the page as well as the sidebar. It only moves when
   * the item is actually out of view, and it is instant, because an animation
   * nobody asked for competes with the navigation that just happened.
   */
  useLayoutEffect(() => {
    const element = navRef.current
    const active = element?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!element || !active) return

    const navBox = element.getBoundingClientRect()
    const box = active.getBoundingClientRect()

    if (element.scrollHeight > element.clientHeight && (box.top < navBox.top || box.bottom > navBox.bottom)) {
      element.scrollTop += box.top - navBox.top - (element.clientHeight - box.height) / 2
    }

    if (element.scrollWidth > element.clientWidth && (box.left < navBox.left || box.right > navBox.right)) {
      element.scrollLeft += box.left - navBox.left - (element.clientWidth - box.width) / 2
    }
  }, [path])

  return (
    <nav
      ref={navRef}
      aria-label="Documentation"
      className="border-border flex shrink-0 gap-4 overflow-x-auto overflow-y-hidden border-b px-4 py-2 md:w-56 md:flex-col md:gap-5 md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-4"
    >
      <ComponentGlyphSprite />

      <div className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch">
        <GroupLabel>Getting started</GroupLabel>
        {nav.docs.map((doc) => (
          <NavLink key={doc.id} href={doc.href} current={path === doc.href}>
            <span className="flex items-center gap-2">
              <span className="[&_svg]:size-3.5">{doc.icon}</span>
              {doc.label}
            </span>
          </NavLink>
        ))}
      </div>

      <div className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch">
        <GroupLabel>Examples</GroupLabel>
        <NavLink href="/examples/" current={path === '/examples/'}>
          All examples
        </NavLink>
        {nav.examples.map((example) => (
          <NavLink key={example.id} href={example.href} current={path === example.href}>
            <span className="flex items-center gap-2">
              <ArrowUpRight className="text-muted-foreground/60 size-3.5 shrink-0" aria-hidden="true" />
              {example.label}
            </span>
          </NavLink>
        ))}
      </div>

      <div className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch">
        <GroupLabel>Components</GroupLabel>
        <NavLink href="/components/" current={path === '/components/'}>
          All components
        </NavLink>
      </div>

      {nav.categories.map((category) => (
        <div
          key={category.label}
          className="flex shrink-0 flex-row items-center gap-1 md:flex-col md:items-stretch"
        >
          <GroupLabel>{category.label}</GroupLabel>
          {category.items.map((entry) => (
            <NavLink key={entry.id} href={entry.href} current={path === entry.href}>
              <span className="flex min-w-0 items-center gap-2">
                {/* One glyph for every component, the same everywhere. It marks
                    the row as a component rather than identifying which one —
                    the label already does that, and 343 distinct icons would be
                    343 things to learn.

                    Drawn once as a sprite and referenced 343 times. Inlining
                    the paths per row cost about 700 bytes each, which is a
                    quarter of a megabyte on every page for one repeated
                    picture. */}
                <svg
                  className="text-muted-foreground/60 size-3.5 shrink-0"
                  aria-hidden="true"
                  focusable="false"
                >
                  <use href={`#${GLYPH}`} />
                </svg>
                <span className="truncate">{entry.label}</span>
              </span>
              {entry.isNew && <NewTag />}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

/**
 * The way out of a full-screen example.
 *
 * Hidden until focused, in the manner of a skip link. An example is a whole app
 * layout, so every corner belongs to something — a permanent overlay lands on
 * top of one of them in at least one example whatever corner it picks.
 */
function ExampleEscape() {
  return (
    <Link
      href="/examples/"
      className={cn(
        'sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4',
        'focus-visible:z-50 focus-visible:flex focus-visible:items-center focus-visible:gap-2',
        'focus-visible:bg-background focus-visible:text-foreground focus-visible:border-border',
        'focus-visible:border focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm',
        radius.control,
        focusRing,
      )}
    >
      Back to examples
    </Link>
  )
}
