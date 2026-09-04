import { useId, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Separator } from '@/components/ui/separator'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Email and password sign-in, with providers.
 *
 * The error is deliberately generic and lives above the form, not on a field.
 * "No account with that email" tells an attacker which addresses are
 * registered; a single "those details do not match" on the form as a whole
 * leaks nothing and is what every audited implementation does.
 *
 * Field names and autocomplete tokens are the real ones — `username` and
 * `current-password` — because password managers key off them, and a login form
 * they cannot fill is one people work around by choosing weaker passwords.
 */
function LoginForm({
  onSubmit,
  onForgot,
  providers,
  error,
  loading = false,
  title = 'Sign in',
  description,
  footer,
  emailLabel = 'Email',
  passwordLabel = 'Password',
  forgotLabel = 'Forgot password?',
  submitLabel = 'Sign in',
  dividerLabel = 'or',
  titleAs: Title = 'h2',
  className,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit' | 'title'> & {
  onSubmit?: (credentials: { email: string; password: string }) => void
  onForgot?: () => void
  /** Buttons for SSO or OAuth. */
  providers?: ReactNode
  error?: ReactNode
  loading?: boolean
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  emailLabel?: ReactNode
  passwordLabel?: ReactNode
  forgotLabel?: ReactNode
  submitLabel?: ReactNode
  /** Separates the provider buttons from the fields. */
  dividerLabel?: ReactNode
  /**
   * Element for the title.
   *
   * `h2` by default — a form sits inside a page that already owns the `h1`,
   * and a card-level component emitting one hijacks the document outline. Set
   * `'p'` when the surrounding page already announces the same thing, or `'h1'`
   * on a dedicated sign-in page where this really is the heading.
   */
  titleAs?: 'h1' | 'h2' | 'h3' | 'p'
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Namespaced per instance. Hardcoded ids collide the moment a page shows two
  // of these — a sign-in beside a sign-up — and a colliding `htmlFor` focuses
  // the *first* matching field, so the second form's labels point at the wrong
  // inputs.
  const scope = useId()
  const emailId = `${scope}-email`
  const passwordId = `${scope}-password`

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit?.({ email, password })
  }

  return (
    <form
      data-slot="login-form"
      onSubmit={submit}
      className={cn(surface, radius.surface, 'flex w-full flex-col gap-4 p-6', className)}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <Title className="text-lg font-semibold tracking-tight">{title}</Title>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>

      {/* One generic message on the form, never per field: naming the wrong
          field tells an attacker which addresses are registered. */}
      {error && (
        <p
          role="alert"
          className={cn(
            'flex items-start gap-2 p-3 text-sm text-[var(--destructive-soft-foreground)]',
            'bg-[color-mix(in_oklab,var(--destructive),transparent_92%)]',
            radius.control,
          )}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {providers && (
        <>
          <div className="flex flex-col gap-2">{providers}</div>
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">{dividerLabel}</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={emailId}>{emailLabel}</Label>
        <Input
          id={emailId}
          name="username"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={passwordId}>{passwordLabel}</Label>
          {onForgot && (
            <button
              type="button"
              onClick={onForgot}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              {forgotLabel}
            </button>
          )}
        </div>
        <PasswordInput
          id={passwordId}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>

      {footer && <div className="text-muted-foreground text-center text-sm">{footer}</div>}
    </form>
  )
}

export { LoginForm }
