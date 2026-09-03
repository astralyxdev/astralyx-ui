import { GitPullRequest, LogOut, MessageSquare, Settings, User } from 'lucide-react'
import { ApiKeys, type ApiKey } from '@/components/ui/api-keys'
import { InvoiceList, type Invoice } from '@/components/ui/invoice-list'
import { MentionInput, type Mentionable } from '@/components/ui/mention-input'
import { NotificationInbox, type Notification } from '@/components/ui/notification-inbox'
import { Presence, type Peer } from '@/components/ui/presence'
import { UserMenu } from '@/components/ui/user-menu'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

const NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Grace Hopper requested your review', description: 'PR #412 · Derive field padding', time: ago(12), actor: 'Grace Hopper', icon: <GitPullRequest className="text-[var(--green-soft-foreground)]" /> },
  { id: '2', title: 'Build #1482 passed', description: 'main · 3m 12s', time: ago(48) },
  { id: '3', title: 'Alan Turing commented', description: '"Should this opt out of the squircle?"', time: ago(120), actor: 'Alan Turing', icon: <MessageSquare className="text-[var(--blue-soft-foreground)]" />, read: true },
  { id: '4', title: 'Weekly usage summary', description: '8,420 of 10,000 build minutes', time: ago(1500), read: true },
]

export const notificationInboxEntry: ComponentEntry = {
  id: 'notification-inbox',
  label: 'Notification Inbox',
  description:
    'A notification list grouped by day, with unread state. Unread is reported, never assumed — a panel that marks everything read on render clears what the user never saw.',
  usage: `import { NotificationInbox } from '@/components/ui/notification-inbox'

<NotificationInbox notifications={items} onRead={markRead} onReadAll={markAllRead} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'markAll', label: 'mark all action', default: true },
      { type: 'boolean', prop: 'empty', label: 'empty state', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <NotificationInbox
          notifications={state.empty ? [] : NOTIFICATIONS}
          now={NOW}
          onRead={() => {}}
          onReadAll={state.markAll ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<NotificationInbox\n  notifications={items}\n  onRead={markRead}\n  onReadAll={markAllRead}\n/>`,
  },
  api: [
    { name: 'notifications', type: 'Notification[]', description: '`{ id, title, description?, time, read?, actor?, icon?, onSelect? }`.' },
    { name: 'onRead / onReadAll', type: '(id) => void / () => void', description: 'Reading happens when someone acts, which is the caller’s call to make.' },
    { name: 'grouping', type: 'by day', description: '"When" is the axis people scan a notification list along — the same reason CommitList groups.' },
    { name: 'filter', type: 'all / unread', description: 'Local to the component; it never mutates the list.' },
  ],
  demos: [
    { title: 'Inbox', stack: true, code: `<NotificationInbox notifications={items} onRead={markRead} />`, render: () => <div className="w-full max-w-md"><NotificationInbox notifications={NOTIFICATIONS} now={NOW} onRead={() => {}} onReadAll={() => {}} /></div> },
  ],
}

const PEERS: Peer[] = [
  { id: '1', name: 'Ada Lovelace', status: 'active' },
  { id: '2', name: 'Grace Hopper', status: 'active' },
  { id: '3', name: 'Alan Turing', status: 'idle' },
  { id: '4', name: 'Katherine Johnson', status: 'away' },
  { id: '5', name: 'Margaret Hamilton', status: 'active' },
  { id: '6', name: 'Barbara Liskov', status: 'idle' },
]

export const presenceEntry: ComponentEntry = {
  id: 'presence',
  label: 'Presence',
  description:
    'Who else is here. The overflow count carries its own tooltip listing the rest — a "+5" that cannot tell you who is unhelpful in exactly the moment you care.',
  usage: `import { Presence } from '@/components/ui/presence'

<Presence peers={peers} max={4} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'max', label: 'max', options: ['2', '3', '4', '6'], default: '4' },
      { type: 'select', prop: 'size', label: 'size', options: ['xs', 'sm', 'default'], default: 'sm' },
    ],
    render: (state) => (
      <Presence
        peers={PEERS}
        max={Number(state.max)}
        size={String(state.size) as 'xs' | 'sm' | 'default'}
      />
    ),
    code: (s: ComposerState) => `<Presence peers={peers} max={${s.max}} size="${s.size}" />`,
  },
  api: [
    { name: 'peers', type: 'Peer[]', description: '`{ id, name, status?, color? }` with status one of active, idle or away.' },
    { name: 'max', type: 'number', default: '4', description: 'Avatars before the overflow chip.' },
    { name: 'status', type: 'ring colour', description: 'The only thing that changes, so someone going idle does not reflow the row.' },
  ],
  demos: [
    { title: 'Viewers', code: `<Presence peers={peers} max={4} />`, render: () => <Presence peers={PEERS} /> },
  ],
}

const PEOPLE: Mentionable[] = [
  { id: '1', label: 'Ada Lovelace', description: 'Engineering' },
  { id: '2', label: 'Grace Hopper', description: 'Engineering' },
  { id: '3', label: 'Alan Turing', description: 'Research' },
  { id: '4', label: 'Katherine Johnson', description: 'Data' },
]

export const mentionInputEntry: ComponentEntry = {
  id: 'mention-input',
  label: 'Mention Input',
  description:
    'A textarea with @-mention autocomplete. The trigger only fires at a word boundary, so an email address does not open the menu halfway through every address anyone types.',
  usage: `import { MentionInput } from '@/components/ui/mention-input'

<MentionInput options={people} value={body} onValueChange={setBody} />`,
  composer: {
    tall: true,
    controls: [{ type: 'text', prop: 'trigger', label: 'trigger', default: '@' }],
    render: (state) => (
      <div className="w-full max-w-md">
        <MentionInput
          options={PEOPLE}
          trigger={String(state.trigger) || '@'}
          defaultValue="Nice catch "
          placeholder="Write a comment…"
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<MentionInput\n  options={people}\n  trigger="${s.trigger}"\n  value={body}\n  onValueChange={setBody}\n/>`,
  },
  api: [
    { name: 'options', type: 'Mentionable[]', description: '`{ id, label, description?, avatar? }`.' },
    { name: 'onMention', type: '(option) => void', description: 'Fires on insert, for collecting the mentioned ids alongside the text.' },
    { name: 'trigger', type: 'string', default: "'@'", description: 'Any prefix — `#` for issues, `/` for commands.' },
    { name: 'positioning', type: 'anchored to the field', description: 'Not to the caret: caret coordinates in a textarea need a measured mirror element and break on wrap, and a menu under the field is understood immediately.' },
  ],
  demos: [
    { title: 'Comment box', stack: true, code: `<MentionInput options={people} />`, render: () => <div className="w-full max-w-md"><MentionInput options={PEOPLE} placeholder="Write a comment…" /></div> },
  ],
}

export const userMenuEntry: ComponentEntry = {
  id: 'user-menu',
  label: 'User Menu',
  description:
    'The account button for a header or sidebar footer. The identity is repeated inside the panel, because on a collapsed rail the trigger is a bare avatar.',
  usage: `import { UserMenu } from '@/components/ui/user-menu'

<UserMenu name="Ada Lovelace" email="ada@astralyx.dev" plan="Team" actions={actions} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'compact', label: 'compact', default: false }],
    render: (state) => (
      <div className={state.compact ? 'w-fit' : 'w-full max-w-56'}>
        <UserMenu
          name="Ada Lovelace"
          email="ada@astralyx.dev"
          plan="Team plan"
          compact={Boolean(state.compact)}
          actions={[
            { id: 'profile', label: 'Profile', icon: <User />, shortcut: '⌘P' },
            { id: 'settings', label: 'Settings', icon: <Settings /> },
            { id: 'signout', label: 'Sign out', icon: <LogOut />, destructive: true, separatorBefore: true },
          ]}
        />
      </div>
    ),
    code: (s: ComposerState) =>
      `<UserMenu\n  name="Ada Lovelace"\n  email="ada@astralyx.dev"\n  plan="Team plan"\n  compact={${Boolean(s.compact)}}\n  actions={actions}\n/>`,
  },
  api: [
    { name: 'name / email / plan', type: 'string / ReactNode', description: 'Shown on the trigger and repeated in the panel.' },
    { name: 'actions', type: 'UserMenuAction[]', description: '`{ id, label, icon?, shortcut?, destructive?, separatorBefore?, onSelect? }`.' },
    { name: 'compact', type: 'boolean', default: 'false', description: 'Avatar only, for a collapsed rail. The name stays as the accessible label.' },
    { name: 'composition', type: 'DropdownMenu', description: 'Built on it rather than reimplementing a popover, so dismissal and keyboard behaviour come from the component that already handles them.' },
  ],
  demos: [
    {
      title: 'Account',
      stack: true,
      code: `<UserMenu name="Ada Lovelace" email="ada@astralyx.dev" actions={actions} />`,
      render: () => (
        <div className="w-full max-w-56">
          <UserMenu
            name="Ada Lovelace"
            email="ada@astralyx.dev"
            plan="Team plan"
            actions={[
              { id: 'profile', label: 'Profile', icon: <User />, shortcut: '⌘P' },
              { id: 'settings', label: 'Settings', icon: <Settings /> },
              { id: 'signout', label: 'Sign out', icon: <LogOut />, destructive: true, separatorBefore: true },
            ]}
          />
        </div>
      ),
    },
  ],
}

const KEYS: ApiKey[] = [
  { id: '1', name: 'Production', prefix: 'sk_live_', last4: 'a91f', created: ago(60 * 24 * 90), lastUsed: ago(14), scopes: ['read', 'write'] },
  { id: '2', name: 'CI runner', prefix: 'sk_live_', last4: '4c2e', created: ago(60 * 24 * 30), lastUsed: ago(60 * 6), scopes: ['read'] },
  { id: '3', name: 'Local development', prefix: 'sk_test_', last4: '7b10', created: ago(20), secret: 'sk_test_4f2a1c9d8e7b6a5c4d3e2f17b10' },
]

export const apiKeysEntry: ComponentEntry = {
  id: 'api-keys',
  label: 'API Keys',
  description:
    'Credentials, listed and revocable. A key is shown in full exactly once — after that only the prefix and last four, because a list that can reveal every key means a session holds every secret.',
  usage: `import { ApiKeys } from '@/components/ui/api-keys'

<ApiKeys keys={keys} onRevoke={revoke} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'revocable', label: 'revocable', default: true },
      { type: 'boolean', prop: 'empty', label: 'empty state', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <ApiKeys
          keys={state.empty ? [] : KEYS}
          now={NOW}
          onRevoke={state.revocable ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<ApiKeys keys={keys} onRevoke={revoke} />`,
  },
  api: [
    { name: 'keys', type: 'ApiKey[]', description: '`{ id, name, prefix, last4, created, lastUsed?, scopes?, secret? }`.' },
    { name: 'secret', type: 'string', description: 'Present only for a key just created. Its absence is what makes older keys unrevealable rather than a UI choice.' },
    { name: 'onRevoke', type: '(id) => void', description: 'Confirmed inline beside the key — a modal with the list hidden behind it is how the wrong key gets revoked.' },
  ],
  demos: [
    { title: 'Keys', stack: true, code: `<ApiKeys keys={keys} onRevoke={revoke} />`, render: () => <div className="w-full max-w-2xl"><ApiKeys keys={KEYS} now={NOW} onRevoke={() => {}} /></div> },
  ],
}

const INVOICES: Invoice[] = [
  { id: '1', number: 'INV-2026-0009', date: new Date('2026-08-01'), amount: 288, status: 'paid', description: '12 seats' },
  { id: '2', number: 'INV-2026-0008', date: new Date('2026-07-01'), amount: 264, status: 'paid', description: '11 seats' },
  { id: '3', number: 'INV-2026-0007', date: new Date('2026-06-01'), amount: 264, status: 'refunded', description: 'Duplicate charge' },
  { id: '4', number: 'INV-2026-0006', date: new Date('2026-05-01'), amount: 240, status: 'past_due', description: '10 seats' },
]

export const invoiceListEntry: ComponentEntry = {
  id: 'invoice-list',
  label: 'Invoice List',
  description:
    'Billing history. Amounts are right-aligned and tabular, which is the whole reason this is not a generic list — a money column that does not line up cannot be scanned.',
  usage: `import { InvoiceList } from '@/components/ui/invoice-list'

<InvoiceList invoices={invoices} onDownload={download} />`,
  composer: {
    tall: true,
    controls: [
      { type: 'boolean', prop: 'download', label: 'download action', default: true },
      { type: 'boolean', prop: 'empty', label: 'empty state', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <InvoiceList
          invoices={state.empty ? [] : INVOICES}
          onDownload={state.download ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<InvoiceList invoices={invoices} onDownload={download} />`,
  },
  api: [
    { name: 'invoices', type: 'Invoice[]', description: '`{ id, number, date, amount, currency?, status, description?, url? }`.' },
    { name: 'currency', type: 'per invoice', description: 'Not per list: an account that changed plan across a currency migration has both, and formatting the old ones with the new symbol is wrong in a way nobody notices until an audit.' },
    { name: 'status', type: "'paid' | 'open' | 'past_due' | 'refunded' | 'void'", description: 'Labelled badge, never colour alone.' },
    { name: 'url / onDownload', type: 'string / (invoice) => void', description: 'A URL renders a real download link; otherwise the callback fires.' },
  ],
  demos: [
    { title: 'Billing history', stack: true, code: `<InvoiceList invoices={invoices} />`, render: () => <div className="w-full max-w-2xl"><InvoiceList invoices={INVOICES} onDownload={() => {}} /></div> },
  ],
}
