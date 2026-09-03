import {
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { menuItem, menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A textarea with @-mention autocomplete.
 *
 * The trigger only fires at a word boundary — after a space or at the start of
 * the text. Without that, an email address opens the menu halfway through
 * every address anyone types.
 *
 * The query ends at whitespace, so the menu closes on its own once someone
 * types past a name rather than staying open with no matches.
 *
 * Positioning is deliberately anchored to the field, not to the caret.
 * Caret coordinates in a textarea require rendering a mirror element and
 * measuring it, which is a lot of machinery and breaks on wrap; a menu under
 * the field is understood immediately.
 */
export type Mentionable = {
  id: string
  label: string
  description?: string
  avatar?: ReactNode
}

function MentionInput({
  options,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onMention,
  trigger = '@',
  listLabel = 'People',
  className,
  ...props
}: Omit<ComponentProps<'textarea'>, 'value' | 'defaultValue' | 'onChange'> & {
  options: Mentionable[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onMention?: (option: Mentionable) => void
  trigger?: string
  /** Accessible name for the suggestion list. */
  listLabel?: string
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled

  const [query, setQuery] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  const matches =
    query === null
      ? []
      : options
          .filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6)

  const open = query !== null && matches.length > 0

  function update(next: string, caret: number) {
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)

    const before = next.slice(0, caret)
    const at = before.lastIndexOf(trigger)

    // Only a trigger at a word boundary counts, and the query ends at the
    // first space after it.
    const boundary = at === 0 || /\s/.test(before[at - 1] ?? '')
    const fragment = before.slice(at + trigger.length)

    setQuery(at !== -1 && boundary && !/\s/.test(fragment) ? fragment : null)
    setHighlighted(0)
  }

  function insert(option: Mentionable) {
    const node = ref.current
    if (!node) return

    const caret = node.selectionStart
    const before = value.slice(0, caret)
    const at = before.lastIndexOf(trigger)
    const next = `${value.slice(0, at)}${trigger}${option.label} ${value.slice(caret)}`

    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
    onMention?.(option)
    setQuery(null)

    requestAnimationFrame(() => {
      const position = at + option.label.length + trigger.length + 1
      node.focus()
      node.setSelectionRange(position, position)
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((index) => (index + 1) % matches.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((index) => (index - 1 + matches.length) % matches.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      insert(matches[highlighted])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setQuery(null)
    }
  }

  return (
    <div data-slot="mention-input" className={cn('relative', className)}>
      <Textarea
        ref={ref}
        value={value}
        autoResize
        rows={3}
        aria-expanded={open}
        aria-autocomplete="list"
        onKeyDown={onKeyDown}
        onChange={(event) => update(event.target.value, event.target.selectionStart)}
        onBlur={() => setQuery(null)}
        {...props}
      />

      {open && (
        <div
          className={cn(
            menuSurface,
            radius.surface,
            'absolute inset-x-0 top-full z-50 mt-1 max-h-56',
          )}
        >
          <ul role="listbox" aria-label={listLabel} className="list-none">
            {matches.map((option, index) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlighted}
                  data-highlighted={index === highlighted || undefined}
                  onPointerEnter={() => setHighlighted(index)}
                  // Pointer down, not click: blur would close the menu first.
                  onPointerDown={(event) => {
                    event.preventDefault()
                    insert(option)
                  }}
                  className={cn(menuItem, radius.control, 'text-start')}
                >
                  {option.avatar ?? <Avatar size="xs" name={option.label} />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { MentionInput }
