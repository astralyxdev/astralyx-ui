import type { ComponentProps, ReactNode } from 'react'
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * A thin bridge between React Hook Form and this kit's `Field`.
 *
 * The split is deliberate: `Field` owns the accessibility wiring — id,
 * `aria-describedby`, `aria-invalid` — and knows nothing about any form
 * library, so it keeps working with `useState`, a server action, or nothing at
 * all. This file adds only state and validation on top.
 *
 * React Hook Form was chosen on the numbers: 241M downloads a month against
 * 10.6M for the nearest actively maintained alternative, zero runtime
 * dependencies, and 26 releases in 2026. Formik has more downloads than
 * TanStack Form but shipped nothing at all in 2026.
 */
function Form<
  TFieldValues extends FieldValues,
  TContext = unknown,
  // A resolver can transform values on the way out (a Zod schema with
  // coercions, say), so the submitted type is not always the field type.
  // Mirroring all three of React Hook Form's parameters keeps inference working
  // instead of collapsing to `FieldValues`.
  TTransformed extends FieldValues = TFieldValues,
>({
  form,
  onSubmit,
  className,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit'> & {
  form: UseFormReturn<TFieldValues, TContext, TTransformed>
  onSubmit: (values: TTransformed) => void | Promise<void>
}) {
  return (
    <FormProvider {...form}>
      <form
        data-slot="form"
        // `noValidate` hands validation to the resolver: the browser's own
        // bubbles cannot be styled and would fire before the schema runs.
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('space-y-5', className)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  )
}

/**
 * One controlled field, wired to both the form and the accessibility plumbing.
 *
 * `children` is a render prop rather than a cloned element: half the controls
 * in this kit take `value`/`onValueChange` and half take `checked`/`onChange`,
 * so mapping is the caller's job and guessing would be wrong half the time.
 */
function FormField<
  T extends FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
>({
  name,
  label,
  description,
  required,
  className,
  children,
}: {
  name: N
  label?: ReactNode
  description?: ReactNode
  required?: boolean
  className?: string
  children: (
    field: ControllerRenderProps<T, N> & ReturnType<typeof useFieldControl>,
  ) => ReactNode
}) {
  const form = useFormContext<T>()
  const error = form.formState.errors[name]

  return (
    <Field
      className={className}
      description={description}
      // Passing the message here is what makes Field flip to invalid; there is
      // no second flag to keep in step with it.
      error={error?.message as ReactNode}
    >
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <Controller
        name={name}
        control={form.control}
        render={({ field }) => <FieldControl field={field}>{children}</FieldControl>}
      />
    </Field>
  )
}

/** Merges the Field's a11y props into the controller's field props. */
function FieldControl<T extends FieldValues, N extends FieldPath<T>>({
  field,
  children,
}: {
  field: ControllerRenderProps<T, N>
  children: (
    field: ControllerRenderProps<T, N> & ReturnType<typeof useFieldControl>,
  ) => ReactNode
}) {
  return children({ ...field, ...useFieldControl() })
}

export { Form, FormField }
