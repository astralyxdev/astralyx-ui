import { useState, type ComponentProps } from 'react'
import { ChevronRight } from 'lucide-react'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A collapsible view of a parsed JSON value.
 *
 * Takes a value, not a string: the caller has already parsed it in every real
 * case (an API response, a config object), and re-serialising just to re-parse
 * loses `undefined`, dates and anything else that survives in memory.
 *
 * Collapsed nodes show their size, because "does this array have three entries
 * or three thousand" is the question you actually have before expanding one.
 */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

const TYPE_TONE = {
  string: 'text-[var(--green-soft-foreground)]',
  number: 'text-[var(--blue-soft-foreground)]',
  boolean: 'text-[var(--violet-soft-foreground)]',
  null: 'text-muted-foreground',
} as const

function preview(value: Json): string {
  if (Array.isArray(value)) return `[] ${value.length} items`
  if (value && typeof value === 'object') {
    return `{} ${Object.keys(value).length} keys`
  }
  return String(value)
}

function JsonNode({
  name,
  value,
  depth,
  defaultExpandedDepth,
}: {
  name?: string
  value: Json
  depth: number
  defaultExpandedDepth: number
}) {
  const branch = value !== null && typeof value === 'object'
  const [open, setOpen] = useState(depth < defaultExpandedDepth)

  if (!branch) {
    const kind = value === null ? 'null' : (typeof value as keyof typeof TYPE_TONE)
    return (
      <div
        className="flex gap-2 py-0.5"
        style={{ paddingInlineStart: `${depth * 14}px` }}
      >
        {name !== undefined && (
          <span className="text-foreground/80 shrink-0">{name}:</span>
        )}
        <span className={cn('min-w-0 break-all', TYPE_TONE[kind] ?? '')}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    )
  }

  const entries: [string, Json][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value)

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{ paddingInlineStart: `${depth * 14}px` }}
        className={cn(
          'hover:bg-accent/50 flex w-full items-center gap-1 py-0.5 text-start',
          radius.xs,
          interactive,
          focusRing,
        )}
      >
        <ChevronRight
          className={cn(
            'size-3 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-90',
          )}
          aria-hidden="true"
        />
        {name !== undefined && (
          <span className="text-foreground/80 shrink-0">{name}:</span>
        )}
        <span className="text-muted-foreground truncate">{preview(value)}</span>
      </button>

      {open &&
        entries.map(([key, child]) => (
          <JsonNode
            key={key}
            name={key}
            value={child}
            depth={depth + 1}
            defaultExpandedDepth={defaultExpandedDepth}
          />
        ))}
    </div>
  )
}

function JsonViewer({
  value,
  defaultExpandedDepth = 1,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'value'> & {
  value: Json
  /** Levels open on first render. */
  defaultExpandedDepth?: number
}) {
  return (
    <div
      data-slot="json-viewer"
      className={cn(
        'border-border bg-card overflow-auto border p-3 font-mono text-xs',
        radius.surface,
        className,
      )}
      {...props}
    >
      <JsonNode value={value} depth={0} defaultExpandedDepth={defaultExpandedDepth} />
    </div>
  )
}

export { JsonViewer }
export type { Json }
