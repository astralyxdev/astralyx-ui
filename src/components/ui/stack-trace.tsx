import { useState, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A parsed exception with its frames.
 *
 * Vendor frames are collapsed behind a count by default. A stack is typically
 * three frames of your code buried in forty of the framework's, and every
 * debugger that gets this right hides the noise until asked.
 *
 * Frames carry a source excerpt when one is available, with the failing line
 * marked — the line number alone means opening an editor to learn anything.
 */
export type StackFrame = {
  fn: string
  file: string
  line?: number
  column?: number
  /** False marks a library frame, which is collapsed by default. */
  app?: boolean
  source?: { line: number; content: string }[]
}

function StackTrace({
  name,
  message,
  frames,
  raw,
  vendorLabel = 'vendor',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  name: string
  message: string
  frames: StackFrame[]
  /** The original text, for the copy button. */
  raw?: string
  /** Badge on a frame outside application code. */
  vendorLabel?: ReactNode
}) {
  const [showVendor, setShowVendor] = useState(false)
  const [expanded, setExpanded] = useState<number[]>(() =>
    // The first app frame opens with its source: it is where you look first.
    frames.findIndex((frame) => frame.app) === -1
      ? []
      : [frames.findIndex((frame) => frame.app)],
  )

  const vendorCount = frames.filter((frame) => !frame.app).length
  const visible = showVendor ? frames : frames.filter((frame) => frame.app)

  return (
    <div
      data-slot="stack-trace"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      <div className="border-border bg-[color-mix(in_oklab,var(--destructive),transparent_94%)] flex items-start gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-[var(--destructive-soft-foreground)]">
            {name}
          </p>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs break-words">
            {message}
          </p>
        </div>
        <CopyButton value={raw ?? `${name}: ${message}`} label="Copy stack trace" />
      </div>

      <ul className="list-none divide-y divide-[var(--border)]">
        {visible.map((frame) => {
          const index = frames.indexOf(frame)
          const open = expanded.includes(index)

          return (
            <li key={index}>
              <button
                type="button"
                aria-expanded={frame.source ? open : undefined}
                disabled={!frame.source}
                onClick={() =>
                  setExpanded((current) =>
                    open ? current.filter((i) => i !== index) : [...current, index],
                  )
                }
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-start',
                  frame.source && 'hover:bg-accent/40',
                  interactive,
                  focusRing,
                )}
              >
                {frame.source ? (
                  open ? (
                    <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
                  )
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs font-medium">
                    {frame.fn}
                  </span>
                  <span className="text-muted-foreground block truncate font-mono text-xs">
                    {frame.file}
                    {frame.line !== undefined && `:${frame.line}`}
                    {frame.column !== undefined && `:${frame.column}`}
                  </span>
                </span>

                {!frame.app && <Badge size="sm">{vendorLabel}</Badge>}
              </button>

              {open && frame.source && (
                <div className="bg-muted/30 border-border/60 overflow-x-auto border-t py-1 font-mono text-xs">
                  {frame.source.map((row) => (
                    <div
                      key={row.line}
                      className={cn(
                        'flex min-w-max',
                        row.line === frame.line &&
                          'bg-[color-mix(in_oklab,var(--destructive),transparent_88%)]',
                      )}
                    >
                      <span className="text-muted-foreground/50 w-12 shrink-0 px-2 text-end select-none">
                        {row.line}
                      </span>
                      <code className="flex-1 pe-3 whitespace-pre">{row.content}</code>
                    </div>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {vendorCount > 0 && (
        <button
          type="button"
          onClick={() => setShowVendor((current) => !current)}
          className={cn(
            'border-border text-muted-foreground hover:text-foreground w-full border-t py-2 text-xs',
            interactive,
            focusRing,
          )}
        >
          {showVendor
            ? `Hide ${vendorCount} library frames`
            : `Show ${vendorCount} library frames`}
        </button>
      )}
    </div>
  )
}

export { StackTrace }
