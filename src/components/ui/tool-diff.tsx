import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { JsonSchema } from '@/components/ui/tool-schema'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * What changed in a tool's contract between two versions of a server.
 *
 * MCP servers update underneath you. A parameter gets renamed, a previously
 * optional field becomes required, an enum loses a value — and the agent
 * carries on calling the tool the old way until something fails in a way that
 * looks like a model problem.
 *
 * **Breaking changes are classified, not just listed.** Adding an optional
 * parameter and making an existing one required are both "a change to
 * `properties`", and only one of them will break every existing call. The rule
 * this encodes: removals and newly-required fields break; additions and relaxed
 * requirements do not.
 *
 * A type change is always breaking, even `integer` to `number`, because the
 * caller is a model that was shown the old schema and will keep producing the
 * old shape.
 */
export type ToolChange = {
  path: string
  kind: 'added' | 'removed' | 'type' | 'required' | 'optional' | 'enum' | 'description'
  before?: string
  after?: string
  breaking: boolean
}

const BREAKING: Record<ToolChange['kind'], boolean> = {
  removed: true,
  required: true,
  type: true,
  enum: true,
  added: false,
  optional: false,
  description: false,
}

const KIND_LABEL: Record<ToolChange['kind'], string> = {
  added: 'added',
  removed: 'removed',
  type: 'type changed',
  required: 'now required',
  optional: 'now optional',
  enum: 'values changed',
  description: 'description',
}

/** Compares two tool input schemas one level deep, which is where tools live. */
export function diffToolSchemas(before: JsonSchema, after: JsonSchema): ToolChange[] {
  const changes: ToolChange[] = []
  const beforeProps = before.properties ?? {}
  const afterProps = after.properties ?? {}
  const beforeRequired = new Set(before.required ?? [])
  const afterRequired = new Set(after.required ?? [])

  for (const key of Object.keys(beforeProps)) {
    if (!(key in afterProps)) {
      changes.push({ path: key, kind: 'removed', before: String(beforeProps[key].type ?? 'any'), breaking: true })
      continue
    }

    const a = beforeProps[key]
    const b = afterProps[key]

    if (String(a.type) !== String(b.type)) {
      changes.push({
        path: key,
        kind: 'type',
        before: String(a.type ?? 'any'),
        after: String(b.type ?? 'any'),
        breaking: true,
      })
    }

    const aEnum = JSON.stringify(a.enum ?? null)
    const bEnum = JSON.stringify(b.enum ?? null)
    if (aEnum !== bEnum) {
      // Only breaking when values were taken away.
      const lost = (a.enum ?? []).some((value) => !(b.enum ?? []).includes(value))
      changes.push({
        path: key,
        kind: 'enum',
        before: (a.enum ?? []).join(', ') || '—',
        after: (b.enum ?? []).join(', ') || '—',
        breaking: lost,
      })
    }

    if (!beforeRequired.has(key) && afterRequired.has(key)) {
      changes.push({ path: key, kind: 'required', breaking: true })
    } else if (beforeRequired.has(key) && !afterRequired.has(key)) {
      changes.push({ path: key, kind: 'optional', breaking: false })
    }

    if (a.description !== b.description) {
      changes.push({
        path: key,
        kind: 'description',
        before: a.description,
        after: b.description,
        breaking: false,
      })
    }
  }

  for (const key of Object.keys(afterProps)) {
    if (key in beforeProps) continue
    changes.push({
      path: key,
      kind: 'added',
      after: String(afterProps[key].type ?? 'any'),
      // A new required parameter breaks every existing call.
      breaking: afterRequired.has(key),
    })
  }

  return changes
}

type ToolDiffProps = Omit<ComponentProps<'div'>, 'children'> & {
  tool: string
  before: JsonSchema
  after: JsonSchema
  beforeLabel?: ReactNode
  afterLabel?: ReactNode
  breakingLabel?: string
  identicalLabel?: string
  /** Supply your own changes instead of the built-in comparison. */
  changes?: ToolChange[]
}

function ToolDiff({
  tool,
  before,
  after,
  beforeLabel = 'before',
  afterLabel = 'after',
  breakingLabel = 'breaking',
  identicalLabel = 'This tool’s contract is unchanged.',
  changes: supplied,
  className,
  ...props
}: ToolDiffProps) {
  const changes = useMemo(
    () => supplied ?? diffToolSchemas(before, after),
    [supplied, before, after],
  )
  const breaking = changes.filter((change) => change.breaking).length

  return (
    <div
      data-slot="tool-diff"
      className={cn(
        surface,
        radius.surface,
        'overflow-hidden',
        breaking > 0 && 'border-destructive',
        className,
      )}
      {...props}
    >
      <div className="border-border bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-sm font-medium">{tool}</code>
        <span className="text-muted-foreground/60 font-mono text-[11px]">
          {beforeLabel} → {afterLabel}
        </span>
        {breaking > 0 && (
          <Badge size="sm" color="destructive">
            <TriangleAlert className="size-3" aria-hidden="true" />
            {breaking} {breakingLabel}
          </Badge>
        )}
      </div>

      {changes.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">{identicalLabel}</p>
      ) : (
        <ul className="divide-border/60 list-none divide-y">
          {changes.map((change, index) => (
            <li key={index} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-2.5">
              <code className="font-mono text-xs font-medium">{change.path}</code>

              <Badge
                size="sm"
                color={change.breaking ? 'destructive' : 'neutral'}
                variant={change.breaking ? 'secondary' : 'outline'}
              >
                {KIND_LABEL[change.kind]}
              </Badge>

              {(change.before || change.after) && (
                <span className="text-muted-foreground flex min-w-0 items-baseline gap-1.5 font-mono text-[11px]">
                  {change.before && <span className="line-through">{change.before}</span>}
                  {change.before && change.after && (
                    <ArrowRight className="size-3 shrink-0 self-center" aria-hidden="true" />
                  )}
                  {change.after && <span className="text-foreground">{change.after}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { ToolDiff, BREAKING as toolChangeBreaking }
export type { ToolDiffProps }
