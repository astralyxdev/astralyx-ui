import { useState, type ComponentProps, type ReactNode } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { focusRing, interactive, radius } from '@/lib/styles'
import { cn } from '@/lib/utils'

/**
 * Repository labels: coloured chips, picked from a searchable list.
 *
 * Each label carries its own colour, so the chip is styled from data rather
 * than from a variant — which is why this is not just a Badge with a prop. The
 * text colour is derived from the fill rather than stored, since a label set
 * imported from a forge only gives you the background.
 */
export type LabelOption = {
  id: string
  name: string
  /** Any CSS colour. */
  color: string
  description?: string
}

/**
 * Pick black or white text for a background.
 *
 * `color-mix` cannot answer "is this light or dark", and `oklch()` relative
 * syntax cannot branch — so the decision is made here, from the sRGB
 * luminance of a hex value, and anything non-hex falls back to white.
 */
function readableInk(color: string) {
  const hex = /^#?([0-9a-f]{6})$/i.exec(color.trim())
  if (!hex) return 'white'
  const value = parseInt(hex[1], 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  // Rec. 709 luma, the standard weighting for perceived brightness.
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luma > 0.6 ? 'black' : 'white'
}

function LabelChip({
  label,
  className,
  ...props
}: ComponentProps<'span'> & { label: LabelOption }) {
  return (
    <span
      data-slot="label-chip"
      style={{ backgroundColor: label.color, color: readableInk(label.color) }}
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 px-2 text-[10px] font-medium',
        radius.xs,
        className,
      )}
      {...props}
    >
      {label.name}
    </span>
  )
}

function LabelPicker({
  labels,
  selected,
  onSelectedChange,
  triggerLabel = 'Labels',
  searchPlaceholder = 'Filter labels',
  searchLabel = 'Filter labels',
  listLabel = 'Labels',
  emptyMessage = 'No labels match.',
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onSelect'> & {
  labels: LabelOption[]
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  triggerLabel?: string
  searchPlaceholder?: string
  /** Accessible name for the filter field. */
  searchLabel?: string
  /** Accessible name for the option list. */
  listLabel?: string
  emptyMessage?: ReactNode
}) {
  const [query, setQuery] = useState('')

  const visible = labels.filter((label) =>
    label.name.toLowerCase().includes(query.toLowerCase()),
  )

  function toggle(id: string) {
    onSelectedChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    )
  }

  return (
    <div
      data-slot="label-picker"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...props}
    >
      {labels
        .filter((label) => selected.includes(label.id))
        .map((label) => (
          <LabelChip key={label.id} label={label} />
        ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="xs">
            <Plus />
            {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0">
          <div className="border-border border-b p-2">
            <Input
              size="sm"
              variant="secondary"
              icon={<Search />}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <ul
            role="listbox"
            aria-multiselectable="true"
            aria-label={listLabel}
            className="max-h-56 list-none overflow-y-auto p-1"
          >
            {visible.map((label) => {
              const isSelected = selected.includes(label.id)
              return (
                <li key={label.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggle(label.id)}
                    className={cn(
                      'hover:bg-accent flex w-full items-start gap-2 px-2 py-1.5 text-start',
                      radius.control,
                      interactive,
                      focusRing,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: label.color }}
                      className="mt-1 size-3 shrink-0 rounded-full [corner-shape:round]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{label.name}</span>
                      {label.description && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {label.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="mt-0.5 size-3.5 shrink-0" />}
                  </button>
                </li>
              )
            })}

            {visible.length === 0 && (
              <li className="text-muted-foreground px-2 py-3 text-center text-sm">
                {emptyMessage}
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { LabelChip, LabelPicker, readableInk }
