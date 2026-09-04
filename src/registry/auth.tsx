import { useState } from 'react'
import { DeviceList, type TrustedDevice } from '@/components/ui/device-list'
import { LoginForm } from '@/components/ui/login-form'
import { PermissionMatrix, type Permission, type PermissionRole } from '@/components/ui/permission-matrix'
import { SessionList, type Session } from '@/components/ui/session-list'
import { TwoFactorSetup, type TwoFactorStep } from '@/components/ui/two-factor-setup'
import { Button } from '@/components/ui/button'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

/* --------------------------------------------------------------- login form */

export const loginFormEntry: ComponentEntry = {
  id: 'login-form',
  label: 'Login Form',
  description:
    'Email and password, with somewhere for SSO buttons and an error. The error is announced, not just coloured — a failed sign-in that only turns red is invisible to a screen reader.',
  usage: `import { LoginForm } from '@/components/ui/login-form'

<LoginForm onSubmit={signIn} onForgot={reset} error={error} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'error', label: 'error', default: false },
      { type: 'boolean', prop: 'loading', label: 'loading', default: false },
      { type: 'boolean', prop: 'providers', label: 'SSO buttons', default: true },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <LoginForm
          loading={Boolean(state.loading)}
          error={state.error ? 'That email and password do not match.' : undefined}
          onForgot={() => {}}
          providers={
            state.providers ? (
              <>
                <Button variant="secondary" className="w-full">Continue with Google</Button>
                <Button variant="secondary" className="w-full">Continue with GitHub</Button>
              </>
            ) : undefined
          }
        />
      </div>
    ),
    code: () => `<LoginForm onSubmit={signIn} onForgot={reset} error={error} />`,
  },
  api: [
    { name: 'onSubmit', type: '({ email, password }) => void', description: 'Called on submit with the two values. The form never navigates on its own.' },
    { name: 'error', type: 'ReactNode', description: 'Rendered in a live region above the fields and referenced by `aria-describedby`, so it is read on failure rather than merely seen.' },
    { name: 'providers', type: 'ReactNode', description: 'Slot for SSO or OAuth buttons, placed above the fields — where people who use them actually look.' },
    { name: 'loading', type: 'boolean', description: 'Disables the submit button and shows a spinner. The fields stay enabled, so a slow request does not eat a correction.' },
    { name: 'autocomplete', type: 'set', description: '`username` and `current-password`, which is what lets a password manager fill both in one gesture.' },
  ],
  demos: [
    {
      title: 'With SSO providers and a failure',
      stack: true,
      code: `<LoginForm
  error="Those credentials did not match an account."
  providers={<><Button variant="secondary">GitHub</Button><Button variant="secondary">Google</Button></>}
  onForgot={() => navigate('/reset')}
/>`,
      render: () => (
        <div className="w-full max-w-sm">
          <LoginForm
            error="Those credentials did not match an account."
            onForgot={() => {}}
            providers={
              <>
                <Button variant="secondary" className="w-full">Continue with GitHub</Button>
                <Button variant="secondary" className="w-full">Continue with Google</Button>
              </>
            }
            footer={
              <span className="text-muted-foreground text-xs">
                No account? <a href="#" className="underline">Create one</a>
              </span>
            }
          />
        </div>
      ),
    },
    {
      title: 'Submitting',
      stack: true,
      code: `<LoginForm loading submitLabel="Signing in…" />`,
      render: () => (
        <div className="w-full max-w-sm">
          <LoginForm loading submitLabel="Signing in…" onForgot={() => {}} />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------- two-factor setup */

const CODES = ['4KD2-91XQ', 'PL08-3MZT', 'W7RN-52BC', 'QA31-8VDY', 'JH6M-04KE', 'ZC59-71TG']

function TwoFactorDemo() {
  const [step, setStep] = useState<TwoFactorStep>('scan')
  return (
    <div className="w-full max-w-md">
      <TwoFactorSetup
        step={step}
        onStepChange={setStep}
        secret="JBSWY3DPEHPK3PXP"
        account="a.okafor@example.com"
        recoveryCodes={CODES}
        onVerify={() => setStep('recovery')}
        onFinish={() => setStep('done')}
      />
    </div>
  )
}

export const twoFactorSetupEntry: ComponentEntry = {
  id: 'two-factor-setup',
  label: 'Two-Factor Setup',
  description:
    'Scan, verify, save recovery codes. The recovery step is a step, not a footnote: an authenticator lost with no codes saved is an account lost, and burying them behind a link is why that happens.',
  usage: `import { TwoFactorSetup } from '@/components/ui/two-factor-setup'

<TwoFactorSetup step={step} onStepChange={setStep} secret={secret} recoveryCodes={codes} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'select', prop: 'step', label: 'step', options: ['scan', 'verify', 'recovery', 'done'], default: 'scan' },
      { type: 'boolean', prop: 'error', label: 'wrong code', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <TwoFactorSetup
          step={state.step as TwoFactorStep}
          secret="JBSWY3DPEHPK3PXP"
          account="a.okafor@example.com"
          recoveryCodes={CODES}
          error={state.error ? 'That code was not accepted. Codes expire after 30 seconds.' : undefined}
        />
      </div>
    ),
    code: (state: ComposerState) => `<TwoFactorSetup\n  step="${state.step}"\n  onStepChange={setStep}\n  secret={secret}\n  recoveryCodes={codes}\n/>`,
  },
  api: [
    { name: 'step', type: 'TwoFactorStep', description: "'scan' | 'verify' | 'recovery' | 'done'. Controlled, because enrolment usually spans a server round-trip." },
    { name: 'secret', type: 'string', description: 'Base32, shown for manual entry with a copy button. A QR code is unreadable on the device displaying it.' },
    { name: 'recoveryCodes', type: 'string[]', description: 'Shown once, with copy and download. The step cannot be completed without an explicit acknowledgement that they are saved.' },
    { name: 'onVerify', type: '(code: string) => void', description: 'Called with the six digits. Advancing is yours to decide — the component never assumes success.' },
    { name: 'qr', type: 'ReactNode', description: 'Your rendered QR. The kit does not ship a QR encoder for one screen.' },
  ],
  demos: [
    { title: 'Full enrolment flow', stack: true, code: `const [step, setStep] = useState('scan')\n\n<TwoFactorSetup step={step} onStepChange={setStep} secret={secret} recoveryCodes={codes} onVerify={verify} />`, render: () => <TwoFactorDemo /> },
  ],
}

/* -------------------------------------------------------------- session list */

const SESSIONS: Session[] = [
  { id: 's1', device: 'desktop', browser: 'Chrome 141', os: 'macOS 27', ip: '81.2.69.142', location: 'London, UK', lastActive: ago(1), createdAt: ago(320), current: true },
  { id: 's2', device: 'mobile', browser: 'Safari', os: 'iOS 27', ip: '81.2.69.142', location: 'London, UK', lastActive: ago(140), createdAt: ago(9_000) },
  { id: 's3', device: 'desktop', browser: 'Firefox 139', os: 'Windows 11', ip: '45.83.220.11', location: 'Frankfurt, DE', lastActive: ago(2_800), createdAt: ago(2_820), suspicious: true },
  { id: 's4', device: 'tablet', browser: 'Chrome 138', os: 'Android 16', ip: '92.40.11.7', location: 'Manchester, UK', lastActive: ago(20_000), createdAt: ago(41_000) },
]

export const sessionListEntry: ComponentEntry = {
  id: 'session-list',
  label: 'Session List',
  description:
    'Active sign-ins, with the current one pinned and unrevokable from here. Signing yourself out of the session you are using is a footgun, so it is simply not offered.',
  usage: `import { SessionList } from '@/components/ui/session-list'

<SessionList sessions={sessions} onRevoke={revoke} onRevokeOthers={revokeAll} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'revocable', label: 'revocable', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <SessionList
          sessions={SESSIONS}
          now={NOW}
          onRevoke={state.revocable ? () => {} : undefined}
          onRevokeOthers={state.revocable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<SessionList sessions={sessions} onRevoke={revoke} onRevokeOthers={revokeAll} />`,
  },
  api: [
    { name: 'sessions', type: 'Session[]', description: '`{ id, device, browser?, os?, ip?, location?, lastActive?, current?, suspicious? }`.' },
    { name: 'current', type: 'boolean', description: 'Pins the session to the top and hides its revoke control.' },
    { name: 'suspicious', type: 'boolean', description: 'Your judgement, not the component\'s — it renders the marker, it does not decide what is suspicious.' },
    { name: 'onRevokeOthers', type: '() => void', description: 'The "sign out everywhere" action. This is what someone reaching this screen after a scare actually wants.' },
    { name: 'location', type: 'ReactNode', description: 'Labelled as approximate. IP geolocation is routinely a hundred miles out, and presenting it as fact leads people to dismiss a real intrusion.' },
  ],
  demos: [
    {
      title: 'One session flagged as suspicious',
      stack: true,
      code: `<SessionList sessions={sessions} now={now} onRevoke={revoke} onRevokeOthers={revokeOthers} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <SessionList sessions={SESSIONS} now={NOW} onRevoke={() => {}} onRevokeOthers={() => {}} />
        </div>
      ),
    },
    {
      title: 'Only this device',
      stack: true,
      code: `<SessionList sessions={[current]} now={now} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <SessionList sessions={SESSIONS.slice(0, 1)} now={NOW} />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------------- device list */

const DEVICES: TrustedDevice[] = [
  { id: 'd1', name: "Ada's MacBook Pro", kind: 'desktop', os: 'macOS 27', addedAt: ago(60_000), lastSeen: ago(4), trustedUntil: days(58), current: true },
  { id: 'd2', name: 'iPhone 17', kind: 'mobile', os: 'iOS 27', addedAt: ago(120_000), lastSeen: ago(220), trustedUntil: days(3) },
  { id: 'd3', name: 'Studio iMac', kind: 'desktop', os: 'macOS 26', addedAt: ago(400_000), lastSeen: ago(60_000), trustedUntil: days(-2) },
]

export const deviceListEntry: ComponentEntry = {
  id: 'device-list',
  label: 'Device List',
  description:
    'Devices trusted to skip the second factor, and when that trust lapses. A grant that expires in three days is worth seeing before you are asked for a code at an airport.',
  usage: `import { DeviceList } from '@/components/ui/device-list'

<DeviceList devices={devices} onRevoke={revoke} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'revocable', label: 'revocable', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-xl">
        <DeviceList devices={DEVICES} now={NOW} onRevoke={state.revocable ? () => {} : undefined} />
      </div>
    ),
    code: () => `<DeviceList devices={devices} onRevoke={revoke} />`,
  },
  api: [
    { name: 'devices', type: 'TrustedDevice[]', description: '`{ id, name, kind, os?, addedAt?, lastSeen?, trustedUntil?, current? }`.' },
    { name: 'trustedUntil', type: 'Date', description: 'Expiry of the trust grant. Shown as a countdown while near, and marked expired once past — an expired grant is not a revoked device.' },
    { name: 'onRevoke', type: '(id: string) => void', description: 'Omit to render a read-only list.' },
    { name: 'now', type: 'Date', description: 'Reference for every relative time, so snapshots do not drift.' },
  ],
  demos: [
    {
      title: 'Trusted devices',
      stack: true,
      code: `<DeviceList devices={devices} now={now} onRevoke={revoke} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <DeviceList devices={DEVICES} now={NOW} onRevoke={() => {}} />
        </div>
      ),
    },
    {
      title: 'Nothing trusted yet',
      stack: true,
      code: `<DeviceList devices={[]} />`,
      render: () => (
        <div className="w-full max-w-2xl">
          <DeviceList devices={[]} />
        </div>
      ),
    },
  ],
}

/* --------------------------------------------------------- permission matrix */

const PERMISSIONS: Permission[] = [
  { id: 'read', label: 'View records', group: 'Records' },
  { id: 'write', label: 'Edit records', group: 'Records' },
  { id: 'delete', label: 'Delete records', group: 'Records', description: 'Permanent after 30 days.' },
  { id: 'export', label: 'Export data', group: 'Records' },
  { id: 'invite', label: 'Invite members', group: 'Team' },
  { id: 'roles', label: 'Manage roles', group: 'Team' },
  { id: 'billing', label: 'Manage billing', group: 'Account' },
  { id: 'audit', label: 'Read audit log', group: 'Account' },
]

const ROLES: PermissionRole[] = [
  { id: 'owner', label: 'Owner', granted: PERMISSIONS.map((p) => p.id), locked: true },
  { id: 'admin', label: 'Admin', granted: ['read', 'write', 'delete', 'export', 'invite', 'audit'], inherited: ['roles'] },
  { id: 'member', label: 'Member', granted: ['read', 'write'] },
  { id: 'viewer', label: 'Viewer', granted: ['read'] },
]

export const permissionMatrixEntry: ComponentEntry = {
  id: 'permission-matrix',
  label: 'Permission Matrix',
  description:
    'Roles against permissions, in a grid. Inherited grants are drawn differently from direct ones, because "why can this role still delete things" is the question a flat list of ticks cannot answer.',
  usage: `import { PermissionMatrix } from '@/components/ui/permission-matrix'

<PermissionMatrix permissions={permissions} roles={roles} onToggle={toggle} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'editable', label: 'editable', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full">
        <PermissionMatrix
          permissions={PERMISSIONS}
          roles={ROLES}
          onToggle={state.editable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<PermissionMatrix permissions={permissions} roles={roles} onToggle={toggle} />`,
  },
  api: [
    { name: 'permissions', type: 'Permission[]', description: '`{ id, label, group?, description? }`. Groups become labelled row sections.' },
    { name: 'roles', type: 'PermissionRole[]', description: '`{ id, label, granted, inherited?, locked? }` — one column each.' },
    { name: 'inherited', type: 'string[]', description: 'Held via implication. Rendered distinctly and not directly revocable, because revoking it here would silently do nothing.' },
    { name: 'locked', type: 'boolean', description: 'For a role that cannot be edited at all — an Owner that must keep every permission.' },
    { name: 'onToggle', type: '(roleId, permissionId, granted) => void', description: 'Omit for a read-only matrix, which is the right thing for a permissions reference page.' },
  ],
  demos: [
    {
      title: 'Roles against permissions',
      stack: true,
      code: `<PermissionMatrix permissions={permissions} roles={roles} />`,
      render: () => (
        <div className="w-full">
          <PermissionMatrix permissions={PERMISSIONS} roles={ROLES} />
        </div>
      ),
    },
  ],
}
