import { Link } from '@/components/primitives/router'
import { Button } from '@/components/ui/button'

function NotFound({ path }: { path: string }) {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
        <p className="text-muted-foreground text-sm">
          Nothing is routed at <code className="font-mono">{path}</code>.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link to="/">Back to overview</Link>
      </Button>
    </div>
  )
}

export { NotFound }
