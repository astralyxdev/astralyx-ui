import type { ReactNode } from 'react'
import generated from '@/registry/props.generated.json'

/**
 * What the source says about itself.
 *
 * Every component file opens with a JSDoc block explaining why the component
 * exists, what it refuses to do and which bug shaped it. It is the best writing
 * about that component anywhere in the repo, and until now the only way to read
 * it was to open the file.
 *
 * Putting it on the page is not decoration. 343 pages built from one template,
 * whose only distinct content is a sentence and a props table, read as
 * near-duplicates — to a person skimming and to a search engine deciding
 * whether the page is worth keeping. This is the part that differs.
 */

type Files = Record<string, { prose?: string[] }>

export function proseFor(id: string) {
  return (generated.files as Files)[id]?.prose
}

/** Backticks to `<code>`, which is the only markup these comments use. */
function format(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code
        key={index}
        className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em] whitespace-nowrap"
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  )
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="max-w-2xl space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {format(paragraph)}
        </p>
      ))}
    </div>
  )
}
