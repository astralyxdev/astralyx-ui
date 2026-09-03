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
        <CardHeader className="flex-row items-center justify-between gap-4 py-2">
          <CardTitle>{demo.title}</CardTitle>
          <TabsList>
            <TabsTrigger value="preview" className="px-2.5 py-1 text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="px-2.5 py-1 text-xs">
              Code
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <TabsContent value="preview">
          <CardBody
            className={cn(
              'gap-3',
              demo.stack ? 'flex flex-col' : 'flex flex-wrap items-center',
            )}
          >
            {demo.render()}
          </CardBody>
        </TabsContent>

        <TabsContent value="code">
          <CardBody className="p-3">
            <CodeBlock code={demo.code} language={demo.language ?? 'tsx'} />
          </CardBody>
        </TabsContent>
      </Card>
    </Tabs>
  )
}

export { Demo }
