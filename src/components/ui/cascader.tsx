import { useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import { fieldBase, fieldSize, menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A hierarchy picked one level at a time, in side-by-side columns.
 *
 * **Columns, not a nested tree.** For a hierarchy that is genuinely a
 * classification — country → region → city, category → subcategory → type —
 * columns show you where you are and what the siblings were, which a tree of
 * disclosure triangles hides as soon as it scrolls. Each column is one decision,
 * so the path is readable back out of the control.
 *
 * **Use `Tree` instead when the shape is uneven**, when a user needs several
 * branches open at once, or when depth varies wildly. This is for regular
 * hierarchies of two to four levels.
 *
 * `changeOnSelect` is the difference between "pick a city" and "pick anywhere,
 * at any level" — with it on, choosing a region is a valid answer and does not
 * force a descent to a leaf.
 */
export type CascaderOption = {
  value: string
  label: ReactNode
  children?: CascaderOption[]
  disabled?: boolean
}

type CascaderProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  options: CascaderOption[]
  /** The path from the root, e.g. `['eu', 'de', 'berlin']`. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (path: string[], options: CascaderOption[]) => void
  placeholder?: string
  /** Allow a non-leaf to be the answer. */
  changeOnSelect?: boolean
  /** Joins the path for display. */
  separator?: string
  size?: 'sm' | 'md' | 'lg'
  /** Open a level by hovering it as well as clicking. */
  expandOnHover?: boolean
  disabled?: boolean
  invalid?: boolean
  label?: string
  emptyLabel?: string
}

/** Walk a path, collecting the option at each level. */
function resolve(options: CascaderOption[], path: string[]): CascaderOption[] {
  const out: CascaderOption[] = []
  let level = options
  for (const step of path) {
    const found = level.find((option) => option.value === step)
    if (!found) break
    out.push(found)
    level = found.children ?? []
  }
  return out
}

function Cascader({
  options,
  value,
  defaultValue = [],
  onChange,
  placeholder = 'Select…',
  changeOnSelect = false,
  separator = ' / ',
  size = 'md',
  expandOnHover = true,
  disabled,
  invalid,
  label,
  emptyLabel = 'Nothing here.',
  className,
  ...props
}: CascaderProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState<string[]>(defaultValue)
  /** What is being browsed, which is not the same as what is chosen. */
  const [active, setActive] = useState<string[]>(defaultValue)

  const selected = value ?? internal
  const chain = useMemo(() => resolve(options, selected), [options, selected])

  const floatingRef = useRef<HTMLDivElement>(null)
  const { style } = usePopper({ open, anchorRef, floatingRef, side: 'bottom', align: 'start' })
  useDismissable({ open, onDismiss: () => setOpen(false), refs: [anchorRef, floatingRef] })

  /** One column per level of the browsing path, plus the root. */
  const columns = useMemo(() => {
    const out: CascaderOption[][] = [options]
    let level = options
    for (const step of active) {
      const found = level.find((option) => option.value === step)
      if (!found?.children?.length) break
      out.push(found.children)
      level = found.children
    }
    return out
  }, [options, active])

  const commit = (path: string[]) => {
    if (value === undefined) setInternal(path)
    onChange?.(path, resolve(options, path))
  }

  const pick = (depth: number, option: CascaderOption) => {
    const path = [...active.slice(0, depth), option.value]
    setActive(path)

    const leaf = !option.children || option.children.length === 0
    if (leaf || changeOnSelect) commit(path)
    if (leaf) setOpen(false)
  }

  const display = chain.length > 0 ? chain.map((option) => option.label) : null

  return (
    <div data-slot="cascader" className={cn('relative inline-block', className)} {...props}>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          fieldBase,
          fieldSize[size],
          'flex w-full items-center justify-between gap-2 text-start',
          invalid && 'border-[var(--destructive)]',
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !display && 'text-muted-foreground')}>
          {display
            ? display.map((part, index) => (
                <span key={index}>
                  {index > 0 && <span className="text-muted-foreground">{separator}</span>}
                  {part}
                </span>
              ))
            : placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
      </button>

      {open && (
        <div
          ref={floatingRef}
          style={style}
          className={cn(menuSurface, radius.surface, 'flex max-h-72 overflow-hidden p-0')}
        >
          {columns.map((column, depth) => (
            <ul
              key={depth}
              role="listbox"
              className={cn(
                'border-border max-h-72 min-w-40 list-none overflow-y-auto p-1',
                depth > 0 && 'border-s',
              )}
            >
              {column.length === 0 ? (
                <li className="text-muted-foreground p-2 text-xs">{emptyLabel}</li>
              ) : (
                column.map((option) => {
                  const onPath = active[depth] === option.value
                  const chosen = selected[depth] === option.value
                  const hasChildren = Boolean(option.children?.length)

                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={chosen}
                        disabled={option.disabled}
                        onClick={() => pick(depth, option)}
                        onMouseEnter={() => {
                          // Browsing, not choosing: hovering opens the next
                          // column without committing anything.
                          if (expandOnHover && hasChildren) {
                            setActive([...active.slice(0, depth), option.value])
                          }
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-2 py-1.5 text-start text-sm',
                          radius.xs,
                          'hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
                          onPath && 'bg-muted',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        {chosen && !hasChildren && (
                          <Check aria-hidden="true" className="size-3.5 shrink-0" />
                        )}
                        {hasChildren && (
                          <ChevronRight
                            aria-hidden="true"
                            className="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
                          />
                        )}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          ))}
        </div>
      )}
    </div>
  )
}

export { Cascader }
export type { CascaderProps }
