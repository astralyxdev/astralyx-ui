import {
  createContext,
  use,
  useId,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Wires a label, a control, help text and an error message together.
 *
 * The plumbing is the point: the control gets an id, `aria-describedby`
 * pointing at whichever of description and error is present, and `aria-invalid`
 * when there is an error. Done by hand at every call site, one of those is
 * always missing.
 *
 * Deliberately not tied to a form library — it describes one field's
 * accessibility, and works the same whether state comes from useState, React
 * Hook Form or a server action.
 */
type FieldContextValue = {
  ids: { control: string; description: string; error: string }
  invalid: boolean
  hasDescription: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

function useField() {
  const context = use(FieldContext)
  if (!context) throw new Error('Must be used inside <Field>')
  return context
}

/**
 * Props to spread onto the control. Named rather than injected by cloning, so
 * it works with any control, including ones this kit does not own.
 */
export function useFieldControl() {
  const { ids, invalid, hasDescription } = useField()

  const described = [
    hasDescription ? ids.description : null,
    invalid ? ids.error : null,
  ].filter(Boolean)

  return {
    id: ids.control,
    'aria-describedby': described.length ? described.join(' ') : undefined,
    'aria-invalid': invalid || undefined,
  }
}

function Field({
  className,
  error,
  description,
  children,
  ...props
}: ComponentProps<'div'> & {
  /** Message shown under the control. Its presence marks the field invalid. */
  error?: ReactNode
  description?: ReactNode
}) {
  const id = useId()

  const context = useMemo<FieldContextValue>(
    () => ({
      ids: {
        control: `${id}-control`,
        description: `${id}-description`,
        error: `${id}-error`,
      },
      invalid: Boolean(error),
      // Only when it will actually be rendered. The description element is
      // replaced by the error one, so advertising its id while an error is
      // showing points `aria-describedby` at a node that does not exist —
      // and a screen reader announces nothing where the hint used to be.
      hasDescription: Boolean(description) && !error,
    }),
    [id, error, description],
  )

  return (
    <FieldContext value={context}>
      <div
        data-slot="field"
        data-invalid={error ? true : undefined}
        className={cn('flex flex-col gap-2', className)}
        {...props}
      >
        {children}
        {description && !error && (
          <p
            id={context.ids.description}
            data-slot="field-description"
            className="text-muted-foreground text-xs"
          >
            {description}
          </p>
        )}
        {error && (
          <p
            id={context.ids.error}
            data-slot="field-error"
            className="text-destructive text-xs"
          >
            {error}
          </p>
        )}
      </div>
    </FieldContext>
  )
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  const { ids } = useField()

  return (
    <Label
      htmlFor={ids.control}
      data-slot="field-label"
      className={className}
      {...props}
    />
  )
}

export { Field, FieldLabel }
