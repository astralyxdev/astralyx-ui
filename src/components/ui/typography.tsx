import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Prose styling for content you did not author element by element — rendered
 * markdown, a CMS body, a changelog.
 *
 * Descendant selectors rather than styled components, because the content
 * arrives as plain HTML from a markdown renderer and there is nothing to swap.
 *
 * Vertical rhythm is set with `space-y`-style adjacent-sibling margins rather
 * than a margin on every element. A margin on each one collapses differently
 * depending on what precedes it, which is why prose blocks tend to have too
 * much space after headings and too little between list items.
 *
 * Headings deliberately start at `h2`. A prose block is page *content*, and the
 * page already has its `h1` — a body that ships its own would give the document
 * two, which is the most common heading-order failure there is.
 */
const PROSE = [
  'text-sm leading-relaxed text-foreground',

  // Rhythm: gaps between siblings, nothing leading or trailing.
  '[&>*+*]:mt-4',
  '[&>h2+*]:mt-2 [&>h3+*]:mt-2 [&>h4+*]:mt-1.5',
  '[&>*+h2]:mt-8 [&>*+h3]:mt-6 [&>*+h4]:mt-5',

  '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight',
  '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight',
  '[&_h4]:text-sm [&_h4]:font-semibold',

  '[&_p]:text-muted-foreground [&_p]:text-pretty',
  '[&_strong]:text-foreground [&_strong]:font-semibold',
  '[&_em]:italic',

  '[&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-border hover:[&_a]:decoration-current',

  '[&_ul]:ms-5 [&_ul]:list-disc [&_ol]:ms-5 [&_ol]:list-decimal',
  '[&_li]:text-muted-foreground [&_li+li]:mt-1',
  '[&_li>ul]:mt-1 [&_li>ol]:mt-1',

  '[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:border-s-2 [&_blockquote]:ps-4 [&_blockquote]:italic',

  '[&_code]:bg-muted [&_code]:rounded-sm [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
  // Literal, not built from `radius.control`: a class assembled by
  // concatenation is invisible to Tailwind's scanner and generates nothing.
  '[&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',

  '[&_hr]:border-border [&_hr]:my-6',
  '[&_img]:rounded-lg',

  '[&_table]:w-full [&_table]:text-sm',
  '[&_th]:border-border [&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:font-medium',
  '[&_td]:border-border/60 [&_td]:border-b [&_td]:px-3 [&_td]:py-2',
].join(' ')

function Typography({
  className,
  size = 'default',
  ...props
}: ComponentProps<'div'> & { size?: 'sm' | 'default' | 'lg' }) {
  return (
    <div
      data-slot="typography"
      className={cn(
        PROSE,
        size === 'sm' && 'text-xs',
        size === 'lg' && 'text-base',
        className,
      )}
      {...props}
    />
  )
}

export { Typography, PROSE }
