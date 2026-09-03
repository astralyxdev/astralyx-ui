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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

function Settings() {
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
    'A settings screen exercising the whole form stack: validated fields, grouped cards, radios, switches, sliders, a combobox and a destructive confirmation.',
  uses: [
    'Field', 'Input', 'Textarea', 'Select', 'Combobox', 'Date Picker',
    'Radio Group', 'Switch', 'Checkbox', 'Slider', 'Group', 'Card',
    'Alert Dialog', 'Toast', 'Tabs',
  ],
  render: () => (
    <ToastProvider position="bottom-end">
      <Settings />
    </ToastProvider>
  ),
}
