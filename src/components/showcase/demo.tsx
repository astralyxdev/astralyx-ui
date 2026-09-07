'use client'

import { ClientOnly } from '@/components/showcase/client-only'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/ui/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DemoSpec } from '@/registry'
import { cn } from '@/lib/utils'

/**
 * One example: a live preview and its source.
 *
 * Built from the kit's own Card and Tabs rather than hand-rolled markup — the
 * showcase is the first consumer, so anything awkward here surfaces before it
 * reaches anyone else.
 *
 * One `Tabs` wraps the whole card. Splitting the list and the panels across two
 * instances would look identical but generate mismatched ids, leaving each
 * trigger's `aria-controls` pointing at a panel that does not exist.
 */
function Demo({ demo }: { demo: DemoSpec }) {
  return (
    <Tabs defaultValue="preview" className="mb-4 gap-0">
      <Card>
        {/* The `action` slot rather than a hand-rolled row: it is the same
            layout, minus a `py-2` that made the header the one band in the kit
            whose inset was not square. */}
        <CardHeader
          action={
            <TabsList>
              <TabsTrigger value="preview" className="px-2.5 py-1 text-xs">
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="px-2.5 py-1 text-xs">
                Code
              </TabsTrigger>
            </TabsList>
          }
        >
          <CardTitle>{demo.title}</CardTitle>
        </CardHeader>

        <TabsContent value="preview">
          <CardBody
            className={cn(
              'gap-3',
              demo.stack ? 'flex flex-col' : 'flex flex-wrap items-center',
            )}
          >
            <ClientOnly minHeight={40}>{() => demo.render()}</ClientOnly>
          </CardBody>
        </TabsContent>

        {/* Kept mounted so the source is in the exported HTML. It is the half
            of an example a search engine can actually read, and unmounting it
            meant 343 pages shipped with their code missing. */}
        <TabsContent value="code" keepMounted>
          <CardBody className="p-3">
            <CodeBlock code={demo.code} language={demo.language ?? 'tsx'} />
          </CardBody>
        </TabsContent>
      </Card>
    </Tabs>
  )
}

export { Demo }
