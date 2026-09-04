import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
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
  /** Starting rows. Also the minimum height when `autoResize` is on. */
  rows?: number
  /**
   * Grow the textarea with its content, up to `maxRows`.
   *
   * A fixed-height box that scrolls internally is the wrong shape for writing:
   * you lose the paragraph above as soon as you pass the fold, and the page's
   * own scrollbar stops representing the document.
   */
  autoResize?: boolean
  /** Ceiling for `autoResize`. Past this the pane scrolls. */
  maxRows?: number
  /**
   * Keep the two panes aligned while scrolling in split mode.
   *
   * Proportional, not line-mapped: mapping source lines to rendered blocks
   * needs a source map out of the renderer, and a heading plus a code fence
   * occupy wildly different heights, so an honest proportional sync beats a
   * precise-looking one that drifts.
   */
  syncScroll?: boolean
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
  autoResize = true,
  maxRows = 30,
  syncScroll = true,
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
  const previewRef = useRef<HTMLDivElement>(null)
  /** Which pane the pointer is driving, so the sync cannot feed back on itself. */
  const scrolling = useRef<'write' | 'preview' | null>(null)
  const id = useId()
  const [internal, setInternal] = useState(defaultValue)
  const [mode, setMode] = useState<Mode>(defaultMode)

  const text = value ?? internal

  /**
   * Height follows content, measured rather than estimated.
   *
   * `scrollHeight` has to be read with the height reset, or it only ever
   * reports the current (larger) box and the field can grow but never shrink.
   */
  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return

    /*
     * Growing and split view want opposite things, so they do not both apply.
     *
     * Writing wants the field to grow: a box that scrolls internally loses the
     * paragraph above as soon as you pass the fold. Comparing wants two panes
     * of equal height that scroll together — a pane that grows to fit can never
     * scroll, so there is nothing to sync. Growth is therefore a `write`-mode
     * behaviour, and split falls back to the intrinsic `rows` height with both
     * sides scrolling.
     */
    if (!autoResize || mode !== 'write') {
      area.style.height = ''
      area.style.overflowY = ''
      return
    }

    const styles = getComputedStyle(area)
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20
    const padding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)

    area.style.height = 'auto'
    const ceiling = lineHeight * maxRows + padding
    const wanted = Math.min(area.scrollHeight, ceiling)
    area.style.height = `${Math.max(wanted, lineHeight * rows + padding)}px`
    // Only scrolls once it has hit the ceiling.
    area.style.overflowY = area.scrollHeight > ceiling ? 'auto' : 'hidden'
  }, [text, autoResize, maxRows, rows, mode])

  /** Proportional scroll sync, one direction at a time. */
  const sync = useCallback(
    (from: 'write' | 'preview') => {
      if (!syncScroll || mode !== 'split') return
      if (scrolling.current && scrolling.current !== from) return

      const source = from === 'write' ? areaRef.current : previewRef.current
      const target = from === 'write' ? previewRef.current : areaRef.current
      if (!source || !target) return

      const sourceRange = source.scrollHeight - source.clientHeight
      const targetRange = target.scrollHeight - target.clientHeight
      if (sourceRange <= 0 || targetRange <= 0) return

      scrolling.current = from
      target.scrollTop = (source.scrollTop / sourceRange) * targetRange

      // Released after the frame, or the target's own scroll event would
      // bounce straight back and the two panes would fight.
      requestAnimationFrame(() => {
        scrolling.current = null
      })
    },
    [syncScroll, mode],
  )

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

      <div className={cn('grid', mode === 'split' && 'md:grid-cols-2 md:items-stretch')}>
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
            onScroll={() => sync('write')}
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
              'rounded-none border-0 font-mono text-sm leading-relaxed',
              autoResize && mode === 'write' ? 'resize-none overflow-hidden' : 'min-h-40 resize-y',
              'focus-visible:ring-0 focus-visible:outline-none',
              mode === 'split' && 'md:border-border md:border-e',
            )}
          />
        )}

        {showPreview && (
          <div
            ref={previewRef}
            onScroll={() => sync('preview')}
            /*
             * `min-h-0` is what makes this scroll rather than stretch the row.
             *
             * A grid item's default `min-height: auto` refuses to shrink below
             * its content, so `overflow-y: auto` never engages and the taller
             * pane pushes the row instead — which is why the two halves drift
             * out of alignment. With it, the row is sized by the textarea and
             * the preview scrolls inside it.
             */
            className="min-h-0 min-w-0 overflow-x-auto overflow-y-auto">
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
