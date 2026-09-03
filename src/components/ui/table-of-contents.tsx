import { useEffect, useState, type ComponentProps } from 'react'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * An anchor list that tracks which heading is on screen.
 *
 * Scroll-spy through `IntersectionObserver`, not scroll offsets. Measuring
 * positions on every scroll event means reading layout in a handler that fires
 * dozens of times a second, and the browser already computes this.
 *
 * The `rootMargin` pulls the detection band up to the top quarter of the
 * viewport. Without it the active item is whatever is nearest the bottom, so
 * the highlight sits one or two headings ahead of what you are reading.
 *
 * Headings are found in the DOM rather than passed in, so it stays correct for
 * content rendered from markdown where the caller has no list to give.
 */
export type TocItem = {
  id: string
  label: string
  level: number
}

function useHeadings(selector: string, container?: string) {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    const root = container ? document.querySelector(container) : document
    if (!root) return

    const found = [...root.querySelectorAll<HTMLElement>(selector)]
      .filter((node) => node.id)
      .map((node) => ({
        id: node.id,
        label: node.textContent ?? '',
        level: Number(node.tagName.slice(1)) || 2,
      }))

    setItems(found)
  }, [selector, container])

  return items
}

function TableOfContents({
  items: itemsProp,
  selector = 'h2, h3',
  container,
  label = 'On this page',
  className,
  ...props
}: ComponentProps<'nav'> & {
  /** Supply headings directly, or let it read the DOM. */
  items?: TocItem[]
  selector?: string
  container?: string
  label?: string
}) {
  const found = useHeadings(selector, container)
  const items = itemsProp ?? found
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]) setActive(visible[0].target.id)
      },
      // Detection band across the top quarter of the viewport.
      { rootMargin: '0px 0px -75% 0px', threshold: 0 },
    )

    for (const item of items) {
      const node = document.getElementById(item.id)
      if (node) observer.observe(node)
    }

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  const minLevel = Math.min(...items.map((item) => item.level))

  return (
    <nav
      data-slot="table-of-contents"
      aria-label={label}
      className={cn('flex flex-col gap-1 text-sm', className)}
      {...props}
    >
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>

      <ul className="flex list-none flex-col">
        {items.map((item) => {
          const current = active === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? 'location' : undefined}
                style={{ paddingInlineStart: `${(item.level - minLevel) * 12 + 8}px` }}
                className={cn(
                  'block truncate py-1 pe-2',
                  radius.xs,
                  focusRing,
                  'transition-colors duration-150 ease-out motion-reduce:transition-none',
                  current
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { TableOfContents, useHeadings }
