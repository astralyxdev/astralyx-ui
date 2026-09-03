import { useState } from 'react'
import { AuditLog, type AuditEvent } from '@/components/ui/audit-log'
import { BulkActionBar } from '@/components/ui/bulk-action-bar'
import { Button } from '@/components/ui/button'
import { ModerationQueue, type ModerationItem } from '@/components/ui/moderation-queue'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

/* ----------------------------------------------------------------- audit log */

const EVENTS: AuditEvent[] = [
  {
    id: 'e1', actor: 'a.okafor@example.com', action: 'updated', target: 'role “Support agent”', at: ago(4), ip: '81.2.69.142', outcome: 'success',
    detail: { before: { permissions: ['read', 'write'] }, after: { permissions: ['read', 'write', 'delete'] } },
  },
  { id: 'e2', actor: 'system', action: 'rotated', target: 'API key sk_live_••4f21', at: ago(38), outcome: 'success' },
  { id: 'e3', actor: 'm.laurent@example.com', action: 'attempted to delete', target: 'account 88213', at: ago(96), ip: '45.83.220.11', outcome: 'denied', detail: { reason: 'missing permission: records.delete' } },
  { id: 'e4', actor: 'a.okafor@example.com', action: 'exported', target: '12,408 customer records', at: ago(210), ip: '81.2.69.142', outcome: 'success' },
  { id: 'e5', actor: 'billing-worker', action: 'failed to charge', target: 'subscription sub_9912', at: ago(400), outcome: 'error', detail: { code: 'card_declined', attempt: 3 } },
]

export const auditLogEntry: ComponentEntry = {
  id: 'audit-log',
  label: 'Audit Log',
  description:
    'Who did what to which thing, when. Denied and errored attempts are kept and marked rather than filtered out — a log of successes only tells you nothing about the attack you are looking for.',
  usage: `import { AuditLog } from '@/components/ui/audit-log'

<AuditLog events={events} searchable />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'searchable', label: 'searchable', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full">
        <AuditLog events={EVENTS} searchable={Boolean(state.searchable)} now={NOW} />
      </div>
    ),
    code: (state: ComposerState) => `<AuditLog events={events}${state.searchable ? ' searchable' : ''} />`,
  },
  api: [
    { name: 'events', type: 'AuditEvent[]', description: '`{ id, actor, action, target?, at, ip?, outcome?, detail? }`. The action is a verb, so a row reads as a sentence.' },
    { name: 'outcome', type: "'success' | 'denied' | 'error'", description: 'Marked, never filtered. A denied attempt is often the most interesting row on the page.' },
    { name: 'detail', type: 'unknown', description: 'Anything structured — a before/after pair, a payload. Rendered as an expandable JSON view, collapsed by default.' },
    { name: 'searchable', type: 'boolean', description: 'Filters across actor, action and target at once. Which field a term belongs to is not something the reader should have to decide.' },
    { name: 'timestamps', type: 'both', description: 'Relative for scanning, exact on hover and in the `<time>` element — an audit log with only "2 hours ago" is not evidence.' },
  ],
}

/* ---------------------------------------------------------- bulk action bar */

function BulkDemo() {
  const [count, setCount] = useState(3)
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setCount((c) => c + 1)}>Select one more</Button>
        <Button size="sm" variant="ghost" onClick={() => setCount(0)}>Select none</Button>
      </div>
      <BulkActionBar count={count} onClear={() => setCount(0)}>
        <Button size="sm" variant="secondary">Approve</Button>
        <Button size="sm" variant="secondary">Assign</Button>
        <Button size="sm" variant="colored" color="destructive">Delete</Button>
      </BulkActionBar>
    </div>
  )
}

export const bulkActionBarEntry: ComponentEntry = {
  id: 'bulk-action-bar',
  label: 'Bulk Action Bar',
  description:
    'The bar that appears once rows are selected. It states the count in words next to the destructive button, because "Delete" and "Delete 4,812 records" deserve different amounts of hesitation.',
  usage: `import { BulkActionBar } from '@/components/ui/bulk-action-bar'

<BulkActionBar count={selected.length} onClear={clear}>
  <Button size="sm" variant="colored" color="destructive">Delete</Button>
</BulkActionBar>`,
  composer: {
    controls: [
      { type: 'number', prop: 'count', label: 'count', default: 4, min: 0, max: 9999, step: 1 },
      { type: 'boolean', prop: 'floating', label: 'floating', default: false },
    ],
    render: (state: ComposerState) => (
      <div className="relative w-full max-w-2xl">
        <BulkActionBar count={Number(state.count)} floating={Boolean(state.floating)} onClear={() => {}}>
          <Button size="sm" variant="secondary">Approve</Button>
          <Button size="sm" variant="colored" color="destructive">Delete</Button>
        </BulkActionBar>
      </div>
    ),
    code: (state: ComposerState) =>
      `<BulkActionBar count={${state.count}}${state.floating ? ' floating' : ''} onClear={clear}>\n  <Button size="sm" variant="colored" color="destructive">Delete</Button>\n</BulkActionBar>`,
  },
  api: [
    { name: 'count', type: 'number', description: 'Selected rows. At zero the bar renders nothing at all rather than an empty shell.' },
    { name: 'onClear', type: '() => void', description: 'Deselect everything. Always reachable — a selection you cannot escape is a trap.' },
    { name: 'children', type: 'ReactNode', description: 'The actions. Put the destructive one last, and let it say what it will destroy.' },
    { name: 'floating', type: 'boolean', description: 'Overlays the content instead of taking layout space, for a long table where the bar should follow the reader.' },
    { name: 'announcement', type: 'live region', description: 'The count is announced on change, so a keyboard user selecting rows knows how many they have.' },
  ],
  demos: [
    { title: 'Following a selection', stack: true, code: `<BulkActionBar count={selected.length} onClear={clear}>…</BulkActionBar>`, render: () => <BulkDemo /> },
  ],
}

/* ------------------------------------------------------------ moderation queue */

const ITEMS: ModerationItem[] = [
  { id: 'm1', author: 'user_88213', content: 'Check out this totally legitimate investment opportunity, DM me for the link', reportedAt: ago(12), reportCount: 14, reasons: { spam: 11, scam: 3 } },
  { id: 'm2', author: 'grimwald', content: 'Honestly the update broke everything and support has been useless for a week.', reportedAt: ago(40), reportCount: 1, reasons: { harassment: 1 } },
  { id: 'm3', author: 'anon_4412', content: '[graphic image description withheld]', sensitive: true, reportedAt: ago(75), reportCount: 6, reasons: { graphic: 5, 'self-harm': 1 } },
  { id: 'm4', author: 'kestrel', content: 'Reposting because the first one got buried — free giveaway, 100 winners!', reportedAt: ago(300), reportCount: 2, reasons: { spam: 2 }, status: 'approved' },
]

export const moderationQueueEntry: ComponentEntry = {
  id: 'moderation-queue',
  label: 'Moderation Queue',
  description:
    'Reported content with its report reasons and a decision. Sensitive items are blurred until revealed, because a moderator should choose when to look at the worst thing in the queue.',
  usage: `import { ModerationQueue } from '@/components/ui/moderation-queue'

<ModerationQueue items={items} onDecide={decide} onBulkDecide={decideMany} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'bulk', label: 'bulk decisions', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-2xl">
        <ModerationQueue
          items={ITEMS}
          now={NOW}
          onDecide={() => {}}
          onBulkDecide={state.bulk ? () => {} : undefined}
        />
      </div>
    ),
    code: () => `<ModerationQueue items={items} onDecide={decide} onBulkDecide={decideMany} />`,
  },
  api: [
    { name: 'items', type: 'ModerationItem[]', description: '`{ id, author, content, sensitive?, reportedAt, reportCount?, reasons?, status? }`.' },
    { name: 'sensitive', type: 'boolean', description: 'Blurs the content behind a reveal. The reason and report count stay visible, which is often enough to decide without looking.' },
    { name: 'reasons', type: 'Record<string, number>', description: 'Reason to count. Fourteen spam reports and one harassment report are a different case from the reverse.' },
    { name: 'onDecide', type: '(id, decision) => void', description: "'approve' | 'remove' for one item." },
    { name: 'onBulkDecide', type: '(ids, decision) => void', description: 'Enables selection. Omit it and each item is decided on its own, which is right for a small, high-stakes queue.' },
  ],
}
