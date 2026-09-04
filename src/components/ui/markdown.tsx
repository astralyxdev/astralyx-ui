import { useMemo, useState, type ComponentProps, type ReactNode } from 'react'
import { Code2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/ui/code-block'
import { CopyButton } from '@/components/ui/copy-button'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Rendered markdown, with a switch to the source.
 *
 * **It builds React nodes. It never sets `innerHTML`.** Almost every small
 * markdown renderer converts to an HTML string and injects it, which turns any
 * document you did not write — a README from a registry, a model's output, a
 * comment — into script execution. Producing elements means there is no string
 * for a payload to survive in, and the one place raw HTML could appear in
 * markdown is passed through as text instead.
 *
 * **The RAW toggle is the point of the component.** Rendered markdown hides the
 * difference between a hard line break and a soft one, between `*` and `_`,
 * between a real table and an aligned one — and those are exactly what someone
 * is looking for when a document renders wrongly. Source is one click away and
 * copyable.
 *
 * The supported subset is what documents actually contain: ATX headings, bold,
 * italic, inline code, links, images, fenced and indented code, ordered and
 * unordered lists, blockquotes, horizontal rules, and tables. Setext headings,
 * reference links, footnotes and nested blockquotes are not handled — a
 * complete CommonMark implementation is a library, not a component, and this
 * one is honest about where it stops.
 */
type MarkdownProps = Omit<ComponentProps<'div'>, 'children'> & {
  children: string
  /** Start on the source rather than the preview. */
  defaultRaw?: boolean
  /** Hide the toggle entirely for a fixed, rendered-only view. */
  toggle?: boolean
  previewLabel?: string
  rawLabel?: string
  copyLabel?: string
  /** Trailing slot in the toolbar. */
  actions?: ReactNode
  /** Rendered when the source is empty. */
  emptyLabel?: string
}

/* ----------------------------------------------------------------- inline */

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(~~[^~]+~~)|(!?\[[^\]]*\]\([^)]+\))/

/**
 * Inline spans, as nodes.
 *
 * Split rather than replaced, so a link's text can never be re-parsed as
 * markup and a payload has no string to hide in.
 */
function inline(text: string, keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let key = 0

  while (rest) {
    const match = INLINE.exec(rest)
    if (!match || match.index === undefined) {
      out.push(rest)
      break
    }

    if (match.index > 0) out.push(rest.slice(0, match.index))
    const token = match[0]
    const id = `${keyPrefix}-${key++}`

    if (token.startsWith('`')) {
      out.push(
        <code key={id} className={cn('bg-muted px-1 py-0.5 font-mono text-[0.9em]', radius.xs)}>
          {token.slice(1, -1)}
        </code>,
      )
    } else if (token.startsWith('**') || token.startsWith('__')) {
      out.push(<strong key={id}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('~~')) {
      out.push(
        <s key={id} className="text-muted-foreground">
          {token.slice(2, -2)}
        </s>,
      )
    } else if (token.startsWith('![')) {
      const [, alt, src] = /!\[([^\]]*)\]\(([^)]+)\)/.exec(token) ?? []
      out.push(
        <img key={id} src={src} alt={alt ?? ''} className={cn('my-2 max-w-full', radius.control)} />,
      )
    } else if (token.startsWith('[')) {
      const [, label, href] = /\[([^\]]*)\]\(([^)]+)\)/.exec(token) ?? []
      // `javascript:` in a link is the other half of the injection this
      // component refuses; only http(s), mailto and relative URLs survive.
      const safe = href && /^(https?:|mailto:|[./#])/i.test(href) ? href : undefined
      out.push(
        safe ? (
          <a
            key={id}
            href={safe}
            className={cn('underline underline-offset-2', focusRing)}
            rel="noreferrer noopener"
            target={safe.startsWith('http') ? '_blank' : undefined}
          >
            {label}
          </a>
        ) : (
          <span key={id}>{label}</span>
        ),
      )
    } else {
      out.push(<em key={id}>{token.slice(1, -1)}</em>)
    }

    rest = rest.slice(match.index + token.length)
  }

  return out
}

/* ------------------------------------------------------------------ block */

function render(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: ReactNode[] = []
  let index = 0
  let key = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index++
      continue
    }

    // Fenced code. Taken verbatim — nothing inside is parsed.
    const fence = /^```(\w*)/.exec(line)
    if (fence) {
      const body: string[] = []
      index++
      while (index < lines.length && !/^```/.test(lines[index])) body.push(lines[index++])
      index++
      out.push(
        <CodeBlock
          key={key++}
          code={body.join('\n')}
          language={(fence[1] || 'text') as never}
          header={false}
          className="my-3"
        />,
      )
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const Tag = `h${level}` as 'h1'
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm']
      out.push(
        <Tag
          key={key++}
          className={cn('mt-5 mb-2 font-semibold tracking-tight first:mt-0', sizes[level - 1])}
        >
          {inline(heading[2], `h${key}`)}
        </Tag>,
      )
      index++
      continue
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      out.push(<hr key={key++} className="border-border my-5" />)
      index++
      continue
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index++].replace(/^>\s?/, ''))
      }
      out.push(
        <blockquote
          key={key++}
          className="border-border text-muted-foreground my-3 border-s-2 ps-4 italic"
        >
          {inline(body.join(' '), `q${key}`)}
        </blockquote>,
      )
      continue
    }

    // Tables: a header row, a delimiter row, then body rows.
    if (line.includes('|') && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(lines[index + 1] ?? '')) {
      const cells = (row: string) =>
        row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
      const head = cells(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && lines[index].includes('|')) rows.push(cells(lines[index++]))

      out.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-border border-b">
                {head.map((cell, i) => (
                  <th key={i} className="px-3 py-1.5 font-medium">
                    {inline(cell, `th${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-border/60 border-b last:border-b-0">
                  {row.map((cell, c) => (
                    <td key={c} className="text-muted-foreground px-3 py-1.5">
                      {inline(cell, `td${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const bullet = /^\s*([-*+])\s+/.test(line)
    const numbered = /^\s*\d+\.\s+/.test(line)
    if (bullet || numbered) {
      const items: string[] = []
      const matches = (row: string) =>
        bullet ? /^\s*([-*+])\s+/.test(row) : /^\s*\d+\.\s+/.test(row)

      while (index < lines.length && matches(lines[index])) {
        items.push(lines[index++].replace(/^\s*([-*+]|\d+\.)\s+/, ''))
      }

      const Tag = bullet ? 'ul' : 'ol'
      out.push(
        <Tag
          key={key++}
          className={cn('my-3 space-y-1 ps-5', bullet ? 'list-disc' : 'list-decimal')}
        >
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {inline(item, `li${i}`)}
            </li>
          ))}
        </Tag>,
      )
      continue
    }

    // Paragraph: consecutive non-blank lines that start nothing else.
    const body: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|>|```|\s*([-*+]|\d+\.)\s|(---|\*\*\*|___)\s*$)/.test(lines[index])
    ) {
      body.push(lines[index++])
    }
    out.push(
      <p key={key++} className="my-3 text-sm leading-relaxed">
        {inline(body.join(' '), `p${key}`)}
      </p>,
    )
  }

  return out
}

function Markdown({
  children,
  defaultRaw = false,
  toggle = true,
  previewLabel = 'Preview',
  rawLabel = 'Raw',
  copyLabel = 'Copy markdown',
  actions,
  emptyLabel = 'Nothing to show.',
  className,
  ...props
}: MarkdownProps) {
  const [raw, setRaw] = useState(defaultRaw)
  const nodes = useMemo(() => render(children), [children])

  return (
    <div
      data-slot="markdown"
      data-view={raw ? 'raw' : 'preview'}
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {(toggle || actions) && (
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
          {toggle && (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={raw}
              onClick={() => setRaw((current) => !current)}
            >
              {raw ? <Eye /> : <Code2 />}
              {raw ? previewLabel : rawLabel}
            </Button>
          )}
          <span className="flex-1" />
          {actions}
          <CopyButton value={children} label={copyLabel} />
        </div>
      )}

      {!children.trim() ? (
        <p className="text-muted-foreground p-4 text-xs">{emptyLabel}</p>
      ) : raw ? (
        // The source, exactly as given — the reason the toggle exists.
        <pre className="text-foreground/85 overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {children}
        </pre>
      ) : (
        <div className="p-4">{nodes}</div>
      )}
    </div>
  )
}

export { Markdown, render as renderMarkdown }
export type { MarkdownProps }
