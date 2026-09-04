import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ApiReference } from '@/components/showcase/api-table'
import { PageHeader } from '@/components/ui/page-header'
import { Composer } from '@/components/ui/composer'
import { Demo } from '@/components/showcase/demo'
import { Section } from '@/components/showcase/section'
import { CodeBlock } from '@/components/ui/code-block'
import { componentPath, ENTRIES, findCategory, isReady, type ComponentEntry } from '@/registry'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'
import { apiDocs, hasApi } from '@/registry/props'

/**
 * A component page reads top to bottom: what it is, how to bring it in, a
 * playground to feel it out, worked examples, then the full props reference.
 */
function ComponentPage({ entry }: { entry: ComponentEntry }) {
  // Above the `isReady` bail-out: hooks cannot sit behind a conditional
  // return, and an unbuilt component still has a real URL worth describing.
  useSeo({
    title: entry.label,
    description: `${entry.description} Copy it into your project with npx astralyx-ui add ${entry.id}.`,
    path: componentPath(entry.id),
  })

  if (!isReady(entry)) return <NotBuilt entry={entry} />

  const category = findCategory(entry.id)

  return (
    <article className="mx-auto max-w-4xl pb-8">
      <PageHeader
        eyebrow={
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/components">Components</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {category && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{category.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        }
        title={entry.label}
        description={entry.description}
        meta={
          <code className="text-muted-foreground/70 font-mono text-xs">
            src/components/ui/{entry.id}.tsx
          </code>
        }
      />

      <Section title="Install">
        <CodeBlock code={`npx astralyx-ui add ${entry.id}`} language="bash" header={false} />
      </Section>

      {entry.usage && (
        <Section title="Usage">
          <CodeBlock code={entry.usage} language="tsx" header={false} />
        </Section>
      )}

      {entry.composer && (
        <Section
          title="Composer"
          description="Change the props and the source below follows."
        >
          <Composer
            controls={entry.composer.controls}
            render={entry.composer.render}
            code={entry.composer.code}
            tall={entry.composer.tall}
          />
        </Section>
      )}

      {entry.demos && (
        <Section title="Examples">
          {entry.demos.map((demo) => (
            <Demo key={demo.title} demo={demo} />
          ))}
        </Section>
      )}

      {hasApi(entry.id, entry.api) && (
        <Section
          title="API"
          description="Generated from the source, so it cannot fall behind the code. One table per exported component, then hooks, functions and types."
        >
          <ApiReference api={apiDocs(entry.id, entry.api)} />
        </Section>
      )}

      <ComponentNav id={entry.id} />
    </article>
  )
}

/**
 * Previous and next in catalogue order.
 *
 * The order is the sidebar's, so "next" here and "the one below" there are the
 * same component. Deriving it from `ENTRIES` rather than a separate list is
 * what keeps that true when a component is added or a category is reordered.
 */
function ComponentNav({ id }: { id: string }) {
  const index = ENTRIES.findIndex((entry) => entry.id === id)
  if (index === -1) return null

  const previous = index > 0 ? ENTRIES[index - 1] : undefined
  const next = index < ENTRIES.length - 1 ? ENTRIES[index + 1] : undefined
  if (!previous && !next) return null

  return (
    <nav
      aria-label="Components"
      className="border-border mt-14 grid gap-3 border-t pt-6 sm:grid-cols-2"
    >
      {previous ? <NavCard entry={previous} direction="previous" /> : <span />}
      {next && <NavCard entry={next} direction="next" />}
    </nav>
  )
}

/** The label is the destination, not the direction. */
function NavCard({
  entry,
  direction,
}: {
  entry: ComponentEntry
  direction: 'previous' | 'next'
}) {
  const forward = direction === 'next'
  return (
    <Link
      to={componentPath(entry.id)}
      className={cn(
        'border-border hover:border-foreground/25 flex flex-col gap-1 border p-4',
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
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
      <span className="text-sm font-medium">{entry.label}</span>
      <span className="text-muted-foreground line-clamp-1 text-xs">
        {entry.description}
      </span>
    </Link>
  )
}

function NotBuilt({ entry }: { entry: ComponentEntry }) {
  return (
    <article className="mx-auto max-w-4xl">
      <header className="border-border mb-10 border-b pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{entry.label}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {entry.description}
        </p>
      </header>

      <div className="space-y-4">
        <div
          className={cn(
            'border-border text-muted-foreground border border-dashed px-5 py-12 text-center text-sm',
            radius.panel,
          )}
        >
          Not built yet.
        </div>
        <CodeBlock
          language="bash"
          title="Scaffold it"
          code={`npx astralyx-ui add ${entry.id}`}
        />
      </div>
    </article>
  )
}

export { ComponentPage }
