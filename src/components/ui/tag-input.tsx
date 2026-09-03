import { useRef, useState, type ComponentProps, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import {
  fieldBase,
  fieldInput,
  fieldSize,
  focusRing,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Free-text chips: keywords, recipients, labels.
 *
 * Backspace on an empty field removes the last tag, which is the behaviour
 * everyone expects from every mail client. It removes rather than "selects
 * then removes" — the two-step version is more careful and nobody discovers it.
 *
 * Pasting splits on the delimiters too, so pasting a comma-separated list gives
 * a list of tags rather than one tag with commas in it.
 *
 * Each chip's remove button is a real tab stop. A chip you can only delete by
 * pointer is unremovable from the keyboard once you have tabbed past the field.
 */
function TagInput({
  value: valueProp,
  defaultValue = [],
  onValueChange,
  placeholder = 'Add and press Enter',
  delimiters = [',', 'Enter', 'Tab'],
  max,
  allowDuplicates = false,
  size = 'md',
  variant = 'default',
  error = false,
  disabled = false,
  validate,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (tags: string[]) => void
  placeholder?: string
  /** Keys and characters that commit the current text. */
  delimiters?: string[]
  max?: number
  allowDuplicates?: boolean
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  disabled?: boolean
  /** Return false to reject an entry. */
  validate?: (tag: string) => boolean
}) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState<string[]>(defaultValue)
  const tags = controlled ? valueProp : uncontrolled

  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function setTags(next: string[]) {
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
  }

  function add(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    if (max !== undefined && tags.length >= max) return
    if (!allowDuplicates && tags.includes(tag)) return
    if (validate && !validate(tag)) return
    setTags([...tags, tag])
  }

  function addMany(text: string) {
    const characters = delimiters.filter((d) => d.length === 1)
    const pattern = characters.length
      ? new RegExp(`[${characters.map((c) => `\\${c}`).join('')}\n]`)
      : /\n/
    const parts = text.split(pattern)
    let next = [...tags]
    for (const part of parts) {
      const tag = part.trim()
      if (!tag) continue
      if (max !== undefined && next.length >= max) break
      if (!allowDuplicates && next.includes(tag)) continue
      if (validate && !validate(tag)) continue
      next = [...next, tag]
    }
    setTags(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (delimiters.includes(event.key)) {
      // Tab only commits when there is something to commit, so an empty field
      // still moves focus.
      if (event.key === 'Tab' && !draft.trim()) return
      event.preventDefault()
      add(draft)
      setDraft('')
      return
    }

    if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      event.preventDefault()
      setTags(tags.slice(0, -1))
    }
  }

  const VARIANT = {
    default: 'border-border bg-background border',
    secondary: 'bg-secondary border border-transparent',
    ghost: 'border border-transparent bg-transparent',
  }[variant]

  const full = max !== undefined && tags.length >= max

  return (
    <div
      data-slot="tag-input"
      onClick={() => inputRef.current?.focus()}
      className={cn(
        fieldBase,
        fieldSize[size],
        VARIANT,
        error && 'border-destructive',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        // Grows with its content rather than scrolling one line of chips.
        'h-auto min-h-[--spacing(9)] flex-wrap gap-1.5 py-1.5',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...props}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={cn(
            'bg-secondary text-secondary-foreground inline-flex h-6 shrink-0 items-center gap-1 ps-2 pe-1 text-xs',
            radius.xs,
          )}
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              setTags(tags.filter((_, i) => i !== index))
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground flex size-4 items-center justify-center',
              radius.xs,
              focusRing,
              'transition-colors duration-150 ease-out motion-reduce:transition-none',
            )}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        type="text"
        value={draft}
        disabled={disabled || full}
        placeholder={full ? `Limit of ${max} reached` : placeholder}
        onKeyDown={onKeyDown}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim()) {
            add(draft)
            setDraft('')
          }
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text')
          if (!delimiters.some((d) => d.length === 1 && text.includes(d)) && !text.includes('\n')) {
            return
          }
          event.preventDefault()
          addMany(text)
        }}
        className={cn(fieldInput, 'min-w-24 flex-1')}
      />
    </div>
  )
}

export { TagInput }
