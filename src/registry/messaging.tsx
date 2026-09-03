import { useState } from 'react'
import { AttachmentPreview, type Attachment } from '@/components/ui/attachment-preview'
import { ThreadList, type Thread } from '@/components/ui/thread-list'
import { TicketCard, type TicketPriority, type TicketStatus } from '@/components/ui/ticket-card'
import { TypingIndicator } from '@/components/ui/typing-indicator'
import type { ComponentEntry, ComposerState } from './types'

const NOW = new Date('2026-09-02T08:00:00')
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)
const inMinutes = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

/* -------------------------------------------------------------- thread list */

const THREADS: Thread[] = [
  { id: 't1', title: 'Refund for order 88213', preview: 'I still have not seen it on my statement', at: ago(3), unread: 2, participants: ['Ada Okafor'] },
  { id: 't2', title: 'Integration questions', preview: 'Thanks, that worked perfectly.', fromMe: true, at: ago(94), participants: ['Marc Laurent', 'Iris Chen'], attachments: 2 },
  { id: 't3', title: 'API rate limits', preview: 'We are hitting 429s at around 2k rpm', at: ago(310), unread: 5, participants: ['Devon Reyes'] },
  { id: 't4', title: 'Contract renewal', preview: 'Sending the redlines across this afternoon', at: ago(2_600), participants: ['Legal', 'Priya N.'], muted: true },
  { id: 't5', title: 'Onboarding call notes', preview: 'Recording is attached.', fromMe: true, at: ago(9_100), participants: ['Sam Idowu'], attachments: 1 },
]

function ThreadDemo() {
  const [selected, setSelected] = useState('t1')
  return (
    <div className="w-full max-w-sm">
      <ThreadList threads={THREADS} selected={selected} onSelect={setSelected} now={NOW} />
    </div>
  )
}

export const threadListEntry: ComponentEntry = {
  id: 'thread-list',
  label: 'Thread List',
  description:
    'An inbox of conversations. Unread is carried by weight and a count, not by colour alone, and the timestamp coarsens with age — a message from March does not need a clock time.',
  usage: `import { ThreadList } from '@/components/ui/thread-list'

<ThreadList threads={threads} selected={id} onSelect={setId} />`,
  composer: {
    tall: true,
    controls: [{ type: 'boolean', prop: 'selectable', label: 'selectable', default: true }],
    render: (state: ComposerState) => (
      <div className="w-full max-w-sm">
        <ThreadList
          threads={THREADS}
          selected={state.selectable ? 't1' : undefined}
          onSelect={state.selectable ? () => {} : undefined}
          now={NOW}
        />
      </div>
    ),
    code: () => `<ThreadList threads={threads} selected={id} onSelect={setId} />`,
  },
  api: [
    { name: 'threads', type: 'Thread[]', description: '`{ id, title, preview?, fromMe?, at?, unread?, participants?, attachments?, muted? }`.' },
    { name: 'unread', type: 'number', description: 'A count, not a boolean. Two unread and forty unread are different situations, and the badge is what makes the row legible in monochrome.' },
    { name: 'fromMe', type: 'boolean', description: 'Prefixes the preview with "You:", which is how you tell "they replied" from "you are waiting" at a glance.' },
    { name: 'muted', type: 'boolean', description: 'Dims the row and suppresses the unread emphasis without hiding the count.' },
    { name: 'timestamps', type: 'coarsening', description: 'Time today, weekday this week, date beyond that. Precision that stops being useful stops being shown.' },
  ],
  demos: [
    { title: 'Selectable inbox', stack: true, code: `const [selected, setSelected] = useState('t1')\n\n<ThreadList threads={threads} selected={selected} onSelect={setSelected} />`, render: () => <ThreadDemo /> },
  ],
}

/* --------------------------------------------------------------- ticket card */

export const ticketCardEntry: ComponentEntry = {
  id: 'ticket-card',
  label: 'Ticket Card',
  description:
    'A support ticket with its SLA. Breach risk is computed from the due time, not from how old the ticket is — a two-week ticket with a monthly SLA is fine, and an hour-old one may not be.',
  usage: `import { TicketCard } from '@/components/ui/ticket-card'

<TicketCard id="#4821" subject="Refund not received" status="open" priority="high" dueAt={due} />`,
  composer: {
    controls: [
      { type: 'select', prop: 'status', label: 'status', options: ['open', 'pending', 'waiting', 'resolved', 'closed'], default: 'open' },
      { type: 'select', prop: 'priority', label: 'priority', options: ['urgent', 'high', 'normal', 'low'], default: 'high' },
      { type: 'number', prop: 'due', label: 'due in (min)', default: 45, min: -240, max: 2880, step: 15 },
    ],
    render: (state: ComposerState) => (
      <div className="w-full max-w-md">
        <TicketCard
          id="#4821"
          subject="Refund for order 88213 has not arrived"
          status={state.status as TicketStatus}
          priority={state.priority as TicketPriority}
          requester="Ada Okafor"
          assignee="Devon Reyes"
          updatedAt={ago(22)}
          dueAt={inMinutes(Number(state.due))}
          now={NOW}
          replies={6}
        />
      </div>
    ),
    code: (state: ComposerState) =>
      `<TicketCard\n  id="#4821"\n  subject="Refund not received"\n  status="${state.status}"\n  priority="${state.priority}"\n  dueAt={due}\n/>`,
  },
  api: [
    { name: 'status / priority', type: 'TicketStatus / TicketPriority', description: 'Separate axes. An urgent ticket that is resolved is not the same as a normal one that is open, and one badge cannot say both.' },
    { name: 'dueAt', type: 'Date', description: 'The SLA target. Approaching and breached states are derived from it; age alone never triggers a warning.' },
    { name: 'requester / assignee', type: 'ReactNode', description: 'Unassigned is stated in words rather than left blank — an empty slot reads as a rendering bug.' },
    { name: 'replies', type: 'number', description: 'Reply count. A ticket with no replies and a passing SLA is the one to pick up.' },
  ],
}

/* --------------------------------------------------------- typing indicator */

export const typingIndicatorEntry: ComponentEntry = {
  id: 'typing-indicator',
  label: 'Typing Indicator',
  description:
    'Who is currently typing. The animation is decorative and hidden from assistive tech; the sentence beside it is the actual content, and it is what gets announced.',
  usage: `import { TypingIndicator } from '@/components/ui/typing-indicator'

<TypingIndicator names={['Ada', 'Marc']} />`,
  composer: {
    controls: [
      { type: 'number', prop: 'people', label: 'people typing', default: 1, min: 0, max: 4, step: 1 },
      { type: 'boolean', prop: 'avatars', label: 'avatars', default: false },
    ],
    render: (state: ComposerState) => (
      <TypingIndicator
        names={['Ada', 'Marc', 'Iris', 'Devon'].slice(0, Number(state.people))}
        showAvatars={Boolean(state.avatars)}
      />
    ),
    code: (state: ComposerState) =>
      `<TypingIndicator names={[${['Ada', 'Marc', 'Iris', 'Devon'].slice(0, Number(state.people)).map((n) => `'${n}'`).join(', ')}]} />`,
  },
  api: [
    { name: 'names', type: 'string[]', description: 'Empty renders nothing. One and two are named; three or more collapse to "several people", because a list of five names is longer than the messages.' },
    { name: 'showAvatars', type: 'boolean', description: 'Stacked avatars instead of names, for a narrow column.' },
    { name: 'motion', type: 'respects preference', description: 'The dots stop animating under `prefers-reduced-motion`; the text stays, since it carried the meaning all along.' },
    { name: 'announcement', type: 'polite', description: 'A live region set to polite, so it never interrupts a message being read.' },
  ],
}

/* ------------------------------------------------------- attachment preview */

const FILES: Attachment[] = [
  { id: 'f1', name: 'contract-renewal-2026.pdf', type: 'application/pdf', size: 842_113, url: '#' },
  { id: 'f2', name: 'dashboard-mock.png', type: 'image/png', size: 2_411_902, url: '#' },
  { id: 'f3', name: 'export.csv', type: 'text/csv', size: 19_204, url: '#' },
]

export const attachmentPreviewEntry: ComponentEntry = {
  id: 'attachment-preview',
  label: 'Attachment Preview',
  description:
    'A file chip with an icon chosen from the MIME type. Never from the extension: a `.dat` that is really a PDF should show a PDF, and a `.pdf` that is really an executable should not.',
  usage: `import { AttachmentPreview } from '@/components/ui/attachment-preview'

<AttachmentPreview attachment={file} onRemove={remove} onDownload={download} />`,
  composer: {
    controls: [
      { type: 'boolean', prop: 'compact', label: 'compact', default: false },
      { type: 'boolean', prop: 'removable', label: 'removable', default: true },
      { type: 'select', prop: 'state', label: 'state', options: ['done', 'uploading', 'error'], default: 'done' },
    ],
    render: (state: ComposerState) => (
      <div className="flex w-full max-w-sm flex-col gap-2">
        {FILES.map((file, index) => (
          <AttachmentPreview
            key={file.id}
            compact={Boolean(state.compact)}
            onRemove={state.removable ? () => {} : undefined}
            onDownload={() => {}}
            attachment={{
              ...file,
              progress: state.state === 'uploading' && index === 0 ? 0.42 : undefined,
              error: state.state === 'error' && index === 0 ? 'Upload failed — file too large' : undefined,
            }}
          />
        ))}
      </div>
    ),
    code: () => `<AttachmentPreview attachment={file} onRemove={remove} onDownload={download} />`,
  },
  api: [
    { name: 'attachment', type: 'Attachment', description: '`{ id, name, type?, size?, url?, thumbnail?, progress?, error? }`.' },
    { name: 'icon', type: 'from MIME type', description: 'Chosen from `type`, falling back to the extension only when no type is given.' },
    { name: 'progress', type: 'number', description: '0–1 while uploading. Omit once complete; a bar stuck at 100% is indistinguishable from one that stalled.' },
    { name: 'name', type: 'middle-truncated', description: 'The extension is preserved when the name is trimmed, since it is the most informative part of a long filename.' },
    { name: 'compact', type: 'boolean', description: 'A single-line chip for an inline message, rather than a card in a list.' },
  ],
}
