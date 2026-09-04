import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Bold, Code2, Heading2, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/ui/markdown'
import { fieldBase, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A markdown editor: a real textarea, a toolbar that edits the selection, and
 * the `Markdown` renderer as its preview.
 *
 * **The input is a plain `<textarea>`.** Rich contenteditable editors have to
 * reimplement undo, IME composition, spellcheck, autocorrect, mobile keyboards
 * and every accessibility affordance a textarea gets from the platform — and
 * they get the undo stack wrong first. Here the toolbar goes through
 * `setRangeText`, which means **the browser's own undo history stays intact**:
 * ctrl-Z after clicking Bold does what you expect, which is not true of an
 * editor that rewrites `value` from React state.
 *
 * **Preview is the same component that renders the document elsewhere.** An
 * editor whose preview is a different renderer teaches you a formatting model
 * your readers will not see, so what you check in the split view is exactly
 * what `Markdown` produces — including where it stops.
 *
 * Wrapping is selection-aware in the way people expect: with text selected the
 * markers go around it, with nothing selected they are inserted and the caret
 * lands **between** them, and applying the same marker to an already-wrapped
 * selection unwraps it.
 */
type Mode = 'write' | 'preview' | 'split'

type MarkdownEditorProps = Omit<ComponentProps<'div'>, 'onChange' | 'defaultValue'> & {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  /** Rows for the textarea. The preview matches its height in split mode. */
  rows?: number
  defaultMode?: Mode
  /** Drop 'split' on narrow screens by passing your own list. */
  modes?: Mode[]
  toolbar?: boolean
  /** Trailing slot in the toolbar — a save button, a character count. */
  actions?: ReactNode
  label?: string
  disabled?: boolean
}

type Action = {
  id: string
  label: string
  icon: ReactNode
  /** Inline markers, or a line prefix for block actions. */
  wrap?: [string, string]
  prefix?: string
}

const ACTIONS: Action[] = [
  { id: 'bold', label: 'Bold', icon: <Bold />, wrap: ['**', '**'] },
  { id: 'italic', label: 'Italic', icon: <Italic />, wrap: ['*', '*'] },
  { id: 'code', label: 'Code', icon: <Code2 />, wrap: ['`', '`'] },
  { id: 'link', label: 'Link', icon: <Link2 />, wrap: ['[', '](https://)'] },
  { id: 'heading', label: 'Heading', icon: <Heading2 />, prefix: '## ' },
  { id: 'quote', label: 'Quote', icon: <Quote />, prefix: '> ' },
  { id: 'bullet', label: 'Bulleted list', icon: <List />, prefix: '- ' },
  { id: 'numbered', label: 'Numbered list', icon: <ListOrdered />, prefix: '1. ' },
]

function MarkdownEditor({
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Write markdown…',
  rows = 12,
  defaultMode = 'write',
  modes = ['write', 'preview', 'split'],
  toolbar = true,
  actions,
  label = 'Markdown editor',
  disabled,
  className,
  ...props
}: MarkdownEditorProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const id = useId()
  const [internal, setInternal] = useState(defaultValue)
  const [mode, setMode] = useState<Mode>(defaultMode)

  const text = value ?? internal

  const commit = (next: string) => {
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  /**
   * Apply an action through `setRangeText`, then read the value back off the
   * element. Writing the new string ourselves would work, but going through the
   * element is what keeps the native undo stack — and the `input` event — real.
   */
  function apply(action: Action) {
    const area = areaRef.current
    if (!area || disabled) return

    const start = area.selectionStart
    const end = area.selectionEnd
    const selected = area.value.slice(start, end)

    area.focus()

    if (action.prefix) {
      // Block actions work on whole lines, including every line of a selection.
      const lineStart = area.value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = area.value.indexOf('\n', end)
      const stop = lineEnd === -1 ? area.value.length : lineEnd
      const block = area.value.slice(lineStart, stop)
      const on = block.split('\n').every((line) => line.startsWith(action.prefix as string))

      const next = block
        .split('\n')
        .map((line) =>
          on ? line.slice((action.prefix as string).length) : `${action.prefix}${line}`,
        )
        .join('\n')

      area.setSelectionRange(lineStart, stop)
      area.setRangeText(next, lineStart, stop, 'select')
      commit(area.value)
      return
    }

    const [open, close] = action.wrap as [string, string]
    const before = area.value.slice(start - open.length, start)
    const after = area.value.slice(end, end + close.length)

    if (before === open && after === close) {
      // Already wrapped — toggle it off, markers included.
      area.setRangeText(selected, start - open.length, end + close.length, 'select')
    } else {
      area.setRangeText(`${open}${selected}${close}`, start, end, 'select')
      if (!selected) {
        // Nothing was selected, so leave the caret between the markers rather
        // than after them.
        const caret = start + open.length
        area.setSelectionRange(caret, caret)
      }
    }
    commit(area.value)
  }

  const showWrite = mode === 'write' || mode === 'split'
  const showPreview = mode === 'preview' || mode === 'split'

  return (
    <div
      data-slot="markdown-editor"
      data-mode={mode}
      className={cn(surface, radius.surface, 'overflow-hidden', className)}
      {...props}
    >
      {(toolbar || modes.length > 1) && (
        <div className="border-border bg-muted/40 flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
          {toolbar &&
            ACTIONS.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={action.label}
                title={action.label}
                disabled={disabled || mode === 'preview'}
                // The textarea must not lose its selection to the button.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => apply(action)}
              >
                {action.icon}
              </Button>
            ))}

          <span className="flex-1" />
          {actions}

          {modes.length > 1 && (
            <div role="tablist" aria-label="View" className="flex items-center gap-1">
              {modes.map((option) => (
                <Button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={mode === option}
                  variant={mode === option ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setMode(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={cn('grid', mode === 'split' && 'md:grid-cols-2')}>
        {showWrite && (
          <textarea
            ref={areaRef}
            id={id}
            aria-label={label}
            rows={rows}
            value={text}
            disabled={disabled}
            placeholder={placeholder}
            spellCheck
            onChange={(event) => commit(event.target.value)}
            onKeyDown={(event) => {
              // The shortcuts people try first. Tab is left alone on purpose:
              // trapping it breaks keyboard navigation out of the field.
              const meta = event.metaKey || event.ctrlKey
              if (!meta) return
              const key = event.key.toLowerCase()
              const match = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : null
              if (!match) return
              event.preventDefault()
              apply(ACTIONS.find((action) => action.id === match) as Action)
            }}
            className={cn(
              fieldBase,
              'min-h-40 resize-y rounded-none border-0 font-mono text-sm leading-relaxed',
              'focus-visible:ring-0 focus-visible:outline-none',
              mode === 'split' && 'md:border-border md:border-e',
            )}
          />
        )}

        {showPreview && (
          <div className="min-w-0 overflow-x-auto">
            <Markdown
              toggle={false}
              className="rounded-none border-0 bg-transparent"
              emptyLabel="Nothing to preview yet."
            >
              {text}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

export { MarkdownEditor }
export type { MarkdownEditorProps }
