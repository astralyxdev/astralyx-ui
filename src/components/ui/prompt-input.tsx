import {
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ArrowUp, Paperclip, Square, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip } from '@/components/ui/tooltip'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The composer for a chat: a growing textarea, a row of attached context, and a
 * toolbar.
 *
 * Enter sends and Shift+Enter inserts a newline — the convention every chat
 * client shares, and the one users have muscle memory for. IME composition is
 * checked first, or the Enter that confirms a Japanese or Chinese candidate
 * would send the message instead.
 */
export type ContextItem = {
  id: string
  label: string
  icon?: ReactNode
  /** Shown after the label, e.g. a line range or a file size. */
  detail?: string
}

type PromptInputProps = Omit<ComponentProps<'div'>, 'onSubmit'> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Show the stop button instead of send, and block submission. */
  busy?: boolean
  onStop?: () => void
  /** Attached files, selections, docs — rendered as removable chips. */
  context?: ContextItem[]
  onRemoveContext?: (id: string) => void
  /** Rendered at the start of the toolbar — a context picker, a model select. */
  toolbar?: ReactNode
  /** Character or token budget, shown when close to the limit. */
  maxLength?: number
  stopLabel?: string
  sendLabel?: string
}

function PromptInput({
  className,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onSubmit,
  placeholder = 'Ask anything…',
  disabled = false,
  busy = false,
  onStop,
  context = [],
  onRemoveContext,
  toolbar,
  maxLength,
  stopLabel = 'Stop',
  sendLabel = 'Send',
  ...props
}: PromptInputProps) {
  const controlled = valueProp !== undefined
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ? valueProp : uncontrolled
  const composing = useRef(false)

  const empty = value.trim().length === 0
  const canSend = !empty && !disabled && !busy

  function set(next: string) {
    if (!controlled) setUncontrolled(next)
    onValueChange?.(next)
  }

  function submit() {
    if (!canSend) return
    onSubmit?.(value.trim())
    if (!controlled) setUncontrolled('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // An IME uses Enter to accept a candidate; sending there loses the word.
    if (composing.current) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div
      data-slot="prompt-input"
      className={cn(
        surface,
        radius.panel,
        // No focus outline on the card or the textarea inside it. The caret is
        // already in view and the composer fills its column, so a border that
        // lights up adds nothing but noise.
        'flex flex-col gap-2 p-2',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
      {...props}
    >
      {context.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pt-1">
          {context.map((item) => (
            <Badge
              key={item.id}
              size="sm"
              variant="secondary"
              shape="rounded"
              icon={item.icon}
              className="ps-2 pe-1"
            >
              <span className="max-w-40 truncate">{item.label}</span>
              {item.detail && (
                <span className="text-muted-foreground/70 font-mono">
                  {item.detail}
                </span>
              )}
              {onRemoveContext && (
                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  onClick={() => onRemoveContext(item.id)}
                  className="hover:bg-accent ms-0.5 rounded-full p-0.5"
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <Textarea
        value={value}
        onChange={(event) => set(event.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={() => (composing.current = false)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        autoResize
        rows={1}
        variant="ghost"
        // The card is the field, so the textarea must not draw a second border,
        // a hover fill, or a focus border of its own.
        className="max-h-56 border-transparent bg-transparent hover:bg-transparent focus-within:border-transparent"
      />

      <div className="flex items-center gap-1 px-1 pb-0.5">
        {toolbar}

        <div className="ms-auto flex items-center gap-2">
          {maxLength && value.length > maxLength * 0.8 && (
            <span
              className={cn(
                'font-mono text-xs tabular-nums',
                value.length >= maxLength
                  ? 'text-[var(--destructive-soft-foreground)]'
                  : 'text-muted-foreground',
              )}
            >
              {value.length}/{maxLength}
            </span>
          )}

          {busy ? (
            <Tooltip content="Stop generating">
              <Button size="icon-sm" variant="secondary" aria-label={stopLabel} onClick={onStop}>
                <Square />
              </Button>
            </Tooltip>
          ) : (
            <Button
              size="icon-sm"
              aria-label={sendLabel}
              disabled={!canSend}
              onClick={submit}
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** The usual leading toolbar button, for attaching context. */
function PromptAttachButton({
  label = 'Attach context',
  ...props
}: ComponentProps<typeof Button> & {
  /** Accessible name and tooltip for the button. */
  label?: string
}) {
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
        <Paperclip />
      </Button>
    </Tooltip>
  )
}

export { PromptInput, PromptAttachButton }
export type { PromptInputProps }
