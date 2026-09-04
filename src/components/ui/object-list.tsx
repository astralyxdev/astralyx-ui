import { useMemo, useState, type ComponentProps } from 'react'
import { ChevronRight, File, Folder, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { formatBytes } from '@/components/ui/storage-usage'
import { focusRing, radius, surface } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Objects in a bucket, with the prefix hierarchy object stores only pretend to
 * have.
 *
 * There are no folders in S3-shaped storage — `a/b/c.png` is one flat key with
 * slashes in it. Every console draws folders anyway, because a flat list of
 * fifty thousand keys is unusable, and this does the same grouping: keys under
 * the current prefix are files, anything deeper collapses into a prefix row
 * with a count.
 *
 * Storage class is shown because it is the difference between a file you can
 * read now and one that needs a restore request and several hours. A list that
 * shows only size and date makes an archived object look immediately available.
 */
export type StorageObject = {
  key: string
  /** Bytes. */
  size?: number
  /** Already formatted. */
  modified?: string
  /** `STANDARD`, `GLACIER`, whatever your provider calls it. */
  storageClass?: string
  /** Not immediately readable — needs a restore first. */
  archived?: boolean
}

type ObjectListProps = Omit<ComponentProps<'div'>, 'onSelect'> & {
  objects: StorageObject[]
  /** Current prefix. Controlled when paired with `onPrefixChange`. */
  prefix?: string
  onPrefixChange?: (prefix: string) => void
  onSelect?: (object: StorageObject) => void
  searchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  emptyLabel?: string
  emptyHint?: string
  archivedLabel?: string
  itemsLabel?: (count: number) => string
  format?: (bytes: number) => string
}

/** Split the keys under `prefix` into immediate files and deeper prefixes. */
export function groupByPrefix(objects: StorageObject[], prefix: string) {
  const files: StorageObject[] = []
  const folders = new Map<string, number>()

  for (const object of objects) {
    if (!object.key.startsWith(prefix)) continue
    const rest = object.key.slice(prefix.length)
    if (!rest) continue

    const slash = rest.indexOf('/')
    if (slash === -1) files.push(object)
    else {
      const name = rest.slice(0, slash + 1)
      folders.set(name, (folders.get(name) ?? 0) + 1)
    }
  }

  return { files, folders: [...folders.entries()].map(([name, count]) => ({ name, count })) }
}

function ObjectList({
  objects,
  prefix: prefixProp,
  onPrefixChange,
  onSelect,
  searchable = true,
  searchPlaceholder = 'Filter by key…',
  searchLabel = 'Filter objects',
  emptyLabel = 'Nothing here',
  emptyHint = 'This prefix has no objects.',
  archivedLabel = 'archived',
  itemsLabel = (count) => `${count} item${count === 1 ? '' : 's'}`,
  format = formatBytes,
  className,
  ...props
}: ObjectListProps) {
  const controlled = prefixProp !== undefined
  const [uncontrolled, setUncontrolled] = useState('')
  const prefix = controlled ? prefixProp : uncontrolled
  const [query, setQuery] = useState('')

  function goTo(next: string) {
    if (!controlled) setUncontrolled(next)
    onPrefixChange?.(next)
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? objects.filter((o) => o.key.toLowerCase().includes(needle)) : objects
  }, [objects, query])

  // Searching goes flat: a filter that still hides matches behind folders is
  // not a search.
  const searching = query.trim().length > 0
  const { files, folders } = useMemo(
    () => (searching ? { files: filtered, folders: [] } : groupByPrefix(filtered, prefix)),
    [filtered, prefix, searching],
  )

  const crumbs = prefix.split('/').filter(Boolean)

  return (
    <div data-slot="object-list" className={cn('flex flex-col gap-3', className)} {...props}>
      {searchable && (
        <Input
          size="sm"
          value={query}
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          icon={<Search />}
          clearable
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      {!searching && (
        <nav aria-label="Prefix" className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
          <button type="button" className={cn('hover:text-foreground', focusRing)} onClick={() => goTo('')}>
            /
          </button>
          {crumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRight className="size-3" aria-hidden="true" />
              <button
                type="button"
                className={cn('hover:text-foreground font-mono', focusRing)}
                onClick={() => goTo(`${crumbs.slice(0, index + 1).join('/')}/`)}
              >
                {crumb}
              </button>
            </span>
          ))}
        </nav>
      )}

      {files.length === 0 && folders.length === 0 ? (
        <Empty title={emptyLabel} description={emptyHint} />
      ) : (
        <ul className={cn(surface, radius.surface, 'divide-border list-none divide-y overflow-hidden')}>
          {folders.map((folder) => (
            <li key={folder.name}>
              <button
                type="button"
                onClick={() => goTo(prefix + folder.name)}
                className={cn('hover:bg-accent/40 flex w-full items-center gap-3 px-4 py-2.5 text-start', focusRing)}
              >
                <Folder className="text-muted-foreground/60 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{folder.name}</span>
                <span className="text-muted-foreground/60 shrink-0 text-[11px] tabular-nums">
                  {itemsLabel(folder.count)}
                </span>
              </button>
            </li>
          ))}

          {files.map((object) => {
            const Row = onSelect ? 'button' : 'div'
            return (
              <li key={object.key}>
                <Row
                  {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(object) } : {})}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-start',
                    onSelect && cn('hover:bg-accent/40', focusRing),
                  )}
                >
                  <File className="text-muted-foreground/50 size-4 shrink-0" aria-hidden="true" />

                  <span className="min-w-0 flex-1 truncate font-mono text-xs" title={object.key}>
                    {searching ? object.key : object.key.slice(prefix.length)}
                  </span>

                  {/* Not immediately readable, and that is not obvious from a
                      size and a date. */}
                  {object.archived && (
                    <Badge size="sm" color="amber" className="shrink-0">
                      {archivedLabel}
                    </Badge>
                  )}
                  {object.storageClass && !object.archived && (
                    <span className="text-muted-foreground/50 shrink-0 font-mono text-[10px]">
                      {object.storageClass}
                    </span>
                  )}
                  {object.modified && (
                    <span className="text-muted-foreground/60 hidden shrink-0 text-[11px] tabular-nums sm:block">
                      {object.modified}
                    </span>
                  )}
                  {object.size !== undefined && (
                    <span className="w-16 shrink-0 text-end font-mono text-[11px] tabular-nums">
                      {format(object.size)}
                    </span>
                  )}
                </Row>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { ObjectList }
export type { ObjectListProps }
