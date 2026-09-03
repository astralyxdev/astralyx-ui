import { type ComponentProps, type ReactNode } from 'react'
import { Check, ChevronDown, TriangleAlert, Wrench } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CodeBlock } from '@/components/ui/code-block'
import { Spinner } from '@/components/ui/spinner'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * One tool invocation inside an assistant turn.
 *
 * Collapsed by default: the arguments and the result are usually long, and the
 * interesting part is that the tool ran at all. A failure opens on its own,
 * because that is the case you always want to read.
 */
type ToolCallProps = Omit<ComponentProps<'div'>, 'title'> & {
  name: string
  status?: 'running' | 'done' | 'error'
  /** Short line beside the name — the target, the query, the file. */
  summary?: ReactNode
  input?: string
  output?: string
  language?: 'json' | 'bash' | 'tsx' | 'typescript'
  defaultOpen?: boolean
  inputLabel?: string
  outputLabel?: string
}

const STATUS = {
  running: { icon: Spinner, className: 'text-[var(--blue-soft-foreground)]' },
  done: { icon: Check, className: 'text-[var(--green-soft-foreground)]' },
  error: { icon: TriangleAlert, className: 'text-[var(--destructive-soft-foreground)]' },
} as const

function ToolCall({
  className,
  name,
  status = 'done',
  summary,
  input,
  output,
  language = 'json',
  defaultOpen,
  inputLabel = 'Input',
  outputLabel = 'Output',
  ...props
}: ToolCallProps) {
  const meta = STATUS[status]
  const Icon = meta.icon

  return (
    <Collapsible
      // A failed call opens itself; the others stay out of the way.
      defaultOpen={defaultOpen ?? status === 'error'}
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      <CollapsibleTrigger showChevron={false} className="p-3">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Wrench className="text-muted-foreground size-3.5 shrink-0" />
          <span className="font-mono text-xs">{name}</span>
          {summary && (
            <span className="text-muted-foreground truncate text-xs">
              {summary}
            </span>
          )}
        </span>
        <span className={cn('flex shrink-0 items-center gap-2', meta.className)}>
          {status === 'running' ? <Spinner size="xs" /> : <Icon className="size-3.5" />}
          <ChevronDown className="text-muted-foreground size-3.5" />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 p-2">
          {input && (
            <CodeBlock title={inputLabel} language={language} code={input} maxLines={8} />
          )}
          {output && (
            <CodeBlock title={outputLabel} language={language} code={output} maxLines={12} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export { ToolCall }
