import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDismissable } from '@/components/primitives/dismissable'
import { usePopper } from '@/components/primitives/popper'
import { menuSurface, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A confirmation anchored to the control that triggered it.
 *
 * **The case against using `AlertDialog` for everything.** A modal steals
 * focus, covers the page, and forces a full context switch — which is correct
 * for "delete this project, and everything in it", and disproportionate for
 * "remove this row". Worse, in a table it hides the very row you are asking
 * about, so the answer to "which one was it?" is behind the thing asking. This
 * keeps the row visible and puts the question next to the button.
 *
 * **The rule for choosing between them is reversibility, not tone.** If the
 * action can be undone, or affects one item, confirm in place. If it destroys
 * something irrecoverable, or several things at once, take over the screen —
 * the interruption is the feature.
 *
 * Focus moves to the confirm button on open and returns to the trigger on
 * close, Escape cancels, and it is `role="alertdialog"` so it is announced
 * rather than silently appearing. It is **not** modal: the rest of the page
 * stays reachable, which is the trade being made.
 *
 * Better still, where you can: act immediately and offer an Undo toast. A
 * confirmation people click through reflexively protects nobody.
 */
type PopconfirmProps = Omit<ComponentProps<'div'>, 'title' | 'onSelect'> & {
  /** The control the confirmation hangs off. Must accept a ref. */
  children: ReactElement
  title: ReactNode
  description?: ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button, for a destructive action. */
  destructive?: boolean
  /** Spinner on the confirm button while an async action runs. */
  loading?: boolean
  side?: 'top' | 'bottom' | 'left' | 'right'
  icon?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}

function Popconfirm({
  children,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  side = 'top',
  icon,
  open: openProp,
  onOpenChange,
  disabled,
  className,
  ...props
}: PopconfirmProps) {
  const anchorRef = useRef<HTMLElement>(null)
  const floatingRef = useRef<HTMLDivElement>(null)
  const scope = useId()
  const [internal, setInternal] = useState(false)

  const open = openProp ?? internal

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternal(next)
    onOpenChange?.(next)
    // Focus must come back to what opened it, or the keyboard user is dropped
    // at the top of the document.
    if (!next) anchorRef.current?.focus()
  }

  const { style } = usePopper({ open, anchorRef, floatingRef, side, align: 'center', offset: 8 })
  useDismissable({
    open,
    onDismiss: () => {
      onCancel?.()
      setOpen(false)
    },
    refs: [anchorRef, floatingRef],
  })

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        ref: anchorRef,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        'aria-controls': open ? `${scope}-panel` : undefined,
        onClick: (event: React.MouseEvent) => {
          ;(children.props as { onClick?: (event: React.MouseEvent) => void }).onClick?.(event)
          if (!event.defaultPrevented && !disabled) setOpen(!open)
        },
      })
    : children

  return (
    <>
      {trigger}

      {open && (
        <div
          ref={floatingRef}
          id={`${scope}-panel`}
          // Announced on open, unlike a plain popover, because a question that
          // is not read out is a question that gets answered by accident.
          role="alertdialog"
          aria-modal="false"
          aria-labelledby={`${scope}-title`}
          aria-describedby={description ? `${scope}-description` : undefined}
          style={style}
          className={cn(menuSurface, radius.surface, 'w-64 p-3', className)}
          {...props}
        >
          <div className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              {icon ?? (
                <AlertTriangle
                  className={cn('size-4', destructive && 'text-[var(--destructive)]')}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p id={`${scope}-title`} className="text-sm font-medium">
                {title}
              </p>
              {description && (
                <p id={`${scope}-description`} className="text-muted-foreground mt-1 text-xs">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onCancel?.()
                setOpen(false)
              }}
            >
              {cancelLabel}
            </Button>
            <Button
              size="sm"
              autoFocus
              variant={destructive ? 'colored' : 'default'}
              color={destructive ? 'destructive' : undefined}
              disabled={loading}
              onClick={() => {
                onConfirm?.()
                setOpen(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export { Popconfirm }
export type { PopconfirmProps }
