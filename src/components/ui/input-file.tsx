import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Paperclip, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  disabledState,
  fieldBase,
  fieldSize,
  focusRing,
  radius,
} from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A file picker shaped like an Input, for use in a form row.
 *
 * The counterpart to `Dropzone`, not a replacement: this is the control you put
 * on a settings form beside a Label, where a 120px drop target would be absurd.
 * Dropzone is for the case where dropping is the primary gesture.
 *
 * The native control is replaced rather than restyled. `input[type=file]` gives
 * you a UA button whose text is not settable and whose layout is not reachable
 * except through a vendor pseudo-element, so matching the kit's field metrics
 * means driving a hidden input from our own trigger.
 */
type InputFileProps = Omit<ComponentProps<'input'>, 'size' | 'type' | 'value'> & {
  size?: keyof typeof fieldSize
  variant?: 'default' | 'secondary' | 'ghost'
  error?: boolean
  /** Text shown when nothing is picked. */
  placeholder?: string
  buttonLabel?: ReactNode
  /** Show an X to clear the selection. */
  clearable?: boolean
  /** Accessible name for that clear button. */
  clearLabel?: string
  onFiles?: (files: File[]) => void
}

const VARIANT = {
  default: 'border-border bg-background border',
  secondary: 'bg-secondary border border-transparent',
  ghost: 'border border-transparent bg-transparent hover:bg-accent',
} as const

function InputFile({
  size = 'md',
  variant = 'default',
  error = false,
  placeholder = 'No file selected',
  buttonLabel = 'Browse',
  clearLabel = 'Clear selection',
  clearable = true,
  multiple = false,
  disabled = false,
  className,
  onFiles,
  onChange,
  ...props
}: InputFileProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const id = useId()

  const summary =
    files.length === 0
      ? placeholder
      : files.length === 1
        ? files[0].name
        : `${files.length} files`

  function update(next: File[]) {
    setFiles(next)
    onFiles?.(next)
  }

  return (
    <div
      data-slot="input-file"
      className={cn(
        fieldBase,
        fieldSize[size],
        VARIANT[variant],
        error && 'border-destructive',
        // The wrapper is the focus surface: focus lands on the hidden input, so
        // the ring has to be drawn from `focus-within` on the box around it.
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <Paperclip className="text-muted-foreground shrink-0" aria-hidden="true" />

      <span
        id={id}
        className={cn(
          'min-w-0 flex-1 truncate text-start',
          files.length === 0 && 'text-muted-foreground/70',
        )}
      >
        {summary}
      </span>

      {clearable && files.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={clearLabel}
          className="shrink-0"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            update([])
          }}
        >
          <X />
        </Button>
      )}

      <Button
        type="button"
        variant="secondary"
        size={size === 'xs' || size === 'sm' ? 'xs' : 'sm'}
        className="shrink-0"
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {buttonLabel}
      </Button>

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        disabled={disabled}
        aria-labelledby={id}
        className={cn('sr-only', focusRing, disabledState, radius.control)}
        onChange={(event) => {
          update([...(event.target.files ?? [])])
          onChange?.(event)
        }}
        {...props}
      />
    </div>
  )
}

export { InputFile }
export type { InputFileProps }
