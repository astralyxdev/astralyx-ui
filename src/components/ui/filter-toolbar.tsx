'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useBreakpoint } from '@/components/primitives/media-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { focusRing } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * The filter pattern of a list page, in one row.
 *
 * A search box takes the free width; the filter used most sits inline beside
 * it — a SegmentedControl, a Select; the rest go behind "Filters", in a popover
 * on a wide screen and a bottom sheet on a phone; and whatever applies shows
 * underneath as chips that can each be removed. Every list that grows filters
 * one at a time ends up with a row of eight selects that wraps into three lines
 * on a laptop. This is the shape it should have grown into.
 *
 * Nothing here knows where filter state lives. Values come in and changes go
 * out, so it works the same over component state, a store or the URL —
 * `useFilterParams` is the URL case, written against a plain `URLSearchParams`
 * so any router can supply one.
 */

type FilterToolbarProps = {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    /** Accessible name. Defaults to `searchLabel`. */
    label?: string
    /** Monospace input, for ids and hashes. */
    mono?: boolean
    maxLength?: number
  }
  /** The filter used most, shown inline. */
  quick?: ReactNode
  /** The rest, behind the Filters button. FilterField each. */
  panel?: ReactNode
  /** How many of the panel's filters apply — the count on the button. */
  panelCount?: number
  chips?: FilterChip[]
  /** Clears every filter in the toolbar. */
  onReset: () => void
  className?: string
  searchLabel?: string
} & Omit<FilterPanelProps, 'activeCount' | 'onReset' | 'children'> &
  Omit<FilterChipsProps, 'chips' | 'onClearAll' | 'onEmpty' | 'className'>

/** One applied filter, as a removable chip: "Status: failed ×". */
export type FilterChip = { key: string; label: string; onRemove: () => void }

function FilterToolbar({
  search,
  quick,
  panel,
  panelCount = 0,
  chips = [],
  onReset,
  className,
  searchLabel = 'Search',
  filtersLabel,
  activeCountLabel,
  resetLabel,
  doneLabel,
  closeLabel,
  clearAllLabel,
  removeLabel,
  activeLabel,
}: FilterToolbarProps) {
  // The search box's wrapper: Input keeps its own ref on the <input>.
  const searchRef = useRef<HTMLDivElement>(null)

  return (
    <div data-slot="filter-toolbar" className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {search && (
          <div ref={searchRef} className="min-w-48 flex-1 basis-60">
            <Input
              size="sm"
              type="search"
              icon={<Search />}
              aria-label={search.label ?? searchLabel}
              placeholder={search.placeholder}
              autoComplete="off"
              spellCheck={false}
              maxLength={search.maxLength}
              className={search.mono ? 'font-mono' : undefined}
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
            />
          </div>
        )}
        {quick && <div className="max-w-full min-w-0 overflow-x-auto">{quick}</div>}
        {panel && (
          <FilterPanel
            activeCount={panelCount}
            onReset={onReset}
            filtersLabel={filtersLabel}
            activeCountLabel={activeCountLabel}
            resetLabel={resetLabel}
            doneLabel={doneLabel}
            closeLabel={closeLabel}
          >
            {panel}
          </FilterPanel>
        )}
      </div>
      <FilterChips
        chips={chips}
        onClearAll={onReset}
        // The last chip took focus with it; the search box is where a person
        // narrowing a list goes next.
        onEmpty={() => searchRef.current?.querySelector('input')?.focus()}
        clearAllLabel={clearAllLabel}
        removeLabel={removeLabel}
        activeLabel={activeLabel}
      />
    </div>
  )
}

/** One labelled control in the filter panel. `wide` spans both columns. */
function FilterField({
  label,
  htmlFor,
  wide = false,
  className,
  children,
}: {
  label: ReactNode
  /** The control's id, so the label is a real `<label>`. */
  htmlFor?: string
  wide?: boolean
  className?: string
  children: ReactNode
}) {
  const caption = 'text-muted-foreground text-xs font-medium'
  return (
    <div
      data-slot="filter-field"
      className={cn('flex min-w-0 flex-col gap-1.5', wide && 'sm:col-span-2', className)}
    >
      {htmlFor ? (
        <label htmlFor={htmlFor} className={caption}>
          {label}
        </label>
      ) : (
        <span className={caption}>{label}</span>
      )}
      {children}
    </div>
  )
}

type FilterPanelProps = {
  /** How many of the panel's filters apply — shown as a count on the button. */
  activeCount: number
  onReset: () => void
  children: ReactNode
  /** The button's text and the panel's title. */
  filtersLabel?: string
  /** Announced in place of the bare count. */
  activeCountLabel?: (count: number) => string
  resetLabel?: string
  doneLabel?: string
  /** The sheet's close button, on a phone. */
  closeLabel?: string
}

/** Hoisted for the React Compiler — see `DEFAULT_PAGE_LABEL` in pagination. */
const DEFAULT_ACTIVE_COUNT = (count: number) => `${count} active`
const DEFAULT_REMOVE = (label: string) => `Remove ${label}`

/**
 * "Filters (2)": the filters used less, laid out as a one- or two-column
 * form, with Reset and Done.
 *
 * A popover from `sm` up and a bottom sheet below it. A popover on a phone is
 * a box the width of the screen hanging off a button, with its Done button
 * under the keyboard; a sheet is where a phone keeps a form.
 */
function FilterPanel({
  activeCount,
  onReset,
  children,
  filtersLabel = 'Filters',
  activeCountLabel = DEFAULT_ACTIVE_COUNT,
  resetLabel = 'Reset',
  doneLabel = 'Done',
  closeLabel = 'Close',
}: FilterPanelProps) {
  const wide = useBreakpoint('sm')
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLSpanElement>(null)

  // Done hands focus back to the Filters button, once the panel is gone.
  const done = () => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.querySelector('button')?.focus())
  }

  const label = (
    <>
      <SlidersHorizontal /> {filtersLabel}
      {activeCount > 0 && (
        <Badge size="sm" color="blue" className="tabular-nums">
          <span aria-hidden="true">{activeCount}</span>
          <VisuallyHidden>{activeCountLabel(activeCount)}</VisuallyHidden>
        </Badge>
      )}
    </>
  )
  const body = <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  const footer = (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={activeCount === 0}>
        {resetLabel}
      </Button>
      <Button type="button" size="sm" onClick={done}>
        {doneLabel}
      </Button>
    </>
  )

  if (wide) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <span ref={trigger} className="contents">
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="shrink-0">
              {label}
            </Button>
          </PopoverTrigger>
        </span>
        <PopoverContent
          align="end"
          aria-label={filtersLabel}
          className="flex w-[min(34rem,calc(100vw-2rem))] flex-col gap-0 p-0"
        >
          <div className="max-h-[70vh] overflow-y-auto p-4">{body}</div>
          <div className="border-border flex items-center justify-between gap-2 border-t px-4 py-3">
            {footer}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <>
      <span ref={trigger} className="contents">
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeLabel={closeLabel}>
          <SheetHeader>
            <SheetTitle>{filtersLabel}</SheetTitle>
          </SheetHeader>
          <SheetBody>{body}</SheetBody>
          <SheetFooter className="flex-row justify-between">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

type FilterChipsProps = {
  chips: FilterChip[]
  onClearAll: () => void
  /** Where focus goes when the last chip is removed — the search field, say. */
  onEmpty?: () => void
  className?: string
  clearAllLabel?: string
  /** Accessible name of a chip's remove button. */
  removeLabel?: (label: string) => string
  /** Accessible name of the group. */
  activeLabel?: string
}

/**
 * The filters that apply, each removable, and "Clear all". Nothing when none do.
 *
 * Focus is the fiddly part. Removing a chip unmounts the button that was
 * pressed, which drops focus to the document body — a keyboard user clearing
 * three filters would have to tab back from the top of the page twice. Focus
 * moves to the chip that took its place instead, then to Clear all, then to
 * `onEmpty`.
 */
function FilterChips({
  chips,
  onClearAll,
  onEmpty,
  className,
  clearAllLabel = 'Clear all',
  removeLabel = DEFAULT_REMOVE,
  activeLabel = 'Active filters',
}: FilterChipsProps) {
  const group = useRef<HTMLDivElement>(null)
  const refocus = useRef<number | null>(null)
  const keys = chips.map((chip) => chip.key).join('|')

  useLayoutEffect(() => {
    const index = refocus.current
    if (index === null) return
    refocus.current = null
    const buttons = group.current?.querySelectorAll<HTMLElement>('[data-chip-remove]') ?? []
    const target = buttons[index] ?? group.current?.querySelector<HTMLElement>('[data-chip-clear]')
    if (target) target.focus()
    else onEmpty?.()
  }, [keys, onEmpty])

  if (!chips.length) return null

  return (
    <div
      ref={group}
      role="group"
      aria-label={activeLabel}
      data-slot="filter-chips"
      className={cn('flex min-w-0 flex-wrap items-center gap-1.5', className)}
    >
      {chips.map((chip, index) => (
        <span
          key={chip.key}
          className="bg-secondary text-secondary-foreground inline-flex max-w-full min-w-0 items-center gap-1 rounded-full py-0.5 ps-2.5 pe-0.5 text-xs"
        >
          <span className="truncate" title={chip.label}>
            {chip.label}
          </span>
          <button
            type="button"
            data-chip-remove
            aria-label={removeLabel(chip.label)}
            onClick={() => {
              refocus.current = index
              chip.onRemove()
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground hover:bg-accent inline-flex size-5 shrink-0 items-center justify-center rounded-full',
              focusRing,
            )}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <Button
        variant="link"
        size="xs"
        className="h-auto px-1"
        data-chip-clear
        onClick={() => {
          // Past every chip, so it lands on nothing and falls through to `onEmpty`.
          refocus.current = Number.MAX_SAFE_INTEGER
          onClearAll()
        }}
      >
        {clearAllLabel}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------- URL state */

/**
 * "Any" for a Select, which cannot hold an empty value. Treated as unset.
 */
const FILTER_ANY = '__any'

/** Checks one value read from the URL. A value that fails reads as unset. */
type FilterCheck = (value: string) => boolean

/** Ready-made checks for `useFilterParams`. */
const filterChecks = {
  /** One of a fixed set — an enum's options. */
  oneOf:
    (options: readonly string[]): FilterCheck =>
    (value) =>
      options.includes(value),
  /** Matches a pattern. */
  matches:
    (pattern: RegExp): FilterCheck =>
    (value) =>
      pattern.test(value),
  /** At most `max` characters — an API's cap on a search. */
  maxLength:
    (max: number): FilterCheck =>
    (value) =>
      value.length <= max,
  uuid: ((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) as FilterCheck,
  /** An ISO 8601 timestamp with a zone, as DateRangeFilter writes one. */
  isoDateTime: ((value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))) as FilterCheck,
  /** A toggle, written as "1". */
  flag: ((value) => value === '1') as FilterCheck,
}

/** `?offset=` as a safe whole number. Anything else is the first page. */
function parseOffset(raw: string | null) {
  if (!raw || !/^\d{1,15}$/.test(raw)) return 0
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : 0
}

type FilterValue = string | number | null | undefined

const isUnset = (value: FilterValue) =>
  value === null || value === undefined || value === '' || value === FILTER_ANY || value === 0

/**
 * List filters kept in the query string, so a filtered list can be linked to
 * and survives a reload.
 *
 * It reads and writes a `URLSearchParams` and never touches the address bar
 * itself, so it works with whichever router the app has. With React Router:
 *
 *     const [params, setParams] = useSearchParams()
 *     const filters = useFilterParams(['status', 'q'], {
 *       params,
 *       onParamsChange: (next) => setParams(next, { replace: true }),
 *     })
 *
 * Changing a filter drops `offset`, back to the first page — page 4 of the old
 * results is meaningless in the new ones. `clear` removes only these keys, so a
 * tab kept in another parameter stays put. `setMany` changes several at once;
 * calling `set` twice in one event would build both from the same `params`,
 * and the second would undo the first.
 *
 * The query string is input from anyone who can send a link. `checks`
 * allow-list values: one that fails reads as unset — so no chip, request or
 * control ever sees it — and is removed from the URL.
 */
function useFilterParams<K extends string>(
  keys: readonly K[],
  {
    params,
    onParamsChange,
    checks = {},
  }: {
    params: URLSearchParams
    onParamsChange: (next: URLSearchParams) => void
    checks?: Partial<Record<K, FilterCheck>>
  },
) {
  const valid = (key: K, value: string) => !value || !checks[key] || checks[key](value)
  const values = Object.fromEntries(
    keys.map((key) => {
      const value = params.get(key) ?? ''
      return [key, valid(key, value) ? value : '']
    }),
  ) as Record<K, string>
  const rawOffset = params.get('offset')
  const offset = parseOffset(rawOffset)

  // Invalid values and a malformed offset leave the address too.
  const invalid = keys.filter((key) => !valid(key, params.get(key) ?? '')).join(',')
  const badOffset = rawOffset !== null && String(offset) !== rawOffset
  const latest = useRef({ params, onParamsChange })
  useEffect(() => {
    latest.current = { params, onParamsChange }
  })
  useEffect(() => {
    if (!invalid && !badOffset) return
    const next = new URLSearchParams(latest.current.params)
    for (const key of invalid ? invalid.split(',') : []) next.delete(key)
    if (badOffset) next.delete('offset')
    latest.current.onParamsChange(next)
  }, [invalid, badOffset])

  const setMany = useCallback(
    (patch: Partial<Record<K | 'offset', FilterValue>>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch) as [string, FilterValue][]) {
        if (isUnset(value)) next.delete(key)
        else next.set(key, String(value))
      }
      if (!('offset' in patch)) next.delete('offset')
      onParamsChange(next)
    },
    [params, onParamsChange],
  )

  const set = useCallback(
    (key: K | 'offset', value: FilterValue) =>
      setMany({ [key]: value } as Partial<Record<K | 'offset', FilterValue>>),
    [setMany],
  )

  // `keys` is usually a fresh array literal; depend on its contents.
  const keyList = keys.join(',')
  const clear = useCallback(() => {
    const next = new URLSearchParams(params)
    for (const key of keyList.split(',')) next.delete(key)
    next.delete('offset')
    onParamsChange(next)
  }, [params, onParamsChange, keyList])

  const active = keys.some((key) => values[key] !== '')
  return { values, offset, set, setMany, clear, active }
}

export {
  FILTER_ANY,
  FilterChips,
  FilterField,
  FilterPanel,
  FilterToolbar,
  filterChecks,
  parseOffset,
  useFilterParams,
}
export type { FilterCheck, FilterChipsProps, FilterPanelProps, FilterToolbarProps }
