import { useState } from 'react'
import {
  Archive, Command as CommandIcon, File, Forward, Inbox, Pencil, Reply,
  Search, Send, Star, Tag, Trash2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommandDialog } from '@/components/ui/command'
import { ContextMenu } from '@/components/ui/context-menu'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Resizable } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle'
import { Tooltip } from '@/components/ui/tooltip'
import { AppFrame, AppFrameUser, type NavItem } from './app-frame'
import type { ExampleEntry } from './types'

const NAV: NavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: <Inbox />, badge: <Badge size="sm">2</Badge> },
  { id: 'starred', label: 'Starred', icon: <Star /> },
  { id: 'sent', label: 'Sent', icon: <Send /> },
  { id: 'drafts', label: 'Drafts', icon: <File />, badge: <Badge size="sm">1</Badge> },
  { id: 'archive', label: 'Archive', icon: <Archive /> },
  { id: 'trash', label: 'Trash', icon: <Trash2 /> },
]

const MESSAGES = [
  { id: '1', from: 'Ada Lovelace', subject: 'Squircle corners are in', preview: 'Every control now uses corner-shape, with a circular fallback where it is not supported.', body: 'The tricky part was that a superellipse at 50% radius reads as a rounded rectangle, never a capsule — so anything meant to be a circle has to opt back out explicitly.', when: '09:24', unread: true, tag: 'design', starred: true },
  { id: '2', from: 'Grace Hopper', subject: 'Toast queue review', preview: 'The provider holds the queue in React state rather than a singleton — two regions can coexist.', body: 'Timers are cleared on unmount, so a toast queued right before a route change cannot fire into a dead tree.', when: '08:02', unread: true, tag: 'review', starred: false },
  { id: '3', from: 'Alan Turing', subject: 'Re: switch thumb contrast', preview: 'bg-background was the wrong token. It reads black in dark mode and vanishes in light.', body: 'It now pairs with whatever the track is painted in, so it has contrast in all four combinations.', when: 'Yesterday', unread: false, tag: 'bug', starred: false },
  { id: '4', from: 'Katherine Johnson', subject: 'Field padding rule', preview: 'Leading padding is the vertical inset plus 4px. One number per size drives all four edges.', body: 'Changing a height recomputes every side from that one value, so nothing drifts.', when: 'Yesterday', unread: false, tag: 'design', starred: true },
  { id: '5', from: 'Margaret Hamilton', subject: 'Native dialog notes', preview: 'showModal gives the focus trap and inerting for free. Worth the backdrop CSS.', body: 'The UA stylesheet sets both inline insets, which is why a right-hand sheet needs the opposite edge released explicitly.', when: 'Mon', unread: false, tag: 'notes', starred: false },
  { id: '6', from: 'Barbara Liskov', subject: 'Menu hover states', preview: 'The button-based menus had no highlight source at all — and outline-none hid keyboard focus too.', body: 'Three sources now feed one highlight: data-highlighted, hover, and focus.', when: 'Mon', unread: false, tag: 'bug', starred: false },
]

const TAG_COLOR = { design: 'violet', review: 'blue', bug: 'destructive', notes: 'amber' } as const

function Mail() {
  const [folder, setFolder] = useState('inbox')
  const [selectedId, setSelectedId] = useState('1')
  const [filter, setFilter] = useState(['all'])
  const [query, setQuery] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [starred, setStarred] = useState(() => new Set(MESSAGES.filter((m) => m.starred).map((m) => m.id)))

  const visible = MESSAGES.filter((message) => {
    if (folder === 'starred' && !starred.has(message.id)) return false
    if (filter[0] === 'unread' && !message.unread) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${message.from} ${message.subject} ${message.preview}`
      .toLowerCase()
      .includes(needle)
  })

  const selected = visible.find((m) => m.id === selectedId) ?? visible[0]

  function toggleStar(id: string) {
    setStarred((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <AppFrame
      product="Mail"
      nav={NAV}
      active={folder}
      onNavigate={setFolder}
      title={
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold capitalize">{folder}</h1>
          <Badge size="sm">
            {visible.length}
          </Badge>
        </div>
      }
      footer={<AppFrameUser name="Ada Lovelace" plan="ada@astralyx.dev" />}
      actions={
        <div className="flex items-center gap-2">
          <Input variant="secondary"
            size="sm"
            icon={<Search />}
            placeholder="Search mail"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            clearable
            onClear={() => setQuery('')}
            containerClassName="hidden w-56 md:flex"
          />
          <Tooltip content="Command palette">
            <Button size="sm" variant="secondary" onClick={() => setPaletteOpen(true)}>
              <CommandIcon /> <Kbd keys="⌘+K" />
            </Button>
          </Tooltip>
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Pencil /> Compose
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-border flex shrink-0 items-center gap-2 border-b px-4 py-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={filter}
            onValueChange={(next) => setFilter(next.length ? next : ['all'])}
          >
            <ToggleGroupItem value="all">All mail</ToggleGroupItem>
            <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {visible.length === 0 ? (
          <div className="grid flex-1 place-items-center p-6">
            <Empty
              icon={<Search />}
              title="Nothing here"
              description={query ? `No message matches “${query}”.` : 'This folder is empty.'}
              action={query ? <Button size="sm" onClick={() => setQuery('')}>Clear search</Button> : undefined}
            />
          </div>
        ) : (
          <Resizable defaultSize={36} minSize={26} maxSize={58} className="min-h-0 flex-1">
            {/* list */}
            <ScrollArea className="border-border min-h-0 flex-1 border-e">
              <div className="divide-border divide-y">
                {visible.map((message) => (
                  <ContextMenu
                    key={message.id}
                    items={[
                      { id: 'reply', label: 'Reply', icon: <Reply /> },
                      { id: 'forward', label: 'Forward', icon: <Forward /> },
                      { id: 'star', label: starred.has(message.id) ? 'Unstar' : 'Star', icon: <Star />, onSelect: () => toggleStar(message.id) },
                      { id: 'archive', label: 'Archive', icon: <Archive /> },
                      { id: 'delete', label: 'Delete', icon: <Trash2 />, destructive: true, separatorBefore: true },
                    ]}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(message.id)}
                      className={`hover:bg-accent/60 flex w-full flex-col gap-1.5 p-4 text-start transition-colors duration-150 ease-out outline-none motion-reduce:transition-none ${
                        selected?.id === message.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {message.unread && (
                          <span className="bg-blue size-1.5 shrink-0 rounded-full" />
                        )}
                        <span className="truncate text-sm font-medium">{message.from}</span>
                        {starred.has(message.id) && (
                          <Star className="size-3 shrink-0 fill-[var(--amber)] text-[var(--amber-soft-foreground)]" />
                        )}
                        <span className="text-muted-foreground ms-auto shrink-0 text-xs">
                          {message.when}
                        </span>
                      </div>
                      <p className="truncate text-sm">{message.subject}</p>
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {message.preview}
                      </p>
                      <Badge
                        size="sm"
                        color={TAG_COLOR[message.tag as keyof typeof TAG_COLOR]}
                      >
                        <Tag /> {message.tag}
                      </Badge>
                    </button>
                  </ContextMenu>
                ))}
              </div>
            </ScrollArea>

            {/* reading pane */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="border-border flex shrink-0 items-center gap-1 border-b p-3">
                <Tooltip content="Archive">
                  <Button variant="ghost" size="icon-sm" aria-label="Archive"><Archive /></Button>
                </Tooltip>
                <Tooltip content={selected && starred.has(selected.id) ? 'Unstar' : 'Star'}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Star"
                    onClick={() => selected && toggleStar(selected.id)}
                  >
                    <Star className={selected && starred.has(selected.id) ? 'fill-[var(--amber)] text-[var(--amber-soft-foreground)]' : ''} />
                  </Button>
                </Tooltip>
                <Tooltip content="Delete">
                  <Button variant="ghost" size="icon-sm" aria-label="Delete"><Trash2 /></Button>
                </Tooltip>
                <div className="ms-auto flex items-center gap-1">
                  <Tooltip content="Reply">
                    <Button variant="ghost" size="icon-sm" aria-label="Reply"><Reply /></Button>
                  </Tooltip>
                  <Tooltip content="Forward">
                    <Button variant="ghost" size="icon-sm" aria-label="Forward"><Forward /></Button>
                  </Tooltip>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1 p-4 sm:p-6">
                {selected && (
                  <>
                    <div className="mb-5 flex items-start gap-3">
                      <Avatar name={selected.from} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{selected.from}</p>
                        <p className="text-muted-foreground text-xs">
                          to me · {selected.when}
                        </p>
                      </div>
                      <Badge size="sm" color={TAG_COLOR[selected.tag as keyof typeof TAG_COLOR]}>
                        {selected.tag}
                      </Badge>
                    </div>

                    <h2 className="mb-4 text-lg font-semibold">{selected.subject}</h2>
                    <div className="text-muted-foreground max-w-2xl space-y-4 text-sm leading-relaxed">
                      <p>{selected.preview}</p>
                      <p>{selected.body}</p>
                      <p>
                        Everything is verified against the compiled CSS rather than
                        the source, because a class that never generates looks
                        identical to one that was never written.
                      </p>
                    </div>
                  </>
                )}
              </ScrollArea>

              <Separator />

              <div className="shrink-0 space-y-2 p-3">
                <Textarea variant="secondary"
                  size="sm"
                  autoResize
                  rows={2}
                  placeholder={selected ? `Reply to ${selected.from}…` : 'Reply…'}
                />
                <div className="flex justify-end">
                  <Button size="sm"><Send /> Send</Button>
                </div>
              </div>
            </div>
          </Resizable>
        )}
      </div>

      <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
        <SheetContent side="right" width="34rem">
          <SheetHeader>
            <SheetTitle>New message</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <Input variant="secondary" placeholder="To" aria-label="To" />
            <Input variant="secondary" placeholder="Subject" aria-label="Subject" />
            <Textarea variant="secondary" rows={10} placeholder="Write your message…" aria-label="Message" />
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setComposeOpen(false)}>Discard</Button>
            <Button onClick={() => setComposeOpen(false)}><Send /> Send</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CommandDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={[
          { id: 'compose', label: 'Compose message', group: 'Mail', icon: <Pencil />, shortcut: '⌘+N', onSelect: () => setComposeOpen(true) },
          { id: 'search', label: 'Search all mail', group: 'Mail', icon: <Search /> },
          ...NAV.map((item) => ({
            id: item.id,
            label: `Go to ${item.label}`,
            group: 'Navigate',
            icon: item.icon,
            onSelect: () => setFolder(item.id),
          })),
        ]}
      />
    </AppFrame>
  )
}

export const mailExample: ExampleEntry = {
  id: 'mail',
  label: 'Mail',
  description:
    'A working inbox: folders, live search and filters, a resizable split, right-click actions, starring, a compose sheet and a command palette that navigates.',
  uses: [
    'Resizable', 'Scroll Area', 'Context Menu', 'Command', 'Sheet', 'Toggle',
    'Textarea', 'Tooltip', 'Avatar', 'Badge', 'Kbd', 'Empty', 'Separator',
  ],
  render: () => <Mail />,
}
