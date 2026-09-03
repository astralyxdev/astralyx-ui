import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { InputOTP } from '@/components/ui/input-otp'
import { Stepper } from '@/components/ui/stepper'
import { radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Enrolling an authenticator app, end to end.
 *
 * Recovery codes come last and the flow does not finish until they have been
 * seen. Enabling 2FA without them is how people lock themselves out of their
 * own accounts permanently — the support cost of skipping this step is larger
 * than the cost of the step.
 *
 * The secret is shown alongside the QR code, not instead of it. Desktop
 * password managers cannot scan a screen, and a QR-only flow forces people onto
 * a second device they may not have.
 */
export type TwoFactorStep = 'scan' | 'verify' | 'recovery' | 'done'

function TwoFactorSetup({
  step,
  onStepChange,
  qr,
  secret,
  recoveryCodes,
  onVerify,
  onFinish,
  error,
  issuer = 'Astralyx',
  account,
  title = 'Two-factor authentication',
  stepLabels = { scan: 'Scan', verify: 'Verify', recovery: 'Recovery codes' },
  scanInstruction = 'Scan this with your authenticator app.',
  qrPlaceholder = 'QR code',
  secretLabel = 'Or enter this key',
  copySecretLabel = 'Copy setup key',
  continueLabel = 'Continue',
  verifyInstruction = 'Enter the six-digit code from your app.',
  codeLabel = 'Verification code',
  verifyLabel = 'Verify',
  backLabel = 'Back',
  recoveryWarning = 'Save these somewhere safe. Each one works once, and they are the only way back in if you lose the device.',
  copyCodesLabel = 'Copy recovery codes',
  savedLabel = 'I have saved these codes',
  finishLabel = 'Finish',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'title'> & {
  step: TwoFactorStep
  onStepChange?: (step: TwoFactorStep) => void
  /** The QR image or a rendered component. */
  qr?: ReactNode
  /** Base32 secret, for manual entry. */
  secret?: string
  recoveryCodes?: string[]
  onVerify?: (code: string) => void
  onFinish?: () => void
  error?: ReactNode
  issuer?: string
  account?: ReactNode
  title?: ReactNode
  /** Names of the three progress steps. */
  stepLabels?: { scan: ReactNode; verify: ReactNode; recovery: ReactNode }
  scanInstruction?: ReactNode
  /** Stand-in shown when no `qr` is supplied. */
  qrPlaceholder?: ReactNode
  secretLabel?: ReactNode
  copySecretLabel?: string
  continueLabel?: ReactNode
  verifyInstruction?: ReactNode
  /** Accessible name for the six-digit field. */
  codeLabel?: string
  verifyLabel?: ReactNode
  backLabel?: ReactNode
  recoveryWarning?: ReactNode
  copyCodesLabel?: string
  savedLabel?: ReactNode
  finishLabel?: ReactNode
}) {
  const [code, setCode] = useState('')
  const [saved, setSaved] = useState(false)

  const index = { scan: 0, verify: 1, recovery: 2, done: 2 }[step]

  return (
    <div
      data-slot="two-factor-setup"
      className={cn(surface, radius.surface, 'flex flex-col gap-4 p-4', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{title}</span>
      </div>

      <Stepper
        current={index}
        steps={[
          { id: 'scan', label: stepLabels.scan },
          { id: 'verify', label: stepLabels.verify },
          { id: 'recovery', label: stepLabels.recovery },
        ]}
      />

      {step === 'scan' && (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">{scanInstruction}</p>

          <div className="flex flex-wrap items-center gap-4">
            <div className={cn('bg-secondary flex size-40 items-center justify-center', radius.control)}>
              {qr ?? <span className="text-muted-foreground/60 text-xs">{qrPlaceholder}</span>}
            </div>

            {/* Shown alongside the QR: a desktop password manager cannot scan
                a screen, and QR-only forces a second device. */}
            {secret && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-muted-foreground text-xs">{secretLabel}</span>
                <span className="flex items-center gap-1">
                  <code className="bg-secondary rounded-md px-2 py-1 font-mono text-xs break-all">
                    {secret}
                  </code>
                  <CopyButton value={secret} label={copySecretLabel} />
                </span>
                {account && (
                  <span className="text-muted-foreground/70 text-xs">
                    {issuer} · {account}
                  </span>
                )}
              </div>
            )}
          </div>

          <Button className="self-start" onClick={() => onStepChange?.('verify')}>
            {continueLabel}
          </Button>
        </div>
      )}

      {step === 'verify' && (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">{verifyInstruction}</p>
          <InputOTP length={6} value={code} onValueChange={setCode} aria-label={codeLabel} />
          {error && (
            <p className="text-[var(--destructive-soft-foreground)] text-xs">{error}</p>
          )}
          <div className="flex gap-2">
            <Button disabled={code.length < 6} onClick={() => onVerify?.(code)}>
              {verifyLabel}
            </Button>
            <Button variant="secondary" onClick={() => onStepChange?.('scan')}>
              {backLabel}
            </Button>
          </div>
        </div>
      )}

      {(step === 'recovery' || step === 'done') && (
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-1.5 text-sm">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-[var(--amber-soft-foreground)]"
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{recoveryWarning}</span>
          </p>

          <ol className={cn('bg-secondary/60 grid grid-cols-2 gap-x-4 gap-y-1 p-3 sm:grid-cols-3', radius.control)}>
            {(recoveryCodes ?? []).map((recoveryCode, i) => (
              <li key={recoveryCode} className="flex gap-2 font-mono text-xs">
                <span className="text-muted-foreground/50 w-4 text-end tabular-nums">{i + 1}</span>
                {recoveryCode}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            {recoveryCodes && (
              <CopyButton value={recoveryCodes.join('\n')} label={copyCodesLabel} showLabel />
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={saved}
                onChange={(event) => setSaved(event.target.checked)}
                className="accent-[var(--primary)]"
              />
              {savedLabel}
            </label>
          </div>

          {/* The flow does not finish until they have been seen. */}
          <Button disabled={!saved} className="self-start" onClick={onFinish}>
            <Check />
            {finishLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export { TwoFactorSetup }
