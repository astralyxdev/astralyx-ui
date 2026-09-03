import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToastProvider, useToast } from '@/components/ui/toast'
import type { ComponentEntry } from './types'

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters.'),
  email: z.email('Enter a valid email address.'),
  role: z.string().min(1, 'Pick a role.'),
  bio: z.string().max(160, 'Keep it under 160 characters.').optional(),
  // A boolean refined to true, not z.literal(true): the literal makes the
  // inferred type `true`, so `false` becomes invalid as a *default value*.
  terms: z.boolean().refine((v) => v, 'You have to accept the terms.'),
})

type Values = z.infer<typeof schema>

function SignupForm() {
  const { toast } = useToast()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    // Validate on blur, then keep correcting as they type — validating on every
    // keystroke from the start shouts at someone half-way through their email.
    mode: 'onTouched',
    defaultValues: { name: '', email: '', role: '', bio: '', terms: false },
  })

  return (
    <Form
      form={form}
      onSubmit={(values) => {
        toast({
          title: 'Submitted',
          description: `${values.name} · ${values.email}`,
          color: 'green',
        })
      }}
      className="w-full max-w-sm"
    >
      <FormField name="name" label="Name" required>
        {(field) => <Input {...field} placeholder="Ada Lovelace" />}
      </FormField>

      <FormField name="email" label="Email" required description="We never share it.">
        {(field) => <Input {...field} type="email" placeholder="you@example.com" />}
      </FormField>

      <FormField name="role" label="Role" required>
        {({ value, onChange, ...field }) => (
          <Select
            {...field}
            value={value}
            onValueChange={onChange}
            placeholder="Pick a role"
            options={[
              { value: 'eng', label: 'Engineering' },
              { value: 'design', label: 'Design' },
              { value: 'ops', label: 'Operations' },
            ]}
          />
        )}
      </FormField>

      <FormField name="bio" label="Bio">
        {(field) => <Textarea {...field} autoResize rows={2} placeholder="Optional" />}
      </FormField>

      <FormField name="terms">
        {({ value, onChange, ...field }) => (
          <Checkbox
            {...field}
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            label="I accept the terms"
          />
        )}
      </FormField>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        Create account
      </Button>
    </Form>
  )
}

export const formEntry: ComponentEntry = {
  id: 'form',
  label: 'Form',
  description:
    'A thin bridge between React Hook Form and Field. Field owns the accessibility wiring and knows nothing about any form library; this adds only state and validation.',
  usage: `import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormField } from '@/components/ui/form'

const schema = z.object({ email: z.email('Enter a valid email.') })

const form = useForm({ resolver: zodResolver(schema), mode: 'onTouched' })

<Form form={form} onSubmit={save}>
  <FormField name="email" label="Email" required>
    {(field) => <Input {...field} type="email" />}
  </FormField>
  <Button type="submit">Save</Button>
</Form>`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'live', label: 'try it', default: true }],
    render: () => (
      <ToastProvider>
        <SignupForm />
      </ToastProvider>
    ),
    code: () =>
      `<Form form={form} onSubmit={save}>\n  <FormField name="email" label="Email" required>\n    {(field) => <Input {...field} type="email" />}\n  </FormField>\n</Form>`,
  },
  api: [
    { name: 'Form form', type: 'UseFormReturn', description: 'The instance from useForm(). Provided to descendants, so nested fields need no prop drilling.' },
    { name: 'Form onSubmit', type: '(values) => void', description: 'Runs only after validation passes. The form is noValidate, so the resolver decides — browser bubbles cannot be styled.' },
    { name: 'FormField name', type: 'FieldPath', description: 'Typed against the schema, so a rename is a compile error rather than a silent no-op.' },
    { name: 'FormField children', type: '(field) => ReactNode', description: 'Render prop. Half the controls take value/onValueChange and half take checked/onChange, so mapping is the caller\'s job.' },
    { name: 'FormField label / description / required', type: 'ReactNode | boolean', description: 'Passed through to Field and FieldLabel.' },
    { name: 'errors', type: 'automatic', description: 'The message from the resolver is handed to Field, which is what flips aria-invalid and shows it. There is no second flag.' },
  ],
  demos: [
    {
      title: 'Validated signup',
      stack: true,
      code: `<Form form={form} onSubmit={save}>…</Form>`,
      render: () => (
        <ToastProvider>
          <SignupForm />
        </ToastProvider>
      ),
    },
  ],
}
