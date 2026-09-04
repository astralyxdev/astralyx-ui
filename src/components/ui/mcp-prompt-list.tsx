import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronRight, MessageSquareText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The prompts an MCP server offers, with the arguments each one takes.
 *
 * MCP prompts are user-invoked templates — the slash-command surface of a
 * server. Unlike tools, nobody calls them by accident, so the useful thing to
 * show is not risk but **shape**: what has to be filled in before this can run.
 *
 * Required arguments are visible without expanding. A prompt that needs three
 * inputs and one that needs none are chosen differently, and hiding that behind
 * a disclosure makes the list unusable for picking.
 */
export type McpPrompt = {
  name: string
  description?: ReactNode
  /** Which server offered it. */
  server?: string
  arguments?: { name: string; description?: string; required?: boolean }[]
}

type McpPromptListProps = Omit<ComponentProps<'ul'>, 'onSelect'> & {
  prompts: McpPrompt[]
  /** Invoke — usually inserts the prompt into a composer. */
  onSelect?: (prompt: McpPrompt) => void
  selectLabel?: string
  requiredLabel?: string
  noArgumentsLabel?: string
  emptyLabel?: string
  showServer?: boolean
}

function McpPromptList({
  prompts,
  onSelect,
  selectLabel = 'Use',
  requiredLabel = 'required',
  noArgumentsLabel = 'No arguments',
  emptyLabel = 'This server offers no prompts.',
  showServer = true,
  className,
  ...props
}: McpPromptListProps) {
  const [open, setOpen] = useState<string | null>(null)

  if (prompts.length === 0) {
    return (
      <div
        className={cn(surface, radius.surface, 'p-4', className)}
        // The prop type is list-shaped; `ref` is the only member that differs,
        // and this branch never forwards one.
        {...(props as ComponentProps<'div'>)}
      >
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul
      data-slot="mcp-prompt-list"
      className={cn(surface, radius.surface, 'divide-border list-none divide-y overflow-hidden', className)}
      {...props}
    >
      {prompts.map((prompt) => {
        const args = prompt.arguments ?? []
        const required = args.filter((argument) => argument.required)
        const expanded = open === prompt.name

        return (
          <li key={prompt.name}>
            <div className="flex items-start gap-3 px-4 py-3">
              {args.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Hide' : 'Show'} arguments for ${prompt.name}`}
                  onClick={() => setOpen(expanded ? null : prompt.name)}
                  className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                >
                  <ChevronRight
                    className={cn(
                      'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
                      expanded && 'rotate-90',
                    )}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <MessageSquareText
                  className="text-muted-foreground/50 mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-sm">{prompt.name}</code>
                  {showServer && prompt.server && (
                    <Badge size="sm" variant="outline">
                      {prompt.server}
                    </Badge>
                  )}
                </div>

                {prompt.description && (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {prompt.description}
                  </p>
                )}

                {/* Visible without expanding: how much has to be filled in is
                    what decides whether you pick this prompt at all. */}
                <p className="text-muted-foreground/60 mt-1 text-[11px]">
                  {args.length === 0
                    ? noArgumentsLabel
                    : `${args.length} argument${args.length === 1 ? '' : 's'}${
                        required.length ? ` · ${required.length} ${requiredLabel}` : ''
                      }`}
                </p>
              </div>

              {onSelect && (
                <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onSelect(prompt)}>
                  {selectLabel}
                </Button>
              )}
            </div>

            {expanded && args.length > 0 && (
              <ul className="bg-muted/40 border-border list-none border-t px-4 py-2.5">
                {args.map((argument) => (
                  <li key={argument.name} className="flex items-baseline gap-2 py-1">
                    <code className="font-mono text-xs">{argument.name}</code>
                    {argument.required ? (
                      <Badge size="sm" color="destructive" variant="ghost">
                        {requiredLabel}
                      </Badge>
                    ) : null}
                    {argument.description && (
                      <span className="text-muted-foreground text-xs">{argument.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export { McpPromptList }
export type { McpPromptListProps }
