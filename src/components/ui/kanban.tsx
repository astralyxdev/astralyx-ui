import { useState, type ComponentProps, type DragEvent, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Columns of cards, movable between them.
 *
 * Uses the HTML drag-and-drop API rather than pointer maths. It is the API that
 * gives a native drag image and works with the OS conventions, and reaching for
 * a pointer-based library is how a board ends up unusable on touch.
 *
 * Because drag-and-drop is pointer-only, every card also carries a keyboard
 * path: focus it and use the arrow keys to move it between columns. A board
 * where the only way to move work is dragging excludes anyone using a keyboard,
 * and that is the majority of the actions on a board people use daily.
 *
 * The board never reorders anything itself — `onMove` reports the intent and
 * the caller owns the data. Optimistically moving a card and then having the
 * server reject it is worse than a moment of latency.
 */
export type KanbanCard = {
  id: string
  title: ReactNode
  meta?: ReactNode
  accent?: string
}

export type KanbanColumn = {
  id: string
  title: string
  cards: KanbanCard[]
  limit?: number
}

function Kanban({
  columns,
  onMove,
  renderCard,
  emptyLabel = 'Nothing here',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onDrop'> & {
  columns: KanbanColumn[]
  onMove?: (cardId: string, fromColumn: string, toColumn: string) => void
  renderCard?: (card: KanbanCard, column: KanbanColumn) => ReactNode
  /** Shown in an empty column. */
  emptyLabel?: ReactNode
}) {
  const [dragging, setDragging] = useState<{ id: string; from: string } | null>(null)
  const [over, setOver] = useState<string | null>(null)

  function move(cardId: string, from: string, to: string) {
    if (from === to) return
    onMove?.(cardId, from, to)
  }

  function onDrop(event: DragEvent<HTMLElement>, columnId: string) {
    event.preventDefault()
    setOver(null)
    const id = event.dataTransfer.getData('text/plain') || dragging?.id
    const from = dragging?.from
    if (id && from) move(id, from, columnId)
    setDragging(null)
  }

  return (
    <div
      data-slot="kanban"
      className={cn('flex gap-3 overflow-x-auto pb-2', className)}
      {...props}
    >
      {columns.map((column, columnIndex) => {
        const full = column.limit !== undefined && column.cards.length >= column.limit

        return (
          <section
            key={column.id}
            aria-label={column.title}
            onDragOver={(event) => {
              event.preventDefault()
              setOver(column.id)
            }}
            onDragLeave={() => setOver((current) => (current === column.id ? null : current))}
            onDrop={(event) => onDrop(event, column.id)}
            className={cn(
              'bg-secondary flex w-72 shrink-0 flex-col gap-2 p-2',
              radius.surface,
              over === column.id && 'ring-primary/40 ring-2',
            )}
          >
            <header className="flex items-center gap-2 px-1">
              <h3 className="min-w-0 flex-1 truncate text-xs font-medium tracking-wide uppercase">
                {column.title}
              </h3>
              <Badge size="sm" color={full ? 'amber' : 'neutral'}>
                {column.cards.length}
                {column.limit !== undefined && ` / ${column.limit}`}
              </Badge>
            </header>

            <ul className="flex list-none flex-col gap-2">
              {column.cards.map((card) => (
                <li key={card.id}>
                  <div
                    draggable
                    tabIndex={0}
                    role="button"
                    aria-label={`${typeof card.title === 'string' ? card.title : 'Card'} in ${column.title}. Use the arrow keys to move between columns.`}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', card.id)
                      event.dataTransfer.effectAllowed = 'move'
                      setDragging({ id: card.id, from: column.id })
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                    // The keyboard path: dragging is pointer-only, so arrows
                    // move a focused card between columns.
                    onKeyDown={(event) => {
                      const direction =
                        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
                      if (!direction) return
                      const target = columns[columnIndex + direction]
                      if (!target) return
                      event.preventDefault()
                      move(card.id, column.id, target.id)
                    }}
                    className={cn(
                      'bg-card border-border relative cursor-grab border p-3 active:cursor-grabbing',
                      radius.control,
                      focusRing,
                      'transition-colors duration-150 ease-out motion-reduce:transition-none',
                      'hover:border-foreground/25',
                      dragging?.id === card.id && 'opacity-50',
                    )}
                  >
                    {card.accent && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 start-0 w-1 rounded-s-[inherit]"
                        style={{ backgroundColor: card.accent }}
                      />
                    )}

                    {renderCard?.(card, column) ?? (
                      <>
                        <p className="text-sm font-medium text-pretty">{card.title}</p>
                        {card.meta && (
                          <div className="text-muted-foreground mt-2 text-xs">
                            {card.meta}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}

              {column.cards.length === 0 && (
                <li className="text-muted-foreground/60 px-1 py-6 text-center text-xs">
                  {emptyLabel}
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export { Kanban }
