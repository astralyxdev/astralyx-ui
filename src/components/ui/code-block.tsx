import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type UIEvent,
} from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCode2,
  RotateCcw,
} from 'lucide-react'
import type { HighlightOptions, Language } from '@/lib/highlighter'
import {
  controlSize,
  focusRingInset,
  ghostControl,
  radius,
  surface,
} from '@/lib/styles'
import { useClipboard } from '@/lib/use-clipboard'
import { cn } from '@/lib/utils'

type CodeBlockProps = Omit<
  ComponentProps<'div'>,
  'children' | 'onChange' | 'defaultValue'
> & {
  /** Source to render. Acts as the initial value when `editable`. */
  code: string
  language?: Language
  /** Free-form header label, e.g. "Variants". */
  title?: string
  /** A path, e.g. "src/components/ui/button.tsx". Occupies the same header
   *  slot as `title` but renders the directory muted and the file emphasized. */
  filePath?: string
  /** Show the language chip. On by default whenever the header has a label. */
  showLanguage?: boolean
  /** Show the copy button. */
  copyable?: boolean
  /** Let the reader type into the block; highlighting follows every keystroke. */
  editable?: boolean
  /**
   * A control bar under the code — a Run button, a language switch, a status
   * line. Sits below the expand row, so "show more" stays attached to the code
   * it expands rather than being pushed away from it by the controls.
   */
  footer?: ReactNode
  /** Fires on every edit. Only meaningful with `editable`. */
  onCodeChange?: (code: string) => void
  /** Show a reset-to-original button once the code has been edited. */
  resettable?: boolean
  /** Gutter with 1-based line numbers. */
  lineNumbers?: boolean
  /** Soft-wrap long lines instead of scrolling horizontally. */
  wrap?: boolean
  /** 1-based lines to emphasize. */
  highlightLines?: number[]
  /** Collapse past this many lines behind a "Show more" toggle. */
  maxLines?: number
  /**
   * Keep the code surface at least this tall, in lines. Mostly for `editable`:
   * an editor that starts one line high and grows is a fiddly target, and the
   * caret has nowhere to land when the buffer is empty.
   */
  minLines?: number
  /** Force the header on or off. Defaults to on when there is anything in it. */
  header?: boolean
}

/** Both layers must share these exactly or the edit caret drifts off the text. */
const SURFACE = 'font-mono text-[13px] leading-[var(--code-lh)] py-4'
const LAYER = '[&_pre]:!bg-transparent'
const WRAPPED = '[&_.line]:break-words [&_pre]:whitespace-pre-wrap'

function CodeBlock({
  code,
  language = 'tsx',
  title,
  filePath,
  showLanguage,
  copyable = true,
  editable = false,
  footer,
  onCodeChange,
  resettable = editable,
  lineNumbers = false,
  wrap = false,
  highlightLines,
  maxLines,
  minLines,
  header,
  className,
  ...props
}: CodeBlockProps) {
  const [value, setValue] = useState(code)
  const [expanded, setExpanded] = useState(false)
  const { copy, copied } = useClipboard()

  // Re-seed when the caller swaps in different source. Adjusting during render
  // (rather than in an effect) avoids a throwaway pass with stale code.
  const [seed, setSeed] = useState(code)
  if (seed !== code) {
    setSeed(code)
    setValue(code)
  }

  const html = useHighlighted(value, language, { highlightLines })

  const highlightRef = useRef<HTMLDivElement>(null)
  const dirty = value !== code

  const lineCount = value.split('\n').length
  const collapsible = maxLines !== undefined && lineCount > maxLines
  const measure = useMeasuredHeight(collapsible)
  const contentHeight = measure.height

  /**
   * The highlighted and plain layers are separate elements that swap once
   * shiki resolves. A ref object alone would leave the ResizeObserver attached
   * to the one that just unmounted — the measured height would go stale, and
   * expanding would animate to it, collapsing the block instead of opening it.
   * A callback ref re-attaches on every swap.
   */
  const attachLayer = useCallback(
    (node: HTMLDivElement | null) => {
      highlightRef.current = node
      measure.observe(node)
    },
    [measure],
  )

  const showReset = resettable && dirty
  const label = title ?? filePath
  const showHeader =
    header ?? Boolean(label || copyable || showReset || editable)
  // The chip would just repeat itself when the language is already the label.
  const withLanguage = showLanguage ?? Boolean(label)

  // Line numbers live in a ::before pseudo-element, so the editable overlay
  // needs the same gutter reserved on its left edge.
  const padding = {
    paddingLeft: lineNumbers ? 'calc(1rem + 3.5ch)' : '1rem',
    paddingRight: '1rem',
  }

  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget
    const layer = highlightRef.current
    if (!layer) return

    layer.scrollTop = target.scrollTop
    layer.scrollLeft = target.scrollLeft
  }

  return (
    <div
      data-slot="code-block"
      data-editable={editable || undefined}
      className={cn(
        surface,
        radius.surface,
        'bg-muted/40 relative overflow-hidden text-sm [--code-lh:20px]',
        lineNumbers && 'code-block--numbers',
        className,
      )}
      {...props}
    >
      {showHeader && (
        <div className="border-border text-muted-foreground flex items-center justify-between gap-2 border-b p-2">
          <div className="flex min-w-0 items-center gap-2">
            {filePath ? (
              <FilePath path={filePath} />
            ) : (
              // With no label the language holds the slot — unless the chip is
              // already showing it on the right.
              (label || !withLanguage) && (
                <span className="truncate font-mono text-xs">
                  {label ?? language}
                </span>
              )
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {withLanguage && (
              <span
                className={cn(
                  'border-border text-muted-foreground border px-1.5 py-0.5 font-mono text-[10px] leading-none',
                  radius.xs,
                )}
              >
                {language}
              </span>
            )}
            {showReset && (
              <IconButton
                label="Reset code"
                onClick={() => {
                  setValue(code)
                  onCodeChange?.(code)
                }}
              >
                <RotateCcw className="size-3.5" />
              </IconButton>
            )}
            {copyable && (
              <IconButton
                label={copied ? 'Copied' : 'Copy code'}
                onClick={() => copy(value)}
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </IconButton>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative',
          collapsible &&
            'overflow-hidden transition-[max-height] duration-300 ease-out motion-reduce:transition-none',
        )}
        style={{
          // Both bounds are expressed in lines against the same token, and set
          // here because `--code-lh` is declared on this component — a caller
          // one level up cannot resolve it.
          ...(minLines
            ? { minHeight: `calc(${minLines} * var(--code-lh) + 2rem)` }
            : undefined),
          ...(collapsible
            ? {
                // A pixel target on both ends — `auto` cannot be transitioned.
                maxHeight: expanded
                  ? `${contentHeight}px`
                  : `calc(${maxLines} * var(--code-lh) + 2rem)`,
              }
            : undefined),
        }}
      >
        {/*
          Two separate elements, not one that swaps props. Toggling between
          `children` and `dangerouslySetInnerHTML` on a single node makes React
          try to remove a child that innerHTML has already destroyed, so the
          highlighted markup can silently fail to appear. Distinct keys mean one
          unmounts and the other mounts instead.
        */}
        {html ? (
          <div
            key="highlighted"
            ref={attachLayer}
            aria-hidden={editable || undefined}
            className={cn(SURFACE, LAYER, wrap ? WRAPPED : 'overflow-x-auto')}
            style={padding}
            // Markup comes from shiki, generated from `value` — never raw input.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div
            key="plain"
            ref={attachLayer}
            aria-hidden={editable || undefined}
            className={cn(SURFACE, LAYER, wrap ? WRAPPED : 'overflow-x-auto')}
            style={padding}
          >
            <pre>{value}</pre>
          </div>
        )}

        {editable && (
          <textarea
            value={value}
            spellCheck={false}
            wrap={wrap ? 'soft' : 'off'}
            aria-label={label ? `${label} source` : 'Editable code'}
            onScroll={handleScroll}
            onChange={(event) => {
              setValue(event.target.value)
              onCodeChange?.(event.target.value)
            }}
            className={cn(
              SURFACE,
              'caret-foreground absolute inset-0 resize-none overflow-auto bg-transparent text-transparent',
              focusRingInset,
              wrap ? 'whitespace-pre-wrap' : 'whitespace-pre',
            )}
            style={padding}
          />
        )}

        {collapsible && (
          <div
            aria-hidden
            className={cn(
              'from-card pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent transition-opacity duration-300 motion-reduce:transition-none',
              expanded && 'opacity-0',
            )}
          />
        )}
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'border-border text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-1 border-t p-2 text-xs',
            focusRingInset,
          )}
        >
          {expanded
            ? 'Show less'
            : `Show ${lineCount - (maxLines ?? 0)} more lines`}
          {expanded ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      )}

      {/* Square padding, matching the header and the expand row: every chrome
          strip insets its contents by the same amount on all four edges, so a
          control sits the same distance from the left edge as from the top. */}
      {footer && (
        <div className="border-border text-muted-foreground flex flex-wrap items-center gap-2 border-t p-2">
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * Render a path with its directory de-emphasized, so the file name stays the
 * thing you read first. A bare name (no slash) renders as-is.
 */
function FilePath({ path }: { path: string }) {
  const index = path.lastIndexOf('/')
  const dir = index === -1 ? '' : path.slice(0, index + 1)
  const file = index === -1 ? path : path.slice(index + 1)

  return (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
      <FileCode2 className="size-3.5 shrink-0 opacity-60" />
      <span className="truncate">
        {dir && <span className="opacity-60">{dir}</span>}
        <span className="text-foreground">{file}</span>
      </span>
    </span>
  )
}

function IconButton({
  label,
  children,
  ...props
}: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center',
        controlSize.iconXs,
        ghostControl,
        focusRingInset,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * Track an element's rendered height so the collapse can animate to a real
 * pixel value.
 *
 * Returns an `observe` callback rather than taking a ref, so the caller can
 * hand it whichever element is currently mounted. Re-measures on edits and on
 * late-arriving highlighting.
 */
function useMeasuredHeight(enabled: boolean) {
  const [height, setHeight] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)

  const observe = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect()
      observer.current = null
      if (!node || !enabled) return

      const read = () => setHeight(node.getBoundingClientRect().height)
      observer.current = new ResizeObserver(read)
      observer.current.observe(node)
      read()
    },
    [enabled],
  )

  useEffect(() => () => observer.current?.disconnect(), [])

  return useMemo(() => ({ height, observe }), [height, observe])
}

/** Highlight off the render path; falls back to plain text until ready. */
function useHighlighted(
  code: string,
  language: Language,
  { highlightLines }: HighlightOptions = {},
) {
  const [html, setHtml] = useState<string | null>(null)
  const lines = highlightLines?.join(',')

  useEffect(() => {
    let stale = false

    // Loaded on demand so shiki stays out of the initial bundle.
    import('@/lib/highlighter').then(
      ({ highlight }) =>
        highlight(code, language, {
          highlightLines: lines ? lines.split(',').map(Number) : undefined,
        }).then(
          (result) => {
            if (!stale) setHtml(result)
          },
          onFailure,
        ),
      onFailure,
    )

    function onFailure(error: unknown) {
      // Falling back to plain text is silent by nature — say so, or a missing
      // highlight looks like a styling bug.
      console.warn('[CodeBlock] highlighting failed, showing plain text', error)
      if (!stale) setHtml(null)
    }

    return () => {
      stale = true
    }
  }, [code, language, lines])

  return html
}

export { CodeBlock }
export type { CodeBlockProps }
