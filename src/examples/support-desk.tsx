import { useState } from 'react'
import {
  Bell, CircleCheck, Inbox, Paperclip, PauseCircle, Search, Send,
  ShieldAlert, ScrollText, UserPlus,
} from 'lucide-react'
import { AttachmentPreview, type Attachment } from '@/components/ui/attachment-preview'
import { AuditLog, type AuditEvent } from '@/components/ui/audit-log'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty } from '@/components/ui/empty'
import { Fmt } from '@/components/ui/fmt'
import { Input } from '@/components/ui/input'
import { MentionInput, type Mentionable } from '@/components/ui/mention-input'
import { ModerationQueue, type ModerationItem } from '@/components/ui/moderation-queue'
import { NotificationInbox, type Notification } from '@/components/ui/notification-inbox'
import { Presence, type Peer } from '@/components/ui/presence'
import { ReviewThread, type ReviewComment } from '@/components/ui/review-thread'
import { RiskScore, type RiskFactor } from '@/components/ui/risk-score'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThreadList, type Thread } from '@/components/ui/thread-list'
import { TicketCard, type TicketPriority, type TicketStatus } from '@/components/ui/ticket-card'
import { TypingIndicator } from '@/components/ui/typing-indicator'
import { focusRing, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { AppFrame, AppFrameUser, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

/**
 * A fixed "now". These pages are prerendered on the server and hydrated in the
 * browser, so anything derived from the real clock produces a different string
 * on each side and React throws away the markup — every relative timestamp in
 * this file is measured against this constant instead.
 */
const NOW = new Date('2026-09-05T09:30:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const ahead = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

type Ticket = {
  id: string
  ref: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  requester: string
  company: string
  assignee: string
  updatedAt: Date
  dueAt: Date
  replies: number
  tags: string[]
  /** Drives the typing indicator — some customers are on the page right now. */
  live?: boolean
}

const TICKETS: Ticket[] = [
  {
    id: 't-4821', ref: '#4821', subject: 'Refund for order 88213 never landed', status: 'open',
    priority: 'urgent', requester: 'Marisol Ferrer', company: 'Casa Verde Foods',
    assignee: 'Ada Lovelace', updatedAt: ago(6), dueAt: ahead(38), replies: 7,
    tags: ['billing', 'refund'], live: true,
  },
  {
    id: 't-4818', ref: '#4818', subject: 'Webhook retries stopped after the 2.4 upgrade', status: 'pending',
    priority: 'high', requester: 'Devon Reyes', company: 'Northwind Logistics',
    assignee: 'Grace Hopper', updatedAt: ago(52), dueAt: ahead(95), replies: 12,
    tags: ['api', 'regression'],
  },
  {
    id: 't-4814', ref: '#4814', subject: 'SSO login loops back to the sign-in page', status: 'open',
    priority: 'high', requester: 'Priya Nadkarni', company: 'Halberd Legal',
    assignee: 'Alan Turing', updatedAt: ago(140), dueAt: ago(20), replies: 4,
    tags: ['auth', 'saml'],
  },
  {
    id: 't-4809', ref: '#4809', subject: 'Can we raise the 2,000 rpm rate limit?', status: 'waiting',
    priority: 'normal', requester: 'Sam Idowu', company: 'Kettle & Co',
    assignee: 'Ada Lovelace', updatedAt: ago(310), dueAt: ahead(600), replies: 3,
    tags: ['limits'],
  },
  {
    id: 't-4802', ref: '#4802', subject: 'Invoice PDF shows the old VAT number', status: 'pending',
    priority: 'normal', requester: 'Iris Chen', company: 'Bright Harbour',
    assignee: 'Katherine Johnson', updatedAt: ago(480), dueAt: ahead(1_400), replies: 2,
    tags: ['billing', 'documents'],
  },
  {
    id: 't-4795', ref: '#4795', subject: 'Bulk import mangles accented names', status: 'resolved',
    priority: 'low', requester: 'Léa Marchand', company: 'Atelier Sud',
    assignee: 'Margaret Hamilton', updatedAt: ago(1_600), dueAt: ago(900), replies: 9,
    tags: ['import', 'encoding'],
  },
]

type Message = {
  id: string
  author: string
  /** Agents get the right-hand, tinted bubble; customers the plain one. */
  fromAgent?: boolean
  internal?: boolean
  at: Date
  body: string
  attachments?: Attachment[]
}

const CONVERSATIONS: Record<string, Message[]> = {
  't-4821': [
    { id: 'm1', author: 'Marisol Ferrer', at: ago(190), body: 'Order 88213 was cancelled on 28 August and the confirmation email says the £412.60 would be back within five working days. It is day eight and my statement shows nothing.' },
    { id: 'm2', author: 'Ada Lovelace', fromAgent: true, at: ago(150), body: 'Thanks Marisol — I can see the refund was authorised on our side at 09:14 on the 28th. Could you send the last two lines of the statement so I can chase the acquirer with a reference?' },
    {
      id: 'm3', author: 'Marisol Ferrer', at: ago(24), body: 'Attached. The Amex line right under it is the original charge, so it definitely went out from the same card.',
      attachments: [
        { id: 'a1', name: 'amex-statement-aug.pdf', type: 'application/pdf', size: 184_320 },
        { id: 'a2', name: 'order-88213-confirmation.png', type: 'image/png', size: 96_140 },
      ],
    },
    { id: 'm4', author: 'Grace Hopper', fromAgent: true, internal: true, at: ago(14), body: 'Internal: the acquirer batch for the 28th failed settlement and was never re-queued. This is the third one today — see the escalation tab.' },
  ],
  't-4818': [
    { id: 'm1', author: 'Devon Reyes', at: ago(600), body: 'Since we moved to 2.4 the delivery worker gives up after the first 5xx instead of backing off. We are losing roughly 4% of events.' },
    { id: 'm2', author: 'Grace Hopper', fromAgent: true, at: ago(520), body: 'Confirmed on our side — the retry budget is being read from the wrong config key. A fix is in review, and I have linked the thread here.' },
    { id: 'm3', author: 'Devon Reyes', at: ago(52), body: 'Any chance of a build we can pin to? Our peak window is Monday 06:00 UTC.' },
  ],
  't-4814': [
    { id: 'm1', author: 'Priya Nadkarni', at: ago(400), body: 'Everyone on the legal team is bounced back to the sign-in page after Okta accepts the login. Incognito behaves the same, so it is not a stale cookie.' },
    { id: 'm2', author: 'Alan Turing', fromAgent: true, at: ago(140), body: 'Your metadata rotated on the 1st and our copy still has the old signing certificate. I can upload the new one now if you paste the metadata URL.' },
  ],
  't-4809': [
    { id: 'm1', author: 'Sam Idowu', at: ago(1_000), body: 'We are hitting 429s at around 2k rpm during the morning sync. Is a temporary lift possible for September?' },
    { id: 'm2', author: 'Ada Lovelace', fromAgent: true, at: ago(310), body: 'Doable, but I need the expected ceiling and the window in writing from your account owner before I can raise it.' },
  ],
  't-4802': [
    { id: 'm1', author: 'Iris Chen', at: ago(700), body: 'Our VAT number changed in July. New invoices still carry the old one, which our accountant will not accept.' },
    { id: 'm2', author: 'Katherine Johnson', fromAgent: true, at: ago(480), body: 'Updated on the billing profile. Invoices already issued need reissuing — I can do the last three today.' },
  ],
  't-4795': [
    { id: 'm1', author: 'Léa Marchand', at: ago(2_000), body: 'Names with accents come through as “MarÃ§al” after a CSV import.' },
    { id: 'm2', author: 'Margaret Hamilton', fromAgent: true, at: ago(1_600), body: 'The importer now sniffs the byte-order mark and falls back to UTF-8 rather than latin1. Re-importing your file gives the right names.' },
  ],
}

/** Other conversations with the same customer, shown beside the open ticket. */
const HISTORY: Record<string, Thread[]> = {
  't-4821': [
    { id: 'h1', title: 'Refund for order 88213', preview: 'I still have not seen it on my statement', at: ago(24), unread: 2, participants: ['Marisol Ferrer'], attachments: 2 },
    { id: 'h2', title: 'Duplicate charge in July', preview: 'You: Refunded, reference 8812-AC.', fromMe: true, at: ago(9_100), participants: ['Marisol Ferrer'] },
    { id: 'h3', title: 'Delivery window change', preview: 'Perfect, thank you!', at: ago(41_000), participants: ['Marisol Ferrer'], muted: true },
  ],
  't-4818': [
    { id: 'h1', title: 'Webhook retries after 2.4', preview: 'Any chance of a build we can pin to?', at: ago(52), unread: 1, participants: ['Devon Reyes'] },
    { id: 'h2', title: 'Sandbox event replay', preview: 'You: Replay endpoint is live on staging.', fromMe: true, at: ago(6_200), participants: ['Devon Reyes', 'Ops'] },
  ],
  't-4814': [
    { id: 'h1', title: 'SSO login loop', preview: 'Incognito behaves the same', at: ago(140), participants: ['Priya Nadkarni'] },
    { id: 'h2', title: 'SCIM provisioning setup', preview: 'You: Token issued, expires 2027-01-04.', fromMe: true, at: ago(20_000), participants: ['Priya Nadkarni'] },
  ],
  't-4809': [{ id: 'h1', title: 'Rate limit increase', preview: 'Is a temporary lift possible?', at: ago(310), participants: ['Sam Idowu'] }],
  't-4802': [{ id: 'h1', title: 'VAT number on invoices', preview: 'Our accountant will not accept it', at: ago(480), participants: ['Iris Chen'] }],
  't-4795': [{ id: 'h1', title: 'Bulk import encoding', preview: 'You: Re-importing gives the right names.', fromMe: true, at: ago(1_600), participants: ['Léa Marchand'] }],
}

/**
 * Why the account is flagged, not just how much. An agent cannot decide to
 * issue a manual refund on the number alone.
 */
const RISK: Record<string, { score: number; factors: RiskFactor[] }> = {
  't-4821': {
    score: 24,
    factors: [
      { label: 'Second refund request in 60 days', weight: 14 },
      { label: 'Card and billing country disagree', weight: 10 },
      { label: 'Account verified since 2023', weight: -9, detail: 'Company registration matched' },
    ],
  },
  't-4818': { score: 8, factors: [{ label: 'Enterprise contract, 4 years', weight: -12 }, { label: 'API traffic up 340% this week', weight: 11 }] },
  't-4814': { score: 12, factors: [{ label: 'Six failed logins before contact', weight: 9 }, { label: 'SSO domain verified', weight: -8 }] },
  't-4809': { score: 31, factors: [{ label: 'Requested limit is 8× the plan ceiling', weight: 22 }, { label: 'Requester is not the account owner', weight: 15 }, { label: 'Paid on time for 18 months', weight: -10 }] },
  't-4802': { score: 6, factors: [{ label: 'Billing detail change within 90 days', weight: 7 }] },
  't-4795': { score: 4, factors: [{ label: 'No prior escalations', weight: -6 }] },
}

/** Engineering threads a ticket was escalated into. Most tickets have none. */
const ESCALATIONS: Record<string, { path: string; line: number; snippet: string; comments: ReviewComment[] }> = {
  't-4821': {
    path: 'services/payments/settlement-batch.ts',
    line: 118,
    snippet: '  if (batch.state === "failed") return // dropped, never re-queued',
    comments: [
      { id: 'c1', author: 'Grace Hopper', time: '2h ago', body: 'A failed batch returns early and nothing puts it back on the queue, so three refunds from the 28th are simply gone.' },
      { id: 'c2', author: 'Alan Turing', time: '40m ago', body: 'Requeue with the existing backoff helper and emit a metric — silent drops are why support found this before we did.' },
    ],
  },
  't-4818': {
    path: 'services/webhooks/delivery-worker.ts',
    line: 64,
    snippet: '  const budget = config.retry_budget ?? 0 // renamed to retries.budget in 2.4',
    comments: [
      { id: 'c1', author: 'Grace Hopper', time: '9h ago', body: 'The key was renamed in 2.4 and the old read falls through to zero, which turns every 5xx into a permanent failure.' },
    ],
  },
}

const AUDIT: Record<string, AuditEvent[]> = {
  't-4821': [
    { id: 'a1', actor: 'a.lovelace@astralyx.dev', action: 'opened', target: 'ticket #4821', at: ago(190), ip: '81.2.69.142', outcome: 'success' },
    { id: 'a2', actor: 'a.lovelace@astralyx.dev', action: 'attempted refund', target: 'order 88213', at: ago(150), ip: '81.2.69.142', outcome: 'denied', detail: { reason: 'missing permission: payments.refund.manual', limit: '£250.00' } },
    { id: 'a3', actor: 'settlement-worker', action: 'failed to settle', target: 'batch 2026-08-28-b', at: ago(120), outcome: 'error', detail: { code: 'acquirer_timeout', attempt: 1, requeued: false } },
    { id: 'a4', actor: 'g.hopper@astralyx.dev', action: 'escalated', target: 'ticket #4821 → ENG-4127', at: ago(14), ip: '81.2.69.201', outcome: 'success' },
  ],
  't-4818': [
    { id: 'a1', actor: 'd.reyes@northwind.example', action: 'opened', target: 'ticket #4818', at: ago(600), ip: '203.0.113.44', outcome: 'success' },
    { id: 'a2', actor: 'g.hopper@astralyx.dev', action: 'linked', target: 'PR #2291', at: ago(520), ip: '81.2.69.201', outcome: 'success' },
  ],
}

const MODERATION: ModerationItem[] = [
  { id: 'r1', author: 'helpful_hank', content: 'Support never replies. Call 0800-555-0199 and ask for “billing recovery”, they sort it in minutes.', reportedAt: ago(35), reportCount: 7, reasons: { 'scam number': 5, spam: 2 } },
  { id: 'r2', author: 'Priya Nadkarni', content: 'Marking this thread solved — the SAML certificate swap fixed it for the whole team.', reportedAt: ago(90), reportCount: 1, reasons: { 'wrong category': 1 } },
  { id: 'r3', author: 'anon_4471', content: 'Screenshot of another customer’s invoice, posted in the public forum thread about VAT numbers.', sensitive: true, reportedAt: ago(150), reportCount: 12, reasons: { 'personal data': 9, 'off topic': 3 } },
  { id: 'r4', author: 'Sam Idowu', content: 'Anyone else getting 429s at exactly 2,000 rpm? Feels like a hard cap rather than a burst limit.', reportedAt: ago(320), reportCount: 2, reasons: { 'off topic': 2 } },
]

const NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'SLA breach in 40 minutes', description: '#4821 · Refund for order 88213', time: ago(4), icon: <PauseCircle className="text-[var(--amber-soft-foreground)]" /> },
  { id: 'n2', title: 'Grace Hopper mentioned you', description: '“see the escalation tab” on #4821', time: ago(14), actor: 'Grace Hopper' },
  { id: 'n3', title: '#4814 has already breached', description: 'Due 20 minutes ago · Alan Turing', time: ago(20), icon: <ShieldAlert className="text-[var(--destructive)]" /> },
  { id: 'n4', title: 'Devon Reyes replied', description: '#4818 · “Any chance of a build we can pin to?”', time: ago(52), actor: 'Devon Reyes' },
  { id: 'n5', title: 'Weekly CSAT summary', description: '94.1% across 812 rated conversations', time: ago(1_400), read: true },
]

const TEAM: Mentionable[] = [
  { id: 'u1', label: 'Grace Hopper', description: 'Payments escalations' },
  { id: 'u2', label: 'Alan Turing', description: 'Identity and SSO' },
  { id: 'u3', label: 'Katherine Johnson', description: 'Billing operations' },
  { id: 'u4', label: 'Margaret Hamilton', description: 'Data and imports' },
  { id: 'u5', label: 'Barbara Liskov', description: 'Support lead' },
]

const PEERS: Peer[] = [
  { id: 'p1', name: 'Ada Lovelace', status: 'active' },
  { id: 'p2', name: 'Grace Hopper', status: 'active' },
  { id: 'p3', name: 'Barbara Liskov', status: 'idle' },
  { id: 'p4', name: 'Alan Turing', status: 'away' },
  { id: 'p5', name: 'Katherine Johnson', status: 'active' },
]

/** Canned files the Attach button adds — a picker is not the point here. */
const STOCK_FILES: Attachment[] = [
  { id: 'd1', name: 'refund-trace-88213.csv', type: 'text/csv', size: 12_408 },
  { id: 'd2', name: 'acquirer-batch-log.txt', type: 'text/plain', size: 48_902 },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'In progress' },
  { value: 'waiting', label: 'Waiting on customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function SupportDesk() {
  const [section, setSection] = useState('queue')
  const [selectedId, setSelectedId] = useState('t-4821')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('open')

  // Status lives outside TICKETS so the queue card, the header select and the
  // bulk bar all read and write the same value rather than three copies of it.
  const [statuses, setStatuses] = useState<Record<string, TicketStatus>>(() =>
    Object.fromEntries(TICKETS.map((ticket) => [ticket.id, ticket.status])) as Record<string, TicketStatus>,
  )
  const [checked, setChecked] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [sent, setSent] = useState<Record<string, Message[]>>({})
  const [historyId, setHistoryId] = useState('h1')
  const [resolved, setResolved] = useState<string[]>([])
  const [replies, setReplies] = useState<Record<string, ReviewComment[]>>({})
  const [extraAudit, setExtraAudit] = useState<Record<string, AuditEvent[]>>({})
  const [read, setRead] = useState<string[]>(NOTIFICATIONS.filter((n) => n.read).map((n) => n.id))
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'removed'>>({})

  const ticket = TICKETS.find((item) => item.id === selectedId) ?? TICKETS[0]
  const status = statuses[ticket.id]
  const escalation = ESCALATIONS[ticket.id]
  const messages = [...(CONVERSATIONS[ticket.id] ?? []), ...(sent[ticket.id] ?? [])]
  const audit = [...(extraAudit[ticket.id] ?? []), ...(AUDIT[ticket.id] ?? [])]

  const needle = query.trim().toLowerCase()
  const visible = TICKETS.filter((item) => {
    const state = statuses[item.id]
    if (filter === 'open' && (state === 'resolved' || state === 'closed')) return false
    // Breach uses the same rule the card does: waiting on the customer stops
    // the SLA clock, so an overdue-looking waiting ticket has not breached.
    if (filter === 'breached' && !((state === 'open' || state === 'pending') && item.dueAt < NOW)) return false
    if (!needle) return true
    return `${item.ref} ${item.subject} ${item.requester} ${item.company}`.toLowerCase().includes(needle)
  })

  const openCount = TICKETS.filter((item) => statuses[item.id] === 'open' || statuses[item.id] === 'pending').length
  const unread = NOTIFICATIONS.filter((item) => !read.includes(item.id)).length
  const pendingModeration = MODERATION.filter((item) => !decisions[item.id]).length

  /** One writer for status, so the audit trail cannot drift from the state. */
  function setStatus(ids: string[], next: TicketStatus, note: string) {
    setStatuses((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, next])) }))
    setExtraAudit((current) => {
      const copy = { ...current }
      for (const id of ids) {
        const existing = copy[id] ?? []
        copy[id] = [
          { id: `x${id}-${existing.length}`, actor: 'a.lovelace@astralyx.dev', action: note, target: TICKETS.find((t) => t.id === id)?.ref, at: NOW, ip: '81.2.69.142', outcome: 'success' },
          ...existing,
        ]
      }
      return copy
    })
  }

  function send() {
    const body = draft.trim()
    if (!body) return
    const existing = sent[ticket.id] ?? []
    setSent((current) => ({
      ...current,
      [ticket.id]: [
        ...existing,
        { id: `s${existing.length}`, author: 'Ada Lovelace', fromAgent: true, at: NOW, body, attachments: files.length ? files : undefined },
      ],
    }))
    setDraft('')
    setFiles([])
    // Replying puts the ball back in the customer's court, which is exactly
    // what pauses the SLA clock on the card.
    setStatus([ticket.id], 'waiting', 'replied to')
  }

  const nav: NavItem[] = [
    { id: 'queue', label: 'Queue', icon: <Inbox />, badge: <Badge size="sm">{openCount}</Badge> },
    { id: 'notifications', label: 'Notifications', icon: <Bell />, badge: unread ? <Badge size="sm" color="blue">{unread}</Badge> : undefined },
    { id: 'moderation', label: 'Moderation', icon: <ShieldAlert />, badge: pendingModeration ? <Badge size="sm" color="amber">{pendingModeration}</Badge> : undefined },
    { id: 'audit', label: 'Audit trail', icon: <ScrollText /> },
  ]

  const aside =
    section === 'queue' ? (
      <div className="space-y-4 p-4">
        <Card size="sm">
          <CardHeader size="sm">
            <CardTitle as="h2">On this ticket</CardTitle>
            <CardDescription>{ticket.company}</CardDescription>
          </CardHeader>
          <CardBody size="sm" className="space-y-3">
            <Presence peers={PEERS} max={4} label="Viewing this ticket" />
            <Separator label="assignee" />
            <div className="flex items-center gap-2.5">
              <Avatar size="sm" name={ticket.assignee} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ticket.assignee}</p>
                <p className="text-muted-foreground truncate text-xs">{ticket.replies} replies · {ticket.tags.join(', ')}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card size="sm">
          <CardHeader size="sm">
            <CardTitle as="h2">Account risk</CardTitle>
          </CardHeader>
          <CardBody size="sm">
            <RiskScore size="sm" score={RISK[ticket.id].score} factors={RISK[ticket.id].factors} />
          </CardBody>
        </Card>

        <div className="space-y-2">
          <p className="text-muted-foreground px-1 text-xs font-medium">
            Earlier from {ticket.requester}
          </p>
          <ThreadList threads={HISTORY[ticket.id]} selected={historyId} onSelect={setHistoryId} now={NOW} />
        </div>
      </div>
    ) : (
      <div className="space-y-4 p-4">
        <Card size="sm">
          <CardHeader size="sm">
            <CardTitle as="h2">Desk right now</CardTitle>
            <CardDescription>Five agents on shift.</CardDescription>
          </CardHeader>
          <CardBody size="sm" className="space-y-3">
            <Presence peers={PEERS} max={5} label="Agents online" />
            <Separator />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Open tickets</dt>
                <dd className="tabular-nums">{openCount}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Awaiting moderation</dt>
                <dd className="tabular-nums">{pendingModeration}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Unread alerts</dt>
                <dd className="tabular-nums">{unread}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    )

  return (
    <AppFrame
      product="Support Desk"
      nav={nav}
      active={section}
      onNavigate={setSection}
      title={section === 'queue' ? `${ticket.ref} · ${ticket.subject}` : nav.find((item) => item.id === section)?.label}
      footer={<AppFrameUser name="Ada Lovelace" plan="Tier 2 · Payments" />}
      aside={aside}
      actions={
        <div className="flex items-center gap-2">
          <Input
            variant="secondary"
            size="sm"
            icon={<Search />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tickets"
            clearable
            onClear={() => setQuery('')}
            containerClassName="hidden w-56 lg:flex"
          />
          <Button size="sm" variant="secondary">
            <UserPlus /> Assign
          </Button>
        </div>
      }
    >
      {section === 'queue' && (
        <div className="flex h-full min-h-0">
          <div className="border-border hidden w-[22rem] shrink-0 flex-col border-e lg:flex">
            <div className="border-border shrink-0 border-b px-3 py-2">
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList variant="underline">
                  <TabsTrigger value="open" variant="underline">Unresolved</TabsTrigger>
                  <TabsTrigger value="breached" variant="underline">Breached</TabsTrigger>
                  <TabsTrigger value="all" variant="underline">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {visible.length === 0 ? (
                <Empty
                  icon={<Search />}
                  title="Nothing matches"
                  description="No ticket in this view matches the search."
                />
              ) : (
                visible.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <Checkbox
                      containerClassName="mt-4"
                      aria-label={`Select ticket ${item.ref}`}
                      checked={checked.includes(item.id)}
                      onChange={() =>
                        setChecked((current) =>
                          current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id],
                        )
                      }
                    />
                    {/*
                      The card is an <article>, so it cannot be wrapped in a
                      button without nesting interactive content illegally —
                      keyboard activation is wired by hand instead.
                    */}
                    <TicketCard
                      id={item.ref}
                      subject={item.subject}
                      status={statuses[item.id]}
                      priority={item.priority}
                      requester={`${item.requester} · ${item.company}`}
                      assignee={item.assignee}
                      updatedAt={item.updatedAt}
                      dueAt={item.dueAt}
                      now={NOW}
                      replies={item.replies}
                      tags={item.tags.map((tag) => (
                        <Badge key={tag} size="sm" shape="rounded">{tag}</Badge>
                      ))}
                      role="button"
                      tabIndex={0}
                      aria-pressed={item.id === selectedId}
                      onClick={() => { setSelectedId(item.id); setHistoryId('h1'); setDraft('') }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedId(item.id)
                          setHistoryId('h1')
                          setDraft('')
                        }
                      }}
                      className={cn(
                        'min-w-0 flex-1 cursor-pointer text-start',
                        focusRing,
                        item.id === selectedId && 'ring-2 ring-[var(--primary)]',
                      )}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-border flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3">
              <Avatar size="sm" name={ticket.requester} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ticket.requester}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {ticket.company} · {ticket.ref}
                </p>
              </div>
              <Select
                size="sm"
                variant="secondary"
                triggerLabel="Ticket status"
                className="w-48"
                value={status}
                options={STATUS_OPTIONS}
                onValueChange={(next) => setStatus([ticket.id], next as TicketStatus, `set status to ${next}`)}
              />
            </div>

            <Tabs defaultValue="conversation" className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="border-border shrink-0 border-b px-4 py-2">
                <TabsList variant="underline">
                  <TabsTrigger value="conversation" variant="underline">Conversation</TabsTrigger>
                  <TabsTrigger value="escalation" variant="underline">Escalation</TabsTrigger>
                  <TabsTrigger value="activity" variant="underline">Activity</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="conversation" className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn('flex gap-2.5', message.fromAgent && 'flex-row-reverse')}
                    >
                      <Avatar size="xs" name={message.author} className="mt-1 shrink-0" />
                      <div className={cn('min-w-0 max-w-xl space-y-2', message.fromAgent && 'items-end')}>
                        <div
                          className={cn(
                            'p-3 text-sm',
                            radius.surface,
                            message.internal
                              ? 'bg-[var(--amber-soft)] text-[var(--amber-soft-foreground)]'
                              : message.fromAgent
                                ? 'bg-accent text-accent-foreground'
                                : 'border-border bg-card border',
                          )}
                        >
                          <p className="mb-1 flex flex-wrap items-baseline gap-x-1.5 text-xs font-medium">
                            {message.author}
                            {message.internal && <span className="opacity-70">· internal note</span>}
                            <Fmt
                              type="relative"
                              value={message.at}
                              now={NOW}
                              className="font-normal opacity-70"
                            />
                          </p>
                          {message.body}
                        </div>
                        {message.attachments?.map((file) => (
                          <AttachmentPreview key={file.id} attachment={file} onDownload={() => {}} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-border shrink-0 space-y-2 border-t p-3">
                  {ticket.live && status !== 'resolved' && status !== 'closed' && (
                    <TypingIndicator names={[ticket.requester]} showAvatars />
                  )}
                  {files.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {files.map((file) => (
                        <AttachmentPreview
                          key={file.id}
                          attachment={file}
                          compact
                          onRemove={(id) => setFiles((current) => current.filter((f) => f.id !== id))}
                        />
                      ))}
                    </div>
                  )}
                  <MentionInput
                    options={TEAM}
                    value={draft}
                    onValueChange={setDraft}
                    rows={3}
                    placeholder={`Reply to ${ticket.requester.split(' ')[0]} — type @ to loop in a teammate`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={files.length === STOCK_FILES.length}
                      onClick={() => setFiles(STOCK_FILES)}
                    >
                      <Paperclip /> Attach trace
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setStatus([ticket.id], 'resolved', 'resolved')}
                      >
                        <CircleCheck /> Resolve
                      </Button>
                      <Button size="sm" disabled={!draft.trim()} onClick={send}>
                        <Send /> Send reply
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="escalation" className="min-h-0 flex-1 overflow-y-auto p-4">
                {escalation ? (
                  <div className="max-w-3xl space-y-3">
                    <p className="text-muted-foreground text-sm">
                      Engineering thread linked to {ticket.ref}. Resolving it here reports the
                      intent — the review tool owns the truth.
                    </p>
                    <ReviewThread
                      path={escalation.path}
                      line={escalation.line}
                      snippet={escalation.snippet}
                      comments={[...escalation.comments, ...(replies[ticket.id] ?? [])]}
                      resolved={resolved.includes(ticket.id)}
                      onResolve={() =>
                        setResolved((current) =>
                          current.includes(ticket.id)
                            ? current.filter((id) => id !== ticket.id)
                            : [...current, ticket.id],
                        )
                      }
                      onReply={(body) =>
                        setReplies((current) => {
                          const existing = current[ticket.id] ?? []
                          return {
                            ...current,
                            [ticket.id]: [
                              ...existing,
                              { id: `r${existing.length}`, author: 'Ada Lovelace', time: 'just now', body, pending: true },
                            ],
                          }
                        })
                      }
                    />
                  </div>
                ) : (
                  <Empty
                    icon={<ShieldAlert />}
                    title="Not escalated"
                    description="No engineering thread is linked to this ticket yet."
                    action={<Button size="sm" variant="secondary">Escalate to engineering</Button>}
                  />
                )}
              </TabsContent>

              <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto p-4">
                {audit.length > 0 ? (
                  <AuditLog className="max-w-3xl" events={audit} now={NOW} />
                ) : (
                  <Empty icon={<ScrollText />} title="No recorded activity" description="Nothing has been logged against this ticket." />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <BulkActionBar
            count={checked.length}
            onClear={() => setChecked([])}
            label={(count) => `${count} ticket${count === 1 ? '' : 's'} selected`}
          >
            <Button size="sm" variant="secondary" onClick={() => { setStatus(checked, 'pending', 'assigned to Ada Lovelace'); setChecked([]) }}>
              Assign to me
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setStatus(checked, 'waiting', 'set waiting on customer'); setChecked([]) }}>
              Waiting on customer
            </Button>
            <Button size="sm" variant="colored" color="green" onClick={() => { setStatus(checked, 'resolved', 'resolved'); setChecked([]) }}>
              Resolve
            </Button>
          </BulkActionBar>
        </div>
      )}

      {section === 'notifications' && (
        <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
          <NotificationInbox
            notifications={NOTIFICATIONS.map((item) => ({
              ...item,
              read: read.includes(item.id),
              onSelect: () => setSection('queue'),
            }))}
            now={NOW}
            onRead={(id) => setRead((current) => (current.includes(id) ? current : [...current, id]))}
            onReadAll={() => setRead(NOTIFICATIONS.map((item) => item.id))}
          />
        </div>
      )}

      {section === 'moderation' && (
        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
          <p className="text-muted-foreground text-sm">
            Public forum posts reported by customers. Decisions are reported to the server, so
            two moderators working the same queue cannot both act on one item.
          </p>
          <ModerationQueue
            now={NOW}
            items={MODERATION.map((item) => ({ ...item, status: decisions[item.id] ?? 'pending' }))}
            onDecide={(id, decision) =>
              setDecisions((current) => ({ ...current, [id]: decision === 'approve' ? 'approved' : 'removed' }))
            }
            onBulkDecide={(ids, decision) =>
              setDecisions((current) => ({
                ...current,
                ...Object.fromEntries(ids.map((id) => [id, decision === 'approve' ? 'approved' : 'removed'])),
              }))
            }
          />
        </div>
      )}

      {section === 'audit' && (
        <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
          <p className="text-muted-foreground text-sm">
            Every action taken on the desk, including the ones that were refused — a log of
            successes only would hide the refund an agent was not allowed to issue.
          </p>
          <AuditLog
            events={Object.values(extraAudit).flat().concat(Object.values(AUDIT).flat())}
            now={NOW}
          />
        </div>
      )}
    </AppFrame>
  )
}

export const supportDeskExample: ExampleEntry = {
  id: 'support-desk',
  label: 'Support Desk',
  description:
    'A ticket queue and the conversation behind one: SLA-aware ticket cards, bulk triage, an escalation thread, a mention-aware composer with attachments, and the audit trail every action writes to.',
  uses: [
    'Ticket Card', 'Thread List', 'Notification Inbox', 'Moderation Queue',
    'Review Thread', 'Typing Indicator', 'Attachment Preview', 'Mention Input',
    'Presence', 'Bulk Action Bar', 'Risk Score', 'Audit Log',
  ],
  render: () => <SupportDesk />,
}
