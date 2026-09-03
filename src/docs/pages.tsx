import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowLeft, ArrowRight, Check, Copy, FolderTree, Palette, Ruler, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { TableOfContents } from '@/components/ui/table-of-contents'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { componentPath, ENTRIES } from '@/registry'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { DocEntry } from './index'

import { docPath } from './index'

export { docPath }
export type { DocEntry }

/** A heading id that survives punctuation and reads well in a URL. */
function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Shared shell so every doc page has the same rhythm.
 *
 * A contents rail appears from `xl` and is read from the DOM rather than
 * declared twice — a hand-maintained list of headings goes stale the first time
 * someone renames a section, and a stale table of contents is worse than none.
 *
 * Below `xl` the rail is dropped rather than collapsed into a disclosure. On a
 * narrow screen the page is one column and short enough to scroll; a contents
 * list there costs a tap and saves nothing.
 */
function Doc({
  id,
  title,
  lead,
  children,
}: {
  id: string
  title: string
  lead: string
  children: ReactNode
}) {
  const index = DOCS.findIndex((doc) => doc.id === id)
  const previous = index > 0 ? DOCS[index - 1] : undefined
  const next = index >= 0 && index < DOCS.length - 1 ? DOCS[index + 1] : undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 pb-8">
      <article className="min-w-0 max-w-3xl flex-1" data-doc-body>
        <PageHeader title={title} description={lead} />
        <div className="space-y-10">{children}</div>

        {(previous || next) && (
          <nav
            aria-label="Documentation"
            className="border-border mt-14 grid gap-3 border-t pt-6 sm:grid-cols-2"
          >
            {previous ? <DocLink doc={previous} direction="previous" /> : <span />}
            {next && <DocLink doc={next} direction="next" />}
          </nav>
        )}
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <div className="sticky top-6">
          <TableOfContents container="[data-doc-body]" />
        </div>
      </aside>
    </div>
  )
}

/** Previous/next card. The label is the destination, not the direction. */
function DocLink({
  doc,
  direction,
}: {
  doc: DocEntry
  direction: 'previous' | 'next'
}) {
  const forward = direction === 'next'
  return (
    <Link
      to={docPath(doc.id)}
      className={cn(
        'border-border hover:border-foreground/25 group flex flex-col gap-1 border p-4 transition-colors duration-150 ease-out motion-reduce:transition-none',
        radius.surface,
        focusRing,
        forward && 'sm:items-end sm:text-end',
      )}
    >
      <span className="text-muted-foreground/70 flex items-center gap-1 text-xs">
        {!forward && <ArrowLeft className="size-3" aria-hidden="true" />}
        {forward ? 'Next' : 'Previous'}
        {forward && <ArrowRight className="size-3" aria-hidden="true" />}
      </span>
      <span className="text-sm font-medium">{doc.label}</span>
      <span className="text-muted-foreground line-clamp-1 text-xs">
        {doc.description}
      </span>
    </Link>
  )
}

/**
 * A section with a linkable heading.
 *
 * The anchor is the heading itself rather than a hover-revealed icon beside it:
 * a link that only appears on hover cannot be found on a touch screen, and the
 * id is what the contents rail scrolls to anyway.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = slug(title)
  return (
    <section className="space-y-3">
      {/* The id belongs on the heading, not the section: the contents rail
          reads `h2, h3` and scrolls to what it found. */}
      <h2 id={id} className="scroll-mt-6 text-base font-semibold tracking-tight">
        <a href={`#${id}`} className={cn('hover:underline underline-offset-4', focusRing)}>
          {title}
        </a>
      </h2>
      <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  )
}

/* --------------------------------------------------------- introduction */

const introduction: DocEntry = {
  id: 'introduction',
  label: 'Introduction',
  description: 'What this kit is, and what it refuses to be.',
  render: () => (
    <Doc
      id="introduction"
      title="Introduction"
      lead={`${ENTRIES.length} components built on their own primitives. A CLI copies them into your repo and they become yours — there is no package to upgrade and nothing to fight when a design changes.`}
    >
      <Section title="Not a dependency">
        <p>
          <code className="font-mono text-xs">astralyx-ui</code> is a CLI and a
          registry, not a component library you import from. It writes source
          files into your project and then gets out of the way — the components
          in your tree have no link back to it, and upgrading the CLI cannot
          change a line you are shipping.
        </p>
        <p>
          Every primitive lives in this repository: the slot that powers{' '}
          <code className="font-mono text-xs">asChild</code>, the popper that
          places every floating layer, the field that delegates focus, the
          listbox, the tabs, the router. Nothing is imported from a headless-UI
          library, so nothing can change under you.
        </p>
        <p>
          That is a trade. You own the accessibility work — and it is done: every
          component here is checked for ARIA wiring, keyboard paths and focus
          management on every build.
        </p>
      </Section>

      <Section title="One style contract">
        <p>
          No component spells out its own focus ring, corner radius or control
          height. They compose fragments from{' '}
          <code className="font-mono text-xs">src/lib/styles.ts</code>, which is
          the single place any of it changes.
        </p>
        <CodeBlock
          language="tsx"
          filePath="src/lib/styles.ts"
          maxLines={12}
          code={`export const controlSize = {
  xs: 'h-7 gap-1.5 px-3.5 text-xs rounded-full [corner-shape:round]',
  sm: 'h-8 gap-1.5 px-3.5 text-sm rounded-[var(--radius-control-sm)]',
  md: 'h-9 gap-2 px-4.5 text-sm rounded-[var(--radius-control-md)]',
  lg: 'h-10 gap-2 px-6 text-sm rounded-[var(--radius-control-lg)]',
  xl: 'h-12 gap-2.5 px-8 text-base rounded-[var(--radius-control-xl)]',
} as const

// Change a rung here and every control on it follows.`}
        />
      </Section>

      <Section title="The rules it holds to">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">Rule</TableHead>
              <TableHead>Why</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ['Colour-only interaction', 'Nothing moves, resizes or gains elevation on hover or press. Layout never shifts under the pointer.'],
              ['No shadows', 'Depth comes from a surface ladder — page, card, header, group — not from stacked elevation.'],
              ['Secondary over outline', 'A screen of outlined controls is a grid of boxes with no hierarchy. A tint separates without another line.'],
              ['iOS-style corners', 'corner-shape: squircle everywhere, with a circular fallback where it is unsupported.'],
              ['One grid', 'Heights, radii, icon sizes and type all come from named scales. Off-grid values are caught on every build.'],
            ].map(([rule, why]) => (
              <TableRow key={rule}>
                <TableCell className="font-medium">{rule}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{why}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/docs/installation">Installation</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to={componentPath('button')}>Browse components</Link>
        </Button>
      </div>
    </Doc>
  ),
}

/* --------------------------------------------------------- installation */

const installation: DocEntry = {
  id: 'installation',
  label: 'Installation',
  description: 'One command to set up, one per component after that.',
  render: () => (
    <Doc
      id="installation"
      title="Installation"
      lead="A CLI copies components into your repo and brings whatever they depend on. Nothing is generated, nothing is hidden, and there is no package wrapping the code you end up with."
    >
      <Section title="Quick start">
        <CodeBlock
          language="bash"
          title="Three commands"
          code={`npm i -D astralyx-ui
npx astralyx-ui init
npx astralyx-ui add button`}
        />
        <p>
          <code className="font-mono text-xs">init</code> writes a{' '}
          <code className="font-mono text-xs">components.json</code>, drops in the
          two helpers every component needs, and installs the theme.{' '}
          <code className="font-mono text-xs">add</code> copies a component and
          everything it imports.
        </p>
      </Section>

      <Section title="Wire up the theme">
        <p>
          <code className="font-mono text-xs">init</code> writes the token layer
          to <code className="font-mono text-xs">src/styles/astralyx.css</code>.
          Import it from your Tailwind entry:
        </p>
        <CodeBlock
          language="css"
          filePath="src/index.css"
          code={`@import 'tailwindcss';
@import './styles/astralyx.css';`}
        />
        <p>
          That file carries the colour tokens, the surface ladder and the
          keyframes components animate with. Without it everything renders
          unstyled.
        </p>
      </Section>

      <Section title="Adding components">
        <p>
          Dependencies come along without being asked.{' '}
          <code className="font-mono text-xs">data-grid</code> pulls{' '}
          <code className="font-mono text-xs">table</code>,{' '}
          <code className="font-mono text-xs">checkbox</code> and{' '}
          <code className="font-mono text-xs">empty</code>; anything needing an
          npm package gets it installed.
        </p>
        <CodeBlock
          language="bash"
          title="Working with the registry"
          code={`npx astralyx-ui add data-grid dialog toast   # several at once
npx astralyx-ui add --all                    # every component
npx astralyx-ui list                         # the catalogue, by category
npx astralyx-ui info data-grid               # what it would bring with it
npx astralyx-ui add button --dry-run         # look before you leap`}
        />
        <Alert color="blue" title="Files are never replaced by accident">
          <code className="font-mono text-xs">add</code> skips anything that
          already exists and says so. Once you have edited a component it is
          yours — pass <code className="font-mono text-xs">--overwrite</code>{' '}
          only when you actually mean to lose those changes.
        </Alert>
      </Section>

      <Section title="Where things go">
        <p>
          <code className="font-mono text-xs">components.json</code> holds both
          the folders files are written to and the aliases their imports use, so
          you can keep components anywhere and the imports follow.
        </p>
        <CodeBlock
          language="json"
          filePath="components.json"
          code={`{
  "tsx": true,
  "tailwind": { "css": "src/index.css" },
  "aliases": {
    "ui": "@/components/ui",
    "primitives": "@/components/primitives",
    "lib": "@/lib"
  },
  "paths": {
    "ui": "src/components/ui",
    "primitives": "src/components/primitives",
    "lib": "src/lib",
    "styles": "src/styles"
  }
}`}
        />
        <p>
          Your bundler needs to resolve whatever alias you choose. For Vite and
          TypeScript that is one entry each:
        </p>
        <CodeBlock
          language="tsx"
          filePath="vite.config.ts"
          code={`import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})`}
        />
      </Section>

      <Section title="What gets installed">
        <p>
          The CLI itself has no runtime dependencies. These are what the
          components need, and only the ones you actually use are added:
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Needed by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">cn</TableCell>
              <TableCell>
                Every component. Backs the{' '}
                <code className="font-mono text-xs">cn()</code> helper that
                resolves conflicting Tailwind classes by argument order.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">class-variance-authority</TableCell>
              <TableCell>Anything with variants — buttons, badges, inputs.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">lucide-react</TableCell>
              <TableCell>Anything with an icon.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">shiki</TableCell>
              <TableCell>
                <code className="font-mono text-xs">CodeBlock</code>,{' '}
                <code className="font-mono text-xs">QueryEditor</code> and the
                other highlighted surfaces.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">react-hook-form</TableCell>
              <TableCell>
                <code className="font-mono text-xs">Form</code> only.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Alert color="amber" title="Do not skip the cn() wrapper">
          Several components rely on it to resolve conflicts by argument order —
          a size&rsquo;s radius overriding the base one, a variant cancelling a
          default. Dropping it breaks those silently, because both classes then
          apply and stylesheet order decides.
        </Alert>
      </Section>

      <Section title="Then use it">
        <CodeBlock
          language="tsx"
          title="Use it"
          code={`import { Button } from '@/components/ui/button'

<Button color="blue" size="lg">Deploy</Button>`}
        />
        <p>
          The file is in your repo now. Edit it, rename it, delete half of it —
          nothing upstream will argue.
        </p>
      </Section>
    </Doc>
  ),
}

const theming: DocEntry = {
  id: 'theming',
  label: 'Theming',
  description: 'Tokens, colour sets, and the surface ladder.',
  render: () => (
    <Doc
      id="theming"
      title="Theming"
      lead="Two token layers: neutral surfaces that build a depth ladder, and eight colour sets any component can be pointed at with one prop."
    >
      <Section title="Colour sets">
        <p>
          A colour set assigns six{' '}
          <code className="font-mono text-xs">--ui-*</code> variables. Every
          colourable variant reads them, so one prop restyles solid, secondary,
          outline and ghost together.
        </p>
        <CodeBlock
          language="tsx"
          title="One prop, four variants"
          code={`<Button color="blue">Solid</Button>
<Button color="blue" variant="secondary">Secondary</Button>
<Button color="blue" variant="outline">Outline</Button>
<Button color="blue" variant="ghost">Ghost</Button>

// Or any CSS colour at all — fill, text, hover and border are derived:
<Button tint="#7c3aed">Custom</Button>`}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {(['neutral', 'blue', 'violet', 'cyan', 'green', 'amber', 'rose', 'destructive'] as const).map((color) => (
            <Badge key={color} color={color}>{color}</Badge>
          ))}
        </div>
      </Section>

      <Section title="Hover is a token, not a calculation">
        <p>
          Hover values are declared per theme rather than derived by mixing. A
          mix has to pick a direction, and the right direction flips: a light
          fill darkens, a dark one lightens. One formula is wrong in one theme.
        </p>
      </Section>

      <Section title="The surface ladder">
        <p>
          With no shadows, depth is carried by lightness alone. Each step sits
          above the last:
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Surface</TableHead>
              <TableHead className="w-28">Dark</TableHead>
              <TableHead>Used by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ['page', '0.08', '--background'],
              ['card body', '0.13', '--card, --popover'],
              ['card header', '0.15', 'muted at 40% over the card'],
              ['group', '0.18', '--secondary, the tray behind cards'],
              ['hover', '0.20', '--accent'],
            ].map(([name, l, used]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell className="font-mono text-xs tabular-nums">{l}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{used}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Alert color="blue" title="Lowering opacity does not lighten">
          On a dark theme an opacity modifier blends toward the page, which pulls
          lightness <em>down</em>. Reaching for <code className="font-mono text-xs">/50</code>{' '}
          to lighten a surface is how the group once ended up darker than the
          card header it sits above.
        </Alert>
      </Section>
    </Doc>
  ),
}

/* ------------------------------------------------------------ structure */

const structure: DocEntry = {
  id: 'structure',
  label: 'Structure',
  description: 'How the files are laid out and why.',
  render: () => (
    <Doc
      id="structure"
      title="Structure"
      lead="Behaviour and appearance are separated on purpose: primitives know how something works, components know how it looks."
    >
      <Section title="Directories">
        <CodeBlock
          language="bash"
          title="src"
          code={`components/primitives   behaviour only, no styling
components/ui           the components themselves
lib/styles.ts           the global style contract
lib/date.ts             calendar maths, no date library
index.css               tokens, and the CSS classes cannot reach`}
        />
      </Section>

      <Section title="Primitives">
        <p>
          A primitive owns the part that is easy to get subtly wrong and hard to
          notice: focus delegation, placement, dismissal, roving focus.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['slot', 'Merges props onto a child element — the engine behind asChild.'],
            ['popper', 'Fixed-position placement with a flip chain, so a layer is never clipped by a scrolling ancestor.'],
            ['field', 'A box around an input that forwards clicks on its padding to the control.'],
            ['dialog', 'Drives the native <dialog> element, for a focus trap the platform provides.'],
            ['dismissable', 'Escape and outside-press, on pointerdown rather than click.'],
            ['tabs / radio-group / collapsible', 'Selection state and the keyboard patterns that go with it.'],
          ].map(([name, what]) => (
            <Card key={name} size="sm">
              <CardHeader>
                <CardTitle as="h3" className="font-mono">{name}</CardTitle>
              </CardHeader>
              <CardBody className="text-muted-foreground text-xs">{what}</CardBody>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="What belongs where">
        <p>
          If it can be described without mentioning a colour or a pixel, it is a
          primitive. If it cannot exist without one, it is a component.
        </p>
      </Section>
    </Doc>
  ),
}

/* ------------------------------------------------------------ the rules */

const conventions: DocEntry = {
  id: 'conventions',
  label: 'Conventions',
  description: 'The decisions already made, so you do not remake them.',
  render: () => (
    <Doc
      id="conventions"
      title="Conventions"
      lead="A design system is mostly a list of arguments nobody has to have twice. These are the ones this kit has settled."
    >
      <Section title="Prefer secondary to outline">
        <p>
          An outline draws a line around everything it touches. A screen full of
          them is a grid of boxes with no hierarchy, and those borders start
          competing with the ones carrying real structure — a card edge, a table
          rule, a divider. A tint separates without adding another line.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs">
            <Check className="size-4 text-[var(--green)]" />
            <Button size="sm" variant="secondary">Secondary</Button>
          </span>
          <span className="flex items-center gap-2 text-xs">
            <X className="size-4 text-[var(--destructive)]" />
            <Button size="sm" variant="outline">Outline</Button>
          </span>
        </div>
        <p>
          <code className="font-mono text-xs">outline</code> stays in the API for
          the case it is right: a control on an already-tinted surface, where a
          second fill would compete instead of separate.
        </p>
      </Section>

      <Section title="Meaning goes in colour, not variant">
        <p>
          A badge's <code className="font-mono text-xs">variant</code> is a
          treatment; its <code className="font-mono text-xs">color</code> is what
          it means. Status belongs in the colour.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge color="green">passed</Badge>
          <Badge color="destructive">failed</Badge>
          <Badge color="blue">running</Badge>
          <Badge>queued</Badge>
        </div>
      </Section>

      <Section title="Controlled and uncontrolled, always both">
        <p>
          Every stateful component accepts{' '}
          <code className="font-mono text-xs">value</code> and{' '}
          <code className="font-mono text-xs">defaultValue</code>. A component
          that only works controlled forces state upward for no reason.
        </p>
      </Section>

      <Section title="Verify against the compiled CSS">
        <p>
          A Tailwind class that never generates looks exactly like one that was
          never written. Class names built by template literal are invisible to
          the scanner and silently produce nothing — which is why the colour sets
          are written out in full.
        </p>
        <CodeBlock
          language="tsx"
          title="This generates no CSS"
          code={`// Tailwind scans source text, so it never sees the result.
const set = (name: string) => \`[--ui:var(--\${name})]\`

// Written out, it does:
const colorSet = {
  blue: '[--ui:var(--blue)] [--ui-fg:var(--blue-foreground)]',
}`}
        />
      </Section>
    </Doc>
  ),
}


/* --------------------------------------------------------- accessibility */

const accessibility: DocEntry = {
  id: 'accessibility',
  label: 'Accessibility',
  description: 'What is guaranteed, what is yours, and how it is checked.',
  render: () => (
    <Doc
      id="accessibility"
      title="Accessibility"
      lead="Every component ships its own semantics. None of it is optional, and none of it depends on you remembering to add an attribute."
    >
      <Section title="What the components guarantee">
        <p>
          Interactive elements are real elements. A button is a{' '}
          <code className="font-mono text-xs">button</code>, a dialog is a native{' '}
          <code className="font-mono text-xs">dialog</code> opened with{' '}
          <code className="font-mono text-xs">showModal()</code>, and a link that
          navigates is an anchor. Focus containment, Escape handling and page
          inerting come from the platform rather than from a hand-rolled trap
          that works until someone opens a second overlay.
        </p>
        <ul className="ms-4 list-disc space-y-1.5">
          <li>Every control is reachable and operable from the keyboard.</li>
          <li>
            Focus is always visible. Interaction states are colour-only, so a
            focus ring is never the thing being restyled.
          </li>
          <li>
            State is announced, not implied: <code className="font-mono text-xs">aria-expanded</code>,{' '}
            <code className="font-mono text-xs">aria-pressed</code>,{' '}
            <code className="font-mono text-xs">aria-current</code> and{' '}
            <code className="font-mono text-xs">aria-invalid</code> track the
            component&rsquo;s own state.
          </li>
          <li>
            Anything conveyed by colour is also conveyed some other way — a word,
            an icon, or a shape.
          </li>
          <li>
            Motion respects <code className="font-mono text-xs">prefers-reduced-motion</code>.
            Where an animation carried meaning, the meaning stays and the movement
            goes.
          </li>
        </ul>
      </Section>

      <Section title="What is still yours">
        <p>
          A component cannot know what a control is for. These are the places
          where the kit takes a prop and cannot invent a default.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Yours</TableHead>
              <TableHead>Why it cannot be automatic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Accessible names</TableCell>
              <TableCell>
                An icon-only button needs a verb only you know. Every such
                component takes a label prop and several warn in development when
                it is missing.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Heading order</TableCell>
              <TableCell>
                Components render the heading level you ask for. Only the page
                knows whether a card title is an h2 or an h4.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Alt text</TableCell>
              <TableCell>
                <code className="font-mono text-xs">MediaGallery</code> makes it a
                required field rather than an optional one, because a gallery is
                exactly where empty alt text accumulates.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Language and direction</TableCell>
              <TableCell>
                Set <code className="font-mono text-xs">lang</code> and{' '}
                <code className="font-mono text-xs">dir</code> on the document.
                Components use logical properties throughout, so RTL works once
                the document says so.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="How it is checked">
        <p>
          Claims like these rot unless something enforces them. Every component
          and every documentation route is rendered to static markup in a test
          harness, and the output is asserted against a set of rules:
        </p>
        <ul className="ms-4 list-disc space-y-1.5">
          <li>No duplicate <code className="font-mono text-xs">id</code> on a page.</li>
          <li>
            No <code className="font-mono text-xs">aria-labelledby</code> or{' '}
            <code className="font-mono text-xs">aria-describedby</code> pointing at
            an element that does not exist.
          </li>
          <li>No form control without a label, and no button without a name.</li>
          <li>No skipped heading levels.</li>
        </ul>
        <p>
          Contrast is measured in a real browser against computed colours rather
          than against the palette, because a token is only as good as the pair it
          ends up in.
        </p>
        <Alert color="blue" title="Ids derived from data need scoping">
          Any id built from a value — a row key, a field name — must be prefixed
          with <code className="font-mono text-xs">useId()</code>. Two instances of
          the same component on one page will otherwise collide, and a colliding
          id silently points a label at the wrong control.
        </Alert>
      </Section>

      <Section title="Testing your own screens">
        <p>
          The two checks that catch the most, fastest: tab through the screen
          without touching the mouse, and read it with the colours removed. If a
          state disappears in greyscale it was carried by colour alone, and if a
          control cannot be reached by keyboard it does not exist for a real
          share of your users.
        </p>
      </Section>
    </Doc>
  ),
}

export const DOCS: DocEntry[] = [
  introduction,
  installation,
  theming,
  structure,
  conventions,
  accessibility,
]

export function findDoc(id: string) {
  return DOCS.find((doc) => doc.id === id)
}

export const DOC_ICONS: Record<string, ReactNode> = {
  introduction: <Sparkles />,
  installation: <Copy />,
  theming: <Palette />,
  structure: <FolderTree />,
  conventions: <Ruler />,
  accessibility: <ShieldCheck />,
}
