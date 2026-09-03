import { useEffect, useMemo, useRef, type ComponentProps } from 'react'
import { CopyButton } from '@/components/ui/copy-button'
import { radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Console output with ANSI colour, for build and deploy logs.
 *
 * The parser handles SGR sequences only — colour, bold, dim, reset. Cursor
 * movement and screen clearing are dropped rather than half-implemented:
 * honouring them means maintaining a screen buffer, and a log pane is an
 * append-only transcript, not a terminal emulator.
 *
 * The surface follows the theme rather than being a fixed black panel: a
 * white-on-black block in the middle of a light page reads as a screenshot
 * pasted into the document. The ANSI palette maps onto theme tokens, so the
 * same output stays legible either way.
 *
 * Follow-tail sticks to the bottom only while the reader is already there.
 * Scrolling up to read something and being yanked back down by the next line
 * is the single worst thing a log viewer can do.
 */

// Built at runtime rather than written as a literal escape, so the source file
// stays free of control characters — they survive copy/paste badly and are
// invisible in review.
const ESC = String.fromCharCode(27)
const ANSI_PATTERN = new RegExp(ESC + '\\[([0-9;]*)m', 'g')

const FG = {
  30: 'text-[oklch(0.4_0_0)]',
  31: 'text-[var(--destructive-soft-foreground)]',
  32: 'text-[var(--green-soft-foreground)]',
  33: 'text-[var(--amber-soft-foreground)]',
  34: 'text-[var(--blue-soft-foreground)]',
  35: 'text-[var(--violet-soft-foreground)]',
  36: 'text-[var(--cyan-soft-foreground)]',
  37: 'text-foreground',
  90: 'text-muted-foreground',
  91: 'text-[var(--destructive-soft-foreground)]',
  92: 'text-[var(--green-soft-foreground)]',
  93: 'text-[var(--amber-soft-foreground)]',
  94: 'text-[var(--blue-soft-foreground)]',
  95: 'text-[var(--violet-soft-foreground)]',
  96: 'text-[var(--cyan-soft-foreground)]',
  97: 'text-foreground',
} as const

type Span = { text: string; className: string }

/** Split one line into styled spans at its SGR escapes. */
function parseAnsi(line: string): Span[] {
  const spans: Span[] = []
  let index = 0
  let colour = ''
  let bold = false
  let dim = false

  ANSI_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  const push = (text: string) => {
    if (!text) return
    spans.push({
      text,
      className: cn(colour, bold && 'font-semibold', dim && 'opacity-60'),
    })
  }

  while ((match = ANSI_PATTERN.exec(line))) {
    push(line.slice(index, match.index))
    index = match.index + match[0].length

    for (const part of (match[1] || '0').split(';')) {
      const code = Number(part)
      if (code === 0) {
        colour = ''
        bold = false
        dim = false
      } else if (code === 1) bold = true
      else if (code === 2) dim = true
      else if (code === 22) {
        bold = false
        dim = false
      } else if (code in FG) colour = FG[code as keyof typeof FG]
    }
  }
  push(line.slice(index))
  return spans
}

function Terminal({
  content,
  lines,
  follow = false,
  showLineNumbers = false,
  copyable = true,
  title,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'content' | 'title'> & {
  /** Raw output, split on newlines. Use `lines` when you already have them. */
  content?: string
  lines?: string[]
  /** Stick to the bottom as content grows — but only if already at the bottom. */
  follow?: boolean
  showLineNumbers?: boolean
  copyable?: boolean
  title?: string
}) {
  const rows = useMemo(
    () => lines ?? (content ?? '').replace(/\n$/, '').split('\n'),
    [content, lines],
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  useEffect(() => {
    if (!follow) return
    const node = scrollRef.current
    if (node && pinned.current) node.scrollTop = node.scrollHeight
  }, [rows, follow])

  return (
    <div
      data-slot="terminal"
      className={cn('border-border overflow-hidden border', radius.surface, className)}
      {...props}
    >
      {(title || copyable) && (
        <div className="border-border bg-muted/40 flex h-9 items-center gap-2 border-b px-3">
          <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
            {title}
          </span>
          {copyable && (
            <CopyButton value={() => rows.join('\n')} label="Copy output" />
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const node = event.currentTarget
          // A little slack, so "close enough to the bottom" still counts.
          pinned.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 24
        }}
        className="bg-card max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed"
      >
        {rows.map((line, index) => (
          <div key={index} className="flex min-w-max gap-3">
            {showLineNumbers && (
              <span
                aria-hidden="true"
                className="text-muted-foreground/50 min-w-8 shrink-0 text-end tabular-nums select-none"
              >
                {index + 1}
              </span>
            )}
            <span className="text-foreground/85 whitespace-pre">
              {parseAnsi(line).map((span, spanIndex) => (
                <span key={spanIndex} className={span.className || undefined}>
                  {span.text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { Terminal, parseAnsi }
