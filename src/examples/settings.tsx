import { useState } from 'react'
import {
  Bell, Building2, Check, CreditCard, Globe, KeyRound, Shield, Trash2,
  Upload, User,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, FieldLabel, useFieldControl } from '@/components/ui/field'
import { Group } from '@/components/ui/group'
import { Input } from '@/components/ui/input'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ApiKeys, type ApiKey } from '@/components/ui/api-keys'
import { DeviceList, type TrustedDevice } from '@/components/ui/device-list'
import { SessionList, type Session } from '@/components/ui/session-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TwoFactorSetup, type TwoFactorStep } from '@/components/ui/two-factor-setup'
import { Textarea } from '@/components/ui/textarea'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { AppFrame, AppFrameUser, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

const NAV: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: <User /> },
  { id: 'workspace', label: 'Workspace', icon: <Building2 /> },
  { id: 'security', label: 'Security', icon: <Shield /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard /> },
  { id: 'api', label: 'API keys', icon: <KeyRound /> },
]

function WiredInput(props: React.ComponentProps<typeof Input>) {
  return <Input variant="secondary" {...useFieldControl()} {...props} />
}

function WiredTextarea(props: React.ComponentProps<typeof Textarea>) {
  return <Textarea variant="secondary" {...useFieldControl()} {...props} />
}

function SaveBar() {
  const { toast } = useToast()

  return (
    <CardFooter className="justify-end">
      <Button variant="ghost" size="sm">
        Discard
      </Button>
      <Button
        size="sm"
        onClick={() =>
          toast({
            title: 'Settings saved',
            description: 'Your profile is up to date.',
            color: 'green',
          })
        }
      >
        <Check /> Save changes
      </Button>
    </CardFooter>
  )
}

/**
 * Fixed, not `new Date()`. Every example page is server-prerendered, and a
 * clock that moves between the render and the hydrate is a mismatch.
 */
const NOW = new Date('2026-03-04T11:20:00Z')

const RECOVERY_CODES = [
  '4f2a-9c31', '8bd0-1e77', 'a35c-64f2', '0e91-77ab',
  'c2d8-3b15', '6a44-de09', 'f018-52c7', '9b6e-a140',
]

const SESSIONS: Session[] = [
  { id: 's1', device: 'desktop', browser: 'Chrome 141', os: 'macOS 27', ip: '82.14.7.201', location: 'London, UK', lastActive: new Date('2026-03-04T11:18:00Z'), createdAt: new Date('2026-02-27T09:02:00Z'), current: true },
  { id: 's2', device: 'mobile', browser: 'Safari', os: 'iOS 27', ip: '82.14.7.201', location: 'London, UK', lastActive: new Date('2026-03-04T08:40:00Z'), createdAt: new Date('2026-01-19T18:22:00Z') },
  { id: 's3', device: 'desktop', browser: 'Firefox 139', os: 'Ubuntu 26.04', ip: '203.0.113.42', location: 'Frankfurt, DE', lastActive: new Date('2026-03-03T02:11:00Z'), createdAt: new Date('2026-03-03T02:09:00Z'), suspicious: true },
]

const DEVICES: TrustedDevice[] = [
  { id: 'd1', name: 'Ada’s MacBook Pro', kind: 'desktop', os: 'macOS 27', lastSeen: new Date('2026-03-04T11:18:00Z'), trustedUntil: new Date('2026-05-01T00:00:00Z'), current: true },
  { id: 'd2', name: 'iPhone 17 Pro', kind: 'mobile', os: 'iOS 27', lastSeen: new Date('2026-03-04T08:40:00Z'), trustedUntil: new Date('2026-04-12T00:00:00Z') },
  { id: 'd3', name: 'Studio iMac', kind: 'desktop', os: 'macOS 26', lastSeen: new Date('2026-02-02T14:05:00Z'), trustedUntil: new Date('2026-02-20T00:00:00Z') },
]

const KEYS: ApiKey[] = [
  { id: 'k1', name: 'Production deploy', prefix: 'ax_live', last4: '9f21', created: new Date('2025-11-04T10:00:00Z'), lastUsed: new Date('2026-03-04T09:55:00Z'), scopes: ['deploy:write', 'builds:read'] },
  { id: 'k2', name: 'CI test runner', prefix: 'ax_test', last4: '4c08', created: new Date('2026-01-22T16:30:00Z'), lastUsed: new Date('2026-03-02T21:14:00Z'), scopes: ['builds:read'] },
  { id: 'k3', name: 'Local scratch', prefix: 'ax_test', last4: 'b7e3', created: new Date('2026-03-04T11:19:00Z'), scopes: ['builds:read'] },
]

function Settings() {
  const [factorStep, setFactorStep] = useState<TwoFactorStep>('scan')
  const [sessions, setSessions] = useState(SESSIONS)
  const [devices, setDevices] = useState(DEVICES)
  const [keys, setKeys] = useState(KEYS)
  const [email, setEmail] = useState('ada@astralyx.dev')
  const [density, setDensity] = useState('comfortable')
  const [section, setSection] = useState('profile')
  const [tab, setTab] = useState('profile')

  // The rail and the tabs drive the same panes, so picking either keeps both in
  // step rather than leaving one silently pointing somewhere else.
  const go = (next: string) => {
    setSection(next)
    setTab(['profile', 'workspace', 'billing'].includes(next) ? next : 'workspace')
  }

  const emailError =
    email.includes('@') && email.includes('.') ? undefined : 'Enter a valid email address.'

  return (
    <AppFrame
      product="Settings"
      nav={NAV}
      active={section}
      onNavigate={go}
      title="Settings"
      footer={<AppFrameUser name="Ada Lovelace" plan="Team plan" />}
      actions={
        <Badge size="sm">
          Unsaved changes
        </Badge>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="underline" className="w-full overflow-x-auto">
          <TabsTrigger value="profile" variant="underline">Profile</TabsTrigger>
          <TabsTrigger value="workspace" variant="underline">Workspace</TabsTrigger>
          <TabsTrigger value="security" variant="underline">Security</TabsTrigger>
          <TabsTrigger value="billing" variant="underline">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Profile</CardTitle>
              <CardDescription>
                This is how you appear across the workspace.
              </CardDescription>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar size="lg" name="Ada Lovelace" />
                <div className="space-y-1">
                  <Button size="sm" variant="secondary">
                    <Upload /> Upload photo
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    PNG or JPG, up to 2 MB.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field description="Shown on your public profile.">
                  <FieldLabel required>Display name</FieldLabel>
                  <WiredInput defaultValue="Ada Lovelace" />
                </Field>

                <Field error={emailError}>
                  <FieldLabel required>Email</FieldLabel>
                  <WiredInput
                    type="email"
                    value={email}
                    error={Boolean(emailError)}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
              </div>

              <Field description="A short line about what you work on.">
                <FieldLabel>Bio</FieldLabel>
                <WiredTextarea
                  autoResize
                  rows={3}
                  defaultValue="Building a component kit on its own primitives."
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Timezone</FieldLabel>
                  <Combobox
                    variant="secondary"
                    options={[
                      { value: 'utc', label: 'UTC' },
                      { value: 'lon', label: 'Europe/London' },
                      { value: 'ber', label: 'Europe/Berlin' },
                      { value: 'dxb', label: 'Asia/Dubai' },
                      { value: 'nyc', label: 'America/New_York' },
                    ]}
                    defaultValue="dxb"
                  />
                </Field>

                <Field>
                  <FieldLabel>Joined</FieldLabel>
                  <DatePicker variant="secondary" defaultValue={new Date(2024, 2, 14)} />
                </Field>
              </div>
            </CardBody>
            <SaveBar />
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-6">
          <Group>
            <Card size="sm">
              <CardHeader>
                <CardTitle as="h2">Appearance</CardTitle>
                <CardDescription>How the interface is laid out.</CardDescription>
              </CardHeader>
              <CardBody className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Density</p>
                  <RadioGroup
                    value={density}
                    onValueChange={setDensity}
                    orientation="horizontal"
                  >
                    <Radio value="compact" label="Compact" />
                    <Radio value="comfortable" label="Comfortable" />
                    <Radio value="spacious" label="Spacious" />
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Sidebar width</p>
                  <Slider label="Sidebar width" defaultValue={224} min={180} max={320} step={8} showValue formatValue={(v) => `${v}px`} />
                </div>
              </CardBody>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle as="h2">Notifications</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <Switch
                  size="sm"
                  defaultChecked
                  label="Build results"
                  description="Email me when a deployment finishes."
                  labelPosition="start"
                  containerClassName="w-full justify-between"
                />
                <Switch
                  size="sm"
                  label="Weekly digest"
                  description="A summary every Monday morning."
                  labelPosition="start"
                  containerClassName="w-full justify-between"
                />
                <Separator />
                <Checkbox
                  size="sm"
                  defaultChecked
                  label="Security alerts"
                  description="Always sent, regardless of the settings above."
                  disabled
                />
              </CardBody>
            </Card>

            <Card size="sm">
              <CardHeader className="flex-row items-center gap-2">
                <Shield className="text-muted-foreground size-4" />
                <CardTitle as="h2">Security</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <Switch
                  size="sm"
                  defaultChecked
                  label="Require two-factor auth"
                  labelPosition="start"
                  containerClassName="w-full justify-between"
                />
                <Field>
                  <FieldLabel>Default visibility</FieldLabel>
                  <Select variant="secondary"
                    size="sm"
                    defaultValue="private"
                    icon={<Globe />}
                    options={[
                      { value: 'private', label: 'Private' },
                      { value: 'internal', label: 'Internal' },
                      { value: 'public', label: 'Public' },
                    ]}
                  />
                </Field>
              </CardBody>
            </Card>
          </Group>

          <Card variant="ghost" className="border-destructive/40">
            <CardHeader>
              <CardTitle as="h2" className="text-[var(--destructive-soft-foreground)]">
                Danger zone
              </CardTitle>
              <CardDescription>
                Deleting a workspace removes every project and build in it.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button color="destructive" size="sm">
                    <Trash2 /> Delete workspace
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes 4 projects and 1,482 builds. It cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction color="destructive">
                      Delete workspace
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Two-factor authentication</CardTitle>
              <CardDescription>
                The whole enrolment, recovery codes included.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <TwoFactorSetup
                step={factorStep}
                onStepChange={setFactorStep}
                account="ada@astralyx.dev"
                secret="JBSW Y3DP EHPK 3PXP"
                recoveryCodes={RECOVERY_CODES}
                // Any six digits pass. The point here is the flow, not the maths.
                onVerify={() => setFactorStep('recovery')}
                onFinish={() => setFactorStep('done')}
              />
            </CardBody>
          </Card>

          <SessionList
            sessions={sessions}
            now={NOW}
            onRevoke={(id) =>
              setSessions((current) => current.filter((session) => session.id !== id))
            }
            onRevokeOthers={() =>
              setSessions((current) => current.filter((session) => session.current))
            }
          />

          <DeviceList
            devices={devices}
            now={NOW}
            onRevoke={(id) =>
              setDevices((current) => current.filter((device) => device.id !== id))
            }
          />

          <Card>
            <CardHeader>
              <CardTitle as="h2">API keys</CardTitle>
              <CardDescription>
                A key is shown once, on creation, and never again.
              </CardDescription>
            </CardHeader>
            <CardBody>
              <ApiKeys
                keys={keys}
                now={NOW}
                onRevoke={(id) => setKeys((current) => current.filter((key) => key.id !== id))}
              />
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle as="h2">Plan</CardTitle>
                <CardDescription>Billed monthly, cancel any time.</CardDescription>
              </div>
              <Badge color="blue">Team</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="text-muted-foreground size-5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Visa ending 4242</p>
                  <p className="text-muted-foreground text-xs">Expires 04/28</p>
                </div>
                <Button size="sm" variant="secondary">
                  Update
                </Button>
              </div>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppFrame>
  )
}

export const settingsExample: ExampleEntry = {
  id: 'settings',
  label: 'Settings',
  description:
    'A settings screen exercising the whole form stack — validated fields, radios, switches, sliders, a combobox and a destructive confirmation — plus the security surface behind it: two-factor enrolment, live sessions, trusted devices and API keys.',
  uses: [
    'Field', 'Input', 'Textarea', 'Select', 'Combobox', 'Date Picker',
    'Radio Group', 'Switch', 'Checkbox', 'Slider', 'Group', 'Card',
    'Alert Dialog', 'Toast', 'Tabs', 'Two Factor Setup', 'Session List',
    'Device List', 'API Keys',
  ],
  render: () => (
    <ToastProvider position="bottom-end">
      <Settings />
    </ToastProvider>
  ),
}
