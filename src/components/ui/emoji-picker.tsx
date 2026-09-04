import { useMemo, useRef, useState, type ComponentProps } from 'react'
import { Search } from 'lucide-react'
import { fieldBase, fieldOutline, focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * A grid of emoji, grouped, searchable, with recents.
 *
 * **The list is a prop with a small curated default, not all 3,700.** A full
 * emoji set with keywords is roughly 200 kB of JSON before any images, and it
 * has to be updated with every Unicode release. Most products need the
 * reactions people actually use; if you need the whole set, pass it — the
 * component does not care how long the array is.
 *
 * **They are rendered as text, not images.** System emoji fonts are already
 * installed, already the right style for the platform, scale as text, and cost
 * nothing to load. Sprite sheets exist to make emoji look identical everywhere,
 * which is a design goal worth having only if you are also willing to ship and
 * maintain the sheet.
 *
 * **Recents live with the caller.** This component never touches
 * `localStorage`: a picker that writes to storage on its own cannot be
 * server-rendered predictably, cannot be reset by the app, and puts a key in
 * someone's browser they did not choose. `recent` and `onSelect` are enough for
 * the caller to persist it wherever they already persist preferences.
 *
 * The grid is one tab stop with arrow-key movement — a roving tabindex —
 * because eight tab stops per row is unusable with a keyboard.
 */
export type Emoji = {
  char: string
  name: string
  group: string
  /** Extra search terms beyond the name. */
  keywords?: string[]
}

/** A small, opinionated default: the ones that get used. */
export const COMMON_EMOJI: Emoji[] = [
  { char: '👍', name: 'thumbs up', group: 'Reactions', keywords: ['yes', 'ok', 'approve'] },
  { char: '👎', name: 'thumbs down', group: 'Reactions', keywords: ['no', 'reject'] },
  { char: '❤️', name: 'heart', group: 'Reactions', keywords: ['love', 'like'] },
  { char: '🎉', name: 'party popper', group: 'Reactions', keywords: ['celebrate', 'ship'] },
  { char: '🚀', name: 'rocket', group: 'Reactions', keywords: ['ship', 'launch', 'deploy'] },
  { char: '👀', name: 'eyes', group: 'Reactions', keywords: ['looking', 'review'] },
  { char: '🔥', name: 'fire', group: 'Reactions', keywords: ['hot', 'good'] },
  { char: '✅', name: 'check mark', group: 'Reactions', keywords: ['done', 'pass'] },
  { char: '❌', name: 'cross mark', group: 'Reactions', keywords: ['no', 'fail'] },
  { char: '⚠️', name: 'warning', group: 'Reactions', keywords: ['careful', 'risk'] },

  { char: '😀', name: 'grinning', group: 'Smileys', keywords: ['happy', 'smile'] },
  { char: '😂', name: 'tears of joy', group: 'Smileys', keywords: ['laugh', 'lol'] },
  { char: '🙂', name: 'slight smile', group: 'Smileys' },
  { char: '😅', name: 'sweat smile', group: 'Smileys', keywords: ['phew'] },
  { char: '🤔', name: 'thinking', group: 'Smileys', keywords: ['hmm', 'consider'] },
  { char: '😍', name: 'heart eyes', group: 'Smileys', keywords: ['love'] },
  { char: '😢', name: 'crying', group: 'Smileys', keywords: ['sad'] },
  { char: '😴', name: 'sleeping', group: 'Smileys', keywords: ['tired', 'zzz'] },
  { char: '🤯', name: 'mind blown', group: 'Smileys', keywords: ['wow'] },
  { char: '🫠', name: 'melting face', group: 'Smileys', keywords: ['hot', 'stress'] },

  { char: '💻', name: 'laptop', group: 'Work', keywords: ['code', 'dev'] },
  { char: '🐛', name: 'bug', group: 'Work', keywords: ['issue', 'defect'] },
  { char: '📦', name: 'package', group: 'Work', keywords: ['release', 'ship', 'npm'] },
  { char: '🧪', name: 'test tube', group: 'Work', keywords: ['test', 'experiment'] },
  { char: '📈', name: 'chart up', group: 'Work', keywords: ['growth', 'metrics'] },
  { char: '📉', name: 'chart down', group: 'Work', keywords: ['drop', 'regression'] },
  { char: '🔧', name: 'wrench', group: 'Work', keywords: ['fix', 'config'] },
  { char: '🔒', name: 'locked', group: 'Work', keywords: ['security', 'private'] },
  { char: '📝', name: 'memo', group: 'Work', keywords: ['note', 'docs'] },
  { char: '⏰', name: 'alarm clock', group: 'Work', keywords: ['deadline', 'time'] },

  { char: '☕', name: 'coffee', group: 'Life', keywords: ['break'] },
  { char: '🍕', name: 'pizza', group: 'Life', keywords: ['food'] },
  { char: '🌧️', name: 'rain', group: 'Life', keywords: ['weather'] },
  { char: '🌞', name: 'sun', group: 'Life', keywords: ['weather', 'sunny'] },
  { char: '🐙', name: 'octopus', group: 'Life', keywords: ['git', 'octocat'] },
  { char: '🐈', name: 'cat', group: 'Life', keywords: ['pet'] },
  { char: '🎧', name: 'headphone', group: 'Life', keywords: ['music', 'focus'] },
  { char: '✈️', name: 'airplane', group: 'Life', keywords: ['travel', 'ooo'] },
]

type EmojiPickerProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  emoji?: Emoji[]
  onSelect?: (emoji: Emoji) => void
  /** Characters, most recent first. Persisted by the caller, not by this. */
  recent?: string[]
  recentLabel?: string
  columns?: number
  searchable?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
  /** Height of the scrolling area. */
  height?: number
  label?: string
}

function EmojiPicker({
  emoji = COMMON_EMOJI,
  onSelect,
  recent = [],
  recentLabel = 'Recent',
  columns = 8,
  searchable = true,
  searchPlaceholder = 'Search emoji',
  emptyLabel = 'No emoji matches.',
  height = 240,
  label = 'Emoji picker',
  className,
  ...props
}: EmojiPickerProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return emoji
    return emoji.filter(
      (item) =>
        item.name.includes(needle) ||
        item.keywords?.some((word) => word.includes(needle)) ||
        item.char === needle,
    )
  }, [emoji, query])

  /** Recents first as their own group, then the natural grouping. */
  const groups = useMemo(() => {
    const out: { name: string; items: Emoji[] }[] = []
    if (!query && recent.length > 0) {
      const found = recent
        .map((char) => emoji.find((item) => item.char === char))
        .filter(Boolean) as Emoji[]
      if (found.length) out.push({ name: recentLabel, items: found })
    }
    for (const item of matches) {
      const bucket = out.find((group) => group.name === item.group && group.name !== recentLabel)
      if (bucket) bucket.items.push(item)
      else out.push({ name: item.group, items: [item] })
    }
    return out
  }, [matches, recent, emoji, query, recentLabel])

  /** Flat order, so arrow keys cross group boundaries the way the eye does. */
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups])

  function onKeyDown(event: React.KeyboardEvent) {
    const step =
      event.key === 'ArrowRight' ? 1
      : event.key === 'ArrowLeft' ? -1
      : event.key === 'ArrowDown' ? columns
      : event.key === 'ArrowUp' ? -columns
      : 0

    if (step === 0) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const picked = flat[active]
        if (picked) onSelect?.(picked)
      }
      return
    }

    event.preventDefault()
    const next = Math.min(Math.max(0, active + step), flat.length - 1)
    setActive(next)
    // Follow the focus, or arrowing past the fold looks like nothing happened.
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)
      ?.focus()
  }

  let index = -1

  return (
    <div
      data-slot="emoji-picker"
      className={cn(surface, radius.surface, 'flex w-72 flex-col overflow-hidden', className)}
      {...props}
    >
      {searchable && (
        <div className="border-border border-b p-2">
          <div className={cn(fieldBase, fieldOutline, 'flex h-8 items-center gap-2 px-2')}>
            <Search aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      )}

      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        style={{ height }}
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 overflow-y-auto p-2"
      >
        {flat.length === 0 ? (
          <p className="text-muted-foreground p-2 text-xs">{emptyLabel}</p>
        ) : (
          groups.map((group) => (
            <section key={group.name} className="mb-2 last:mb-0">
              <h3 className="text-muted-foreground px-1 py-1 text-[11px] font-medium tracking-wide uppercase">
                {group.name}
              </h3>
              <div
                role="row"
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {group.items.map((item) => {
                  index += 1
                  const position = index
                  return (
                    <button
                      key={`${group.name}-${item.char}`}
                      type="button"
                      role="gridcell"
                      data-index={position}
                      // Roving tabindex: one stop for the whole grid.
                      tabIndex={position === active ? 0 : -1}
                      aria-label={item.name}
                      title={item.name}
                      onFocus={() => setActive(position)}
                      onClick={() => onSelect?.(item)}
                      className={cn(
                        'flex aspect-square items-center justify-center text-lg leading-none',
                        radius.xs,
                        'hover:bg-muted',
                        focusRing,
                      )}
                    >
                      <span aria-hidden="true">{item.char}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

export { EmojiPicker }
export type { EmojiPickerProps }
