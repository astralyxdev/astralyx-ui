import { ArrowRight } from 'lucide-react'
import { Link } from '@/components/primitives/router'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { EXAMPLES, examplePath } from '@/examples'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useSeo } from '@/lib/seo'

/** Index of the full-page examples. */
function Examples() {
  useSeo({
    title: 'Examples',
    description:
      'Whole screens built from the kit — a dashboard, a mail client, a repository browser, an assistant and a settings form.',
    path: '/examples',
  })

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <PageHeader
        title="Examples"
        description="Whole screens assembled from the kit, with nothing hand-rolled. Each one is a real page — resize it, open the menus, drag the dividers."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <Link
            key={example.id}
            to={examplePath(example.id)}
            className={cn('group block', focusRing, 'rounded-3xl')}
          >
            <Card className="hover:border-foreground/25 h-full transition-colors duration-150 ease-out motion-reduce:transition-none">
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle as="h2" className="text-base">{example.label}</CardTitle>
                <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {example.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {example.uses.slice(0, 6).map((name) => (
                    <Badge key={name} size="sm">
                      {name}
                    </Badge>
                  ))}
                  {example.uses.length > 6 && (
                    <Badge size="sm">
                      +{example.uses.length - 6}
                    </Badge>
                  )}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export { Examples }
